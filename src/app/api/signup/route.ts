import { NextRequest, NextResponse } from 'next/server';
import {
  getAppUserByEmail, isRoleTaken, createDirectUser,
  getAdminEmails, getAdminIds, createNotificationsForUsers, logActivity,
} from '@/lib/db';
import { sendNewSignupRequestToAdmin } from '@/lib/email';
import { RESERVED_ROLES } from '@/lib/auth';

export async function GET() {
  // Tell the frontend which reserved roles are still available (have no active holder)
  const availability: Record<string, boolean> = {};
  for (const role of RESERVED_ROLES) {
    availability[role] = !(await isRoleTaken(role).catch(() => false));
  }
  return NextResponse.json({ availability });
}

export async function POST(req: NextRequest) {
  console.log('[Signup/POST] ─── Request received ─────────────────────────');
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
    }

    let body: Record<string, string>;
    try { body = await req.json(); }
    catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }); }

    const { name, email: rawEmail, password, confirmPassword, role } = body;
    const email       = (rawEmail ?? '').toLowerCase().trim();
    const trimmedRole = (role ?? '').trim();

    if (!name?.trim())                    return NextResponse.json({ error: 'Full name is required' }, { status: 400 });
    if (!email)                           return NextResponse.json({ error: 'Email address is required' }, { status: 400 });
    if (!trimmedRole)                     return NextResponse.json({ error: 'Role is required' }, { status: 400 });
    if (!password || password.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    if (password !== confirmPassword)     return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 });

    // Duplicate email check
    const existing = await getAppUserByEmail(email).catch(() => null);
    if (existing) return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });

    const isReserved = (RESERVED_ROLES as readonly string[]).includes(trimmedRole);

    // Determine status:
    //   Reserved role + unclaimed → active immediately
    //   Reserved role + already has an active holder → pending_approval
    //   Any other role → always pending_approval
    let status: 'active' | 'pending_approval';
    if (isReserved) {
      const taken = await isRoleTaken(trimmedRole);
      status = taken ? 'pending_approval' : 'active';
    } else {
      status = 'pending_approval';
    }

    const result = await createDirectUser({ name: name.trim(), email, password, role: trimmedRole, status });
    if (!result.ok) {
      console.error('[Signup] createDirectUser failed:', result.error);
      if (result.error?.includes('app_users') || result.error?.includes('relation')) {
        return NextResponse.json({ error: 'Database not set up. Please run the SQL migration in Supabase first.' }, { status: 500 });
      }
      return NextResponse.json({ error: result.error ?? 'Failed to create account' }, { status: 500 });
    }

    // ALL pending_approval signups notify Admin
    if (status === 'pending_approval') {
      try {
        const adminEmails = await getAdminEmails();
        if (adminEmails.length) {
          await sendNewSignupRequestToAdmin(adminEmails.map((a) => a.email), {
            name: name.trim(), email, role: trimmedRole,
          });
        }
      } catch (err) { console.error('[Signup] Admin email failed:', err); }

      try {
        const adminIds = await getAdminIds();
        await createNotificationsForUsers(adminIds, {
          title: 'New Account Pending Approval',
          message: `${name.trim()} (${trimmedRole}) signed up and is awaiting your approval.`,
          type: 'info',
        });
      } catch (err) { console.error('[Signup] Notification failed:', err); }
    }

    try {
      await logActivity({
        action: status === 'active' ? 'user_signup_active' : 'user_signup_pending',
        performed_by_name: name.trim(),
        details: { email, role: trimmedRole, status },
      });
    } catch (err) { console.error('[Signup] Activity log failed:', err); }

    console.log('[Signup] Account created:', email, '— role:', trimmedRole, '— status:', status);
    return NextResponse.json({ success: true, status, role: trimmedRole });

  } catch (err) {
    console.error('[Signup] Unhandled error:', err instanceof Error ? err.stack : err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
