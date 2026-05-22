import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getAppUserByEmail, getUserByEmail } from '@/lib/db';
import { signToken, COOKIE_NAME } from '@/lib/auth';

export async function POST(req: NextRequest) {
  console.log('[Login] ─── Request received ───────────────────────────────');
  try {
    // ── Parse body ─────────────────────────────────────────────────────────
    let email: string, password: string;
    try {
      const body = await req.json();
      email    = (body.email    ?? '').toString().toLowerCase().trim();
      password = (body.password ?? '').toString();
    } catch {
      console.error('[Login] Failed to parse request body');
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    console.log('[Login] Email received:', email);

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // ── Verify Supabase env vars are present ──────────────────────────────
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('[Login] NEXT_PUBLIC_SUPABASE_URL is not set');
      return NextResponse.json({ error: 'Server configuration error. Please contact support.' }, { status: 500 });
    }
    console.log('[Login] Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);

    // ── Try app_users table ───────────────────────────────────────────────
    console.log('[Login] Looking up user in app_users table...');
    let appUser = null;
    try {
      appUser = await getAppUserByEmail(email);
      console.log('[Login] app_users lookup result:', appUser ? `Found user (status: ${appUser.status}, role: ${appUser.role})` : 'Not found');
    } catch (err) {
      console.error('[Login] app_users lookup threw an error:', err instanceof Error ? err.message : err);
    }

    if (appUser) {
      if (appUser.status === 'inactive') {
        console.log('[Login] Account is inactive, rejecting');
        return NextResponse.json(
          { error: 'Your account has been deactivated. Please contact your administrator.' },
          { status: 401 }
        );
      }
      if (appUser.status === 'invited' || !appUser.password_hash) {
        console.log('[Login] Account is in invited state or has no password hash');
        return NextResponse.json(
          { error: 'Your account has not been set up yet. Please check your invitation email.' },
          { status: 401 }
        );
      }

      console.log('[Login] Comparing password with bcrypt...');
      let valid = false;
      try {
        valid = await bcrypt.compare(password, appUser.password_hash);
      } catch (err) {
        console.error('[Login] bcrypt.compare failed:', err instanceof Error ? err.message : err);
        return NextResponse.json({ error: 'Login failed. Please try again.' }, { status: 500 });
      }
      console.log('[Login] Password match:', valid);

      if (!valid) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      }

      console.log('[Login] Generating JWT token...');
      const token = await signToken({ id: appUser.id, email: appUser.email, role: appUser.role, name: appUser.name });
      const res = NextResponse.json({ role: appUser.role, name: appUser.name });
      res.cookies.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24,
      });
      console.log('[Login] Success for', email, '— role:', appUser.role);
      return res;
    }

    // ── Fallback to legacy users table ────────────────────────────────────
    console.log('[Login] User not in app_users, trying legacy users table...');
    let oldUser = null;
    try {
      oldUser = await getUserByEmail(email);
      console.log('[Login] users table lookup result:', oldUser ? `Found (role: ${oldUser.role})` : 'Not found');
    } catch (err) {
      console.error('[Login] users table lookup threw:', err instanceof Error ? err.message : err);
    }

    if (!oldUser) {
      console.log('[Login] User not found in either table');
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, oldUser.password);
    console.log('[Login] Legacy password match:', valid);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const token = await signToken({
      id: oldUser.id,
      email: oldUser.email,
      role: oldUser.role as 'admin' | 'facilities',
      name: oldUser.name,
    });
    const res = NextResponse.json({ role: oldUser.role, name: oldUser.name });
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24,
    });
    console.log('[Login] Legacy login success for', email, '— role:', oldUser.role);
    return res;

  } catch (err) {
    console.error('[Login] Unhandled error:', err instanceof Error ? err.stack : err);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
