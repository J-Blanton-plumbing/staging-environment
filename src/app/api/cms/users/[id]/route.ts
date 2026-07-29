import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth/session';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = parseInt(params.id, 10);
  if (isNaN(userId)) return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });

  try {
    const { name, email, password } = await req.json();

    const client = await pool.connect();
    try {
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
      const result = await client.query(
        'SELECT id, name, email, created_at FROM cms_users WHERE id = $1',
        [userId]
      );
      if (!result.rows[0]) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      return NextResponse.json(result.rows[0]);
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
      // Brief 119: the lock-out guard protects the last ACTIVE account —
      // pending/invited/declined rows can't log in, so they neither count
      // toward the minimum nor are protected by it.
      const targetResult = await client.query('SELECT status FROM cms_users WHERE id = $1', [userId]);
      if (!targetResult.rows[0]) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      if (targetResult.rows[0].status === 'active') {
        const countResult = await client.query(`SELECT COUNT(*) FROM cms_users WHERE status = 'active'`);
        if (parseInt(countResult.rows[0].count, 10) <= 1) {
          return NextResponse.json(
            { error: 'Cannot delete the only remaining active user' },
            { status: 400 }
          );
        }
      }

      const result = await client.query(
        'DELETE FROM cms_users WHERE id = $1 RETURNING id',
        [userId]
      );
      if (result.rowCount === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      return NextResponse.json({ ok: true });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[cms/users/[id] DELETE]', err);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
