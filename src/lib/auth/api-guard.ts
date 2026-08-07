/**
 * Brief 148 (Track A) — one place that answers "is this caller allowed to touch
 * CMS data?" for every `/api/cms/*` route handler.
 *
 * ── WHY THIS EXISTS ─────────────────────────────────────────────────────────
 * Every WRITE route under /api/cms already opened with the same four lines:
 *
 *     const session = await getSession(req);
 *     if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 *
 * The READ routes mostly did not. Fourteen GET handlers answered an anonymous
 * curl with real data — the full page inventory (slug, title, status, parent),
 * the name of the staff member who last edited each page, every city and
 * city-service row, global settings, and the full JSON body of any page, city,
 * article or sub-service by slug. No customer data, but an internal content
 * inventory and staff names should not be world-readable, and "the write route
 * is protected" was never a reason for the read route not to be.
 *
 * The root cause was structural, not an oversight in any one file: protection
 * was opt-in per handler, so the default for a new route was "open". This helper
 * plus the `/api/cms` gate in `src/middleware.ts` invert that default.
 *
 * ── THE TWO LAYERS, AND WHY BOTH ────────────────────────────────────────────
 * 1. `src/middleware.ts` rejects any `/api/cms/*` request whose session cookie is
 *    missing, unsigned or expired — the choke point, so a route added tomorrow
 *    without an auth line is still closed. It runs on the Edge runtime and
 *    therefore CANNOT reach Postgres, so it cannot see revocation.
 * 2. This helper runs in the route (Node runtime) and calls `getSession`, which
 *    DOES check `cms_users.session_epoch`/`status` — so a disabled, deleted or
 *    force-signed-out user is rejected here even though their token still has a
 *    valid signature. Exactly the split documented in the middleware header for
 *    `/admin`; this extends it to the API.
 *
 * Neither layer is redundant: drop (1) and a new route ships open, drop (2) and a
 * revoked token keeps working until it expires.
 *
 * ── USAGE ───────────────────────────────────────────────────────────────────
 *     export async function GET(req: NextRequest) {
 *       const auth = await requireCmsSession(req);
 *       if (!auth.ok) return auth.response;
 *       // ... auth.session.userId / auth.session.name
 *     }
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSession, type SessionPayload } from './session';

export type CmsAuthResult =
  | { ok: true; session: SessionPayload }
  | { ok: false; response: NextResponse };

/**
 * The single 401 body every CMS API route returns. Kept identical to the string
 * the pre-existing write routes used (`{ error: 'Unauthorized' }`), so no admin
 * client code has to learn a new shape.
 */
export function cmsUnauthorized(): NextResponse {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

/**
 * Resolve the caller's CMS session or produce the 401 to return.
 *
 * `req` is optional only because a handful of handlers are declared as `GET()`
 * with no argument; `getSession` falls back to `cookies()` from `next/headers`,
 * which works the same inside a route handler. Pass the request when you have it.
 */
export async function requireCmsSession(req?: NextRequest): Promise<CmsAuthResult> {
  const session = await getSession(req);
  if (!session) return { ok: false, response: cmsUnauthorized() };
  return { ok: true, session };
}
