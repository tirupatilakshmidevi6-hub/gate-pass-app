'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Users, CheckCircle, Clock, XCircle, CalendarDays,
  MoreVertical, ChevronRight, UserPlus, Upload,
} from 'lucide-react';

// ─── Pagination helpers ───────────────────────────────────────────────────────

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total];
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
  return [1, '...', current - 1, current, current + 1, '...', total];
}

function PaginationBar({
  page, totalPages, total, pageSize, onPage, onPageSize,
}: {
  page: number; totalPages: number; total: number; pageSize: number;
  onPage: (p: number) => void; onPageSize: (ps: number) => void;
}) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to   = Math.min(page * pageSize, total);
  const nums = getPageNumbers(page, totalPages);

  return (
    <div className="px-4 sm:px-6 py-3 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500">
          Showing {from} to {to} of {total} entries
        </span>
        <select
          value={pageSize}
          onChange={(e) => { onPageSize(Number(e.target.value)); onPage(1); }}
          className="text-xs border border-gray-300 rounded-lg px-2 py-1 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {[5, 10, 25, 50].map((n) => <option key={n} value={n}>{n} per page</option>)}
        </select>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          {([
            { label: '«', action: () => onPage(1),              disabled: page === 1 },
            { label: '‹', action: () => onPage(page - 1),       disabled: page === 1 },
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
            { label: '›', action: () => onPage(page + 1),        disabled: page === totalPages },
            { label: '»', action: () => onPage(totalPages),      disabled: page === totalPages },
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
import { getRoleStyle } from '@/lib/constants';

// ─── Types ───────────────────────────────────────────────────────────────────

type EntryRow = {
  id: string;
  name: string;
  email: string | null;
  mobile_number: string | null;
  role: string | null;
  purpose: string;
  reporting_date: string;
  poc_name: string;
  building_name: string;
  status: string;
  pass_id: string | null;
  photo_url: string | null;
  created_at: string;
  created_by: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500',
  'bg-pink-500', 'bg-teal-500', 'bg-red-500', 'bg-indigo-500',
];

function avatarColor(name: string) {
  let h = 0;
  for (const c of name) h = ((h << 5) - h) + c.charCodeAt(0);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  const hh = d.getHours(), mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh % 12 || 12}:${mm} ${hh < 12 ? 'AM' : 'PM'}`;
}

function pctChange(curr: number, prev: number): { pct: number; up: boolean | null } {
  if (prev === 0 && curr === 0) return { pct: 0, up: null };
  if (prev === 0) return { pct: 100, up: true };
  const p = Math.round(((curr - prev) / prev) * 100);
  return { pct: Math.abs(p), up: p > 0 ? true : p < 0 ? false : null };
}

const STATUS_CLS: Record<string, string> = {
  'Pending Form':     'bg-gray-100 text-gray-600',
  'Pending Approval': 'bg-orange-100 text-orange-700',
  'Approved':         'bg-green-100 text-green-700',
  'Rejected':         'bg-red-100 text-red-700',
};

// ─── Line Chart ──────────────────────────────────────────────────────────────

function LineChart({ data }: { data: number[] }) {
  const max  = Math.max(...data, 6);
  const W = 280, H = 110;
  const pL = 28, pR = 8, pT = 10, pB = 22;
  const cW = W - pL - pR, cH = H - pT - pB;

  const pts = data.map((v, i) => ({
    x: pL + (i / (data.length - 1)) * cW,
    y: pT + cH - (v / max) * cH,
  }));

  // Smooth cubic bezier path
  let linePath = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1], curr = pts[i];
    const cpx  = (prev.x + curr.x) / 2;
    linePath += ` C${cpx.toFixed(1)},${prev.y.toFixed(1)} ${cpx.toFixed(1)},${curr.y.toFixed(1)} ${curr.x.toFixed(1)},${curr.y.toFixed(1)}`;
  }
  const fillPath = `${linePath} L${pts[pts.length - 1].x},${pT + cH} L${pts[0].x},${pT + cH} Z`;

  const yVals  = [0, Math.ceil(max / 3), Math.ceil((2 * max) / 3), max];
  const xMarks = [
    { label: '12AM', h: 0 }, { label: '6AM', h: 6 },
    { label: '12PM', h: 12 }, { label: '6PM', h: 18 }, { label: '12AM', h: 23 },
  ];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 120 }}>
      <defs>
        <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#3b82f6" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Grid + y-labels */}
      {yVals.map((v, i) => {
        const y = pT + cH - (v / max) * cH;
        return (
          <g key={i}>
            <line x1={pL} y1={y} x2={pL + cW} y2={y} stroke="#f3f4f6" strokeWidth="1" />
            <text x={pL - 4} y={y + 3} fontSize="7.5" fill="#d1d5db" textAnchor="end">{v}</text>
          </g>
        );
      })}

      {/* Fill */}
      <path d={fillPath} fill="url(#cg)" />

      {/* Line */}
      <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" />

      {/* Peak dot */}
      {(() => {
        const maxV = Math.max(...data);
        if (!maxV) return null;
        const idx = data.lastIndexOf(maxV);
        return (
          <circle cx={pts[idx].x} cy={pts[idx].y} r="4.5"
            fill="#3b82f6" stroke="white" strokeWidth="2" />
        );
      })()}

      {/* X-axis labels */}
      {xMarks.map(({ label, h }) => (
        <text key={label + h}
          x={pL + (h / 23) * cW} y={H - 4}
          fontSize="7.5" fill="#9ca3af" textAnchor="middle">{label}</text>
      ))}
    </svg>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const today = toISO(new Date());

  const [date,     setDate]     = useState(today);
  const [entries,  setEntries]  = useState<EntryRow[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [userRole, setUserRole] = useState<'admin' | 'facilities' | null>(null);
  const [userName, setUserName] = useState('Admin');
  const [page,     setPage]     = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(r => r.json()),
      fetch('/api/entries').then(r => r.json()),
    ]).then(([user, data]) => {
      setUserRole(user.role ?? null);
      setUserName(user.name ?? 'Admin');
      setEntries(Array.isArray(data) ? data : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setPage(1); }, [date, pageSize]);

  // ── Filtered entries for selected date
  const filtered = useMemo(() =>
    entries.filter(e => e.reporting_date === date),
    [entries, date],
  );

  // ── Yesterday entries for % change
  const yesterday = useMemo(() => {
    const y = new Date(date);
    y.setDate(y.getDate() - 1);
    const yStr = toISO(y);
    return entries.filter(e => e.reporting_date === yStr);
  }, [entries, date]);

  const total    = filtered.length;
  const approved = filtered.filter(e => e.status === 'Approved').length;
  const pending  = filtered.filter(e => e.status === 'Pending Approval').length;
  const rejected = filtered.filter(e => e.status === 'Rejected').length;

  const yTotal    = yesterday.length;
  const yApproved = yesterday.filter(e => e.status === 'Approved').length;
  const yPending  = yesterday.filter(e => e.status === 'Pending Approval').length;
  const yRejected = yesterday.filter(e => e.status === 'Rejected').length;

  // ── Summary counts
  const thisWeek = useMemo(() => {
    const now = new Date(); const sow = new Date(now);
    sow.setDate(now.getDate() - now.getDay()); sow.setHours(0, 0, 0, 0);
    return entries.filter(e => new Date(e.reporting_date) >= sow).length;
  }, [entries]);

  const thisMonth = useMemo(() => {
    const now = new Date();
    const som = new Date(now.getFullYear(), now.getMonth(), 1);
    return entries.filter(e => new Date(e.reporting_date) >= som).length;
  }, [entries]);

  // ── Hourly chart data
  const hourlyData = useMemo(() => {
    const data = Array(24).fill(0);
    for (const e of entries) {
      if (e.reporting_date === date && e.created_at) {
        const h = new Date(e.created_at).getHours();
        if (h >= 0 && h < 24) data[h]++;
      }
    }
    return data;
  }, [entries, date]);

  // ── Recent approved entries
  const recentActivity = useMemo(() =>
    entries.filter(e => e.status === 'Approved').slice(0, 5),
    [entries],
  );

  // ── Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated  = filtered.slice((page - 1) * pageSize, page * pageSize);

  // ── Greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const isToday  = date === today;

  // ─── Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container space-y-4 sm:space-y-6">

      {/* ── Greeting + Date picker ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            {greeting}, {userName} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Gate entries {isToday ? 'today' : `on ${date}`}.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <CalendarDays size={15} className="text-gray-400 flex-shrink-0" />
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 min-w-0"
          />
          <button
            onClick={() => setDate(today)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors flex-shrink-0 ${
              isToday
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            Today
          </button>
        </div>
      </div>

      {/* ── Main layout: stack on mobile, side-by-side on xl+ ── */}
      <div className="flex flex-col xl:flex-row gap-5 items-start">

        {/* ── LEFT column ── */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* Stat cards — 2 col on mobile, 4 col on lg+ */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard
              label="Total Entries Today" value={total}
              change={pctChange(total, yTotal)}
              icon={<div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0"><Users size={22} className="text-blue-600" /></div>}
            />
            <StatCard
              label="Approved Today" value={approved}
              change={pctChange(approved, yApproved)}
              icon={<div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0"><CheckCircle size={22} className="text-green-600" /></div>}
            />
            <StatCard
              label="Pending Approval" value={pending}
              change={pctChange(pending, yPending)}
              icon={<div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0"><Clock size={22} className="text-orange-500" /></div>}
            />
            <StatCard
              label="Rejected Today" value={rejected}
              change={pctChange(rejected, yRejected)}
              icon={<div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0"><XCircle size={22} className="text-red-500" /></div>}
            />
          </div>

          {/* Entries table */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <h2 className="text-sm sm:text-base font-semibold text-gray-900 truncate">Entries for {isToday ? 'Today' : date}</h2>
                <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                  {filtered.length}
                </span>
              </div>
              <Link href="/entry-list"
                className="flex items-center gap-1 text-xs sm:text-sm text-blue-600 font-medium border border-blue-200 rounded-lg px-2.5 sm:px-3 py-1.5 hover:bg-blue-50 transition-colors flex-shrink-0">
                View All <ChevronRight size={13} />
              </Link>
            </div>

            <div className="overflow-x-auto touch-scroll-x">
              <table className="w-full text-sm" style={{ minWidth: 640 }}>
                <thead className="bg-gray-50">
                  <tr>
                    {['#', 'VISITOR', 'ROLE', 'PURPOSE', 'BUILDING', 'POC', 'TIME', 'STATUS', ''].map(h => (
                      <th key={h} className="text-left px-3 sm:px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-10 text-center text-gray-400 text-sm">
                        No entries for this date.{' '}
                        {userRole === 'admin' && (
                          <Link href="/new-entry" className="text-blue-600 hover:underline">Add one</Link>
                        )}
                      </td>
                    </tr>
                  ) : paginated.map((e, idx) => {
                    const rs  = getRoleStyle(e.role ?? '');
                    const sc  = STATUS_CLS[e.status] ?? 'bg-gray-100 text-gray-600';
                    const col = avatarColor(e.name);
                    return (
                      <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-3 sm:px-4 py-3 text-gray-400 text-xs font-medium">
                          {(page - 1) * pageSize + idx + 1}
                        </td>
                        <td className="px-3 sm:px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full ${col} flex items-center justify-center flex-shrink-0`}>
                              <span className="text-xs font-bold text-white">{getInitials(e.name)}</span>
                            </div>
                            <span className="font-medium text-gray-900 whitespace-nowrap text-xs sm:text-sm">{e.name}</span>
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 py-3">
                          {e.role && (
                            <span style={{ background: rs.bg, color: rs.text, border: `1px solid ${rs.border}` }}
                              className="px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap">
                              {e.role}
                            </span>
                          )}
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-gray-600 whitespace-nowrap text-xs">{e.purpose}</td>
                        <td className="px-3 sm:px-4 py-3 text-gray-600 whitespace-nowrap text-xs">{e.building_name}</td>
                        <td className="px-3 sm:px-4 py-3 text-gray-600 text-xs">{e.poc_name}</td>
                        <td className="px-3 sm:px-4 py-3 text-gray-600 whitespace-nowrap text-xs">
                          <div className="flex items-center gap-1">
                            <Clock size={10} className="text-gray-400" />
                            {fmtTime(e.created_at)}
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${sc}`}>{e.status}</span>
                        </td>
                        <td className="px-3 sm:px-4 py-3">
                          <button className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                            <MoreVertical size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <PaginationBar
              page={page}
              totalPages={totalPages}
              total={filtered.length}
              pageSize={pageSize}
              onPage={setPage}
              onPageSize={setPageSize}
            />
          </div>

          {/* ── Entry Summary ── */}
          <div>
            <h2 className="text-sm sm:text-base font-semibold text-gray-900 mb-3">Entry Summary</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <SummaryCard
                icon={<CalendarDays size={20} className="text-blue-500" />}
                label="Today" value={total} bg="bg-blue-50"
              />
              <SummaryCard
                icon={<CheckCircle size={20} className="text-green-500" />}
                label="This Week" value={thisWeek} bg="bg-green-50"
              />
              <SummaryCard
                icon={<Clock size={20} className="text-orange-500" />}
                label="This Month" value={thisMonth} bg="bg-orange-50"
              />
              <SummaryCard
                icon={<Users size={20} className="text-purple-500" />}
                label="Total Visitors" value={entries.length} bg="bg-purple-50"
              />
            </div>
          </div>
        </div>

        {/* ── RIGHT panel — full width on mobile, fixed on xl+ ── */}
        <div className="w-full xl:w-72 xl:flex-shrink-0 space-y-4">

          {/* Today's Overview chart */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Today&apos;s Overview</h3>
            <LineChart data={hourlyData} />
            <div className="mt-3 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-xs text-gray-500">Entries created</span>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Recent Activity</h3>
            {recentActivity.length === 0 ? (
              <p className="text-xs text-gray-400">No recent approvals.</p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map(e => (
                  <div key={e.id} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle size={12} className="text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-600 leading-snug">
                        Entry approved for{' '}
                        <span className="font-semibold text-gray-900">{e.name}</span>
                      </p>
                    </div>
                    <span className="text-[10px] text-gray-400 flex-shrink-0 whitespace-nowrap">
                      {fmtTime(e.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions — admin only */}
          {userRole === 'admin' && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                <Link href="/new-entry"
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-blue-200 hover:bg-blue-50 hover:border-blue-400 transition-colors group">
                  <div className="w-8 h-8 rounded-full bg-blue-100 group-hover:bg-blue-200 flex items-center justify-center transition-colors">
                    <UserPlus size={16} className="text-blue-600" />
                  </div>
                  <span className="text-xs font-semibold text-blue-600">New Entry</span>
                </Link>
                <Link href="/bulk-upload"
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-purple-200 hover:bg-purple-50 hover:border-purple-400 transition-colors group">
                  <div className="w-8 h-8 rounded-full bg-purple-100 group-hover:bg-purple-200 flex items-center justify-center transition-colors">
                    <Upload size={16} className="text-purple-600" />
                  </div>
                  <span className="text-xs font-semibold text-purple-600">Bulk Upload</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label, value, change, icon,
}: {
  label: string;
  value: number;
  change: { pct: number; up: boolean | null };
  icon: React.ReactNode;
}) {
  const { pct, up } = change;
  const changeColor = up === true ? 'text-green-600' : up === false ? 'text-red-500' : 'text-gray-400';
  const arrow       = up === true ? '↑' : up === false ? '↓' : '—';

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 p-3 sm:p-5 shadow-sm">
      <div className="flex items-center gap-2 sm:gap-4 mb-2 sm:mb-4">
        {/* Scale icon down on mobile */}
        <div className="[&>div]:w-9 [&>div]:h-9 sm:[&>div]:w-12 sm:[&>div]:h-12 [&_svg]:!w-4 [&_svg]:!h-4 sm:[&_svg]:!w-[22px] sm:[&_svg]:!h-[22px]">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">{value}</div>
          <div className="text-[11px] sm:text-xs text-gray-500 mt-0.5 leading-tight">{label}</div>
        </div>
      </div>
      <div className={`flex items-center gap-1 text-[11px] sm:text-xs font-medium ${changeColor}`}>
        <span>{arrow}</span>
        <span>{pct}% vs yesterday</span>
      </div>
    </div>
  );
}

function SummaryCard({
  icon, label, value, bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  bg: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 shadow-sm flex items-center gap-2.5 sm:gap-3">
      <div className={`w-9 h-9 sm:w-10 sm:h-10 ${bg} rounded-xl flex items-center justify-center flex-shrink-0 [&_svg]:w-4 [&_svg]:h-4 sm:[&_svg]:w-5 sm:[&_svg]:h-5`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-lg sm:text-xl font-bold text-gray-900">{value}</div>
        <div className="text-[11px] sm:text-xs text-gray-500 leading-tight truncate">{label}</div>
      </div>
    </div>
  );
}
