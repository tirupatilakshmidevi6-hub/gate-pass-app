import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const notifications = await getNotifications(session.id);
  return NextResponse.json(notifications);
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  if (body.markAll) {
    await markAllNotificationsRead(session.id);
    return NextResponse.json({ ok: true });
  }

  if (body.id) {
    await markNotificationRead(body.id, session.id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Provide id or markAll:true' }, { status: 400 });
}
