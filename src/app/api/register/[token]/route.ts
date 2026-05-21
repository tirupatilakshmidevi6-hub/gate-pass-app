import { NextRequest, NextResponse } from 'next/server';
import { getEntryByToken, submitRegistration } from '@/lib/db';
import { generateGatePassBodyHtml } from '@/lib/gate-pass';
import { sendFacilitiesNotificationEmail } from '@/lib/email';

type Params = { params: Promise<{ token: string }> };

const TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function GET(_req: NextRequest, { params }: Params) {
  const { token } = await params;
  const data = await getEntryByToken(token);
  if (!data) return NextResponse.json({ error: 'Invalid or expired registration link' }, { status: 404 });

  // Token is expired if it's been more than 7 days since entry creation and form not yet submitted
  const isExpired = !data.tokenUsed && (Date.now() - new Date(data.entry.created_at).getTime() > TOKEN_EXPIRY_MS);

  let gatePassBodyHtml: string | undefined;

  if (data.entry.status === 'Approved' && data.entry.pass_id) {
    gatePassBodyHtml = generateGatePassBodyHtml({
      passId: data.entry.pass_id,
      name: data.entry.name,
      role: data.entry.role ?? undefined,
      purpose: data.entry.purpose,
      reportingDate: data.entry.reporting_date,
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

  // Client uploads the photo separately via /photo, then POSTs { photoUrl } here.
  let photoUrl: string | null = null;
  try {
    const body = await req.json();
    photoUrl = typeof body?.photoUrl === 'string' ? body.photoUrl : null;
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  await submitRegistration({ entryId: data.entry.id, photoPath: photoUrl });

  try {
    await sendFacilitiesNotificationEmail({
      name: data.entry.name,
      email: data.entry.email,
      mobile_number: data.entry.mobile_number,
      role: data.entry.role,
      purpose: data.entry.purpose,
      reporting_date: data.entry.reporting_date,
      poc_name: data.entry.poc_name,
      building_name: data.entry.building_name,
    });
  } catch (err) {
    console.error('[Email] Facilities notification failed:', err);
  }

  return NextResponse.json({ success: true, name: data.entry.name });
}
