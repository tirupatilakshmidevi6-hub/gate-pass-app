import nodemailer from 'nodemailer';
import type { GatePassData } from './gate-pass';
import { generateGatePassBodyHtml } from './gate-pass';

function createTransporter() {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 587, secure: false,
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });
}

function fromAddress() {
  const addr = process.env.FROM_EMAIL ?? process.env.GMAIL_USER ?? 'narayana.dubbala@nxtwave.co.in';
  return `"NxtWave Gate Pass System" <${addr}>`;
}

function ccAddress(): string | undefined {
  return process.env.CC_EMAIL;
}

interface MailOpts {
  from: string;
  to: string | string[];
  cc?: string;
  subject: string;
  html: string;
}

async function send(label: string, opts: MailOpts) {
  const to = Array.isArray(opts.to) ? opts.to.join(', ') : opts.to;
  console.log(`[Email] ${label} → to: ${to} | from: ${opts.from} | cc: ${opts.cc ?? 'none'}`);
  try {
    const result = await createTransporter().sendMail(opts);
    console.log(`[Email] ${label} ✓ sent | messageId: ${result.messageId}`);
    return result;
  } catch (err) {
    console.error(`[Email] ${label} ✗ FAILED`, err);
    throw err;
  }
}

// ─── Candidate emails ─────────────────────────────────────────────────────────

export async function sendInviteEmail(to: string, name: string, registrationUrl: string) {
  return send('sendInviteEmail', {
    from: fromAddress(),
    to,
    ...(ccAddress() ? { cc: ccAddress() } : {}),
    subject: 'Welcome to NxtWave — Fill Your Registration Form',
    html: inviteHtml(name, registrationUrl),
  });
}

export async function sendGatePassEmail(to: string, name: string, data: GatePassData, viewUrl?: string) {
  return send('sendGatePassEmail', {
    from: fromAddress(),
    to,
    ...(ccAddress() ? { cc: ccAddress() } : {}),
    subject: `Your NxtWave Gate Pass — ${data.passId}`,
    html: gatePassWrapper(name, data, generateGatePassBodyHtml(data), viewUrl),
  });
}

export async function sendRejectionEmail(to: string, name: string, purpose: string) {
  return send('sendRejectionEmail', {
    from: fromAddress(),
    to,
    ...(ccAddress() ? { cc: ccAddress() } : {}),
    subject: 'NxtWave Entry Request — Update',
    html: rejectionHtml(name, purpose),
  });
}

// ─── User management emails ───────────────────────────────────────────────────

export async function sendUserInviteEmail(
  to: string, name: string, inviterName: string, roleName: string, signupUrl: string
) {
  return send('sendUserInviteEmail', {
    from: fromAddress(),
    to,
    ...(ccAddress() ? { cc: ccAddress() } : {}),
    subject: 'You have been invited to join NxtWave Gate Pass System',
    html: userInviteHtml(name, inviterName, roleName, signupUrl),
  });
}

// ─── Password reset email ─────────────────────────────────────────────────────

export async function sendPasswordResetEmail(to: string, name: string, resetUrl: string) {
  return send('sendPasswordResetEmail', {
    from: fromAddress(),
    to,
    ...(ccAddress() ? { cc: ccAddress() } : {}),
    subject: 'Reset Your NxtWave Gate Pass Password',
    html: passwordResetHtml(name, resetUrl),
  });
}

// ─── User approval/rejection notification emails ─────────────────────────────

export async function sendNewSignupRequestToAdmin(adminEmails: string[], user: { name: string; email: string; role: string }) {
  if (!adminEmails.length) return;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const body = `
    <p style="font-size:14px;color:#475569;margin:0 0 4px;">Hello Admin,</p>
    <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 20px;">A new user has signed up and is awaiting your approval.</p>
    ${detailTable([['Name', user.name], ['Email', user.email], ['Role', user.role]])}
    ${ctaButton(appUrl + '/users', 'Review Pending Users')}`;
  return send('sendNewSignupRequestToAdmin', {
    from: fromAddress(),
    to: adminEmails,
    ...(ccAddress() ? { cc: ccAddress() } : {}),
    subject: `New Account Pending Approval — ${user.name}`,
    html: emailShell('New User Pending Approval', 'Admin Notification', body),
  });
}

export async function sendUserApprovalEmail(to: string, name: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const body = `
    <p style="font-size:15px;color:#0f172a;font-weight:600;margin:0 0 12px;">Hello ${esc(name)},</p>
    <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 20px;">Your account has been <strong style="color:#16a34a;">approved</strong> by the Admin. You can now log in to the NxtWave Gate Pass System.</p>
    ${ctaButton(appUrl + '/login', 'Sign In Now')}`;
  return send('sendUserApprovalEmail', {
    from: fromAddress(),
    to,
    ...(ccAddress() ? { cc: ccAddress() } : {}),
    subject: 'Your Account Has Been Approved — NxtWave Gate Pass',
    html: emailShell('Account Approved', 'Gate Pass System', body),
  });
}

export async function sendUserRejectionEmail(to: string, name: string, reason: string) {
  const body = `
    <p style="font-size:15px;color:#0f172a;font-weight:600;margin:0 0 12px;">Hello ${esc(name)},</p>
    <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 16px;">Your account request for the NxtWave Gate Pass System has been <strong style="color:#dc2626;">rejected</strong>.</p>
    ${reason ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:14px 18px;margin-bottom:16px;"><p style="font-size:13px;color:#991b1b;margin:0;"><strong>Reason:</strong> ${esc(reason)}</p></div>` : ''}
    <p style="font-size:13px;color:#475569;margin:0;">Please contact your administrator if you believe this is a mistake.</p>`;
  return send('sendUserRejectionEmail', {
    from: fromAddress(),
    to,
    ...(ccAddress() ? { cc: ccAddress() } : {}),
    subject: 'Account Request Update — NxtWave Gate Pass',
    html: emailShell('Account Request Rejected', 'Gate Pass System', body),
  });
}

// ─── Admin / facilities notification emails ───────────────────────────────────

export async function sendFacilitiesNotificationEmail(entry: {
  name: string; email: string | null; mobile_number?: string | null;
  role?: string | null; purpose: string; reporting_date: string; poc_name: string; building_name: string;
}) {
  const to = process.env.FACILITIES_EMAIL ?? 'facilities@nxtwave.com';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return send('sendFacilitiesNotificationEmail', {
    from: fromAddress(),
    to,
    ...(ccAddress() ? { cc: ccAddress() } : {}),
    subject: `Action Required — New Candidate Registration Submitted: ${entry.name}`,
    html: facilitiesSubmissionHtml(entry, appUrl),
  });
}

export async function sendAdminRegistrationNotification(
  adminEmails: string[],
  entry: {
    name: string; email: string | null; role?: string | null;
    purpose: string; reporting_date: string; poc_name: string; building_name: string;
  }
) {
  if (!adminEmails.length) return;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return send('sendAdminRegistrationNotification', {
    from: fromAddress(),
    to: adminEmails,
    ...(ccAddress() ? { cc: ccAddress() } : {}),
    subject: `New Candidate Registration Submitted — ${entry.name}`,
    html: adminRegistrationHtml(entry, appUrl),
  });
}

export async function sendAdminApprovalNotification(
  adminEmails: string[],
  entry: {
    name: string; email: string | null; role?: string | null;
    purpose: string; reporting_date: string; building_name: string;
    pass_id: string | null; valid_until: string | null;
  }
) {
  if (!adminEmails.length) return;
  return send('sendAdminApprovalNotification', {
    from: fromAddress(),
    to: adminEmails,
    ...(ccAddress() ? { cc: ccAddress() } : {}),
    subject: `Gate Pass Approved — ${entry.name}`,
    html: adminApprovalHtml(entry),
  });
}

export async function sendAdminRejectionNotification(
  adminEmails: string[],
  entry: {
    name: string; email: string | null; role?: string | null;
    purpose: string; reporting_date: string; building_name: string;
  }
) {
  if (!adminEmails.length) return;
  return send('sendAdminRejectionNotification', {
    from: fromAddress(),
    to: adminEmails,
    ...(ccAddress() ? { cc: ccAddress() } : {}),
    subject: `Gate Pass Rejected — ${entry.name}`,
    html: adminRejectionHtml(entry),
  });
}

// ─── HTML helpers ─────────────────────────────────────────────────────────────

function esc(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function emailShell(headerTitle: string, headerSub: string, bodyHtml: string, footerNote?: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
<div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
  <div style="height:4px;background:linear-gradient(90deg,#1e3a8a,#2563eb,#60a5fa,#2563eb,#1e3a8a);"></div>
  <div style="background:#1e40af;padding:16px 28px;text-align:center;">
    <div style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:0.3px;">NxtWave Gate Pass</div>
    <div style="font-size:12px;color:#bfdbfe;margin-top:4px;">${esc(headerSub)}</div>
    ${headerTitle ? `<div style="font-size:13px;font-weight:600;color:#dbeafe;margin-top:5px;">${esc(headerTitle)}</div>` : ''}
  </div>
  <div style="padding:28px 32px;">
    ${bodyHtml}
  </div>
  <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:14px 32px;text-align:center;">
    <p style="font-size:11px;color:#94a3b8;margin:0;">${footerNote ?? 'NxtWave Gate Pass System &bull; nxtwave.co.in &bull; &copy; ' + new Date().getFullYear()}</p>
  </div>
</div></body></html>`;
}

function detailTable(rows: [string, string][]) {
  const trs = rows.map(([k, v], i) => `
    <tr style="${i % 2 === 0 ? 'background:#f8fafc;' : ''}">
      <td style="padding:9px 12px;color:#64748b;width:38%;border-bottom:1px solid #e2e8f0;font-size:12px;">${esc(k)}</td>
      <td style="padding:9px 12px;color:#0f172a;font-weight:600;border-bottom:1px solid #e2e8f0;font-size:13px;">${esc(v)}</td>
    </tr>`).join('');
  return `<table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px;">${trs}</table>`;
}

function ctaButton(href: string, label: string) {
  return `<div style="text-align:center;margin-top:24px;">
    <a href="${href}" style="display:inline-block;background:linear-gradient(135deg,#1e40af,#2563eb);color:#fff;font-size:14px;font-weight:700;padding:14px 36px;border-radius:8px;text-decoration:none;letter-spacing:0.3px;">${esc(label)}</a>
  </div>`;
}

// ─── Templates ────────────────────────────────────────────────────────────────

function inviteHtml(name: string, url: string) {
  const body = `
    <p style="font-size:15px;color:#0f172a;font-weight:600;margin:0 0 10px;">Hello ${esc(name)},</p>
    <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 16px;">You have been invited to register for office entry at NxtWave. Please complete the form below. Once submitted, the Facilities Team will review and send your Gate Pass.</p>
    <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:10px 14px;margin-bottom:24px;font-size:12px;color:#92400e;"><strong>Important:</strong> This link is unique to you. Do not share it with anyone.</div>
    ${ctaButton(url, 'Fill Registration Form')}
    <p style="font-size:12px;color:#94a3b8;text-align:center;margin:16px 0 4px;">Or copy this link:</p>
    <p style="font-size:11px;color:#3b82f6;text-align:center;word-break:break-all;margin:0;">${url}</p>`;
  return emailShell('', 'Office Entry Registration', body);
}

function gatePassWrapper(name: string, _data: GatePassData, gatePassBodyHtml: string, viewUrl?: string) {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f0f4ff;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:540px;margin:24px auto 32px;">
  <div style="background:#1e40af;border-radius:12px 12px 0 0;padding:16px 28px;text-align:center;">
    <div style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:0.3px;">NxtWave Gate Pass</div>
    <div style="font-size:12px;color:#bfdbfe;margin-top:4px;">Gate Pass Approved</div>
  </div>
  <div style="background:#ffffff;padding:20px 24px 16px;border-left:1px solid #dde8fb;border-right:1px solid #dde8fb;">
    <p style="font-size:15px;color:#0f172a;margin:0 0 6px;font-weight:600;">Hello ${esc(name)},</p>
    <p style="font-size:13px;color:#475569;margin:0;line-height:1.7;">Your entry has been approved by the Facilities Team. Your NxtWave Gate Pass is ready below. Present it at the entrance on your reporting date.</p>
  </div>
  <div style="padding:16px;background:#f0f4ff;">
    ${gatePassBodyHtml}
  </div>
  ${viewUrl ? `<div style="background:#ffffff;padding:16px 24px 20px;text-align:center;border-left:1px solid #dde8fb;border-right:1px solid #dde8fb;">
    <a href="${viewUrl}" style="display:inline-block;background:#1e40af;color:#ffffff;font-size:14px;font-weight:700;padding:13px 36px;border-radius:8px;text-decoration:none;letter-spacing:0.3px;">View &amp; Download Gate Pass</a>
  </div>` : ''}
  <div style="background:#f8fafc;border-top:1px solid #e2e8f0;border-radius:0 0 12px 12px;padding:12px 24px;text-align:center;border:1px solid #dde8fb;border-top:none;">
    <p style="font-size:11px;color:#94a3b8;margin:0;">Please carry a valid government-issued photo ID along with this gate pass.</p>
    <p style="font-size:10px;color:#cbd5e1;margin:4px 0 0;">NxtWave Gate Pass System &bull; nxtwave.co.in &bull; &copy; ${year}</p>
  </div>
</div>
</body>
</html>`;
}

function rejectionHtml(name: string, purpose: string) {
  const body = `
    <p style="font-size:15px;color:#0f172a;font-weight:600;margin:0 0 12px;">Hello ${esc(name)},</p>
    <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 16px;">We have reviewed your entry request for <strong>${esc(purpose)}</strong>. Unfortunately, your request has not been approved at this time.</p>
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:14px 18px;margin-bottom:16px;"><p style="font-size:13px;color:#991b1b;margin:0;">For queries, please contact the HR team.</p></div>
    <p style="font-size:13px;color:#475569;margin:0;">We apologise for any inconvenience.</p>`;
  return emailShell('', 'Entry Request Update', body);
}

function facilitiesSubmissionHtml(entry: {
  name: string; email: string | null; mobile_number?: string | null;
  role?: string | null; purpose: string; reporting_date: string; poc_name: string; building_name: string;
}, appUrl: string) {
  const body = `
    <p style="font-size:14px;color:#475569;margin:0 0 4px;">Hello Facilities Team,</p>
    <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 20px;"><strong>${esc(entry.name)}</strong> has submitted their registration form and is waiting for your approval.</p>
    ${detailTable([
      ['Candidate Name', entry.name],
      ['Email',          entry.email ?? '—'],
      ['Mobile',         entry.mobile_number ?? '—'],
      ['Role',           entry.role ?? '—'],
      ['Purpose',        entry.purpose],
      ['Reporting Date', entry.reporting_date],
      ['POC Name',       entry.poc_name],
      ['Building',       entry.building_name],
    ])}
    <p style="font-size:13px;color:#475569;margin:0 0 4px;">Please login to the Gate Pass System to review and approve or reject this entry.</p>
    ${ctaButton(appUrl + '/approvals', 'Review &amp; Approve')}`;
  return emailShell('New Registration Pending Approval', 'Facilities Team', body);
}

function adminRegistrationHtml(entry: {
  name: string; email: string | null; role?: string | null;
  purpose: string; reporting_date: string; poc_name: string; building_name: string;
}, appUrl: string) {
  const body = `
    <p style="font-size:14px;color:#475569;margin:0 0 4px;">Hello Admin,</p>
    <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 20px;"><strong>${esc(entry.name)}</strong> has submitted their registration form. The Facilities Team has been notified for approval.</p>
    ${detailTable([
      ['Candidate Name', entry.name],
      ['Email',          entry.email ?? '—'],
      ['Role',           entry.role ?? '—'],
      ['Purpose',        entry.purpose],
      ['Reporting Date', entry.reporting_date],
      ['POC Name',       entry.poc_name],
      ['Building',       entry.building_name],
    ])}
    <p style="font-size:12px;color:#64748b;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;margin:0;">This is for your information only. The Facilities Team will handle the approval.</p>
    ${ctaButton(appUrl + '/entry-list', 'View Entry List')}`;
  return emailShell('New Candidate Registration', 'Admin Notification', body);
}

function adminApprovalHtml(entry: {
  name: string; email: string | null; role?: string | null;
  purpose: string; reporting_date: string; building_name: string;
  pass_id: string | null; valid_until: string | null;
}) {
  const body = `
    <p style="font-size:14px;color:#475569;margin:0 0 4px;">Hello Admin,</p>
    <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 20px;">The following candidate entry has been <strong style="color:#16a34a;">approved</strong> by the Facilities Team. The gate pass has been sent to the candidate automatically.</p>
    ${detailTable([
      ['Candidate Name', entry.name],
      ['Email',          entry.email ?? '—'],
      ['Role',           entry.role ?? '—'],
      ['Purpose',        entry.purpose],
      ['Reporting Date', entry.reporting_date],
      ['Building',       entry.building_name],
      ['Pass ID',        entry.pass_id ?? '—'],
      ['Valid Until',    entry.valid_until ?? '—'],
    ])}`;
  return emailShell('Gate Pass Approved', 'Admin Notification', body);
}

function adminRejectionHtml(entry: {
  name: string; email: string | null; role?: string | null;
  purpose: string; reporting_date: string; building_name: string;
}) {
  const body = `
    <p style="font-size:14px;color:#475569;margin:0 0 4px;">Hello Admin,</p>
    <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 20px;">The following candidate entry has been <strong style="color:#dc2626;">rejected</strong> by the Facilities Team. A rejection email has been sent to the candidate.</p>
    ${detailTable([
      ['Candidate Name', entry.name],
      ['Email',          entry.email ?? '—'],
      ['Role',           entry.role ?? '—'],
      ['Purpose',        entry.purpose],
      ['Reporting Date', entry.reporting_date],
      ['Building',       entry.building_name],
    ])}`;
  return emailShell('Gate Pass Rejected', 'Admin Notification', body);
}

function userInviteHtml(name: string, inviterName: string, roleName: string, signupUrl: string) {
  const roleLabel = roleName === 'admin' ? 'Admin' : roleName === 'facilities' ? 'Facilities Team' : roleName;
  const body = `
    <p style="font-size:15px;color:#0f172a;font-weight:600;margin:0 0 12px;">Hello ${esc(name)},</p>
    <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 16px;">You have been invited by <strong>${esc(inviterName)}</strong> to join the NxtWave Gate Pass System as <strong>${esc(roleLabel)}</strong>.</p>
    <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 24px;">Please click the button below to set up your account and password.</p>
    ${ctaButton(signupUrl, 'Set Up My Account')}
    <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:10px 14px;margin-top:20px;font-size:12px;color:#92400e;">
      <strong>Note:</strong> This invitation link expires in 48 hours.
    </div>
    <p style="font-size:12px;color:#94a3b8;text-align:center;margin:14px 0 4px;">Or copy this link:</p>
    <p style="font-size:11px;color:#3b82f6;text-align:center;word-break:break-all;margin:0;">${signupUrl}</p>`;
  return emailShell('', 'Gate Pass System', body);
}

function passwordResetHtml(name: string, resetUrl: string) {
  const body = `
    <p style="font-size:15px;color:#0f172a;font-weight:600;margin:0 0 12px;">Hello ${esc(name)},</p>
    <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 16px;">You requested to reset your password for the NxtWave Gate Pass System. Click the button below to set a new password.</p>
    <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:10px 14px;margin-bottom:24px;font-size:12px;color:#92400e;">
      <strong>Important:</strong> This link expires in 1 hour. If you did not request this, ignore this email.
    </div>
    ${ctaButton(resetUrl, 'Reset Password')}
    <p style="font-size:12px;color:#94a3b8;text-align:center;margin:16px 0 4px;">Or copy this link:</p>
    <p style="font-size:11px;color:#3b82f6;text-align:center;word-break:break-all;margin:0;">${resetUrl}</p>`;
  return emailShell('Password Reset', 'Gate Pass System', body);
}
