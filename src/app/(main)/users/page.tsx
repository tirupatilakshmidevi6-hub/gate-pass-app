'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Ban, Clock, X } from 'lucide-react';

type AppUser = {
  id: string; name: string; email: string;
  role: string; status: string; created_at: string;
  rejection_reason?: string | null;
};

// Reserved role display labels
const ROLE_LABELS: Record<string, string> = {
  admin:      'Admin',
  ta:         'TA',
  facilities: 'Facilities Team',
};
// Return a capitalised role label for any string, falling back gracefully
function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role.charAt(0).toUpperCase() + role.slice(1);
}

const ROLE_STYLES: Record<string, string> = {
  admin:      'bg-purple-100 text-purple-700 border-purple-200',
  ta:         'bg-blue-100   text-blue-700   border-blue-200',
  facilities: 'bg-teal-100   text-teal-700   border-teal-200',
};
// Custom/Other roles get a neutral grey badge
const DEFAULT_ROLE_STYLE = 'bg-gray-100 text-gray-600 border-gray-200';
const STATUS_STYLES: Record<string, string> = {
  active:           'bg-green-100  text-green-700',
  pending_approval: 'bg-amber-100  text-amber-700',
  rejected:         'bg-red-100    text-red-700',
  inactive:         'bg-gray-100   text-gray-500',
};
const STATUS_LABELS: Record<string, string> = {
  active: 'Active', pending_approval: 'Pending Approval',
  rejected: 'Rejected', inactive: 'Inactive',
};
const RESERVED = ['admin', 'ta', 'facilities'];

export default function UsersPage() {
  const [users,      setUsers]      = useState<AppUser[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [actionId,   setActionId]   = useState<string | null>(null);
  const [toast,      setToast]      = useState('');
  const [rejectModal, setRejectModal] = useState<{ id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const data = await fetch('/api/users').then((r) => r.json()).catch(() => []);
    setUsers(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 4000); }

  async function doAction(userId: string, action: string, reason?: string) {
    setActionId(userId);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error ?? 'Action failed'); return; }
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, ...data } : u));
      const labels: Record<string, string> = { approve: 'approved', reject: 'rejected', deactivate: 'deactivated', activate: 'activated' };
      showToast(`User ${labels[action] ?? action} successfully`);
    } finally { setActionId(null); }
  }

  function handleReject(id: string, name: string) {
    setRejectReason('');
    setRejectModal({ id, name });
  }
  async function confirmReject() {
    if (!rejectModal) return;
    await doAction(rejectModal.id, 'reject', rejectReason);
    setRejectModal(null);
  }

  const pending  = users.filter((u) => u.status === 'pending_approval');
  const active   = users.filter((u) => u.status === 'active');
  const others   = users.filter((u) => u.status === 'rejected' || u.status === 'inactive');

  if (loading) return <div className="p-6 text-sm text-gray-400">Loading users…</div>;

  return (
    <div className="p-6 space-y-8">
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-xl flex items-center gap-2">
          <CheckCircle size={15} className="text-green-400" />{toast}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-gray-800">Manage Users</h1>
        <p className="text-sm text-gray-500 mt-0.5">Approve, manage, and deactivate team accounts</p>
      </div>

      {/* ── Pending Approvals ── */}
      {pending.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} className="text-amber-500" />
            <h2 className="text-base font-semibold text-gray-800">Pending Approvals</h2>
            <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{pending.length}</span>
          </div>
          <div className="bg-white rounded-2xl border border-amber-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-amber-50">
                <tr>{['Name', 'Email', 'Role', 'Requested', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pending.map((u) => (
                  <tr key={u.id} className="hover:bg-amber-50/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{u.name}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${ROLE_STYLES[u.role] ?? DEFAULT_ROLE_STYLE}`}>
                        {roleLabel(u.role)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => doAction(u.id, 'approve')} disabled={actionId === u.id}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg transition-colors">
                          <CheckCircle size={12} />{actionId === u.id ? '…' : 'Approve'}
                        </button>
                        <button onClick={() => handleReject(u.id, u.name)} disabled={actionId === u.id}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 rounded-lg transition-colors">
                          <XCircle size={12} />Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── Active Users ── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle size={16} className="text-green-500" />
          <h2 className="text-base font-semibold text-gray-800">Active Users</h2>
          <span className="bg-gray-200 text-gray-600 text-xs font-semibold px-2 py-0.5 rounded-full">{active.length}</span>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>{['#','Name','Email','Role','Status','Joined','Actions'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {active.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">No active users.</td></tr>
                ) : active.map((u, i) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{u.name}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${ROLE_STYLES[u.role] ?? DEFAULT_ROLE_STYLE}`}>
                        {roleLabel(u.role)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[u.status] ?? ''}`}>
                        {STATUS_LABELS[u.status] ?? u.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      {!RESERVED.includes(u.role) && (
                        <button onClick={() => doAction(u.id, 'deactivate')} disabled={actionId === u.id}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors">
                          <Ban size={11} />Deactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Rejected / Inactive ── */}
      {others.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <XCircle size={16} className="text-gray-400" />
            <h2 className="text-base font-semibold text-gray-800">Rejected / Inactive</h2>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>{['Name','Email','Role','Status','Actions'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {others.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{u.name}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${ROLE_STYLES[u.role] ?? DEFAULT_ROLE_STYLE}`}>
                        {roleLabel(u.role)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[u.status] ?? ''}`}>
                        {STATUS_LABELS[u.status] ?? u.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => doAction(u.id, 'activate')} disabled={actionId === u.id}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-green-600 border border-green-200 rounded-lg hover:bg-green-50 disabled:opacity-50 transition-colors">
                        <CheckCircle size={11} />Activate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Reject Reason Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setRejectModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Reject Account</h2>
                <p className="text-sm text-gray-500 mt-0.5">Rejecting <strong>{rejectModal.name}</strong></p>
              </div>
              <button onClick={() => setRejectModal(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"><X size={20} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Rejection Reason <span className="text-gray-400 font-normal">(optional)</span></label>
                <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3}
                  placeholder="Enter reason for rejection…"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setRejectModal(null)}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50">Cancel</button>
                <button onClick={confirmReject}
                  className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-semibold transition-colors">
                  Reject Account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
