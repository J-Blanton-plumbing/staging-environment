import { NextRequest, NextResponse } from 'next/server';
import { requireCmsSession } from '@/lib/auth/api-guard';
import { loadCityV2ForEditor } from '@/lib/cms/city-v2';

/**
 * Brief 209 CMS wiring — GET /api/cms/city-v2?type={city|city-service}&slug={city | city/service}:
 * the City v2 editor's initial state for one of the 150 pages (5 hubs + 145 service pages).
 * Read-only: every edit goes through versions (/api/cms/drafts → publish), never a direct write.
 * Session-gated like every /api/cms route.
 */
export async function GET(req: NextRequest) {
  const auth = await requireCmsSession(req);
  if (!auth.ok) return auth.response;
  const type = req.nextUrl.searchParams.get('type') ?? '';
  const slug = req.nextUrl.searchParams.get('slug') ?? '';
  try {
    const load = await loadCityV2ForEditor(type, slug);
    if (!load) return NextResponse.json({ error: 'Not a City v2 page' }, { status: 404 });
    return NextResponse.json(load, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error(`[cms/city-v2 GET ${type} ${slug}]`, err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
