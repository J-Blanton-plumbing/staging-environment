import { NextRequest, NextResponse } from 'next/server';

const PREVIEW_COOKIE = '__preview_draft';

export async function GET(req: NextRequest) {
  const returnTo = req.nextUrl.searchParams.get('returnTo') ?? '/';
  const response = NextResponse.redirect(new URL(returnTo, req.url));
  response.cookies.set(PREVIEW_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
    path: '/',
  });
  return response;
}
