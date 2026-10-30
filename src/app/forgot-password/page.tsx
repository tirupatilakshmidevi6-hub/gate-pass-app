'use client';

import { useState } from 'react';
import Link from 'next/link';
import AuthLayout, { AUTH_LOGO } from '@/components/AuthLayout';

function ForgotPasswordForm() {
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState('');

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-brand">
        <img src={AUTH_LOGO} alt="NxtWave" />
        <span>Gate Pass System</span>
      </div>

      {sent ? (
        <div className="auth-center">
          <div className="auth-icon-circle" style={{ background: '#F0FDF4' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 className="auth-title">Reset link sent</h1>
          <p className="auth-sub" style={{ marginBottom: 16 }}>
            If this email is registered, you will receive a password reset link shortly. The link expires in 1 hour.
          </p>
          <Link href="/login" className="auth-link" style={{ fontSize: 13 }}>Back to sign in</Link>
        </div>
      ) : (
        <>
          <h1 className="auth-title">Forgot password?</h1>
          <p className="auth-sub">Enter your email and we&apos;ll send you a reset link.</p>

          {error && <div className="auth-error" role="alert">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="auth-field" style={{ marginBottom: 14 }}>
              <label className="auth-label" htmlFor="email">Work email<i>*</i></label>
              <input id="email" className="auth-input" type="email" value={email} onChange={e => setEmail(e.target.value)}
                required placeholder="you@company.com" autoComplete="email" />
            </div>

            <button type="submit" disabled={loading} className="auth-btn">
              {loading
                ? <><span style={{ width: 15, height: 15, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />Sending…</>
                : 'Send reset link'}
            </button>
          </form>

          <div className="auth-divider" />
          <p className="auth-foot">
            Remembered it? <Link href="/login" className="auth-link">Sign in</Link>
          </p>
        </>
      )}
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <AuthLayout>
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
