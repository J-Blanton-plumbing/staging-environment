import { NextResponse } from 'next/server';
import { sewerV2Sources } from '@/lib/cms/sewer-v2';

/**
 * Brief 204 (Track D2) — GET /api/sewer-v2/source: where each of the 10 Sewer v2 pages' content comes
 * from right now ("row", "code", or "not-found" for an unpublished row), read through the SAME
 * reader the pages render with. The post-deploy check uses it to prove the pages serve their CMS
 * rows rather than the code fallback — the content is identical either way, so the HTML alone
 * cannot tell. Public and harmless (no content, no ids); `/api/*` answers `X-Robots-Tag: noindex`
 * via next.config.mjs.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(await sewerV2Sources(), { headers: { 'Cache-Control': 'no-store' } });
}
