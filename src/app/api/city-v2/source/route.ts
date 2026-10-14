import { NextResponse } from 'next/server';
import { cityV2Sources } from '@/lib/cms/city-v2';

/**
 * Brief 209 CMS wiring — GET /api/city-v2/source: where each of the 150 City v2 pages' content comes
 * from right now ("row", "code", or "not-found" for an unpublished row), read through the SAME
 * readers the pages render with. The post-deploy check uses it to prove the pages serve their CMS
 * rows rather than the code fallback — the content is identical either way, so the HTML alone cannot
 * tell. Public and harmless (no content, no ids), exactly like /api/sewer-v2/source; `/api/*`
 * answers `X-Robots-Tag: noindex` via next.config.mjs.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(await cityV2Sources(), { headers: { 'Cache-Control': 'no-store' } });
}
