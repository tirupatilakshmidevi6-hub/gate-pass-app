import { NextRequest, NextResponse } from 'next/server';
import { getEntryById, getNextPassNumber, approveEntry, rejectEntry, getAdminEmails, getAdminIds, createNotificationsForUsers, logActivity } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { type GatePassData } from '@/lib/gate-pass';
import { sendGatePassEmail, sendRejectionEmail, sendAdminApprovalNotification, sendAdminRejectionNotification } from '@/lib/email';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { action, reason } = await req.json();
  const session = await getSession();
  const actorName = session?.name ?? 'Facilities Team';
  const actorId = session?.id;

  if (action === 'approve') {
    const entry = await getEntryById(id);
    if (!entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 });

    const passNumber = await getNextPassNumber();
    const passId = `PASS-${new Date().getFullYear()}-${String(passNumber).padStart(4, '0')}`;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const updated = await approveEntry(id, passId, otp);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

    // Send gate pass to candidate
    if (entry.email) {
      const gatePassData: GatePassData = {
        passId,
        name: entry.name,
        role: entry.role ?? undefined,
        purpose: entry.purpose,
        reportingDate: entry.reporting_date,
        validUntil: entry.valid_until ?? undefined,
        employeeId: entry.employee_id ?? undefined,
        pocName: entry.poc_name,
        contactNo: entry.contact_no ?? undefined,
        buildingName: entry.building_name,
        photoUrl: entry.photo_url ?? undefined,
      };
      const viewUrl = entry.invite_token ? `${appUrl}/register/${entry.invite_token}/success` : undefined;
      try {
        await sendGatePassEmail(entry.email, entry.name, gatePassData, viewUrl);
      } catch (err) {
        console.error('[Email] Gate pass failed:', err);
      }
    }

    // Notify admins by email
    try {
      const adminEmails = await getAdminEmails();
      if (adminEmails.length) {
        await sendAdminApprovalNotification(adminEmails.map((a) => a.email), {
          name: entry.name, email: entry.email, role: entry.role,
          purpose: entry.purpose, reporting_date: entry.reporting_date,
          building_name: entry.building_name, pass_id: passId,
          valid_until: entry.valid_until,
        });
      }
    } catch (err) {
      console.error('[Email] Admin approval notification failed:', err);
    }

    // In-app notifications for admins
    try {
      const adminIds = await getAdminIds();
      await createNotificationsForUsers(adminIds, {
        title: `Gate Pass Approved — ${entry.name}`,
        message: `Entry approved for ${entry.name} by ${actorName}. Pass ID: ${passId}`,
        type: 'success',
        related_entry_id: id,
      });
    } catch (err) {
      console.error('[Notification] Approval notification failed:', err);
    }

    // Activity log
    try {
      await logActivity({
        action: 'entry_approved',
        performed_by: actorId,
        performed_by_name: actorName,
        entry_id: id,
        candidate_name: entry.name,
        details: { pass_id: passId, building: entry.building_name, purpose: entry.purpose },
      });
    } catch (err) {
      console.error('[Activity] Log failed:', err);
    }

    return NextResponse.json(updated);
  }

  if (action === 'reject') {
    const entry = await getEntryById(id);
    if (!entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    const updated = await rejectEntry(id);

    // Send rejection to candidate
    if (entry.email) {
      try {
        await sendRejectionEmail(entry.email, entry.name, entry.purpose);
      } catch (err) {
        console.error('[Email] Rejection email failed:', err);
      }
    }

    // Notify admins by email
    try {
      const adminEmails = await getAdminEmails();
      if (adminEmails.length) {
        await sendAdminRejectionNotification(adminEmails.map((a) => a.email), {
          name: entry.name, email: entry.email, role: entry.role,
          purpose: entry.purpose, reporting_date: entry.reporting_date,
          building_name: entry.building_name,
        });
      }
    } catch (err) {
      console.error('[Email] Admin rejection notification failed:', err);
    }

    // In-app notifications for admins
    try {
      const adminIds = await getAdminIds();
      await createNotificationsForUsers(adminIds, {
        title: `Gate Pass Rejected — ${entry.name}`,
        message: `Entry rejected for ${entry.name} by ${actorName}.${reason ? ' Reason: ' + reason : ''}`,
        type: 'warning',
        related_entry_id: id,
      });
    } catch (err) {
      console.error('[Notification] Rejection notification failed:', err);
    }

    // Activity log
    try {
      await logActivity({
        action: 'entry_rejected',
        performed_by: actorId,
        performed_by_name: actorName,
        entry_id: id,
        candidate_name: entry.name,
        details: { reason: reason ?? null, building: entry.building_name },
      });
    } catch (err) {
      console.error('[Activity] Log failed:', err);
    }

    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
