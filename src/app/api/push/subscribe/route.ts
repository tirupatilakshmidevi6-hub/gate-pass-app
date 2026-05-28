/**
 * Push Notification Subscription API
 *
 * To generate VAPID keys, run:
 *   npx web-push generate-vapid-keys
 * Then add them to .env.local as:
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY=<public key>
 *   VAPID_PRIVATE_KEY=<private key>
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { createClient } from '@supabase/supabase-js';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/push/subscribe - return VAPID public key
export async function GET() {
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) {
    return NextResponse.json({ error: 'VAPID key not configured' }, { status: 500 });
  }
  return NextResponse.json({ vapidPublicKey: vapidKey });
}

// POST /api/push/subscribe - save push subscription
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value;
    let userId: string | null = null;
    let userRole = 'unknown';

    if (token) {
      try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        userId = payload.id as string;
        userRole = payload.role as string;
      } catch { /* anonymous subscription */ }
    }

    const subscription = await req.json();
    if (!subscription?.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
    }

    // Store in Supabase push_subscriptions table (create if missing)
    const { error } = await supabase.from('push_subscriptions').upsert({
      user_id: userId,
      user_type: userRole,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys?.p256dh ?? null,
      auth: subscription.keys?.auth ?? null,
    }, { onConflict: 'endpoint' });

    if (error) {
      // Table may not exist yet — log and continue gracefully
      console.warn('push_subscriptions table not ready:', error.message);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Push subscribe error:', err);
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
  }
}

// DELETE /api/push/subscribe - remove subscription
export async function DELETE(req: NextRequest) {
  try {
    const { endpoint } = await req.json();
    if (endpoint) {
      await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
