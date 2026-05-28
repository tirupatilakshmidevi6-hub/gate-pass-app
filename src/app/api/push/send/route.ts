/**
 * Push Notification Sender API
 * Internal use only — called from other API routes to trigger push notifications.
 *
 * VAPID key generation:
 *   npx web-push generate-vapid-keys
 */

import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function initVapid() {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(
    'mailto:' + (process.env.GMAIL_USER ?? 'admin@nxtwave.com'),
    pub,
    priv
  );
  return true;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  /** Send to specific user IDs, or omit to send to all */
  userIds?: string[];
  /** Filter by role */
  roles?: string[];
};

export async function POST(req: NextRequest) {
  if (!initVapid()) {
    return NextResponse.json({ error: 'VAPID not configured' }, { status: 500 });
  }

  const payload: PushPayload = await req.json();

  // Fetch subscriptions from Supabase
  let query = supabase.from('push_subscriptions').select('*');
  if (payload.userIds?.length) {
    query = query.in('user_id', payload.userIds);
  }
  if (payload.roles?.length) {
    query = query.in('user_type', payload.roles);
  }

  const { data: subs, error } = await query;
  if (error) {
    console.warn('Could not fetch push subscriptions:', error.message);
    return NextResponse.json({ sent: 0 });
  }
  if (!subs?.length) return NextResponse.json({ sent: 0 });

  const notification = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon ?? '/icons/icon-192x192.png',
    badge: payload.badge ?? '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: { url: payload.url ?? '/' },
    tag: payload.tag,
  });

  const results = await Promise.allSettled(
    subs.map(async (sub) => {
      if (!sub.endpoint) return;
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh ?? '', auth: sub.auth ?? '' },
          },
          notification
        );
      } catch (err: any) {
        // Remove expired subscriptions (410 Gone)
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        }
        throw err;
      }
    })
  );

  const sent = results.filter((r) => r.status === 'fulfilled').length;
  return NextResponse.json({ sent, total: subs.length });
}
