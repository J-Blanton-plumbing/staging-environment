/**
 * Brief 119 — shared "issue token + send email" steps, used by:
 *   - POST /api/cms/users            (initiate → approval email)
 *   - POST /api/cms/users/[id]/resend (re-send whichever email fits the status)
 *   - POST /api/auth/invite/approve   (approve → invitation email)
 */

import type { PoolClient } from 'pg';
import { NextRequest } from 'next/server';
import { issueInviteToken, getApproverEmail, resolveBaseUrl } from '@/lib/auth/invites';
import { sendApprovalRequestEmail, sendInvitationEmail } from '@/lib/email/cms-invites';

export interface FlowSendResult {
  ok: boolean;
  error?: string;
}

/** Issue an approval token and email marketing@ the approve/decline request. */
export async function sendApprovalRequest(
  client: PoolClient,
  req: NextRequest,
  user: { id: number; name: string; email: string },
  initiatedByName: string
): Promise<FlowSendResult> {
  const token = await issueInviteToken(client, user.id, 'approval');
  const base = resolveBaseUrl(req);
  const approveUrl = `${base}/admin/approve-user?token=${encodeURIComponent(token)}&intent=approve`;
  const declineUrl = `${base}/admin/approve-user?token=${encodeURIComponent(token)}&intent=decline`;

  return sendApprovalRequestEmail({
    approverEmail: getApproverEmail(),
    newUserName: user.name,
    newUserEmail: user.email,
    initiatedByName,
    approveUrl,
    declineUrl,
  });
}

/** Issue a set-password token and email the new user their invitation. */
export async function sendInvitation(
  client: PoolClient,
  req: NextRequest,
  user: { id: number; name: string; email: string }
): Promise<FlowSendResult> {
  const token = await issueInviteToken(client, user.id, 'invite');
  const base = resolveBaseUrl(req);
  const setPasswordUrl = `${base}/admin/set-password?token=${encodeURIComponent(token)}`;

  return sendInvitationEmail({ to: user.email, name: user.name, setPasswordUrl });
}
