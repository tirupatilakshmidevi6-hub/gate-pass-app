import { NextRequest, NextResponse } from 'next/server';
import { getEntryByToken, submitRegistration, getAdminEmails, getAdminAndFacilitiesIds, createNotificationsForUsers, logActivity } from '@/lib/db';
import { generateGatePassBodyHtml } from '@/lib/gate-pass';
import { sendFacilitiesNotificationEmail, sendAdminRegistrationNotification } from '@/lib/email';

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
  await submitRegistration({ entryId: entry.id, photoPath: photoUrl });

  // Send facilities notification email
  try {
    await sendFacilitiesNotificationEmail({
      name: entry.name, email: entry.email, mobile_number: entry.mobile_number,
      role: entry.role, purpose: entry.purpose, reporting_date: entry.reporting_date,
      poc_name: entry.poc_name, building_name: entry.building_name,
    });
  } catch (err) {
    console.error('[Email] Facilities notification failed:', err);
  }

  // Send admin notification emails
  try {
    const adminEmails = await getAdminEmails();
    if (adminEmails.length) {
      await sendAdminRegistrationNotification(adminEmails.map((a) => a.email), {
        name: entry.name, email: entry.email, role: entry.role,
        purpose: entry.purpose, reporting_date: entry.reporting_date,
        poc_name: entry.poc_name, building_name: entry.building_name,
      });
    }
  } catch (err) {
    console.error('[Email] Admin registration notification failed:', err);
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
