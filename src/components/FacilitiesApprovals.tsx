'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Clock, ChevronRight, Search } from 'lucide-react';
import { getRoleStyle } from '@/lib/constants';

type Entry = {
  id: string; name: string; email: string | null; mobile_number: string | null;
  role: string | null; purpose: string; reporting_date: string;
  employee_id: string | null; poc_name: string; building_name: string; status: string;
  otp: string | null; pass_id: string | null; photo_url: string | null;
};

type Tab = 'pending' | 'approved' | 'rejected';

const STATUS_COLORS: Record<string, string> = {
  'Pending Form':     'bg-gray-100 text-gray-600',
  'Pending Approval': 'bg-orange-100 text-orange-700',
  'Approved':         'bg-green-100 text-green-700',
  'Rejected':         'bg-red-100 text-red-700',
};

function RoleBadge({ role }: { role: string | null }) {
  if (!role) return null;
  const { bg, text, border } = getRoleStyle(role);
  return (
    <span style={{ background: bg, color: text, border: `1px solid ${border}` }}
      className="px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap">
      {role}
    </span>
  );
}

function matchesSearch(e: Entry, q: string) {
  const lower = q.toLowerCase();
  return [e.name, e.email, e.employee_id, e.mobile_number, e.building_name, e.poc_name, e.purpose, e.role, e.status]
    .some((v) => v?.toLowerCase().includes(lower));
}

export default function FacilitiesApprovals({ userRole }: { userRole: string }) {
  const [entries,     setEntries]     = useState<Entry[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [processing,  setProcessing]  = useState<string | null>(null);
  const [tab,         setTab]         = useState<Tab>('pending');
  const [toast,       setToast]       = useState<{ type: 'approve' | 'reject'; email: string | null } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => { fetchEntries(); }, []);

  async function fetchEntries() {
    setLoading(true);
    const data = await fetch('/api/entries').then((r) => r.json());
    setEntries(data);
    setLoading(false);
  }

  async function handleAction(id: string, action: 'approve' | 'reject', email: string | null) {
    setProcessing(id);
    const updated = await fetch(`/api/approvals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    }).then((r) => r.json());
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...updated } : e)));
    setToast({ type: action, email });
    setProcessing(null);
    setTab(action === 'approve' ? 'approved' : 'rejected');
    setTimeout(() => setToast(null), 6000);
  }

  const sq = searchQuery.trim();
  const pending  = entries.filter((e) => e.status === 'Pending Approval' && (!sq || matchesSearch(e, sq)));
  const approved = entries.filter((e) => e.status === 'Approved'         && (!sq || matchesSearch(e, sq)));
  const rejected = entries.filter((e) => e.status === 'Rejected'         && (!sq || matchesSearch(e, sq)));

  // Unfiltered counts for badge display
  const pendingTotal = entries.filter((e) => e.status === 'Pending Approval').length;

  const tabs = [
    { key: 'pending'  as Tab, label: 'Pending',  count: pending.length,  active: 'border-orange-500 text-orange-700 bg-orange-50' },
    { key: 'approved' as Tab, label: 'Approved', count: approved.length, active: 'border-green-500 text-green-700 bg-green-50' },
    { key: 'rejected' as Tab, label: 'Rejected', count: rejected.length, active: 'border-red-500 text-red-700 bg-red-50' },
  ];

  if (loading) return <div className="text-sm text-gray-400">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-800">
          {userRole === 'facilities' ? 'Approvals' : 'Approvals (Read-only — Facilities Only)'}
        </h1>
        {pendingTotal > 0 && <span className="bg-orange-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">{pendingTotal} pending</span>}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search name, email, building, POC…"
          className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {toast && (
        <div className={`flex items-start gap-3 px-5 py-3.5 rounded-xl border text-sm ${toast.type === 'approve' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          {toast.type === 'approve' ? <CheckCircle size={18} className="text-green-600 flex-shrink-0 mt-0.5" /> : <XCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />}
          <div>
            <p className="font-semibold">{toast.type === 'approve' ? 'Entry approved.' : 'Entry rejected.'}</p>
            {toast.email && <p className="text-xs mt-0.5">{toast.type === 'approve' ? 'Gate pass sent to' : 'Notification sent to'} <strong>{toast.email}</strong>.</p>}
          </div>
          <button onClick={() => setToast(null)} className="ml-auto text-gray-400 hover:text-gray-600">✕</button>
        </div>
      )}

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? t.active + ' shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${tab === t.key ? 'bg-white/70' : 'bg-gray-200 text-gray-600'}`}>{t.count}</span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {tab === 'pending' && (
          <>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <Clock size={16} className="text-orange-500" />
              <h2 className="text-base font-semibold text-gray-800">Pending Approval</h2>
            </div>
            {pending.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-400">
                <CheckCircle size={32} className="mx-auto mb-3 text-green-300" />
                <p className="font-medium">All caught up!</p>
                <p className="text-sm mt-1">No entries waiting for approval.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Photo','Name','Employee ID','Email','Role','Purpose','Date','Building','POC','Status',
                        ...(userRole === 'facilities' ? ['Actions'] : [])].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pending.map((e) => (
                      <tr key={e.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          {e.photo_url
                            ? <img src={e.photo_url} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-blue-100" />
                            : <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-xs font-bold">{e.name.charAt(0)}</div>
                          }
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{e.name}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs font-mono">{e.employee_id ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{e.email ?? '—'}</td>
                        <td className="px-4 py-3"><RoleBadge role={e.role} /></td>
                        <td className="px-4 py-3"><span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">{e.purpose}</span></td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{e.reporting_date}</td>
                        <td className="px-4 py-3 text-gray-600">{e.building_name}</td>
                        <td className="px-4 py-3 text-gray-600">{e.poc_name}</td>
                        <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[e.status] ?? 'bg-gray-100 text-gray-600'}`}>{e.status}</span></td>
                        {userRole === 'facilities' && (
                          <td className="px-4 py-3">
                            <div className="flex gap-1.5">
                              <button onClick={() => handleAction(e.id, 'approve', e.email)} disabled={processing === e.id}
                                className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg">
                                <CheckCircle size={12} />{processing === e.id ? '…' : 'Approve'}
                              </button>
                              <button onClick={() => handleAction(e.id, 'reject', e.email)} disabled={processing === e.id}
                                className="flex items-center gap-1 px-3 py-1.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-semibold rounded-lg">
                                <XCircle size={12} />Reject
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {tab === 'approved' && (
          <>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <CheckCircle size={16} className="text-green-500" />
              <h2 className="text-base font-semibold text-gray-800">Approved Entries</h2>
            </div>
            {approved.length === 0 ? <div className="px-6 py-12 text-center text-gray-400 text-sm">No approved entries yet.</div> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50"><tr>{['#','Photo','Name','Role','Purpose','Date','Building','Pass ID'].map((h) => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {approved.map((e, i) => (
                      <tr key={e.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                        <td className="px-4 py-3">{e.photo_url ? <img src={e.photo_url} alt="" className="w-9 h-9 rounded-full object-cover border border-gray-200" /> : <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-xs font-bold">{e.name.charAt(0)}</div>}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{e.name}</td>
                        <td className="px-4 py-3"><RoleBadge role={e.role} /></td>
                        <td className="px-4 py-3 text-gray-600">{e.purpose}</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{e.reporting_date}</td>
                        <td className="px-4 py-3 text-gray-600">{e.building_name}</td>
                        <td className="px-4 py-3">{e.pass_id ? <span className="font-mono text-xs text-blue-700 font-semibold">{e.pass_id}</span> : <span className="text-gray-400 text-xs">—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {tab === 'rejected' && (
          <>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <XCircle size={16} className="text-red-500" /><h2 className="text-base font-semibold text-gray-800">Rejected Entries</h2>
            </div>
            {rejected.length === 0 ? <div className="px-6 py-12 text-center text-gray-400 text-sm">No rejected entries.</div> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50"><tr>{['#','Name','Email','Role','Purpose','Date'].map((h) => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {rejected.map((e, i) => (
                      <tr key={e.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{e.name}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{e.email ?? '—'}</td>
                        <td className="px-4 py-3"><RoleBadge role={e.role} /></td>
                        <td className="px-4 py-3 text-gray-600">{e.purpose}</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{e.reporting_date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block"></span>{pending.length} pending</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>{approved.length} approved</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block"></span>{rejected.length} rejected</span>
        <ChevronRight size={12} className="text-gray-300" />
        <span>{entries.length} total</span>
      </div>
    </div>
  );
}
