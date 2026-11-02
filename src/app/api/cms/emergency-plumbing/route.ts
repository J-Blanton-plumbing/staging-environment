import { NextRequest, NextResponse } from 'next/server';
import { getEpCmsContent } from '@/lib/cms/emergency-plumbing';
import { getSession } from '@/lib/auth/session';
import { requireCmsSession } from '@/lib/auth/api-guard';
import { WH_OLD_SHAPE_MESSAGE } from '@/lib/water-heater-v2-cms/model';

// See src/app/api/cms/global-settings/route.ts for why this is needed: a GET
// handler with no dynamic function usage gets statically cached at build time
// on a real `next build` deploy, serving one build-time snapshot forever.
export const dynamic = 'force-dynamic';

/** The pre-v2 (Brief 16/38) columns of the row, read-only. The Emergency Hub editor uses /api/cms/water-heater-v2/emergency-plumbing. */
export async function GET(req: NextRequest) {
  const auth = await requireCmsSession(req);
  if (!auth.ok) return auth.response;

  try {
    const data = await getEpCmsContent();
    if (!data) {
      return NextResponse.json({ error: 'No emergency plumbing content found' }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error('[cms/emergency-plumbing GET]', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

/**
 * Brief 225: the page is the Emergency Hub now — every edit goes through versions (/admin/emergency-plumbing →
 * /api/cms/drafts → publish), so a direct save of the pre-v2 columns is refused, the Brief 204/222 rule for
 * the sewer and water heater pages. (The pre-v2 writer, updateEpCmsContent, is kept: publishDraft still maps
 * page type 'emergency-plumbing' to it, but a v2 version always takes the v2 writer first.)
 */
export async function PUT(req: NextRequest) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ error: WH_OLD_SHAPE_MESSAGE }, { status: 409 });
}
