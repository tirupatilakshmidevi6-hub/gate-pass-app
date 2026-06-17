import { NextRequest, NextResponse } from 'next/server';
import { getEntryById, getNextPassNumber, approveEntry, rejectEntry, getAdminEmails, getAdminIds, createNotificationsForUsers, logActivity, markPassEmailSent } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { type GatePassData } from '@/lib/gate-pass';
import { sendGatePassEmail, sendRejectionEmail, sendAdminApprovalNotification, sendAdminRejectionNotification } from '@/lib/email';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { action, reason } = await req.json();
  const session = await getSession();
  const actorName = session?.name ?? 'Facilities Team';
  const actorId = session?.id;

  // ── APPROVE ────────────────────────────────────────────────────────────────
  if (action === 'approve') {
    console.log(`[Approve] Step 1 — Loading entry id=${id}`);
    const entry = await getEntryById(id);
    if (!entry) {
      console.error(`[Approve] Entry not found: ${id}`);
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }
    console.log(`[Approve] Step 1 ✓ — Entry found: ${entry.name} (${entry.email ?? 'no email'})`);

    console.log('[Approve] Step 2 — Generating Pass ID');
    const passNumber = await getNextPassNumber();
    const passId = `PASS-${new Date().getFullYear()}-${String(passNumber).padStart(4, '0')}`;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`[Approve] Step 2 ✓ — Pass ID: ${passId}`);

    console.log('[Approve] Step 3 — Updating entry status to Approved in database');
    const updated = await approveEntry(id, passId, otp);
    console.log(`[Approve] Step 3 ✓ — Entry status set to Approved`);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

    // Send gate pass email to candidate
    if (entry.email) {
      const gatePassData: GatePassData = {
        passId,
        name:          entry.name,
        role:          entry.role ?? undefined,
        purpose:       entry.purpose,
        reportingDate: entry.reporting_date,
        validUntil:    entry.valid_until ?? undefined,
        employeeId:    entry.employee_id ?? undefined,
        pocName:       entry.poc_name,
        contactNo:     entry.contact_no ?? undefined,
        buildingName:  entry.building_name,
        photoUrl:      entry.photo_url ?? undefined,
      };
      const viewUrl = entry.invite_token
        ? `${appUrl}/register/${entry.invite_token}/success`
        : undefined;

      console.log(`[Approve] Step 4 — Sending gate pass email to ${entry.email} | viewUrl: ${viewUrl ?? 'none'}`);
      try {
        await sendGatePassEmail(entry.email, entry.name, gatePassData, viewUrl);
        console.log(`[Approve] Step 4 ✓ — Gate pass email sent to ${entry.email}`);
        await markPassEmailSent(id);
        console.log(`[Approve] Step 4 ✓ — pass_sent_email marked true in database`);
      } catch (err) {
        console.error(`[Approve] Step 4 ✗ — Gate pass email FAILED for ${entry.email}:`, err);
      }
    } else {
      console.warn('[Approve] Step 4 — Skipped: no email address on entry');
    }

    // Notify admins
    console.log('[Approve] Step 5 — Sending admin approval notification');
    try {
      const adminEmails = await getAdminEmails();
      if (adminEmails.length) {
        await sendAdminApprovalNotification(adminEmails.map((a) => a.email), {
          name:           entry.name,
          email:          entry.email,
          role:           entry.role,
          purpose:        entry.purpose,
          reporting_date: entry.reporting_date,
          building_name:  entry.building_name,
          pass_id:        passId,
          valid_until:    entry.valid_until,
        });
        console.log(`[Approve] Step 5 ✓ — Admin notification sent to ${adminEmails.length} admin(s)`);
      } else {
        console.log('[Approve] Step 5 — No admin emails found, skipping');
      }
    } catch (err) {
      console.error('[Approve] Step 5 ✗ — Admin notification failed:', err);
    }

    // In-app notifications
    try {
      const adminIds = await getAdminIds();
      await createNotificationsForUsers(adminIds, {
        title:            `Gate Pass Approved — ${entry.name}`,
        message:          `Entry approved for ${entry.name} by ${actorName}. Pass ID: ${passId}`,
        type:             'success',
        related_entry_id: id,
      });
    } catch (err) {
      console.error('[Approve] In-app notification failed:', err);
    }

    // Activity log
    try {
      await logActivity({
        action:            'entry_approved',
        performed_by:      actorId,
        performed_by_name: actorName,
        entry_id:          id,
        candidate_name:    entry.name,
        details:           { pass_id: passId, building: entry.building_name, purpose: entry.purpose },
      });
    } catch (err) {
      console.error('[Approve] Activity log failed:', err);
    }

    console.log(`[Approve] Complete — ${entry.name} | ${passId}`);
    return NextResponse.json(updated);
  }

  // ── REJECT ─────────────────────────────────────────────────────────────────
  if (action === 'reject') {
    console.log(`[Reject] Step 1 — Loading entry id=${id}`);
    const entry = await getEntryById(id);
    if (!entry) {
      console.error(`[Reject] Entry not found: ${id}`);
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }
    console.log(`[Reject] Step 1 ✓ — Entry found: ${entry.name}`);

    console.log('[Reject] Step 2 — Updating entry status to Rejected');
    const updated = await rejectEntry(id);
    console.log('[Reject] Step 2 ✓ — Entry rejected');

    // Send rejection to candidate
    if (entry.email) {
      console.log(`[Reject] Step 3 — Sending rejection email to ${entry.email}`);
      try {
        await sendRejectionEmail(entry.email, entry.name, entry.purpose);
        console.log(`[Reject] Step 3 ✓ — Rejection email sent to ${entry.email}`);
      } catch (err) {
        console.error(`[Reject] Step 3 ✗ — Rejection email FAILED:`, err);
      }
    }

    // Notify admins
    try {
      const adminEmails = await getAdminEmails();
      if (adminEmails.length) {
        await sendAdminRejectionNotification(adminEmails.map((a) => a.email), {
          name:           entry.name,
          email:          entry.email,
          role:           entry.role,
          purpose:        entry.purpose,
          reporting_date: entry.reporting_date,
          building_name:  entry.building_name,
        });
      }
    } catch (err) {
      console.error('[Reject] Admin notification failed:', err);
    }

    // In-app notifications
    try {
      const adminIds = await getAdminIds();
      await createNotificationsForUsers(adminIds, {
        title:            `Gate Pass Rejected — ${entry.name}`,
        message:          `Entry rejected for ${entry.name} by ${actorName}.${reason ? ' Reason: ' + reason : ''}`,
        type:             'warning',
        related_entry_id: id,
      });
    } catch (err) {
      console.error('[Reject] In-app notification failed:', err);
    }

    // Activity log
    try {
      await logActivity({
        action:            'entry_rejected',
        performed_by:      actorId,
        performed_by_name: actorName,
        entry_id:          id,
        candidate_name:    entry.name,
        details:           { reason: reason ?? null, building: entry.building_name },
      });
    } catch (err) {
      console.error('[Reject] Activity log failed:', err);
    }

    console.log(`[Reject] Complete — ${entry.name}`);
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
