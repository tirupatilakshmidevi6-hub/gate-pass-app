import nodemailer from 'nodemailer';
import type { GatePassData } from './gate-pass';
import { getAppUrl } from './app-url';

// ─── Required environment variables ──────────────────────────────────────────
// Configure ALL of these on Vercel (or your hosting platform):
//
//   GMAIL_USER            Gmail address that owns the App Password (SMTP auth)
//   GMAIL_APP_PASSWORD    16-character App Password
//                         (Google Account → Security → App Passwords)
//   FACILITIES_EMAIL      Facilities team email for new-entry notifications
//   NEXT_PUBLIC_APP_URL   Public URL of the deployed app (used in email links)
//
// Note: @nxtwave.co.in Google Workspace accounts cannot be used for SMTP —
// Workspace admin policy blocks SMTP Auth / App Passwords for that domain.
// ─────────────────────────────────────────────────────────────────────────────

// Startup check — warn loudly if email env vars are missing.
(function validateEmailEnv() {
  const missing = ['GMAIL_USER', 'GMAIL_APP_PASSWORD'].filter((k) => !process.env[k]);
  if (missing.length) {
    console.warn(
      '[Email] WARNING: SMTP credentials missing — emails will not be sent.',
      'Please set', missing.join(' and '),
      'in your hosting platform environment variables.'
    );
  }
})();

function createTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    const missing = [!user ? 'GMAIL_USER' : '', !pass ? 'GMAIL_APP_PASSWORD' : ''].filter(Boolean).join(' and ');
    throw new Error(
      `[Email] Cannot send — ${missing} not set. ` +
      'Set these environment variables on your hosting platform and redeploy.'
    );
  }
  // No pool: true in serverless (Vercel) — pooled connections don't survive
  // between invocations and silently fail. Use a fresh connection per send.
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });
}

// Verify SMTP connection once at module load.
try {
  createTransporter().verify()
    .then(() => console.log('[Email] Gmail SMTP connection verified ✓'))
    .catch((err: Error) => console.error('[Email] Gmail SMTP verification FAILED:', err.message));
} catch (err) {
  console.error(err instanceof Error ? err.message : '[Email] createTransporter failed at module load');
}

function fromAddress() {
  const user = process.env.GMAIL_USER ?? 'noreply@gmail.com';
  return `"NxtWave Gate Pass System" <${user}>`;
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\s{2,}/g, ' ').trim();
}

// Local date formatter (YYYY-MM-DD → DD-Mon-YYYY)
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmtDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${d}-${MONTHS_SHORT[parseInt(m, 10) - 1]}-${y}`;
}

// ─── Core send function ───────────────────────────────────────────────────────

interface MailOpts {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

interface SendResult { messageId: string; accepted: string[] }

async function send(label: string, opts: MailOpts, retries = 2): Promise<SendResult> {
  const to = Array.isArray(opts.to) ? opts.to.join(', ') : opts.to;
  const fromAddr = process.env.GMAIL_USER ?? 'noreply@gmail.com';
  console.log(`[Email] ${label} → to: ${to}`);
  try {
    const result = await createTransporter().sendMail({
      ...opts,
      text: opts.text ?? htmlToText(opts.html),
      headers: {
        'X-Mailer':                              'NxtWave Gate Pass System',
        'X-Priority':                            '3',
        'X-MS-Exchange-Organization-SCL':        '-1',
        'Reply-To':                              fromAddr,
        'List-Unsubscribe':                      `<mailto:${fromAddr}?subject=unsubscribe>`,
        'Precedence':                            'bulk',
      },
    });
    console.log(`[Email] ${label} ✓ sent | messageId: ${result.messageId} | accepted: ${result.accepted?.join(', ')}`);
    return { messageId: result.messageId, accepted: result.accepted ?? [] };
  } catch (err: unknown) {
    const e = err as { message?: string; code?: string; response?: string; responseCode?: number };
    console.error(`[Email] ${label} ✗ FAILED | message: ${e.message} | code: ${e.code} | responseCode: ${e.responseCode}`);

    if (retries > 0) {
      console.log(`[Email] ${label} retrying in 2s… (${retries} attempt(s) left)`);
      await new Promise((r) => setTimeout(r, 2000));
      return send(label, opts, retries - 1);
    }

    const raw = (e.message ?? '').toLowerCase();
    if (raw.includes('not set') || raw.includes('missing credentials') || raw.includes('cannot send') || raw.includes('invalid login') || raw.includes('535')) {
      throw new Error('Email service is not configured on the server. Please contact the administrator.');
    }
    throw new Error('Could not send email. Please check server email settings.');
  }
}

// ─── SMTP health check ────────────────────────────────────────────────────────

export async function verifySmtp(): Promise<void> {
  try {
    await createTransporter().verify();
  } catch (err) {
    const raw = (err instanceof Error ? err.message : String(err)).toLowerCase();
    console.error('[Email] verifySmtp failed:', err instanceof Error ? err.message : err);
    if (raw.includes('not set') || raw.includes('missing credentials') || raw.includes('cannot send') || raw.includes('invalid login') || raw.includes('535')) {
      throw new Error('Email service is not configured on the server. Please contact the administrator.');
    }
    throw new Error('Could not connect to email server. Please check SMTP settings.');
  }
}

export async function sendTestEmail(to: string, name: string) {
  return send('sendTestEmail', {
    from: fromAddress(),
    to,
    subject: 'NxtWave Gate Pass — SMTP Test',
    html: emailShell('SMTP Test', 'Email Configuration', `
      <p style="font-size:15px;color:#0f172a;font-weight:600;margin:0 0 12px;">Hello ${esc(name)},</p>
      <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 16px;">This is a test email confirming that your SMTP configuration is working correctly.</p>
      <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:12px 16px;">
        <p style="font-size:13px;color:#15803d;margin:0;font-weight:600;">Email delivery is working correctly.</p>
      </div>`),
    text: `Hello ${name},\n\nThis is a test email confirming your SMTP configuration is working correctly.\n\nNxtWave Gate Pass System`,
  });
}

// ─── Candidate emails ─────────────────────────────────────────────────────────

export async function sendInviteEmail(to: string, name: string, registrationUrl: string) {
  if (!to?.trim()) { console.error('[Email] sendInviteEmail — skipped: recipient email is empty'); return; }
  return send('sendInviteEmail', {
    from: fromAddress(),
    to,
    subject: 'Your NxtWave Office Entry Registration',
    html: inviteHtml(name, registrationUrl),
    text: `Dear ${name},\n\nYou have been invited to register for office entry at NxtWave.\n\nPlease fill your registration form here:\n${registrationUrl}\n\nThis link is unique to you. Do not share it with anyone.\n\nNxtWave Gate Pass System\nnxtwave.co.in`,
  });
}

export async function sendGatePassEmail(to: string, name: string, data: GatePassData, viewUrl?: string) {
  if (!to?.trim()) { console.error('[Email] sendGatePassEmail — skipped: recipient email is empty'); return; }
  return send('sendGatePassEmail', {
    from: fromAddress(),
    to,
    subject: 'Your NxtWave Gate Pass is Ready',
    html: gatePassWrapper(name, data, viewUrl),
    text: `Dear ${name},\n\nYour NxtWave Gate Pass is ready.\n\nPass ID: ${data.passId}\nValid from: ${fmtDate(data.reportingDate)}\nValid until: ${data.validUntil ? fmtDate(data.validUntil) : 'Single day'}\nBuilding: ${data.buildingName}\nPOC: ${data.pocName}\n\n${viewUrl ? `View and download your gate pass here:\n${viewUrl}\n\n` : ''}Please carry a valid government-issued photo ID along with this gate pass.\n\nNxtWave Gate Pass System\nnxtwave.co.in`,
  });
}

export async function sendRejectionEmail(to: string, name: string, purpose: string) {
  return send('sendRejectionEmail', {
    from: fromAddress(),
    to,
    subject: 'Your Entry Request Update',
    html: rejectionHtml(name, purpose),
    text: `Dear ${name},\n\nWe have reviewed your entry request for ${purpose}. Unfortunately, your request has not been approved at this time.\n\nFor queries, please contact the HR team.\n\nNxtWave Gate Pass System\nnxtwave.co.in`,
  });
}

// ─── User management emails ───────────────────────────────────────────────────

export async function sendUserInviteEmail(
  to: string, name: string, inviterName: string, roleName: string, signupUrl: string
) {
  return send('sendUserInviteEmail', {
    from: fromAddress(),
    to,
    subject: 'Invitation to Join NxtWave Gate Pass System',
    html: userInviteHtml(name, inviterName, roleName, signupUrl),
    text: `Dear ${name},\n\nYou have been invited by ${inviterName} to join the NxtWave Gate Pass System.\n\nSet up your account here:\n${signupUrl}\n\nThis invitation link expires in 48 hours.\n\nNxtWave Gate Pass System\nnxtwave.co.in`,
  });
}

// ─── Password reset ───────────────────────────────────────────────────────────

export async function sendPasswordResetEmail(to: string, name: string, resetUrl: string) {
  return send('sendPasswordResetEmail', {
    from: fromAddress(),
    to,
    subject: 'Reset Your Password',
    html: passwordResetHtml(name, resetUrl),
    text: `Dear ${name},\n\nYou requested to reset your password for the NxtWave Gate Pass System.\n\nReset your password here:\n${resetUrl}\n\nThis link expires in 1 hour. If you did not request this, please ignore this email.\n\nNxtWave Gate Pass System\nnxtwave.co.in`,
  });
}

// ─── Admin / user approval notification emails ────────────────────────────────

export async function sendNewSignupRequestToAdmin(
  adminEmails: string[],
  user: { name: string; email: string; role: string }
) {
  if (!adminEmails.length) return;
  const appUrl = getAppUrl();
  const body = `
    <p style="font-size:14px;color:#475569;margin:0 0 4px;">Hello Admin,</p>
    <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 20px;">A new user has signed up and is awaiting your approval.</p>
    ${detailTable([['Name', user.name], ['Email', user.email], ['Role', user.role]])}
    ${ctaButton(appUrl + '/users', 'Review Pending Users')}`;
  return send('sendNewSignupRequestToAdmin', {
    from: fromAddress(),
    to: adminEmails,
    subject: `New Account Pending Approval: ${user.name}`,
    html: emailShell('New User Pending Approval', 'Admin Notification', body),
    text: `Hello Admin,\n\nA new user has signed up and is awaiting your approval.\n\nName: ${user.name}\nEmail: ${user.email}\nRole: ${user.role}\n\nReview here: ${appUrl}/users\n\nNxtWave Gate Pass System`,
  });
}

export async function sendUserApprovalEmail(to: string, name: string) {
  const appUrl = getAppUrl();
  const body = `
    <p style="font-size:15px;color:#0f172a;font-weight:600;margin:0 0 12px;">Hello ${esc(name)},</p>
    <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 20px;">Your account has been <strong style="color:#16a34a;">approved</strong> by the Admin. You can now log in to the NxtWave Gate Pass System.</p>
    ${ctaButton(appUrl + '/login', 'Sign In Now')}`;
  return send('sendUserApprovalEmail', {
    from: fromAddress(),
    to,
    subject: 'Your Account Has Been Approved',
    html: emailShell('Account Approved', 'Gate Pass System', body),
    text: `Dear ${name},\n\nYour account has been approved. You can now log in to the NxtWave Gate Pass System.\n\nSign in here: ${appUrl}/login\n\nNxtWave Gate Pass System`,
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
    subject: 'Account Request Update',
    html: emailShell('Account Request Update', 'Gate Pass System', body),
    text: `Dear ${name},\n\nYour account request for the NxtWave Gate Pass System has been rejected.${reason ? `\n\nReason: ${reason}` : ''}\n\nPlease contact your administrator if you believe this is a mistake.\n\nNxtWave Gate Pass System`,
  });
}

// ─── Facilities / admin entry notification emails ─────────────────────────────

export async function sendRegistrationConfirmationEmail(to: string, name: string) {
  if (!to?.trim()) {
    console.warn('[Email] sendRegistrationConfirmationEmail — skipped: no recipient email');
    return;
  }
  return send('sendRegistrationConfirmationEmail', {
    from: fromAddress(),
    to,
    subject: 'We Received Your Registration',
    html: registrationConfirmationHtml(name),
    text: `Dear ${name},\n\nThank you for completing your registration form.\n\nOur Facilities Team is reviewing your details and will send you a Gate Pass once approved. This usually takes 1 business day.\n\nNxtWave Gate Pass System\nnxtwave.co.in`,
  });
}

export async function sendFacilitiesNotificationEmail(entry: {
  name: string; email: string | null; mobile_number?: string | null;
  role?: string | null; purpose: string; reporting_date: string; poc_name: string; building_name: string;
}) {
  const facilitiesEmail = process.env.FACILITIES_EMAIL;
  if (!facilitiesEmail?.trim()) {
    console.error('[Email] sendFacilitiesNotificationEmail — FACILITIES_EMAIL env var is NOT SET. Facilities team will not receive notification. Set FACILITIES_EMAIL in Vercel environment variables.');
    return;
  }
  const to = facilitiesEmail;
  const appUrl = getAppUrl();
  console.log(`[Email] Facilities notification → to: ${to}`);
  return send('sendFacilitiesNotificationEmail', {
    from: fromAddress(),
    to,
    subject: `New Registration Pending Review: ${entry.name}`,
    html: facilitiesSubmissionHtml(entry, appUrl),
    text: `Hello Facilities Team,\n\n${entry.name} has submitted their registration form and is waiting for your approval.\n\nName: ${entry.name}\nEmail: ${entry.email ?? '—'}\nMobile: ${entry.mobile_number ?? '—'}\nPurpose: ${entry.purpose}\nReporting Date: ${entry.reporting_date}\nBuilding: ${entry.building_name}\n\nReview here: ${appUrl}/approvals\n\nNxtWave Gate Pass System`,
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
  const appUrl = getAppUrl();
  return send('sendAdminRegistrationNotification', {
    from: fromAddress(),
    to: adminEmails,
    subject: `New Candidate Registration Submitted: ${entry.name}`,
    html: adminRegistrationHtml(entry, appUrl),
    text: `Hello Admin,\n\n${entry.name} has submitted their registration form. The Facilities Team has been notified for approval.\n\nName: ${entry.name}\nEmail: ${entry.email ?? '—'}\nPurpose: ${entry.purpose}\nReporting Date: ${entry.reporting_date}\nBuilding: ${entry.building_name}\n\nNxtWave Gate Pass System`,
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
    subject: `Gate Pass Approved: ${entry.name}`,
    html: adminApprovalHtml(entry),
    text: `Hello Admin,\n\nThe entry for ${entry.name} has been approved. Pass ID: ${entry.pass_id ?? '—'}.\n\nNxtWave Gate Pass System`,
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
    subject: `Entry Rejected: ${entry.name}`,
    html: adminRejectionHtml(entry),
    text: `Hello Admin,\n\nThe entry for ${entry.name} has been rejected by the Facilities Team.\n\nNxtWave Gate Pass System`,
  });
}

// ─── HTML shell & shared helpers ──────────────────────────────────────────────

function esc(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function emailShell(headerTitle: string, headerSub: string, bodyHtml: string, footerNote?: string) {
  const subtitle = headerTitle || headerSub;
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
  <div style="height:4px;background:linear-gradient(90deg,#1e3a8a,#2563eb,#60a5fa,#2563eb,#1e3a8a);"></div>
  <div style="background:#1e40af;padding:20px 28px;text-align:center;">
    <div style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:0.3px;">NxtWave Gate Pass</div>
    ${subtitle ? `<div style="font-size:12px;color:#bfdbfe;margin-top:4px;">${esc(subtitle)}</div>` : ''}
  </div>
  <div style="padding:28px 32px;">
    ${bodyHtml}
  </div>
  <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center;">
    <p style="font-size:11px;color:#94a3b8;margin:0 0 4px;">${footerNote ?? 'NxtWave Gate Pass System &bull; nxtwave.co.in'}</p>
    <p style="font-size:11px;color:#94a3b8;margin:0 0 4px;">&copy; ${year} NxtWave. Hyderabad, Telangana, India.</p>
    <p style="font-size:10px;color:#cbd5e1;margin:4px 0 0;">This email was sent because you were invited for office entry at NxtWave. <a href="mailto:${process.env.GMAIL_USER ?? 'noreply@gmail.com'}?subject=unsubscribe" style="color:#94a3b8;">Unsubscribe</a></p>
  </div>
</div>
</body></html>`;
}

function detailTable(rows: [string, string][]) {
  const trs = rows.map(([k, v], i) => `
    <tr style="${i % 2 === 0 ? 'background:#f8fafc;' : ''}">
      <td style="padding:9px 12px;color:#64748b;width:40%;border-bottom:1px solid #e2e8f0;font-size:12px;">${esc(k)}</td>
      <td style="padding:9px 12px;color:#0f172a;font-weight:600;border-bottom:1px solid #e2e8f0;font-size:13px;">${esc(v)}</td>
    </tr>`).join('');
  return `<table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">${trs}</table>`;
}

function ctaButton(href: string, label: string) {
  return `<div style="text-align:center;margin-top:24px;">
    <a href="${href}" style="display:inline-block;background:#1e40af;color:#ffffff;font-size:14px;font-weight:700;padding:14px 36px;border-radius:8px;text-decoration:none;letter-spacing:0.3px;">${label}</a>
  </div>`;
}

// ─── Email templates ──────────────────────────────────────────────────────────

function inviteHtml(name: string, url: string) {
  const body = `
    <p style="font-size:15px;color:#0f172a;font-weight:600;margin:0 0 10px;">Hello ${esc(name)},</p>
    <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 16px;">You have been invited to register for office entry at NxtWave. Please complete the registration form. Once submitted, the Facilities Team will review and send your Gate Pass.</p>
    <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:10px 14px;margin-bottom:24px;font-size:12px;color:#92400e;"><strong>Important:</strong> This link is unique to you. Do not share it with anyone.</div>
    ${ctaButton(url, 'Fill Registration Form')}
    <p style="font-size:12px;color:#94a3b8;text-align:center;margin:16px 0 4px;">Or copy this link:</p>
    <p style="font-size:11px;color:#3b82f6;text-align:center;word-break:break-all;margin:0;">${url}</p>`;
  return emailShell('', 'Office Entry Registration', body, 'This email was sent because you were invited for office entry at NxtWave.');
}

function gatePassWrapper(name: string, data: GatePassData, viewUrl?: string) {
  const year = new Date().getFullYear();

  const detailRows: [string, string][] = [
    ['Pass ID',            data.passId],
    ['Reporting Date',     fmtDate(data.reportingDate)],
    ['Valid Until',        data.validUntil ? fmtDate(data.validUntil) : '—'],
    ['Point of Contact',   data.pocName],
    ['POC Employee ID',    data.employeeId ?? '—'],
    ['Contact Number',     data.contactNo ?? '—'],
    ['Building',           data.buildingName],
  ];

  const tableRows = detailRows.map(([k, v], i) => `
    <tr style="${i % 2 === 0 ? 'background:#f8fafc;' : ''}">
      <td style="padding:9px 12px;color:#64748b;width:40%;font-size:12px;border-bottom:1px solid #e2e8f0;">${esc(k)}</td>
      <td style="padding:9px 12px;color:#0f172a;font-weight:600;font-size:13px;border-bottom:1px solid #e2e8f0;">${esc(v)}</td>
    </tr>`).join('');

  const validFrom  = fmtDate(data.reportingDate);
  const validUntil = data.validUntil ? fmtDate(data.validUntil) : '—';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
</head>
<body style="margin:0;padding:0;background:#f0f4ff;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:600px;margin:24px auto 32px;">

  <div style="background:#1e40af;border-radius:12px 12px 0 0;padding:20px 28px;text-align:center;">
    <div style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:0.3px;">NxtWave Gate Pass</div>
    <div style="font-size:12px;color:#bfdbfe;margin-top:4px;">Gate Pass Approved</div>
  </div>

  <div style="background:#ffffff;padding:20px 28px 16px;border-left:1px solid #dde8fb;border-right:1px solid #dde8fb;">
    <p style="font-size:15px;color:#0f172a;margin:0 0 8px;font-weight:600;">Hello ${esc(name)},</p>
    <p style="font-size:13px;color:#475569;margin:0;line-height:1.7;">Your entry request has been <strong style="color:#16a34a;">approved</strong> by the Facilities Team. Please find your Gate Pass details below. Present it at the entrance on your reporting date.</p>
  </div>

  <div style="background:#ffffff;padding:4px 28px 20px;border-left:1px solid #dde8fb;border-right:1px solid #dde8fb;">
    <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
      ${tableRows}
    </table>
  </div>

  <div style="background:#ffffff;padding:0 28px 20px;border-left:1px solid #dde8fb;border-right:1px solid #dde8fb;">
    <div style="background:#eef2ff;border-radius:12px;padding:14px 18px;border:1px solid #c7d7fb;">
      <div style="font-size:10px;font-weight:800;color:#1e40af;letter-spacing:1.6px;margin-bottom:10px;">PASS VALIDITY</div>
      <div style="display:flex;gap:10px;">
        <div style="flex:1;background:#ffffff;border-radius:8px;padding:10px;text-align:center;border:1px solid #dde8fb;">
          <div style="font-size:9px;font-weight:700;color:#6b7280;letter-spacing:1.2px;text-transform:uppercase;margin-bottom:4px;">VALID FROM</div>
          <div style="font-size:16px;font-weight:800;color:#1e40af;">${esc(validFrom)}</div>
        </div>
        <div style="flex:1;background:#ffffff;border-radius:8px;padding:10px;text-align:center;border:1px solid #dde8fb;">
          <div style="font-size:9px;font-weight:700;color:#6b7280;letter-spacing:1.2px;text-transform:uppercase;margin-bottom:4px;">VALID UNTIL</div>
          <div style="font-size:16px;font-weight:800;color:#1e40af;">${esc(validUntil)}</div>
        </div>
      </div>
    </div>
  </div>

  ${viewUrl ? `
  <div style="background:#ffffff;padding:16px 28px 24px;text-align:center;border-left:1px solid #dde8fb;border-right:1px solid #dde8fb;">
    <a href="${viewUrl}" style="display:inline-block;background:#1e40af;color:#ffffff;font-size:15px;font-weight:700;padding:16px 48px;border-radius:10px;text-decoration:none;letter-spacing:0.3px;">
      View &amp; Download Gate Pass
    </a>
    <p style="font-size:11px;color:#94a3b8;margin:10px 0 0;">Click above to view and download your gate pass.</p>
  </div>` : ''}

  <div style="background:#f8fafc;border-top:1px solid #e2e8f0;border-radius:0 0 12px 12px;padding:14px 28px;text-align:center;border:1px solid #dde8fb;border-top:none;">
    <p style="font-size:11px;color:#94a3b8;margin:0 0 4px;">Please carry a valid government-issued photo ID along with this gate pass.</p>
    <p style="font-size:11px;color:#94a3b8;margin:0 0 4px;">NxtWave Gate Pass System &bull; nxtwave.co.in &bull; &copy; ${year}</p>
    <p style="font-size:10px;color:#cbd5e1;margin:4px 0 0;">Hyderabad, Telangana, India</p>
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
    <p style="font-size:13px;color:#475569;margin:0 0 4px;">Please log in to the Gate Pass System to review and approve or reject this entry.</p>
    ${ctaButton(appUrl + '/approvals', 'Review and Approve')}`;
  return emailShell('New Registration Pending Review', 'Facilities Team', body);
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
  return emailShell('Entry Rejected', 'Admin Notification', body);
}

function userInviteHtml(name: string, inviterName: string, roleName: string, signupUrl: string) {
  const roleLabel = roleName === 'admin' ? 'Admin' : roleName === 'facilities' ? 'Facilities Team' : roleName;
  const body = `
    <p style="font-size:15px;color:#0f172a;font-weight:600;margin:0 0 12px;">Hello ${esc(name)},</p>
    <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 16px;">You have been invited by <strong>${esc(inviterName)}</strong> to join the NxtWave Gate Pass System as <strong>${esc(roleLabel)}</strong>.</p>
    <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 24px;">Click the button below to set up your account and password.</p>
    ${ctaButton(signupUrl, 'Set Up My Account')}
    <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:10px 14px;margin-top:20px;font-size:12px;color:#92400e;">
      <strong>Note:</strong> This invitation link expires in 48 hours.
    </div>
    <p style="font-size:12px;color:#94a3b8;text-align:center;margin:14px 0 4px;">Or copy this link:</p>
    <p style="font-size:11px;color:#3b82f6;text-align:center;word-break:break-all;margin:0;">${signupUrl}</p>`;
  return emailShell('', 'Gate Pass System', body);
}

function registrationConfirmationHtml(name: string) {
  const body = `
    <p style="font-size:15px;color:#0f172a;font-weight:600;margin:0 0 12px;">Hello ${esc(name)},</p>
    <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 16px;">Thank you for completing your registration form. We have received your details and your photo has been uploaded successfully.</p>
    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:14px 18px;margin-bottom:20px;">
      <p style="font-size:13px;color:#15803d;margin:0;font-weight:600;">Registration received — under review</p>
      <p style="font-size:12px;color:#166534;margin:6px 0 0;">Our Facilities Team is reviewing your details. You will receive your Gate Pass once approved. This usually takes 1 business day.</p>
    </div>
    <p style="font-size:13px;color:#475569;margin:0;">If you have any questions, please contact the HR team.</p>`;
  return emailShell('Registration Received', 'Office Entry Registration', body, 'This email was sent because you submitted a registration form for office entry at NxtWave.');
}

function passwordResetHtml(name: string, resetUrl: string) {
  const body = `
    <p style="font-size:15px;color:#0f172a;font-weight:600;margin:0 0 12px;">Hello ${esc(name)},</p>
    <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 16px;">You requested to reset your password for the NxtWave Gate Pass System. Click the button below to set a new password.</p>
    <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:10px 14px;margin-bottom:24px;font-size:12px;color:#92400e;">
      <strong>Important:</strong> This link expires in 1 hour. If you did not request this, please ignore this email.
    </div>
    ${ctaButton(resetUrl, 'Reset Password')}
    <p style="font-size:12px;color:#94a3b8;text-align:center;margin:16px 0 4px;">Or copy this link:</p>
    <p style="font-size:11px;color:#3b82f6;text-align:center;word-break:break-all;margin:0;">${resetUrl}</p>`;
  return emailShell('Password Reset', 'Gate Pass System', body, 'You requested a password reset for your NxtWave Gate Pass account. If you did not request this, you can safely ignore this email.');
}
