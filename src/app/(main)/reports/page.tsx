'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { CalendarDays, Filter, Download, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { getRoleStyle } from '@/lib/constants';

const PAGE_SIZE = 8;
const CHART_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#14b8a6', '#f97316', '#ef4444', '#64748b'];

const STATUS_PALETTE: Record<string, { bg: string; text: string; dot: string }> = {
  'Approved':         { bg: '#dcfce7', text: '#15803d', dot: '#22c55e' },
  'Pending Form':     { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6' },
  'Pending Approval': { bg: '#fff7ed', text: '#c2410c', dot: '#f97316' },
  'Rejected':         { bg: '#fee2e2', text: '#dc2626', dot: '#ef4444' },
};

type EntryRow = {
  id: string; name: string; role: string | null; purpose: string;
  reporting_date: string; building_name: string; status: string; created_at: string;
};

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function fmtDisplay(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${d}-${m}-${y}`;
}
function fmtTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch { return '—'; }
}
function countBy<T>(arr: T[], key: keyof T): [string, number][] {
  const map: Record<string, number> = {};
  for (const item of arr) {
    const k = String(item[key] ?? 'Unknown');
    map[k] = (map[k] ?? 0) + 1;
  }
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}

// ── SVG Donut Chart ───────────────────────────────────────────────────────────
function DonutChart({ data, colorFn, size = 126 }: {
  data: [string, number][];
  colorFn: (label: string, idx: number) => string;
  size?: number;
}) {
  const r  = (size - 22) / 2;
  const cx = size / 2, cy = size / 2;
  const C  = 2 * Math.PI * r;
  const total = data.reduce((s, [, v]) => s + v, 0);
  let cumulative = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={13} />
      {total > 0 && data.map(([label, v], i) => {
        const portion = v / total;
        const dash    = portion * C;
        const offset  = -(cumulative * C);
        cumulative   += portion;
        return (
          <circle key={i} cx={cx} cy={cy} r={r}
            fill="none"
            stroke={colorFn(label, i)}
            strokeWidth={13}
            strokeLinecap="butt"
            strokeDasharray={`${dash - 1.5} ${C - dash + 1.5}`}
            strokeDashoffset={offset}
            style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px`, transition: 'stroke-dasharray 0.4s' }}
          />
        );
      })}
      <text x={cx} y={cy - 5} textAnchor="middle" fontSize="17" fontWeight="800" fill="#0f172a">{total}</text>
      <text x={cx} y={cy + 9} textAnchor="middle" fontSize="7.5" fill="#94a3b8" fontWeight="600" letterSpacing="1.8">TOTAL</text>
    </svg>
  );
}

// ── Sparkline wave ────────────────────────────────────────────────────────────
const WAVES: Record<string, string> = {
  blue:   'M0,18 L13,14 L26,9  L39,12 L52,6  L65,10 L78,5  L90,8',
  green:  'M0,15 L13,17 L26,11 L39,8  L52,13 L65,7  L78,10 L90,6',
  orange: 'M0,11 L13,14 L26,9  L39,13 L52,7  L65,12 L78,8  L90,11',
  red:    'M0,16 L13,13 L26,16 L39,11 L52,14 L65,9  L78,13 L90,9',
};
function Sparkline({ variant, color }: { variant: keyof typeof WAVES; color: string }) {
  return (
    <svg width="90" height="26" viewBox="0 0 90 26" fill="none">
      <path d={WAVES[variant]} stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
    </svg>
  );
}

// ── KPI Icon SVGs ─────────────────────────────────────────────────────────────
const KpiIcons = {
  total:    (c: string) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
  approved: (c: string) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  pending:  (c: string) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  rejected: (c: string) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
};

function EmptyChart() {
  return <div className="flex flex-col items-center justify-center py-6 text-gray-300"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg><p className="text-xs mt-2 text-gray-400">No data for this date</p></div>;
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const today = toISO(new Date());
  const [date,         setDate]         = useState(today);
  const [entries,      setEntries]      = useState<EntryRow[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [page,         setPage]         = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter,   setRoleFilter]   = useState('');
  const [showFilter,   setShowFilter]   = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const dateRef   = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/entries').then((r) => r.json()).then((d) => { setEntries(d); setLoading(false); });
  }, []);

  useEffect(() => {
    function h(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setShowFilter(false);
    }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setPage(1); }, [date, statusFilter, roleFilter]);

  const byDate = useMemo(() => entries.filter((e) => e.reporting_date === date), [entries, date]);
  const filtered = useMemo(() => byDate.filter((e) => {
    if (statusFilter && e.status !== statusFilter) return false;
    if (roleFilter   && (e.role ?? '') !== roleFilter) return false;
    return true;
  }), [byDate, statusFilter, roleFilter]);

  const total    = byDate.length;
  const approved = byDate.filter((e) => e.status === 'Approved').length;
  const pending  = byDate.filter((e) => e.status === 'Pending Approval').length;
  const rejected = byDate.filter((e) => e.status === 'Rejected').length;

  const byRole     = useMemo(() => countBy(byDate, 'role'),          [byDate]);
  const byBuilding = useMemo(() => countBy(byDate, 'building_name'), [byDate]);
  const byStatus   = useMemo(() => countBy(byDate, 'status'),        [byDate]);
  const maxBldg    = Math.max(...byBuilding.map(([, v]) => v), 1);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const statusOptions = [...new Set(byDate.map((e) => e.status))];
  const roleOptions   = [...new Set(byDate.map((e) => e.role ?? '').filter(Boolean))];

  function exportCSV() {
    const header = ['#','Name','Role','Purpose','Building','Status','Time'];
    const rows   = filtered.map((e, i) => [i+1, e.name, e.role??'', e.purpose, e.building_name, e.status, fmtTime(e.created_at)]);
    const csv = [header, ...rows].map((r) => r.map(String).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url; a.download = `entries-${date}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const kpiCards = [
    { label: 'Total on Today',    value: total,    iconColor: '#3b82f6', bgIcon: '#eff6ff', wave: 'blue'   as const, waveColor: '#3b82f6', icon: KpiIcons.total    },
    { label: 'Approved on Today', value: approved, iconColor: '#22c55e', bgIcon: '#f0fdf4', wave: 'green'  as const, waveColor: '#22c55e', icon: KpiIcons.approved },
    { label: 'Pending on Today',  value: pending,  iconColor: '#f97316', bgIcon: '#fff7ed', wave: 'orange' as const, waveColor: '#f97316', icon: KpiIcons.pending  },
    { label: 'Rejected on Today', value: rejected, iconColor: '#ef4444', bgIcon: '#fef2f2', wave: 'red'    as const, waveColor: '#ef4444', icon: KpiIcons.rejected },
  ];

  return (
    <div className="page-container space-y-4 sm:space-y-5">

      {/* ── Date picker row ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-2">
        <div
          className="relative flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 cursor-pointer shadow-sm hover:border-blue-300 transition-colors"
          onClick={() => dateRef.current?.showPicker?.() ?? dateRef.current?.click()}
        >
          <CalendarDays size={15} className="text-gray-400 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-700">{fmtDisplay(date)}</span>
          <ChevronDown size={12} className="text-gray-400" />
          <input
            ref={dateRef}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="absolute inset-0 opacity-0 w-full cursor-pointer"
            tabIndex={-1}
          />
        </div>
        <button
          onClick={() => setDate(today)}
          className={`px-3 py-2 text-sm font-semibold rounded-xl border shadow-sm transition-colors ${
            date === today
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
          }`}
        >
          Today
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400 py-20 text-center">Loading analytics…</div>
      ) : (
        <>
          {/* ── KPI Cards ───────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {kpiCards.map((card) => (
              <div key={card.label}
                className="bg-white rounded-2xl border border-gray-100 p-3 sm:p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col gap-2 sm:gap-3">
                <div className="flex items-start justify-between">
                  <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center flex-shrink-0 [&_svg]:w-5 [&_svg]:h-5 sm:[&_svg]:w-[22px] sm:[&_svg]:h-[22px]"
                    style={{ background: card.bgIcon }}>
                    {card.icon(card.iconColor)}
                  </div>
                  <span className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-none">{card.value}</span>
                </div>
                <p className="text-[11px] sm:text-xs font-medium text-gray-500 leading-tight">{card.label}</p>
                <div className="hidden sm:block"><Sparkline variant={card.wave} color={card.waveColor} /></div>
              </div>
            ))}
          </div>

          {/* ── Charts row ──────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* By Role */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-sm">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[2.5px] mb-4 sm:mb-5">By Role</h3>
              {byRole.length === 0 ? <EmptyChart /> : (
                <div className="flex items-center gap-5">
                  <DonutChart
                    data={byRole}
                    colorFn={(_, i) => CHART_COLORS[i % CHART_COLORS.length]}
                  />
                  <div className="flex-1 space-y-2.5 min-w-0">
                    {byRole.map(([role, cnt], i) => (
                      <div key={role} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <span className="text-xs text-gray-600 truncate">{role}</span>
                        </div>
                        <span className="text-xs font-bold text-gray-900 flex-shrink-0">{cnt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* By Building */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-sm">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[2.5px] mb-4 sm:mb-5">By Building</h3>
              {byBuilding.length === 0 ? <EmptyChart /> : (
                <div className="space-y-4">
                  {byBuilding.map(([bldg, cnt]) => (
                    <div key={bldg}>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-xs font-medium text-gray-600 truncate max-w-[70%]">{bldg}</span>
                        <span className="text-xs font-bold text-gray-900">{cnt}</span>
                      </div>
                      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${(cnt / maxBldg) * 100}%`,
                            background: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* By Status */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-sm">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[2.5px] mb-4 sm:mb-5">By Status</h3>
              {byStatus.length === 0 ? <EmptyChart /> : (
                <div className="flex items-center gap-5">
                  <DonutChart
                    data={byStatus}
                    colorFn={(label) => STATUS_PALETTE[label]?.dot ?? '#94a3b8'}
                  />
                  <div className="flex-1 space-y-2.5 min-w-0">
                    {byStatus.map(([status, cnt]) => (
                      <div key={status} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ background: STATUS_PALETTE[status]?.dot ?? '#94a3b8' }} />
                          <span className="text-xs text-gray-600 truncate">{status}</span>
                        </div>
                        <span className="text-xs font-bold text-gray-900 flex-shrink-0">{cnt}</span>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-gray-100 flex justify-between">
                      <span className="text-xs font-semibold text-gray-500">Total</span>
                      <span className="text-xs font-bold text-gray-900">{total}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Entries Table ────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">

            {/* Table toolbar */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
              <h3 className="text-sm sm:text-base font-semibold text-gray-800">
                Entries for {date === today ? 'Today' : fmtDisplay(date)}
                <span className="ml-2 text-xs sm:text-sm font-normal text-gray-400">({filtered.length})</span>
              </h3>
              <div className="flex items-center gap-2">
                {/* Filter dropdown */}
                <div className="relative" ref={filterRef}>
                  <button
                    onClick={() => setShowFilter(!showFilter)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                      statusFilter || roleFilter
                        ? 'border-blue-300 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-600'
                    }`}
                  >
                    <Filter size={13} />
                    Filters
                    {(statusFilter || roleFilter) && (
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                    )}
                  </button>
                  {showFilter && (
                    <div className="absolute right-0 top-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl p-4 w-56 z-30 space-y-3">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Filter by</p>
                      <div>
                        <label className="text-xs font-semibold text-gray-600 block mb-1.5">Status</label>
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                          className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">All statuses</option>
                          {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600 block mb-1.5">Role</label>
                        <select
                          value={roleFilter}
                          onChange={(e) => setRoleFilter(e.target.value)}
                          className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">All roles</option>
                          {roleOptions.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                      {(statusFilter || roleFilter) && (
                        <button
                          onClick={() => { setStatusFilter(''); setRoleFilter(''); }}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Clear all filters
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Export */}
                <button
                  onClick={exportCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg hover:bg-gray-50 bg-white text-gray-600 transition-colors"
                >
                  <Download size={13} />
                  Export
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: 550 }}>
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    {['#', 'NAME', 'ROLE', 'PURPOSE', 'BUILDING', 'STATUS', 'TIME'].map((h) => (
                      <th key={h}
                        className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap border-b border-gray-100">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pageData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                        No entries for {date === today ? 'today' : fmtDisplay(date)}
                      </td>
                    </tr>
                  ) : pageData.map((e, i) => {
                    const rs = getRoleStyle(e.role ?? '');
                    const sp = STATUS_PALETTE[e.status] ?? { bg: '#f3f4f6', text: '#4b5563' };
                    return (
                      <tr key={e.id} className="hover:bg-gray-50 transition-colors duration-100">
                        <td className="px-4 py-3 text-gray-400 text-xs font-medium">
                          {(page - 1) * PAGE_SIZE + i + 1}
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">
                          {e.name}
                        </td>
                        <td className="px-4 py-3">
                          {e.role && (
                            <span
                              style={{ background: rs.bg, color: rs.text, border: `1px solid ${rs.border}` }}
                              className="px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
                            >
                              {e.role}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{e.purpose}</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{e.building_name}</td>
                        <td className="px-4 py-3">
                          <span
                            style={{ background: sp.bg, color: sp.text }}
                            className="px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
                          >
                            {e.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                          {fmtTime(e.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filtered.length > 0 && (
              <div className="px-4 sm:px-6 py-3 sm:py-3.5 border-t border-gray-100 flex items-center justify-between flex-wrap gap-3">
                <span className="text-xs text-gray-500">
                  Showing{' '}
                  <span className="font-semibold text-gray-700">
                    {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}
                  </span>{' '}
                  to{' '}
                  <span className="font-semibold text-gray-700">
                    {Math.min(page * PAGE_SIZE, filtered.length)}
                  </span>{' '}
                  of{' '}
                  <span className="font-semibold text-gray-700">{filtered.length}</span> entries
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-7 h-7 text-xs font-semibold rounded-lg transition-colors ${
                        page === p
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
