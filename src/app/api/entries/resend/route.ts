import { NextRequest, NextResponse } from 'next/server';
import { getEntryById } from '@/lib/db';
import { sendInviteEmail } from '@/lib/email';
import { getAppUrl } from '@/lib/app-url';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { entryId } = body;
  if (!entryId) return NextResponse.json({ error: 'entryId is required' }, { status: 400 });

  const entry = await getEntryById(entryId);
  if (!entry)            return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
  if (!entry.email)      return NextResponse.json({ error: 'Entry has no email address' }, { status: 400 });
  if (!entry.invite_token) return NextResponse.json({ error: 'Entry has no invite token' }, { status: 400 });

  const appUrl = getAppUrl();
  const registrationUrl = `${appUrl}/register/${entry.invite_token}`;

  try {
    await sendInviteEmail(entry.email, entry.name, registrationUrl);
  } catch (err) {
    console.error('[Email] Resend invite failed:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Could not send email. Please check server email settings.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, email: entry.email });
}
