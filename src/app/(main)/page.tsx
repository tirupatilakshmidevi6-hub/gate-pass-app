'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Users, CheckCircle, Clock, XCircle, CalendarDays,
  ChevronRight, UserPlus,
} from 'lucide-react';

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

function fmtTime(iso: string) {
  const d = new Date(iso);
  const hh = d.getHours(), mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh % 12 || 12}:${mm} ${hh < 12 ? 'AM' : 'PM'}`;
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

// ─── Stat card ────────────────────────────────────────────────────────────────

// Soft pastel icon circles, one tone per stat.
const TONES = {
  violet: 'bg-violet-100 text-violet-600',
  green:  'bg-emerald-100 text-emerald-600',
  amber:  'bg-amber-100 text-amber-600',
  rose:   'bg-rose-100 text-rose-500',
} as const;

function StatCard({ label, value, icon, tone }: { label: string; value: number; icon: React.ReactNode; tone: keyof typeof TONES }) {
  const [display, setDisplay] = useState(0);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (reduced) { setDisplay(value); return; }
    const duration = 600;
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
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <div className="stat-card bg-white rounded-lg border border-gray-200 px-4 py-3.5 flex items-center gap-3.5 cursor-default select-none">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${TONES[tone]}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs text-gray-500">{label}</div>
        <div className="mt-0.5 text-xl font-semibold text-gray-900 tabular-nums leading-none">{display}</div>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="page-container space-y-4">
      <div className="flex justify-end"><div className="skeleton h-8 w-52 rounded-lg" /></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 px-4 py-3.5 space-y-2.5">
            <div className="skeleton h-3 w-20 rounded" />
            <div className="skeleton h-6 w-10 rounded" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex justify-between">
          <div className="skeleton h-4 w-32 rounded" />
          <div className="skeleton h-4 w-14 rounded" />
        </div>
        <div className="p-4 space-y-3.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3" style={{ opacity: 1 - i * 0.12 }}>
              <div className="skeleton w-7 h-7 rounded-full" />
              <div className="skeleton h-3.5 flex-1 rounded" />
              <div className="skeleton h-5 w-16 rounded-full" />
            </div>
          ))}
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
  const [page,     setPage]     = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then((r) => r.json()),
      fetch('/api/entries').then((r) => r.json()),
    ]).then(([user, data]) => {
      setUserRole(user.role ?? null);
      setEntries(Array.isArray(data) ? data : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { setPage(1); }, [date, pageSize]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const filtered = useMemo(() => entries.filter((e) => e.reporting_date === date), [entries, date]);

  const total    = filtered.length;
  const approved = filtered.filter((e) => e.status === 'Approved').length;
  const pending  = filtered.filter((e) => e.status === 'Pending Approval').length;
  const rejected = filtered.filter((e) => e.status === 'Rejected').length;

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated  = filtered.slice((page - 1) * pageSize, page * pageSize);
  const isToday    = date === today;

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="page-container space-y-4">

      {/* ── Date controls ── */}
      <div className="flex items-center justify-end gap-2">
        <div className="relative">
          <CalendarDays size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-gray-200 rounded-lg pl-9 pr-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            style={{ minHeight: 36 }}
          />
        </div>
        <button
          onClick={() => setDate(today)}
          disabled={isToday}
          className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-default transition-colors"
          style={{ minHeight: 36 }}
        >
          Today
        </button>
      </div>

      {/* ── Stat cards ── */}
      <div className="stagger grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total entries"    value={total}    tone="violet" icon={<Users size={16} />} />
        <StatCard label="Approved"         value={approved} tone="green"  icon={<CheckCircle size={16} />} />
        <StatCard label="Pending approval" value={pending}  tone="amber"  icon={<Clock size={16} />} />
        <StatCard label="Rejected"         value={rejected} tone="rose"   icon={<XCircle size={16} />} />
      </div>

      {/* ── Entries table ── */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden animate-fade-in-up" style={{ animationDelay: '120ms' }}>
        <div className="px-4 py-3 flex items-center justify-between gap-3 border-b border-gray-100">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-sm font-semibold text-gray-900 truncate">
              {isToday ? "Today's entries" : `Entries on ${date}`}
            </h2>
            <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0">
              {filtered.length}
            </span>
          </div>
          <Link
            href="/entry-list"
            className="flex items-center gap-1 text-xs text-blue-600 font-medium hover:text-blue-800 transition-colors flex-shrink-0"
          >
            View all <ChevronRight size={13} />
          </Link>
        </div>

        <div className="overflow-x-auto touch-scroll-x">
          <table className="w-full text-sm" style={{ minWidth: 600 }}>
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['#', 'Visitor', 'Role', 'Purpose', 'Building', 'POC', 'Time', 'Status'].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center">
                    <p className="text-sm text-gray-500">No entries for this date.</p>
                    {userRole === 'admin' && (
                      <Link
                        href="/create-gate-pass"
                        className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        <UserPlus size={13} /> Create a gate pass
                      </Link>
                    )}
                  </td>
                </tr>
              ) : paginated.map((e, idx) => (
                <tr key={e.id} className="trow border-b border-gray-200 last:border-b-0">
                  <td className="px-4 py-2.5 text-gray-400 text-xs">{(page - 1) * pageSize + idx + 1}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center flex-shrink-0 font-medium text-[11px]">
                        {getInitials(e.name)}
                      </div>
                      <span className="font-medium text-gray-900 whitespace-nowrap">{e.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap text-xs">{e.role ?? '—'}</td>
                  <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap text-xs">{e.purpose}</td>
                  <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap text-xs">{e.building_name}</td>
                  <td className="px-4 py-2.5 text-gray-600 text-xs">{e.poc_name}</td>
                  <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap text-xs">{fmtTime(e.created_at)}</td>
                  <td className="px-4 py-2.5"><StatusBadge status={e.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <PaginationBar
          page={page} totalPages={totalPages} total={filtered.length}
          pageSize={pageSize} onPage={setPage} onPageSize={setPageSize}
        />
      </div>
    </div>
  );
}
