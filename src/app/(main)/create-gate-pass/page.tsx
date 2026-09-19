'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload, Download, CheckCircle, XCircle, AlertTriangle,
  UserPlus, Shield, RefreshCw, RotateCcw,
  User, Mail, Phone, Calendar, Building2, Users,
} from 'lucide-react';
import { BUILDING_OPTIONS, ROLE_OPTIONS } from '@/lib/constants';

// ─── Constants ────────────────────────────────────────────────────────────────

const PURPOSES = ['Interview', 'Onboarding', 'Induction', 'Visitor'];

const CSV_HEADERS = [
  'name', 'email', 'mobile_number', 'role', 'purpose',
  'reporting_date', 'valid_until', 'poc_name', 'employee_id', 'contact_no', 'building_name',
];
const REQUIRED_CSV = ['name', 'email', 'purpose', 'reporting_date', 'poc_name', 'contact_no', 'building_name'];
const FIELD_LABELS: Record<string, string> = {
  name: 'Name', email: 'Email', purpose: 'Purpose',
  reporting_date: 'Reporting Date', poc_name: 'Point of Contact',
  contact_no: 'Contact Number', building_name: 'Building',
};

// ─── Types ────────────────────────────────────────────────────────────────────

type Building  = { id: string; name: string };
type ParsedRow = Record<string, string>;
type RowResult = { name: string; email: string; success: boolean; skipped?: boolean; error?: string; rowIndex?: number };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeMobile(raw: string): string {
  const s = raw.trim().replace(/[\s\-().]/g, '');
  if (/^\+91\d{10}$/.test(s)) return s;
  if (/^91\d{10}$/.test(s))   return `+${s}`;
  if (/^[6-9]\d{9}$/.test(s)) return `+91${s}`;
  return s;
}

function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function formatDisplayDate(s: string): string {
  const d = new Date(s + 'T00:00:00');
  return isNaN(d.getTime()) ? s : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function rowLabel(r: RowResult): string {
  const clean = (v: string | null | undefined) => (v ?? '').replace(/^["']+|["']+$/g, '').trim();
  return clean(r.name) || clean(r.email) || `Row ${r.rowIndex ?? '?'}`;
}

function parseMissingFields(error: string): string {
  const m = error.match(/Missing fields?: (.+)/i);
  if (!m) return error;
  return m[1].split(',').map((f) => FIELD_LABELS[f.trim()] ?? f.trim()).join(', ');
}

function stripQuotes(s: string) { return s.replace(/^["']+|["']+$/g, '').trim(); }

function parseCSV(text: string): { rows: ParsedRow[]; missingCols: string[] } {
  const lines = text.split('\n').map((l) => l.trim());
  const hi = lines.findIndex(Boolean);
  if (hi === -1 || lines.filter(Boolean).length < 2) return { rows: [], missingCols: [] };
  const headers = lines[hi].split(',').map((h) => stripQuotes(h).toLowerCase());
  const missingCols = REQUIRED_CSV.filter((r) => !headers.includes(r));
  const rows: ParsedRow[] = [];
  for (let i = hi + 1; i < lines.length; i++) {
    const line = lines[i]; if (!line) continue;
    const values = line.split(',').map(stripQuotes);
    const row: ParsedRow = {};
    headers.forEach((h, j) => { row[h] = values[j] ?? ''; });
    if (Object.values(row).every((v) => v === '')) continue;
    row._row_num = String(i - hi);
    rows.push(row);
  }
  return { rows, missingCols };
}

function downloadSampleCSV() {
  const sample = [
    CSV_HEADERS.join(','),
    'Ravi Kumar,ravi@example.com,+919876543210,New Joiner,Onboarding,2026-06-01,2026-06-08,Syam Kumar,NW0000001,+919876543211,Brigade Towers',
    'Priya Sharma,priya@example.com,+919876543212,Intern,Interview,2026-06-02,2026-06-09,Anjali Rao,NW0000002,+919876543213,iSprout',
  ].join('\n');
  const blob = new Blob([sample], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'sample_bulk_entries.csv'; a.click();
  URL.revokeObjectURL(url);
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function FL({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#64748B' }}>
        {label}{required && <span className="text-rose-400 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] mt-1" style={{ color: '#94A3B8' }}>{hint}</p>}
    </div>
  );
}

function StepCard({
  icon: Icon, iconBg, iconColor, title, subtitle, animClass, children,
}: {
  icon: React.ElementType; iconBg: string; iconColor: string;
  title: string; subtitle: string; animClass?: string; children: React.ReactNode;
}) {
  return (
    <div
      className={`bg-white rounded-2xl overflow-hidden ${animClass ?? ''}`}
      style={{ border: '1px solid #E8EDF5', boxShadow: '0 2px 16px rgba(15,23,42,0.07), 0 1px 4px rgba(15,23,42,0.04)' }}
    >
      <div className="flex items-center gap-3 px-6 py-4" style={{ borderBottom: '1px solid #F1F5F9' }}>
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: iconBg }}
        >
          <Icon size={20} style={{ color: iconColor }} />
        </div>
        <div>
          <p className="font-bold" style={{ color: '#1E293B' }}>{title}</p>
          <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>{subtitle}</p>
        </div>
      </div>
      <div className="px-6 py-5 space-y-4">{children}</div>
    </div>
  );
}

// ─── Single Entry Form ────────────────────────────────────────────────────────

function SingleEntryForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '', email: '', mobile_number: '', role: '', purpose: 'Interview',
    reporting_date: '', valid_until: '', employee_id: '', poc_name: '', contact_no: '', building_name: '',
  });
  const [duplicate,            setDuplicate]            = useState<{ entryId: string; registrationUrl: string; email: string; name: string } | null>(null);
  const [resending,            setResending]            = useState(false);
  const [resendSuccess,        setResendSuccess]        = useState('');
  const [customBuilding,       setCustomBuilding]       = useState('');
  const [isOtherBuilding,      setIsOtherBuilding]      = useState(false);
  const [customRole,           setCustomRole]           = useState('');
  const [isOtherRole,          setIsOtherRole]          = useState(false);
  const [isOtherPurpose,       setIsOtherPurpose]       = useState(false);
  const [customPurpose,        setCustomPurpose]        = useState('');
  const [buildings,            setBuildings]            = useState<Building[]>([]);
  const [submitting,           setSubmitting]           = useState(false);
  const [created,              setCreated]              = useState<(typeof form & { registrationUrl: string; emailSent: boolean; emailError: string; status: string; id: string }) | null>(null);
  const [error,                setError]                = useState('');
  const [copied,               setCopied]               = useState(false);
  const [resendingCreated,     setResendingCreated]     = useState(false);
  const [resendCreatedSuccess, setResendCreatedSuccess] = useState('');
  const [resendCreatedError,   setResendCreatedError]   = useState('');

  useEffect(() => {
    fetch('/api/buildings').then((r) => r.json()).then((data) => {
      if (Array.isArray(data) && data.length > 0) setBuildings(data);
      else setBuildings(BUILDING_OPTIONS.map((n, i) => ({ id: String(i), name: n })));
    }).catch(() => setBuildings(BUILDING_OPTIONS.map((n, i) => ({ id: String(i), name: n }))));
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setDuplicate(null); setResendSuccess('');
    setForm((f) => {
      const u = { ...f, [name]: value };
      if (name === 'reporting_date' && value) u.valid_until = addDays(value, 7);
      return u;
    });
  }

  function handleBuildingSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const v = e.target.value;
    if (v === '__other__') { setIsOtherBuilding(true); setForm((f) => ({ ...f, building_name: '' })); }
    else { setIsOtherBuilding(false); setCustomBuilding(''); setForm((f) => ({ ...f, building_name: v })); }
  }

  function handleRoleSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const v = e.target.value;
    if (v === '__other__') { setIsOtherRole(true); setForm((f) => ({ ...f, role: '' })); }
    else { setIsOtherRole(false); setCustomRole(''); setForm((f) => ({ ...f, role: v })); }
  }

  function handlePurposeSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const v = e.target.value;
    if (v === '__other__') { setIsOtherPurpose(true); setForm((f) => ({ ...f, purpose: '' })); }
    else { setIsOtherPurpose(false); setCustomPurpose(''); setForm((f) => ({ ...f, purpose: v })); }
  }

  function handleMobileBlur(field: 'mobile_number' | 'contact_no') {
    setForm((f) => ({ ...f, [field]: normalizeMobile(f[field]) }));
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    const finalBuilding = isOtherBuilding ? customBuilding.trim() : form.building_name;
    const finalRole     = isOtherRole     ? customRole.trim()     : form.role;
    const finalPurpose  = isOtherPurpose  ? customPurpose.trim()  : form.purpose;
    if (!finalBuilding) { setError('Building name is required'); return; }
    if (!finalPurpose)  { setError('Purpose is required');       return; }
    setSubmitting(true); setError(''); setDuplicate(null); setResendSuccess('');
    try {
      const res = await fetch('/api/entries', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          mobile_number: normalizeMobile(form.mobile_number),
          contact_no:    normalizeMobile(form.contact_no),
          building_name: finalBuilding, role: finalRole || undefined, purpose: finalPurpose,
        }),
      });
      const d = await res.json();
      if (res.status === 409 && d.duplicate) { setDuplicate(d); return; }
      if (!res.ok) { setError(d.error ?? 'Failed to create entry'); return; }
      setCreated(d);
    } finally { setSubmitting(false); }
  }

  async function handleResend() {
    if (!duplicate) return;
    setResending(true);
    try {
      const res = await fetch('/api/entries/resend', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entryId: duplicate.entryId }) });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? 'Resend failed'); return; }
      setResendSuccess(`Invitation resent to ${duplicate.email}`);
      setDuplicate(null);
    } finally { setResending(false); }
  }

  async function handleResendToCreated() {
    if (!created?.id) return;
    setResendingCreated(true); setResendCreatedError(''); setResendCreatedSuccess('');
    try {
      const res = await fetch('/api/entries/resend', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entryId: created.id }) });
      const d = await res.json();
      if (!res.ok) { setResendCreatedError(d.error ?? 'Resend failed'); return; }
      setResendCreatedSuccess(`Invitation email sent to ${created.email}`);
    } catch { setResendCreatedError('Could not reach server. Please try again.'); }
    finally { setResendingCreated(false); }
  }

  function reset() {
    setCreated(null);
    setForm({ name: '', email: '', mobile_number: '', role: '', purpose: 'Interview', reporting_date: '', valid_until: '', employee_id: '', poc_name: '', contact_no: '', building_name: '' });
    setDuplicate(null); setResendSuccess('');
    setCustomBuilding(''); setIsOtherBuilding(false);
    setCustomRole(''); setIsOtherRole(false);
    setIsOtherPurpose(false); setCustomPurpose('');
    setResendCreatedSuccess(''); setResendCreatedError('');
  }

  if (created) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center space-y-5 cgp-s1"
        style={{ border: '1px solid #E8EDF5', boxShadow: '0 4px 24px rgba(15,23,42,0.08)' }}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
          style={{ background: 'linear-gradient(135deg,#D1FAE5,#A7F3D0)' }}>
          <CheckCircle size={28} className="text-green-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold" style={{ color: '#1E293B' }}>Gate Pass Created!</h2>
          <p className="text-sm mt-1" style={{ color: '#94A3B8' }}>
            Registration email {created.emailSent ? 'sent to' : 'failed for'}{' '}
            <strong style={{ color: '#4F46E5' }}>{created.email}</strong>
          </p>
        </div>

        {!created.emailSent && !resendCreatedSuccess && (
          <div className="rounded-xl px-4 py-3 text-left space-y-2" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
            <p className="text-xs font-bold text-amber-700">Email failed to send</p>
            <p className="text-xs text-amber-600">{created.emailError || 'Use the link below or retry.'}</p>
            {resendCreatedError && <p className="text-xs text-red-600">{resendCreatedError}</p>}
            <button onClick={handleResendToCreated} disabled={resendingCreated}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors">
              {resendingCreated ? 'Sending…' : 'Retry Email'}
            </button>
          </div>
        )}
        {resendCreatedSuccess && (
          <div className="rounded-xl px-4 py-3 text-sm font-medium text-green-700" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
            {resendCreatedSuccess}
          </div>
        )}

        <div className="rounded-xl p-4 text-left space-y-2" style={{ background: '#F5F3FF', border: '1px solid #DDD6FE' }}>
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#7C3AED' }}>Registration Link</p>
          <div className="flex items-center gap-2">
            <p className="text-xs text-indigo-600 break-all flex-1 font-mono">{created.registrationUrl}</p>
            <button onClick={() => navigator.clipboard.writeText(created.registrationUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); })}
              className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg text-white transition-colors"
              style={{ background: '#4F46E5' }}>
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        </div>

        <div className="flex gap-3 justify-center">
          <button onClick={reset} className="px-5 py-2.5 rounded-xl text-sm font-medium transition-colors border"
            style={{ borderColor: '#E2E8F0', color: '#64748B', background: 'white' }}>
            Add Another
          </button>
          <button onClick={() => router.push('/')} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
            style={{ background: 'linear-gradient(135deg,#1E3A8A,#2563EB)' }}>
            Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-red-700"
          style={{ background: '#FEF2F2', border: '1px solid #FCA5A5' }}>
          <XCircle size={15} className="flex-shrink-0" />{error}
        </div>
      )}
      {resendSuccess && (
        <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-green-700"
          style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
          <CheckCircle size={15} className="flex-shrink-0" />{resendSuccess}
        </div>
      )}
      {duplicate && (
        <div className="rounded-xl px-4 py-3 space-y-2" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
          <p className="text-sm font-semibold text-amber-800">Candidate already has an entry for this date.</p>
          <p className="text-xs text-amber-600">Resend invite to <strong>{duplicate.email}</strong>?</p>
          <button type="button" onClick={handleResend} disabled={resending}
            className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors">
            {resending ? 'Resending…' : 'Resend Invite'}
          </button>
        </div>
      )}

      {/* Section 1 — Basic Details */}
      <StepCard icon={User} iconBg="#EEF2FF" iconColor="#4338CA"
        title="Basic Details" subtitle="Add visitor or candidate information" animClass="cgp-s1">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FL label="Full Name" required>
            <input name="name" value={form.name} onChange={handleChange} required
              placeholder="Enter full name" className="cgp-input" />
          </FL>
          <FL label="Email Address" required>
            <input name="email" type="email" value={form.email} onChange={handleChange} required
              placeholder="candidate@example.com" className="cgp-input" />
          </FL>
          <FL label="Mobile Number" required>
            <input name="mobile_number" type="tel" value={form.mobile_number} onChange={handleChange}
              onBlur={() => handleMobileBlur('mobile_number')} required
              placeholder="+91 9876543210" className="cgp-input" />
          </FL>
        </div>
      </StepCard>

      {/* Section 2 — Visit Information */}
      <StepCard icon={Calendar} iconBg="#E0F2FE" iconColor="#0369A1"
        title="Visit Information" subtitle="Select date, time and purpose of visit" animClass="cgp-s2">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FL label="Entry Type">
            <select value={isOtherRole ? '__other__' : form.role} onChange={handleRoleSelect}
              className="cgp-input">
              <option value="">Select entry type</option>
              {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              <option value="__other__">Other</option>
            </select>
            {isOtherRole && (
              <input value={customRole} onChange={(e) => setCustomRole(e.target.value)}
                required placeholder="Enter role" className="cgp-input mt-2" />
            )}
          </FL>
          <FL label="Purpose of Visit" required>
            <select value={isOtherPurpose ? '__other__' : form.purpose} onChange={handlePurposeSelect}
              required={!isOtherPurpose} className="cgp-input">
              <option value="">Select purpose</option>
              {PURPOSES.map((p) => <option key={p} value={p}>{p}</option>)}
              <option value="__other__">Other</option>
            </select>
            {isOtherPurpose && (
              <input value={customPurpose} onChange={(e) => setCustomPurpose(e.target.value)}
                required placeholder="Enter purpose" className="cgp-input mt-2" />
            )}
          </FL>
          <FL label="Reporting Date" required>
            <input name="reporting_date" type="date" value={form.reporting_date}
              onChange={handleChange} required className="cgp-input" />
          </FL>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FL label="Valid Until" required hint="Auto-set to +7 days from reporting date">
            <input name="valid_until" type="date" value={form.valid_until}
              onChange={handleChange} required className="cgp-input" />
          </FL>
        </div>
      </StepCard>

      {/* Section 3 — Host & Location */}
      <StepCard icon={Building2} iconBg="#F0F9FF" iconColor="#0284C7"
        title="Host & Location" subtitle="Select host and additional details" animClass="cgp-s3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FL label="Host Name (POC)" required>
            <input name="poc_name" value={form.poc_name} onChange={handleChange} required
              placeholder="Search host name or ID" className="cgp-input" />
          </FL>
          <FL label="Employee ID">
            <input name="employee_id" value={form.employee_id} onChange={handleChange}
              placeholder="e.g. NW0000001" className="cgp-input" />
          </FL>
          <FL label="Location / Building" required>
            <select value={isOtherBuilding ? '__other__' : form.building_name}
              onChange={handleBuildingSelect} required={!isOtherBuilding} className="cgp-input">
              <option value="">Select location</option>
              {buildings.map((b) => <option key={b.id} value={b.name}>{b.name}</option>)}
              <option value="__other__">Other</option>
            </select>
            {isOtherBuilding && (
              <input value={customBuilding} onChange={(e) => setCustomBuilding(e.target.value)}
                required placeholder="Enter building name" className="cgp-input mt-2" />
            )}
          </FL>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FL label="Contact Number" required>
            <input name="contact_no" type="tel" value={form.contact_no} onChange={handleChange}
              onBlur={() => handleMobileBlur('contact_no')} required
              placeholder="POC Contact Number" className="cgp-input" />
          </FL>
        </div>
      </StepCard>

      {/* Footer */}
      <div className="cgp-s4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-2">
        <div className="flex items-center gap-2 text-xs" style={{ color: '#94A3B8' }}>
          <Shield size={13} className="flex-shrink-0" />
          After submission, the visitor will receive an email with the gate pass link.
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button type="button" onClick={reset}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium border transition-colors hover:bg-slate-50"
            style={{ borderColor: '#E2E8F0', color: '#64748B', background: 'white' }}>
            <RotateCcw size={14} /> Reset
          </button>
          <button type="submit" disabled={submitting}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-7 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-all shadow-md hover:shadow-lg"
            style={{ background: 'linear-gradient(135deg,#1E3A8A,#2563EB,#0EA5E9)' }}>
            {submitting
              ? <><RefreshCw size={14} className="animate-spin" /> Creating…</>
              : <>Generate Gate Pass <span className="ml-0.5">→</span></>
            }
          </button>
        </div>
      </div>
    </form>
  );
}

// ─── Bulk Upload Form ─────────────────────────────────────────────────────────

function BulkUploadForm() {
  const [rows,          setRows]         = useState<ParsedRow[]>([]);
  const [fileName,      setFileName]     = useState('');
  const [parseError,    setParseError]   = useState('');
  const [uploading,     setUploading]    = useState(false);
  const [results,       setResults]      = useState<{ total: number; sent: number; failed: RowResult[]; skipped: RowResult[]; emailFailed: RowResult[] } | null>(null);
  const [error,         setError]        = useState('');
  const [emailWarnings, setEmailWarnings] = useState<{ row: string; email: string }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name); setResults(null); setError(''); setParseError(''); setEmailWarnings([]);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const { rows: parsed, missingCols } = parseCSV(ev.target?.result as string);
      if (missingCols.length > 0) { setParseError(`Missing columns: ${missingCols.join(', ')}`); setRows([]); return; }
      setEmailWarnings(parsed.filter((r) => r.email && !EMAIL_RE.test(r.email.trim())).map((r) => ({ row: r._row_num ?? '?', email: r.email.trim() })));
      setRows(parsed);
    };
    reader.readAsText(file);
  }

  async function handleUpload() {
    if (!rows.length) return;
    setUploading(true); setResults(null); setError('');
    try {
      const res = await fetch('/api/bulk-upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rows }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Upload failed'); return; }
      setResults(data);
      if (!data.failed?.length && !data.skipped?.length && !data.emailFailed?.length) {
        setRows([]); setFileName(''); setEmailWarnings([]);
        if (fileRef.current) fileRef.current.value = '';
      }
    } finally { setUploading(false); }
  }

  const sentCount        = results?.sent ?? 0;
  const failedCount      = results?.failed?.length ?? 0;
  const skippedCount     = results?.skipped?.length ?? 0;
  const emailFailedCount = results?.emailFailed?.length ?? 0;

  return (
    <div className="space-y-4">
      {/* Upload card */}
      <StepCard icon={Upload} iconBg="#EEF2FF" iconColor="#4338CA"
        title="Upload CSV File" subtitle="Select a CSV file with visitor details" animClass="cgp-s1">
        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-colors hover:bg-indigo-50"
            style={{ background: '#F5F3FF', border: '1.5px solid #DDD6FE', color: '#4F46E5' }}>
            <Upload size={14} /> Choose CSV File
            <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
          </label>
          {fileName
            ? <span className="text-sm font-medium" style={{ color: '#4F46E5' }}>{fileName}</span>
            : <span className="text-sm" style={{ color: '#94A3B8' }}>No file chosen</span>
          }
        </div>
        <button onClick={downloadSampleCSV}
          className="flex items-center gap-2 text-sm font-medium transition-colors hover:underline"
          style={{ color: '#4F46E5' }}>
          <Download size={14} /> Download Sample CSV
        </button>
        <div className="rounded-xl p-4 space-y-2.5" style={{ background: '#F8FAFF', border: '1px solid #E8EDF5' }}>
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#64748B' }}>Required columns</p>
          <div className="flex flex-wrap gap-1.5">
            {CSV_HEADERS.map((h) => (
              <span key={h} className="px-2 py-0.5 rounded-full text-xs font-mono"
                style={REQUIRED_CSV.includes(h)
                  ? { background: '#EEF2FF', color: '#4F46E5', border: '1px solid #DDD6FE' }
                  : { background: '#F1F5F9', color: '#64748B', border: '1px solid #E2E8F0' }}>
                {h}
              </span>
            ))}
          </div>
          <p className="text-xs" style={{ color: '#94A3B8' }}>Purple = required · Gray = optional · Dates: <span className="font-mono">YYYY-MM-DD</span></p>
        </div>
      </StepCard>

      {parseError && (
        <div className="flex items-start gap-2 rounded-xl px-4 py-3 text-sm text-red-700"
          style={{ background: '#FEF2F2', border: '1px solid #FCA5A5' }}>
          <XCircle size={15} className="flex-shrink-0 mt-0.5" /><span><strong>CSV Error:</strong> {parseError}</span>
        </div>
      )}

      {/* Preview */}
      {rows.length > 0 && (
        <StepCard icon={Users} iconBg="#E0F2FE" iconColor="#0369A1"
          title={`Preview — ${rows.length} rows`} subtitle="First 3 rows shown below" animClass="cgp-s2">
          <div className="overflow-x-auto rounded-xl touch-scroll-x" style={{ border: '1px solid #E8EDF5' }}>
            <table className="w-full text-xs" style={{ minWidth: 640 }}>
              <thead style={{ background: '#F8FAFF' }}>
                <tr>
                  {['Name','Email','Mobile','Role','Purpose','Date','Valid Until','POC','Emp ID','Contact','Building'].map((h) => (
                    <th key={h} className="text-left px-3 py-2 whitespace-nowrap font-bold uppercase tracking-wider" style={{ color: '#94A3B8' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.slice(0, 3).map((r, i) => (
                  <tr key={i} className="trow">
                    {[r.name,r.email,r.mobile_number,r.role,r.purpose,r.reporting_date,r.valid_until,r.poc_name,r.employee_id,r.contact_no,r.building_name].map((v, j) => (
                      <td key={j} className="px-3 py-2 whitespace-nowrap" style={{ color: '#1E293B' }}>{v}</td>
                    ))}
                  </tr>
                ))}
                {rows.length > 3 && (
                  <tr><td colSpan={11} className="px-3 py-2 text-center" style={{ color: '#94A3B8' }}>…and {rows.length - 3} more rows</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </StepCard>
      )}

      {error && <div className="rounded-xl px-4 py-3 text-sm text-red-700" style={{ background: '#FEF2F2', border: '1px solid #FCA5A5' }}>{error}</div>}

      {/* Results */}
      {results && (
        <StepCard icon={CheckCircle} iconBg="#F0F9FF" iconColor="#0284C7"
          title="Upload Results" subtitle="Summary of processed rows" animClass="cgp-s3">
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Email Sent',   val: sentCount,        active: sentCount > 0,        bg: '#F0FDF4', border: '#BBF7D0', num: '#16A34A' },
              { label: 'Email Failed', val: emailFailedCount, active: emailFailedCount > 0,  bg: '#FFF7ED', border: '#FED7AA', num: '#EA580C' },
              { label: 'Skipped',      val: skippedCount,     active: skippedCount > 0,      bg: '#FFFBEB', border: '#FDE68A', num: '#D97706' },
              { label: 'Failed',       val: failedCount,      active: failedCount > 0,       bg: '#FEF2F2', border: '#FCA5A5', num: '#DC2626' },
            ].map(({ label, val, active, bg, border, num }) => (
              <div key={label} className="rounded-xl p-3 text-center" style={{ background: active ? bg : '#F8FAFF', border: `1px solid ${active ? border : '#E8EDF5'}` }}>
                <div className="text-2xl font-bold" style={{ color: active ? num : '#CBD5E1' }}>{val}</div>
                <div className="text-[10px] font-semibold mt-0.5" style={{ color: active ? num : '#94A3B8' }}>{label}</div>
              </div>
            ))}
          </div>

          {results.emailFailed.length > 0 && (
            <div className="rounded-xl p-3 space-y-1" style={{ background: '#FFF7ED', border: '1px solid #FED7AA' }}>
              <div className="flex items-center gap-1.5 text-xs font-bold text-orange-700 uppercase tracking-wider"><AlertTriangle size={12} />Saved — Email Not Sent</div>
              {results.emailFailed.map((f, i) => <div key={i} className="text-xs text-orange-700"><span className="font-medium">{rowLabel(f)}</span> — {f.error ?? 'email not sent'}</div>)}
            </div>
          )}
          {results.skipped.length > 0 && (() => {
            const byDate = results.skipped.reduce<Record<string, number>>((acc, s) => { const m = s.error?.match(/for (\d{4}-\d{2}-\d{2})/); const key = m ? m[1] : 'unknown'; acc[key] = (acc[key] ?? 0) + 1; return acc; }, {});
            return (
              <div className="rounded-xl p-3 space-y-1" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                <div className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5"><AlertTriangle size={12} />Skipped</div>
                {Object.entries(byDate).map(([date, count]) => <div key={date} className="text-xs text-amber-700">{count} skipped — already exists for {formatDisplayDate(date)}</div>)}
              </div>
            );
          })()}
          {results.failed.length > 0 && (
            <div className="rounded-xl p-3 space-y-1" style={{ background: '#FEF2F2', border: '1px solid #FCA5A5' }}>
              <div className="text-xs font-bold text-red-700 uppercase tracking-wider flex items-center gap-1.5"><XCircle size={12} />Could Not Process</div>
              {results.failed.map((f, i) => {
                const isMissing = /^missing fields?:/i.test(f.error ?? '');
                return <div key={i} className="text-xs text-red-700"><span className="font-medium">{rowLabel(f)}</span>{isMissing ? ` — missing: ${parseMissingFields(f.error ?? '')}` : ` — ${f.error ?? 'Unknown error'}`}</div>;
              })}
            </div>
          )}
          {sentCount > 0 && !failedCount && !skippedCount && !emailFailedCount && (
            <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-green-700" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
              <CheckCircle size={15} />All {sentCount} invitation{sentCount !== 1 ? 's' : ''} sent successfully.
            </div>
          )}
        </StepCard>
      )}

      {/* Email warning */}
      {rows.length > 0 && (
        <div className="rounded-xl p-3 space-y-1.5" style={{
          background: emailWarnings.length > 0 ? '#FEF2F2' : '#FFFBEB',
          border: emailWarnings.length > 0 ? '1px solid #FCA5A5' : '1px solid #FDE68A',
        }}>
          <div className={`flex items-center gap-1.5 text-xs font-semibold ${emailWarnings.length > 0 ? 'text-red-700' : 'text-amber-700'}`}>
            <AlertTriangle size={13} />
            {emailWarnings.length > 0 ? `${emailWarnings.length} invalid email format — fix before uploading` : 'Review all email addresses before uploading'}
          </div>
          {emailWarnings.map((w, i) => <div key={i} className="text-xs text-red-600">Row {w.row}: <span className="font-mono">{w.email}</span></div>)}
        </div>
      )}

      {/* Upload button */}
      <div className="flex items-center justify-between gap-3 py-2">
        <div className="flex items-center gap-2 text-xs" style={{ color: '#94A3B8' }}>
          <Shield size={13} className="flex-shrink-0" />
          Each visitor will receive an email invitation with their gate pass link.
        </div>
        <button onClick={handleUpload} disabled={!rows.length || uploading || !!parseError || !!emailWarnings.length}
          className="flex items-center gap-2 px-7 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-all shadow-md hover:shadow-lg"
          style={{ background: 'linear-gradient(135deg,#1E3A8A,#2563EB,#0EA5E9)' }}>
          <Upload size={14} />
          {uploading ? 'Processing…' : `Upload & Send Invites${rows.length > 0 ? ` (${rows.length})` : ''}`}
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CreateGatePassPage() {
  const [tab, setTab] = useState<'single' | 'bulk'>('single');

  return (
    <div className="page-container max-w-5xl space-y-5">

      {/* Hero Banner */}
      <div className="relative rounded-2xl overflow-hidden" style={{ minHeight: 148 }}>
        {/* Base dark gradient */}
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(135deg, #060D1F 0%, #0D1B3E 28%, #1E3A8A 62%, #1E40AF 100%)',
        }} />
        {/* Dot-grid pattern — image-like texture */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.07) 1.5px, transparent 1.5px)',
          backgroundSize: '26px 26px',
        }} />
        {/* Top-right indigo glow */}
        <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full pointer-events-none" style={{
          background: 'radial-gradient(circle, rgba(99,102,241,0.5) 0%, transparent 62%)',
        }} />
        {/* Bottom-left cyan glow */}
        <div className="absolute -left-10 -bottom-10 w-60 h-60 rounded-full pointer-events-none" style={{
          background: 'radial-gradient(circle, rgba(56,189,248,0.28) 0%, transparent 62%)',
        }} />
        {/* Center soft purple glow */}
        <div className="absolute left-1/3 top-0 w-72 h-full pointer-events-none" style={{
          background: 'radial-gradient(ellipse, rgba(139,92,246,0.18) 0%, transparent 70%)',
        }} />
        {/* Decorative rings */}
        <div className="absolute right-24 -top-6 w-44 h-44 rounded-full pointer-events-none" style={{ border: '1px solid rgba(255,255,255,0.07)' }} />
        <div className="absolute right-36 top-2 w-24 h-24 rounded-full pointer-events-none" style={{ border: '1px solid rgba(255,255,255,0.05)' }} />

        {/* Content */}
        <div className="relative px-6 sm:px-8 py-7 sm:py-8 flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-0 justify-between">
          {/* Left: title block */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(99,102,241,0.22)', border: '1px solid rgba(99,102,241,0.35)' }}
              >
                <Shield size={10} className="text-indigo-300" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-300">NxtWave · Gate Pass</span>
              </div>
            </div>
            <h1 className="text-2xl sm:text-[28px] font-extrabold text-white leading-tight">Create Gate Pass</h1>
            <p className="text-sm mt-1.5" style={{ color: 'rgba(148,163,184,0.9)' }}>
              Add visitor or candidate details to generate a secure gate pass.
            </p>
            <div className="flex items-center gap-5 mt-3">
              {['Secure', 'Tracked', 'Instant'].map((badge) => (
                <div key={badge} className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-xs font-medium" style={{ color: 'rgba(148,163,184,0.85)' }}>{badge}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Tab buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {[
              { key: 'single', label: 'Single Entry', Icon: UserPlus },
              { key: 'bulk',   label: 'Bulk Entry',   Icon: Users },
            ].map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key as 'single' | 'bulk')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
                style={tab === key
                  ? { background: 'white', color: '#1E3A8A', boxShadow: '0 4px 20px rgba(0,0,0,0.35)' }
                  : { background: 'rgba(255,255,255,0.08)', color: 'rgba(203,213,225,0.85)', border: '1px solid rgba(255,255,255,0.13)' }
                }
              >
                <Icon size={15} />{label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Form content — key triggers re-mount + animation on tab switch */}
      <div key={tab} className="cgp-tab-in space-y-4">
        {tab === 'single' ? <SingleEntryForm /> : <BulkUploadForm />}
      </div>

    </div>
  );
}
