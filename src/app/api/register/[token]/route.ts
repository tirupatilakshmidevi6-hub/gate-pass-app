import { NextRequest, NextResponse } from 'next/server';
import { getEntryByToken, submitRegistration } from '@/lib/db';
import { generateGatePassBodyHtml } from '@/lib/gate-pass';
import { sendFacilitiesNotificationEmail } from '@/lib/email';
import { supabase } from '@/lib/supabase';

const STORAGE_BUCKET = 'gate-pass-photos';

type Params = { params: Promise<{ token: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { token } = await params;
  const data = await getEntryByToken(token);
  if (!data) return NextResponse.json({ error: 'Invalid or expired registration link' }, { status: 404 });

  let gatePassBodyHtml: string | undefined;

  if (data.entry.status === 'Approved' && data.entry.pass_id) {
    gatePassBodyHtml = generateGatePassBodyHtml({
      passId: data.entry.pass_id,
      name: data.entry.name,
      role: data.entry.role ?? undefined,
      purpose: data.entry.purpose,
      reportingDate: data.entry.reporting_date,
      pocName: data.entry.poc_name,
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
    gatePassBodyHtml,
  });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { token } = await params;
  const data = await getEntryByToken(token);
  if (!data) return NextResponse.json({ error: 'Invalid or expired registration link' }, { status: 404 });
  if (data.tokenUsed) return NextResponse.json({ error: 'Registration already submitted' }, { status: 409 });

  const formData = await req.formData();
  const photoFile = formData.get('photo') as File | null;

  let photoUrl: string | null = null;
  if (photoFile && photoFile.size > 0) {
    const ext = photoFile.name.split('.').pop() ?? 'jpg';
    const filename = `${data.entry.id}-${Date.now()}.${ext}`;
    const bytes = await photoFile.arrayBuffer();

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filename, Buffer.from(bytes), {
        contentType: photoFile.type || 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      console.error('[Storage] Upload failed:', uploadError.message);
      return NextResponse.json({ error: 'Photo upload failed. Please try again.' }, { status: 500 });
    }

    const { data: publicUrlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(uploadData.path);

    photoUrl = publicUrlData.publicUrl;
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
