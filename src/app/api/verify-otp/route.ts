import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ error: 'OTP verification is not available' }, { status: 410 });
}
