'use client';

import { useEffect, useState, useCallback } from 'react';
import { Clock, Search, Filter, CheckCircle, XCircle, Send, UserPlus, RefreshCw, Shield, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';

type ActivityLog = {
  id: string; action: string; performed_by: string | null;
  performed_by_name: string; entry_id: string | null;
  candidate_name: string | null; details: Record<string, unknown> | null;
  created_at: string;
};

const ACTION_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  candidate_submitted_form: { label: 'Form Submitted',   icon: <CheckCircle size={14} />, color: 'text-blue-600   bg-blue-50   border-blue-200' },
  entry_approved:           { label: 'Entry Approved',   icon: <CheckCircle size={14} />, color: 'text-green-600  bg-green-50  border-green-200' },
  entry_rejected:           { label: 'Entry Rejected',   icon: <XCircle    size={14} />, color: 'text-red-600    bg-red-50    border-red-200' },
  invite_resent:            { label: 'Invite Resent',    icon: <Send        size={14} />, color: 'text-amber-600  bg-amber-50  border-amber-200' },
  entry_created:            { label: 'Entry Created',    icon: <UserPlus    size={14} />, color: 'text-purple-600 bg-purple-50 border-purple-200' },
  passes_expired_auto:      { label: 'Passes Expired',   icon: <Clock       size={14} />, color: 'text-gray-600   bg-gray-50   border-gray-200' },
  user_invited:             { label: 'User Invited',     icon: <UserPlus    size={14} />, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  user_activated:           { label: 'User Activated',   icon: <CheckCircle size={14} />, color: 'text-green-600  bg-green-50  border-green-200' },
  user_deactivated:         { label: 'User Deactivated', icon: <XCircle    size={14} />, color: 'text-red-600    bg-red-50    border-red-200' },
  gate_pass_sent:           { label: 'Pass Sent',        icon: <Send        size={14} />, color: 'text-blue-600   bg-blue-50   border-blue-200' },
};

const DEFAULT_META = { label: 'System Event', icon: <Shield size={14} />, color: 'text-gray-600 bg-gray-50 border-gray-200' };

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

function buildDescription(log: ActivityLog): string {
  const actor = log.performed_by_name;
  const cand  = log.candidate_name ?? 'a candidate';
  switch (log.action) {
    case 'candidate_submitted_form': return `${cand} submitted their registration form`;
    case 'entry_approved':           return `Entry approved for ${cand} by ${actor}`;
    case 'entry_rejected':           return `Entry rejected for ${cand} by ${actor}`;
    case 'invite_resent':            return `Invite resent to ${cand} by ${actor}`;
    case 'entry_created':            return `Entry created for ${cand} by ${actor}`;
    case 'passes_expired_auto':      return `${(log.details as {count?: number})?.count ?? ''} pass(es) auto-expired by System`;
    case 'user_invited':             return `New user invited by ${actor}`;
    case 'user_activated':           return `User account activated by ${actor}`;
    case 'user_deactivated':         return `User account deactivated by ${actor}`;
    case 'gate_pass_sent':           return `Gate pass sent to ${cand}`;
    default: return log.action.replace(/_/g, ' ');
  }
}

const ACTION_TYPES = Object.entries(ACTION_META).map(([key, val]) => ({ key, label: val.label }));

export default function ActivityPage() {
  const router = useRouter();
  const [logs,       setLogs]       = useState<ActivityLog[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [fromDate,   setFromDate]   = useState('');
  const [toDate,     setToDate]     = useState('');

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

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Activity Log</h1>
          <p className="text-sm text-gray-500 mt-0.5">Full audit trail of all system actions</p>
        </div>
        <button onClick={fetchLogs} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
          <RefreshCw size={14} />Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex flex-wrap gap-3 items-end">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          <Filter size={12} />Filters
        </div>
        <div className="relative flex-1 min-w-[180px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search candidate name…"
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          <option value="">All Actions</option>
          {ACTION_TYPES.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <span className="text-gray-400 text-xs">to</span>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        {(search || actionFilter || fromDate || toDate) && (
          <button onClick={() => { setSearch(''); setActionFilter(''); setFromDate(''); setToDate(''); }}
            className="text-xs text-red-500 hover:text-red-700 font-medium">Clear</button>
        )}
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="text-sm text-gray-400 py-10 text-center">Loading activity logs…</div>
      ) : logs.length === 0 ? (
        <div className="text-sm text-gray-400 py-10 text-center">No activity logs found.</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {logs.map((log) => {
            const meta = ACTION_META[log.action] ?? DEFAULT_META;
            return (
              <div key={log.id} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className={`flex-shrink-0 w-8 h-8 rounded-full border flex items-center justify-center ${meta.color}`}>
                  {meta.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${meta.color}`}>{meta.label}</span>
                    {log.candidate_name && <span className="text-xs text-gray-500">{log.candidate_name}</span>}
                  </div>
                  <p className="text-sm text-gray-700 mt-0.5">{buildDescription(log)}</p>
                  <div className="text-xs text-gray-400 mt-1 flex items-center gap-3">
                    <span><Clock size={10} className="inline mr-1" />{timeAgo(log.created_at)}</span>
                    <span>{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                </div>
                {log.entry_id && (
                  <button onClick={() => router.push(`/entry-list?open=${log.entry_id}`)}
                    className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 text-xs text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50">
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
