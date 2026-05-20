import { NextRequest, NextResponse } from 'next/server';
import { getBuildings, createBuilding, deleteBuilding } from '@/lib/db';

export async function GET() {
  return NextResponse.json(await getBuildings());
}

export async function POST(req: NextRequest) {
  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });
  const building = await createBuilding(name.trim());
  if (!building) return NextResponse.json({ error: 'Failed to create building' }, { status: 500 });
  return NextResponse.json(building, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
  await deleteBuilding(id);
  return NextResponse.json({ ok: true });
}
