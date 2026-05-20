export type GatePassData = {
  passId: string;
  name: string;
  role?: string;
  purpose: string;
  reportingDate: string;
  pocName: string;
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

// ── SVG icons (inline, no external deps) ──────────────────────────────────────
const ICONS = {
  shield: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>`,
  shieldBlue: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a3fb5" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>`,
  calendar: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a3fb5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  calendarLg: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a3fb5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  person: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a3fb5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  personSm: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1a3fb5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  group: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1a3fb5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>`,
  building: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a3fb5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="15" rx="1"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>`,
  clock: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a3fb5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  id: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="12" r="2.5" stroke="#ffffff"/><line x1="14" y1="9" x2="20" y2="9" stroke="#ffffff"/><line x1="14" y1="12" x2="18" y2="12" stroke="#ffffff"/></svg>`,
};

// ── NxtWave Logo block ────────────────────────────────────────────────────────
const NXTWAVE_LOGO = `<div style="background:#ffffff;border-radius:8px;padding:5px 10px;display:inline-flex;align-items:center;justify-content:center;"><img src="https://www.image2url.com/r2/default/images/1779254824307-0fca63d9-e1eb-4ccf-bfb4-4c663ca4ae5e.jpeg" alt="NxtWave" style="height:36px;width:auto;display:block;object-fit:contain;" /></div>`;

// ── Detail row helper ──────────────────────────────────────────────────────────
function detailRow(icon: string, label: string, value: string, isLast = false): string {
  return `
  <div style="display:flex;align-items:center;gap:14px;padding:14px 18px;${isLast ? '' : 'border-bottom:1px solid #dde8fb;'}">
    <div style="width:38px;height:38px;border-radius:9px;background:#dbeafe;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${icon}</div>
    <div style="flex:1;min-width:0;">
      <div style="font-size:10px;font-weight:700;color:#9ca3af;letter-spacing:1.8px;text-transform:uppercase;margin-bottom:3px;">${label}</div>
      <div style="font-size:15px;font-weight:700;color:#0a1c40;">${value}</div>
    </div>
  </div>`;
}

// ── Main generator ─────────────────────────────────────────────────────────────
export function generateGatePassBodyHtml(data: GatePassData): string {
  const days = data.validityDays ?? 7;
  const validFrom  = fmtDate(data.reportingDate);
  const validUntil = fmtDate(addDays(data.reportingDate, days));
  const issued     = fmtDate(data.reportingDate);
  const year       = new Date().getFullYear();

  const photoBlock = data.photoUrl
    ? `<img src="${data.photoUrl}" alt="Photo" style="width:140px;height:140px;border-radius:50%;object-fit:cover;object-position:center top;display:block;" />`
    : `<div style="width:140px;height:140px;border-radius:50%;background:#dbeafe;display:flex;align-items:center;justify-content:center;">
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#1a3fb5" stroke-width="1.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
       </div>`;

  const roleBadge = data.role ? `
    <div style="display:inline-flex;align-items:center;gap:6px;border:1.5px solid #bfdbfe;border-radius:999px;padding:5px 14px;background:#ffffff;">
      ${ICONS.personSm}
      <span style="font-size:11px;font-weight:700;color:#1a3fb5;letter-spacing:0.8px;">${data.role.toUpperCase()}</span>
    </div>` : '';

  const purposeBadge = `
    <div style="display:inline-flex;align-items:center;gap:6px;border:1.5px solid #bfdbfe;border-radius:999px;padding:5px 14px;background:#ffffff;">
      ${ICONS.group}
      <span style="font-size:11px;font-weight:700;color:#1a3fb5;letter-spacing:0.8px;">${data.purpose.toUpperCase()}</span>
    </div>`;

  return `
<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(13,43,126,0.18);font-family:Arial,Helvetica,sans-serif;">

  <!-- ── HEADER ─────────────────────────────────────────────────────────────── -->
  <div style="background:linear-gradient(135deg,#0d2b7e 0%,#1540b8 55%,#2050c8 100%);padding:20px 28px;display:flex;align-items:center;justify-content:space-between;">
    <div style="display:flex;align-items:center;">
      ${NXTWAVE_LOGO}
    </div>
    <div style="display:flex;align-items:center;gap:10px;">
      <span style="font-size:15px;font-weight:700;color:#ffffff;letter-spacing:2.5px;text-transform:uppercase;">GATE PASS</span>
      ${ICONS.shield}
    </div>
  </div>

  <!-- ── PASS ID STRIP ──────────────────────────────────────────────────────── -->
  <div style="background:#e8f0fe;padding:12px 28px;display:flex;align-items:center;justify-content:space-between;border-bottom:1.5px solid #c5d6f9;">
    <div style="font-size:13px;color:#374151;display:flex;align-items:center;gap:6px;">
      <span style="font-weight:500;color:#6b7280;letter-spacing:0.5px;">PASS ID:</span>
      <span style="font-weight:800;color:#1a3fb5;font-size:15px;letter-spacing:0.5px;">${data.passId}</span>
    </div>
    <div style="display:flex;align-items:center;gap:8px;">
      ${ICONS.calendar}
      <span style="font-size:12px;font-weight:500;color:#6b7280;letter-spacing:0.5px;">ISSUED ON:</span>
      <span style="font-size:13px;font-weight:800;color:#1a3fb5;">${issued}</span>
    </div>
  </div>

  <!-- ── MAIN CONTENT ───────────────────────────────────────────────────────── -->
  <div style="padding:28px 28px 20px;">

    <!-- Photo + Name + Badges -->
    <div style="display:flex;gap:24px;align-items:flex-start;margin-bottom:20px;">
      <!-- Circular photo with blue border -->
      <div style="flex-shrink:0;width:140px;height:140px;border-radius:50%;border:3px solid #1a3fb5;box-shadow:0 4px 20px rgba(26,63,181,0.2);overflow:hidden;display:flex;align-items:center;justify-content:center;background:#dbeafe;">
        ${photoBlock}
      </div>
      <!-- Name + badges -->
      <div style="flex:1;min-width:0;padding-top:4px;">
        <div style="font-size:26px;font-weight:800;color:#0a1c40;line-height:1.2;margin-bottom:12px;">${data.name}</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          ${roleBadge}
          ${purposeBadge}
        </div>
      </div>
    </div>

    <!-- Separator -->
    <div style="height:1px;background:linear-gradient(90deg,transparent 0%,#e5e7eb 30%,#e5e7eb 70%,transparent 100%);margin-bottom:20px;"></div>

    <!-- Details card -->
    <div style="background:#f4f8ff;border-radius:14px;overflow:hidden;margin-bottom:16px;border:1px solid #dde8fb;">
      ${detailRow(ICONS.calendar, 'REPORTING DATE',  fmtDate(data.reportingDate))}
      ${detailRow(ICONS.person,   'POINT OF CONTACT', data.pocName)}
      ${detailRow(ICONS.building, 'BUILDING / VENUE', data.buildingName, true)}
    </div>

    <!-- Pass Validity card -->
    <div style="background:#e8f2ff;border-radius:14px;padding:16px 18px;border:1px solid #c5d6f9;">
      <!-- Header -->
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">
        ${ICONS.shieldBlue}
        <span style="font-size:12px;font-weight:800;color:#1a3fb5;letter-spacing:2px;text-transform:uppercase;">PASS VALIDITY</span>
      </div>
      <!-- Two columns -->
      <div style="display:flex;align-items:center;">
        <!-- Valid From -->
        <div style="flex:1;display:flex;align-items:center;gap:12px;">
          <div style="width:42px;height:42px;border-radius:10px;background:#dbeafe;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            ${ICONS.calendarLg}
          </div>
          <div>
            <div style="font-size:10px;font-weight:700;color:#6b7280;letter-spacing:1.2px;text-transform:uppercase;margin-bottom:3px;">VALID FROM</div>
            <div style="font-size:19px;font-weight:800;color:#1a3fb5;line-height:1;">${validFrom}</div>
          </div>
        </div>
        <!-- Divider -->
        <div style="width:1.5px;background:#c5d6f9;height:52px;margin:0 18px;flex-shrink:0;"></div>
        <!-- Valid Until -->
        <div style="flex:1;display:flex;align-items:center;gap:12px;">
          <div style="width:42px;height:42px;border-radius:10px;background:#dbeafe;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            ${ICONS.clock}
          </div>
          <div>
            <div style="font-size:10px;font-weight:700;color:#6b7280;letter-spacing:1.2px;text-transform:uppercase;margin-bottom:3px;">VALID UNTIL</div>
            <div style="font-size:19px;font-weight:800;color:#1a3fb5;line-height:1;">${validUntil}</div>
          </div>
        </div>
      </div>
    </div>

  </div>

  <!-- ── FOOTER ─────────────────────────────────────────────────────────────── -->
  <div style="background:#0a1f5c;padding:18px 28px;display:flex;align-items:center;">
    <!-- Left: icon + safety text -->
    <div style="display:flex;align-items:center;gap:14px;flex:1;min-width:0;">
      <div style="width:46px;height:46px;border-radius:50%;background:rgba(255,255,255,0.12);display:flex;align-items:center;justify-content:center;flex-shrink:0;border:1.5px solid rgba(255,255,255,0.2);">
        ${ICONS.id}
      </div>
      <div>
        <p style="font-size:11.5px;color:#c5d6f9;margin:0 0 3px;line-height:1.4;">Please carry a valid government-issued ID.</p>
        <p style="font-size:11.5px;color:#c5d6f9;margin:0;line-height:1.4;">This gate pass is non-transferable.</p>
      </div>
    </div>
    <!-- Divider -->
    <div style="width:1.5px;background:rgba(255,255,255,0.18);height:50px;margin:0 22px;flex-shrink:0;"></div>
    <!-- Right: company info -->
    <div style="text-align:right;flex-shrink:0;">
      <p style="font-size:13px;font-weight:700;color:#ffffff;margin:0 0 3px;letter-spacing:0.3px;">NxtWave &bull; nxtwave.co.in</p>
      <p style="font-size:11px;color:#93c5fd;margin:0 0 3px;">Empowering India&apos;s Tech Talent</p>
      <p style="font-size:10px;color:#6b8cd1;margin:0;">&copy; ${year} NxtWave</p>
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
