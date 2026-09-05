import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createEntry, createRegistrationToken, checkDuplicateEntry } from '@/lib/db';
import { sendInviteEmail } from '@/lib/email';
import { getAppUrl } from '@/lib/app-url';

type RowResult = {
  name: string;
  email: string;
  success: boolean;
  skipped?: boolean;
  emailFailed?: boolean;
  error?: string;
  rowIndex?: number;
};

const REQUIRED_FIELDS = ['name', 'email', 'purpose', 'reporting_date', 'poc_name', 'contact_no', 'building_name'];

// Normalise any date string to YYYY-MM-DD so it matches the dashboard's strict
// string-equality filter (e.reporting_date === "YYYY-MM-DD").
// Accepts: "YYYY-MM-DD" and ISO datetime strings ("YYYY-MM-DDT...").
// Returns null for unrecognised/invalid formats so the row can be rejected.
function normalizeDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.slice(0, 10);
  return null;
}

// Delay between SMTP sends to avoid Gmail rate limiting (≤ 20 msgs/sec hard limit).
// 200 ms ≈ 5 msgs/sec — well within Gmail's limits while keeping bulk upload fast.
const INTER_SEND_DELAY_MS = 200;

export async function POST(req: NextRequest) {
  const { rows } = await req.json();

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'No rows provided' }, { status: 400 });
  }

  console.log(`[BulkUpload] Starting — ${rows.length} rows received`);

  const appUrl = getAppUrl();
  const results:     RowResult[] = []; // entry + email both succeeded
  const emailFailed: RowResult[] = []; // entry created, invite email failed — needs manual resend
  const skipped:     RowResult[] = []; // duplicate entry for same email+date
  const failed:      RowResult[] = []; // could not create entry in DB

  let emailsSentSoFar = 0; // used to insert delay before each SMTP call

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowIndex = row._row_num ? Number(row._row_num) : (i + 1);

    // Skip completely blank rows (all data fields are empty)
    const dataFields = REQUIRED_FIELDS.concat(['mobile_number', 'role', 'valid_until', 'employee_id']);
    const hasAnyData = dataFields.some((f) => typeof row[f] === 'string' && row[f].trim() !== '');
    if (!hasAnyData) {
      console.log(`[BulkUpload] Row ${rowIndex}: skipped (blank row)`);
      continue;
    }

    const name  = (row.name  ?? '').trim();
    const email = (row.email ?? '').trim();

    // Validate required fields
    const missing = REQUIRED_FIELDS.filter((f) => !row[f]?.trim());
    if (missing.length > 0) {
      console.warn(`[BulkUpload] Row ${rowIndex}: missing fields — ${missing.join(', ')}`);
      failed.push({ name, email, success: false, error: `Missing fields: ${missing.join(', ')}`, rowIndex });
      continue;
    }

    // Normalise dates to YYYY-MM-DD before anything else so both the duplicate
    // check and the DB insert use the same canonical format as single entries.
    const normalizedReportingDate = normalizeDate(row.reporting_date);
    if (!normalizedReportingDate) {
      console.warn(`[BulkUpload] Row ${rowIndex}: invalid reporting_date format "${row.reporting_date}" — expected YYYY-MM-DD`);
      failed.push({ name, email, success: false, error: `Invalid reporting_date format "${row.reporting_date}" — use YYYY-MM-DD (e.g. ${new Date().toISOString().slice(0, 10)})`, rowIndex });
      continue;
    }

    const rawValidUntil = row.valid_until?.trim() || '';
    const normalizedValidUntil = rawValidUntil ? normalizeDate(rawValidUntil) : undefined;
    if (rawValidUntil && !normalizedValidUntil) {
      console.warn(`[BulkUpload] Row ${rowIndex}: invalid valid_until format "${row.valid_until}" — expected YYYY-MM-DD`);
      failed.push({ name, email, success: false, error: `Invalid valid_until format "${row.valid_until}" — use YYYY-MM-DD (e.g. ${new Date().toISOString().slice(0, 10)})`, rowIndex });
      continue;
    }

    // Duplicate check — same email + same reporting_date already exists
    let isDuplicate = false;
    try {
      const existing = await checkDuplicateEntry(email, normalizedReportingDate);
      if (existing) {
        isDuplicate = true;
        console.log(`[BulkUpload] Row ${rowIndex}: duplicate — entry already exists for ${email} on ${normalizedReportingDate}`);
        skipped.push({ name, email, success: false, skipped: true, error: `Entry already exists for ${normalizedReportingDate}`, rowIndex });
      }
    } catch (dupErr) {
      console.warn(`[BulkUpload] Row ${rowIndex}: duplicate check failed —`, dupErr instanceof Error ? dupErr.message : dupErr);
    }
    if (isDuplicate) continue;

    // Step 1: Create entry in DB
    let entry;
    try {
      entry = await createEntry({
        name,
        email,
        mobile_number: row.mobile_number?.trim() || row.mobile?.trim() || undefined,
        role:          row.role?.trim()          || undefined,
        purpose:       row.purpose.trim(),
        reporting_date: normalizedReportingDate,
        valid_until:   normalizedValidUntil ?? undefined,
        employee_id:   row.employee_id?.trim()   || undefined,
        poc_name:      row.poc_name.trim(),
        contact_no:    row.contact_no.trim(),
        building_name: row.building_name.trim(),
      });
      console.log(`[BulkUpload] Row ${rowIndex}: entry created (id=${entry.id}) for ${email}`);
    } catch (dbErr) {
      const msg = dbErr instanceof Error ? dbErr.message : String(dbErr);
      // Unique constraint = duplicate slipped past the earlier check
      if (msg.toLowerCase().includes('unique') || msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('already exists')) {
        console.log(`[BulkUpload] Row ${rowIndex}: duplicate (DB constraint) for ${email}`);
        skipped.push({ name, email, success: false, skipped: true, error: `Entry already exists for ${normalizedReportingDate}`, rowIndex });
      } else {
        console.error(`[BulkUpload] Row ${rowIndex}: DB entry creation FAILED for ${email} —`, msg);
        failed.push({ name, email, success: false, error: 'Could not save entry — please try again', rowIndex });
      }
      continue;
    }

    // Step 2: Generate and store invite token
    let registrationUrl: string;
    try {
      const token = uuidv4();
      await createRegistrationToken(entry.id, token);
      registrationUrl = `${appUrl}/register/${token}`;
    } catch (tokenErr) {
      const msg = tokenErr instanceof Error ? tokenErr.message : String(tokenErr);
      console.error(`[BulkUpload] Row ${rowIndex}: token creation FAILED for entry ${entry.id} —`, msg);
      emailFailed.push({ name, email, success: false, emailFailed: true, error: 'Could not generate registration link', rowIndex });
      continue;
    }

    // Step 3: Send invite email
    // Apply inter-send delay after the first email to stay within Gmail rate limits.
    // maxRetries=0 — fail fast in bulk mode; long retry sleeps would timeout the function.
    if (emailsSentSoFar > 0) {
      await new Promise((r) => setTimeout(r, INTER_SEND_DELAY_MS));
    }

    try {
      await sendInviteEmail(email, name, registrationUrl, 0);
      emailsSentSoFar++;
      console.log(`[BulkUpload] Row ${rowIndex}: ✓ invite email sent → ${email} (total sent so far: ${emailsSentSoFar})`);
      results.push({ name, email, success: true, rowIndex });
    } catch (emailErr) {
      const msg = emailErr instanceof Error ? emailErr.message : 'Email delivery failed';
      console.error(`[BulkUpload] Row ${rowIndex}: ✗ email FAILED → ${email} | entry id=${entry.id} | ${msg}`);
      // Entry IS in the DB — report separately so admin can resend from the entry list
      emailFailed.push({ name, email, success: false, emailFailed: true, error: msg, rowIndex });
    }
  }

  console.log(
    `[BulkUpload] Complete — sent: ${results.length}, emailFailed: ${emailFailed.length}, skipped: ${skipped.length}, failed: ${failed.length}`
  );

  return NextResponse.json({
    total:       rows.length,
    sent:        results.length,
    emailFailed,
    skipped,
    failed,
  });
}
