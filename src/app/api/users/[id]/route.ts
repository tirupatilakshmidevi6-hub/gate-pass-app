import { NextRequest, NextResponse } from 'next/server';
import { getAppUserById, updateAppUser } from '@/lib/db';
import { getSession } from '@/lib/auth';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || session.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const { action } = await req.json();

  const user = await getAppUserById(id);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Prevent deactivating the super admin
  if (user.role === 'super_admin') {
    return NextResponse.json({ error: 'Cannot modify the Super Admin account' }, { status: 400 });
  }

  let newStatus: 'active' | 'inactive';
  if (action === 'deactivate') newStatus = 'inactive';
  else if (action === 'activate')   newStatus = 'active';
  else return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  const updated = await updateAppUser(id, { status: newStatus });
  return NextResponse.json(updated);
}
