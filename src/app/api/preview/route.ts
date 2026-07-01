import { NextRequest, NextResponse } from 'next/server';
import { getDraft } from '@/lib/cms/drafts';
import { getSession } from '@/lib/auth/session';
import { SERVICES } from '@/lib/services';

const PREVIEW_COOKIE = '__preview_draft';
const PREVIEW_TTL = 60 * 60; // 1 hour

// Category service pages (plumbing, sewer, drain, water-heater, water-quality,
// commercial) live under /services/{slug}. Individual service pages
// (sewer-rodding, gas-lines, hydro-jetting, etc.) live at the root /{slug}.
// emergency-plumbing is excluded — it has its own pageType and route.
const SERVICE_CATEGORY_SLUGS = new Set(
  SERVICES.filter(s => s.slug !== 'emergency-plumbing').map(s => s.slug)
);

function pageUrl(pageType: string, pageSlug: string): string {
  if (pageType === 'city' || pageType === 'city-coverage' || pageType === 'city-local') return `/${pageSlug}`;
  if (pageType === 'emergency-plumbing') return '/emergency-plumbing';
  if (pageType === 'service') {
    return SERVICE_CATEGORY_SLUGS.has(pageSlug) ? `/services/${pageSlug}` : `/${pageSlug}`;
  }
  if (pageType === 'city-service' || pageType === 'city-service-standard' || pageType === 'city-service-emergency') {
    return `/${pageSlug}`; // pageSlug is city/service format
  }
  if (pageType === 'financing') return '/financing';
  if (pageType === 'customer-stories') return '/customer-stories';
  if (pageType === 'help-and-support') return '/help-and-support';
  if (pageType === 'locations') return '/locations';
  // main-type pages: pageSlug is the route slug (home → /, everything else → /slug)
  if (pageType === 'main') return pageSlug === 'home' ? '/' : `/${pageSlug}`;
  // article drafts: redirect to knowledge-hub article page
  if (pageType === 'article') return `/knowledge-hub/${pageSlug}`;
  return '/';
}

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.redirect(new URL('/admin/login', req.url));
  }

  const draftId = req.nextUrl.searchParams.get('draftId');
  if (!draftId || isNaN(parseInt(draftId, 10))) {
    return NextResponse.json({ error: 'draftId is required' }, { status: 400 });
  }

  const id = parseInt(draftId, 10);
  const draft = await getDraft(id).catch(() => null);
  if (!draft) {
    return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
  }

  const destination = new URL(pageUrl(draft.page_type, draft.page_slug), req.url);
  const response = NextResponse.redirect(destination);
  response.cookies.set(PREVIEW_COOKIE, String(id), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: PREVIEW_TTL,
    path: '/',
  });

  return response;
}
