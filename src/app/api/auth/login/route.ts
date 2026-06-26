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
        'SELECT id, name, password_hash FROM cms_users WHERE email = $1',
        [email]
      );

      const user = result.rows[0];
      if (!user) {
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
