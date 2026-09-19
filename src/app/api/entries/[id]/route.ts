import { NextRequest, NextResponse } from 'next/server';
import { getEntryById, updateEntryBuilding } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const entry = await getEntryById(id);
  if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(entry);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'ta')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const body = await req.json() as { building_name?: unknown };
  const { building_name } = body;
  if (!building_name || typeof building_name !== 'string') {
    return NextResponse.json({ error: 'building_name is required' }, { status: 400 });
  }
  const updated = await updateEntryBuilding(id, building_name.trim());
  if (!updated) return NextResponse.json({ error: 'Entry not found or update failed' }, { status: 404 });
  return NextResponse.json(updated);
}
