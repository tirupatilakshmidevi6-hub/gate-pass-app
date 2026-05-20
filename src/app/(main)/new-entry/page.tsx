'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BUILDING_OPTIONS, ROLE_OPTIONS } from '@/lib/constants';

const PURPOSES = ['Interview', 'Onboarding', 'Induction', 'Visitor'];

type Building = { id: string; name: string };

export default function NewEntryPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '', email: '', mobile_number: '', role: '', purpose: 'Interview',
    reporting_date: '', poc_name: '', contact_no: '', building_name: '',
  });
  const [customBuilding, setCustomBuilding] = useState('');
  const [isOtherBuilding, setIsOtherBuilding] = useState(false);
  const [customRole, setCustomRole] = useState('');
  const [isOtherRole, setIsOtherRole] = useState(false);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<(typeof form & { registrationUrl: string; emailSent: boolean; emailError: string; status: string; id: string }) | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/buildings').then((r) => r.json()).then((data) => {
      if (Array.isArray(data) && data.length > 0) setBuildings(data);
      else setBuildings(BUILDING_OPTIONS.map((n, i) => ({ id: String(i), name: n })));
    }).catch(() => setBuildings(BUILDING_OPTIONS.map((n, i) => ({ id: String(i), name: n }))));
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const finalBuilding = isOtherBuilding ? customBuilding.trim() : form.building_name;
    const finalRole = isOtherRole ? customRole.trim() : form.role;
    if (!finalBuilding) { setError('Building name is required'); return; }
    setSubmitting(true); setError('');
    try {
      const res = await fetch('/api/entries', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, building_name: finalBuilding, role: finalRole || undefined }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Failed'); return; }
      setCreated(await res.json());
    } finally { setSubmitting(false); }
  }

  function reset() {
    setCreated(null);
    setForm({ name: '', email: '', mobile_number: '', role: '', purpose: 'Interview', reporting_date: '', poc_name: '', contact_no: '', building_name: '' });
    setCustomBuilding(''); setIsOtherBuilding(false); setCustomRole(''); setIsOtherRole(false);
  }

  if (created) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-xl border border-green-200 p-8 space-y-4">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800">Entry Created!</h2>
            <p className="text-gray-500 text-sm">Status: <strong>Pending Form</strong> — registration email {created.emailSent ? 'sent' : 'failed'}.</p>
          </div>

          {created.emailSent ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-700">Registration form sent to <strong>{created.email}</strong>.</div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
              <p className="font-semibold">Email failed</p>
              <p className="text-xs mt-0.5">{created.emailError || 'Share the link below manually.'}</p>
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
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Add New Entry</h1>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>}

          <Field label="Full Name *"><input name="name" value={form.name} onChange={handleChange} required placeholder="John Doe" className="input" /></Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Email *"><input name="email" type="email" value={form.email} onChange={handleChange} required placeholder="john@email.com" className="input" /></Field>
            <Field label="Mobile *"><input name="mobile_number" type="tel" value={form.mobile_number} onChange={handleChange} required placeholder="9876543210" pattern="[0-9]{10}" className="input" /></Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Role *">
              <select value={isOtherRole ? '__other__' : form.role} onChange={handleRoleSelect} required={!isOtherRole} className="input">
                <option value="">Select role</option>
                {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                <option value="__other__">Other</option>
              </select>
              {isOtherRole && <input value={customRole} onChange={(e) => setCustomRole(e.target.value)} required placeholder="Enter role" className="input mt-2" />}
            </Field>
            <Field label="Purpose *">
              <select name="purpose" value={form.purpose} onChange={handleChange} required className="input">
                {PURPOSES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Reporting Date *"><input name="reporting_date" type="date" value={form.reporting_date} onChange={handleChange} required className="input" /></Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="POC Name *"><input name="poc_name" value={form.poc_name} onChange={handleChange} required placeholder="Jane Smith" className="input" /></Field>
            <Field label="Contact No *"><input name="contact_no" value={form.contact_no} onChange={handleChange} required placeholder="9876543210" className="input" /></Field>
          </div>

          <Field label="Building *">
            <select value={isOtherBuilding ? '__other__' : form.building_name} onChange={handleBuildingSelect} required={!isOtherBuilding} className="input">
              <option value="">Select building</option>
              {buildings.map((b) => <option key={b.id} value={b.name}>{b.name}</option>)}
              <option value="__other__">Other</option>
            </select>
            {isOtherBuilding && <input value={customBuilding} onChange={(e) => setCustomBuilding(e.target.value)} required placeholder="Enter building name" className="input mt-2" />}
          </Field>

          <button type="submit" disabled={submitting} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg font-medium transition-colors">
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
