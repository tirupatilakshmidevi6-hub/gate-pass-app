'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, UserPlus, LogIn } from 'lucide-react';

const DROPDOWN_OPTIONS = [
  { value: 'admin',      label: 'Admin',          reserved: true  },
  { value: 'ta',         label: 'TA',             reserved: true  },
  { value: 'facilities', label: 'Facilities Team', reserved: true  },
  { value: 'other',      label: 'Other',           reserved: false },
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

// ── Shared brand header (matches login page) ──────────────────────────────────
function BrandHeader() {
  return (
    <>
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
    </>
  );
}

// ── Shared input class ────────────────────────────────────────────────────────
const INPUT = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 placeholder:text-gray-300';
const LABEL = 'block text-sm font-semibold text-gray-700 mb-1.5';

export default function SignupPage() {
  const router = useRouter();

  const [availability, setAvailability] = useState<Record<string, boolean>>({});
  const [checking,  setChecking]  = useState(true);
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    roleSelect: '',
    customRole: '',
  });
  const [showPassword,        setShowPassword]        = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch('/api/signup')
      .then(async (r) => { try { return await r.json(); } catch { return {}; } })
      .then((d) => { setAvailability(d.availability ?? {}); setChecking(false); })
      .catch(() => setChecking(false));
  }, []);

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  const actualRole = form.roleSelect === 'other' ? form.customRole.trim() : form.roleSelect;

  const needsApproval =
    form.roleSelect === 'other' || availability[form.roleSelect] === false;

  const isFirstReserved =
    ['admin', 'ta', 'facilities'].includes(form.roleSelect) &&
    availability[form.roleSelect] === true;

  const isSubsequentReserved =
    ['admin', 'ta', 'facilities'].includes(form.roleSelect) &&
    availability[form.roleSelect] === false;

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setError('');
    if (!form.name.trim())        { setError('Full name is required'); return; }
    if (!form.email.trim())       { setError('Email address is required'); return; }
    if (!form.roleSelect)         { setError('Please select a role'); return; }
    if (form.roleSelect === 'other' && !form.customRole.trim()) {
      setError('Please enter your role'); return;
    }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }

    setLoading(true);
    try {
      const { ok, data } = await safePost('/api/signup', {
        name:            form.name.trim(),
        email:           form.email.trim(),
        password:        form.password,
        confirmPassword: form.confirmPassword,
        role:            actualRole,
      });
      if (!ok) { setError(data.error ?? 'Sign up failed'); return; }
      if (data.status === 'pending_approval') {
        setSubmitted(true);
      } else {
        router.push('/login?registered=1');
      }
    } catch {
      setError('Unable to reach the server. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── Loading ───────────────────────────────────────────────────────────────────
  if (checking) {
    return (
      <div className="min-h-screen bg-[#edf2fb] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Pending approval screen ───────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-[#edf2fb] flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm space-y-4">
          <div className="bg-white rounded-3xl shadow-md overflow-hidden">
            <BrandHeader />
            <div className="px-8 py-8 text-center space-y-5">
              <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Request Submitted</h2>
                <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                  Your account request has been submitted and is pending Admin approval.
                  You will receive an email once approved.
                </p>
              </div>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-sm text-blue-600 font-semibold hover:underline"
              >
                <LogIn size={14} /> Back to Sign In
              </Link>
            </div>
          </div>
          <p className="text-center text-gray-400 text-xs">
            NxtWave &copy; {new Date().getFullYear()} &bull; Internal Use Only
          </p>
        </div>
      </div>
    );
  }

  // ── Sign-up form ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#edf2fb] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm space-y-4">

        <div className="bg-white rounded-3xl shadow-md overflow-hidden">
          <BrandHeader />

          {/* Welcome line */}
          <div className="flex items-center gap-4 px-8 pt-6 pb-2">
            <div className="w-11 h-11 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
              <UserPlus size={19} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 leading-tight">Create account</h2>
              <p className="text-sm text-gray-400 mt-0.5">Join the NxtWave Gate Pass System</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="px-8 pt-5 pb-8 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Full Name */}
            <div>
              <label className={LABEL}>Full Name</label>
              <input
                type="text" value={form.name} onChange={set('name')} required
                placeholder="Enter your full name"
                className={INPUT}
              />
            </div>

            {/* Email */}
            <div>
              <label className={LABEL}>Email Address</label>
              <input
                type="email" value={form.email} onChange={set('email')} required
                placeholder="you@example.com"
                className={INPUT}
              />
            </div>

            {/* Role */}
            <div>
              <label className={LABEL}>Role</label>
              <select
                value={form.roleSelect} onChange={set('roleSelect')} required
                className={INPUT + ' cursor-pointer'}
              >
                <option value="">Select your role…</option>
                {DROPDOWN_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>

              {form.roleSelect === 'other' && (
                <input
                  type="text" value={form.customRole} onChange={set('customRole')} required
                  placeholder="Enter your role"
                  className={INPUT + ' mt-2'}
                />
              )}

              {form.roleSelect && (
                <div className={`mt-2 flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs leading-relaxed ${
                  needsApproval
                    ? 'bg-amber-50 border border-amber-200 text-amber-700'
                    : 'bg-green-50 border border-green-200 text-green-700'
                }`}>
                  <span className="mt-0.5 flex-shrink-0">{needsApproval ? '⏳' : '✓'}</span>
                  <span>
                    {isFirstReserved &&
                      `You will be the first ${ROLE_DISPLAY[form.roleSelect]}. Your account will be activated immediately.`}
                    {isSubsequentReserved &&
                      `The ${ROLE_DISPLAY[form.roleSelect]} role is already assigned. Your request will be sent to Admin for approval.`}
                    {form.roleSelect === 'other' &&
                      'Your account will require Admin approval before you can log in.'}
                  </span>
                </div>
              )}
            </div>

            {/* Password */}
            <div>
              <label className={LABEL}>
                Password <span className="text-gray-400 font-normal text-xs">(min. 8 characters)</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password} onChange={set('password')} required
                  minLength={8} placeholder="Create a strong password"
                  className={INPUT + ' pr-11'}
                />
                <button
                  type="button" tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className={LABEL}>Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={form.confirmPassword} onChange={set('confirmPassword')} required
                  placeholder="Re-enter your password"
                  className={INPUT + ' pr-11'}
                />
                <button
                  type="button" tabIndex={-1}
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || (form.roleSelect === 'other' && !form.customRole.trim())}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-sm mt-1"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {needsApproval ? 'Sending request…' : 'Creating account…'}
                </>
              ) : (
                needsApproval ? 'Send Request' : 'Create Account'
              )}
            </button>

            {/* OR + Sign In */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 font-medium tracking-wide">OR</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <Link
              href="/login"
              className="w-full py-3 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2.5"
            >
              <LogIn size={16} className="text-gray-400" />
              <span>
                Already have an account?{' '}
                <span className="text-blue-600 font-semibold">Sign In</span>
              </span>
            </Link>
          </form>
        </div>

        <p className="text-center text-gray-400 text-xs">
          NxtWave &copy; {new Date().getFullYear()} &bull; Internal Use Only
        </p>
      </div>
    </div>
  );
}
