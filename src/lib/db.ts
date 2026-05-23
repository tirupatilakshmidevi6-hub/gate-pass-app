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
  valid_until: string | null;
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

// No default credentials. Users sign up via /signup — first Admin/TA/Facilities claims that role.

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

export async function checkDuplicateEntry(email: string, reporting_date: string): Promise<EntryRow | null> {
  const { data, error } = await supabase.from('entries').select('*').eq('email', email).eq('reporting_date', reporting_date).limit(1).single();
  if (error || !data) return null;
  return data;
}

export async function createEntry(data: {
  name: string;
  email?: string;
  mobile_number?: string;
  role?: string;
  purpose: string;
  reporting_date: string;
  valid_until?: string;
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
    valid_until: data.valid_until ?? null,
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

// ─── AppUser ──────────────────────────────────────────────────────────────────

// role is any non-empty string; 'admin' | 'ta' | 'facilities' are the reserved system roles
export type AppUserRole = string;
export type AppUserStatus = 'active' | 'pending_approval' | 'rejected' | 'inactive';

export type AppUser = {
  id: string;
  name: string;
  email: string;
  password_hash: string | null;
  role: AppUserRole;
  status: AppUserStatus;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  reset_token: string | null;
  reset_token_expires_at: string | null;
  created_at: string;
};

export async function getAppUserByEmail(email: string): Promise<AppUser | null> {
  const { data } = await supabase.from('app_users').select('*').eq('email', email).single();
  return data ?? null;
}

export async function getAppUserById(id: string): Promise<AppUser | null> {
  const { data } = await supabase.from('app_users').select('*').eq('id', id).single();
  return data ?? null;
}

export async function getAllAppUsers(): Promise<AppUser[]> {
  const { data } = await supabase.from('app_users').select('*').order('created_at', { ascending: false });
  return data ?? [];
}

export async function getPendingUsers(): Promise<AppUser[]> {
  const { data } = await supabase
    .from('app_users').select('*').eq('status', 'pending_approval')
    .order('created_at', { ascending: true });
  return data ?? [];
}

export async function updateAppUser(id: string, updates: Partial<Pick<AppUser,
  'name' | 'password_hash' | 'status' | 'approved_by' | 'approved_at' | 'rejection_reason'
>>): Promise<AppUser> {
  const { data, error } = await supabase.from('app_users').update(updates).eq('id', id).select().single();
  return throwOnError(data, error);
}

// A reserved role is "taken" only if an ACTIVE user holds it.
// Pending/rejected users do not count — the first person to be active wins the role.
export async function isRoleTaken(role: string): Promise<boolean> {
  const { data } = await supabase
    .from('app_users').select('id').eq('role', role).eq('status', 'active').limit(1);
  return (data?.length ?? 0) > 0;
}

export async function getPendingApprovalCount(): Promise<number> {
  const { count } = await supabase
    .from('app_users').select('*', { count: 'exact', head: true })
    .eq('status', 'pending_approval');
  return count ?? 0;
}

export async function approveUser(id: string, adminId: string): Promise<AppUser> {
  const { data, error } = await supabase.from('app_users').update({
    status: 'active',
    approved_by: adminId,
    approved_at: new Date().toISOString(),
    rejection_reason: null,
  }).eq('id', id).select().single();
  return throwOnError(data, error);
}

export async function rejectUser(id: string, reason: string, adminId: string): Promise<AppUser> {
  const { data, error } = await supabase.from('app_users').update({
    status: 'rejected',
    rejection_reason: reason || 'No reason provided',
    approved_by: adminId,
    approved_at: new Date().toISOString(),
  }).eq('id', id).select().single();
  return throwOnError(data, error);
}

export async function createDirectUser(data: {
  name: string;
  email: string;
  password: string;
  role: AppUserRole;
  status: AppUserStatus;
}): Promise<{ ok: boolean; error?: string }> {
  const hash = await bcrypt.hash(data.password, 10);
  const { error } = await supabase.from('app_users').insert({
    name: data.name.trim(),
    email: data.email.toLowerCase().trim(),
    password_hash: hash,
    role: data.role,
    status: data.status,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ─── Admin helpers ────────────────────────────────────────────────────────────

export async function getAdminEmails(): Promise<{ email: string; name: string }[]> {
  const { data } = await supabase
    .from('app_users').select('email, name').eq('role', 'admin').eq('status', 'active');
  return data ?? [];
}

export async function getAdminAndFacilitiesIds(): Promise<string[]> {
  const { data } = await supabase
    .from('app_users').select('id')
    .in('role', ['admin', 'ta', 'facilities']).eq('status', 'active');
  return (data ?? []).map((u) => u.id);
}

export async function getAdminIds(): Promise<string[]> {
  const { data } = await supabase
    .from('app_users').select('id')
    .in('role', ['admin', 'ta']).eq('status', 'active');
  return (data ?? []).map((u) => u.id);
}

// ─── Pass expiry ──────────────────────────────────────────────────────────────

export async function updateExpiredPasses(): Promise<number> {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('entries')
    .update({ status: 'Expired' })
    .lt('valid_until', today)
    .eq('status', 'Approved')
    .select('id');
  if (error) { console.error('[DB] updateExpiredPasses:', error.message); return 0; }
  return data?.length ?? 0;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export type Notification = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean;
  related_entry_id: string | null;
  created_at: string;
};

export async function createNotificationsForUsers(userIds: string[], data: {
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  related_entry_id?: string;
}): Promise<void> {
  if (!userIds.length) return;
  const rows = userIds.map((uid) => ({
    user_id: uid,
    title: data.title,
    message: data.message,
    type: data.type,
    is_read: false,
    related_entry_id: data.related_entry_id ?? null,
  }));
  await supabase.from('notifications').insert(rows);
}

export async function getNotifications(userId: string): Promise<Notification[]> {
  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  return data ?? [];
}

export async function markNotificationRead(id: string, userId: string): Promise<void> {
  await supabase.from('notifications').update({ is_read: true }).eq('id', id).eq('user_id', userId);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false);
}

// ─── Activity logs ────────────────────────────────────────────────────────────

export type ActivityLog = {
  id: string;
  action: string;
  performed_by: string | null;
  performed_by_name: string;
  entry_id: string | null;
  candidate_name: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

export async function logActivity(data: {
  action: string;
  performed_by?: string;
  performed_by_name: string;
  entry_id?: string;
  candidate_name?: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  await supabase.from('activity_logs').insert({
    action: data.action,
    performed_by: data.performed_by ?? null,
    performed_by_name: data.performed_by_name,
    entry_id: data.entry_id ?? null,
    candidate_name: data.candidate_name ?? null,
    details: data.details ?? null,
  }).then(({ error }) => { if (error) console.error('[Activity]', error.message); });
}

export async function getActivityLogs(filters?: {
  entry_id?: string;
  performed_by?: string;
  action?: string;
  from_date?: string;
  to_date?: string;
  search?: string;
  limit?: number;
}): Promise<ActivityLog[]> {
  let query = supabase.from('activity_logs').select('*');
  if (filters?.entry_id)    query = query.eq('entry_id', filters.entry_id);
  if (filters?.performed_by) query = query.eq('performed_by', filters.performed_by);
  if (filters?.action)      query = query.eq('action', filters.action);
  if (filters?.from_date)   query = query.gte('created_at', filters.from_date);
  if (filters?.to_date)     query = query.lte('created_at', filters.to_date + 'T23:59:59');
  if (filters?.search)      query = query.ilike('candidate_name', `%${filters.search}%`);
  query = query.order('created_at', { ascending: false }).limit(filters?.limit ?? 200);
  const { data } = await query;
  return data ?? [];
}

// ─── Password reset ───────────────────────────────────────────────────────────

export async function saveResetToken(userId: string, token: string, expiresAt: Date): Promise<void> {
  await supabase.from('app_users').update({
    reset_token: token,
    reset_token_expires_at: expiresAt.toISOString(),
  }).eq('id', userId);
}

export async function getUserByResetToken(token: string): Promise<AppUser | null> {
  const { data } = await supabase
    .from('app_users')
    .select('*')
    .eq('reset_token', token)
    .single();
  return data ?? null;
}

export async function clearResetToken(userId: string): Promise<void> {
  await supabase.from('app_users').update({
    reset_token: null,
    reset_token_expires_at: null,
  }).eq('id', userId);
}

export async function updateUserPassword(userId: string, passwordHash: string): Promise<void> {
  await supabase.from('app_users').update({ password_hash: passwordHash }).eq('id', userId);
}
