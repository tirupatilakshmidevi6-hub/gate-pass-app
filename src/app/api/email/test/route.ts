import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { sendTestEmail, verifySmtp } from '@/lib/email';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { to } = await req.json();
  if (!to) return NextResponse.json({ error: 'Recipient email is required' }, { status: 400 });

  console.log(`[TestEmail] Verifying SMTP connection…`);
  try {
    await verifySmtp();
    console.log('[TestEmail] SMTP verified ✓');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[TestEmail] SMTP verification failed:', msg);
    return NextResponse.json({ error: `SMTP connection failed: ${msg}` }, { status: 500 });
  }

  console.log(`[TestEmail] Sending test email to: ${to}`);
  try {
    const result = await sendTestEmail(to, session.name ?? 'Admin');
    console.log(`[TestEmail] ✓ Sent | messageId: ${result.messageId}`);
    return NextResponse.json({
      ok: true,
      messageId: result.messageId,
      accepted: result.accepted,
      from: process.env.FROM_EMAIL ?? 'narayana.dubbala@nxtwave.co.in',
      cc: process.env.CC_EMAIL ?? null,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
