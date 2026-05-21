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

function gatePassWrapper(name: string, data: GatePassData, gatePassHtml: string, viewUrl?: string) {
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const fmtDate = (d: string) => { const [y,m,dd] = d.split('-'); return `${dd}-${MONTHS[parseInt(m,10)-1]}-${y}`; };
  const addDays = (d: string, n: number) => { const [y,m,dd] = d.split('-').map(Number); const dt = new Date(y,m-1,dd+n); return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`; };
  const validFrom = fmtDate(data.reportingDate);
  const validUntil = fmtDate(addDays(data.reportingDate, data.validityDays ?? 7));
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
<div style="max-width:620px;margin:24px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
  <div style="height:4px;background:linear-gradient(90deg,#1e3a8a,#2563eb,#60a5fa,#2563eb,#1e3a8a);"></div>
  <div style="background:linear-gradient(135deg,#1e3a8a,#2563eb);padding:28px 32px;text-align:center;">
    <div style="font-size:28px;font-weight:900;color:#fff;letter-spacing:1px;">NxtWave</div>
    <div style="font-size:12px;color:#93c5fd;margin-top:8px;letter-spacing:1px;">Office Entry Registration</div>
  </div>
  <div style="padding:24px 28px;">
    <p style="font-size:15px;color:#0f172a;margin:0 0 8px;font-weight:600;">Hello ${esc(name)},</p>
    <p style="font-size:13px;color:#475569;margin:0 0 20px;line-height:1.6;">Great news! Your entry has been approved by the Facilities Team. Your NxtWave Gate Pass is ready. Present it at the entrance on your reporting date.</p>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px;">
      <tr><td style="padding:6px 0;color:#64748b;width:45%;">Pass ID</td><td style="padding:6px 0;color:#1e40af;font-weight:700;">${esc(data.passId)}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b;">Reporting Date</td><td style="padding:6px 0;color:#0f172a;font-weight:600;">${esc(validFrom)}</td></tr>
      ${data.employeeId ? `<tr><td style="padding:6px 0;color:#64748b;">Employee ID</td><td style="padding:6px 0;color:#0f172a;font-weight:600;">${esc(data.employeeId)}</td></tr>` : ''}
      <tr><td style="padding:6px 0;color:#64748b;">POC Name</td><td style="padding:6px 0;color:#0f172a;font-weight:600;">${esc(data.pocName)}</td></tr>
      ${data.contactNo ? `<tr><td style="padding:6px 0;color:#64748b;">Contact Number</td><td style="padding:6px 0;color:#0f172a;font-weight:600;">${esc(data.contactNo)}</td></tr>` : ''}
      <tr><td style="padding:6px 0;color:#64748b;">Building</td><td style="padding:6px 0;color:#0f172a;font-weight:600;">${esc(data.buildingName)}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b;">Pass Validity</td><td style="padding:6px 0;color:#15803d;font-weight:700;">${esc(validFrom)} to ${esc(validUntil)}</td></tr>
    </table>
    <p style="font-size:12px;color:#64748b;margin:0 0 16px;">Please carry a valid government-issued ID along with this gate pass.</p>
    ${viewUrl ? `<div style="text-align:center;margin-top:16px;"><a href="${viewUrl}" style="display:inline-block;background:linear-gradient(135deg,#1e40af,#2563eb);color:#fff;font-size:13px;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;">View &amp; Download Gate Pass</a></div>` : ''}
  </div>
  <div style="padding:0 28px 8px;">${gatePassHtml}</div>
  <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:14px 28px;text-align:center;">
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

function esc(str: string): string {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
