import { NextResponse } from 'next/server';

// Invite-based signup has been replaced with the open signup flow at /signup
// This route is kept to avoid broken links but redirects to the main signup page
export async function GET() {
  return NextResponse.json(
    { valid: false, alreadyUsed: false, expired: true, error: 'Invite links are no longer used. Please sign up directly at /signup.' },
    { status: 410 }
  );
}

export async function POST() {
  return NextResponse.json(
    { error: 'Invite-based signup is no longer supported. Please visit /signup to create an account.' },
    { status: 410 }
  );
}
