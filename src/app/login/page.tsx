'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AuthLayout, { AUTH_LOGO } from '@/components/AuthLayout';

// ─── Auth helpers — UNCHANGED ─────────────────────────────────────────────────

async function safePost(
  url: string,
  body: unknown,
): Promise<{ ok: boolean; status: number; data: Record<string, string> }> {
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
  if (searchParams.get('registered'))
    return <div className="auth-ok">Account created successfully. Please sign in.</div>;
  if (searchParams.get('reset'))
    return <div className="auth-ok">Password reset successfully. Please sign in with your new password.</div>;
  return null;
}

// ─── Login form ───────────────────────────────────────────────────────────────

function LoginForm() {
  const router = useRouter();
  const [email,        setEmail]       = useState('');
  const [password,     setPassword]    = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading,      setLoading]     = useState(false);
  const [error,        setError]       = useState('');
  const [shaking,      setShaking]     = useState(false);

  function triggerShake() {
    setShaking(true);
    setTimeout(() => setShaking(false), 380);
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { ok, data } = await safePost('/api/auth/login', { email, password });
      if (!ok) { setError(data.error ?? 'Login failed'); triggerShake(); return; }
      if (data.role === 'facilities') router.push('/approvals');
      else if (data.role === 'admin' || data.role === 'ta') router.push('/');
      else router.push('/welcome');
      router.refresh();
    } catch {
      setError('Unable to reach the server. Please check your connection and try again.');
      triggerShake();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`auth-card ${shaking ? 'login-shake' : ''}`}>
      <div className="auth-brand">
        <img src={AUTH_LOGO} alt="NxtWave" />
        <span>Gate Pass System</span>
      </div>

      <h1 className="auth-title">Sign in</h1>
      <p className="auth-sub">Use your work email and password.</p>

      <Suspense><SuccessBanner /></Suspense>

      {error && <div className="auth-error" role="alert">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="auth-field">
          <label className="auth-label" htmlFor="email">Work email<i>*</i></label>
          <input id="email" className="auth-input" type="email" value={email} onChange={e => setEmail(e.target.value)}
            required placeholder="you@company.com" autoComplete="email" />
        </div>

        <div className="auth-field" style={{ marginBottom: 8 }}>
          <label className="auth-label" htmlFor="password">Password<i>*</i></label>
          <input id="password" className="auth-input" type={showPassword ? 'text' : 'password'} value={password}
            onChange={e => setPassword(e.target.value)} required placeholder="Enter your password" autoComplete="current-password" />
        </div>

        <div className="auth-row">
          <label className="auth-check">
            <input type="checkbox" checked={showPassword} onChange={e => setShowPassword(e.target.checked)} />
            Show password
          </label>
          <Link href="/forgot-password" className="auth-link">Forgot password?</Link>
        </div>

        <button type="submit" disabled={loading} className="auth-btn">
          {loading
            ? <><span style={{ width: 15, height: 15, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />Signing in…</>
            : 'Sign in'}
        </button>
      </form>

      <div className="auth-divider" />
      <p className="auth-foot">
        Don&apos;t have an account? <Link href="/signup" className="auth-link">Create account</Link>
      </p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  return (
    <AuthLayout>
      <LoginForm />
    </AuthLayout>
  );
}
