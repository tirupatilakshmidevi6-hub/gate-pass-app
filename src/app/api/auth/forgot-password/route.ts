import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getAppUserByEmail, saveResetToken } from '@/lib/db';
import { sendPasswordResetEmail } from '@/lib/email';
import { getAppUrl } from '@/lib/app-url';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email?.trim()) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    const normalizedEmail = email.toLowerCase().trim();

    // Always respond with success for security (don't reveal if email exists)
    const user = await getAppUserByEmail(normalizedEmail).catch(() => null);
    if (user && user.status === 'active') {
      const token = uuidv4();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await saveResetToken(user.id, token, expiresAt);

      const appUrl = getAppUrl();
      const resetUrl = `${appUrl}/reset-password/${token}`;

      try {
        await sendPasswordResetEmail(normalizedEmail, user.name, resetUrl);
      } catch (err) {
        console.error('[ForgotPassword] Email failed:', err);
      }
    }

    return NextResponse.json({
      message: 'If this email exists, you will receive a reset link shortly.',
    });
  } catch (err) {
    console.error('[ForgotPassword] Error:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
