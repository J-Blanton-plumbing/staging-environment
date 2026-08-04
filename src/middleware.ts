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

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

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

  // ── Preview Basic Auth (non-admin routes) ──────────────────────────────
  // Skip for CMS API routes, auth routes, and preview routes
  if (pathname.startsWith('/api/cms') || pathname.startsWith('/api/auth') || pathname.startsWith('/api/preview')) {
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
