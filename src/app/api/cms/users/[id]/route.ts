import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { getSession, invalidateUserAuthCache } from '@/lib/auth/session';

/**
 * Brief 133 (Track B / SEC-3): the only two statuses this endpoint may set.
 * The invite lifecycle statuses (`pending_approval`, `invited`, `declined`) are
 * owned by the Brief 119 invite flow and must not be reachable from here.
 */
const SETTABLE_STATUSES = ['active', 'disabled'] as const;

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = parseInt(params.id, 10);
  if (isNaN(userId)) return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });

  try {
    const { name, email, password, status, forceSignOut } = await req.json();

    if (status !== undefined && !SETTABLE_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${SETTABLE_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const existing = await client.query('SELECT status FROM cms_users WHERE id = $1', [userId]);
      if (!existing.rows[0]) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      const currentStatus: string = existing.rows[0].status;

      // Disabling the last active account would lock everyone out of the CMS —
      // same guard the DELETE path already enforces.
      if (status === 'disabled' && currentStatus === 'active') {
        const countResult = await client.query(`SELECT COUNT(*) FROM cms_users WHERE status = 'active'`);
        if (parseInt(countResult.rows[0].count, 10) <= 1) {
          await client.query('ROLLBACK');
          return NextResponse.json(
            { error: 'Cannot disable the only remaining active user' },
            { status: 400 }
          );
        }
      }

      if (password) {
        const passwordHash = await bcrypt.hash(password, 12);
        await client.query(
          'UPDATE cms_users SET name = COALESCE($1, name), email = COALESCE($2, email), password_hash = $3 WHERE id = $4',
          [name ?? null, email ?? null, passwordHash, userId]
        );
      } else {
        await client.query(
          'UPDATE cms_users SET name = COALESCE($1, name), email = COALESCE($2, email) WHERE id = $3',
          [name ?? null, email ?? null, userId]
        );
      }

      if (status !== undefined && status !== currentStatus) {
        await client.query('UPDATE cms_users SET status = $1 WHERE id = $2', [status, userId]);
      }

      // Bump the epoch — and so invalidate every live token for this user — when
      // the account is taken out of `active`, or when an admin explicitly forces
      // a sign-out. Re-enabling does NOT bump (nothing to revoke).
      const revoking = forceSignOut === true || (status !== undefined && status !== 'active' && status !== currentStatus);
      let revoked = false;
      if (revoking) {
        await client.query('UPDATE cms_users SET session_epoch = session_epoch + 1 WHERE id = $1', [userId]);
        revoked = true;
      }

      const result = await client.query(
        'SELECT id, name, email, status, created_at FROM cms_users WHERE id = $1',
        [userId]
      );
      await client.query('COMMIT');

      // Drop the cached epoch/status on EVERY write, not just revocations, so
      // the change takes effect on the very next request instead of waiting out
      // the 45s auth cache TTL. (Invalidating only on revoke was a bug: a
      // re-enabled user kept being rejected by the cached `disabled` status
      // until the TTL expired, so their fresh login appeared to fail.)
      invalidateUserAuthCache(userId);

      return NextResponse.json({ ...result.rows[0], revoked });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    console.error('[cms/users/[id] PUT]', err);
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === '23505') {
      return NextResponse.json({ error: 'A user with that email already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(
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

      // Brief 119: the lock-out guard protects the last ACTIVE account —
      // pending/invited/declined rows can't log in, so they neither count
      // toward the minimum nor are protected by it.
      const targetResult = await client.query('SELECT status FROM cms_users WHERE id = $1', [userId]);
      if (!targetResult.rows[0]) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      if (targetResult.rows[0].status === 'active') {
        const countResult = await client.query(`SELECT COUNT(*) FROM cms_users WHERE status = 'active'`);
        if (parseInt(countResult.rows[0].count, 10) <= 1) {
          await client.query('ROLLBACK');
          return NextResponse.json(
            { error: 'Cannot delete the only remaining active user' },
            { status: 400 }
          );
        }
      }

      // Brief 133: bump the epoch before the row disappears. Deletion is already
      // covered by getSession's "no such user → reject" branch; this is
      // belt-and-braces for the case where the DELETE below is rolled back or a
      // replica still serves the old row.
      await client.query('UPDATE cms_users SET session_epoch = session_epoch + 1 WHERE id = $1', [userId]);

      const result = await client.query(
        'DELETE FROM cms_users WHERE id = $1 RETURNING id',
        [userId]
      );
      if (result.rowCount === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      await client.query('COMMIT');
      invalidateUserAuthCache(userId);
      return NextResponse.json({ ok: true });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[cms/users/[id] DELETE]', err);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
