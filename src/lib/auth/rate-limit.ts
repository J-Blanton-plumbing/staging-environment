/**
 * rate-limit.ts — Postgres-backed login throttling (Brief 133, Track A / SEC-5).
 *
 * WHY: `POST /api/auth/login` had no throttling at all. Once the CMS is on a
 * public production domain, an unthrottled login endpoint with bcrypt-only
 * protection is straightforwardly brute-forceable.
 *
 * DESIGN: a fixed 15-minute window per key, counted in one small Postgres
 * table. Deliberately NOT Redis — the app already has a Postgres pool, login
 * volume is a handful of requests a day, and adding an in-memory store would
 * break the moment the app runs more than one process.
 *
 * Two keys are counted per attempt (see `throttleKeysFor`):
 *   - `email:<lowercased email>` — stops password-guessing one account
 *   - `ip:<client ip>`           — stops spraying one password across many accounts
 * Either key hitting the limit blocks the request.
 *
 * FAIL-SAFE: if the throttle table can't be read, `checkLoginThrottle` returns
 * `limited: true` (deny) rather than falling open. A login that can't be
 * rate-limited is exactly the request we don't want to serve, and if Postgres
 * is unreachable the credential check below it would fail anyway.
 */

import type { NextRequest } from 'next/server';
import pool from '@/lib/db';

/** Failed attempts allowed per key before the window locks. */
export const MAX_ATTEMPTS = 5;
/** Rolling window length. The 6th failure inside this window is refused. */
export const WINDOW_SECONDS = 15 * 60;

export interface ThrottleVerdict {
  limited: boolean;
  /** Seconds until the offending window expires — sent as `Retry-After`. */
  retryAfter: number;
}

/**
 * Best-effort client IP. Behind the staging nginx/Cloudflare tunnel the real
 * client is the first `x-forwarded-for` entry.
 *
 * CAVEAT (documented in the Brief 133 report): nginx *appends* to XFF rather
 * than replacing it, so a client can prepend a forged entry and rotate its
 * apparent IP. That evades the IP key only — the per-email key is unspoofable
 * and still holds, which is the limit that actually protects an account. The
 * proper fix is `real_ip_header` / `set_real_ip_from` on the box.
 */
export function clientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;
  return req.ip ?? 'unknown';
}

/** The two throttle keys an attempt counts against. */
export function throttleKeysFor(email: string, ip: string): string[] {
  return [`email:${email.trim().toLowerCase()}`, `ip:${ip}`];
}

/**
 * Is any of these keys currently locked out? Called BEFORE the user lookup so
 * the 429 is identical whether or not the email exists (no enumeration).
 */
export async function checkLoginThrottle(keys: string[]): Promise<ThrottleVerdict> {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT key,
                count,
                CEIL(EXTRACT(EPOCH FROM (window_start + make_interval(secs => $2) - now())))::int AS retry_after
           FROM login_attempts
          WHERE key = ANY($1::text[])`,
        [keys, WINDOW_SECONDS]
      );

      let retryAfter = 0;
      for (const row of result.rows) {
        // A row whose window has already expired is stale, not a lockout.
        if (row.count >= MAX_ATTEMPTS && row.retry_after > 0) {
          retryAfter = Math.max(retryAfter, row.retry_after);
        }
      }
      return { limited: retryAfter > 0, retryAfter };
    } finally {
      client.release();
    }
  } catch (err) {
    // Fail safe: deny. See the header note.
    console.error('[auth/rate-limit] throttle check failed — DENYING login', err);
    return { limited: true, retryAfter: 60 };
  }
}

/**
 * Count one failed attempt against every key. Errors are logged and swallowed —
 * failing to *record* an attempt must not turn a plain wrong-password into a
 * 500, and the check above already fails closed if the table is unreadable.
 */
export async function recordFailedAttempt(keys: string[]): Promise<void> {
  try {
    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO login_attempts (key, window_start, count)
              SELECT k, now(), 1 FROM unnest($1::text[]) AS k
         ON CONFLICT (key) DO UPDATE
              SET count = CASE
                            WHEN login_attempts.window_start < now() - make_interval(secs => $2)
                            THEN 1
                            ELSE login_attempts.count + 1
                          END,
                  window_start = CASE
                            WHEN login_attempts.window_start < now() - make_interval(secs => $2)
                            THEN now()
                            ELSE login_attempts.window_start
                          END`,
        [keys, WINDOW_SECONDS]
      );

      // Opportunistic GC so the table can't grow without bound from spray
      // traffic. Rows well past their window carry no information.
      await client.query(
        `DELETE FROM login_attempts WHERE window_start < now() - make_interval(secs => $1)`,
        [WINDOW_SECONDS * 4]
      );
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[auth/rate-limit] failed to record login attempt', err);
  }
}

/** A successful login clears both of its keys (per the brief: success resets). */
export async function clearLoginThrottle(keys: string[]): Promise<void> {
  try {
    const client = await pool.connect();
    try {
      await client.query(`DELETE FROM login_attempts WHERE key = ANY($1::text[])`, [keys]);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[auth/rate-limit] failed to clear login attempts', err);
  }
}
