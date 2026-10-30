'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthLayout, { AUTH_LOGO } from '@/components/AuthLayout';

const DROPDOWN_OPTIONS = [
  { value: 'admin',      label: 'Admin',           reserved: true  },
  { value: 'ta',         label: 'TA',              reserved: true  },
  { value: 'facilities', label: 'Facilities Team',  reserved: true  },
  { value: 'other',      label: 'Other',            reserved: false },
];

const ROLE_DISPLAY: Record<string, string> = {
  admin:      'Admin',
  ta:         'TA',
  facilities: 'Facilities Team',
};

async function safePost(url: string, body: unknown) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  let data: Record<string, string> = {};
  try { data = await res.json(); } catch { data = { error: `Server error (${res.status})` }; }
  return { ok: res.ok, data };
}

// ─── Success / pending screen ─────────────────────────────────────────────────

function SubmittedCard() {
  return (
    <div className="auth-card">
      <div className="auth-brand">
        <img src={AUTH_LOGO} alt="NxtWave" />
        <span>Gate Pass System</span>
      </div>
      <div className="auth-center">
        <div className="auth-icon-circle" style={{ background: '#FFFBEB' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <h1 className="auth-title">Request submitted</h1>
        <p className="auth-sub" style={{ marginBottom: 16 }}>
          Your account request is pending Admin approval. You will receive an email once approved.
        </p>
        <Link href="/login" className="auth-link" style={{ fontSize: 13 }}>Back to sign in</Link>
      </div>
    </div>
  );
}

// ─── Signup form ──────────────────────────────────────────────────────────────

function SignupForm() {
  const router = useRouter();
  const [availability, setAvailability] = useState<Record<string, boolean>>({});
  const [checking,  setChecking]  = useState(true);
  const [form, setForm] = useState({ name:'', email:'', password:'', confirmPassword:'', roleSelect:'', customRole:'' });
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch('/api/signup')
      .then(async r => { try { return await r.json(); } catch { return {}; } })
      .then(d => { setAvailability(d.availability ?? {}); setChecking(false); })
      .catch(() => setChecking(false));
  }, []);

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }));
  }

  const actualRole = form.roleSelect === 'other' ? form.customRole.trim() : form.roleSelect;
  const needsApproval = form.roleSelect === 'other' || availability[form.roleSelect] === false;
  const isFirstReserved = ['admin','ta','facilities'].includes(form.roleSelect) && availability[form.roleSelect] === true;
  const isSubsequentReserved = ['admin','ta','facilities'].includes(form.roleSelect) && availability[form.roleSelect] === false;

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setError('');
    if (!form.name.trim())         { setError('Full name is required'); return; }
    if (!form.email.trim())        { setError('Email address is required'); return; }
    if (!form.roleSelect)          { setError('Please select a role'); return; }
    if (form.roleSelect === 'other' && !form.customRole.trim()) { setError('Please enter your role'); return; }
    if (form.password.length < 8)  { setError('Password must be at least 8 characters'); return; }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      const { ok, data } = await safePost('/api/signup', {
        name: form.name.trim(), email: form.email.trim(),
        password: form.password, confirmPassword: form.confirmPassword, role: actualRole,
      });
      if (!ok) { setError(data.error ?? 'Sign up failed'); return; }
      if (data.status === 'pending_approval') setSubmitted(true);
      else router.push('/login?registered=1');
    } catch {
      setError('Unable to reach the server. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="auth-card" style={{ textAlign: 'center', padding: 36 }}>
        <span style={{ width: 28, height: 28, border: '3px solid #DDD6FE', borderTopColor: '#6D4AE0', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
      </div>
    );
  }

  if (submitted) return <SubmittedCard />;

  const blocked = loading || (form.roleSelect === 'other' && !form.customRole.trim());

  return (
    <div className="auth-card">
      <div className="auth-brand">
        <img src={AUTH_LOGO} alt="NxtWave" />
        <span>Gate Pass System</span>
      </div>

      <h1 className="auth-title">Create account</h1>
      <p className="auth-sub">Join the NxtWave Gate Pass System.</p>

      {error && <div className="auth-error" role="alert">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="auth-field">
          <label className="auth-label" htmlFor="name">Full name<i>*</i></label>
          <input id="name" className="auth-input" type="text" value={form.name} onChange={set('name')} required placeholder="Enter your full name" autoComplete="name" />
        </div>

        <div className="auth-field">
          <label className="auth-label" htmlFor="email">Work email<i>*</i></label>
          <input id="email" className="auth-input" type="email" value={form.email} onChange={set('email')} required placeholder="you@company.com" autoComplete="email" />
        </div>

        <div className="auth-field">
          <label className="auth-label" htmlFor="role">Role<i>*</i></label>
          <select id="role" className="auth-input" value={form.roleSelect} onChange={set('roleSelect')} required style={{ cursor: 'pointer' }}>
            <option value="">Select your role…</option>
            {DROPDOWN_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {form.roleSelect === 'other' && (
            <input className="auth-input" type="text" value={form.customRole} onChange={set('customRole')} required
              placeholder="Enter your role" style={{ marginTop: 8 }} />
          )}

          {form.roleSelect && (
            <div className="auth-note" style={needsApproval
              ? { background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E' }
              : { background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#166534' }}>
              {isFirstReserved && `You will be the first ${ROLE_DISPLAY[form.roleSelect]}. Your account will be activated immediately.`}
              {isSubsequentReserved && `The ${ROLE_DISPLAY[form.roleSelect]} role is already assigned. Your request will be sent to Admin for approval.`}
              {form.roleSelect === 'other' && 'Your account will require Admin approval before you can sign in.'}
            </div>
          )}
        </div>

        <div className="auth-grid-2" style={{ marginBottom: 8 }}>
          <div>
            <label className="auth-label" htmlFor="password">Password<i>*</i></label>
            <input id="password" className="auth-input" type={showPwd ? 'text' : 'password'} value={form.password} onChange={set('password')}
              required minLength={8} placeholder="Min. 8 characters" autoComplete="new-password" />
          </div>
          <div>
            <label className="auth-label" htmlFor="confirm">Confirm<i>*</i></label>
            <input id="confirm" className="auth-input" type={showPwd ? 'text' : 'password'} value={form.confirmPassword} onChange={set('confirmPassword')}
              required placeholder="Re-enter" autoComplete="new-password" />
          </div>
        </div>

        <div className="auth-row">
          <label className="auth-check">
            <input type="checkbox" checked={showPwd} onChange={e => setShowPwd(e.target.checked)} />
            Show passwords
          </label>
        </div>

        <button type="submit" disabled={blocked} className="auth-btn">
          {loading
            ? <><span style={{ width: 15, height: 15, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />{needsApproval ? 'Sending request…' : 'Creating account…'}</>
            : (needsApproval ? 'Send request' : 'Create account')}
        </button>
      </form>

      <div className="auth-divider" />
      <p className="auth-foot">
        Already have an account? <Link href="/login" className="auth-link">Sign in</Link>
      </p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SignupPage() {
  return (
    <AuthLayout>
      <SignupForm />
    </AuthLayout>
  );
}
