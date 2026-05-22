import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getAppUserByInviteToken, updateAppUser } from '@/lib/db';

type Params = { params: Promise<{ token: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { token } = await params;
  const user = await getAppUserByInviteToken(token);

  if (!user || !user.invite_token) {
    return NextResponse.json({ valid: false, expired: false });
  }
  if (user.status !== 'invited') {
    return NextResponse.json({ valid: false, expired: false, alreadyUsed: true });
  }
  const now = Date.now();
  const exp = user.invite_token_expires_at ? new Date(user.invite_token_expires_at).getTime() : 0;
  if (exp && now > exp) {
    return NextResponse.json({ valid: false, expired: true });
  }

  return NextResponse.json({
    valid: true,
    name: user.name,
    email: user.email,
    role: user.role,
  });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { token } = await params;
  const user = await getAppUserByInviteToken(token);

  if (!user || user.status !== 'invited') {
    return NextResponse.json({ error: 'Invalid or already used invite link' }, { status: 400 });
  }
  if (user.invite_token_expires_at) {
    const exp = new Date(user.invite_token_expires_at).getTime();
    if (Date.now() > exp) {
      return NextResponse.json({ error: 'This invite link has expired' }, { status: 400 });
    }
  }

  const { password } = await req.json().catch(() => ({}));
  if (!password || typeof password !== 'string' || password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const hash = await bcrypt.hash(password, 10);
  await updateAppUser(user.id, {
    password_hash: hash,
    status: 'active',
    invite_token: null,
    invite_token_expires_at: null,
  });

  return NextResponse.json({ success: true });
}
