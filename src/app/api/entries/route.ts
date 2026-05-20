import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getAllEntries, createEntry, createRegistrationToken } from '@/lib/db';
import { sendInviteEmail } from '@/lib/email';

export async function GET() {
  return NextResponse.json(await getAllEntries());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, email, mobile_number, role, purpose, reporting_date, poc_name, contact_no, building_name } = body;

  if (!name || !email || !purpose || !reporting_date || !poc_name || !contact_no || !building_name) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
  }

  let entry;
  try {
    entry = await createEntry({ name, email, mobile_number, role, purpose, reporting_date, poc_name, contact_no, building_name });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[DB] createEntry failed:', msg);
    if (msg.toLowerCase().includes('column') || msg.toLowerCase().includes('schema')) {
      return NextResponse.json({
        error: 'Database schema is outdated. Please run supabase-migration.sql in the Supabase SQL Editor, then reload the schema under Settings → API.',
      }, { status: 500 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const token = uuidv4();
  await createRegistrationToken(entry.id, token);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const registrationUrl = `${appUrl}/register/${token}`;

  let emailSent = false;
  let emailError = '';
  try {
    await sendInviteEmail(email, name, registrationUrl);
    emailSent = true;
  } catch (err: unknown) {
    emailError = err instanceof Error ? err.message : String(err);
    console.error('[Email] Invite failed:', emailError);
  }

  return NextResponse.json({ ...entry, registrationUrl, emailSent, emailError }, { status: 201 });
}
