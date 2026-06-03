import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createEntry, createRegistrationToken, checkDuplicateEntry } from '@/lib/db';
import { sendInviteEmail } from '@/lib/email';

type RowResult = { name: string; email: string; success: boolean; skipped?: boolean; error?: string; rowIndex?: number };

const REQUIRED_FIELDS = ['name', 'email', 'purpose', 'reporting_date', 'poc_name', 'contact_no', 'building_name'];

export async function POST(req: NextRequest) {
  const { rows } = await req.json();

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'No rows provided' }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const results: RowResult[]  = [];
  const skipped: RowResult[]  = [];
  const failed:  RowResult[]  = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowIndex = i + 1;
    const name  = (row.name  ?? '').trim();
    const email = (row.email ?? '').trim();

    // Validate required fields
    const missing = REQUIRED_FIELDS.filter((f) => !row[f]?.trim());
    if (missing.length > 0) {
      failed.push({ name, email, success: false, error: `Missing fields: ${missing.join(', ')}`, rowIndex });
      continue;
    }

    // Duplicate check — skip instead of error
    let isDuplicate = false;
    try {
      const existing = await checkDuplicateEntry(email, row.reporting_date.trim());
      if (existing) {
        isDuplicate = true;
        skipped.push({ name, email, success: false, skipped: true, error: `Entry already exists for ${row.reporting_date}`, rowIndex });
      }
    } catch (dupErr) {
      console.warn('[BulkUpload] Duplicate check failed for row', rowIndex, dupErr instanceof Error ? dupErr.message : dupErr);
    }
    if (isDuplicate) continue;

    try {
      const entry = await createEntry({
        name,
        email,
        mobile_number: row.mobile_number?.trim() || row.mobile?.trim() || undefined,
        role:          row.role?.trim()          || undefined,
        purpose:       row.purpose.trim(),
        reporting_date: row.reporting_date.trim(),
        valid_until:   row.valid_until?.trim()   || undefined,
        employee_id:   row.employee_id?.trim()   || undefined,
        poc_name:      row.poc_name.trim(),
        contact_no:    row.contact_no.trim(),
        building_name: row.building_name.trim(),
      });

      const token = uuidv4();
      await createRegistrationToken(entry.id, token);
      const registrationUrl = `${appUrl}/register/${token}`;
      await sendInviteEmail(email, name, registrationUrl);

      results.push({ name, email, success: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Unique constraint violation → treat as duplicate, not failure
      if (msg.toLowerCase().includes('unique') || msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('already exists')) {
        skipped.push({ name, email, success: false, skipped: true, error: `Entry already exists for ${row.reporting_date}`, rowIndex });
      } else {
        console.error('[BulkUpload] Row failed:', name, msg);
        failed.push({ name, email, success: false, error: msg, rowIndex });
      }
    }
  }

  const sent = results.filter((r) => r.success).length;

  return NextResponse.json({
    total:   rows.length,
    sent,
    skipped,
    failed,
  });
}
