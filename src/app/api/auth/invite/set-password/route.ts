import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { consumeInviteToken } from '@/lib/auth/invites';
import { checkPassword } from '@/lib/auth/password-policy';

/**
 * Brief 119 — activation: the invited user sets their own password.
 * Token-gated (no session). Enforces the password policy server-side,
 * bcrypt-hashes, marks the account 'active', and consumes the token —
 * after this the link is dead and the user logs in at /admin/login.
 */
export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();
    if (!token || !password) {
      return NextResponse.json({ error: 'token and password are required' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const lookup = await consumeInviteToken(client, token, 'invite');
      if (lookup.state !== 'valid') {
        await client.query('ROLLBACK');
        return NextResponse.json({ state: lookup.state }, { status: 410 });
      }
      if (lookup.userStatus !== 'invited') {
        await client.query('ROLLBACK');
        return NextResponse.json({ state: 'invalid' }, { status: 410 });
      }

      const policy = checkPassword(password, [lookup.name || '', (lookup.email || '').split('@')[0]]);
      if (!policy.ok) {
        // Policy failure must NOT burn the single-use token — roll back the
        // consume so the user can try again with a stronger password.
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Password is too weak', details: policy.errors }, { status: 422 });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      await client.query(
        `UPDATE cms_users SET password_hash = $1, status = 'active', activated_at = NOW()
          WHERE id = $2`,
        [passwordHash, lookup.userId]
      );

      await client.query('COMMIT');
      return NextResponse.json({ state: 'activated', email: lookup.email });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[auth/invite/set-password POST]', err);
    return NextResponse.json({ error: 'Failed to set password' }, { status: 500 });
  }
}
