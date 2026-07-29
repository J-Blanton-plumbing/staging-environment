import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { sendApprovalRequest } from '@/lib/auth/invite-flow';
import { getApproverEmail } from '@/lib/auth/invites';

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT u.id, u.name, u.email, u.status, u.created_at,
                u.approved_at, u.activated_at, u.declined_at,
                inviter.name AS invited_by_name
           FROM cms_users u
           LEFT JOIN cms_users inviter ON inviter.id = u.invited_by
          ORDER BY u.created_at ASC`
      );
      return NextResponse.json(result.rows);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[cms/users GET]', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

/**
 * Brief 119 — initiating a user no longer creates an active login. It creates
 * a `pending_approval` record (no password) and emails the approver
 * (marketing@) an approve/decline link. Only after approval + the new user
 * setting their own password does the account become `active`.
 */
export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { name, email } = await req.json();
    if (!name || !email) {
      return NextResponse.json({ error: 'name and email are required' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // A declined (or stuck pending) request can be re-initiated by an admin:
      // reset the same row back to pending_approval instead of 409ing on the
      // duplicate email. Active/invited accounts still 409.
      const existing = await client.query(
        'SELECT id, status FROM cms_users WHERE email = $1',
        [email]
      );

      let user: { id: number; name: string; email: string };
      if (existing.rows[0]) {
        const { id, status } = existing.rows[0];
        if (status !== 'declined' && status !== 'pending_approval') {
          await client.query('ROLLBACK');
          return NextResponse.json({ error: 'A user with that email already exists' }, { status: 409 });
        }
        const updated = await client.query(
          `UPDATE cms_users
              SET name = $1, status = 'pending_approval', invited_by = $2,
                  approved_by = NULL, approved_at = NULL, declined_at = NULL
            WHERE id = $3
            RETURNING id, name, email`,
          [name, session.userId, id]
        );
        user = updated.rows[0];
      } else {
        const inserted = await client.query(
          `INSERT INTO cms_users (name, email, password_hash, status, invited_by)
           VALUES ($1, $2, NULL, 'pending_approval', $3)
           RETURNING id, name, email`,
          [name, email, session.userId]
        );
        user = inserted.rows[0];
      }

      const emailResult = await sendApprovalRequest(client, req, user, session.name);
      await client.query('COMMIT');

      return NextResponse.json(
        {
          ...user,
          status: 'pending_approval',
          emailSent: emailResult.ok,
          emailError: emailResult.ok
            ? undefined
            : `${emailResult.error}. The request was saved — use Resend once email is working.`,
          approver: getApproverEmail(),
        },
        { status: 201 }
      );
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    console.error('[cms/users POST]', err);
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === '23505') {
      return NextResponse.json({ error: 'A user with that email already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
