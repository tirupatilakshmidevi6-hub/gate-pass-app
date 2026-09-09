'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, Eye, EyeOff, LogIn, UserPlus } from 'lucide-react';
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
    <div
      className={shaking ? 'login-shake' : ''}
      style={{ background:'linear-gradient(145deg,rgba(235,245,255,0.92) 0%,rgba(243,238,255,0.92) 100%)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', borderRadius:20, padding:'28px 28px 24px', boxShadow:'0 20px 56px rgba(10,40,120,0.14),0 4px 20px rgba(100,60,200,0.08)' }}
    >
      {/* Brand */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
        <img src={AUTH_LOGO} alt="NxtWave" style={{ height:26, width:'auto', objectFit:'contain', borderRadius:4, flexShrink:0 }} />
        <p style={{ fontSize:10, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'#146EF5', lineHeight:1 }}>
          Gate Pass System
        </p>
      </div>

      {/* Heading */}
      <div style={{ marginBottom:20 }}>
        <h2 style={{ fontSize:22, fontWeight:800, color:'#0F172A', margin:0, lineHeight:1.2 }}>Welcome Back!</h2>
        <p style={{ fontSize:12.5, color:'#64748B', marginTop:5, lineHeight:1.5 }}>Sign in to access your dashboard</p>
      </div>

      <Suspense><SuccessBanner /></Suspense>

      {error && (
        <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:10, padding:'10px 12px', display:'flex', gap:10, alignItems:'flex-start', marginBottom:14 }}>
          <div style={{ width:16, height:16, borderRadius:'50%', background:'#EF4444', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>
            <span style={{ color:'white', fontWeight:900, fontSize:9, lineHeight:1 }}>!</span>
          </div>
          <div>
            <p style={{ fontSize:12, fontWeight:700, color:'#B91C1C', margin:0 }}>Unable to sign in</p>
            <p style={{ fontSize:11.5, color:'#DC2626', marginTop:2 }}>{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Email */}
        <div style={{ marginBottom:14 }}>
          <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:'#374151', marginBottom:6 }}>Email address</label>
          <div style={{ position:'relative' }}>
            <Mail size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#9CA3AF', pointerEvents:'none' }} />
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com"
              style={{ width:'100%', height:46, paddingLeft:36, paddingRight:12, border:'1px solid #E5E7EB', borderRadius:10, fontSize:13, background:'#F9FAFB', color:'#111827', outline:'none', boxSizing:'border-box' }}
              onFocus={e => { e.currentTarget.style.borderColor='#146EF5'; e.currentTarget.style.boxShadow='0 0 0 3px rgba(20,110,245,0.10)'; e.currentTarget.style.background='#fff'; }}
              onBlur={e => { e.currentTarget.style.borderColor='#E5E7EB'; e.currentTarget.style.boxShadow='none'; e.currentTarget.style.background='#F9FAFB'; }}
            />
          </div>
        </div>

        {/* Password */}
        <div style={{ marginBottom:8 }}>
          <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:'#374151', marginBottom:6 }}>Password</label>
          <div style={{ position:'relative' }}>
            <Lock size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#9CA3AF', pointerEvents:'none' }} />
            <input
              type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••"
              style={{ width:'100%', height:46, paddingLeft:36, paddingRight:40, border:'1px solid #E5E7EB', borderRadius:10, fontSize:13, background:'#F9FAFB', color:'#111827', outline:'none', boxSizing:'border-box' }}
              onFocus={e => { e.currentTarget.style.borderColor='#146EF5'; e.currentTarget.style.boxShadow='0 0 0 3px rgba(20,110,245,0.10)'; e.currentTarget.style.background='#fff'; }}
              onBlur={e => { e.currentTarget.style.borderColor='#E5E7EB'; e.currentTarget.style.boxShadow='none'; e.currentTarget.style.background='#F9FAFB'; }}
            />
            <button type="button" onClick={() => setShowPassword(v => !v)} tabIndex={-1}
              style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', color:'#9CA3AF', background:'none', border:'none', cursor:'pointer', padding:0, minHeight:'unset', minWidth:'unset' }}>
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {/* Forgot password */}
        <div style={{ textAlign:'right', marginBottom:18 }}>
          <Link href="/forgot-password" style={{ fontSize:12, color:'#146EF5', fontWeight:600, textDecoration:'none', minHeight:'unset' }}>
            Forgot password?
          </Link>
        </div>

        {/* Sign In */}
        <button type="submit" disabled={loading}
          style={{ width:'100%', height:48, borderRadius:10, border:'none', cursor:'pointer', background:'linear-gradient(135deg,#146EF5,#1A5FE0)', boxShadow:'0 4px 14px rgba(20,110,245,0.35)', color:'white', fontWeight:700, fontSize:13.5, display:'flex', alignItems:'center', justifyContent:'center', gap:8, opacity:loading ? 0.65 : 1 }}>
          {loading
            ? <><span style={{ width:16, height:16, border:'2px solid white', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.7s linear infinite', display:'inline-block' }} />Signing in…</>
            : <><LogIn size={16} />Sign In</>}
        </button>

        {/* OR */}
        <div style={{ display:'flex', alignItems:'center', gap:12, margin:'14px 0' }}>
          <div style={{ flex:1, height:1, background:'#F1F5F9' }} />
          <span style={{ fontSize:11, color:'#94A3B8', fontWeight:600, letterSpacing:'0.08em' }}>OR</span>
          <div style={{ flex:1, height:1, background:'#F1F5F9' }} />
        </div>

        {/* Sign Up */}
        <Link href="/signup"
          style={{ width:'100%', height:44, borderRadius:10, border:'1px solid #E5E7EB', background:'transparent', color:'#6B7280', fontSize:13, fontWeight:500, display:'flex', alignItems:'center', justifyContent:'center', gap:8, textDecoration:'none', minHeight:'unset' }}>
          <UserPlus size={14} style={{ color:'#9CA3AF' }} />
          <span>Don&apos;t have an account? <strong style={{ color:'#146EF5', fontWeight:700 }}>Sign Up</strong></span>
        </Link>
      </form>

      <p style={{ textAlign:'center', fontSize:11, color:'#CBD5E1', marginTop:18 }}>
        NxtWave &copy; 2026 &bull; Internal Use Only
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
