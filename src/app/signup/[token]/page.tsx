'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

type InviteInfo = {
  valid: boolean; expired?: boolean; alreadyUsed?: boolean;
  name?: string; email?: string; role?: string;
};

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  facilities: 'Facilities Team',
  super_admin: 'Super Admin',
};

export default function SignupPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [invite,   setInvite]   = useState<InviteInfo | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error,    setError]    = useState('');

  useEffect(() => {
    fetch(`/api/signup/${token}`)
      .then((r) => r.json())
      .then((d) => { setInvite(d); setLoading(false); })
      .catch(() => { setInvite({ valid: false }); setLoading(false); });
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (password !== confirm)  { setError('Passwords do not match'); return; }
    setError(''); setSubmitting(true);
    try {
      const res = await fetch(`/api/signup/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? 'Setup failed'); return; }
      router.push('/login?success=1');
    } finally { setSubmitting(false); }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!invite?.valid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 flex items-center justify-center px-4">
        <div className="max-w-sm w-full bg-white rounded-2xl p-8 text-center shadow-xl space-y-4">
          <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-7 h-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <h2 className="text-lg font-bold text-gray-800">
            {invite?.expired     ? 'Invite Link Expired'     :
             invite?.alreadyUsed ? 'Account Already Set Up'  :
                                   'Invalid Invite Link'}
          </h2>
          <p className="text-sm text-gray-500">
            {invite?.expired
              ? 'This invite link has expired. Please contact your administrator for a new invitation.'
              : invite?.alreadyUsed
              ? 'This invite link has already been used. Please sign in.'
              : 'This invite link is invalid. Please contact your administrator.'}
          </p>
          {invite?.alreadyUsed && (
            <button onClick={() => router.push('/login')}
              className="px-6 py-2.5 bg-blue-700 text-white rounded-xl text-sm font-semibold hover:bg-blue-800">
              Go to Login
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-white rounded-2xl px-5 py-3 shadow-lg">
              <img
                src="https://www.image2url.com/r2/default/images/1779254824307-0fca63d9-e1eb-4ccf-bfb4-4c663ca4ae5e.jpeg"
                alt="NxtWave"
                className="h-12 w-auto object-contain"
              />
            </div>
          </div>
          <p className="text-blue-300 text-sm mt-1 tracking-wide">Gate Pass System</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">Set Up Your Account</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              You&apos;ve been invited as <span className="font-semibold text-blue-700">{ROLE_LABELS[invite.role ?? ''] ?? invite.role}</span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
              <input value={invite.name ?? ''} readOnly
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-50 text-gray-500 cursor-not-allowed" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
              <input value={invite.email ?? ''} readOnly
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-50 text-gray-500 cursor-not-allowed" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password <span className="text-gray-400 font-normal">(min. 8 characters)</span></label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8}
                placeholder="Create a strong password"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required
                placeholder="Re-enter your password"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <button type="submit" disabled={submitting}
              className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-semibold rounded-lg text-sm transition-colors mt-2">
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Setting up…
                </span>
              ) : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="text-center text-blue-400 text-xs mt-6">
          NxtWave &copy; {new Date().getFullYear()} &bull; Internal Use Only
        </p>
      </div>
    </div>
  );
}
