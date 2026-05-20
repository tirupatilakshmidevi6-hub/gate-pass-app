import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createEntry, createRegistrationToken } from '@/lib/db';
import { sendInviteEmail } from '@/lib/email';

type RowResult = { name: string; email: string; success: boolean; error?: string };

export async function POST(req: NextRequest) {
  const { rows } = await req.json();

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'No rows provided' }, { status: 400 });
  }

  const required = ['name', 'email', 'purpose', 'reporting_date', 'poc_name', 'contact_no', 'building_name'];
  for (const row of rows) {
    for (const field of required) {
      if (!row[field]) {
        return NextResponse.json({ error: `Missing field "${field}" in row for "${row.name || 'unknown'}"` }, { status: 400 });
      }
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const results: RowResult[] = [];

  for (const row of rows) {
    const email = (row.email as string).trim();
    try {
      const entry = await createEntry({
        name: row.name,
        email,
        mobile_number: row.mobile ?? row.mobile_number ?? undefined,
        role: row.role ?? undefined,
        purpose: row.purpose,
        reporting_date: row.reporting_date,
        poc_name: row.poc_name,
        contact_no: row.contact_no,
        building_name: row.building_name,
      });

      const token = uuidv4();
      await createRegistrationToken(entry.id, token);
      const registrationUrl = `${appUrl}/register/${token}`;
      await sendInviteEmail(email, row.name, registrationUrl);

      results.push({ name: row.name, email, success: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[BulkUpload] Row failed:', row.name, msg);
      results.push({ name: row.name, email, success: false, error: msg });
    }
  }

  const sent = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success);

  return NextResponse.json({ total: rows.length, sent, failed });
}
