'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Users, CheckCircle, Clock, XCircle, CalendarDays,
  ChevronRight, UserPlus, Upload, TrendingUp, TrendingDown, Minus,
  ArrowRight, LayoutDashboard,
} from 'lucide-react';
import { getRoleStyle } from '@/lib/constants';

// ─── Types ────────────────────────────────────────────────────────────────────

type EntryRow = {
  id: string; name: string; email: string | null; mobile_number: string | null;
  role: string | null; purpose: string; reporting_date: string; poc_name: string;
  building_name: string; status: string; pass_id: string | null;
  photo_url: string | null; created_at: string; created_by: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  '#3B82F6','#8B5CF6','#10B981','#F59E0B',
  '#EC4899','#0EA5E9','#EF4444','#6366F1',
];
function avatarColor(name: string): string {
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

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

// ─── Pagination ───────────────────────────────────────────────────────────────

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
    <div className="px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3" style={{ borderTop: '1px solid #F3F4F6' }}>
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-400">
          {from}–{to} of {total} entries
        </span>
        <select
          value={pageSize}
          onChange={(e) => { onPageSize(Number(e.target.value)); onPage(1); }}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {[5, 10, 25, 50].map((n) => <option key={n} value={n}>{n} / page</option>)}
        </select>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          {([
            { label: '«', action: () => onPage(1),         disabled: page === 1 },
            { label: '‹', action: () => onPage(page - 1),  disabled: page === 1 },
          ] as const).map(({ label, action, disabled }) => (
            <button key={label} onClick={action} disabled={disabled}
              className="w-7 h-7 rounded-lg border border-gray-200 text-gray-500 text-xs hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors">
              {label}
            </button>
          ))}
          {nums.map((p, i) =>
            p === '...'
              ? <span key={`d${i}`} className="w-7 h-7 flex items-center justify-center text-gray-400 text-xs">…</span>
              : <button key={p} onClick={() => onPage(p as number)}
                  className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${p === page ? 'bg-blue-600 text-white shadow-sm' : 'border border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                  {p}
                </button>
          )}
          {([
            { label: '›', action: () => onPage(page + 1),       disabled: page === totalPages },
            { label: '»', action: () => onPage(totalPages),     disabled: page === totalPages },
          ] as const).map(({ label, action, disabled }) => (
            <button key={label} onClick={action} disabled={disabled}
              className="w-7 h-7 rounded-lg border border-gray-200 text-gray-500 text-xs hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors">
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { dot: string; cls: string }> = {
  'Pending Form':     { dot: 'bg-gray-400',   cls: 'badge-pending-form'     },
  'Pending Approval': { dot: 'bg-orange-500', cls: 'badge-pending-approval' },
  'Approved':         { dot: 'bg-green-500',  cls: 'badge-approved'         },
  'Rejected':         { dot: 'bg-red-500',    cls: 'badge-rejected'         },
  'Expired':          { dot: 'bg-gray-500',   cls: 'badge-expired'          },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? { dot: 'bg-gray-400', cls: 'badge-pending-form' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {status}
    </span>
  );
}

// ─── Line Chart ───────────────────────────────────────────────────────────────

function LineChart({ data }: { data: number[] }) {
  const max  = Math.max(...data, 4);
  const W = 280, H = 100;
  const pL = 24, pR = 8, pT = 8, pB = 18;
  const cW = W - pL - pR, cH = H - pT - pB;

  const pts = data.map((v, i) => ({
    x: pL + (i / (data.length - 1)) * cW,
    y: pT + cH - (v / max) * cH,
  }));

  let linePath = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1], curr = pts[i];
    const cpx  = (prev.x + curr.x) / 2;
    linePath += ` C${cpx.toFixed(1)},${prev.y.toFixed(1)} ${cpx.toFixed(1)},${curr.y.toFixed(1)} ${curr.x.toFixed(1)},${curr.y.toFixed(1)}`;
  }
  const fillPath = `${linePath} L${pts[pts.length - 1].x},${pT + cH} L${pts[0].x},${pT + cH} Z`;

  const xMarks = [
    { label: '12AM', h: 0 }, { label: '6AM', h: 6 },
    { label: '12PM', h: 12 }, { label: '6PM', h: 18 }, { label: '12AM', h: 23 },
  ];

  const peakIdx = data.indexOf(Math.max(...data));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 100 }}>
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#146EF5" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#146EF5" stopOpacity="0"    />
        </linearGradient>
      </defs>
      {/* Grid lines */}
      {[0, 0.33, 0.66, 1].map((v, i) => {
        const y = pT + cH * (1 - v);
        return <line key={i} x1={pL} y1={y} x2={pL + cW} y2={y} stroke="#F3F4F6" strokeWidth="1" />;
      })}
      <path d={fillPath} fill="url(#chartGrad)" />
      <path d={linePath} fill="none" stroke="#146EF5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {Math.max(...data) > 0 && (
        <circle cx={pts[peakIdx].x} cy={pts[peakIdx].y} r="4" fill="#146EF5" stroke="white" strokeWidth="2" />
      )}
      {xMarks.map(({ label, h }) => (
        <text key={label + h}
          x={pL + (h / 23) * cW} y={H - 3}
          fontSize="7" fill="#9CA3AF" textAnchor="middle">{label}</text>
      ))}
    </svg>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

type Variant = 'blue' | 'green' | 'amber' | 'red';

const VARIANT_CFG: Record<Variant, { icon: string; accentCls: string; iconBg: string; iconColor: string }> = {
  blue:  { icon: '', accentCls: 'stat-accent-blue',  iconBg: 'bg-blue-50',   iconColor: 'text-blue-600'   },
  green: { icon: '', accentCls: 'stat-accent-green', iconBg: 'bg-green-50',  iconColor: 'text-green-600'  },
  amber: { icon: '', accentCls: 'stat-accent-amber', iconBg: 'bg-amber-50',  iconColor: 'text-amber-600'  },
  red:   { icon: '', accentCls: 'stat-accent-red',   iconBg: 'bg-red-50',    iconColor: 'text-red-600'    },
};

function StatCard({
  label, value, change, iconEl, variant,
}: {
  label:   string;
  value:   number;
  change:  { pct: number; up: boolean | null };
  iconEl:  React.ReactNode;
  variant: Variant;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (reduced) { setDisplay(value); return; }
    const duration = 700;
    const start    = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      const p    = Math.min((now - start) / duration, 1);
      const ease = 1 - (1 - p) ** 3;
      setDisplay(Math.round(value * ease));
      if (p < 1) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  const { pct, up } = change;
  const cfg         = VARIANT_CFG[variant];
  const TrendIcon   = up === true ? TrendingUp : up === false ? TrendingDown : Minus;
  const trendCls    = up === true ? 'text-green-600 bg-green-50' : up === false ? 'text-red-500 bg-red-50' : 'text-gray-400 bg-gray-50';
  const trendLabel  = up === true ? `+${pct}%` : up === false ? `-${pct}%` : 'No change';

  return (
    <div className={`stat-card stat-card-v2 ${cfg.accentCls} bg-white rounded-xl sm:rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-sm cursor-default select-none`}>
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.iconBg}`}>
          <span className={cfg.iconColor}>{iconEl}</span>
        </div>
        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full ${trendCls}`}>
          <TrendIcon size={10} />
          {trendLabel}
        </span>
      </div>
      <div className="text-2xl sm:text-3xl font-bold text-gray-900 tabular-nums leading-tight">{display}</div>
      <div className="text-xs text-gray-500 mt-1 leading-tight">{label}</div>
      <div className="text-[11px] text-gray-400 mt-1.5">vs yesterday</div>
    </div>
  );
}

// ─── Summary card ─────────────────────────────────────────────────────────────

function SummaryCard({
  icon, label, value, bg, color,
}: {
  icon: React.ReactNode; label: string; value: number; bg: string; color: string;
}) {
  return (
    <div className="summary-card bg-white rounded-xl border border-gray-200 p-3 sm:p-4 shadow-sm flex items-center gap-3">
      <div className={`w-9 h-9 sm:w-10 sm:h-10 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
        <span className={color}>{icon}</span>
      </div>
      <div className="min-w-0">
        <div className="text-xl sm:text-2xl font-bold text-gray-900 tabular-nums">{value}</div>
        <div className="text-[11px] text-gray-500 leading-tight truncate">{label}</div>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="page-container space-y-5">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-2">
          <div className="skeleton h-7 w-56 rounded-lg" />
          <div className="skeleton h-4 w-48 rounded" />
        </div>
        <div className="skeleton h-9 w-44 rounded-xl" />
      </div>
      {/* Stat cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex items-start justify-between">
              <div className="skeleton w-11 h-11 rounded-xl" />
              <div className="skeleton h-6 w-14 rounded-full" />
            </div>
            <div className="skeleton h-8 w-12 rounded" />
            <div className="skeleton h-3 w-28 rounded" />
          </div>
        ))}
      </div>
      {/* Main content skeleton */}
      <div className="flex flex-col xl:flex-row gap-5">
        <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex justify-between">
            <div className="skeleton h-5 w-40 rounded" />
            <div className="skeleton h-8 w-20 rounded-lg" />
          </div>
          <div className="p-5 space-y-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3" style={{ opacity: 1 - i * 0.1 }}>
                <div className="skeleton w-8 h-8 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton h-4 w-32 rounded" />
                  <div className="skeleton h-3 w-20 rounded" />
                </div>
                <div className="skeleton h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>
        <div className="w-full xl:w-68 xl:flex-shrink-0 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <div className="skeleton h-4 w-32 mb-4 rounded" />
            <div className="skeleton w-full rounded-lg" style={{ height: 100 }} />
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3">
            <div className="skeleton h-4 w-28 rounded" />
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="skeleton w-6 h-6 rounded-full" />
                <div className="skeleton h-3 flex-1 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const today = toISO(new Date());

  const [date,     setDate]     = useState(today);
  const [entries,  setEntries]  = useState<EntryRow[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [userRole, setUserRole] = useState<'admin' | 'ta' | 'facilities' | null>(null);
  const [userName, setUserName] = useState('Admin');
  const [page,     setPage]     = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then((r) => r.json()),
      fetch('/api/entries').then((r) => r.json()),
    ]).then(([user, data]) => {
      setUserRole(user.role ?? null);
      setUserName(user.name ?? 'Admin');
      setEntries(Array.isArray(data) ? data : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { setPage(1); }, [date, pageSize]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const filtered = useMemo(() => entries.filter((e) => e.reporting_date === date), [entries, date]);

  const yesterday = useMemo(() => {
    const y = new Date(date); y.setDate(y.getDate() - 1);
    const s = toISO(y);
    return entries.filter((e) => e.reporting_date === s);
  }, [entries, date]);

  const total    = filtered.length;
  const approved = filtered.filter((e) => e.status === 'Approved').length;
  const pending  = filtered.filter((e) => e.status === 'Pending Approval').length;
  const rejected = filtered.filter((e) => e.status === 'Rejected').length;

  const yTotal    = yesterday.length;
  const yApproved = yesterday.filter((e) => e.status === 'Approved').length;
  const yPending  = yesterday.filter((e) => e.status === 'Pending Approval').length;
  const yRejected = yesterday.filter((e) => e.status === 'Rejected').length;

  const thisWeek = useMemo(() => {
    const now = new Date(); const sow = new Date(now);
    sow.setDate(now.getDate() - now.getDay()); sow.setHours(0, 0, 0, 0);
    return entries.filter((e) => new Date(e.reporting_date) >= sow).length;
  }, [entries]);

  const thisMonth = useMemo(() => {
    const now = new Date();
    const som = new Date(now.getFullYear(), now.getMonth(), 1);
    return entries.filter((e) => new Date(e.reporting_date) >= som).length;
  }, [entries]);

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

  const recentApproved = useMemo(() =>
    entries.filter((e) => e.status === 'Approved').slice(0, 5),
    [entries],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated  = filtered.slice((page - 1) * pageSize, page * pageSize);

  const hour      = new Date().getHours();
  const greeting  = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = userName.split(' ')[0];
  const isToday   = date === today;

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="page-container space-y-5">

      {/* ── Header ── */}
      <div
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-fade-in-up"
        style={{ animationDelay: '0ms' }}
      >
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <LayoutDashboard size={15} className="text-gray-400" />
            <span className="text-xs text-gray-400 font-medium">Overview</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
            {greeting}, {firstName}!
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isToday
              ? "Here's your gate security overview for today."
              : `Showing gate data for ${formatDateLabel(date)}.`}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="relative">
            <CalendarDays size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
            />
          </div>
          <button
            onClick={() => setDate(today)}
            className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all flex-shrink-0 ${
              isToday
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50 bg-white'
            }`}
          >
            Today
          </button>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 animate-fade-in-up"
        style={{ animationDelay: '60ms' }}
      >
        <StatCard
          label="Total Entries" value={total}
          change={pctChange(total, yTotal)} variant="blue"
          iconEl={<Users size={20} />}
        />
        <StatCard
          label="Approved" value={approved}
          change={pctChange(approved, yApproved)} variant="green"
          iconEl={<CheckCircle size={20} />}
        />
        <StatCard
          label="Pending Approval" value={pending}
          change={pctChange(pending, yPending)} variant="amber"
          iconEl={<Clock size={20} />}
        />
        <StatCard
          label="Rejected" value={rejected}
          change={pctChange(rejected, yRejected)} variant="red"
          iconEl={<XCircle size={20} />}
        />
      </div>

      {/* ── Main layout ── */}
      <div className="flex flex-col xl:flex-row gap-5 items-start">

        {/* ── Left: table + summary ── */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* Entries table */}
          <div
            className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm animate-fade-in-up"
            style={{ animationDelay: '120ms' }}
          >
            {/* Table header */}
            <div className="px-5 py-4 flex items-center justify-between gap-3" style={{ borderBottom: '1px solid #F3F4F6' }}>
              <div className="flex items-center gap-2.5 min-w-0">
                <h2 className="text-sm font-bold text-gray-900 truncate">
                  {isToday ? 'Today\'s Entries' : `Entries — ${date}`}
                </h2>
                <span className="bg-gray-100 text-gray-600 text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                  {filtered.length}
                </span>
              </div>
              <Link
                href="/entry-list"
                className="flex items-center gap-1 text-xs text-blue-600 font-semibold hover:text-blue-800 transition-colors flex-shrink-0"
              >
                View all <ChevronRight size={13} />
              </Link>
            </div>

            {/* Table */}
            <div className="overflow-x-auto touch-scroll-x">
              <table className="w-full text-sm" style={{ minWidth: 600 }}>
                <thead>
                  <tr style={{ background: '#FAFBFC', borderBottom: '1px solid #F3F4F6' }}>
                    {['#', 'Visitor', 'Role', 'Purpose', 'Building', 'POC', 'Time', 'Status'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center gap-3 max-w-xs mx-auto">
                          <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center">
                            <Users size={22} className="text-gray-400" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-600">No entries for this date</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {isToday ? 'No gate passes have been created today.' : 'No gate passes for the selected date.'}
                            </p>
                          </div>
                          {userRole === 'admin' && (
                            <Link
                              href="/create-gate-pass"
                              className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                            >
                              <UserPlus size={13} /> Create a gate pass
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : paginated.map((e, idx) => {
                    const rs  = getRoleStyle(e.role ?? '');
                    const col = avatarColor(e.name);
                    return (
                      <tr key={e.id} className="trow border-b border-gray-50 last:border-0">
                        <td className="px-4 py-3 text-gray-400 text-xs font-medium">
                          {(page - 1) * pageSize + idx + 1}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-xs ring-2 ring-white"
                              style={{ backgroundColor: col }}
                            >
                              {getInitials(e.name)}
                            </div>
                            <span className="font-semibold text-gray-900 whitespace-nowrap text-[13px]">{e.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {e.role && (
                            <span
                              style={{ background: rs.bg, color: rs.text, border: `1px solid ${rs.border}` }}
                              className="px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap"
                            >
                              {e.role}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{e.purpose}</td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{e.building_name}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{e.poc_name}</td>
                        <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">
                          {fmtTime(e.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={e.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <PaginationBar
              page={page} totalPages={totalPages} total={filtered.length}
              pageSize={pageSize} onPage={setPage} onPageSize={setPageSize}
            />
          </div>

          {/* Summary row */}
          <div className="animate-fade-in-up" style={{ animationDelay: '180ms' }}>
            <h2 className="text-sm font-bold text-gray-900 mb-3">Entry Summary</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <SummaryCard
                icon={<CalendarDays size={18} />} label="Today"
                value={total} bg="bg-blue-50" color="text-blue-500"
              />
              <SummaryCard
                icon={<CheckCircle size={18} />} label="This Week"
                value={thisWeek} bg="bg-green-50" color="text-green-500"
              />
              <SummaryCard
                icon={<Clock size={18} />} label="This Month"
                value={thisMonth} bg="bg-amber-50" color="text-amber-500"
              />
              <SummaryCard
                icon={<Users size={18} />} label="All Time"
                value={entries.length} bg="bg-purple-50" color="text-purple-500"
              />
            </div>
          </div>
        </div>

        {/* ── Right panel ── */}
        <div
          className="w-full xl:w-64 xl:flex-shrink-0 space-y-4 animate-fade-in-up"
          style={{ animationDelay: '90ms' }}
        >

          {/* Chart */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[13px] font-bold text-gray-900">Today&apos;s Activity</h3>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-[10px] text-gray-400 font-medium">Entries</span>
              </div>
            </div>
            <LineChart data={hourlyData} />
            {Math.max(...hourlyData) === 0 && (
              <p className="text-xs text-gray-400 text-center mt-2">No activity yet today</p>
            )}
          </div>

          {/* Recent approved */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[13px] font-bold text-gray-900">Recent Approvals</h3>
              <Link href="/entry-list" className="text-[11px] text-blue-600 font-semibold hover:text-blue-800 flex items-center gap-0.5">
                See all <ArrowRight size={10} />
              </Link>
            </div>
            {recentApproved.length === 0 ? (
              <div className="py-4 text-center">
                <CheckCircle size={22} className="text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-400">No approved entries yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentApproved.map((e) => (
                  <div key={e.id} className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-[10px]"
                      style={{ backgroundColor: avatarColor(e.name) }}>
                      {getInitials(e.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">{e.name}</p>
                      <p className="text-[10px] text-gray-400 truncate">{e.building_name}</p>
                    </div>
                    <span className="text-[10px] text-green-600 font-semibold bg-green-50 px-1.5 py-0.5 rounded-full flex-shrink-0">
                      ✓
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick actions (admin only) */}
          {userRole === 'admin' && (
            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
              <h3 className="text-[13px] font-bold text-gray-900 mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <Link
                  href="/create-gate-pass"
                  className="flex items-center gap-3 p-3 rounded-xl border border-blue-100 bg-blue-50 hover:bg-blue-100 hover:border-blue-200 transition-all group"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-700 transition-colors">
                    <UserPlus size={14} className="text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-blue-900">Single Entry</div>
                    <div className="text-[10px] text-blue-600">Create a gate pass</div>
                  </div>
                </Link>
                <Link
                  href="/create-gate-pass"
                  className="flex items-center gap-3 p-3 rounded-xl border border-purple-100 bg-purple-50 hover:bg-purple-100 hover:border-purple-200 transition-all group"
                >
                  <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-700 transition-colors">
                    <Upload size={14} className="text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-purple-900">Bulk Upload</div>
                    <div className="text-[10px] text-purple-600">Import from CSV</div>
                  </div>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
