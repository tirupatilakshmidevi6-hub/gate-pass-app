import { supabase } from './supabase';
import bcrypt from 'bcryptjs';

// ─── Types ───────────────────────────────────────────────────────────────────

export type EntryRow = {
  id: string;
  name: string;
  email: string | null;
  mobile_number: string | null;
  role: string | null;
  purpose: string;
  reporting_date: string;
  employee_id: string | null;
  poc_name: string;
  contact_no: string;
  building_name: string;
  status: string;
  otp: string | null;
  otp_verified: boolean;
  invite_token: string | null;
  form_status: string;
  pass_id: string | null;
  photo_url: string | null;
  pass_sent_email: boolean;
  created_at: string;
  created_by: string;
};

export type UserRow = {
  id: string;
  email: string;
  password: string;
  role: 'admin' | 'facilities';
  name: string;
  created_at: string;
};

export type BuildingRow = {
  id: string;
  name: string;
  created_at: string;
};

export type SettingRow = {
  id: string;
  key: string;
  value: string | null;
  created_at: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function throwOnError<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  if (data === null) throw new Error('No data returned');
  return data;
}

async function logAudit(entryId: string, action: string, performedBy: string) {
  await supabase.from('entry_logs').insert({
    entry_id: entryId,
    guard_note: `${action} by ${performedBy}`,
    action,
    performed_by: performedBy,
  });
}

// ─── User functions ───────────────────────────────────────────────────────────

export async function getUserByEmail(email: string): Promise<UserRow | null> {
  const { data, error } = await supabase.from('users').select('*').eq('email', email).single();
  if (error) return null;
  return data;
}

export async function createUser(data: {
  email: string; password: string; role: 'admin' | 'facilities'; name: string;
}): Promise<UserRow | null> {
  const hashed = await bcrypt.hash(data.password, 10);
  const { data: user, error } = await supabase.from('users').insert({ ...data, password: hashed }).select().single();
  if (error) { console.error('[DB] createUser failed:', error.message); return null; }
  return user;
}

export async function ensureDefaultUsers(): Promise<{ ok: boolean; error?: string }> {
  const defaults = [
    { email: 'admin@nxtwave.com',        password: 'Admin@123',       role: 'admin' as const,      name: 'Admin' },
    { email: 'facilities@nxtwave.com',   password: 'Facilities@123',  role: 'facilities' as const, name: 'Facilities Team' },
  ];
  try {
    for (const u of defaults) {
      const existing = await getUserByEmail(u.email);
      if (!existing) {
        const created = await createUser(u);
        if (!created) return { ok: false, error: 'Could not create default users. Please run the SQL migration in Supabase first.' };
      }
    }
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[DB] ensureDefaultUsers failed:', msg);
    return { ok: false, error: 'Database not set up. Please run supabase-schema.sql in the Supabase SQL Editor.' };
  }
}

// ─── Building functions ───────────────────────────────────────────────────────

export async function getBuildings(): Promise<BuildingRow[]> {
  const { data, error } = await supabase.from('buildings').select('*').order('name', { ascending: true });
  if (error) return [];
  return data ?? [];
}

export async function createBuilding(name: string): Promise<BuildingRow | null> {
  const { data, error } = await supabase.from('buildings').insert({ name }).select().single();
  if (error) { console.error('[DB] createBuilding:', error.message); return null; }
  return data;
}

export async function deleteBuilding(id: string): Promise<void> {
  await supabase.from('buildings').delete().eq('id', id);
}

// ─── Settings functions ───────────────────────────────────────────────────────

export async function getSettings(): Promise<Record<string, string>> {
  const { data } = await supabase.from('settings').select('*');
  const map: Record<string, string> = {};
  for (const row of data ?? []) { if (row.key && row.value != null) map[row.key] = row.value; }
  return map;
}

export async function upsertSetting(key: string, value: string): Promise<void> {
  await supabase.from('settings').upsert({ key, value }, { onConflict: 'key' });
}

export async function getSettingValue(key: string, fallback = ''): Promise<string> {
  const { data } = await supabase.from('settings').select('value').eq('key', key).single();
  return data?.value ?? fallback;
}

// ─── Entry functions ──────────────────────────────────────────────────────────

export async function getAllEntries(): Promise<EntryRow[]> {
  const { data, error } = await supabase.from('entries').select('*').order('created_at', { ascending: false });
  return throwOnError(data, error);
}

export async function getEntryById(id: string): Promise<EntryRow | null> {
  const { data, error } = await supabase.from('entries').select('*').eq('id', id).single();
  if (error) return null;
  return data;
}

export async function createEntry(data: {
  name: string;
  email?: string;
  mobile_number?: string;
  role?: string;
  purpose: string;
  reporting_date: string;
  employee_id?: string;
  poc_name: string;
  contact_no: string;
  building_name: string;
  created_by?: string;
}): Promise<EntryRow> {
  const { data: entry, error } = await supabase.from('entries').insert({
    name: data.name,
    email: data.email ?? null,
    mobile_number: data.mobile_number ?? null,
    role: data.role ?? null,
    purpose: data.purpose,
    reporting_date: data.reporting_date,
    employee_id: data.employee_id ?? null,
    poc_name: data.poc_name,
    contact_no: data.contact_no,
    building_name: data.building_name,
    status: 'Pending Form',
    created_by: data.created_by ?? 'Admin',
  }).select().single();
  return throwOnError(entry, error);
}

export async function createRegistrationToken(entryId: string, token: string): Promise<void> {
  const { error } = await supabase.from('entries').update({ invite_token: token }).eq('id', entryId);
  if (error) throw new Error(error.message);
}

export async function getEntryByToken(token: string): Promise<{
  entry: EntryRow; tokenUsed: boolean;
} | null> {
  const { data: entry, error } = await supabase.from('entries').select('*').eq('invite_token', token).single();
  if (error || !entry) return null;
  const tokenUsed = entry.status !== 'Pending Form';
  return { entry, tokenUsed };
}

export async function getNextPassNumber(): Promise<number> {
  const { count, error } = await supabase.from('entries').select('*', { count: 'exact', head: true }).not('pass_id', 'is', null);
  if (error) throw new Error(error.message);
  return (count ?? 0) + 1;
}

export async function submitRegistration(data: {
  entryId: string;
  photoPath: string | null;
}): Promise<EntryRow> {
  const { data: entry, error } = await supabase.from('entries').update({
    photo_url: data.photoPath,
    status: 'Pending Approval',
    form_status: 'submitted',
  }).eq('id', data.entryId).select().single();
  return throwOnError(entry, error);
}

export async function approveEntry(id: string, passId: string, otp: string): Promise<EntryRow> {
  const { data, error } = await supabase.from('entries')
    .update({ status: 'Approved', otp, pass_id: passId, form_status: 'approved' })
    .eq('id', id).select().single();
  const entry = throwOnError(data, error);
  await logAudit(id, 'Approved', 'Facilities');
  return entry;
}

export async function rejectEntry(id: string): Promise<EntryRow> {
  const { data, error } = await supabase.from('entries')
    .update({ status: 'Rejected', otp: null, form_status: 'rejected' })
    .eq('id', id).select().single();
  const entry = throwOnError(data, error);
  await logAudit(id, 'Rejected', 'Facilities');
  return entry;
}

export async function getPendingEntries(): Promise<EntryRow[]> {
  const { data, error } = await supabase.from('entries').select('*').eq('status', 'Pending Approval').order('created_at', { ascending: false });
  return throwOnError(data, error);
}

export async function getDashboardStats() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const [totalTodayRes, approvedTodayRes, pendingRes, rejectedTodayRes, recentRes] = await Promise.all([
    supabase.from('entries').select('*', { count: 'exact', head: true }).gte('created_at', todayStart),
    supabase.from('entries').select('*', { count: 'exact', head: true }).eq('status', 'Approved').gte('created_at', todayStart),
    supabase.from('entries').select('*', { count: 'exact', head: true }).eq('status', 'Pending Approval'),
    supabase.from('entries').select('*', { count: 'exact', head: true }).eq('status', 'Rejected').gte('created_at', todayStart),
    supabase.from('entries').select('*').order('created_at', { ascending: false }).limit(10),
  ]);
  return {
    totalToday: totalTodayRes.count ?? 0,
    approvedToday: approvedTodayRes.count ?? 0,
    pendingApproval: pendingRes.count ?? 0,
    rejectedToday: rejectedTodayRes.count ?? 0,
    recentEntries: recentRes.data ?? [],
  };
}

export async function getReportData() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const [allRes, recent30Res] = await Promise.all([
    supabase.from('entries').select('purpose, status, role'),
    supabase.from('entries').select('*').gte('created_at', thirtyDaysAgo).order('created_at', { ascending: false }),
  ]);
  const byPurpose: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  const byRole: Record<string, number> = {};
  for (const row of allRes.data ?? []) {
    byPurpose[row.purpose] = (byPurpose[row.purpose] ?? 0) + 1;
    byStatus[row.status]   = (byStatus[row.status]   ?? 0) + 1;
    if (row.role) byRole[row.role] = (byRole[row.role] ?? 0) + 1;
  }
  return {
    byPurpose: Object.entries(byPurpose).map(([purpose, count]) => ({ purpose, count })),
    byStatus:  Object.entries(byStatus) .map(([status,  count]) => ({ status,  count })),
    byRole:    Object.entries(byRole)   .map(([role,    count]) => ({ role,    count })),
    recent30:  recent30Res.data ?? [],
  };
}

export async function bulkCreateEntries(rows: {
  name: string; email?: string; mobile_number?: string; role?: string;
  purpose: string; reporting_date: string; poc_name: string; contact_no: string; building_name: string;
}[]): Promise<EntryRow[]> {
  const results: EntryRow[] = [];
  for (const row of rows) {
    const entry = await createEntry(row);
    results.push(entry);
  }
  return results;
}
