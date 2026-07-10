import { NextRequest, NextResponse } from 'next/server';
import { getEntryByToken, submitRegistration, getAdminEmails, getAdminAndFacilitiesIds, createNotificationsForUsers, logActivity } from '@/lib/db';
import { generateGatePassBodyHtml } from '@/lib/gate-pass';
import { sendFacilitiesNotificationEmail, sendAdminRegistrationNotification, sendRegistrationConfirmationEmail } from '@/lib/email';

type Params = { params: Promise<{ token: string }> };

const TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

export async function GET(_req: NextRequest, { params }: Params) {
  const { token } = await params;
  const data = await getEntryByToken(token);
  if (!data) return NextResponse.json({ error: 'Invalid or expired registration link' }, { status: 404 });

  const isExpired = !data.tokenUsed && (Date.now() - new Date(data.entry.created_at).getTime() > TOKEN_EXPIRY_MS);

  let gatePassBodyHtml: string | undefined;
  if (data.entry.status === 'Approved' && data.entry.pass_id) {
    gatePassBodyHtml = generateGatePassBodyHtml({
      passId: data.entry.pass_id,
      name: data.entry.name,
      role: data.entry.role ?? undefined,
      purpose: data.entry.purpose,
      reportingDate: data.entry.reporting_date,
      validUntil: data.entry.valid_until ?? undefined,
      employeeId: data.entry.employee_id ?? undefined,
      pocName: data.entry.poc_name,
      contactNo: data.entry.contact_no ?? undefined,
      buildingName: data.entry.building_name,
      photoUrl: data.entry.photo_url ?? undefined,
    });
  }

  return NextResponse.json({
    entry: {
      id: data.entry.id,
      name: data.entry.name,
      email: data.entry.email,
      mobile_number: data.entry.mobile_number,
      role: data.entry.role,
      purpose: data.entry.purpose,
      reporting_date: data.entry.reporting_date,
      poc_name: data.entry.poc_name,
      building_name: data.entry.building_name,
      status: data.entry.status,
      pass_id: data.entry.pass_id,
    },
    alreadySubmitted: data.tokenUsed,
    isExpired,
    gatePassBodyHtml,
  });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { token } = await params;
  const data = await getEntryByToken(token);
  if (!data) return NextResponse.json({ error: 'Invalid or expired registration link' }, { status: 404 });
  if (data.tokenUsed) return NextResponse.json({ error: 'Registration already submitted' }, { status: 409 });

  let photoUrl: string | null = null;
  try {
    const body = await req.json();
    photoUrl = typeof body?.photoUrl === 'string' ? body.photoUrl : null;
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const entry = data.entry;
  console.log(`[Register] POST — entry id=${entry.id} | name=${entry.name} | email=${entry.email ?? 'MISSING'}`);

  await submitRegistration({ entryId: entry.id, photoPath: photoUrl });
  console.log(`[Register] DB updated — status=Pending Approval`);

  // Step 1: Send confirmation email to candidate
  if (entry.email) {
    console.log(`[Register] Step 1 — Sending confirmation email to candidate: ${entry.email}`);
    try {
      await sendRegistrationConfirmationEmail(entry.email, entry.name);
      console.log(`[Register] Step 1 ✓ — Confirmation email sent to ${entry.email}`);
    } catch (err) {
      console.error(`[Register] Step 1 ✗ — Confirmation email FAILED for ${entry.email}:`, err);
    }
  } else {
    console.warn(`[Register] Step 1 — Skipped: no candidate email on entry id=${entry.id}`);
  }

  // Step 2: Send facilities notification email
  console.log(`[Register] Step 2 — Sending facilities notification | FACILITIES_EMAIL=${process.env.FACILITIES_EMAIL ?? 'NOT SET'}`);
  try {
    await sendFacilitiesNotificationEmail({
      name: entry.name, email: entry.email, mobile_number: entry.mobile_number,
      role: entry.role, purpose: entry.purpose, reporting_date: entry.reporting_date,
      poc_name: entry.poc_name, building_name: entry.building_name,
    });
    console.log('[Register] Step 2 ✓ — Facilities notification sent');
  } catch (err) {
    console.error('[Register] Step 2 ✗ — Facilities notification FAILED:', err);
  }

  // Step 3: Send admin notification emails
  try {
    const adminEmails = await getAdminEmails();
    console.log(`[Register] Step 3 — Admin emails: ${adminEmails.map((a) => a.email).join(', ') || 'none found'}`);
    if (adminEmails.length) {
      await sendAdminRegistrationNotification(adminEmails.map((a) => a.email), {
        name: entry.name, email: entry.email, role: entry.role,
        purpose: entry.purpose, reporting_date: entry.reporting_date,
        poc_name: entry.poc_name, building_name: entry.building_name,
      });
      console.log(`[Register] Step 3 ✓ — Admin notification sent to ${adminEmails.length} admin(s)`);
    }
  } catch (err) {
    console.error('[Register] Step 3 ✗ — Admin notification FAILED:', err);
  }

  // Create in-app notifications for all admins and facilities
  try {
    const userIds = await getAdminAndFacilitiesIds();
    await createNotificationsForUsers(userIds, {
      title: 'New Registration Submitted',
      message: `${entry.name} has submitted their registration form and needs approval.`,
      type: 'info',
      related_entry_id: entry.id,
    });
  } catch (err) {
    console.error('[Notification] Create notification failed:', err);
  }

  // Log activity
  try {
    await logActivity({
      action: 'candidate_submitted_form',
      performed_by_name: entry.name,
      entry_id: entry.id,
      candidate_name: entry.name,
      details: { purpose: entry.purpose, building: entry.building_name },
    });
  } catch (err) {
    console.error('[Activity] Log failed:', err);
  }

  return NextResponse.json({ success: true, name: entry.name });
}
