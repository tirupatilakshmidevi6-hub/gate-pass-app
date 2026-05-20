'use client';

import { useEffect, useState } from 'react';
import { getRoleStyle } from '@/lib/constants';
import { CalendarDays } from 'lucide-react';

type EntryRow = {
  id: string; name: string; email: string | null; mobile_number: string | null;
  role: string | null; purpose: string; reporting_date: string;
  poc_name: string; contact_no: string; building_name: string;
  status: string; pass_id: string | null; photo_url: string | null;
  created_at: string; created_by: string;
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

export default function EntryListPage() {
  const today = toISO(new Date());
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<EntryRow | null>(null);
  const [dateFilter, setDateFilter] = useState('');
  const [userRole, setUserRole] = useState<'admin' | 'facilities' | null>(null);

  useEffect(() => {
    fetch('/api/auth/me').then((r) => r.json()).then((d) => setUserRole(d.role ?? null));
    fetch('/api/entries').then((r) => r.json()).then((d) => { setEntries(d); setLoading(false); });
  }, []);

  const filtered = dateFilter ? entries.filter((e) => e.reporting_date === dateFilter) : entries;

  if (loading) return <div className="text-sm text-gray-400">Loading entries…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-800">Entry List</h1>
        <div className="flex items-center gap-2">
          <CalendarDays size={16} className="text-gray-400" />
          <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button onClick={() => setDateFilter('')} className="px-3 py-1.5 text-xs font-semibold border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600">All Dates</button>
          <button onClick={() => setDateFilter(today)} className="px-3 py-1.5 text-xs font-semibold border border-blue-300 rounded-lg hover:bg-blue-50 text-blue-600">Today</button>
          {userRole === 'admin' && (
            <a href="/new-entry" className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">+ New Entry</a>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 text-sm text-gray-500">{filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>{['#','Name','Email','Role','Purpose','Reporting Date','Building','Status','Actions'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="px-6 py-10 text-center text-gray-400">No entries found.</td></tr>
              ) : filtered.map((e, idx) => {
                const rs = getRoleStyle(e.role ?? '');
                return (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-400 text-xs font-medium">{idx + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{e.name}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{e.email ?? '—'}</td>
                    <td className="px-4 py-3">
                      {e.role && <span style={{ background: rs.bg, color: rs.text, border: `1px solid ${rs.border}` }}
                        className="px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap">{e.role}</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{e.purpose}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{e.reporting_date}</td>
                    <td className="px-4 py-3 text-gray-600">{e.building_name}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[e.status] ?? 'bg-gray-100 text-gray-600'}`}>{e.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setSelected(e)} className="px-3 py-1 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50">View</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-blue-900 to-blue-600 rounded-t-2xl px-6 py-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-bold text-blue-200 uppercase tracking-widest mb-1">Entry Details</div>
                  <div className="text-xl font-bold text-white">{selected.name}</div>
                </div>
                <button onClick={() => setSelected(null)} className="text-blue-200 hover:text-white text-xl mt-1">✕</button>
              </div>
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[selected.status] ?? 'bg-gray-100 text-gray-600'}`}>{selected.status}</span>
                {selected.pass_id && <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">{selected.pass_id}</span>}
              </div>
            </div>
            <div className="px-6 py-5 space-y-4">
              {selected.photo_url && <div className="flex justify-center"><img src={selected.photo_url} alt="" className="w-20 h-20 rounded-full object-cover border-4 border-blue-100" /></div>}
              <Sec title="Entry Information">
                <DR label="Email" value={selected.email ?? '—'} />
                <DR label="Mobile" value={selected.mobile_number ?? '—'} />
                <DR label="Role" value={selected.role ?? '—'} />
                <DR label="Purpose" value={selected.purpose} />
                <DR label="Reporting Date" value={selected.reporting_date} />
                <DR label="POC Name" value={selected.poc_name} />
                <DR label="Contact No" value={selected.contact_no} />
                <DR label="Building" value={selected.building_name} />
              </Sec>
              <Sec title="System Info">
                <DR label="Created By" value={selected.created_by} />
                <DR label="Created At" value={new Date(selected.created_at).toLocaleString()} />
              </Sec>
            </div>
            <div className="px-6 pb-5"><button onClick={() => setSelected(null)} className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg">Close</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">{title}</div><div className="bg-gray-50 rounded-xl divide-y divide-gray-100">{children}</div></div>;
}
function DR({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between items-center px-4 py-2.5 text-sm"><span className="text-gray-500">{label}</span><span className="font-medium text-gray-800 text-right max-w-[60%] break-words">{value}</span></div>;
}
