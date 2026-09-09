import { NextRequest, NextResponse } from 'next/server';
import {
  getEntryById, renewEntry, checkDuplicateEntry,
  getAdminAndFacilitiesIds, createNotificationsForUsers, logActivity,
} from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'ta')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { reporting_date, valid_until, purpose, role, building_name, poc_name, contact_no } = body;

  if (!reporting_date || !purpose || !building_name || !poc_name || !contact_no) {
    return NextResponse.json(
      { error: 'reporting_date, purpose, building_name, poc_name and contact_no are required' },
      { status: 400 },
    );
  }

  const original = await getEntryById(id);
  if (!original) return NextResponse.json({ error: 'Entry not found' }, { status: 404 });

  if (!['Expired', 'Rejected'].includes(original.status)) {
    return NextResponse.json(
      { error: 'Only Expired or Rejected entries can be renewed' },
      { status: 400 },
    );
  }

  if (original.email) {
    const dup = await checkDuplicateEntry(original.email, reporting_date);
    if (dup) {
      return NextResponse.json(
        { error: `An entry already exists for ${original.email} on ${reporting_date}` },
        { status: 409 },
      );
    }
  }

  console.log(`[Renew] Creating renewed entry for ${original.name} — new date: ${reporting_date}`);
  const newEntry = await renewEntry(id, {
    reporting_date,
    valid_until:   valid_until || undefined,
    purpose,
    role:          role || undefined,
    building_name,
    poc_name,
    contact_no,
    created_by:    session.name,
  });
  console.log(`[Renew] New entry created id=${newEntry.id}`);

  try {
    const recipientIds = await getAdminAndFacilitiesIds();
    await createNotificationsForUsers(recipientIds, {
      title:            `Renewed Entry — ${original.name}`,
      message:          `Entry renewed for ${original.name} by ${session.name}. Purpose: ${purpose}. Awaiting approval.`,
      type:             'info',
      related_entry_id: newEntry.id,
    });
  } catch (err) {
    console.error('[Renew] Notification failed:', err);
  }

  try {
    await logActivity({
      action:            'entry_renewed',
      performed_by:      session.id,
      performed_by_name: session.name,
      entry_id:          newEntry.id,
      candidate_name:    original.name,
      details:           { original_entry_id: id, purpose, building: building_name },
    });
  } catch (err) {
    console.error('[Renew] Activity log failed:', err);
  }

  return NextResponse.json(newEntry, { status: 201 });
}
