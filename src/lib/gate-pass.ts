export type GatePassData = {
  passId: string;
  name: string;
  role?: string;
  purpose: string;
  reportingDate: string;
  employeeId?: string;
  pocName: string;
  contactNo?: string;
  buildingName: string;
  photoUrl?: string;
  validityDays?: number;
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmtDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${d}-${MONTHS[parseInt(m, 10) - 1]}-${y}`;
}

function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
}

// ── NxtWave Logo block ────────────────────────────────────────────────────────
const NXTWAVE_LOGO = `<div style="background:#ffffff;border-radius:10px;padding:6px 10px;display:inline-flex;align-items:center;justify-content:center;"><img src="https://www.image2url.com/r2/default/images/1779254824307-0fca63d9-e1eb-4ccf-bfb4-4c663ca4ae5e.jpeg" alt="NxtWave" style="height:34px;width:auto;display:block;object-fit:contain;" /></div>`;

// ── Main generator ─────────────────────────────────────────────────────────────
export function generateGatePassBodyHtml(data: GatePassData): string {
  const days      = data.validityDays ?? 7;
  const validUntil = fmtDate(addDays(data.reportingDate, days));

  // ── Photo block ──────────────────────────────────────────────────────────────
  const photoBlock = data.photoUrl
    ? `<img src="${data.photoUrl}" alt="Photo" style="width:124px;height:124px;border-radius:50%;object-fit:cover;object-position:center top;display:block;" />`
    : `<div style="width:124px;height:124px;border-radius:50%;background:#dbeafe;display:flex;align-items:center;justify-content:center;">
        <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#1e40af" stroke-width="1.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
       </div>`;

  // ── Role badge (outlined blue) ────────────────────────────────────────────────
  const roleBadge = data.role ? `
    <span style="display:inline-flex;align-items:center;gap:5px;border:1.5px solid #bfdbfe;border-radius:20px;padding:5px 13px;background:#ffffff;">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#1e40af" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      <span style="font-size:10px;font-weight:700;color:#1e40af;letter-spacing:0.8px;">${data.role.toUpperCase()}</span>
    </span>` : '';

  // ── Purpose badge (filled green) ─────────────────────────────────────────────
  const purposeBadge = `
    <span style="display:inline-flex;align-items:center;gap:5px;border:1.5px solid #86efac;border-radius:20px;padding:5px 13px;background:#dcfce7;">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#15803d" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
      <span style="font-size:10px;font-weight:700;color:#15803d;letter-spacing:0.8px;">${data.purpose.toUpperCase()}</span>
    </span>`;

  // ── Dots decoration (SVG grid) ────────────────────────────────────────────────
  const dots = `<svg width="64" height="44" viewBox="0 0 64 44" fill="none" xmlns="http://www.w3.org/2000/svg" style="opacity:0.28;">
    ${[0,1,2,3].map(r => [0,1,2,3,4,5,6].map(c =>
      `<circle cx="${c*9+4}" cy="${r*11+5}" r="2.5" fill="#1e40af"/>`
    ).join('')).join('')}
  </svg>`;

  // ── POC column helper ─────────────────────────────────────────────────────────
  const pocCol = (icon: string, label: string, value: string) => `
    <div style="flex:1;text-align:center;padding:0 10px;">
      <div style="width:40px;height:40px;background:#dbeafe;border-radius:10px;display:flex;align-items:center;justify-content:center;margin:0 auto 8px;">
        ${icon}
      </div>
      <div style="font-size:9px;font-weight:700;color:#9ca3af;letter-spacing:1.2px;text-transform:uppercase;margin-bottom:4px;">${label}</div>
      <div style="font-size:12px;font-weight:700;color:#0a1840;">${value}</div>
    </div>`;

  const iconPerson18  = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1e40af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
  const iconIdCard18  = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1e40af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="12" r="2.5"/><line x1="14" y1="9" x2="20" y2="9"/><line x1="14" y1="12" x2="18" y2="12"/></svg>`;
  const iconPhone18   = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1e40af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.5 19.79 19.79 0 012.18 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.91 7.09a16 16 0 006 6l1.45-1.45a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 13.92v3z"/></svg>`;
  const iconCalW22    = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;
  const iconShieldW26 = `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>`;
  const iconGlobe13   = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#93c5fd" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>`;

  return `
<div style="max-width:500px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(13,43,126,0.20);font-family:Arial,Helvetica,sans-serif;">

  <!-- ── HEADER ──────────────────────────────────────────────────────────────── -->
  <div style="background:#0d1b6e;padding:18px 24px;display:flex;align-items:center;justify-content:space-between;">
    ${NXTWAVE_LOGO}
    <div style="display:flex;align-items:center;gap:10px;">
      <span style="font-size:18px;font-weight:800;color:#ffffff;letter-spacing:2.5px;">GATE PASS</span>
      ${iconShieldW26}
    </div>
  </div>

  <!-- ── PASS ID STRIP ───────────────────────────────────────────────────────── -->
  <div style="background:#eef2ff;padding:14px 24px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #dde8fb;">
    <div style="display:flex;align-items:center;gap:14px;">
      <div style="width:46px;height:46px;background:#1e40af;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="12" r="2.5" stroke="#ffffff"/><line x1="14" y1="9" x2="20" y2="9"/><line x1="14" y1="12" x2="18" y2="12"/></svg>
      </div>
      <div>
        <div style="font-size:10px;font-weight:700;color:#6b7280;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:3px;">PASS ID</div>
        <div style="font-size:22px;font-weight:800;color:#1e40af;letter-spacing:0.5px;">${data.passId}</div>
      </div>
    </div>
    ${dots}
  </div>

  <!-- ── PHOTO + NAME + BADGES ───────────────────────────────────────────────── -->
  <div style="padding:24px 22px 18px;background:#ffffff;">
    <div style="display:flex;align-items:stretch;gap:0;">
      <!-- Photo -->
      <div style="flex-shrink:0;padding-right:20px;display:flex;align-items:center;justify-content:center;">
        <div style="width:124px;height:124px;border-radius:50%;border:3.5px solid #1e40af;overflow:hidden;display:flex;align-items:center;justify-content:center;background:#dbeafe;">
          ${photoBlock}
        </div>
      </div>
      <!-- Blue vertical separator line -->
      <div style="width:2px;background:#1e40af;flex-shrink:0;border-radius:2px;margin:6px 0;"></div>
      <!-- Name + badges -->
      <div style="flex:1;min-width:0;padding-left:20px;display:flex;flex-direction:column;justify-content:center;">
        <div style="font-size:26px;font-weight:800;color:#0a1840;line-height:1.2;margin-bottom:12px;">${data.name}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">${roleBadge}${purposeBadge}</div>
      </div>
    </div>
  </div>

  <!-- ── POINT OF CONTACT CARD ───────────────────────────────────────────────── -->
  <div style="margin:0 16px 14px;background:#ffffff;border-radius:14px;padding:14px 16px;border:1.5px solid #e2e8f0;box-shadow:0 1px 4px rgba(30,64,175,0.06);">
    <!-- Card header row -->
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
      <div style="width:30px;height:30px;background:#1e40af;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      </div>
      <span style="font-size:11px;font-weight:800;color:#1e40af;letter-spacing:1.8px;">POINT OF CONTACT</span>
      <div style="flex:1;height:1.5px;background:#c7d7fb;"></div>
    </div>
    <!-- Three columns -->
    <div style="display:flex;align-items:stretch;">
      ${pocCol(iconPerson18, 'EMPLOYEE NAME', data.pocName)}
      <div style="width:1px;background:#c7d7fb;margin:4px 0;flex-shrink:0;"></div>
      ${pocCol(iconIdCard18, 'EMPLOYEE ID', data.employeeId ?? '—')}
      <div style="width:1px;background:#c7d7fb;margin:4px 0;flex-shrink:0;"></div>
      ${pocCol(iconPhone18, 'CONTACT NUMBER', data.contactNo ?? '—')}
    </div>
  </div>

  <!-- ── VALID TILL CARD ─────────────────────────────────────────────────────── -->
  <div style="margin:0 16px 16px;background:#ffffff;border-radius:14px;padding:16px 20px;border:1.5px solid #e2e8f0;box-shadow:0 1px 4px rgba(30,64,175,0.06);display:flex;align-items:center;justify-content:space-between;">
    <div style="display:flex;align-items:center;gap:16px;">
      <div style="width:44px;height:44px;background:#1e40af;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        ${iconCalW22}
      </div>
      <div>
        <div style="font-size:10px;font-weight:700;color:#6b7280;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:3px;">VALID TILL</div>
        <div style="font-size:24px;font-weight:800;color:#1e40af;line-height:1;">${validUntil}</div>
        <div style="font-size:11px;color:#9ca3af;margin-top:6px;">Please carry a valid government-issued ID.</div>
      </div>
    </div>
    <!-- Ghosted ID card illustration -->
    <div style="flex-shrink:0;opacity:0.13;">
      <svg width="68" height="52" viewBox="0 0 80 58" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="2" width="76" height="54" rx="8" fill="#1e40af"/>
        <rect x="2" y="2" width="76" height="12" rx="5" fill="#1535a0"/>
        <circle cx="20" cy="34" r="11" fill="#dbeafe"/>
        <rect x="36" y="24" width="30" height="5" rx="2.5" fill="#dbeafe"/>
        <rect x="36" y="34" width="22" height="5" rx="2.5" fill="#dbeafe"/>
        <rect x="36" y="44" width="16" height="5" rx="2.5" fill="#dbeafe"/>
      </svg>
    </div>
  </div>

  <!-- ── FOOTER ──────────────────────────────────────────────────────────────── -->
  <div style="background:#0d1b6e;padding:14px 24px;display:flex;align-items:center;justify-content:space-between;">
    <div style="display:flex;align-items:center;gap:0;">
      <span style="font-size:15px;font-weight:800;color:#ffffff;">NxtWave&reg;</span>
      <span style="display:inline-block;width:1px;height:14px;background:rgba(255,255,255,0.3);margin:0 10px;"></span>
      <span style="font-size:11px;color:#93c5fd;">Empowering India&apos;s Tech Talent</span>
    </div>
    <div style="display:flex;align-items:center;gap:5px;">
      ${iconGlobe13}
      <span style="font-size:11px;color:#93c5fd;">nxtwave.co.in</span>
    </div>
  </div>

</div>`;
}

// Full HTML document wrapper — for email sending
export function generateGatePassHtml(data: GatePassData): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:24px;background:#f0f4ff;font-family:Arial,Helvetica,sans-serif;">
${generateGatePassBodyHtml(data)}
</body>
</html>`;
}
