import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getAppUserById, updateAppUser } from '@/lib/db';
import { sendUserInviteEmail } from '@/lib/email';
import { getSession } from '@/lib/auth';

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || session.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const user = await getAppUserById(id);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  if (user.status !== 'invited') {
    return NextResponse.json({ error: 'User is not in invited status' }, { status: 400 });
  }

  const newToken = uuidv4();
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  await updateAppUser(id, { invite_token: newToken, invite_token_expires_at: expiresAt });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const signupUrl = `${appUrl}/signup/${newToken}`;

  try {
    await sendUserInviteEmail(user.email, user.name, session.name, user.role, signupUrl);
  } catch (err) {
    return NextResponse.json({ error: `Email failed: ${err instanceof Error ? err.message : String(err)}` }, { status: 500 });
  }

  return NextResponse.json({ success: true, email: user.email });
}
