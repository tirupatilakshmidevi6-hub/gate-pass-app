import { NextRequest, NextResponse } from 'next/server';
import { getSettings, upsertSetting } from '@/lib/db';

export async function GET() {
  return NextResponse.json(await getSettings());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  for (const [key, value] of Object.entries(body)) {
    if (typeof value === 'string') await upsertSetting(key, value);
  }
  return NextResponse.json({ ok: true });
}
