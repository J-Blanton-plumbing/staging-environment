import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { consumeInviteToken, getApproverEmail } from '@/lib/auth/invites';
import { sendInvitation } from '@/lib/auth/invite-flow';

/**
 * Brief 119 — approval action (marketing@ clicks the emailed link, lands on
 * /admin/approve-user, and confirms). Token-gated, no session required: the
 * signed single-use token IS the authorization, same trust model as a password
 * reset link. The emailed links themselves are side-effect-free (they only
 * open the landing page) — this POST is what consumes the token, so email
 * scanners that prefetch URLs can't accidentally approve an account.
 *
 * Approve → status 'invited' + invitation email to the new user.
 * Decline → status 'declined'; an admin can re-initiate later.
 */
export async function POST(req: NextRequest) {
  try {
    const { token, action } = await req.json();
    if (!token || (action !== 'approve' && action !== 'decline')) {
      return NextResponse.json({ error: 'token and action (approve|decline) are required' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const lookup = await consumeInviteToken(client, token, 'approval');
      if (lookup.state !== 'valid') {
        await client.query('ROLLBACK');
        return NextResponse.json({ state: lookup.state }, { status: 410 });
      }
      // The token was minted for a pending request; if the account has since
      // moved on (e.g. re-initiated and approved via a newer link), stop here.
      if (lookup.userStatus !== 'pending_approval') {
        await client.query('ROLLBACK');
        return NextResponse.json({ state: 'invalid' }, { status: 410 });
      }

      const approver = getApproverEmail();

      if (action === 'decline') {
        await client.query(
          `UPDATE cms_users SET status = 'declined', declined_at = NOW(), approved_by = $1
            WHERE id = $2`,
          [approver, lookup.userId]
        );
        await client.query('COMMIT');
        return NextResponse.json({ state: 'declined', name: lookup.name, email: lookup.email });
      }

      await client.query(
        `UPDATE cms_users SET status = 'invited', approved_by = $1, approved_at = NOW(), declined_at = NULL
          WHERE id = $2`,
        [approver, lookup.userId]
      );

      const sent = await sendInvitation(client, req, {
        id: lookup.userId!,
        name: lookup.name!,
        email: lookup.email!,
      });

      await client.query('COMMIT');
      return NextResponse.json({
        state: 'approved',
        name: lookup.name,
        email: lookup.email,
        emailSent: sent.ok,
        emailError: sent.ok
          ? undefined
          : `${sent.error}. The approval was recorded — an admin can use Resend on /admin/users to re-send the invitation.`,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[auth/invite/approve POST]', err);
    return NextResponse.json({ error: 'Approval failed' }, { status: 500 });
  }
}
