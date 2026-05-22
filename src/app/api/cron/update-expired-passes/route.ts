import { NextRequest, NextResponse } from 'next/server';
import { updateExpiredPasses, getAdminIds, createNotificationsForUsers, logActivity } from '@/lib/db';

export async function GET(req: NextRequest) {
  // Allow Vercel cron (Authorization header) or any authenticated internal call
  const authHeader = req.headers.get('authorization');
  if (
    process.env.NODE_ENV === 'production' &&
    authHeader !== `Bearer ${process.env.CRON_SECRET ?? 'nxtwave-cron-secret'}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const count = await updateExpiredPasses();
    console.log(`[Cron] Updated ${count} expired passes`);

    if (count > 0) {
      try {
        const adminIds = await getAdminIds();
        await createNotificationsForUsers(adminIds, {
          title: 'Passes Expired Automatically',
          message: `${count} gate pass${count === 1 ? '' : 'es'} have been automatically marked as expired.`,
          type: 'warning',
        });
        await logActivity({
          action: 'passes_expired_auto',
          performed_by_name: 'System',
          details: { count },
        });
      } catch (err) {
        console.error('[Cron] Notification/log failed:', err);
      }
    }

    return NextResponse.json({ ok: true, expired: count });
  } catch (err) {
    console.error('[Cron] update-expired-passes error:', err);
    return NextResponse.json({ error: 'Failed to update expired passes' }, { status: 500 });
  }
}
