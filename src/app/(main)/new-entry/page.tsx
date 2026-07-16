'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BUILDING_OPTIONS, ROLE_OPTIONS } from '@/lib/constants';

const PURPOSES = ['Interview', 'Onboarding', 'Induction', 'Visitor'];

type Building = { id: string; name: string };

// Accepts 10-digit numbers (adds +91) or numbers already starting with +91/91
function normalizeMobile(raw: string): string {
  const stripped = raw.trim().replace(/[\s\-().]/g, '');
  if (/^\+91\d{10}$/.test(stripped)) return stripped;
  if (/^91\d{10}$/.test(stripped))   return `+${stripped}`;
  if (/^[6-9]\d{9}$/.test(stripped)) return `+91${stripped}`;
  return stripped; // return as-is if unrecognised format
}

export default function NewEntryPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '', email: '', mobile_number: '', role: '', purpose: 'Interview',
    reporting_date: '', valid_until: '', employee_id: '', poc_name: '', contact_no: '', building_name: '',
  });
  const [duplicate, setDuplicate] = useState<{ entryId: string; registrationUrl: string; email: string; name: string } | null>(null);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState('');
  const [customBuilding, setCustomBuilding] = useState('');
  const [isOtherBuilding, setIsOtherBuilding] = useState(false);
  const [customRole, setCustomRole] = useState('');
  const [isOtherRole, setIsOtherRole] = useState(false);
  const [isOtherPurpose, setIsOtherPurpose] = useState(false);
  const [customPurpose, setCustomPurpose] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<(typeof form & { registrationUrl: string; emailSent: boolean; emailError: string; status: string; id: string }) | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [resendingCreated, setResendingCreated] = useState(false);
  const [resendCreatedSuccess, setResendCreatedSuccess] = useState('');
  const [resendCreatedError, setResendCreatedError] = useState('');

  useEffect(() => {
    fetch('/api/buildings').then((r) => r.json()).then((data) => {
      if (Array.isArray(data) && data.length > 0) setBuildings(data);
      else setBuildings(BUILDING_OPTIONS.map((n, i) => ({ id: String(i), name: n })));
    }).catch(() => setBuildings(BUILDING_OPTIONS.map((n, i) => ({ id: String(i), name: n }))));
  }, []);

  function addDays(dateStr: string, n: number): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d + n);
    return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setDuplicate(null);
    setResendSuccess('');
    setForm((f) => {
      const updated = { ...f, [name]: value };
      if (name === 'reporting_date' && value) {
        updated.valid_until = addDays(value, 7);
      }
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
    const finalRole = isOtherRole ? customRole.trim() : form.role;
    const finalPurpose = isOtherPurpose ? customPurpose.trim() : form.purpose;
    if (!finalBuilding) { setError('Building name is required'); return; }
    if (!finalPurpose) { setError('Purpose is required'); return; }
    if (form.email.toLowerCase() !== confirmEmail.toLowerCase()) {
      setError('Email addresses do not match. Please re-enter the Confirm Email field.');
      return;
    }
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
    setResendingCreated(true);
    setResendCreatedError('');
    setResendCreatedSuccess('');
    try {
      const res = await fetch('/api/entries/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId: created.id }),
      });
      const d = await res.json();
      if (!res.ok) { setResendCreatedError(d.error ?? 'Resend failed'); return; }
      setResendCreatedSuccess(`Invitation email sent to ${created.email}`);
    } catch {
      setResendCreatedError('Could not reach server. Please try again.');
    } finally {
      setResendingCreated(false);
    }
  }

  function reset() {
    setCreated(null);
    setForm({ name: '', email: '', mobile_number: '', role: '', purpose: 'Interview', reporting_date: '', valid_until: '', employee_id: '', poc_name: '', contact_no: '', building_name: '' });
    setConfirmEmail('');
    setDuplicate(null); setResendSuccess('');
    setCustomBuilding(''); setIsOtherBuilding(false); setCustomRole(''); setIsOtherRole(false);
    setIsOtherPurpose(false); setCustomPurpose('');
    setResendCreatedSuccess(''); setResendCreatedError('');
  }

  if (created) {
    return (
      <div className="max-w-lg mx-auto px-3 sm:px-0">
        <div className="bg-white rounded-xl border border-green-200 p-5 sm:p-8 space-y-4">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800">Entry Created!</h2>
            <p className="text-gray-500 text-sm">Status: <strong>Pending Form</strong> — registration email {created.emailSent ? 'sent' : 'failed'}.</p>
          </div>

          {created.emailSent || resendCreatedSuccess ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-700">
              {resendCreatedSuccess || `Registration form sent to `}
              {!resendCreatedSuccess && <strong>{created.email}</strong>}
              {!resendCreatedSuccess && '.'}
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
              <p className="font-semibold">Email failed to send</p>
              <p className="text-xs mt-0.5">{created.emailError || 'Could not send the invite email. Use the link below or retry.'}</p>
              {resendCreatedError && <p className="text-xs text-red-600 mt-1">{resendCreatedError}</p>}
              <button
                onClick={handleResendToCreated}
                disabled={resendingCreated}
                className="mt-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                {resendingCreated ? 'Sending…' : 'Retry Send Email'}
              </button>
            </div>
          )}

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Registration Link</p>
            <div className="flex items-center gap-2">
              <p className="text-xs text-blue-600 break-all flex-1 font-mono">{created.registrationUrl}</p>
              <button onClick={() => navigator.clipboard.writeText(created.registrationUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); })}
                className="flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-800 text-white hover:bg-gray-700">
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="flex gap-3 justify-center pt-2">
            <button onClick={reset} className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">Add Another</button>
            <button onClick={() => router.push('/')} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700">Dashboard</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-3 sm:px-0">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">Add New Entry</h1>
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>}

          {resendSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
              <span className="font-semibold">✓</span> {resendSuccess}
            </div>
          )}

          {duplicate && (
            <div className="bg-amber-50 border border-amber-300 rounded-lg px-4 py-3 text-sm space-y-2">
              <p className="font-semibold text-amber-800">This candidate already has an entry for this date.</p>
              <p className="text-amber-700 text-xs">Do you want to resend the invitation email to <strong>{duplicate.email}</strong> instead?</p>
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                {resending ? 'Resending…' : 'Resend Invite'}
              </button>
            </div>
          )}

          <Field label="Full Name *"><input name="name" value={form.name} onChange={handleChange} required placeholder="Full Name" className="input" /></Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Email *"><input name="email" type="email" value={form.email} onChange={handleChange} required placeholder="candidate@example.com" className="input" /></Field>
            <Field label="Mobile *"><input name="mobile_number" type="tel" value={form.mobile_number} onChange={handleChange} onBlur={() => handleMobileBlur('mobile_number')} required placeholder="+91 9876543210" className="input" /></Field>
          </div>

          <Field label="Confirm Email *">
            <input
              type="email"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              required
              placeholder="Re-enter candidate email to confirm"
              className={`input ${confirmEmail && form.email && confirmEmail.toLowerCase() !== form.email.toLowerCase() ? 'border-red-400 bg-red-50' : confirmEmail && form.email && confirmEmail.toLowerCase() === form.email.toLowerCase() ? 'border-green-400' : ''}`}
              onPaste={(e) => e.preventDefault()}
            />
            {confirmEmail && form.email && confirmEmail.toLowerCase() !== form.email.toLowerCase() && (
              <p className="text-xs text-red-500 mt-1">Email addresses do not match.</p>
            )}
            {confirmEmail && form.email && confirmEmail.toLowerCase() === form.email.toLowerCase() && (
              <p className="text-xs text-green-600 mt-1">✓ Emails match</p>
            )}
            <p className="text-xs text-gray-400 mt-1">Typos in email = bounced invitations. Paste is disabled — type carefully.</p>
          </Field>

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
            <Field label="Reporting Date *"><input name="reporting_date" type="date" value={form.reporting_date} onChange={handleChange} required className="input" /></Field>
            <Field label="Valid Until *">
              <input name="valid_until" type="date" value={form.valid_until} onChange={handleChange} required className="input" />
              <p className="text-xs text-gray-400 mt-1">Auto-set to +7 days</p>
            </Field>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Point of Contact</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="POC Name *"><input name="poc_name" value={form.poc_name} onChange={handleChange} required placeholder="Point of Contact Name" className="input" /></Field>
              <Field label="Employee ID"><input name="employee_id" value={form.employee_id} onChange={handleChange} placeholder="NW0000001" className="input" /></Field>
            </div>
            <Field label="Contact No *"><input name="contact_no" type="tel" value={form.contact_no} onChange={handleChange} onBlur={() => handleMobileBlur('contact_no')} required placeholder="POC Contact Number" className="input" /></Field>
          </div>

          <Field label="Building *">
            <select value={isOtherBuilding ? '__other__' : form.building_name} onChange={handleBuildingSelect} required={!isOtherBuilding} className="input">
              <option value="">Select building</option>
              {buildings.map((b) => <option key={b.id} value={b.name}>{b.name}</option>)}
              <option value="__other__">Other</option>
            </select>
            {isOtherBuilding && <input value={customBuilding} onChange={(e) => setCustomBuilding(e.target.value)} required placeholder="Enter building name" className="input mt-2" />}
          </Field>

          <button type="submit" disabled={submitting} className="w-full py-3 sm:py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg font-medium transition-colors text-sm sm:text-base">
            {submitting ? 'Creating…' : 'Create Entry & Send Invite'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>{children}</div>;
}
