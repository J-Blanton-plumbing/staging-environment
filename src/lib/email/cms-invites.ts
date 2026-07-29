/**
 * Brief 119 — invite/approval emails via Resend.
 *
 * Uses the Resend REST API directly with fetch — the `resend` npm SDK is not
 * installed in this project (the Brief 101 "email infra" is the env-var
 * convention in .env.local.example: RESEND_API_KEY + EMAIL_FROM), and the API
 * is a single POST, so no new dependency is needed.
 *
 * Send failures never throw into the caller's transaction: sendEmail returns
 * { ok, error } so the account record is created/advanced regardless and the
 * UI can surface "email failed — use Resend" (Track E). When RESEND_API_KEY is
 * unset (local dev), the full email including the action link is logged to the
 * server console so the flow stays QA-able end to end.
 *
 * Styling per brand-rules.md: Midnight (#0A1B2E) background, Cream (#F9F3EC)
 * text, Carmine (#BC0E0E) buttons. Plain-text fallback on every send.
 */

interface SendResult {
  ok: boolean;
  error?: string;
}

interface EmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

const MIDNIGHT = '#0A1B2E';
const CREAM = '#F9F3EC';
const CARMINE = '#BC0E0E';

async function sendEmail({ to, subject, html, text }: EmailInput): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'noreply@jblantonplumbing.com';

  if (!apiKey) {
    console.warn(
      `[cms-invites] RESEND_API_KEY not configured — email NOT sent.\n` +
        `  To:      ${to}\n  Subject: ${subject}\n  ── plain-text body ──\n${text}\n  ─────────────────────`
    );
    return { ok: false, error: 'Email service is not configured (RESEND_API_KEY missing)' };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: [to], subject, html, text }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`[cms-invites] Resend send failed (${res.status}): ${body}`);
      return { ok: false, error: `Email send failed (${res.status})` };
    }
    return { ok: true };
  } catch (err) {
    console.error('[cms-invites] Resend send error:', err);
    return { ok: false, error: 'Email send failed (network error)' };
  }
}

/** Shared brand shell — table-based for email-client compatibility. */
function emailShell(heading: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:${MIDNIGHT};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${MIDNIGHT};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:${MIDNIGHT};border:1px solid rgba(249,243,236,0.15);border-radius:12px;padding:36px;">
        <tr><td style="font-family:Arial,Helvetica,sans-serif;color:${CREAM};">
          <p style="margin:0 0 6px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:${CREAM};opacity:0.65;">J. Blanton Plumbing — CMS Admin</p>
          <h1 style="margin:0 0 20px;font-size:22px;line-height:1.3;color:${CREAM};">${heading}</h1>
          ${bodyHtml}
          <p style="margin:28px 0 0;font-size:12px;line-height:1.5;color:${CREAM};opacity:0.55;">
            This is an automated message from the J. Blanton Plumbing CMS. If you weren't expecting it, you can safely ignore it — no account becomes active without both an approval and a user-set password.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function button(label: string, url: string, color: string = CARMINE): string {
  return `<a href="${url}" style="display:inline-block;background-color:${color};color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;text-decoration:none;padding:12px 28px;border-radius:9999px;">${label}</a>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Approval request → the approver (marketing@). */
export async function sendApprovalRequestEmail(params: {
  approverEmail: string;
  newUserName: string;
  newUserEmail: string;
  initiatedByName: string;
  approveUrl: string;
  declineUrl: string;
}): Promise<SendResult> {
  const { approverEmail, newUserName, newUserEmail, initiatedByName, approveUrl, declineUrl } = params;
  const name = escapeHtml(newUserName);
  const email = escapeHtml(newUserEmail);
  const initiator = escapeHtml(initiatedByName);

  const html = emailShell(
    'New CMS account needs your approval',
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${CREAM};">
       <strong>${initiator}</strong> wants to add a new CMS admin account:
     </p>
     <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background-color:rgba(249,243,236,0.08);border-radius:8px;padding:16px 20px;width:100%;">
       <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.8;color:${CREAM};">
         <strong>Name:</strong> ${name}<br/>
         <strong>Email:</strong> ${email}<br/>
         <strong>Requested by:</strong> ${initiator}
       </td></tr>
     </table>
     <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:${CREAM};opacity:0.85;">
       If you approve, ${name} will receive an email link to set their own password. Nothing happens until you decide. This link expires in 72 hours.
     </p>
     <p style="margin:0;">
       ${button('Review & Approve', approveUrl)}
       &nbsp;&nbsp;
       <a href="${declineUrl}" style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:${CREAM};text-decoration:underline;padding:12px 8px;">Decline</a>
     </p>`
  );

  const text = [
    `New CMS account needs your approval`,
    ``,
    `${initiatedByName} wants to add a new CMS admin account:`,
    `  Name:  ${newUserName}`,
    `  Email: ${newUserEmail}`,
    ``,
    `If you approve, they will receive an email link to set their own password.`,
    `This link expires in 72 hours.`,
    ``,
    `Approve or decline: ${approveUrl}`,
    `Decline directly:   ${declineUrl}`,
  ].join('\n');

  return sendEmail({
    to: approverEmail,
    subject: `Approve new CMS account: ${newUserName} (${newUserEmail})`,
    html,
    text,
  });
}

/** Invitation → the new user, after approval. */
export async function sendInvitationEmail(params: {
  to: string;
  name: string;
  setPasswordUrl: string;
}): Promise<SendResult> {
  const { to, name, setPasswordUrl } = params;
  const safeName = escapeHtml(name);

  const html = emailShell(
    `You've been approved — set your password`,
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${CREAM};">
       Hi ${safeName}, your J. Blanton Plumbing CMS account has been approved.
     </p>
     <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:${CREAM};opacity:0.85;">
       Choose your own password to activate the account. This link works once and expires in 24 hours — if it expires, ask an admin to resend the invite.
     </p>
     <p style="margin:0;">${button('Set your password', setPasswordUrl)}</p>`
  );

  const text = [
    `Hi ${name},`,
    ``,
    `Your J. Blanton Plumbing CMS account has been approved.`,
    `Set your own password to activate it (link works once, expires in 24 hours):`,
    ``,
    setPasswordUrl,
    ``,
    `If the link has expired, ask an admin to resend your invite.`,
  ].join('\n');

  return sendEmail({
    to,
    subject: `Your J. Blanton CMS account is approved — set your password`,
    html,
    text,
  });
}
