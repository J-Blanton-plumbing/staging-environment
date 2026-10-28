import { NextResponse } from 'next/server';
import { waterHeaterV2Sources } from '@/lib/cms/water-heater-v2';

/**
 * Brief 222 — GET /api/water-heater-v2/source: where each of the 6 water heater pages' content comes from
 * right now ("row", "code", or "not-found" for an unpublished row), through the SAME reader the pages
 * use. The post-deploy check (scripts/check-water-heater-v2-live.mjs) uses it to prove the pages serve
 * their CMS rows. Public and harmless (no content, no ids); `/api/*` answers `X-Robots-Tag: noindex`.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(await waterHeaterV2Sources(), { headers: { 'Cache-Control': 'no-store' } });
}
