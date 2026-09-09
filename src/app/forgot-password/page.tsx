'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, LogIn } from 'lucide-react';
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
    <div style={{ background:'linear-gradient(145deg,rgba(235,245,255,0.92) 0%,rgba(243,238,255,0.92) 100%)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', borderRadius:20, padding:'28px 28px 24px', boxShadow:'0 20px 56px rgba(10,40,120,0.14),0 4px 20px rgba(100,60,200,0.08)' }}>
      {/* Brand */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
        <img src={AUTH_LOGO} alt="NxtWave" style={{ height:24, width:'auto', objectFit:'contain', borderRadius:4, flexShrink:0 }} />
        <p style={{ fontSize:10, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'#146EF5', lineHeight:1 }}>
          Gate Pass System
        </p>
      </div>

      {sent ? (
        /* ── Success state ── */
        <div style={{ textAlign:'center', padding:'8px 0 12px' }}>
          <div style={{ width:52, height:52, background:'#F0FDF4', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 style={{ fontSize:18, fontWeight:800, color:'#0F172A', margin:'0 0 8px' }}>Reset link sent!</h2>
          <p style={{ fontSize:13, color:'#64748B', lineHeight:1.6, margin:'0 0 20px' }}>
            If this email is registered, you will receive a password reset link shortly. The link expires in 1 hour.
          </p>
          <Link href="/login" style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:13, color:'#146EF5', fontWeight:600, textDecoration:'none' }}>
            <LogIn size={14} /> Back to Sign In
          </Link>
        </div>
      ) : (
        /* ── Form state ── */
        <>
          <div style={{ marginBottom:20 }}>
            <h2 style={{ fontSize:20, fontWeight:800, color:'#0F172A', margin:0, lineHeight:1.2 }}>Forgot Password?</h2>
            <p style={{ fontSize:12.5, color:'#64748B', marginTop:5, lineHeight:1.5 }}>
              Enter your email and we&apos;ll send you a reset link
            </p>
          </div>

          {error && (
            <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:10, padding:'9px 12px', display:'flex', gap:9, alignItems:'flex-start', marginBottom:14 }}>
              <div style={{ width:15, height:15, borderRadius:'50%', background:'#EF4444', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>
                <span style={{ color:'white', fontWeight:900, fontSize:8.5, lineHeight:1 }}>!</span>
              </div>
              <p style={{ fontSize:12, color:'#B91C1C', margin:0 }}>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom:16 }}>
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

            <button type="submit" disabled={loading}
              style={{ width:'100%', height:46, borderRadius:10, border:'none', cursor:'pointer', background:'linear-gradient(135deg,#146EF5,#1A5FE0)', boxShadow:'0 4px 14px rgba(20,110,245,0.35)', color:'white', fontWeight:700, fontSize:13.5, display:'flex', alignItems:'center', justifyContent:'center', gap:8, opacity:loading ? 0.65 : 1 }}>
              {loading
                ? <><span style={{ width:15, height:15, border:'2px solid white', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.7s linear infinite', display:'inline-block' }} />Sending…</>
                : 'Send Reset Link'}
            </button>
          </form>

          {/* OR + back to sign in */}
          <div style={{ display:'flex', alignItems:'center', gap:12, margin:'14px 0' }}>
            <div style={{ flex:1, height:1, background:'#F1F5F9' }} />
            <span style={{ fontSize:11, color:'#94A3B8', fontWeight:600, letterSpacing:'0.08em' }}>OR</span>
            <div style={{ flex:1, height:1, background:'#F1F5F9' }} />
          </div>

          <Link href="/login"
            style={{ width:'100%', height:42, borderRadius:10, border:'1px solid #E5E7EB', background:'transparent', color:'#6B7280', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center', gap:8, textDecoration:'none', minHeight:'unset' }}>
            <LogIn size={14} style={{ color:'#9CA3AF' }} />
            <span>Remembered it? <strong style={{ color:'#146EF5', fontWeight:700 }}>Sign In</strong></span>
          </Link>
        </>
      )}

      <p style={{ textAlign:'center', fontSize:11, color:'#CBD5E1', marginTop:18 }}>
        NxtWave &copy; 2026 &bull; Internal Use Only
      </p>
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
