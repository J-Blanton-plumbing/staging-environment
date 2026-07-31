import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const COOKIE_NAME = 'cms_session'

async function verifySession(req: NextRequest): Promise<boolean> {
  try {
    const token = req.cookies.get(COOKIE_NAME)?.value
    if (!token) return false
    const secret = process.env.CMS_SESSION_SECRET
    if (!secret) return false
    await jwtVerify(token, new TextEncoder().encode(secret))
    return true
  } catch {
    return false
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

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
