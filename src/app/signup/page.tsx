'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// All four options are always visible in the dropdown.
// Reserved roles (Admin / TA / Facilities Team): first signup = active, subsequent = pending_approval.
// "Other": always pending_approval.
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

export default function SignupPage() {
  const router = useRouter();

  // availability[role] = true  → role is unclaimed (first signup will be active)
  // availability[role] = false → role already has an active holder (will be pending)
  const [availability, setAvailability] = useState<Record<string, boolean>>({});
  const [checking,  setChecking]  = useState(true);
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    roleSelect: '',   // selected dropdown value
    customRole: '',   // free-text shown only when roleSelect === 'other'
  });
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

  // The role value actually sent to the API:
  //   - reserved selections → use the dropdown value (admin / ta / facilities)
  //   - "other" → use the typed customRole
  const actualRole = form.roleSelect === 'other'
    ? form.customRole.trim()
    : form.roleSelect;

  // Will this signup require Admin approval?
  const needsApproval =
    form.roleSelect === 'other' ||
    availability[form.roleSelect] === false;

  // Info chip state
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

      if (!ok) {
        setError(data.error ?? 'Sign up failed');
        return;
      }

      if (data.status === 'pending_approval') {
        setSubmitted(true);
      } else {
        // Active immediately → redirect to login with success message
        router.push('/login?registered=1');
      }
    } catch {
      setError('Unable to reach the server. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Pending confirmation screen ──────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <Logo />
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center space-y-5">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Request Submitted</h2>
              <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                Your account request has been submitted and is pending Admin approval.
                You will receive an email once approved.
              </p>
            </div>
            <Link href="/login" className="inline-block text-sm text-blue-700 font-semibold hover:underline">
              ← Back to Sign In
            </Link>
          </div>
          <Footer />
        </div>
      </div>
    );
  }

  // ── Sign-up form ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Logo />

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">Create your account</h2>
            <p className="text-sm text-gray-500 mt-0.5">Join the NxtWave Gate Pass System</p>
          </div>

          <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
              <input
                type="text" value={form.name} onChange={set('name')} required
                placeholder="Enter your full name"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
              <input
                type="email" value={form.email} onChange={set('email')} required
                placeholder="you@example.com"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Role — all 4 options always shown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
              <select
                value={form.roleSelect} onChange={set('roleSelect')} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Select your role…</option>
                {DROPDOWN_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>

              {/* Free-text input when "Other" is selected */}
              {form.roleSelect === 'other' && (
                <div className="mt-2">
                  <input
                    type="text" value={form.customRole} onChange={set('customRole')} required
                    placeholder="Enter your role (e.g. Vendor, Contractor, Visitor…)"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Info chip — shown whenever a role is selected */}
              {form.roleSelect && (
                <div className={`mt-2 flex items-start gap-2 rounded-lg px-3 py-2 text-xs leading-relaxed ${
                  needsApproval
                    ? 'bg-amber-50 border border-amber-200 text-amber-700'
                    : 'bg-green-50 border border-green-200 text-green-700'
                }`}>
                  <span className="mt-0.5 flex-shrink-0">{needsApproval ? '⏳' : '✓'}</span>
                  <span>
                    {isFirstReserved &&
                      `You will be the first ${ROLE_DISPLAY[form.roleSelect]}. Your account will be activated immediately after signup.`}
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
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Password <span className="text-gray-400 font-normal">(min. 8 characters)</span>
              </label>
              <input
                type="password" value={form.password} onChange={set('password')} required
                minLength={8} placeholder="Create a strong password"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
              <input
                type="password" value={form.confirmPassword} onChange={set('confirmPassword')} required
                placeholder="Re-enter your password"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading || (form.roleSelect === 'other' && !form.customRole.trim())}
              className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-semibold rounded-lg text-sm transition-colors mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {needsApproval ? 'Sending request…' : 'Creating account…'}
                </span>
              ) : (
                needsApproval ? 'Send Request' : 'Create Account'
              )}
            </button>
          </form>

          <div className="px-8 pb-6 text-center border-t border-gray-100 pt-4">
            <p className="text-sm text-gray-500">
              Already have an account?{' '}
              <Link href="/login" className="text-blue-700 font-semibold hover:underline">Sign In</Link>
            </p>
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
}

function Logo() {
  return (
    <div className="text-center mb-8">
      <div className="flex justify-center mb-4">
        <div className="bg-white rounded-2xl px-5 py-3 shadow-lg">
          <img
            src="https://www.image2url.com/r2/default/images/1779254824307-0fca63d9-e1eb-4ccf-bfb4-4c663ca4ae5e.jpeg"
            alt="NxtWave" className="h-12 w-auto object-contain"
          />
        </div>
      </div>
      <p className="text-blue-300 text-sm mt-1 tracking-wide">Gate Pass System</p>
    </div>
  );
}

function Footer() {
  return (
    <p className="text-center text-blue-400 text-xs mt-6">
      NxtWave &copy; {new Date().getFullYear()} &bull; Internal Use Only
    </p>
  );
}
