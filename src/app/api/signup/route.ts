import { NextRequest, NextResponse } from 'next/server';
import { getAppUserByEmail, hasSuperAdmin, createDirectUser } from '@/lib/db';

export async function GET() {
  console.log('[Signup/GET] Checking if super admin exists...');
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('[Signup/GET] NEXT_PUBLIC_SUPABASE_URL is not set');
      return NextResponse.json({ hasSuperAdmin: false, error: 'Server not configured' });
    }
    const superAdminExists = await hasSuperAdmin();
    console.log('[Signup/GET] hasSuperAdmin:', superAdminExists);
    return NextResponse.json({ hasSuperAdmin: superAdminExists });
  } catch (err) {
    console.error('[Signup/GET] Error checking super admin:', err instanceof Error ? err.message : err);
    return NextResponse.json({ hasSuperAdmin: false });
  }
}

export async function POST(req: NextRequest) {
  console.log('[Signup/POST] ─── Request received ─────────────────────────');
  try {
    // ── Verify Supabase env vars ──────────────────────────────────────────
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('[Signup/POST] NEXT_PUBLIC_SUPABASE_URL is not set');
      return NextResponse.json(
        { error: 'Server configuration error. Please contact support.' },
        { status: 500 }
      );
    }

    // ── Parse body ────────────────────────────────────────────────────────
    let body: Record<string, string>;
    try {
      body = await req.json();
    } catch {
      console.error('[Signup/POST] Failed to parse request body');
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { name, email: rawEmail, password, confirmPassword, role } = body;
    const email = (rawEmail ?? '').toLowerCase().trim();
    console.log('[Signup/POST] Name:', name, '| Email:', email, '| Role:', role);

    // ── Validate fields ───────────────────────────────────────────────────
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Full name is required' }, { status: 400 });
    }
    if (!email) {
      return NextResponse.json({ error: 'Email address is required' }, { status: 400 });
    }
    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }
    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 });
    }

    // ── Check for duplicate email ─────────────────────────────────────────
    console.log('[Signup/POST] Checking for existing account...');
    let existing = null;
    try {
      existing = await getAppUserByEmail(email);
      console.log('[Signup/POST] Existing account check:', existing ? 'Found (duplicate)' : 'None');
    } catch (err) {
      console.error('[Signup/POST] Error checking existing user:', err instanceof Error ? err.message : err);
      return NextResponse.json({ error: 'Database error. Please check if the app_users table exists in Supabase.' }, { status: 500 });
    }

    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    }

    // ── Determine role ────────────────────────────────────────────────────
    console.log('[Signup/POST] Checking if any super admin exists...');
    let superAdminExists = false;
    try {
      superAdminExists = await hasSuperAdmin();
      console.log('[Signup/POST] superAdminExists:', superAdminExists);
    } catch (err) {
      console.error('[Signup/POST] Error checking super admin:', err instanceof Error ? err.message : err);
      return NextResponse.json({ error: 'Database error. Please check Supabase connection.' }, { status: 500 });
    }

    let finalRole: 'super_admin' | 'admin' | 'facilities';
    if (!superAdminExists) {
      finalRole = 'super_admin';
      console.log('[Signup/POST] No super admin found — assigning super_admin role');
    } else if (role === 'admin' || role === 'facilities') {
      finalRole = role;
    } else {
      console.error('[Signup/POST] Invalid role:', role);
      return NextResponse.json({ error: 'Invalid role selected' }, { status: 400 });
    }

    // ── Create user ───────────────────────────────────────────────────────
    console.log('[Signup/POST] Creating user with role:', finalRole);
    const result = await createDirectUser({ name: name.trim(), email, password, role: finalRole });

    if (!result.ok) {
      console.error('[Signup/POST] createDirectUser failed:', result.error);
      if (result.error?.includes('app_users') || result.error?.includes('relation')) {
        return NextResponse.json(
          { error: 'The app_users table does not exist. Please run the SQL migration in Supabase first.' },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { error: `Failed to create account: ${result.error ?? 'Unknown error'}` },
        { status: 500 }
      );
    }

    console.log('[Signup/POST] Account created successfully:', email, '— role:', finalRole);
    return NextResponse.json({ success: true, role: finalRole });

  } catch (err) {
    console.error('[Signup/POST] Unhandled error:', err instanceof Error ? err.stack : err);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
