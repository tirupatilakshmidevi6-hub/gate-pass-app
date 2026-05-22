import { NextRequest, NextResponse } from 'next/server';
import { getEntryById } from '@/lib/db';
import { sendInviteEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { entryId } = body;
  if (!entryId) return NextResponse.json({ error: 'entryId is required' }, { status: 400 });

  const entry = await getEntryById(entryId);
  if (!entry)            return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
  if (!entry.email)      return NextResponse.json({ error: 'Entry has no email address' }, { status: 400 });
  if (!entry.invite_token) return NextResponse.json({ error: 'Entry has no invite token' }, { status: 400 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const registrationUrl = `${appUrl}/register/${entry.invite_token}`;

  try {
    await sendInviteEmail(entry.email, entry.name, registrationUrl);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Email] Resend invite failed:', msg);
    return NextResponse.json({ error: `Email failed: ${msg}` }, { status: 500 });
  }

  return NextResponse.json({ success: true, email: entry.email });
}
