'use client';

import { useEffect, useState } from 'react';
import { UserPlus, RefreshCw, Ban, CheckCircle, X } from 'lucide-react';

type AppUser = {
  id: string; name: string; email: string;
  role: 'super_admin' | 'admin' | 'facilities';
  status: 'active' | 'invited' | 'inactive';
  created_at: string;
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin', admin: 'Admin', facilities: 'Facilities Team',
};
const ROLE_STYLES: Record<string, string> = {
  super_admin: 'bg-purple-100 text-purple-700 border-purple-200',
  admin:       'bg-blue-100 text-blue-700 border-blue-200',
  facilities:  'bg-green-100 text-green-700 border-green-200',
};
const STATUS_STYLES: Record<string, string> = {
  active:   'bg-green-100 text-green-700',
  invited:  'bg-amber-100 text-amber-700',
  inactive: 'bg-red-100 text-red-700',
};

export default function UsersPage() {
  const [users,     setUsers]     = useState<AppUser[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form,      setForm]      = useState({ name: '', email: '', role: 'admin' });
  const [sending,   setSending]   = useState(false);
  const [sendError, setSendError] = useState('');
  const [sendSuccess, setSendSuccess] = useState('');
  const [actionId,  setActionId]  = useState<string | null>(null);
  const [toast,     setToast]     = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const data = await fetch('/api/users').then((r) => r.json());
    setUsers(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setSending(true); setSendError('');
    try {
      const res = await fetch('/api/users', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (!res.ok) { setSendError(d.error ?? 'Failed to send invite'); return; }
      setSendSuccess(`Invitation sent to ${d.email}`);
      setShowModal(false);
      setForm({ name: '', email: '', role: 'admin' });
      load();
    } finally { setSending(false); }
  }

  async function handleAction(userId: string, action: 'deactivate' | 'activate') {
    setActionId(userId);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        const updated = await res.json();
        setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, ...updated } : u));
        showToast(action === 'deactivate' ? 'User deactivated' : 'User activated');
      }
    } finally { setActionId(null); }
  }

  async function handleResendInvite(userId: string) {
    setActionId(userId);
    try {
      const res = await fetch(`/api/users/${userId}/resend-invite`, { method: 'POST' });
      if (res.ok) showToast('Invitation email resent');
    } finally { setActionId(null); }
  }

  function showToast(msg: string) {
    setToast(msg); setTimeout(() => setToast(''), 4000);
  }

  return (
    <div className="p-6 space-y-6">
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-xl flex items-center gap-2">
          <CheckCircle size={15} className="text-green-400" />{toast}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Manage Users</h1>
          <p className="text-sm text-gray-500 mt-0.5">Invite and manage team members</p>
        </div>
        <button onClick={() => { setShowModal(true); setSendSuccess(''); setSendError(''); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors">
          <UserPlus size={16} /> Invite User
        </button>
      </div>

      {sendSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 flex items-center gap-2">
          <CheckCircle size={15} /> {sendSuccess}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 text-sm text-gray-500">{users.length} user{users.length !== 1 ? 's' : ''}</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>{['#', 'Name', 'Email', 'Role', 'Status', 'Date Added', 'Actions'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-gray-400">Loading…</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-gray-400">No users found.</td></tr>
              ) : users.map((u, i) => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{u.name}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${ROLE_STYLES[u.role] ?? 'bg-gray-100 text-gray-600'}`}>
                      {ROLE_LABELS[u.role] ?? u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[u.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {u.role !== 'super_admin' && (
                      <div className="flex items-center gap-1.5">
                        {u.status === 'invited' && (
                          <button onClick={() => handleResendInvite(u.id)} disabled={actionId === u.id}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 disabled:opacity-50 transition-colors">
                            <RefreshCw size={11} /> Resend
                          </button>
                        )}
                        {u.status !== 'inactive' ? (
                          <button onClick={() => handleAction(u.id, 'deactivate')} disabled={actionId === u.id}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors">
                            <Ban size={11} /> Deactivate
                          </button>
                        ) : (
                          <button onClick={() => handleAction(u.id, 'activate')} disabled={actionId === u.id}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-green-600 border border-green-200 rounded-lg hover:bg-green-50 disabled:opacity-50 transition-colors">
                            <CheckCircle size={11} /> Activate
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Invite User</h2>
                <p className="text-sm text-gray-500 mt-0.5">Send an invitation email to a new team member</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"><X size={20} /></button>
            </div>
            <form onSubmit={handleInvite} className="px-6 py-5 space-y-4">
              {sendError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{sendError}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name *</label>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required
                  placeholder="John Doe"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address *</label>
                <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required
                  placeholder="john@nxtwave.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Role *</label>
                <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="admin">Admin</option>
                  <option value="facilities">Facilities Team</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={sending}
                  className="flex-1 py-2.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-colors">
                  {sending ? 'Sending…' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
