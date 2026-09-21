'use client';

import { useEffect, useState, useCallback } from 'react';
import { Clock, Search, CheckCircle, XCircle, Send, UserPlus, RefreshCw, Shield, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';

type ActivityLog = {
  id: string; action: string; performed_by: string | null;
  performed_by_name: string; entry_id: string | null;
  candidate_name: string | null; details: Record<string, unknown> | null;
  created_at: string;
};

const ACTION_META: Record<string, { label: string; icon: React.ReactNode; dot: string }> = {
  candidate_submitted_form: { label: 'Form Submitted',   icon: <CheckCircle size={13} />, dot: 'bg-blue-500' },
  entry_approved:           { label: 'Entry Approved',   icon: <CheckCircle size={13} />, dot: 'bg-green-500' },
  entry_rejected:           { label: 'Entry Rejected',   icon: <XCircle     size={13} />, dot: 'bg-red-500' },
  invite_resent:            { label: 'Invite Resent',    icon: <Send        size={13} />, dot: 'bg-amber-500' },
  entry_created:            { label: 'Entry Created',    icon: <UserPlus    size={13} />, dot: 'bg-purple-500' },
  passes_expired_auto:      { label: 'Passes Expired',   icon: <Clock       size={13} />, dot: 'bg-gray-400' },
  user_invited:             { label: 'User Invited',     icon: <UserPlus    size={13} />, dot: 'bg-indigo-500' },
  user_activated:           { label: 'User Activated',   icon: <CheckCircle size={13} />, dot: 'bg-green-500' },
  user_deactivated:         { label: 'User Deactivated', icon: <XCircle     size={13} />, dot: 'bg-red-500' },
  gate_pass_sent:           { label: 'Pass Sent',        icon: <Send        size={13} />, dot: 'bg-blue-500' },
  gate_pass_resent:         { label: 'Pass Resent',      icon: <Send        size={13} />, dot: 'bg-blue-400' },
  entry_renewed:            { label: 'Entry Renewed',    icon: <RefreshCw   size={13} />, dot: 'bg-teal-500' },
};

const DEFAULT_META = { label: 'System', icon: <Shield size={13} />, dot: 'bg-gray-300' };

// Badge color per action type
const BADGE_COLOR: Record<string, string> = {
  entry_approved: 'bg-green-50 text-green-700 border-green-200',
  entry_rejected: 'bg-red-50 text-red-700 border-red-200',
  candidate_submitted_form: 'bg-blue-50 text-blue-700 border-blue-200',
  entry_created: 'bg-purple-50 text-purple-700 border-purple-200',
  invite_resent: 'bg-amber-50 text-amber-700 border-amber-200',
  gate_pass_sent: 'bg-blue-50 text-blue-700 border-blue-200',
  gate_pass_resent: 'bg-blue-50 text-blue-700 border-blue-200',
  user_invited: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  user_activated: 'bg-green-50 text-green-700 border-green-200',
  user_deactivated: 'bg-red-50 text-red-700 border-red-200',
  entry_renewed: 'bg-teal-50 text-teal-700 border-teal-200',
};
const DEFAULT_BADGE = 'bg-gray-50 text-gray-500 border-gray-200';

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
}

function buildDescription(log: ActivityLog): string {
  const actor = log.performed_by_name || 'System';
  const cand  = log.candidate_name ?? 'a candidate';
  switch (log.action) {
    case 'candidate_submitted_form': return `${cand} submitted their registration form`;
    case 'entry_approved':           return `Entry approved for ${cand} by ${actor}`;
    case 'entry_rejected':           return `Entry rejected for ${cand} by ${actor}`;
    case 'invite_resent':            return `Invite resent to ${cand} by ${actor}`;
    case 'entry_created':            return `Entry created for ${cand} by ${actor}`;
    case 'passes_expired_auto':      return `${(log.details as {count?: number})?.count ?? 'Some'} pass(es) auto-expired`;
    case 'user_invited':             return `New user invited by ${actor}`;
    case 'user_activated':           return `Account activated for ${actor}`;
    case 'user_deactivated':         return `Account deactivated by ${actor}`;
    case 'gate_pass_sent':           return `Gate pass sent to ${cand}`;
    case 'gate_pass_resent':         return `Gate pass resent to ${cand}`;
    case 'entry_renewed':            return `Pass renewed for ${cand} by ${actor}`;
    default: return log.action.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }
}

const ACTION_TYPES = Object.entries(ACTION_META).map(([key, val]) => ({ key, label: val.label }));

export default function ActivityPage() {
  const router = useRouter();
  const [logs,         setLogs]         = useState<ActivityLog[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [fromDate,     setFromDate]     = useState('');
  const [toDate,       setToDate]       = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search)       params.set('q', search);
    if (actionFilter) params.set('action', actionFilter);
    if (fromDate)     params.set('from', fromDate);
    if (toDate)       params.set('to', toDate);
    const data = await fetch(`/api/activity?${params}`).then((r) => r.json()).catch(() => []);
    setLogs(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [search, actionFilter, fromDate, toDate]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void fetchLogs(); }, [fetchLogs]);

  const hasFilter = search || actionFilter || fromDate || toDate;

  return (
    <div className="page-container space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Activity Log</h1>
          <p className="text-sm text-gray-400 mt-0.5">Audit trail of all system actions</p>
        </div>
        <button onClick={fetchLogs}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          <RefreshCw size={13} />Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name…"
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600">
          <option value="">All Actions</option>
          {ACTION_TYPES.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
        </select>
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600" />
        {fromDate && (
          <>
            <span className="text-gray-400 text-xs">to</span>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600" />
          </>
        )}
        {hasFilter && (
          <button onClick={() => { setSearch(''); setActionFilter(''); setFromDate(''); setToDate(''); }}
            className="px-3 py-2 text-xs font-medium text-red-500 hover:text-red-700 border border-red-100 rounded-lg hover:bg-red-50 transition-colors">
            Clear
          </button>
        )}
      </div>

      {/* Log list */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-400">Loading logs…</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
          <Shield size={28} className="text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">No activity logs found</p>
          {hasFilter && <p className="text-xs text-gray-400 mt-1">Try clearing your filters</p>}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {logs.map((log, idx) => {
            const meta   = ACTION_META[log.action] ?? DEFAULT_META;
            const badge  = BADGE_COLOR[log.action]  ?? DEFAULT_BADGE;
            const isLast = idx === logs.length - 1;
            return (
              <div key={log.id}
                className={`flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors ${isLast ? '' : 'border-b border-gray-100'}`}>

                {/* Dot */}
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${meta.dot}`} />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${badge}`}>
                      {meta.icon}{meta.label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 truncate">{buildDescription(log)}</p>
                </div>

                {/* Time — right */}
                <div className="flex-shrink-0 text-right hidden sm:block">
                  <p className="text-xs font-medium text-gray-500">{timeAgo(log.created_at)}</p>
                  <p className="text-[11px] text-gray-400">{fmtDateTime(log.created_at)}</p>
                </div>

                {/* View button */}
                {log.entry_id && (
                  <button onClick={() => router.push(`/entry-list?open=${log.entry_id}`)}
                    className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors">
                    <Eye size={11} />View
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
