import { NextResponse } from 'next/server';

// Invite system removed — users sign up directly at /signup.
export async function POST() {
  return NextResponse.json(
    { error: 'Invite-based user creation is no longer supported. Users sign up directly at /signup.' },
    { status: 410 }
  );
}
