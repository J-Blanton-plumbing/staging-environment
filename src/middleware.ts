import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { lookupRedirect } from '@/lib/redirects/lookup'
import { normalizePath } from '@/lib/seo'

const COOKIE_NAME = 'cms_session'

/**
 * Paths the legacy redirect map must never be consulted for. `/_next` and `/api`
 * are framework surfaces, `/admin` is the CMS (its own gate runs below), and the
 * extension test skips `public/` assets that the matcher doesn't already exclude
 * (fonts, uploads, videos) — a miss would be harmless but the check is free.
 */
function skipsRedirectLookup(pathname: string): boolean {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/admin') ||
    /\.[a-z0-9]{2,5}$/i.test(pathname)
  )
}

/**
 * Cheap first-pass session gate: signature + expiry only.
 *
 * Brief 133 (Track B / SEC-3) — REVOCATION IS NOT ENFORCED HERE, deliberately.
 * Middleware runs on the Edge runtime (Next 14.2 offers no Node runtime for
 * middleware; `experimental.nodeMiddleware` arrives in 15.2), so it cannot open
 * a Postgres connection to read `cms_users.session_epoch`. Routing that lookup
 * through an internal fetch would add an HTTP round trip to every admin
 * navigation for no security gain.
 *
 * Instead this stays a fast pre-filter that turns away unauthenticated and
 * expired traffic, and the authoritative epoch/status check lives in
 * `getSession` (src/lib/auth/session.ts), which gates every `/api/cms/*` route
 * and — via `src/app/admin/layout.tsx` — every admin page. A revoked token gets
 * past this function and is then rejected downstream, ending at /admin/login.
 * Nothing renders or mutates in between.
 */
async function verifySession(req: NextRequest): Promise<boolean> {
  try {
    const token = req.cookies.get(COOKIE_NAME)?.value
    if (!token) return false
    const secret = process.env.CMS_SESSION_SECRET
    if (!secret) return false
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret))
    // Structural sanity: a token with no userId can never satisfy the epoch
    // lookup downstream, so refuse it here rather than pass it along.
    if (typeof payload.userId !== 'number') return false
    return true
  } catch {
    return false
  }
}

/**
 * Brief 152 (Fix 1) — trailing-slash normalization, moved here from Next's
 * built-in handler via `skipTrailingSlashRedirect: true` in next.config.mjs.
 *
 * WHY MOVE IT. Next's internal rule is prepended to `redirects()` and therefore
 * runs BEFORE middleware, which made every slashed alias a two-hop chain:
 * `/bathroom-plumbing/` → 308 `/bathroom-plumbing` → 301
 * `/bathroom-plumbing-chicago` (verified on production 2026-08-17, and the same
 * for `/why-us/`, `/reviews/`, `/plumbing/` and every other alias). Because the
 * old WordPress site ended every URL in a slash, that shape is what Google holds
 * for essentially the whole site. Doing the strip HERE lets the same pass consult
 * the redirect map and land on the final target in ONE hop.
 *
 * It also emits 301 rather than Next's 308. Google treats them identically, but
 * the SEO tooling this brief is answering to reports on 301 (same reasoning as
 * the `statusCode: 301` choice in next.config.mjs, Brief 127 Track B).
 *
 * METHOD SAFETY: 301/302 let a client rewrite a POST into a GET, so a non-GET
 * request gets 308/307-style method-preserving semantics instead — `POST
 * /api/leads/` must never silently become `GET /api/leads`. The live lead form
 * posts to the unslashed path, so this is belt-and-braces.
 */
function normalizeTrailingSlash(req: NextRequest, pathname: string): NextResponse | null {
  if (pathname === '/' || !pathname.endsWith('/')) return null
  // Framework internals normalize themselves; never touch them.
  if (pathname.startsWith('/_next') || pathname.startsWith('/.well-known')) return null

  const stripped = pathname.replace(/\/+$/, '') || '/'

  // Single hop: if the de-slashed path is itself a redirect source, go straight
  // to its final target instead of bouncing the crawler through it.
  const hit = skipsRedirectLookup(stripped) ? undefined : lookupRedirect(normalizePath(stripped))
  if (hit?.status === 410) return new NextResponse('Gone', { status: 410 })

  const url = new URL(hit ? hit.to : stripped, req.url)
  url.search = req.nextUrl.search
  const methodSafe = req.method === 'GET' || req.method === 'HEAD'
  return NextResponse.redirect(url, methodSafe ? 301 : 308)
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // ── Trailing-slash → canonical form (Brief 152) ────────────────────────
  // FIRST of all, ahead of even the legacy map: every other branch below
  // (including the Basic-Auth gate and the /admin session gate) assumes it is
  // looking at a canonical path, and a crawler asking for `/evanston/` must get
  // its 301 rather than a 401 or a rendered duplicate.
  const slashRedirect = normalizeTrailingSlash(req, pathname)
  if (slashRedirect) return slashRedirect

  // ── Legacy 301s (Brief 131) ────────────────────────────────────────────
  // FIRST, before every other branch: these are indexed WordPress URLs that do
  // not exist on the new build, so there is nothing downstream for them to hit
  // but a 404 — and the Basic-Auth block below would otherwise answer a crawler
  // with a 401 instead of the 301. The lookup is one Map hit on a normalized
  // path (see src/lib/redirects/lookup.ts); the generated map guarantees no
  // source here is a route the build actually serves, so nothing working can be
  // redirected away. The ~18 hand-written next.config.mjs rules run before
  // middleware and win first — none of them is duplicated in the map.
  if (!skipsRedirectLookup(pathname)) {
    // Normalize so trailing-slash and mixed-case variants of an indexed URL
    // resolve to the same entry — WordPress served both forms.
    const hit = lookupRedirect(normalizePath(pathname))
    if (hit) {
      if (hit.status === 410) return new NextResponse('Gone', { status: 410 })
      const url = new URL(hit.to, req.url)
      // Carry the query string across (gclid, utm_*, …) — dropping it would
      // break campaign attribution on every legacy landing URL.
      url.search = req.nextUrl.search
      return NextResponse.redirect(url, hit.status)
    }
  }

  // Brief 127 (Track A): expose the request pathname to the root layout's
  // generateMetadata (layouts can't read the URL otherwise) so every page can
  // render a self-referencing <link rel="canonical">. `set` (not append)
  // overwrites any client-supplied x-pathname, so the value is trustworthy.
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-pathname', pathname)
  const passThrough = () => NextResponse.next({ request: { headers: requestHeaders } })

  // ── CMS admin session gate ─────────────────────────────────────────────
  if (pathname.startsWith('/admin')) {
    // Login page and auth API are always allowed through.
    // Brief 119: the approval + set-password landing pages are token-gated
    // (signed single-use links from email), not session-gated — they must be
    // reachable by people who cannot log in yet. Everything else under
    // /admin/* stays behind the session gate.
    if (
      pathname === '/admin/login' ||
      pathname === '/admin/approve-user' ||
      pathname === '/admin/set-password' ||
      pathname.startsWith('/api/auth/')
    ) {
      return passThrough()
    }

    const valid = await verifySession(req)
    if (!valid) {
      const loginUrl = new URL('/admin/login', req.url)
      return NextResponse.redirect(loginUrl)
    }

    return passThrough()
  }

  // ── CMS API gate (Brief 148, Track A) ──────────────────────────────────
  // Everything under /api/cms serves or mutates admin data — the page inventory,
  // page bodies, city rows, global settings, media, users. Nothing on the public
  // site fetches any of it (the front end reads Postgres directly through
  // src/lib/cms/*); every caller is under /admin or src/components/admin.
  //
  // Protection used to be opt-in per handler, so the default for a new route was
  // OPEN, and fourteen GET handlers were answering anonymous requests with real
  // data. This flips the default: no valid session cookie, no /api/cms, whatever
  // the route file says. `requireCmsSession` still runs inside each handler for
  // the revocation check this Edge context cannot perform (see api-guard.ts).
  //
  // 401 JSON, never a redirect — these are fetch() targets, and bouncing them to
  // an HTML login page would hand the admin UI unparseable JSON on expiry.
  if (pathname.startsWith('/api/cms')) {
    if (await verifySession(req)) return passThrough()
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Preview Basic Auth (non-admin routes) ──────────────────────────────
  // Skip for auth routes (login must be reachable while signed out) and preview
  // routes (session-gated in the handler itself).
  if (pathname.startsWith('/api/auth') || pathname.startsWith('/api/preview')) {
    return passThrough()
  }

  const user = process.env.PREVIEW_USER
  const pass = process.env.PREVIEW_PASS

  // Skip Basic Auth if credentials not configured
  if (!user || !pass) return passThrough()

  // Skip Basic Auth for direct localhost access (local dev / QA tooling). The
  // Cloudflare tunnel arrives with its public host header, so this does not
  // weaken auth on the staging URL.
  const host = req.headers.get('host') ?? ''
  if (host.startsWith('localhost') || host.startsWith('127.0.0.1')) {
    return passThrough()
  }

  const auth = req.headers.get('authorization')
  if (auth) {
    const [scheme, encoded] = auth.split(' ')
    if (scheme === 'Basic' && encoded) {
      const decoded = Buffer.from(encoded, 'base64').toString()
      const [u, p] = decoded.split(':')
      if (u === user && p === pass) return passThrough()
    }
  }

  return new NextResponse('Unauthorized', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="JBP Preview"' },
  })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images/).*)'],
}
