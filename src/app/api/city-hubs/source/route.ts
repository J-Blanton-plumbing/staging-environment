import { NextRequest, NextResponse } from 'next/server';
import { getCity } from '@/lib/content/cities';
import { cityHubSources } from '@/lib/cms/city-hubs';
import { CITY_PAGE_BATCHES } from '@/lib/city-batches';

/**
 * Brief 212 (Track A) — GET /api/city-hubs/source[?slugs=a,b]: where each City Hub's content comes
 * from right now ("row", "code", "not-found" for an unpublished row, "legacy" for a city that is not
 * a hub), read through the SAME reader the pages render with, plus whether the shared sections come
 * from the shared record ("row") or the code default. The post-deploy CITY PAGES LIVE CHECK uses it
 * to prove the hubs serve their CMS rows — the content is identical either way for Batch 1, so the
 * HTML alone cannot tell. Public and harmless (no content); `/api/*` answers `X-Robots-Tag: noindex`.
 */
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('slugs');
  const slugs = (q ? q.split(',') : CITY_PAGE_BATCHES.flatMap((b) => b.cities)).filter((s) => !!getCity(s)).slice(0, 50);
  return NextResponse.json(await cityHubSources(slugs), { headers: { 'Cache-Control': 'no-store' } });
}
