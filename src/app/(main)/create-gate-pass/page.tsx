'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload, Download, CheckCircle, XCircle, AlertTriangle, UserPlus,
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

type Building = { id: string; name: string };
type ParsedRow = Record<string, string>;
type RowResult = {
  name: string; email: string; success: boolean;
  skipped?: boolean; error?: string; rowIndex?: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeMobile(raw: string): string {
  const stripped = raw.trim().replace(/[\s\-().]/g, '');
  if (/^\+91\d{10}$/.test(stripped)) return stripped;
  if (/^91\d{10}$/.test(stripped))   return `+${stripped}`;
  if (/^[6-9]\d{9}$/.test(stripped)) return `+91${stripped}`;
  return stripped;
}

function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function rowLabel(r: RowResult): string {
  const clean = (s: string | null | undefined) => (s ?? '').replace(/^["']+|["']+$/g, '').trim();
  return clean(r.name) || clean(r.email) || `Row ${r.rowIndex ?? '?'}`;
}

function parseMissingFields(error: string): string {
  const match = error.match(/Missing fields?: (.+)/i);
  if (!match) return error;
  return match[1].split(',').map((f) => FIELD_LABELS[f.trim()] ?? f.trim()).join(', ');
}

function stripQuotes(s: string) { return s.replace(/^["']+|["']+$/g, '').trim(); }

function parseCSV(text: string): { rows: ParsedRow[]; missingCols: string[] } {
  const trimmedLines = text.split('\n').map((l) => l.trim());
  const headerIdx = trimmedLines.findIndex(Boolean);
  if (headerIdx === -1 || trimmedLines.filter(Boolean).length < 2) return { rows: [], missingCols: [] };
  const fileHeaders = trimmedLines[headerIdx].split(',').map((h) => stripQuotes(h).toLowerCase());
  const missingCols = REQUIRED_CSV.filter((r) => !fileHeaders.includes(r));
  const rows: ParsedRow[] = [];
  for (let i = headerIdx + 1; i < trimmedLines.length; i++) {
    const line = trimmedLines[i];
    if (!line) continue;
    const values = line.split(',').map((v) => stripQuotes(v));
    const row: ParsedRow = {};
    fileHeaders.forEach((h, j) => { row[h] = values[j] ?? ''; });
    if (Object.values(row).every((v) => v === '')) continue;
    row._row_num = String(i - headerIdx);
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
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
  const [duplicate,         setDuplicate]         = useState<{ entryId: string; registrationUrl: string; email: string; name: string } | null>(null);
  const [resending,         setResending]         = useState(false);
  const [resendSuccess,     setResendSuccess]     = useState('');
  const [customBuilding,    setCustomBuilding]    = useState('');
  const [isOtherBuilding,   setIsOtherBuilding]   = useState(false);
  const [customRole,        setCustomRole]        = useState('');
  const [isOtherRole,       setIsOtherRole]       = useState(false);
  const [isOtherPurpose,    setIsOtherPurpose]    = useState(false);
  const [customPurpose,     setCustomPurpose]     = useState('');
  const [buildings,         setBuildings]         = useState<Building[]>([]);
  const [submitting,        setSubmitting]        = useState(false);
  const [created,           setCreated]           = useState<(typeof form & { registrationUrl: string; emailSent: boolean; emailError: string; status: string; id: string }) | null>(null);
  const [error,             setError]             = useState('');
  const [copied,            setCopied]            = useState(false);
  const [resendingCreated,  setResendingCreated]  = useState(false);
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
      const updated = { ...f, [name]: value };
      if (name === 'reporting_date' && value) updated.valid_until = addDays(value, 7);
      return updated;
    });
  }

  function handleBuildingSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    if (val === '__other__') { setIsOtherBuilding(true); setForm((f) => ({ ...f, building_name: '' })); }
    else { setIsOtherBuilding(false); setCustomBuilding(''); setForm((f) => ({ ...f, building_name: val })); }
  }

  function handleRoleSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    if (val === '__other__') { setIsOtherRole(true); setForm((f) => ({ ...f, role: '' })); }
    else { setIsOtherRole(false); setCustomRole(''); setForm((f) => ({ ...f, role: val })); }
  }

  function handlePurposeSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    if (val === '__other__') { setIsOtherPurpose(true); setForm((f) => ({ ...f, purpose: '' })); }
    else { setIsOtherPurpose(false); setCustomPurpose(''); setForm((f) => ({ ...f, purpose: val })); }
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
          building_name: finalBuilding,
          role:          finalRole || undefined,
          purpose:       finalPurpose,
        }),
      });
      const d = await res.json();
      if (res.status === 409 && d.duplicate) { setDuplicate(d); return; }
      if (!res.ok) { setError(d.error ?? 'Failed'); return; }
      setCreated(d);
    } finally { setSubmitting(false); }
  }

  async function handleResend() {
    if (!duplicate) return;
    setResending(true);
    try {
      const res = await fetch('/api/entries/resend', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId: duplicate.entryId }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? 'Resend failed'); return; }
      setResendSuccess(`Invitation email resent successfully to ${duplicate.email}`);
      setDuplicate(null);
    } finally { setResending(false); }
  }

  async function handleResendToCreated() {
    if (!created?.id) return;
    setResendingCreated(true); setResendCreatedError(''); setResendCreatedSuccess('');
    try {
      const res = await fetch('/api/entries/resend', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId: created.id }),
      });
      const d = await res.json();
      if (!res.ok) { setResendCreatedError(d.error ?? 'Resend failed'); return; }
      setResendCreatedSuccess(`Invitation email sent to ${created.email}`);
    } catch {
      setResendCreatedError('Could not reach server. Please try again.');
    } finally { setResendingCreated(false); }
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
      <div className="bg-white rounded-2xl border border-green-200 p-5 sm:p-8 space-y-4 shadow-sm animate-fade-in-up">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-800">Gate Pass Created!</h2>
          <p className="text-gray-500 text-sm">Status: <strong>Pending Form</strong> — registration email {created.emailSent ? 'sent' : 'failed'}.</p>
        </div>

        {created.emailSent || resendCreatedSuccess ? (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700">
            {resendCreatedSuccess || <>Registration form sent to <strong>{created.email}</strong>.</>}
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 space-y-2">
            <p className="font-semibold">Email failed to send</p>
            <p className="text-xs">{created.emailError || 'Could not send the invite email. Use the link below or retry.'}</p>
            {resendCreatedError && <p className="text-xs text-red-600">{resendCreatedError}</p>}
            <button onClick={handleResendToCreated} disabled={resendingCreated}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors">
              {resendingCreated ? 'Sending…' : 'Retry Send Email'}
            </button>
          </div>
        )}

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Registration Link</p>
          <div className="flex items-center gap-2">
            <p className="text-xs text-blue-600 break-all flex-1 font-mono">{created.registrationUrl}</p>
            <button
              onClick={() => navigator.clipboard.writeText(created.registrationUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); })}
              className="flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition-colors">
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        </div>

        <div className="flex gap-3 justify-center pt-2">
          <button onClick={reset} className="px-5 py-2 rounded-xl border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 transition-colors font-medium">
            Add Another
          </button>
          <button onClick={() => router.push('/')} className="px-5 py-2 rounded-xl bg-blue-600 text-white text-sm hover:bg-blue-700 transition-colors font-medium">
            Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 shadow-sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2">{error}</p>
        )}
        {resendSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
            <span className="font-semibold">✓</span> {resendSuccess}
          </div>
        )}
        {duplicate && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 text-sm space-y-2">
            <p className="font-semibold text-amber-800">This candidate already has an entry for this date.</p>
            <p className="text-amber-700 text-xs">Do you want to resend the invitation email to <strong>{duplicate.email}</strong> instead?</p>
            <button type="button" onClick={handleResend} disabled={resending}
              className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors">
              {resending ? 'Resending…' : 'Resend Invite'}
            </button>
          </div>
        )}

        <Field label="Full Name *">
          <input name="name" value={form.name} onChange={handleChange} required placeholder="Full Name" className="input" />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Email *">
            <input name="email" type="email" value={form.email} onChange={handleChange} required placeholder="candidate@example.com" className="input" />
          </Field>
          <Field label="Mobile *">
            <input name="mobile_number" type="tel" value={form.mobile_number} onChange={handleChange} onBlur={() => handleMobileBlur('mobile_number')} required placeholder="+91 9876543210" className="input" />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Role *">
            <select value={isOtherRole ? '__other__' : form.role} onChange={handleRoleSelect} required={!isOtherRole} className="input">
              <option value="">Select role</option>
              {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              <option value="__other__">Other</option>
            </select>
            {isOtherRole && <input value={customRole} onChange={(e) => setCustomRole(e.target.value)} required placeholder="Enter role" className="input mt-2" />}
          </Field>
          <Field label="Purpose *">
            <select value={isOtherPurpose ? '__other__' : form.purpose} onChange={handlePurposeSelect} required={!isOtherPurpose} className="input">
              <option value="">Select purpose</option>
              {PURPOSES.map((p) => <option key={p} value={p}>{p}</option>)}
              <option value="__other__">Other</option>
            </select>
            {isOtherPurpose && <input value={customPurpose} onChange={(e) => setCustomPurpose(e.target.value)} required placeholder="Enter purpose" className="input mt-2" />}
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Reporting Date *">
            <input name="reporting_date" type="date" value={form.reporting_date} onChange={handleChange} required className="input" />
          </Field>
          <Field label="Valid Until *">
            <input name="valid_until" type="date" value={form.valid_until} onChange={handleChange} required className="input" />
            <p className="text-xs text-gray-400 mt-1">Auto-set to +7 days</p>
          </Field>
        </div>

        <div className="pt-1">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Point of Contact</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="POC Name *">
              <input name="poc_name" value={form.poc_name} onChange={handleChange} required placeholder="Point of Contact Name" className="input" />
            </Field>
            <Field label="Employee ID">
              <input name="employee_id" value={form.employee_id} onChange={handleChange} placeholder="NW0000001" className="input" />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Contact No *">
              <input name="contact_no" type="tel" value={form.contact_no} onChange={handleChange} onBlur={() => handleMobileBlur('contact_no')} required placeholder="POC Contact Number" className="input" />
            </Field>
          </div>
        </div>

        <Field label="Building *">
          <select value={isOtherBuilding ? '__other__' : form.building_name} onChange={handleBuildingSelect} required={!isOtherBuilding} className="input">
            <option value="">Select building</option>
            {buildings.map((b) => <option key={b.id} value={b.name}>{b.name}</option>)}
            <option value="__other__">Other</option>
          </select>
          {isOtherBuilding && (
            <input value={customBuilding} onChange={(e) => setCustomBuilding(e.target.value)} required placeholder="Enter building name" className="input mt-2" />
          )}
        </Field>

        <button type="submit" disabled={submitting}
          className="w-full py-3 sm:py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl font-semibold transition-colors text-sm shadow-sm">
          {submitting ? 'Creating…' : 'Create Gate Pass & Send Invite'}
        </button>
      </form>
    </div>
  );
}

// ─── Bulk Upload Form ─────────────────────────────────────────────────────────

function BulkUploadForm() {
  const [rows,          setRows]       = useState<ParsedRow[]>([]);
  const [fileName,      setFileName]   = useState('');
  const [parseError,    setParseError] = useState('');
  const [uploading,     setUploading]  = useState(false);
  const [results,       setResults]    = useState<{
    total: number; sent: number;
    failed: RowResult[]; skipped: RowResult[]; emailFailed: RowResult[];
  } | null>(null);
  const [error,          setError]         = useState('');
  const [emailWarnings,  setEmailWarnings] = useState<{ row: string; email: string }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name); setResults(null); setError(''); setParseError(''); setEmailWarnings([]);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const { rows: parsed, missingCols } = parseCSV(ev.target?.result as string);
      if (missingCols.length > 0) {
        setParseError(`Missing required columns: ${missingCols.join(', ')}`);
        setRows([]); return;
      }
      const bad = parsed
        .filter((r) => r.email && !EMAIL_RE.test(r.email.trim()))
        .map((r) => ({ row: r._row_num ?? '?', email: r.email.trim() }));
      setEmailWarnings(bad);
      setRows(parsed);
    };
    reader.readAsText(file);
  }

  async function handleUpload() {
    if (rows.length === 0) return;
    setUploading(true); setResults(null); setError('');
    try {
      const res = await fetch('/api/bulk-upload', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Upload failed'); return; }
      setResults(data);
      if (data.failed?.length === 0 && data.skipped?.length === 0 && data.emailFailed?.length === 0) {
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
    <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 space-y-5 shadow-sm">
      {/* File picker row */}
      <div className="flex items-center gap-3 flex-wrap">
        <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl text-sm text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors font-medium">
          <Upload size={15} /> Choose CSV File
          <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
        </label>
        <span className="text-sm text-gray-400">{fileName || 'No file chosen'}</span>
      </div>

      <button onClick={downloadSampleCSV}
        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 hover:underline">
        <Download size={14} /> Download Sample CSV
      </button>

      {/* Column reference */}
      <div className="text-xs text-gray-400 bg-gray-50 rounded-xl p-4 space-y-2">
        <p className="font-semibold text-gray-600 text-xs uppercase tracking-wider">Required CSV columns</p>
        <div className="flex flex-wrap gap-1.5">
          {CSV_HEADERS.map((h) => (
            <span key={h} className={`px-2 py-0.5 rounded-full text-xs font-mono ${
              REQUIRED_CSV.includes(h) ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'
            }`}>{h}</span>
          ))}
        </div>
        <p className="text-gray-400">Blue = required &nbsp;·&nbsp; Gray = optional</p>
        <p className="text-amber-600 font-medium">
          Dates must be in <span className="font-mono">YYYY-MM-DD</span> format, e.g. <span className="font-mono">2026-09-05</span>
        </p>
      </div>

      {parseError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-start gap-2">
          <XCircle size={16} className="flex-shrink-0 mt-0.5" />
          <div><strong>CSV Error:</strong> {parseError}</div>
        </div>
      )}

      {/* Preview table */}
      {rows.length > 0 && (
        <div>
          <p className="text-sm text-gray-600 mb-2 font-medium">{rows.length} row(s) found — Preview (first 3):</p>
          <p className="text-xs text-gray-400 mb-1.5 sm:hidden">← Scroll left/right to see all columns</p>
          <div className="overflow-x-auto max-h-52 border border-gray-200 rounded-xl touch-scroll-x">
            <table className="w-full text-xs" style={{ minWidth: 640 }}>
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {['Name','Email','Mobile','Role','Purpose','Date','Valid Until','POC','Emp ID','Contact','Building'].map((h) => (
                    <th key={h} className="text-left px-3 py-2 text-gray-500 font-semibold uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.slice(0, 3).map((r, i) => (
                  <tr key={i}>
                    <td className="px-3 py-1.5 text-gray-700">{r.name}</td>
                    <td className="px-3 py-1.5 text-gray-500">{r.email}</td>
                    <td className="px-3 py-1.5 text-gray-500">{r.mobile_number}</td>
                    <td className="px-3 py-1.5 text-gray-700">{r.role}</td>
                    <td className="px-3 py-1.5 text-gray-700">{r.purpose}</td>
                    <td className="px-3 py-1.5 text-gray-700">{r.reporting_date}</td>
                    <td className="px-3 py-1.5 text-gray-700">{r.valid_until}</td>
                    <td className="px-3 py-1.5 text-gray-700">{r.poc_name}</td>
                    <td className="px-3 py-1.5 text-gray-700 font-mono">{r.employee_id}</td>
                    <td className="px-3 py-1.5 text-gray-700">{r.contact_no}</td>
                    <td className="px-3 py-1.5 text-gray-700">{r.building_name}</td>
                  </tr>
                ))}
                {rows.length > 3 && (
                  <tr>
                    <td colSpan={11} className="px-3 py-1.5 text-gray-400 text-center">
                      …and {rows.length - 3} more rows
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {error && (
        <div className="text-sm rounded-xl px-4 py-3 bg-red-50 text-red-700 border border-red-200">{error}</div>
      )}

      {/* Upload results */}
      {results && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <div className="bg-green-50 border border-green-200 rounded-xl p-2.5 sm:p-3 text-center">
              <div className="text-xl font-bold text-green-700">{sentCount}</div>
              <div className="text-[11px] sm:text-xs text-green-600 font-medium leading-tight">Email Sent</div>
            </div>
            <div className={`border rounded-xl p-2.5 sm:p-3 text-center ${emailFailedCount > 0 ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'}`}>
              <div className={`text-xl font-bold ${emailFailedCount > 0 ? 'text-orange-700' : 'text-gray-400'}`}>{emailFailedCount}</div>
              <div className={`text-[11px] sm:text-xs font-medium leading-tight ${emailFailedCount > 0 ? 'text-orange-600' : 'text-gray-400'}`}>Email Failed</div>
            </div>
            <div className={`border rounded-xl p-2.5 sm:p-3 text-center ${skippedCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
              <div className={`text-xl font-bold ${skippedCount > 0 ? 'text-amber-700' : 'text-gray-400'}`}>{skippedCount}</div>
              <div className={`text-[11px] sm:text-xs font-medium leading-tight ${skippedCount > 0 ? 'text-amber-600' : 'text-gray-400'}`}>Skipped</div>
            </div>
            <div className={`border rounded-xl p-2.5 sm:p-3 text-center ${failedCount > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
              <div className={`text-xl font-bold ${failedCount > 0 ? 'text-red-700' : 'text-gray-400'}`}>{failedCount}</div>
              <div className={`text-[11px] sm:text-xs font-medium leading-tight ${failedCount > 0 ? 'text-red-600' : 'text-gray-400'}`}>Failed</div>
            </div>
          </div>

          {results.emailFailed.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2 text-xs font-bold text-orange-700 uppercase tracking-wider">
                <AlertTriangle size={13} /> Entry Saved — Email Not Sent
              </div>
              <p className="text-xs text-orange-800 mb-2 leading-relaxed">
                {results.emailFailed.length} candidate{results.emailFailed.length !== 1 ? 's were' : ' was'} added to the system,
                but the invite email could not be sent. Their entries are saved — use the <strong>Resend</strong> button in the entry list to retry.
              </p>
              <div className="space-y-1">
                {results.emailFailed.map((f, i) => (
                  <div key={i} className="text-xs text-orange-700">
                    <span className="font-medium">{rowLabel(f)}</span>{' '}
                    (<span className="font-mono">{f.email}</span>)
                    {f.error ? <> — {f.error}</> : null}
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.skipped.length > 0 && (() => {
            const byDate = results.skipped.reduce<Record<string, number>>((acc, s) => {
              const m = s.error?.match(/for (\d{4}-\d{2}-\d{2})/);
              const key = m ? m[1] : 'unknown date';
              acc[key] = (acc[key] ?? 0) + 1;
              return acc;
            }, {});
            return (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2 text-xs font-bold text-amber-700 uppercase tracking-wider">
                  <AlertTriangle size={13} /> Already Exists — Skipped
                </div>
                <div className="space-y-1">
                  {Object.entries(byDate).map(([date, count]) => (
                    <div key={date} className="text-xs text-amber-800">
                      <span className="font-medium">{count} invitation{count !== 1 ? 's' : ''} skipped</span> — entry already exists for {formatDisplayDate(date)}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {results.failed.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2 text-xs font-bold text-red-700 uppercase tracking-wider">
                <XCircle size={13} /> Could Not Process
              </div>
              <p className="text-xs text-red-700 mb-2">
                {results.failed.length} row{results.failed.length !== 1 ? 's' : ''} could not be added — fix errors and re-upload.
              </p>
              <div className="space-y-1">
                {results.failed.map((f, i) => {
                  const isMissingFields = /^missing fields?:/i.test(f.error ?? '');
                  return (
                    <div key={i} className="text-xs text-red-700">
                      <span className="font-medium">{rowLabel(f)}</span>
                      {isMissingFields
                        ? <> — missing: {parseMissingFields(f.error ?? '')}</>
                        : <> — {f.error ?? 'Unknown error'}</>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {sentCount > 0 && failedCount === 0 && skippedCount === 0 && emailFailedCount === 0 && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <CheckCircle size={16} /> All {sentCount} invitation email{sentCount !== 1 ? 's' : ''} sent successfully.
            </div>
          )}
        </div>
      )}

      {/* Email warning */}
      {rows.length > 0 && (
        <div className={`rounded-xl p-3 border text-xs space-y-1 ${emailWarnings.length > 0 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className={`flex items-center gap-1.5 font-semibold ${emailWarnings.length > 0 ? 'text-red-700' : 'text-amber-700'}`}>
            <AlertTriangle size={13} />
            {emailWarnings.length > 0
              ? `${emailWarnings.length} row${emailWarnings.length !== 1 ? 's' : ''} with invalid email format — fix before uploading`
              : 'Review all email addresses before uploading'}
          </div>
          <p className={emailWarnings.length > 0 ? 'text-red-600' : 'text-amber-600'}>
            Typos or wrong email addresses will bounce — the invitation will never reach the candidate.
          </p>
          {emailWarnings.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {emailWarnings.map((w, i) => (
                <li key={i} className="text-red-700">Row {w.row}: <span className="font-mono">{w.email}</span></li>
              ))}
            </ul>
          )}
        </div>
      )}

      <button onClick={handleUpload}
        disabled={rows.length === 0 || uploading || !!parseError || emailWarnings.length > 0}
        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 sm:py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm">
        <Upload size={15} />
        {uploading ? 'Processing…' : `Upload & Send Invites${rows.length > 0 ? ` (${rows.length} rows)` : ''}`}
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CreateGatePassPage() {
  const [tab, setTab] = useState<'single' | 'bulk'>('single');

  return (
    <div className="page-container max-w-3xl mx-auto space-y-5">

      {/* Header */}
      <div className="animate-fade-in-up">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Create Gate Pass</h1>
        <p className="text-sm text-gray-500 mt-0.5">Add a single visitor or upload multiple entries at once.</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit animate-fade-in-up" style={{ animationDelay: '60ms' }}>
        <button
          onClick={() => setTab('single')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
            tab === 'single'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <UserPlus size={15} />
          Single Entry
        </button>
        <button
          onClick={() => setTab('bulk')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
            tab === 'bulk'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Upload size={15} />
          Bulk Upload
        </button>
      </div>

      {/* Form content */}
      <div className="animate-fade-in-up" style={{ animationDelay: '120ms' }}>
        {tab === 'single' ? <SingleEntryForm /> : <BulkUploadForm />}
      </div>

    </div>
  );
}
