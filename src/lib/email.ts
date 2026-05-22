import nodemailer from 'nodemailer';
import type { GatePassData } from './gate-pass';
import { generateGatePassHtml } from './gate-pass';

function createTransporter() {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 587, secure: false,
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });
}

export async function sendInviteEmail(to: string, name: string, registrationUrl: string) {
  return createTransporter().sendMail({
    from: `"NxtWave" <${process.env.GMAIL_USER}>`,
    to, subject: 'Welcome to NxtWave — Fill Your Registration Form',
    html: inviteHtml(name, registrationUrl),
  });
}

export async function sendGatePassEmail(to: string, name: string, data: GatePassData, viewUrl?: string) {
  return createTransporter().sendMail({
    from: `"NxtWave" <${process.env.GMAIL_USER}>`,
    to, subject: `Your NxtWave Gate Pass — ${data.passId}`,
    html: gatePassWrapper(name, data, generateGatePassHtml(data), viewUrl),
  });
}

export async function sendRejectionEmail(to: string, name: string, purpose: string) {
  return createTransporter().sendMail({
    from: `"NxtWave" <${process.env.GMAIL_USER}>`,
    to, subject: 'NxtWave Entry Request — Update',
    html: rejectionHtml(name, purpose),
  });
}

export async function sendUserInviteEmail(
  to: string, name: string, inviterName: string, roleName: string, signupUrl: string
) {
  return createTransporter().sendMail({
    from: `"NxtWave Gate Pass System" <${process.env.GMAIL_USER}>`,
    to,
    subject: 'You have been invited to join NxtWave Gate Pass System',
    html: userInviteHtml(name, inviterName, roleName, signupUrl),
  });
}

export async function sendFacilitiesNotificationEmail(entry: {
  name: string; email: string | null; mobile_number?: string | null;
  role?: string | null; purpose: string; reporting_date: string; poc_name: string; building_name: string;
}) {
  const to = process.env.FACILITIES_EMAIL ?? 'facilities@nxtwave.com';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return createTransporter().sendMail({
    from: `"NxtWave Gate Pass System" <${process.env.GMAIL_USER}>`,
    to, subject: `New Registration Pending Approval — ${entry.name}`,
    html: facilitiesHtml(entry, appUrl),
  });
}

// ─── HTML Templates ────────────────────────────────────────────────────────────

function inviteHtml(name: string, url: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
<div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
  <div style="height:4px;background:linear-gradient(90deg,#1e3a8a,#2563eb,#60a5fa,#2563eb,#1e3a8a);"></div>
  <div style="background:linear-gradient(135deg,#1e3a8a,#2563eb);padding:32px;text-align:center;">
    <div style="font-size:30px;font-weight:900;color:#fff;letter-spacing:1px;">NxtWave</div>
    <div style="font-size:12px;color:#93c5fd;margin-top:8px;letter-spacing:1px;">Office Entry Registration</div>
  </div>
  <div style="padding:32px;">
    <p style="font-size:16px;color:#0f172a;font-weight:600;margin:0 0 10px;">Hello ${esc(name)},</p>
    <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 16px;">You have been invited to register for office entry at NxtWave. Please complete the form below. Once submitted, the Facilities Team will review and send your Gate Pass.</p>
    <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:10px 14px;margin-bottom:24px;font-size:12px;color:#92400e;"><strong>Important:</strong> This link is unique to you. Do not share it with anyone.</div>
    <div style="text-align:center;margin:28px 0;">
      <a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#1e40af,#2563eb);color:#fff;font-size:15px;font-weight:700;padding:16px 40px;border-radius:8px;text-decoration:none;letter-spacing:0.5px;">Fill Registration Form</a>
    </div>
    <p style="font-size:12px;color:#94a3b8;text-align:center;margin:0 0 6px;">Or copy this link:</p>
    <p style="font-size:11px;color:#3b82f6;text-align:center;word-break:break-all;margin:0;">${url}</p>
  </div>
  <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:14px 32px;text-align:center;">
    <p style="font-size:11px;color:#94a3b8;margin:0;">NxtWave &bull; nxtwave.co.in &bull; &copy; ${new Date().getFullYear()}</p>
  </div>
</div></body></html>`;
}

function gatePassWrapper(name: string, data: GatePassData, _gatePassHtml: string, viewUrl?: string) {
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const fmtDate = (d: string) => { const [y,m,dd] = d.split('-'); return `${dd}-${MONTHS[parseInt(m,10)-1]}-${y}`; };
  const addDays = (d: string, n: number) => { const [y,m,dd] = d.split('-').map(Number); const dt = new Date(y,m-1,dd+n); return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`; };
  const validFrom  = fmtDate(data.reportingDate);
  const validUntil = data.validUntil ? fmtDate(data.validUntil) : fmtDate(addDays(data.reportingDate, data.validityDays ?? 7));

  const row = (label: string, value: string, highlight = false) =>
    `<tr><td style="padding:7px 0;color:#64748b;width:48%;font-size:13px;">${esc(label)}</td><td style="padding:7px 0;color:${highlight ? '#15803d' : '#0f172a'};font-weight:${highlight ? '700' : '600'};font-size:13px;">${esc(value)}</td></tr>`;

  const sectionHead = (title: string) =>
    `<tr><td colspan="2" style="padding:12px 0 4px;font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:1.8px;text-transform:uppercase;">${esc(title)}</td></tr>`;

  const divider = () =>
    `<tr><td colspan="2" style="padding:0;border-bottom:1px solid #e2e8f0;"></td></tr>`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
<div style="max-width:560px;margin:28px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
  <div style="height:4px;background:linear-gradient(90deg,#1e3a8a,#2563eb,#60a5fa,#2563eb,#1e3a8a);"></div>
  <div style="background:linear-gradient(135deg,#1e3a8a,#2563eb);padding:28px 32px;text-align:center;">
    <div style="font-size:28px;font-weight:900;color:#fff;letter-spacing:1px;">NxtWave</div>
    <div style="font-size:12px;color:#93c5fd;margin-top:8px;letter-spacing:1px;">Office Entry Registration</div>
  </div>
  <div style="padding:28px 32px;">
    <p style="font-size:15px;color:#0f172a;margin:0 0 6px;font-weight:600;">Hello ${esc(name)},</p>
    <p style="font-size:13px;color:#475569;margin:0 0 22px;line-height:1.7;">Your entry has been approved by the Facilities Team. Your NxtWave Gate Pass is ready. Present it at the entrance on your reporting date.</p>

    <table style="width:100%;border-collapse:collapse;">
      ${sectionHead('Pass Information')}
      ${row('Pass ID', data.passId)}
      ${row('Reporting Date', validFrom)}
      ${divider()}

      ${sectionHead('Candidate Details')}
      ${row('Name', data.name)}
      ${divider()}

      ${sectionHead('POC Details')}
      ${row('POC Name', data.pocName)}
      ${data.employeeId ? row('POC Employee ID', data.employeeId) : ''}
      ${data.contactNo  ? row('Contact Number',  data.contactNo)  : ''}
      ${divider()}

      ${sectionHead('Entry Details')}
      ${row('Building', data.buildingName)}
      ${row('Pass Validity', `${validFrom} to ${validUntil}`, true)}
    </table>

    <p style="font-size:12px;color:#94a3b8;margin:18px 0 20px;line-height:1.5;">Please carry a valid government-issued photo ID along with this gate pass.</p>

    ${viewUrl ? `<div style="text-align:center;">
      <a href="${viewUrl}" style="display:inline-block;background:linear-gradient(135deg,#1e40af,#2563eb);color:#fff;font-size:14px;font-weight:700;padding:14px 36px;border-radius:8px;text-decoration:none;letter-spacing:0.3px;">View &amp; Download Gate Pass</a>
    </div>` : ''}
  </div>
  <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:14px 32px;text-align:center;">
    <p style="font-size:11px;color:#94a3b8;margin:0;">NxtWave &bull; nxtwave.co.in &bull; &copy; ${new Date().getFullYear()}</p>
  </div>
</div></body></html>`;
}

function rejectionHtml(name: string, purpose: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
<div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
  <div style="height:4px;background:linear-gradient(90deg,#1e3a8a,#2563eb,#60a5fa,#2563eb,#1e3a8a);"></div>
  <div style="background:linear-gradient(135deg,#1e3a8a,#2563eb);padding:28px 32px;text-align:center;">
    <div style="font-size:28px;font-weight:900;color:#fff;letter-spacing:1px;">NxtWave</div>
    <div style="font-size:12px;color:#93c5fd;margin-top:8px;letter-spacing:1px;">Office Entry Registration</div>
  </div>
  <div style="padding:32px;">
    <p style="font-size:16px;color:#0f172a;font-weight:600;margin:0 0 12px;">Hello ${esc(name)},</p>
    <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 16px;">We have reviewed your entry request for <strong>${esc(purpose)}</strong>. Unfortunately, your request has not been approved at this time.</p>
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:14px 18px;margin-bottom:16px;"><p style="font-size:13px;color:#991b1b;margin:0;">For queries, please contact the HR team.</p></div>
    <p style="font-size:13px;color:#475569;margin:0;">We apologise for any inconvenience.</p>
  </div>
  <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:14px 32px;text-align:center;">
    <p style="font-size:11px;color:#94a3b8;margin:0;">NxtWave &bull; nxtwave.co.in &bull; &copy; ${new Date().getFullYear()}</p>
  </div>
</div></body></html>`;
}

function facilitiesHtml(entry: {
  name: string; email: string | null; mobile_number?: string | null;
  role?: string | null; purpose: string; reporting_date: string; poc_name: string; building_name: string;
}, appUrl: string) {
  const rows = [
    ['Candidate Name', entry.name],
    ['Email',          entry.email ?? '—'],
    ['Mobile',         entry.mobile_number ?? '—'],
    ['Role',           entry.role ?? '—'],
    ['Purpose',        entry.purpose],
    ['Reporting Date', entry.reporting_date],
    ['POC',            entry.poc_name],
    ['Building',       entry.building_name],
  ];
  const tableRows = rows.map(([k, v], i) => `
    <tr style="${i % 2 === 0 ? 'background:#f8fafc;' : ''}">
      <td style="padding:10px 12px;color:#64748b;width:38%;border-bottom:1px solid #e2e8f0;">${esc(k)}</td>
      <td style="padding:10px 12px;color:#0f172a;font-weight:600;border-bottom:1px solid #e2e8f0;">${esc(v)}</td>
    </tr>`).join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
<div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
  <div style="height:4px;background:linear-gradient(90deg,#1e3a8a,#2563eb,#60a5fa,#2563eb,#1e3a8a);"></div>
  <div style="background:linear-gradient(135deg,#1e3a8a,#2563eb);padding:24px 32px;text-align:center;">
    <div style="font-size:12px;color:#93c5fd;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px;">Facilities Team</div>
    <div style="font-size:18px;font-weight:800;color:#fff;">New Registration Pending Approval</div>
  </div>
  <div style="padding:28px 32px;">
    <p style="font-size:14px;color:#475569;margin:0 0 20px;">A candidate has submitted their registration form and is waiting for approval:</p>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px;">${tableRows}</table>
    <div style="text-align:center;">
      <a href="${appUrl}/approvals" style="display:inline-block;background:linear-gradient(135deg,#1e40af,#2563eb);color:#fff;font-size:14px;font-weight:700;padding:14px 36px;border-radius:8px;text-decoration:none;">Review &amp; Approve</a>
    </div>
  </div>
  <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:14px 32px;text-align:center;">
    <p style="font-size:11px;color:#94a3b8;margin:0;">NxtWave Gate Pass System &bull; &copy; ${new Date().getFullYear()}</p>
  </div>
</div></body></html>`;
}

function userInviteHtml(name: string, inviterName: string, roleName: string, signupUrl: string) {
  const roleLabel = roleName === 'admin' ? 'Admin' : roleName === 'facilities' ? 'Facilities Team' : roleName;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
<div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
  <div style="height:4px;background:linear-gradient(90deg,#1e3a8a,#2563eb,#60a5fa,#2563eb,#1e3a8a);"></div>
  <div style="background:linear-gradient(135deg,#1e3a8a,#2563eb);padding:32px;text-align:center;">
    <div style="font-size:30px;font-weight:900;color:#fff;letter-spacing:1px;">NxtWave</div>
    <div style="font-size:12px;color:#93c5fd;margin-top:8px;letter-spacing:1px;">Gate Pass System</div>
  </div>
  <div style="padding:32px;">
    <p style="font-size:16px;color:#0f172a;font-weight:600;margin:0 0 12px;">Hello ${esc(name)},</p>
    <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 16px;">You have been invited by <strong>${esc(inviterName)}</strong> to join the NxtWave Gate Pass System as <strong>${esc(roleLabel)}</strong>.</p>
    <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 24px;">Please click the button below to set up your account and password.</p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${signupUrl}" style="display:inline-block;background:linear-gradient(135deg,#1e40af,#2563eb);color:#fff;font-size:15px;font-weight:700;padding:16px 40px;border-radius:8px;text-decoration:none;letter-spacing:0.5px;">Set Up My Account</a>
    </div>
    <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:12px;color:#92400e;">
      <strong>Note:</strong> This invitation link expires in 48 hours.
    </div>
    <p style="font-size:12px;color:#94a3b8;text-align:center;margin:0 0 6px;">Or copy this link:</p>
    <p style="font-size:11px;color:#3b82f6;text-align:center;word-break:break-all;margin:0;">${signupUrl}</p>
  </div>
  <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:14px 32px;text-align:center;">
    <p style="font-size:11px;color:#94a3b8;margin:0;">NxtWave Gate Pass System &bull; &copy; ${new Date().getFullYear()}</p>
  </div>
</div></body></html>`;
}

function esc(str: string): string {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
