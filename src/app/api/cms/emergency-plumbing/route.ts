import { NextRequest, NextResponse } from 'next/server';
import { getEpCmsContent, updateEpCmsContent } from '@/lib/cms/emergency-plumbing';
import { getSession } from '@/lib/auth/session';
import { requireCmsSession } from '@/lib/auth/api-guard';
import pool from '@/lib/db';
import { writeChangelog } from '@/lib/cms/changelog';
import { errorCode } from '@/lib/cms/errors';

// See src/app/api/cms/global-settings/route.ts for why this is needed: a GET
// handler with no dynamic function usage gets statically cached at build time
// on a real `next build` deploy, serving one build-time snapshot forever.
export const dynamic = 'force-dynamic';

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

export async function PUT(req: NextRequest) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    if (body._ping) return NextResponse.json({ ok: true });

    const updatedBy = session?.userId ?? null;
    // Brief 75/78 (DP-1): optimistic concurrency — reject a stale direct edit (409).
    const expectedVersion = typeof body.version === 'number' ? body.version : null;
    const version = await updateEpCmsContent(body, updatedBy, expectedVersion);

    if (updatedBy) {
      const client = await pool.connect();
      try {
        await writeChangelog(client, 'emergency-plumbing', 'emergency-plumbing', updatedBy, body);
      } finally {
        client.release();
      }
    }

    return NextResponse.json({ ok: true, version });
  } catch (err) {
    if (errorCode(err) === '409') {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Conflict' },
        { status: 409 }
      );
    }
    console.error('[cms/emergency-plumbing PUT]', err);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
