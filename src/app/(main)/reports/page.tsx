'use client';

import { useEffect, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { getRoleStyle } from '@/lib/constants';

type EntryRow = {
  id: string; name: string; role: string | null; purpose: string;
  reporting_date: string; building_name: string; status: string;
};

const STATUS_COLORS: Record<string, string> = {
  'Pending Form':     'bg-gray-100 text-gray-600',
  'Pending Approval': 'bg-orange-100 text-orange-700',
  'Approved':         'bg-green-100 text-green-700',
  'Rejected':         'bg-red-100 text-red-700',
};

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function count<T>(arr: T[], key: keyof T) {
  const map: Record<string, number> = {};
  for (const item of arr) {
    const k = String(item[key] ?? 'Unknown');
    map[k] = (map[k] ?? 0) + 1;
  }
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}

export default function ReportsPage() {
  const today = toISO(new Date());
  const [date, setDate] = useState(today);
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/entries').then((r) => r.json()).then((d) => { setEntries(d); setLoading(false); });
  }, []);

  const filtered = entries.filter((e) => e.reporting_date === date);
  const total    = filtered.length;
  const approved = filtered.filter((e) => e.status === 'Approved').length;
  const rejected = filtered.filter((e) => e.status === 'Rejected').length;
  const pending  = filtered.filter((e) => e.status === 'Pending Approval').length;

  const byRole     = count(filtered, 'role');
  const byBuilding = count(filtered, 'building_name');
  const byStatus   = count(filtered, 'status');
  const maxStatus  = Math.max(...byStatus.map(([,c]) => c), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-800">Reports</h1>
        <div className="flex items-center gap-2">
          <CalendarDays size={16} className="text-gray-400" />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button onClick={() => setDate(today)} className="px-3 py-1.5 text-xs font-semibold border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600">Today</button>
        </div>
      </div>

      {loading ? <div className="text-sm text-gray-400">Loading…</div> : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total', value: total,    color: 'text-blue-700',   bg: 'bg-blue-50'   },
              { label: 'Approved', value: approved, color: 'text-green-700',  bg: 'bg-green-50'  },
              { label: 'Pending',  value: pending,  color: 'text-orange-700', bg: 'bg-orange-50' },
              { label: 'Rejected', value: rejected, color: 'text-red-700',    bg: 'bg-red-50'    },
            ].map((s) => (
              <div key={s.label} className={`${s.bg} rounded-xl p-4 border border-gray-100`}>
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{s.label} on {date === today ? 'Today' : date}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* By Role */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-widest mb-4">By Role</h2>
              {byRole.length === 0 ? <p className="text-gray-400 text-sm">No data</p> : (
                <div className="space-y-2">
                  {byRole.map(([role, cnt]) => {
                    const rs = getRoleStyle(role);
                    return (
                      <div key={role} className="flex items-center justify-between">
                        <span style={{ background: rs.bg, color: rs.text, border: `1px solid ${rs.border}` }}
                          className="px-2 py-0.5 rounded-full text-xs font-semibold">{role}</span>
                        <span className="text-sm font-bold text-gray-900">{cnt}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* By Building */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-widest mb-4">By Building</h2>
              {byBuilding.length === 0 ? <p className="text-gray-400 text-sm">No data</p> : (
                <div className="space-y-2">
                  {byBuilding.map(([building, cnt]) => (
                    <div key={building} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 truncate max-w-[70%]">{building}</span>
                      <span className="text-sm font-bold text-gray-900">{cnt}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* By Status */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-widest mb-4">By Status</h2>
              {byStatus.length === 0 ? <p className="text-gray-400 text-sm">No data</p> : (
                <div className="space-y-2">
                  {byStatus.map(([status, cnt]) => (
                    <div key={status}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}>{status}</span>
                        <span className="font-bold text-gray-900">{cnt}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${(cnt / maxStatus) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Entries table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-800">
                Entries for {date === today ? 'Today' : date} <span className="text-gray-400 font-normal text-sm">({filtered.length})</span>
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>{['#','Name','Role','Purpose','Building','Status'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">No entries for this date</td></tr>
                  ) : filtered.map((e, i) => {
                    const rs = getRoleStyle(e.role ?? '');
                    return (
                      <tr key={e.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{e.name}</td>
                        <td className="px-4 py-3">{e.role && <span style={{ background: rs.bg, color: rs.text, border: `1px solid ${rs.border}` }} className="px-2 py-0.5 rounded-full text-xs font-semibold">{e.role}</span>}</td>
                        <td className="px-4 py-3 text-gray-600">{e.purpose}</td>
                        <td className="px-4 py-3 text-gray-600">{e.building_name}</td>
                        <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[e.status] ?? 'bg-gray-100 text-gray-600'}`}>{e.status}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
