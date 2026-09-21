import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getAppUserByEmail, getUserByEmail } from '@/lib/db';
import { signToken, COOKIE_NAME } from '@/lib/auth';

export async function POST(req: NextRequest) {
  console.log('[Login] ─── Request received ───────────────────────────────');
  try {
    let email: string, password: string;
    try {
      const body = await req.json();
      email    = (body.email    ?? '').toString().toLowerCase().trim();
      password = (body.password ?? '').toString();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    console.log('[Login] Email:', email);
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // ── Try app_users first ──────────────────────────────────────────────────
    const appUser = await getAppUserByEmail(email).catch(() => null);
    console.log('[Login] app_users result:', appUser ? `found (status: ${appUser.status}, role: ${appUser.role})` : 'not found');

    if (appUser) {
      if (appUser.status === 'inactive') {
        return NextResponse.json(
          { error: 'Your account has been deactivated. Please contact your administrator.' },
          { status: 401 }
        );
      }
      if (appUser.status === 'pending_approval') {
        return NextResponse.json(
          { error: 'Your account is pending Admin approval.' },
          { status: 401 }
        );
      }
      if (appUser.status === 'rejected') {
        return NextResponse.json(
          { error: 'Your account request has been rejected. Please contact your administrator.' },
          { status: 401 }
        );
      }
      if (!appUser.password_hash) {
        return NextResponse.json(
          { error: 'Account setup is incomplete. Please contact your administrator.' },
          { status: 401 }
        );
      }

      const valid = await bcrypt.compare(password, appUser.password_hash).catch(() => false);
      console.log('[Login] Password match:', valid);
      if (!valid) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      }

      const token = await signToken({ id: appUser.id, email: appUser.email, role: appUser.role, name: appUser.name });
      const res = NextResponse.json({ role: appUser.role, name: appUser.name });
      res.cookies.set(COOKIE_NAME, token, {
        httpOnly: true, secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24,
      });
      console.log('[Login] Success:', email, '— role:', appUser.role);
      return res;
    }

    // ── Fallback to legacy users table ────────────────────────────────────────
    const oldUser = await getUserByEmail(email).catch(() => null);
    if (!oldUser) {
      console.log('[Login] Not found in either table');
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }
    const valid = await bcrypt.compare(password, oldUser.password);
    if (!valid) return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });

    const token = await signToken({ id: oldUser.id, email: oldUser.email, role: oldUser.role as 'admin' | 'facilities', name: oldUser.name });
    const res = NextResponse.json({ role: oldUser.role, name: oldUser.name });
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24,
    });
    return res;

  } catch (err) {
    console.error('[Login] Unhandled error:', err instanceof Error ? err.stack : err);
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 });
  }
}
