'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email,     setEmail]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [sent,      setSent]      = useState(false);
  const [error,     setError]     = useState('');

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? 'Something went wrong'); return; }
      setSent(true);
    } catch {
      setError('Unable to reach the server. Please try again.');
    } finally { setLoading(false); }
  }

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
            <h2 className="text-lg font-bold text-gray-900">Forgot Password</h2>
            <p className="text-sm text-gray-500 mt-0.5">Enter your email to receive a reset link</p>
          </div>

          {sent ? (
            <div className="px-8 py-8 text-center space-y-3">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
              <p className="text-sm font-semibold text-gray-800">Reset link sent!</p>
              <p className="text-sm text-gray-500">If this email exists, you will receive a password reset link shortly. The link expires in 1 hour.</p>
              <Link href="/login" className="inline-block mt-2 text-sm text-blue-700 font-semibold hover:underline">← Back to Sign In</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">
              {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                  placeholder="you@example.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-semibold rounded-lg text-sm transition-colors">
                {loading ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Sending…</span> : 'Send Reset Link'}
              </button>
            </form>
          )}

          <div className="px-8 pb-6 text-center border-t border-gray-100 pt-4">
            <p className="text-sm text-gray-500">
              Remembered your password?{' '}
              <Link href="/login" className="text-blue-700 font-semibold hover:underline">Sign In</Link>
            </p>
          </div>
        </div>

        <p className="text-center text-blue-400 text-xs mt-6">NxtWave &copy; {new Date().getFullYear()} &bull; Internal Use Only</p>
      </div>
    </div>
  );
}
