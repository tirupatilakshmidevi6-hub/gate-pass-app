import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getEntryById, logActivity } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { sendInviteEmail } from '@/lib/email';
import { getAppUrl } from '@/lib/app-url';
import { supabase } from '@/lib/supabase';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const entry = await getEntryById(id);
  if (!entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 });

  if (entry.status !== 'Pending Form') {
    return NextResponse.json({ error: 'Invite can only be resent for entries with Pending Form status' }, { status: 400 });
  }
  if (!entry.email) {
    return NextResponse.json({ error: 'No email address on file for this entry' }, { status: 400 });
  }

  // Generate a fresh token (refresh always so link never expires)
  const newToken = uuidv4();
  const { error: updateError } = await supabase
    .from('entries')
    .update({ invite_token: newToken })
    .eq('id', id);

  if (updateError) {
    console.error('[ResendInvite] Token update failed:', updateError.message);
    return NextResponse.json({ error: 'Failed to generate new invite link' }, { status: 500 });
  }

  const appUrl = getAppUrl();
  const registrationUrl = `${appUrl}/register/${newToken}`;

  try {
    await sendInviteEmail(entry.email, entry.name, registrationUrl);
  } catch (err) {
    console.error('[ResendInvite] Email failed:', err);
    return NextResponse.json({ error: 'Failed to send email. Please check SMTP configuration.' }, { status: 500 });
  }

  try {
    await logActivity({
      action: 'invite_resent',
      performed_by: session.id,
      performed_by_name: session.name,
      entry_id: id,
      candidate_name: entry.name,
      details: { email: entry.email },
    });
  } catch (err) {
    console.error('[Activity] Log failed:', err);
  }

  return NextResponse.json({ success: true, email: entry.email });
}
