'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, UserPlus, LogIn } from 'lucide-react';
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

// ─── Shared field styles ──────────────────────────────────────────────────────

const fieldStyle: React.CSSProperties = {
  width:'100%', height:44, paddingLeft:12, paddingRight:12,
  border:'1px solid #E5E7EB', borderRadius:10, fontSize:13,
  background:'#F9FAFB', color:'#111827', outline:'none', boxSizing:'border-box',
};
const labelStyle: React.CSSProperties = {
  display:'block', fontSize:12, fontWeight:600, color:'#374151', marginBottom:5,
};

// ─── Success / pending screen ─────────────────────────────────────────────────

function SubmittedCard() {
  return (
    <div style={{ background:'linear-gradient(145deg,rgba(235,245,255,0.92) 0%,rgba(243,238,255,0.92) 100%)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', borderRadius:20, padding:'32px 28px', boxShadow:'0 20px 56px rgba(10,40,120,0.14),0 4px 20px rgba(100,60,200,0.08)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:24 }}>
        <img src={AUTH_LOGO} alt="NxtWave" style={{ height:24, width:'auto', objectFit:'contain', borderRadius:4 }} />
        <p style={{ fontSize:10, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'#146EF5' }}>Gate Pass System</p>
      </div>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:56, height:56, background:'#FFFBEB', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <h2 style={{ fontSize:18, fontWeight:800, color:'#0F172A', margin:'0 0 8px' }}>Request Submitted</h2>
        <p style={{ fontSize:13, color:'#64748B', lineHeight:1.6, margin:'0 0 20px' }}>
          Your account request is pending Admin approval. You will receive an email once approved.
        </p>
        <Link href="/login" style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:13, color:'#146EF5', fontWeight:600, textDecoration:'none' }}>
          <LogIn size={14} /> Back to Sign In
        </Link>
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
  const [showCPwd, setShowCPwd] = useState(false);
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
      <div style={{ background:'linear-gradient(145deg,rgba(235,245,255,0.92) 0%,rgba(243,238,255,0.92) 100%)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', borderRadius:20, padding:'40px 28px', boxShadow:'0 20px 56px rgba(10,40,120,0.14),0 4px 20px rgba(100,60,200,0.08)', display:'flex', alignItems:'center', justifyContent:'center', minHeight:200 }}>
        <span style={{ width:32, height:32, border:'3px solid #BFDBFE', borderTopColor:'#146EF5', borderRadius:'50%', animation:'spin 0.7s linear infinite', display:'inline-block' }} />
      </div>
    );
  }

  if (submitted) return <SubmittedCard />;

  const focusStyle = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = '#146EF5';
    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(20,110,245,0.10)';
    e.currentTarget.style.background = '#fff';
  };
  const blurStyle = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = '#E5E7EB';
    e.currentTarget.style.boxShadow = 'none';
    e.currentTarget.style.background = '#F9FAFB';
  };

  return (
    <div style={{ background:'linear-gradient(145deg,rgba(235,245,255,0.92) 0%,rgba(243,238,255,0.92) 100%)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', borderRadius:20, padding:'24px 28px 22px', boxShadow:'0 20px 56px rgba(10,40,120,0.14),0 4px 20px rgba(100,60,200,0.08)' }}>
      {/* Brand */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
        <img src={AUTH_LOGO} alt="NxtWave" style={{ height:24, width:'auto', objectFit:'contain', borderRadius:4, flexShrink:0 }} />
        <p style={{ fontSize:10, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'#146EF5', lineHeight:1 }}>Gate Pass System</p>
      </div>

      {/* Heading */}
      <div style={{ marginBottom:16 }}>
        <h2 style={{ fontSize:20, fontWeight:800, color:'#0F172A', margin:0, lineHeight:1.2 }}>Create Account</h2>
        <p style={{ fontSize:12.5, color:'#64748B', marginTop:4, lineHeight:1.5 }}>Join the NxtWave Gate Pass System</p>
      </div>

      {error && (
        <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:10, padding:'9px 12px', display:'flex', gap:9, alignItems:'flex-start', marginBottom:12 }}>
          <div style={{ width:15, height:15, borderRadius:'50%', background:'#EF4444', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>
            <span style={{ color:'white', fontWeight:900, fontSize:8.5, lineHeight:1 }}>!</span>
          </div>
          <p style={{ fontSize:12, color:'#B91C1C', margin:0 }}>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Name */}
        <div style={{ marginBottom:11 }}>
          <label style={labelStyle}>Full Name</label>
          <input type="text" value={form.name} onChange={set('name')} required placeholder="Enter your full name"
            style={fieldStyle} onFocus={focusStyle} onBlur={blurStyle} />
        </div>

        {/* Email */}
        <div style={{ marginBottom:11 }}>
          <label style={labelStyle}>Email Address</label>
          <input type="email" value={form.email} onChange={set('email')} required placeholder="you@example.com"
            style={fieldStyle} onFocus={focusStyle} onBlur={blurStyle} />
        </div>

        {/* Role */}
        <div style={{ marginBottom:11 }}>
          <label style={labelStyle}>Role</label>
          <select value={form.roleSelect} onChange={set('roleSelect')} required
            style={{ ...fieldStyle, cursor:'pointer' }} onFocus={focusStyle} onBlur={blurStyle}>
            <option value="">Select your role…</option>
            {DROPDOWN_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {form.roleSelect === 'other' && (
            <input type="text" value={form.customRole} onChange={set('customRole')} required placeholder="Enter your role"
              style={{ ...fieldStyle, marginTop:8 }} onFocus={focusStyle} onBlur={blurStyle} />
          )}

          {form.roleSelect && (
            <div style={{ marginTop:7, display:'flex', gap:8, alignItems:'flex-start', borderRadius:9, padding:'7px 10px', fontSize:11.5, lineHeight:1.5, ...(needsApproval ? { background:'#FFFBEB', border:'1px solid #FDE68A', color:'#92400E' } : { background:'#F0FDF4', border:'1px solid #BBF7D0', color:'#166534' }) }}>
              <span style={{ flexShrink:0, marginTop:1 }}>{needsApproval ? '⏳' : '✓'}</span>
              <span>
                {isFirstReserved && `You will be the first ${ROLE_DISPLAY[form.roleSelect]}. Your account will be activated immediately.`}
                {isSubsequentReserved && `The ${ROLE_DISPLAY[form.roleSelect]} role is already assigned. Your request will be sent to Admin for approval.`}
                {form.roleSelect === 'other' && 'Your account will require Admin approval before you can log in.'}
              </span>
            </div>
          )}
        </div>

        {/* Password */}
        <div style={{ marginBottom:11 }}>
          <label style={labelStyle}>Password <span style={{ fontWeight:400, color:'#9CA3AF', fontSize:11 }}>(min. 8 chars)</span></label>
          <div style={{ position:'relative' }}>
            <input type={showPwd ? 'text' : 'password'} value={form.password} onChange={set('password')} required minLength={8} placeholder="Create a strong password"
              style={{ ...fieldStyle, paddingRight:38 }} onFocus={focusStyle} onBlur={blurStyle} />
            <button type="button" tabIndex={-1} onClick={() => setShowPwd(v => !v)}
              style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', color:'#9CA3AF', background:'none', border:'none', cursor:'pointer', padding:0, minHeight:'unset', minWidth:'unset' }}>
              {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div style={{ marginBottom:14 }}>
          <label style={labelStyle}>Confirm Password</label>
          <div style={{ position:'relative' }}>
            <input type={showCPwd ? 'text' : 'password'} value={form.confirmPassword} onChange={set('confirmPassword')} required placeholder="Re-enter your password"
              style={{ ...fieldStyle, paddingRight:38 }} onFocus={focusStyle} onBlur={blurStyle} />
            <button type="button" tabIndex={-1} onClick={() => setShowCPwd(v => !v)}
              style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', color:'#9CA3AF', background:'none', border:'none', cursor:'pointer', padding:0, minHeight:'unset', minWidth:'unset' }}>
              {showCPwd ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {/* Submit */}
        <button type="submit" disabled={loading || (form.roleSelect === 'other' && !form.customRole.trim())}
          style={{ width:'100%', height:46, borderRadius:10, border:'none', cursor:'pointer', background:'linear-gradient(135deg,#146EF5,#1A5FE0)', boxShadow:'0 4px 14px rgba(20,110,245,0.35)', color:'white', fontWeight:700, fontSize:13, display:'flex', alignItems:'center', justifyContent:'center', gap:8, opacity:(loading || (form.roleSelect === 'other' && !form.customRole.trim())) ? 0.65 : 1 }}>
          {loading
            ? <><span style={{ width:15, height:15, border:'2px solid white', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.7s linear infinite', display:'inline-block' }} />{needsApproval ? 'Sending request…' : 'Creating account…'}</>
            : <><UserPlus size={15} />{needsApproval ? 'Send Request' : 'Create Account'}</>}
        </button>

        {/* OR */}
        <div style={{ display:'flex', alignItems:'center', gap:12, margin:'12px 0' }}>
          <div style={{ flex:1, height:1, background:'#F1F5F9' }} />
          <span style={{ fontSize:11, color:'#94A3B8', fontWeight:600, letterSpacing:'0.08em' }}>OR</span>
          <div style={{ flex:1, height:1, background:'#F1F5F9' }} />
        </div>

        {/* Sign In */}
        <Link href="/login"
          style={{ width:'100%', height:42, borderRadius:10, border:'1px solid #E5E7EB', background:'transparent', color:'#6B7280', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center', gap:8, textDecoration:'none', minHeight:'unset' }}>
          <LogIn size={14} style={{ color:'#9CA3AF' }} />
          <span>Already have an account? <strong style={{ color:'#146EF5', fontWeight:700 }}>Sign In</strong></span>
        </Link>
      </form>

      <p style={{ textAlign:'center', fontSize:11, color:'#CBD5E1', marginTop:14 }}>
        NxtWave &copy; 2026 &bull; Internal Use Only
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
