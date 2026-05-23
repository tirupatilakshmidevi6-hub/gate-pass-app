import { NextRequest, NextResponse } from 'next/server';
import { getAppUserById, approveUser, rejectUser, updateAppUser, logActivity } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { sendUserApprovalEmail, sendUserRejectionEmail } from '@/lib/email';
import { RESERVED_ROLES } from '@/lib/auth';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { action, reason } = body as { action: string; reason?: string };

  const user = await getAppUserById(id);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Reserved-role accounts cannot be deactivated or rejected
  if ((RESERVED_ROLES as readonly string[]).includes(user.role) && (action === 'deactivate' || action === 'reject')) {
    return NextResponse.json({ error: 'Reserved role accounts cannot be deactivated or rejected' }, { status: 400 });
  }

  if (action === 'approve') {
    const updated = await approveUser(id, session.id);
    try {
      await sendUserApprovalEmail(user.email, user.name);
      await logActivity({ action: 'user_activated', performed_by: session.id, performed_by_name: session.name, details: { target_email: user.email, role: user.role } });
    } catch (err) { console.error('[Users] Approval side-effects failed:', err); }
    return NextResponse.json(updated);
  }

  if (action === 'reject') {
    const rejectionReason = reason?.trim() || 'No reason provided';
    const updated = await rejectUser(id, rejectionReason, session.id);
    try {
      await sendUserRejectionEmail(user.email, user.name, rejectionReason);
      await logActivity({ action: 'user_deactivated', performed_by: session.id, performed_by_name: session.name, details: { target_email: user.email, reason: rejectionReason } });
    } catch (err) { console.error('[Users] Rejection side-effects failed:', err); }
    return NextResponse.json(updated);
  }

  if (action === 'deactivate') {
    const updated = await updateAppUser(id, { status: 'inactive' });
    await logActivity({ action: 'user_deactivated', performed_by: session.id, performed_by_name: session.name, details: { target_email: user.email } });
    return NextResponse.json(updated);
  }

  if (action === 'activate') {
    const updated = await updateAppUser(id, { status: 'active' });
    await logActivity({ action: 'user_activated', performed_by: session.id, performed_by_name: session.name, details: { target_email: user.email } });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
