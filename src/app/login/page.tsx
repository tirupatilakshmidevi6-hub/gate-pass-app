'use client';

import { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, Eye, EyeOff, LogIn, UserPlus, ShieldCheck, Zap, Users } from 'lucide-react';
import NxtBot from '@/components/NxtBot';

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
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
        Account created successfully. Please login with your credentials.
      </div>
    );
  if (searchParams.get('reset'))
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
        Password reset successfully. Please login with your new password.
      </div>
    );
  return null;
}

// ─── Left-panel illustration components ───────────────────────────────────────

function GuardIllustration() {
  return (
    <svg
      viewBox="0 0 110 252"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ height: 200, width: 'auto', flexShrink: 0 }}
      preserveAspectRatio="xMidYMax meet"
    >
      {/* Shadow */}
      <ellipse cx="55" cy="246" rx="38" ry="6" fill="rgba(0,0,0,0.18)" />

      {/* Boots */}
      <rect x="24" y="228" width="22" height="14" rx="7" fill="#04152A" />
      <rect x="64" y="228" width="22" height="14" rx="7" fill="#04152A" />

      {/* Legs */}
      <rect x="28" y="170" width="16" height="62" rx="8" fill="#082B5C" />
      <rect x="66" y="170" width="16" height="62" rx="8" fill="#082B5C" />

      {/* Body */}
      <rect x="18" y="83" width="74" height="92" rx="14" fill="#163A78" />

      {/* Collar V */}
      <path d="M48 83 L55 100 L62 83" fill="#0B2650" />

      {/* Chest badge */}
      <rect x="23" y="95" width="22" height="28" rx="5" fill="#146EF5" />
      <rect x="25" y="97" width="18" height="24" rx="4" fill="#D6EAFF" opacity="0.9" />
      <circle cx="34" cy="105" r="5" fill="#8CBEE0" />
      <rect x="26" y="113" width="16" height="2.5" rx="1.5" fill="#8CBEE0" />
      <rect x="26" y="118" width="11" height="2.5" rx="1.5" fill="#8CBEE0" />

      {/* Shoulder patches */}
      <rect x="18" y="83" width="13" height="9" rx="4" fill="#1E55AA" />
      <rect x="79" y="83" width="13" height="9" rx="4" fill="#1E55AA" />

      {/* Left arm */}
      <rect x="2" y="83" width="16" height="62" rx="8" fill="#12336A" />
      <ellipse cx="10" cy="148" rx="9" ry="8" fill="#163A78" />

      {/* Right arm holding tablet */}
      <rect x="92" y="83" width="16" height="52" rx="8" fill="#12336A" />

      {/* Tablet */}
      <rect x="90" y="44" width="32" height="48" rx="7" fill="#0F4CB0" />
      <rect x="90" y="44" width="32" height="48" rx="7" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
      <rect x="93" y="48" width="26" height="40" rx="5" fill="#D4E8FF" />
      {/* Visitor card info */}
      <circle cx="106" cy="58" r="6" fill="#9EC3E8" />
      <rect x="95" y="68" width="22" height="2.5" rx="1.5" fill="#9EC3E8" />
      <rect x="95" y="73" width="16" height="2.5" rx="1.5" fill="#9EC3E8" />
      <rect x="95" y="78" width="19" height="2.5" rx="1.5" fill="#9EC3E8" />
      {/* Approved badge */}
      <rect x="110" y="62" width="14" height="14" rx="4" fill="#16A34A" />
      <path d="M113 69 L116 72 L122 65.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />

      {/* Neck */}
      <rect x="47" y="67" width="16" height="18" rx="7" fill="#1A3F7A" />

      {/* Head */}
      <circle cx="55" cy="46" r="26" fill="#1A3F7A" />

      {/* Eyes */}
      <ellipse cx="43" cy="49" rx="6.5" ry="7.5" fill="white" opacity="0.92" />
      <ellipse cx="67" cy="49" rx="6.5" ry="7.5" fill="white" opacity="0.92" />
      <ellipse cx="43" cy="50.5" rx="3" ry="3.5" fill="#0D2A60" />
      <ellipse cx="67" cy="50.5" rx="3" ry="3.5" fill="#0D2A60" />
      <circle cx="44.5" cy="47.5" r="1.5" fill="white" opacity="0.7" />
      <circle cx="68.5" cy="47.5" r="1.5" fill="white" opacity="0.7" />

      {/* Smile */}
      <path d="M45 60 Q55 68 65 60" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.75" />

      {/* Cap */}
      <path d="M29 44 Q55 26 81 44 L81 50 L29 50 Z" fill="#082B5C" />
      <rect x="25" y="46" width="60" height="8" rx="4" fill="#061A38" />
      {/* Cap badge */}
      <rect x="47" y="29" width="16" height="10" rx="3" fill="#146EF5" />
      <circle cx="55" cy="34" r="4" fill="rgba(255,255,255,0.45)" />
    </svg>
  );
}

function GateArch() {
  return (
    <svg
      viewBox="0 0 260 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="absolute bottom-0 left-1/2 -translate-x-1/2 pointer-events-none"
      style={{ width: '100%', maxWidth: 300, opacity: 0.08 }}
    >
      <rect x="12" y="30" width="26" height="130" rx="5" fill="white" />
      <rect x="222" y="30" width="26" height="130" rx="5" fill="white" />
      <path d="M12 30 Q130 -10 248 30" stroke="white" strokeWidth="6" fill="none" strokeLinecap="round" />
      <rect x="0" y="153" width="260" height="7" rx="3.5" fill="white" />
    </svg>
  );
}

function PassPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div
      className="flex items-center gap-2 rounded-full border border-white/20 px-3 py-1.5"
      style={{ background: 'rgba(255,255,255,0.10)', backdropFilter: 'blur(8px)' }}
    >
      <span className="text-blue-200 flex-shrink-0" style={{ width: 14, height: 14 }}>
        {icon}
      </span>
      <span className="text-white text-xs font-medium whitespace-nowrap">{label}</span>
    </div>
  );
}

function FeatureBadge({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(255,255,255,0.10)' }}
      >
        {icon}
      </div>
      <div>
        <div className="text-sm font-bold text-white leading-tight">{title}</div>
        <div className="text-[11px] text-blue-200 leading-tight">{sub}</div>
      </div>
    </div>
  );
}

// ─── Login form — auth logic UNCHANGED, visual layer replaced ─────────────────

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
      if (!ok) {
        setError(data.error ?? 'Login failed');
        triggerShake();
        return;
      }
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
    <div
      className={`bg-white rounded-2xl p-7 sm:p-8 space-y-5 ${shaking ? 'login-shake' : ''}`}
      style={{ boxShadow: '0 20px 60px rgba(15,50,100,0.10), 0 4px 16px rgba(0,0,0,0.06)' }}
    >
      {/* Brand */}
      <div className="flex items-center gap-3">
        <img src="/nxtwave-logo-icon.svg" alt="NxtWave" className="h-10 w-10 rounded-lg flex-shrink-0" />
        <div>
          <p className="text-base font-bold text-gray-900 leading-tight">NxtWave</p>
          <p className="text-[10px] font-semibold text-gray-400 tracking-[0.14em] uppercase">Gate Pass System</p>
        </div>
      </div>

      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 leading-tight">Welcome Back!</h2>
        <p className="text-sm text-gray-500 mt-1">Sign in to your account to continue</p>
      </div>

      <Suspense><SuccessBanner /></Suspense>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2.5">
          <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-white font-bold leading-none" style={{ fontSize: 9 }}>!</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-red-700 leading-tight">Unable to sign in</p>
            <p className="text-xs text-red-600 mt-0.5 leading-snug">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-gray-700">Email address</label>
          <div className="relative">
            <Mail
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              style={{ height: 50 }}
              className="w-full pl-10 pr-4 border border-gray-200 rounded-xl text-sm bg-gray-50 placeholder:text-gray-300 focus:outline-none focus:border-[#146EF5] focus:ring-[3px] focus:ring-[#146EF5]/10 transition-all duration-200"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-gray-700">Password</label>
          <div className="relative">
            <Lock
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={{ height: 50 }}
              className="w-full pl-10 pr-11 border border-gray-200 rounded-xl text-sm bg-gray-50 placeholder:text-gray-300 focus:outline-none focus:border-[#146EF5] focus:ring-[3px] focus:ring-[#146EF5]/10 transition-all duration-200"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              style={{ minHeight: 'unset', minWidth: 'unset', padding: 0 }}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Forgot password */}
        <div className="text-right -mt-1">
          <Link
            href="/forgot-password"
            className="text-sm text-[#146EF5] font-medium hover:text-blue-700 transition-colors"
            style={{ minHeight: 'unset' }}
          >
            Forgot password?
          </Link>
        </div>

        {/* Sign In */}
        <button
          type="submit"
          disabled={loading}
          className="w-full text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
          style={{
            height: 52,
            background: 'linear-gradient(135deg, #146EF5 0%, #2563EB 100%)',
            boxShadow: '0 4px 14px rgba(20,110,245,0.35)',
          }}
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Signing in…
            </>
          ) : (
            <>
              <LogIn size={17} />
              Sign In
            </>
          )}
        </button>

        {/* OR */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400 font-medium tracking-wide">OR</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Sign Up */}
        <Link
          href="/signup"
          className="w-full border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2.5"
          style={{ height: 48, minHeight: 48 }}
        >
          <UserPlus size={16} className="text-gray-400" />
          <span>
            Don&apos;t have an account?{' '}
            <span className="text-[#146EF5] font-semibold">Sign Up</span>
          </span>
        </Link>
      </form>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  return (
    <div className="min-h-screen flex overflow-hidden" style={{ background: '#F4F8FF' }}>

      {/* ══ LEFT PANEL ══════════════════════════════════════════════════════════ */}
      <div
        className="login-panel-left hidden md:flex flex-col w-[52%] lg:w-[54%] relative overflow-hidden"
        style={{
          background: 'linear-gradient(148deg, #082B5C 0%, #0B3B82 50%, #0F52C0 100%)',
          clipPath: 'polygon(0 0, 100% 0, 90% 100%, 0 100%)',
        }}
      >
        {/* Background blob glows */}
        <div
          className="login-blob absolute pointer-events-none"
          style={{
            top: '-12%', right: '-4%', width: '55%', height: '55%',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(20,110,245,0.38) 0%, transparent 70%)',
          }}
        />
        <div
          className="login-blob-2 absolute pointer-events-none"
          style={{
            bottom: '4%', left: '-6%', width: '48%', height: '48%',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(11,59,130,0.65) 0%, transparent 70%)',
          }}
        />
        <div
          className="login-blob-3 absolute pointer-events-none"
          style={{
            top: '38%', left: '32%', width: '32%', height: '32%',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(20,110,245,0.18) 0%, transparent 70%)',
          }}
        />

        {/* Subtle diagonal grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            opacity: 0.04,
            backgroundImage: 'repeating-linear-gradient(45deg, white 0px, white 1px, transparent 1px, transparent 56px)',
          }}
        />

        {/* ── Logo header ── */}
        <div className="relative z-10 flex items-center gap-3 px-10 pt-8">
          <img src="/nxtwave-logo-icon.svg" alt="NxtWave" className="h-10 w-10 rounded-lg flex-shrink-0" />
          <div>
            <p className="text-base font-bold text-white leading-tight">NxtWave</p>
            <p className="text-[10px] font-semibold text-blue-200 tracking-[0.14em] uppercase">Gate Pass System</p>
          </div>
        </div>

        {/* ── Main content ── */}
        <div className="relative z-10 flex-1 flex flex-col justify-center px-10 py-4">
          <h1 className="text-3xl xl:text-4xl font-bold text-white leading-tight">
            Secure Access,
            <br />
            <span style={{ color: '#7DB8FF' }}>Smarter Entry</span>
          </h1>
          <p className="text-sm text-blue-200 mt-3 leading-relaxed" style={{ maxWidth: 300 }}>
            Manage gate passes, track visitors, and keep your campus secure — all in one place.
          </p>

          {/* ── Illustration scene ── */}
          <div className="relative mt-8 w-full" style={{ maxWidth: 420, minHeight: 230 }}>
            <GateArch />

            {/* Pass type pills — top right of scene */}
            <div className="absolute right-0 top-0 flex flex-col gap-2">
              <PassPill
                label="Visitors"
                icon={
                  <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 14, height: 14 }}>
                    <path d="M8 8a3 3 0 100-6 3 3 0 000 6zm-5 6a5 5 0 1110 0H3z" />
                  </svg>
                }
              />
              <PassPill
                label="Interviews"
                icon={
                  <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 14, height: 14 }}>
                    <path d="M4 1h8a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V3a2 2 0 012-2zm1 3v1.5h6V4H5zm0 3v1.5h6V7H5zm0 3v1.5h4V10H5z" />
                  </svg>
                }
              />
              <PassPill
                label="Employees"
                icon={
                  <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 14, height: 14 }}>
                    <path d="M13 12.5a5 5 0 00-10 0H1.5a6.5 6.5 0 0113 0H13zM8 9a3 3 0 100-6 3 3 0 000 6z" />
                  </svg>
                }
              />
              <PassPill
                label="Vendors"
                icon={
                  <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 14, height: 14 }}>
                    <path d="M1 3l1.5-2h11L15 3v11a1 1 0 01-1 1H2a1 1 0 01-1-1V3zm5 7a2 2 0 104 0 2 2 0 00-4 0z" />
                  </svg>
                }
              />
            </div>

            {/* Guard + NxtBot — bottom-aligned */}
            <div className="flex items-end gap-3">
              <GuardIllustration />
              <div style={{ marginBottom: 8 }}>
                <NxtBot size={82} float />
              </div>
            </div>
          </div>
        </div>

        {/* ── Feature badges ── */}
        <div className="relative z-10 flex items-center gap-5 xl:gap-7 px-10 pb-8" style={{ maxWidth: 380 }}>
          <FeatureBadge
            icon={<ShieldCheck size={17} className="text-blue-300" />}
            title="Secure"
            sub="Access Control"
          />
          <FeatureBadge
            icon={<Zap size={17} className="text-blue-300" />}
            title="Fast"
            sub="Digital Passes"
          />
          <FeatureBadge
            icon={<Users size={17} className="text-blue-300" />}
            title="Efficient"
            sub="Visitor Mgmt"
          />
        </div>
      </div>

      {/* ══ RIGHT PANEL ═════════════════════════════════════════════════════════ */}
      <div className="login-panel-right flex-1 flex flex-col items-center justify-center relative px-4 py-8 md:py-12">

        {/* Subtle corner radial glows */}
        <div
          className="absolute top-0 right-0 w-80 h-80 pointer-events-none"
          style={{ background: 'radial-gradient(circle at top right, #DBEAFE 0%, transparent 65%)', opacity: 0.6 }}
        />
        <div
          className="absolute bottom-0 right-0 w-64 h-64 pointer-events-none"
          style={{ background: 'radial-gradient(circle at bottom right, #EFF6FF 0%, transparent 65%)', opacity: 0.5 }}
        />
        <div
          className="absolute bottom-0 left-0 w-48 h-48 pointer-events-none"
          style={{ background: 'radial-gradient(circle at bottom left, #EEF5FF 0%, transparent 70%)', opacity: 0.4 }}
        />

        {/* Mobile brand (hidden on md+) */}
        <div className="md:hidden flex items-center gap-3 mb-6">
          <img src="/nxtwave-logo-icon.svg" alt="NxtWave" className="h-9 w-9 rounded-lg" />
          <div>
            <p className="text-base font-bold text-gray-900 leading-tight">NxtWave</p>
            <p className="text-[10px] font-semibold text-gray-400 tracking-widest uppercase">Gate Pass System</p>
          </div>
        </div>

        {/* Login card + footer */}
        <div className="relative z-10 w-full max-w-md">
          <LoginForm />
          <p className="text-center text-xs text-gray-400 mt-5">
            NxtWave &copy; 2026 &bull; Internal Use Only
          </p>
        </div>
      </div>
    </div>
  );
}
