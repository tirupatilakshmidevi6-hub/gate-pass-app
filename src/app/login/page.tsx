'use client';

import { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

async function safePost(url: string, body: unknown): Promise<{ ok: boolean; status: number; data: Record<string, string> }> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  let data: Record<string, string> = {};
  try {
    data = await res.json();
  } catch {
    data = { error: `Server error (${res.status}). Check terminal logs for details.` };
  }
  return { ok: res.ok, status: res.status, data };
}

function SuccessBanner() {
  const searchParams = useSearchParams();
  if (searchParams.get('registered')) return (
    <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
      Account created successfully. Please login with your credentials.
    </div>
  );
  if (searchParams.get('reset')) return (
    <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
      Password reset successfully. Please login with your new password.
    </div>
  );
  return null;
}

function LoginForm() {
  const router = useRouter();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { ok, data } = await safePost('/api/auth/login', { email, password });
      if (!ok) {
        setError(data.error ?? 'Login failed');
        return;
      }
      // Role-based redirect after successful login
      if (data.role === 'facilities') {
        router.push('/approvals');
      } else if (data.role === 'admin' || data.role === 'ta') {
        router.push('/');
      } else {
        // All other custom/Other roles → simple welcome page
        router.push('/welcome');
      }
      router.refresh();
    } catch {
      setError('Unable to reach the server. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
      <div className="px-8 py-6 border-b border-gray-100">
        <h2 className="text-lg font-bold text-gray-900">Sign in to your account</h2>
        <p className="text-sm text-gray-500 mt-0.5">Enter your credentials to continue</p>
      </div>

      <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">
        <Suspense>
          <SuccessBanner />
        </Suspense>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="text-right -mt-1">
          <Link href="/forgot-password" className="text-xs text-blue-600 hover:underline">Forgot password?</Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-semibold rounded-lg text-sm transition-colors mt-2"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Signing in…
            </span>
          ) : (
            'Sign In'
          )}
        </button>
      </form>

      <div className="px-8 pb-6 text-center border-t border-gray-100 pt-4">
        <p className="text-sm text-gray-500">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-blue-700 font-semibold hover:underline">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
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

        <LoginForm />

        <p className="text-center text-blue-400 text-xs mt-6">
          NxtWave &copy; {new Date().getFullYear()} &bull; Internal Use Only
        </p>
      </div>
    </div>
  );
}
