import { NextRequest, NextResponse } from 'next/server';
import { requireCmsSession } from '@/lib/auth/api-guard';
import { loadSewerV2ForEditor } from '@/lib/cms/sewer-v2';

/**
 * Brief 204 — GET /api/cms/sewer-v2/{slug}: the Sewer v2 editor's initial state for one of the 10
 * pages (`sewer` = the hub + shared sections). Read-only: every edit goes through versions
 * (/api/cms/drafts → publish), never a direct write. Session-gated like every /api/cms route.
 */
export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const auth = await requireCmsSession(req);
  if (!auth.ok) return auth.response;
  try {
    const load = await loadSewerV2ForEditor(params.slug);
    if (!load) return NextResponse.json({ error: 'Not a Sewer v2 page' }, { status: 404 });
    return NextResponse.json(load, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error(`[cms/sewer-v2/${params.slug} GET]`, err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
