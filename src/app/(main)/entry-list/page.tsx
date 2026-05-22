'use client';

import { useEffect, useState, useCallback } from 'react';
import { getRoleStyle } from '@/lib/constants';
import { CalendarDays, Search, RefreshCw, CheckCircle, XCircle, X, Clock, Send } from 'lucide-react';

type EntryRow = {
  id: string; name: string; email: string | null; mobile_number: string | null;
  role: string | null; purpose: string; reporting_date: string; valid_until: string | null;
  employee_id: string | null; poc_name: string; contact_no: string; building_name: string;
  status: string; pass_id: string | null; photo_url: string | null; form_status: string;
  created_at: string; created_by: string; invite_token: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  'Pending Form':     'bg-gray-100 text-gray-600',
  'Pending Approval': 'bg-orange-100 text-orange-700',
  'Approved':         'bg-green-100 text-green-700',
  'Rejected':         'bg-red-100 text-red-700',
  'Expired':          'bg-red-900/20 text-red-900',
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

// ─── Entry Detail Modal ───────────────────────────────────────────────────────

function EntryModal({
  entry, userRole, onClose, onStatusUpdate,
}: {
  entry: EntryRow;
  userRole: string;
  onClose: () => void;
  onStatusUpdate: (id: string, updated: Partial<EntryRow>) => void;
}) {
  const [processing, setProcessing] = useState<'approve' | 'reject' | null>(null);
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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 to-blue-600 rounded-t-2xl px-6 py-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {entry.photo_url
                ? <img src={entry.photo_url} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-white/30" />
                : <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-white text-2xl font-bold">{entry.name.charAt(0)}</div>
              }
              <div>
                <div className="text-xs font-bold text-blue-200 uppercase tracking-widest mb-1">Entry Details</div>
                <div className="text-xl font-bold text-white">{entry.name}</div>
                <div className="text-blue-200 text-sm mt-0.5">{entry.email ?? '—'}</div>
              </div>
            </div>
            <button onClick={onClose} className="text-blue-200 hover:text-white p-1 rounded-lg"><X size={20} /></button>
          </div>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[entry.status] ?? 'bg-gray-100 text-gray-600'}`}>{entry.status}</span>
            {entry.pass_id && <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">{entry.pass_id}</span>}
            {entry.role && (() => { const rs = getRoleStyle(entry.role!); return <span style={{ background: rs.bg, color: rs.text, border: `1px solid ${rs.border}` }} className="px-2.5 py-0.5 rounded-full text-xs font-semibold">{entry.role}</span>; })()}
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">{entry.purpose}</span>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
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
        <div className="px-6 pb-6 flex gap-3">
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
  };
  return map[action] ?? action.replace(/_/g, ' ');
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
  const [toast,       setToast]       = useState('');
  const [resending,   setResending]   = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 4000); };

  const loadEntries = useCallback(async () => {
    setLoading(true);
    const data = await fetch('/api/entries').then((r) => r.json());
    setEntries(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch('/api/auth/me').then((r) => r.json()).then((d) => setUserRole(d.role ?? ''));
    loadEntries();
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

  function handleStatusUpdate(id: string, updated: Partial<EntryRow>) {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...updated } : e)));
  }

  const filtered = entries.filter((e) => {
    if (dateFilter && e.reporting_date !== dateFilter) return false;
    if (searchQuery.trim() && !matchesSearch(e, searchQuery)) return false;
    return true;
  });

  if (loading) return <div className="text-sm text-gray-400 p-6">Loading entries…</div>;

  const COLS = ['#', 'Name', 'Role', 'Purpose', 'Phone', 'Building', 'POC Name', 'Reporting Date', 'Valid Until', 'Status', 'Actions'];

  return (
    <div className="space-y-4 p-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-xl flex items-center gap-2">
          <CheckCircle size={15} className="text-green-400" />{toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-800">Entry List</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <CalendarDays size={16} className="text-gray-400" />
          <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button onClick={() => setDateFilter('')} className="px-3 py-1.5 text-xs font-semibold border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600">All</button>
          <button onClick={() => setDateFilter(today)} className="px-3 py-1.5 text-xs font-semibold border border-blue-300 rounded-lg hover:bg-blue-50 text-blue-600">Today</button>
          {(userRole === 'admin' || userRole === 'super_admin') && (
            <a href="/new-entry" className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">+ New Entry</a>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search name, phone, building, POC…"
          className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-3 border-b border-gray-100 text-sm text-gray-500">{filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>{COLS.map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={COLS.length} className="px-6 py-10 text-center text-gray-400">No entries found.</td></tr>
              ) : filtered.map((e, idx) => {
                const rs = getRoleStyle(e.role ?? '');
                return (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-400 text-xs font-medium">{idx + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{e.name}</td>
                    <td className="px-4 py-3">
                      {e.role && <span style={{ background: rs.bg, color: rs.text, border: `1px solid ${rs.border}` }}
                        className="px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap">{e.role}</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{e.purpose}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap font-mono text-xs">{e.mobile_number ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{e.building_name}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{e.poc_name}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{e.reporting_date}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{e.valid_until ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[e.status] ?? 'bg-gray-100 text-gray-600'}`}>{e.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setSelected(e)}
                          className="px-3 py-1 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50">
                          View
                        </button>
                        {e.status === 'Pending Form' && e.email && (
                          <button
                            onClick={() => handleResendInvite(e.id, e.email!)}
                            disabled={resending === e.id}
                            className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-amber-600 border border-amber-200 rounded-lg hover:bg-amber-50 disabled:opacity-50 transition-colors"
                          >
                            {resending === e.id
                              ? <><RefreshCw size={10} className="animate-spin" />Sending…</>
                              : <><Send size={10} />Resend Invite</>
                            }
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
      </div>

      {/* Entry Detail Modal */}
      {selected && (
        <EntryModal
          entry={selected}
          userRole={userRole}
          onClose={() => setSelected(null)}
          onStatusUpdate={handleStatusUpdate}
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
