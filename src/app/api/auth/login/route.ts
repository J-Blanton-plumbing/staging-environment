import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { createSession } from '@/lib/auth/session';
import {
  checkLoginThrottle,
  clearLoginThrottle,
  clientIp,
  recordFailedAttempt,
  throttleKeysFor,
} from '@/lib/auth/rate-limit';

/**
 * Brief 133 (Track A / SEC-5): the same generic body for every throttled
 * response. It must not differ by whether the email exists — the throttle check
 * runs before the user lookup precisely so it can't leak that.
 */
function throttled(retryAfter: number): NextResponse {
  return NextResponse.json(
    { error: 'Too many attempts. Try again later.' },
    { status: 429, headers: { 'Retry-After': String(Math.max(1, retryAfter)) } }
  );
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      // A malformed request isn't a credential guess — it doesn't count against
      // the window (and can't, without an email to key on).
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const keys = throttleKeysFor(email, clientIp(req));

    const verdict = await checkLoginThrottle(keys);
    if (verdict.limited) {
      return throttled(verdict.retryAfter);
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT id, name, password_hash, status, session_epoch FROM cms_users WHERE email = $1',
        [email]
      );

      const user = result.rows[0];
      // Brief 119: only 'active' accounts can log in — pending/invited rows
      // have no password yet (NULL hash) and declined/disabled must never
      // authenticate. Same generic error either way (no account enumeration).
      if (!user || user.status !== 'active' || !user.password_hash) {
        await recordFailedAttempt(keys);
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      }

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        await recordFailedAttempt(keys);
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      }

      // Success resets the window for both keys — a legitimate user who
      // fumbled a few passwords isn't left half-locked-out.
      await clearLoginThrottle(keys);

      const response = NextResponse.json({ name: user.name });
      // Stamp the token with the user's current epoch (Brief 133 Track B) —
      // already in hand from the lookup above, so no extra query.
      return await createSession(user.id, user.name, response, Number(user.session_epoch ?? 0));
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[auth/login POST]', err);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
