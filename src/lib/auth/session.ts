import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

const COOKIE_NAME = 'cms_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

/**
 * How long a user's `session_epoch` / `status` may be served from the in-process
 * cache (Brief 133, Track B). Without this, every gated request — every admin
 * page render and every /api/cms call — would add a round trip to Postgres.
 *
 * The tradeoff, stated explicitly: a revocation can take up to this long to be
 * honored by a process that already cached the old value. `invalidateUserAuthCache`
 * makes it immediate within the process that performed the revocation, which on
 * the current single-process pm2 deployment means "immediate" in practice.
 */
const AUTH_CACHE_TTL_MS = 45_000;

function getSecret(): Uint8Array {
  const secret = process.env.CMS_SESSION_SECRET;
  if (!secret) throw new Error('CMS_SESSION_SECRET env var is not set');
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  userId: number;
  name: string;
  /**
   * Brief 133: the `cms_users.session_epoch` the token was minted against.
   * Bumping the column invalidates every token carrying an older value.
   * Optional so tokens minted before Brief 133 still parse — they are treated
   * as epoch 0, which matches the column's default, so no one is logged out
   * by the upgrade itself.
   */
  epoch?: number;
}

interface UserAuthState {
  epoch: number;
  status: string;
  exists: boolean;
}

const authCache = new Map<number, { state: UserAuthState; expiresAt: number }>();

/**
 * Drop a user's cached epoch/status so the next `getSession` re-reads the row.
 * Called by the users API whenever it revokes (disable / delete / force
 * sign-out), which is what makes revocation take effect on the very next
 * request rather than up to AUTH_CACHE_TTL_MS later.
 */
export function invalidateUserAuthCache(userId: number): void {
  authCache.delete(userId);
}

/**
 * Read a user's current epoch + status, memoized for AUTH_CACHE_TTL_MS.
 *
 * Returns `null` on a DB error — deliberately distinct from "user not found".
 * Per the brief, a transient Postgres blip must NOT mass-logout every signed-in
 * admin, so the caller accepts the still-signature-valid token in that case and
 * logs loudly. A row that genuinely doesn't exist (deleted user) returns
 * `exists: false` and IS rejected.
 */
async function readUserAuthState(userId: number): Promise<UserAuthState | null> {
  const cached = authCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached.state;

  try {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT session_epoch, status FROM cms_users WHERE id = $1',
        [userId]
      );
      const row = result.rows[0];
      const state: UserAuthState = row
        ? { epoch: Number(row.session_epoch ?? 0), status: String(row.status ?? 'active'), exists: true }
        : { epoch: 0, status: 'deleted', exists: false };
      authCache.set(userId, { state, expiresAt: Date.now() + AUTH_CACHE_TTL_MS });
      return state;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(
      `[auth/session] could not read session_epoch for user ${userId} — accepting the signed token this request (revocation NOT enforced while the DB is unreachable)`,
      err
    );
    return null;
  }
}

/**
 * Read the caller's current `session_epoch` so the freshly minted token is
 * stamped with it. Falls back to 0 (the column default) if the row can't be
 * read — a token stamped too low can only fail closed on a later revocation,
 * never grant extra access.
 */
async function currentEpochFor(userId: number): Promise<number> {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT session_epoch FROM cms_users WHERE id = $1', [userId]);
      return Number(result.rows[0]?.session_epoch ?? 0);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(`[auth/session] could not read session_epoch when minting a session for user ${userId}`, err);
    return 0;
  }
}

export async function createSession(
  userId: number,
  name: string,
  response: NextResponse,
  epoch?: number
): Promise<NextResponse> {
  const stamp = epoch ?? (await currentEpochFor(userId));

  const token = await new SignJWT({ userId, name, epoch: stamp })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret());

  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_TTL_SECONDS,
    path: '/',
  });

  return response;
}

export async function getSession(req?: NextRequest): Promise<SessionPayload | null> {
  try {
    let token: string | undefined;

    if (req) {
      token = req.cookies.get(COOKIE_NAME)?.value;
    } else {
      const cookieStore = await cookies();
      token = cookieStore.get(COOKIE_NAME)?.value;
    }

    if (!token) return null;

    const { payload } = await jwtVerify(token, getSecret());
    const userId = payload.userId as number;
    // Tokens minted before Brief 133 carry no `epoch` claim — treat as 0, the
    // column default, so existing sessions survive the upgrade untouched.
    const tokenEpoch = typeof payload.epoch === 'number' ? payload.epoch : 0;

    // ── Brief 133 (Track B / SEC-3): revocation check ──────────────────────
    const state = await readUserAuthState(userId);
    if (state) {
      if (!state.exists) {
        console.warn(`[auth/session] rejecting session for deleted user ${userId}`);
        return null;
      }
      if (state.status !== 'active') {
        console.warn(`[auth/session] rejecting session for user ${userId} with status "${state.status}"`);
        return null;
      }
      if (tokenEpoch < state.epoch) {
        console.warn(
          `[auth/session] rejecting revoked session for user ${userId} (token epoch ${tokenEpoch} < current ${state.epoch})`
        );
        return null;
      }
    }
    // `state === null` means the DB read failed; readUserAuthState already
    // logged it. Accept the signature-valid token rather than logging every
    // admin out on a transient blip.

    return {
      userId,
      name: payload.name as string,
      epoch: tokenEpoch,
    };
  } catch {
    return null;
  }
}

export function destroySession(response: NextResponse): NextResponse {
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
    path: '/',
  });
  return response;
}
