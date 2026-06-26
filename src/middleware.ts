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

  // ── CMS admin session gate ─────────────────────────────────────────────
  if (pathname.startsWith('/admin')) {
    // Login page and auth API are always allowed through
    if (pathname === '/admin/login' || pathname.startsWith('/api/auth/')) {
      return NextResponse.next()
    }

    const valid = await verifySession(req)
    if (!valid) {
      const loginUrl = new URL('/admin/login', req.url)
      return NextResponse.redirect(loginUrl)
    }

    return NextResponse.next()
  }

  // ── Preview Basic Auth (non-admin routes) ──────────────────────────────
  // Skip for CMS API routes, auth routes, and preview routes
  if (pathname.startsWith('/api/cms') || pathname.startsWith('/api/auth') || pathname.startsWith('/api/preview')) {
    return NextResponse.next()
  }

  const user = process.env.PREVIEW_USER
  const pass = process.env.PREVIEW_PASS

  // Skip Basic Auth if credentials not configured
  if (!user || !pass) return NextResponse.next()

  const auth = req.headers.get('authorization')
  if (auth) {
    const [scheme, encoded] = auth.split(' ')
    if (scheme === 'Basic' && encoded) {
      const decoded = Buffer.from(encoded, 'base64').toString()
      const [u, p] = decoded.split(':')
      if (u === user && p === pass) return NextResponse.next()
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
