import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getUserByResetToken, clearResetToken, updateUserPassword } from '@/lib/db';

type Params = { params: Promise<{ token: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { token } = await params;
  const user = await getUserByResetToken(token).catch(() => null);

  if (!user || !user.reset_token) {
    return NextResponse.json({ valid: false, error: 'Invalid reset link' });
  }
  const exp = user.reset_token_expires_at ? new Date(user.reset_token_expires_at).getTime() : 0;
  if (exp && Date.now() > exp) {
    return NextResponse.json({ valid: false, expired: true, error: 'Reset link has expired' });
  }
  return NextResponse.json({ valid: true, name: user.name, email: user.email });
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { token } = await params;
    const { password, confirmPassword } = await req.json();

    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }
    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 });
    }

    const user = await getUserByResetToken(token).catch(() => null);
    if (!user || !user.reset_token) {
      return NextResponse.json({ error: 'Invalid or already used reset link' }, { status: 400 });
    }
    const exp = user.reset_token_expires_at ? new Date(user.reset_token_expires_at).getTime() : 0;
    if (exp && Date.now() > exp) {
      return NextResponse.json({ error: 'Reset link has expired. Please request a new one.' }, { status: 400 });
    }

    const hash = await bcrypt.hash(password, 10);
    await updateUserPassword(user.id, hash);
    await clearResetToken(user.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[ResetPassword] Error:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
