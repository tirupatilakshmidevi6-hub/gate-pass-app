'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

type TokenInfo = { valid: boolean; expired?: boolean; error?: string; name?: string };

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [info,        setInfo]        = useState<TokenInfo | null>(null);
  const [checking,    setChecking]    = useState(true);
  const [password,    setPassword]    = useState('');
  const [confirm,     setConfirm]     = useState('');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');

  useEffect(() => {
    fetch(`/api/auth/reset-password/${token}`)
      .then((r) => r.json())
      .then((d) => { setInfo(d); setChecking(false); })
      .catch(() => { setInfo({ valid: false, error: 'Unable to verify reset link' }); setChecking(false); });
  }, [token]);

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 8)   { setError('Password must be at least 8 characters'); return; }
    if (password !== confirm)   { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/reset-password/${token}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, confirmPassword: confirm }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? 'Reset failed'); return; }
      router.push('/login?reset=1');
    } catch {
      setError('Unable to reach the server. Please try again.');
    } finally { setLoading(false); }
  }

  if (checking) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!info?.valid) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 flex items-center justify-center px-4">
      <div className="max-w-sm w-full bg-white rounded-2xl p-8 text-center shadow-xl space-y-4">
        <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-7 h-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <h2 className="text-lg font-bold text-gray-800">{info?.expired ? 'Link Expired' : 'Invalid Link'}</h2>
        <p className="text-sm text-gray-500">{info?.expired ? 'This reset link has expired. Please request a new one.' : (info?.error ?? 'This reset link is invalid or has already been used.')}</p>
        <Link href="/forgot-password" className="inline-block px-6 py-2.5 bg-blue-700 text-white rounded-xl text-sm font-semibold hover:bg-blue-800">Request New Link</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-white rounded-2xl px-5 py-3 shadow-lg">
              <img src="https://www.image2url.com/r2/default/images/1779254824307-0fca63d9-e1eb-4ccf-bfb4-4c663ca4ae5e.jpeg"
                alt="NxtWave" className="h-12 w-auto object-contain" />
            </div>
          </div>
          <p className="text-blue-300 text-sm mt-1 tracking-wide">Gate Pass System</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">Set New Password</h2>
            <p className="text-sm text-gray-500 mt-0.5">Hello {info.name}, choose a new password below</p>
          </div>
          <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">
            {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password <span className="text-gray-400 font-normal">(min. 8 characters)</span></label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8}
                placeholder="Create a strong password"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm New Password</label>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required
                placeholder="Re-enter your password"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-semibold rounded-lg text-sm transition-colors">
              {loading ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Resetting…</span> : 'Reset Password'}
            </button>
          </form>
        </div>
        <p className="text-center text-blue-400 text-xs mt-6">NxtWave &copy; {new Date().getFullYear()} &bull; Internal Use Only</p>
      </div>
    </div>
  );
}
