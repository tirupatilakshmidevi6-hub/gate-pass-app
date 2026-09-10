'use client';

import { useEffect, useState, useCallback } from 'react';
import { getRoleStyle } from '@/lib/constants';
import { CalendarDays, Search, RefreshCw, CheckCircle, XCircle, X, Clock, Send, RotateCcw } from 'lucide-react';

type EntryRow = {
  id: string; name: string; email: string | null; mobile_number: string | null;
  role: string | null; purpose: string; reporting_date: string; valid_until: string | null;
  employee_id: string | null; poc_name: string; contact_no: string; building_name: string;
  status: string; pass_id: string | null; photo_url: string | null; form_status: string;
  created_at: string; created_by: string; invite_token: string | null;
};

const STATUS_BADGE: Record<string, string> = {
  'Pending Form':     'badge-pending-form',
  'Pending Approval': 'badge-pending-approval',
  'Approved':         'badge-approved',
  'Rejected':         'badge-rejected',
  'Expired':          'badge-expired',
};

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function matchesSearch(e: EntryRow, q: string) {
  const lower = q.toLowerCase();
  return [e.name, e.email, e.employee_id, e.mobile_number, e.building_name, e.poc_name, e.purpose, e.role, e.status]
    .some((v) => v?.toLowerCase().includes(lower));
}

function timeAgo(isoDate: string) {
  const diff = Date.now() - new Date(isoDate).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total];
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
  return [1, '...', current - 1, current, current + 1, '...', total];
}

function EntryListPagination({
  page, totalPages, total, pageSize, onPage,
}: {
  page: number; totalPages: number; total: number; pageSize: number; onPage: (p: number) => void;
}) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to   = Math.min(page * pageSize, total);
  const nums = getPageNumbers(page, totalPages);
  if (totalPages <= 1 && total === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
      <span className="text-xs text-gray-500">Showing {from} to {to} of {total} entries</span>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          {([
            { label: '«', action: () => onPage(1),          disabled: page === 1 },
            { label: '‹', action: () => onPage(page - 1),   disabled: page === 1 },
          ] as const).map(({ label, action, disabled }) => (
            <button key={label} onClick={action} disabled={disabled}
              className="w-8 h-8 rounded-lg border border-gray-300 text-gray-600 text-xs font-semibold hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center">
              {label}
            </button>
          ))}
          {nums.map((p, i) =>
            p === '...'
              ? <span key={`d${i}`} className="w-8 h-8 flex items-center justify-center text-gray-400 text-xs select-none">…</span>
              : <button key={p} onClick={() => onPage(p as number)}
                  className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${p === page ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                  {p}
                </button>
          )}
          {([
            { label: '›', action: () => onPage(page + 1),    disabled: page === totalPages },
            { label: '»', action: () => onPage(totalPages),  disabled: page === totalPages },
          ] as const).map(({ label, action, disabled }) => (
            <button key={label} onClick={action} disabled={disabled}
              className="w-8 h-8 rounded-lg border border-gray-300 text-gray-600 text-xs font-semibold hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center">
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Entry Detail Modal ───────────────────────────────────────────────────────

function EntryModal({
  entry, userRole, onClose, onStatusUpdate, onRenew,
}: {
  entry: EntryRow;
  userRole: string;
  onClose: () => void;
  onStatusUpdate: (id: string, updated: Partial<EntryRow>) => void;
  onRenew?: (entry: EntryRow) => void;
}) {
  const [processing, setProcessing] = useState<'approve' | 'reject' | null>(null);
  const [resendingPass, setResendingPass] = useState(false);
  const [modalToast, setModalToast] = useState('');
  const [activityLogs, setActivityLogs] = useState<{ action: string; performed_by_name: string; created_at: string }[]>([]);

  useEffect(() => {
    fetch(`/api/activity?entry_id=${entry.id}&limit=20`)
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setActivityLogs(d))
      .catch(() => {});
  }, [entry.id]);

  async function handleAction(action: 'approve' | 'reject') {
    setProcessing(action);
    try {
      const res = await fetch(`/api/approvals/${entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        const updated = await res.json();
        onStatusUpdate(entry.id, updated);
        onClose();
      }
    } finally { setProcessing(null); }
  }

  const timeline = [
    {
      label: 'Entry Created',
      done: true,
      detail: `By ${entry.created_by}`,
      time: entry.created_at,
    },
    {
      label: 'Invite Sent',
      done: !!entry.invite_token || entry.status !== 'Pending Form',
      detail: entry.email ?? '—',
      time: entry.created_at,
    },
    {
      label: 'Form Submitted',
      done: entry.form_status === 'submitted' || entry.status === 'Pending Approval' || entry.status === 'Approved' || entry.status === 'Rejected',
      detail: entry.status === 'Pending Form' ? 'Waiting for candidate' : 'Submitted',
      time: null,
    },
    {
      label: 'Facilities Review',
      done: entry.status === 'Approved' || entry.status === 'Rejected',
      detail: entry.status === 'Approved' ? 'Approved' : entry.status === 'Rejected' ? 'Rejected' : 'Pending',
      time: null,
    },
    {
      label: 'Gate Pass',
      done: entry.status === 'Approved',
      detail: entry.status === 'Approved' ? `Pass ID: ${entry.pass_id ?? '—'}` : 'Not yet',
      time: null,
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl max-h-[92dvh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 to-blue-600 rounded-t-2xl px-4 sm:px-6 py-4 sm:py-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              {entry.photo_url
                ? <img src={entry.photo_url} alt="" className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-white/30 flex-shrink-0" />
                : <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-white/20 flex items-center justify-center text-white text-xl sm:text-2xl font-bold flex-shrink-0">{entry.name.charAt(0)}</div>
              }
              <div className="min-w-0">
                <div className="text-[10px] sm:text-xs font-bold text-blue-200 uppercase tracking-widest mb-0.5 sm:mb-1">Entry Details</div>
                <div className="text-lg sm:text-xl font-bold text-white truncate">{entry.name}</div>
                <div className="text-blue-200 text-xs sm:text-sm mt-0.5 truncate">{entry.email ?? '—'}</div>
              </div>
            </div>
            <button onClick={onClose} className="text-blue-200 hover:text-white p-1 rounded-lg flex-shrink-0"><X size={20} /></button>
          </div>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[entry.status] ?? 'badge-pending-form'}`}>{entry.status}</span>
            {entry.pass_id && <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">{entry.pass_id}</span>}
            {entry.role && (() => { const rs = getRoleStyle(entry.role!); return <span style={{ background: rs.bg, color: rs.text, border: `1px solid ${rs.border}` }} className="px-2.5 py-0.5 rounded-full text-xs font-semibold">{entry.role}</span>; })()}
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">{entry.purpose}</span>
          </div>
        </div>

        <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5">
          {/* Candidate Information */}
          <Sec title="Candidate Information">
            <DR label="Mobile Number" value={entry.mobile_number ?? '—'} />
            <DR label="Purpose"       value={entry.purpose} />
            <DR label="Status"        value={entry.status} />
          </Sec>

          {/* Entry Details */}
          <Sec title="Entry Details">
            <DR label="Pass ID"        value={entry.pass_id ?? '—'} />
            <DR label="Reporting Date" value={entry.reporting_date} />
            <DR label="Valid Until"    value={entry.valid_until ?? '—'} />
            <DR label="Building"       value={entry.building_name} />
            <DR label="POC Name"       value={entry.poc_name} />
            <DR label="Employee ID"    value={entry.employee_id ?? '—'} />
            <DR label="Contact No"     value={entry.contact_no} />
          </Sec>

          {/* Registration Timeline */}
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Registration Timeline</div>
            <div className="relative pl-6">
              <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-gray-200" />
              {timeline.map((step, i) => (
                <div key={i} className="relative mb-4 last:mb-0">
                  <div className={`absolute -left-6 top-1 w-4 h-4 rounded-full border-2 flex items-center justify-center ${step.done ? 'bg-green-500 border-green-500' : 'bg-white border-gray-300'}`}>
                    {step.done && <CheckCircle size={10} className="text-white" />}
                  </div>
                  <div className="pl-2">
                    <div className={`text-sm font-semibold ${step.done ? 'text-gray-900' : 'text-gray-400'}`}>{step.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{step.detail}{step.time ? ` · ${timeAgo(step.time)}` : ''}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mini Activity Log */}
          {activityLogs.length > 0 && (
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Activity Log</div>
              <div className="space-y-1.5">
                {activityLogs.slice(0, 5).map((log) => (
                  <div key={log.created_at + log.action} className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                    <Clock size={11} className="text-gray-400 flex-shrink-0" />
                    <span className="flex-1">{formatAction(log.action)} by <strong>{log.performed_by_name}</strong></span>
                    <span className="text-gray-400 whitespace-nowrap">{timeAgo(log.created_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* System Info */}
          <Sec title="System Info">
            <DR label="Created By" value={entry.created_by} />
            <DR label="Created At" value={new Date(entry.created_at).toLocaleString()} />
          </Sec>
        </div>

        {/* Footer actions */}
        {modalToast && (
          <div className="mx-6 mb-3 px-4 py-2.5 bg-gray-900 text-white text-xs rounded-xl flex items-center gap-2">
            <CheckCircle size={13} className="text-green-400 flex-shrink-0" />{modalToast}
          </div>
        )}
        <div className="px-4 sm:px-6 pb-5 sm:pb-6 flex gap-2 sm:gap-3 flex-wrap">
          {entry.status === 'Pending Approval' && userRole === 'facilities' && (
            <>
              <button onClick={() => handleAction('approve')} disabled={!!processing}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold rounded-xl text-sm transition-colors">
                <CheckCircle size={15} />{processing === 'approve' ? 'Approving…' : 'Approve'}
              </button>
              <button onClick={() => handleAction('reject')} disabled={!!processing}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white font-semibold rounded-xl text-sm transition-colors">
                <XCircle size={15} />{processing === 'reject' ? 'Rejecting…' : 'Reject'}
              </button>
            </>
          )}
          {entry.status === 'Approved' && entry.email && (userRole === 'admin' || userRole === 'ta') && (
            <button
              disabled={resendingPass}
              onClick={async () => {
                setResendingPass(true);
                try {
                  const res = await fetch(`/api/entries/${entry.id}/resend-gate-pass`, { method: 'POST' });
                  const d = await res.json();
                  setModalToast(res.ok ? `Gate pass resent to ${entry.email}` : (d.error ?? 'Failed to resend gate pass'));
                  setTimeout(() => setModalToast(''), 4000);
                } catch {
                  setModalToast('Failed to resend gate pass. Please try again.');
                  setTimeout(() => setModalToast(''), 4000);
                } finally {
                  setResendingPass(false);
                }
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold rounded-xl text-sm transition-colors"
            >
              {resendingPass ? <><RefreshCw size={14} className="animate-spin" />Sending…</> : <><Send size={14} />Resend Gate Pass</>}
            </button>
          )}
          {(entry.status === 'Expired' || entry.status === 'Rejected') && onRenew && (userRole === 'admin' || userRole === 'ta') && (
            <button onClick={() => onRenew(entry)}
              className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl text-sm transition-colors">
              <RotateCcw size={14} />Renew Pass
            </button>
          )}
          <button onClick={onClose} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl">Close</button>
        </div>
      </div>
    </div>
  );
}

function formatAction(action: string) {
  const map: Record<string, string> = {
    candidate_submitted_form: 'Form submitted',
    entry_approved:           'Entry approved',
    entry_rejected:           'Entry rejected',
    invite_resent:            'Invite resent',
    entry_created:            'Entry created',
    entry_renewed:            'Entry renewed',
  };
  return map[action] ?? action.replace(/_/g, ' ');
}

// ─── Renew Modal ──────────────────────────────────────────────────────────────

const PURPOSES = ['Interview', 'Onboarding', 'Induction', 'Visitor', 'Other'];

function RenewModal({
  entry, onClose, onSuccess,
}: {
  entry: EntryRow;
  onClose: () => void;
  onSuccess: (newEntry: EntryRow) => void;
}) {
  const today = toISO(new Date());
  const [form, setForm] = useState({
    reporting_date: today,
    valid_until:    '',
    purpose:        entry.purpose,
    role:           entry.role ?? '',
    building_name:  entry.building_name,
    poc_name:       entry.poc_name,
    contact_no:     entry.contact_no,
  });
  const [buildings, setBuildings] = useState<string[]>([entry.building_name]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/buildings').then((r) => r.json()).then((d) => {
      if (Array.isArray(d)) setBuildings(d.map((b: { name: string }) => b.name));
    }).catch(() => {});
  }, []);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(`/api/entries/${entry.id}/renew`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reporting_date: form.reporting_date,
          valid_until:    form.valid_until || undefined,
          purpose:        form.purpose,
          role:           form.role || undefined,
          building_name:  form.building_name,
          poc_name:       form.poc_name,
          contact_no:     form.contact_no,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed to renew entry'); return; }
      onSuccess(data as EntryRow);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[92dvh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-900 to-purple-600 rounded-t-2xl px-5 py-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-purple-200 uppercase tracking-widest mb-0.5">Smart Renew</div>
            <div className="text-white font-bold text-lg">{entry.name}</div>
            <div className="text-purple-200 text-xs">{entry.email ?? entry.mobile_number ?? '—'}</div>
          </div>
          <button onClick={onClose} className="text-purple-200 hover:text-white p-1 rounded-lg"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-5">
          {/* Identity — locked */}
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Candidate Identity (auto-copied)</div>
            <div className="bg-gray-50 rounded-xl p-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-gray-600">
              <div><span className="text-gray-400">Name: </span>{entry.name}</div>
              <div><span className="text-gray-400">Email: </span>{entry.email ?? '—'}</div>
              <div><span className="text-gray-400">Mobile: </span>{entry.mobile_number ?? '—'}</div>
              <div><span className="text-gray-400">Employee ID: </span>{entry.employee_id ?? '—'}</div>
            </div>
          </div>

          {/* Visit details — editable */}
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Visit Details (edit for this visit)</div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Reporting Date <span className="text-red-500">*</span></label>
                  <input type="date" required value={form.reporting_date} min={today}
                    onChange={(e) => set('reporting_date', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Valid Until</label>
                  <input type="date" value={form.valid_until} min={form.reporting_date}
                    onChange={(e) => set('valid_until', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Purpose <span className="text-red-500">*</span></label>
                  <select required value={form.purpose} onChange={(e) => set('purpose', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                    {PURPOSES.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
                  <input type="text" value={form.role} placeholder="e.g. Intern, Staff"
                    onChange={(e) => set('role', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Building <span className="text-red-500">*</span></label>
                <select required value={form.building_name} onChange={(e) => set('building_name', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                  {buildings.map((b) => <option key={b}>{b}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">POC Name <span className="text-red-500">*</span></label>
                  <input type="text" required value={form.poc_name}
                    onChange={(e) => set('poc_name', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Contact No <span className="text-red-500">*</span></label>
                  <input type="text" required value={form.contact_no}
                    onChange={(e) => set('contact_no', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
              </div>
            </div>
          </div>

          {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-60 rounded-xl">
              {submitting ? <><RefreshCw size={14} className="animate-spin" />Renewing…</> : <><RotateCcw size={14} />Renew Pass</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EntryListPage() {
  const today = toISO(new Date());
  const [entries,     setEntries]     = useState<EntryRow[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [selected,    setSelected]    = useState<EntryRow | null>(null);
  const [dateFilter,  setDateFilter]  = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [userRole,    setUserRole]    = useState<string>('');
  const [toast,        setToast]        = useState('');
  const [resending,    setResending]    = useState<string | null>(null);
  const [page,         setPage]         = useState(1);
  const [renewTarget,  setRenewTarget]  = useState<EntryRow | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 4000); };

  const loadEntries = useCallback(async () => {
    setLoading(true);
    const data = await fetch('/api/entries').then((r) => r.json());
    setEntries(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    fetch('/api/auth/me').then((r) => r.json()).then((d) => setUserRole(d.role ?? ''));
    void loadEntries();
    // Auto-check expired passes on page load
    fetch('/api/cron/update-expired-passes', {
      headers: { authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET ?? 'nxtwave-cron-secret'}` },
    }).catch(() => {});
  }, [loadEntries]);

  // Auto-open entry from URL ?open=<id>
  useEffect(() => {
    if (!entries.length) return;
    const params = new URLSearchParams(window.location.search);
    const openId = params.get('open');
    if (openId) {
      const entry = entries.find((e) => e.id === openId);
      if (entry) setSelected(entry);
    }
  }, [entries]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function handleResendInvite(entryId: string, email: string) {
    setResending(entryId);
    try {
      const res = await fetch(`/api/entries/${entryId}/resend-invite`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showToast(`Invitation resent successfully to ${email}`);
      } else {
        showToast(data.error ?? 'Failed to resend invitation');
      }
    } catch {
      showToast('Failed to resend invitation. Please try again.');
    } finally {
      setResending(null);
    }
  }

  async function handleResendGatePass(entryId: string, email: string) {
    setResending(entryId);
    try {
      const res = await fetch(`/api/entries/${entryId}/resend-gate-pass`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showToast(`Gate pass resent successfully to ${email}`);
      } else {
        showToast(data.error ?? 'Failed to resend gate pass');
      }
    } catch {
      showToast('Failed to resend gate pass. Please try again.');
    } finally {
      setResending(null);
    }
  }

  function handleStatusUpdate(id: string, updated: Partial<EntryRow>) {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...updated } : e)));
  }

  function handleRenewSuccess(newEntry: EntryRow) {
    setEntries((prev) => [newEntry, ...prev]);
    setRenewTarget(null);
    showToast(`Pass renewed for ${newEntry.name} — sent to Facilities for approval`);
  }

  const filtered = entries.filter((e) => {
    if (dateFilter && e.reporting_date !== dateFilter) return false;
    if (searchQuery.trim() && !matchesSearch(e, searchQuery)) return false;
    return true;
  });

  const PAGE_SIZE  = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const paginated  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [dateFilter, searchQuery]);

  if (loading) return (
    <div className="page-container space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-2"><div className="skeleton h-7 w-48 rounded-lg" /><div className="skeleton h-4 w-32 rounded" /></div>
        <div className="skeleton h-9 w-56 rounded-xl" />
      </div>
      <div className="skeleton h-10 w-80 rounded-xl" />
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100"><div className="skeleton h-4 w-32 rounded" /></div>
        <div className="p-4 space-y-3">
          {[0,1,2,3,4,5].map((i) => (
            <div key={i} className="flex items-center gap-3" style={{ opacity: 1 - i * 0.1 }}>
              <div className="skeleton w-8 h-8 rounded-full" />
              <div className="flex-1 space-y-1.5"><div className="skeleton h-4 w-36 rounded" /><div className="skeleton h-3 w-24 rounded" /></div>
              <div className="skeleton h-5 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const COLS = ['#', 'Visitor', 'Role', 'Purpose', 'Phone', 'Building', 'POC', 'Date', 'Valid Until', 'Status', 'Actions'];

  return (
    <div className="page-container space-y-4">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 left-4 sm:left-auto sm:right-6 z-50 bg-gray-900 text-white text-sm px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-scale-in">
          <CheckCircle size={15} className="text-green-400 flex-shrink-0" /><span className="flex-1">{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-fade-in-up" style={{ animationDelay: '0ms' }}>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Gate Pass History</h1>
          <p className="text-sm text-gray-500 mt-0.5">All gate pass entries and their current status</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <CalendarDays size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}
              className="border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" />
          </div>
          <button onClick={() => setDateFilter('')}
            className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all ${!dateFilter ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-600 hover:bg-gray-50 bg-white'}`}>
            All
          </button>
          <button onClick={() => setDateFilter(today)}
            className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all ${dateFilter === today ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50 bg-white'}`}>
            Today
          </button>
          {(userRole === 'admin' || userRole === 'ta') && (
            <a href="/create-gate-pass"
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm">
              + New Pass
            </a>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative w-full sm:max-w-sm animate-fade-in-up" style={{ animationDelay: '40ms' }}>
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search name, phone, building, POC…"
          className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm animate-fade-in-up" style={{ animationDelay: '80ms' }}>
        <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #F3F4F6' }}>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-900">
              {dateFilter ? `Entries for ${dateFilter}` : 'All Entries'}
            </span>
            <span className="bg-gray-100 text-gray-600 text-[11px] font-bold px-2 py-0.5 rounded-full">
              {filtered.length}
            </span>
          </div>
          {totalPages > 1 && (
            <span className="text-xs text-gray-400">Page {safePage} of {totalPages}</span>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Search size={20} className="text-gray-400" />
            </div>
            <p className="text-sm font-semibold text-gray-600">No entries found</p>
            <p className="text-xs text-gray-400 mt-1">
              {searchQuery ? `No results for "${searchQuery}"` : dateFilter ? 'No entries for this date' : 'No gate passes yet'}
            </p>
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="mt-3 text-xs text-blue-600 font-semibold hover:text-blue-800">
                Clear search
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Mobile card list — hidden on sm+ */}
            <div className="sm:hidden divide-y divide-gray-100">
              {paginated.map((e) => {
                const rs = getRoleStyle(e.role ?? '');
                return (
                  <div key={e.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-sm font-bold flex-shrink-0">{e.name.charAt(0)}</div>
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 text-sm truncate">{e.name}</div>
                          <div className="text-xs text-gray-500 truncate">{e.email ?? e.mobile_number ?? '—'}</div>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${STATUS_BADGE[e.status] ?? 'badge-pending-form'}`}>{e.status}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs bg-gray-50 rounded-lg p-3">
                      <div><span className="text-gray-400">Date: </span><span className="text-gray-700">{e.reporting_date}</span></div>
                      <div><span className="text-gray-400">Building: </span><span className="text-gray-700">{e.building_name}</span></div>
                      <div><span className="text-gray-400">POC: </span><span className="text-gray-700">{e.poc_name}</span></div>
                      <div><span className="text-gray-400">Purpose: </span><span className="text-gray-700">{e.purpose}</span></div>
                    </div>
                    {e.role && (
                      <span style={{ background: rs.bg, color: rs.text, border: `1px solid ${rs.border}` }} className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold">{e.role}</span>
                    )}
                    <div className="flex gap-2">
                      <button onClick={() => setSelected(e)} className="flex-1 py-2.5 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50">View Details</button>
                      {e.status === 'Pending Form' && e.email && (
                        <button onClick={() => handleResendInvite(e.id, e.email!)} disabled={resending === e.id}
                          className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium text-amber-600 border border-amber-200 rounded-lg hover:bg-amber-50 disabled:opacity-50">
                          {resending === e.id ? <><RefreshCw size={10} className="animate-spin" />…</> : <><Send size={10} />Resend</>}
                        </button>
                      )}
                      {e.status === 'Approved' && e.email && (userRole === 'admin' || userRole === 'ta') && (
                        <button onClick={() => handleResendGatePass(e.id, e.email!)} disabled={resending === e.id}
                          className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium text-green-700 border border-green-200 rounded-lg hover:bg-green-50 disabled:opacity-50">
                          {resending === e.id ? <><RefreshCw size={10} className="animate-spin" />…</> : <><Send size={10} />Pass</>}
                        </button>
                      )}
                      {(e.status === 'Expired' || e.status === 'Rejected') && (userRole === 'admin' || userRole === 'ta') && (
                        <button onClick={() => setRenewTarget(e)}
                          className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-50">
                          <RotateCcw size={10} />Renew
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop table — hidden on mobile */}
            <div className="hidden sm:block overflow-x-auto touch-scroll-x">
              <table className="w-full text-sm" style={{ minWidth: 780 }}>
                <thead className="bg-gray-50">
                  <tr>{COLS.map((h) => (
                    <th key={h} className="text-left px-3 sm:px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginated.map((e, idx) => {
                    const rs = getRoleStyle(e.role ?? '');
                    return (
                      <tr key={e.id} className="trow border-b border-gray-50 last:border-0">
                        <td className="px-3 sm:px-4 py-3 text-gray-400 text-xs font-medium">{(safePage - 1) * PAGE_SIZE + idx + 1}</td>
                        <td className="px-3 sm:px-4 py-3 font-medium text-gray-900 whitespace-nowrap text-xs sm:text-sm">{e.name}</td>
                        <td className="px-3 sm:px-4 py-3">
                          {e.role && <span style={{ background: rs.bg, color: rs.text, border: `1px solid ${rs.border}` }}
                            className="px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap">{e.role}</span>}
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-gray-600 text-xs">{e.purpose}</td>
                        <td className="px-3 sm:px-4 py-3 text-gray-600 whitespace-nowrap font-mono text-xs">{e.mobile_number ?? '—'}</td>
                        <td className="px-3 sm:px-4 py-3 text-gray-600 text-xs">{e.building_name}</td>
                        <td className="px-3 sm:px-4 py-3 text-gray-600 whitespace-nowrap text-xs">{e.poc_name}</td>
                        <td className="px-3 sm:px-4 py-3 text-gray-600 whitespace-nowrap text-xs">{e.reporting_date}</td>
                        <td className="px-3 sm:px-4 py-3 text-gray-600 whitespace-nowrap text-xs">{e.valid_until ?? '—'}</td>
                        <td className="px-3 sm:px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[e.status] ?? 'badge-pending-form'}`}>{e.status}</span>
                        </td>
                        <td className="px-3 sm:px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => setSelected(e)}
                              className="px-2.5 py-1 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 whitespace-nowrap">
                              View
                            </button>
                            {e.status === 'Pending Form' && e.email && (
                              <button onClick={() => handleResendInvite(e.id, e.email!)} disabled={resending === e.id}
                                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-600 border border-amber-200 rounded-lg hover:bg-amber-50 disabled:opacity-50 transition-colors whitespace-nowrap">
                                {resending === e.id ? <><RefreshCw size={10} className="animate-spin" />…</> : <><Send size={10} />Resend</>}
                              </button>
                            )}
                            {e.status === 'Approved' && e.email && (userRole === 'admin' || userRole === 'ta') && (
                              <button onClick={() => handleResendGatePass(e.id, e.email!)} disabled={resending === e.id}
                                title="Resend gate pass email"
                                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-green-700 border border-green-200 rounded-lg hover:bg-green-50 disabled:opacity-50 transition-colors whitespace-nowrap">
                                {resending === e.id ? <><RefreshCw size={10} className="animate-spin" />…</> : <><Send size={10} />Pass</>}
                              </button>
                            )}
                            {(e.status === 'Expired' || e.status === 'Rejected') && (userRole === 'admin' || userRole === 'ta') && (
                              <button onClick={() => setRenewTarget(e)}
                                title="Renew gate pass"
                                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors whitespace-nowrap">
                                <RotateCcw size={10} />Renew
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      <EntryListPagination
        page={safePage}
        totalPages={totalPages}
        total={filtered.length}
        pageSize={PAGE_SIZE}
        onPage={setPage}
      />

      {/* Entry Detail Modal */}
      {selected && (
        <EntryModal
          entry={selected}
          userRole={userRole}
          onClose={() => setSelected(null)}
          onStatusUpdate={handleStatusUpdate}
          onRenew={(e) => { setSelected(null); setRenewTarget(e); }}
        />
      )}

      {/* Renew Modal */}
      {renewTarget && (
        <RenewModal
          entry={renewTarget}
          onClose={() => setRenewTarget(null)}
          onSuccess={handleRenewSuccess}
        />
      )}
    </div>
  );
}

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">{title}</div>
      <div className="bg-gray-50 rounded-xl divide-y divide-gray-100">{children}</div>
    </div>
  );
}
function DR({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center px-4 py-2.5 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-800 text-right max-w-[60%] break-words">{value}</span>
    </div>
  );
}
