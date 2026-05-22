import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getAllAppUsers, createAppUser, getAppUserByEmail } from '@/lib/db';
import { sendUserInviteEmail } from '@/lib/email';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return NextResponse.json(await getAllAppUsers());
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { name, email, role } = await req.json();
  if (!name || !email || !role) {
    return NextResponse.json({ error: 'Name, email, and role are required' }, { status: 400 });
  }
  if (!['admin', 'facilities'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  const existing = await getAppUserByEmail(email);
  if (existing) {
    return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
  }

  const inviteToken = uuidv4();
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  const user = await createAppUser({
    name, email, role: role as 'admin' | 'facilities',
    invite_token: inviteToken,
    invite_token_expires_at: expiresAt,
    created_by: session.id,
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const signupUrl = `${appUrl}/signup/${inviteToken}`;

  let emailSent = false;
  let emailError = '';
  try {
    await sendUserInviteEmail(email, name, session.name, role, signupUrl);
    emailSent = true;
  } catch (err) {
    emailError = err instanceof Error ? err.message : String(err);
    console.error('[Email] User invite failed:', emailError);
  }

  return NextResponse.json({ ...user, signupUrl, emailSent, emailError }, { status: 201 });
}
