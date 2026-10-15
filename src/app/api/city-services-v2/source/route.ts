import { NextRequest, NextResponse } from 'next/server';
import { getCity } from '@/lib/content/cities';
import { cityServiceV2Sources } from '@/lib/cms/city-services-v2';
import { CITY_SERVICE_V2_SLUGS } from '@/lib/city-service-v2-cms/code-defaults';
import { CITY_PAGE_BATCHES } from '@/lib/city-batches';

/**
 * Brief 212 (Track B) — GET /api/city-services-v2/source[?cities=a,b]: per `/{city}/{service}`, where
 * its content comes from ("row", "code", "not-found", or "legacy" = the old template), through the
 * same reader the pages use. For the post-deploy CITY PAGES LIVE CHECK, like /api/sewer-v2/source.
 * Public and harmless (no content).
 */
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('cities');
  const cities = (q ? q.split(',') : CITY_PAGE_BATCHES.flatMap((b) => b.cities)).filter((s) => !!getCity(s)).slice(0, 20);
  return NextResponse.json(await cityServiceV2Sources(cities, CITY_SERVICE_V2_SLUGS), { headers: { 'Cache-Control': 'no-store' } });
}
