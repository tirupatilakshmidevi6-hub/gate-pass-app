import { NextRequest, NextResponse } from 'next/server';
import { getEntryById, logActivity } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { type GatePassData } from '@/lib/gate-pass';
import { sendGatePassEmail } from '@/lib/email';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  void req;
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const entry = await getEntryById(id);
  if (!entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 });

  if (entry.status !== 'Approved') {
    return NextResponse.json({ error: 'Gate pass can only be resent for approved entries' }, { status: 400 });
  }
  if (!entry.email) {
    return NextResponse.json({ error: 'No email address on file for this entry' }, { status: 400 });
  }
  if (!entry.pass_id) {
    return NextResponse.json({ error: 'No pass ID found for this entry' }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const viewUrl = entry.invite_token ? `${appUrl}/register/${entry.invite_token}/success` : undefined;

  const gatePassData: GatePassData = {
    passId: entry.pass_id,
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

  try {
    await sendGatePassEmail(entry.email, entry.name, gatePassData, viewUrl);
  } catch (err) {
    console.error('[ResendGatePass] Email failed:', err);
    return NextResponse.json({ error: 'Failed to send gate pass email. Please check SMTP configuration.' }, { status: 500 });
  }

  try {
    await logActivity({
      action: 'gate_pass_resent',
      performed_by: session.id,
      performed_by_name: session.name,
      entry_id: id,
      candidate_name: entry.name,
      details: { email: entry.email, pass_id: entry.pass_id },
    });
  } catch (err) {
    console.error('[Activity] Log failed:', err);
  }

  return NextResponse.json({ success: true, email: entry.email });
}
