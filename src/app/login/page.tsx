'use client';

import { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, LogIn, UserPlus } from 'lucide-react';

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
    <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
      Account created successfully. Please login with your credentials.
    </div>
  );
  if (searchParams.get('reset')) return (
    <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
      Password reset successfully. Please login with your new password.
    </div>
  );
  return null;
}

function LoginForm() {
  const router = useRouter();
  const [email,        setEmail]       = useState('');
  const [password,     setPassword]    = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading,      setLoading]     = useState(false);
  const [error,        setError]       = useState('');

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { ok, data } = await safePost('/api/auth/login', { email, password });
      if (!ok) { setError(data.error ?? 'Login failed'); return; }
      if (data.role === 'facilities') router.push('/approvals');
      else if (data.role === 'admin' || data.role === 'ta') router.push('/');
      else router.push('/welcome');
      router.refresh();
    } catch {
      setError('Unable to reach the server. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-3xl shadow-md overflow-hidden">

      {/* ── Brand header ─────────────────────────────────────────── */}
      <div className="flex items-center gap-4 px-8 py-6">
        <img
          src="https://www.image2url.com/r2/default/images/1779254824307-0fca63d9-e1eb-4ccf-bfb4-4c663ca4ae5e.jpeg"
          alt="NxtWave"
          className="h-14 w-auto object-contain"
        />
        <div className="w-px h-12 bg-gray-200 flex-shrink-0" />
        <div>
          <p className="text-lg font-bold text-gray-900 leading-tight">NxtWave</p>
          <p className="text-[11px] font-semibold text-gray-400 tracking-[0.14em] uppercase mt-0.5">
            Gate Pass System
          </p>
        </div>
      </div>

      <div className="h-px bg-gray-100" />

      {/* ── Welcome ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 px-8 pt-6 pb-2">
        <div className="w-11 h-11 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
          <ShieldCheck size={20} className="text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 leading-tight">Welcome back!</h2>
          <p className="text-sm text-gray-400 mt-0.5">Sign in to your account to continue</p>
        </div>
      </div>

      {/* ── Form ─────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="px-8 pt-5 pb-8 space-y-4">
        <Suspense><SuccessBanner /></Suspense>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Email */}
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-gray-700">Email address</label>
          <div className="relative">
            <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 placeholder:text-gray-300"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-gray-700">Password</label>
          <div className="relative">
            <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full pl-10 pr-11 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 placeholder:text-gray-300"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Forgot password */}
        <div className="text-right -mt-1">
          <Link href="/forgot-password" className="text-sm text-blue-600 font-medium hover:underline">
            Forgot password?
          </Link>
        </div>

        {/* Sign In button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Signing in…
            </>
          ) : (
            <>
              <LogIn size={16} />
              Sign In
            </>
          )}
        </button>

        {/* OR divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400 font-medium tracking-wide">OR</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Sign Up */}
        <Link
          href="/signup"
          className="w-full py-3 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2.5"
        >
          <UserPlus size={16} className="text-gray-400" />
          <span>
            Don&apos;t have an account?{' '}
            <span className="text-blue-600 font-semibold">Sign Up</span>
          </span>
        </Link>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#edf2fb] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm space-y-4">
        <LoginForm />
        <p className="text-center text-gray-400 text-xs">
          NxtWave &copy; {new Date().getFullYear()} &bull; Internal Use Only
        </p>
      </div>
    </div>
  );
}
