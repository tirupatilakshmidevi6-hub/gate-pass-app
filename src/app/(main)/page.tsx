'use client';

import { useEffect, useState } from 'react';
import { Users, CheckCircle, Clock, XCircle, CalendarDays } from 'lucide-react';
import Link from 'next/link';
import { getRoleStyle } from '@/lib/constants';

type EntryRow = {
  id: string; name: string; role: string | null; purpose: string;
  reporting_date: string; building_name: string; poc_name: string;
  status: string; email: string | null;
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

export default function DashboardPage() {
  const today = toISO(new Date());
  const [date, setDate] = useState(today);
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'admin' | 'facilities' | null>(null);

  useEffect(() => {
    fetch('/api/auth/me').then((r) => r.json()).then((d) => setUserRole(d.role ?? null));
    fetch('/api/entries').then((r) => r.json()).then((data) => { setEntries(data); setLoading(false); });
  }, []);

  const filtered = entries.filter((e) => e.reporting_date === date);
  const total    = filtered.length;
  const approved = filtered.filter((e) => e.status === 'Approved').length;
  const pending  = filtered.filter((e) => e.status === 'Pending Approval').length;
  const rejected = filtered.filter((e) => e.status === 'Rejected').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <div className="flex items-center gap-2">
          <CalendarDays size={16} className="text-gray-400" />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button onClick={() => setDate(today)}
            className="px-3 py-1.5 text-xs font-semibold border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600">
            Today
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400">Loading…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Entries Today" value={total}    icon={<Users size={26} className="text-blue-500" />}   border="border-blue-200" />
            <StatCard label="Approved Today"      value={approved} icon={<CheckCircle size={26} className="text-green-500" />} border="border-green-200" />
            <StatCard label="Pending Approval"    value={pending}  icon={<Clock size={26} className="text-orange-500" />} border="border-orange-200" />
            <StatCard label="Rejected Today"      value={rejected} icon={<XCircle size={26} className="text-red-500" />}  border="border-red-200" />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-800">
                Entries for {date === today ? 'Today' : date} <span className="text-gray-400 font-normal text-sm">({filtered.length})</span>
              </h2>
              <Link href="/entry-list" className="text-sm text-blue-600 hover:underline">View all</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>{['#','Name','Role','Purpose','Building','POC','Status'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={7} className="px-6 py-10 text-center text-gray-400">
                      No entries for this date.{' '}
                      {userRole === 'admin' && <Link href="/new-entry" className="text-blue-600 hover:underline">Add one</Link>}
                    </td></tr>
                  ) : filtered.map((e, idx) => {
                    const rs = getRoleStyle(e.role ?? '');
                    return (
                      <tr key={e.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{e.name}</td>
                        <td className="px-4 py-3">
                          {e.role && <span style={{ background: rs.bg, color: rs.text, border: `1px solid ${rs.border}` }}
                            className="px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap">{e.role}</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{e.purpose}</td>
                        <td className="px-4 py-3 text-gray-600">{e.building_name}</td>
                        <td className="px-4 py-3 text-gray-600">{e.poc_name}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[e.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {e.status}
                          </span>
                        </td>
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

function StatCard({ label, value, icon, border }: { label: string; value: number; icon: React.ReactNode; border: string }) {
  return (
    <div className={`bg-white rounded-xl border ${border} p-5 flex items-center gap-4`}>
      {icon}
      <div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-xs text-gray-500 mt-0.5 leading-tight">{label}</div>
      </div>
    </div>
  );
}
