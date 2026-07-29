import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { createSession } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT id, name, password_hash, status FROM cms_users WHERE email = $1',
        [email]
      );

      const user = result.rows[0];
      // Brief 119: only 'active' accounts can log in — pending/invited rows
      // have no password yet (NULL hash) and declined/disabled must never
      // authenticate. Same generic error either way (no account enumeration).
      if (!user || user.status !== 'active' || !user.password_hash) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      }

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      }

      const response = NextResponse.json({ name: user.name });
      return await createSession(user.id, user.name, response);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[auth/login POST]', err);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
