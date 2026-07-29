/**
 * Brief 119 — invite/approval token helpers.
 *
 * Token model (Track F):
 *   - Signed with `jose` HS256 using CMS_SESSION_SECRET (same secret handling
 *     as the cms_session cookie — no new secret to rotate).
 *   - Time-limited: approval link 72h, set-password link 24h.
 *   - Single-use: the SHA-256 hash of each issued token is stored in
 *     cms_user_invites (never the raw token — that lives only in the emailed
 *     URL). Consuming a token is an atomic UPDATE ... WHERE used_at IS NULL,
 *     so a token can never be redeemed twice even under concurrent clicks.
 *   - Issuing a new token of a kind deletes that user's previous unused tokens
 *     of the same kind (a resend invalidates the old link).
 */

import { createHash, randomUUID } from 'crypto';
import { SignJWT, jwtVerify } from 'jose';
import type { PoolClient } from 'pg';
import { NextRequest } from 'next/server';

export type InviteKind = 'approval' | 'invite';

export const INVITE_TTL_SECONDS: Record<InviteKind, number> = {
  approval: 60 * 60 * 72, // 72h — marketing@ approve/decline link
  invite: 60 * 60 * 24, // 24h — new user's set-password link
};

/**
 * Approver address for every new-account request. Configurable via env so it
 * is not a scattered hardcoded literal (Brief 119 hard rule).
 */
export function getApproverEmail(): string {
  return process.env.CMS_APPROVER_EMAIL || 'marketing@jblantonplumbing.com';
}

/**
 * Base URL used to build the emailed links. Prefers the explicit env var
 * (matches the logout route's convention), then the origin the current
 * request arrived on, then localhost for bare local dev.
 */
export function resolveBaseUrl(req?: NextRequest): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, '');
  if (req) {
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    if (host) {
      const proto = req.headers.get('x-forwarded-proto') || (host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https');
      return `${proto}://${host}`;
    }
  }
  return 'http://localhost:3000';
}

function getSecret(): Uint8Array {
  const secret = process.env.CMS_SESSION_SECRET;
  if (!secret) throw new Error('CMS_SESSION_SECRET env var is not set');
  return new TextEncoder().encode(secret);
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Issue a signed single-use token for a user, persisting only its hash.
 * Deletes any previous unused token of the same kind (resend = old link dies).
 * Must run inside the caller's client/transaction.
 */
export async function issueInviteToken(
  client: PoolClient,
  userId: number,
  kind: InviteKind
): Promise<string> {
  const ttl = INVITE_TTL_SECONDS[kind];
  const token = await new SignJWT({ sub: String(userId), kind, jti: randomUUID() })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${ttl}s`)
    .sign(getSecret());

  await client.query(
    `DELETE FROM cms_user_invites WHERE user_id = $1 AND kind = $2 AND used_at IS NULL`,
    [userId, kind]
  );
  await client.query(
    `INSERT INTO cms_user_invites (user_id, kind, token_hash, expires_at)
     VALUES ($1, $2, $3, NOW() + make_interval(secs => $4))`,
    [userId, kind, hashToken(token), ttl]
  );

  return token;
}

export type InviteState = 'valid' | 'expired' | 'used' | 'invalid';

export interface InviteLookup {
  state: InviteState;
  userId?: number;
  name?: string;
  email?: string;
  userStatus?: string;
  invitedByName?: string | null;
}

/**
 * Verify a token's signature/expiry and look up its DB row WITHOUT consuming
 * it. Used by the landing pages to show a friendly state before any action.
 */
export async function inspectInviteToken(
  client: PoolClient,
  token: string,
  kind: InviteKind
): Promise<InviteLookup> {
  let userId: number;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.kind !== kind || !payload.sub) return { state: 'invalid' };
    userId = parseInt(payload.sub, 10);
  } catch (err) {
    const code = (err as { code?: string })?.code;
    return { state: code === 'ERR_JWT_EXPIRED' ? 'expired' : 'invalid' };
  }

  const result = await client.query(
    `SELECT i.used_at, i.expires_at, u.id AS user_id, u.name, u.email, u.status,
            inviter.name AS invited_by_name
       FROM cms_user_invites i
       JOIN cms_users u ON u.id = i.user_id
       LEFT JOIN cms_users inviter ON inviter.id = u.invited_by
      WHERE i.token_hash = $1 AND i.kind = $2`,
    [hashToken(token), kind]
  );
  const row = result.rows[0];
  // No row = never issued, or superseded by a newer resend.
  if (!row) return { state: 'invalid' };

  const base = {
    userId: row.user_id as number,
    name: row.name as string,
    email: row.email as string,
    userStatus: row.status as string,
    invitedByName: (row.invited_by_name as string | null) ?? null,
  };
  if (row.used_at) return { state: 'used', ...base };
  if (new Date(row.expires_at) < new Date()) return { state: 'expired', ...base };
  return { state: 'valid', ...base };
}

/**
 * Atomically consume a token (single-use enforcement). Returns the lookup with
 * state 'valid' exactly once; every later attempt sees 'used'.
 */
export async function consumeInviteToken(
  client: PoolClient,
  token: string,
  kind: InviteKind
): Promise<InviteLookup> {
  const lookup = await inspectInviteToken(client, token, kind);
  if (lookup.state !== 'valid') return lookup;

  const result = await client.query(
    `UPDATE cms_user_invites SET used_at = NOW()
      WHERE token_hash = $1 AND kind = $2 AND used_at IS NULL AND expires_at > NOW()
      RETURNING user_id`,
    [hashToken(token), kind]
  );
  // Lost a race with a concurrent redeem — treat as already used.
  if (result.rowCount === 0) return { ...lookup, state: 'used' };
  return lookup;
}
