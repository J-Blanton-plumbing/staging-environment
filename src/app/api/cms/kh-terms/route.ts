import { NextRequest, NextResponse } from 'next/server';
import { requireCmsSession } from '@/lib/auth/api-guard';
import { listTerms } from '@/lib/cms/kh-taxonomy';

/**
 * Brief 187 — GET /api/cms/kh-terms: every Knowledge Hub term (topics, regions,
 * cities) with its published-article count. Feeds the article editor's pickers
 * and the "Topics & Locations" admin screen.
 *
 * Session-gated twice over, like every /api/cms route (Brief 148): the
 * middleware default-deny, and `requireCmsSession` here for revocation.
 */
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireCmsSession(req);
  if (!auth.ok) return auth.response;
  try {
    return NextResponse.json(await listTerms());
  } catch (err) {
    console.error('[cms/kh-terms GET]', err);
    return NextResponse.json(
      { error: 'Topics & Locations are unavailable. The Brief 187 migration may not have run on this database yet.' },
      { status: 500 }
    );
  }
}
