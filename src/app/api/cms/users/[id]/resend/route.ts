import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { sendApprovalRequest, sendInvitation } from '@/lib/auth/invite-flow';
import { getApproverEmail } from '@/lib/auth/invites';

/**
 * Brief 119 — "Resend" for stuck invites. Session-gated. Re-issues a fresh
 * token (the old link stops working) and re-sends whichever email matches the
 * account's current state:
 *   - pending_approval → approval request to marketing@
 *   - invited          → set-password invitation to the new user
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = parseInt(params.id, 10);
  if (isNaN(userId)) return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        'SELECT id, name, email, status FROM cms_users WHERE id = $1',
        [userId]
      );
      const user = result.rows[0];
      if (!user) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      let sent: { ok: boolean; error?: string };
      let recipient: string;
      if (user.status === 'pending_approval') {
        sent = await sendApprovalRequest(client, req, user, session.name);
        recipient = getApproverEmail();
      } else if (user.status === 'invited') {
        sent = await sendInvitation(client, req, user);
        recipient = user.email;
      } else {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: `Nothing to resend — account status is "${user.status}"` },
          { status: 400 }
        );
      }

      await client.query('COMMIT');
      return NextResponse.json({
        ok: sent.ok,
        recipient,
        error: sent.ok ? undefined : sent.error,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[cms/users/[id]/resend POST]', err);
    return NextResponse.json({ error: 'Failed to resend' }, { status: 500 });
  }
}
