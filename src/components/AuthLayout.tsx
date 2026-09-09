'use client';

import { ShieldCheck, Zap, Users } from 'lucide-react';

export const AUTH_LOGO =
  'https://aniportalimages.s3.amazonaws.com/media/details/NxtWave_Logo2021090907535420210909075559.jpg';

// ─── Gate pass card data ──────────────────────────────────────────────────────

type PassData = {
  initial: string; name: string; role: string;
  status: 'Approved' | 'Pending' | 'Rejected';
  date: string; building: string; avatarBg: string;
};

const STATUS_STYLE = {
  Approved: { bg: 'rgba(16,185,129,0.18)', color: '#34D399' },
  Pending:  { bg: 'rgba(251,191,36,0.18)',  color: '#FCD34D' },
  Rejected: { bg: 'rgba(239,68,68,0.18)',   color: '#FCA5A5' },
};

const COL_A: PassData[] = [
  { initial:'R', name:'Rahul Sharma',  role:'Vendor',     status:'Approved', date:'Sep 9',  building:'Block A', avatarBg:'#3B82F6' },
  { initial:'P', name:'Priya Mehta',   role:'Visitor',    status:'Pending',  date:'Sep 9',  building:'Block B', avatarBg:'#8B5CF6' },
  { initial:'A', name:'Arjun Singh',   role:'Contractor', status:'Approved', date:'Sep 8',  building:'HQ',      avatarBg:'#10B981' },
  { initial:'S', name:'Sunita Rao',    role:'Delivery',   status:'Rejected', date:'Sep 8',  building:'Block C', avatarBg:'#F59E0B' },
  { initial:'V', name:'Vikram Nair',   role:'Visitor',    status:'Approved', date:'Sep 7',  building:'Block A', avatarBg:'#EC4899' },
  { initial:'M', name:'Meera Iyer',    role:'Vendor',     status:'Pending',  date:'Sep 7',  building:'Block D', avatarBg:'#6366F1' },
  { initial:'K', name:'Karthik Patel', role:'Contractor', status:'Approved', date:'Sep 6',  building:'HQ',      avatarBg:'#0EA5E9' },
  { initial:'D', name:'Divya Kumar',   role:'Visitor',    status:'Approved', date:'Sep 6',  building:'Block B', avatarBg:'#14B8A6' },
];

const COL_B: PassData[] = [
  { initial:'N', name:'Nikhil Reddy',  role:'Visitor',    status:'Pending',  date:'Sep 5',  building:'Block E', avatarBg:'#F97316' },
  { initial:'L', name:'Lakshmi Devi',  role:'Vendor',     status:'Approved', date:'Sep 5',  building:'Block A', avatarBg:'#A855F7' },
  { initial:'T', name:'Tarun Kapoor',  role:'Contractor', status:'Rejected', date:'Sep 4',  building:'HQ',      avatarBg:'#EF4444' },
  { initial:'J', name:'Jasmine Nair',  role:'Visitor',    status:'Approved', date:'Sep 4',  building:'Block C', avatarBg:'#06B6D4' },
  { initial:'B', name:'Bharath Raja',  role:'Delivery',   status:'Approved', date:'Sep 3',  building:'Block D', avatarBg:'#84CC16' },
  { initial:'C', name:'Chitra Anand',  role:'Visitor',    status:'Pending',  date:'Sep 3',  building:'HQ',      avatarBg:'#F43F5E' },
  { initial:'G', name:'Ganesh Kumar',  role:'Vendor',     status:'Approved', date:'Sep 2',  building:'Block A', avatarBg:'#2563EB' },
  { initial:'H', name:'Harini Velu',   role:'Visitor',    status:'Approved', date:'Sep 2',  building:'Block B', avatarBg:'#7C3AED' },
];

const COL_C: PassData[] = [
  { initial:'F', name:'Faisal Khan',   role:'Vendor',     status:'Pending',  date:'Sep 1',  building:'Block E', avatarBg:'#D97706' },
  { initial:'Y', name:'Yamini Reddy',  role:'Visitor',    status:'Approved', date:'Sep 1',  building:'Block A', avatarBg:'#059669' },
  { initial:'U', name:'Suresh Babu',   role:'Contractor', status:'Approved', date:'Aug 31', building:'HQ',      avatarBg:'#DB2777' },
  { initial:'I', name:'Ananya Gupta',  role:'Visitor',    status:'Approved', date:'Aug 31', building:'Block C', avatarBg:'#7C3AED' },
  { initial:'X', name:'Raj Malhotra',  role:'Delivery',   status:'Rejected', date:'Aug 30', building:'Block D', avatarBg:'#DC2626' },
  { initial:'W', name:'Kavitha Nair',  role:'Vendor',     status:'Approved', date:'Aug 30', building:'Block A', avatarBg:'#0D9488' },
  { initial:'O', name:'Manoj Shetty',  role:'Contractor', status:'Pending',  date:'Aug 29', building:'HQ',      avatarBg:'#B45309' },
  { initial:'E', name:'Deepa Sharma',  role:'Visitor',    status:'Approved', date:'Aug 29', building:'Block B', avatarBg:'#818CF8' },
];

function PassCard({ p }: { p: PassData }) {
  const s = STATUS_STYLE[p.status];
  return (
    <div style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.10)', borderRadius:12, padding:'10px 11px', marginBottom:8 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <div style={{ width:30, height:30, borderRadius:'50%', background:p.avatarBg, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:11, color:'white', flexShrink:0 }}>
          {p.initial}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.88)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.name}</div>
          <div style={{ fontSize:9.5, color:'rgba(255,255,255,0.42)', marginTop:1 }}>{p.role}</div>
        </div>
        <span style={{ background:s.bg, color:s.color, fontSize:8.5, fontWeight:700, padding:'2px 7px', borderRadius:7, flexShrink:0 }}>{p.status}</span>
      </div>
      <div style={{ height:1, background:'rgba(255,255,255,0.06)', margin:'7px 0' }} />
      <div style={{ display:'flex', justifyContent:'space-between' }}>
        <span style={{ fontSize:9.5, color:'rgba(255,255,255,0.35)' }}>{p.date}</span>
        <span style={{ fontSize:9.5, color:'rgba(255,255,255,0.35)' }}>{p.building}</span>
      </div>
    </div>
  );
}

function ScrollCol({ passes, cls }: { passes: PassData[]; cls: string }) {
  const doubled = [...passes, ...passes];
  return (
    <div style={{ flex:1, overflow:'hidden', maskImage:'linear-gradient(to bottom,transparent 0%,black 14%,black 86%,transparent 100%)', WebkitMaskImage:'linear-gradient(to bottom,transparent 0%,black 14%,black 86%,transparent 100%)' }}>
      <div className={cls}>
        {doubled.map((p, i) => <PassCard key={i} p={p} />)}
      </div>
    </div>
  );
}

// ─── AuthLayout ───────────────────────────────────────────────────────────────

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    /*
      position: fixed + inset: 0 ensures this covers the full viewport
      regardless of any parent layout (root layout body bg, etc.)
    */
    <div style={{ position:'fixed', inset:0, display:'flex', background:'#EDF2FD', zIndex:50 }}>

      {/* ── LEFT PANEL (50%) — hidden on mobile via .auth-left CSS class ── */}
      <div
        className="auth-left login-panel-left"
        style={{
          width:'50%',
          height:'100%',
          overflow:'hidden',
          flexDirection:'column',
          background:'linear-gradient(145deg,#020C26 0%,#081840 42%,#0C2468 70%,#1030A0 100%)',
          clipPath:'polygon(0 0,100% 0,88% 100%,0 100%)',
          position:'relative',
        }}
      >
        {/* Glow orbs */}
        <div className="login-blob" style={{ position:'absolute', top:'-8%', right:'8%', width:'50%', height:'50%', borderRadius:'50%', background:'radial-gradient(circle,rgba(20,110,245,0.28) 0%,transparent 68%)', pointerEvents:'none' }} />
        <div className="login-blob-2" style={{ position:'absolute', bottom:'4%', left:'-4%', width:'46%', height:'46%', borderRadius:'50%', background:'radial-gradient(circle,rgba(30,80,200,0.32) 0%,transparent 68%)', pointerEvents:'none' }} />
        {/* Dot grid */}
        <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(circle,rgba(255,255,255,0.07) 1px,transparent 1px)', backgroundSize:'26px 26px', pointerEvents:'none' }} />

        {/* Logo row */}
        <div style={{ flexShrink:0, padding:'24px 28px 0', display:'flex', alignItems:'center', gap:10, position:'relative', zIndex:1 }}>
          <img src={AUTH_LOGO} alt="NxtWave" style={{ height:22, width:'auto', objectFit:'contain', borderRadius:4, opacity:0.92 }} />
          <span style={{ fontSize:10, fontWeight:600, letterSpacing:'0.14em', textTransform:'uppercase', color:'rgba(255,255,255,0.55)' }}>
            Gate Pass System
          </span>
        </div>

        {/* Headline */}
        <div style={{ flexShrink:0, padding:'16px 28px 12px', position:'relative', zIndex:1 }}>
          <h1 style={{ fontSize:26, fontWeight:800, color:'white', margin:0, lineHeight:1.25, letterSpacing:'-0.02em' }}>
            Secure Access,<br />
            <span style={{ color:'#5BADFF' }}>Smarter Entry</span>
          </h1>
          <p style={{ fontSize:12, color:'rgba(255,255,255,0.50)', marginTop:7, lineHeight:1.6, maxWidth:260 }}>
            Live gate pass activity — every entry, tracked in real time.
          </p>
        </div>

        {/* Scrolling card columns — flex-1 with minHeight:0 is critical */}
        <div style={{ flex:1, minHeight:0, overflow:'hidden', display:'flex', gap:7, padding:'0 28px', position:'relative', zIndex:1 }}>
          <ScrollCol passes={COL_A} cls="pass-col-a" />
          <ScrollCol passes={COL_B} cls="pass-col-b" />
          <ScrollCol passes={COL_C} cls="pass-col-c" />
        </div>

        {/* Feature badges */}
        <div style={{ flexShrink:0, padding:'10px 28px 20px', borderTop:'1px solid rgba(255,255,255,0.07)', position:'relative', zIndex:1 }}>
          <div style={{ display:'flex', gap:16 }}>
            {([
              { Icon: ShieldCheck, label:'Secure',    sub:'Access Control' },
              { Icon: Zap,         label:'Fast',      sub:'Digital Passes' },
              { Icon: Users,       label:'Efficient', sub:'Visitor Mgmt'   },
            ] as const).map(({ Icon, label, sub }) => (
              <div key={label} style={{ display:'flex', alignItems:'center', gap:7 }}>
                <div style={{ width:30, height:30, borderRadius:'50%', background:'rgba(255,255,255,0.09)', border:'1px solid rgba(255,255,255,0.12)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Icon size={13} style={{ color:'#7EAAEE' }} />
                </div>
                <div>
                  <div style={{ fontSize:11, fontWeight:700, color:'white', lineHeight:1.2 }}>{label}</div>
                  <div style={{ fontSize:9.5, color:'rgba(255,255,255,0.42)', marginTop:1 }}>{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL (50%) ── */}
      <div
        className="login-panel-right auth-rp"
        style={{
          flex:1,
          height:'100%',
          display:'flex',
          alignItems:'center',
          justifyContent:'center',
          background:'#EDF2FD',
          position:'relative',
          padding:'20px',
        }}
      >
        {/* Decorative watermark circles */}
        <div style={{ position:'absolute', top:-60, right:-60,  width:300, height:300, borderRadius:'50%', background:'rgba(147,197,253,0.16)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', top:70,  right:-20,  width:190, height:190, borderRadius:'50%', border:'1.5px solid rgba(147,197,253,0.24)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:-40, right:-40, width:250, height:250, borderRadius:'50%', background:'rgba(147,197,253,0.12)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:80, right:28,  width:140, height:140, borderRadius:'50%', border:'1.5px solid rgba(147,197,253,0.18)', pointerEvents:'none' }} />

        {/* Page content — animated border + orbs wrapper */}
        <div style={{ position:'relative', zIndex:1, width:'100%', maxWidth:400 }}>
          {/* Rotating gradient border */}
          <div className="auth-border-anim" style={{ position:'absolute', inset:-2, borderRadius:24, background:'linear-gradient(135deg,#146EF5,#A78BFA,#34D399,#06B6D4,#F59E0B,#146EF5)', zIndex:0, pointerEvents:'none' }} />
          {/* Floating colour orbs */}
          <div className="auth-orb-1" style={{ position:'absolute', top:-32, right:-32, width:76, height:76, borderRadius:'50%', background:'rgba(20,110,245,0.32)', filter:'blur(24px)', zIndex:0, pointerEvents:'none' }} />
          <div className="auth-orb-2" style={{ position:'absolute', bottom:-26, left:-26, width:88, height:88, borderRadius:'50%', background:'rgba(167,139,250,0.28)', filter:'blur(28px)', zIndex:0, pointerEvents:'none' }} />
          <div className="auth-orb-3" style={{ position:'absolute', top:-20, left:-36, width:64, height:64, borderRadius:'50%', background:'rgba(52,211,153,0.26)', filter:'blur(22px)', zIndex:0, pointerEvents:'none' }} />
          <div className="auth-orb-4" style={{ position:'absolute', bottom:-20, right:-36, width:80, height:80, borderRadius:'50%', background:'rgba(6,182,212,0.24)', filter:'blur(26px)', zIndex:0, pointerEvents:'none' }} />
          {/* Card on top */}
          <div style={{ position:'relative', zIndex:1 }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
