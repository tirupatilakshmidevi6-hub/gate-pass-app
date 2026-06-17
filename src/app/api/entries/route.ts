import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getAllEntries, createEntry, createRegistrationToken, checkDuplicateEntry } from '@/lib/db';
import { sendInviteEmail } from '@/lib/email';

export async function GET() {
  return NextResponse.json(await getAllEntries());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, email, mobile_number, role, purpose, reporting_date, valid_until, employee_id, poc_name, contact_no, building_name } = body;

  if (!name || !email || !purpose || !reporting_date || !poc_name || !contact_no || !building_name) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
  }

  console.log(`[NewEntry] Step 1 — Creating entry for: ${name} (${email})`);

  // ── Duplicate check: same email + same reporting_date ─────────────────────
  const existing = await checkDuplicateEntry(email, reporting_date);
  if (existing) {
    console.log(`[NewEntry] Duplicate detected — existing entry id=${existing.id}`);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const registrationUrl = existing.invite_token ? `${appUrl}/register/${existing.invite_token}` : '';
    return NextResponse.json({
      duplicate: true,
      entryId: existing.id,
      email: existing.email,
      name: existing.name,
      registrationUrl,
    }, { status: 409 });
  }

  let entry;
  try {
    entry = await createEntry({ name, email, mobile_number, role, purpose, reporting_date, valid_until, employee_id, poc_name, contact_no, building_name });
    console.log(`[NewEntry] Step 1 ✓ — Entry created | id=${entry.id}`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[NewEntry] Step 1 ✗ — createEntry failed:', msg);
    if (msg.toLowerCase().includes('column') || msg.toLowerCase().includes('schema')) {
      return NextResponse.json({
        error: 'Database schema is outdated. Please run supabase-migration.sql in the Supabase SQL Editor, then reload the schema under Settings → API.',
      }, { status: 500 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  console.log('[NewEntry] Step 2 — Generating invite token');
  const token = uuidv4();
  await createRegistrationToken(entry.id, token);
  console.log(`[NewEntry] Step 2 ✓ — Token created: ${token}`);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const registrationUrl = `${appUrl}/register/${token}`;
  console.log(`[NewEntry] Step 3 — Registration URL: ${registrationUrl}`);

  console.log(`[NewEntry] Step 4 — Sending invite email to: ${email}`);
  let emailSent = false;
  let emailError = '';
  try {
    await sendInviteEmail(email, name, registrationUrl);
    emailSent = true;
    console.log(`[NewEntry] Step 4 ✓ — Invite email sent to ${email}`);
  } catch (err: unknown) {
    const e = err as { message?: string; code?: string; response?: string };
    emailError = e.message ?? String(err);
    console.error(`[NewEntry] Step 4 ✗ — Invite email FAILED | to: ${email} | message: ${e.message} | code: ${e.code} | response: ${e.response}`);
  }

  console.log(`[NewEntry] Complete — entry id=${entry.id} | emailSent=${emailSent}`);
  return NextResponse.json({ ...entry, registrationUrl, emailSent, emailError }, { status: 201 });
}
