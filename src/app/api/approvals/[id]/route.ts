import { NextRequest, NextResponse } from 'next/server';
import { getEntryById, getNextPassNumber, approveEntry, rejectEntry } from '@/lib/db';
import { type GatePassData } from '@/lib/gate-pass';
import { sendGatePassEmail, sendRejectionEmail } from '@/lib/email';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { action } = await req.json();

  if (action === 'approve') {
    const entry = await getEntryById(id);
    if (!entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 });

    const passNumber = await getNextPassNumber();
    const passId = `PASS-${new Date().getFullYear()}-${String(passNumber).padStart(4, '0')}`;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const updated = await approveEntry(id, passId, otp);

    if (entry.email) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
      const gatePassData: GatePassData = {
        passId,
        name: entry.name,
        role: entry.role ?? undefined,
        purpose: entry.purpose,
        reportingDate: entry.reporting_date,
        employeeId: entry.employee_id ?? undefined,
        pocName: entry.poc_name,
        contactNo: entry.contact_no ?? undefined,
        buildingName: entry.building_name,
        photoUrl: entry.photo_url ?? undefined,
      };
      const viewUrl = entry.invite_token ? `${appUrl}/register/${entry.invite_token}/success` : undefined;
      try {
        await sendGatePassEmail(entry.email, entry.name, gatePassData, viewUrl);
        console.log('[Email] Gate pass sent to', entry.email, '—', passId);
      } catch (err) {
        console.error('[Email] Gate pass failed:', err);
      }
    }
    return NextResponse.json(updated);
  }

  if (action === 'reject') {
    const entry = await getEntryById(id);
    if (!entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    const updated = await rejectEntry(id);
    if (entry.email) {
      try {
        await sendRejectionEmail(entry.email, entry.name, entry.purpose);
      } catch (err) {
        console.error('[Email] Rejection email failed:', err);
      }
    }
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
