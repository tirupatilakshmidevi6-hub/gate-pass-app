import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getActivityLogs } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role === 'facilities') return NextResponse.json({ error: 'Access denied' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const logs = await getActivityLogs({
    entry_id:     searchParams.get('entry_id')     ?? undefined,
    performed_by: searchParams.get('performed_by') ?? undefined,
    action:       searchParams.get('action')       ?? undefined,
    from_date:    searchParams.get('from')         ?? undefined,
    to_date:      searchParams.get('to')           ?? undefined,
    search:       searchParams.get('q')            ?? undefined,
    limit:        searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 200,
  });
  return NextResponse.json(logs);
}
