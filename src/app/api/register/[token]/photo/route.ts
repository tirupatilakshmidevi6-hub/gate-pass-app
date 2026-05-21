import { NextRequest, NextResponse } from 'next/server';
import { getEntryByToken } from '@/lib/db';
import { supabase } from '@/lib/supabase';

const STORAGE_BUCKET = 'gate-pass-photos';
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB hard limit (client compresses to ≤500 KB first)

type Params = { params: Promise<{ token: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { token } = await params;
  const data = await getEntryByToken(token);

  if (!data) {
    return NextResponse.json({ error: 'Invalid or expired registration link' }, { status: 404 });
  }
  if (data.tokenUsed) {
    return NextResponse.json({ error: 'Registration already submitted' }, { status: 409 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Could not read the uploaded file. Please try again.' }, { status: 400 });
  }

  const photoFile = formData.get('photo') as File | null;
  if (!photoFile || photoFile.size === 0) {
    return NextResponse.json({ error: 'No photo was received. Please try again.' }, { status: 400 });
  }
  if (photoFile.size > MAX_SIZE) {
    return NextResponse.json(
      { error: 'Photo is too large (max 5 MB). Please compress it before uploading.' },
      { status: 413 },
    );
  }

  const ext = (photoFile.name.split('.').pop() ?? 'jpg').toLowerCase();
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
    return NextResponse.json(
      { error: 'Photo could not be saved. Please try again.' },
      { status: 500 },
    );
  }

  const { data: publicUrlData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(uploadData.path);

  return NextResponse.json({ photoUrl: publicUrlData.publicUrl });
}
