import { NextRequest, NextResponse } from 'next/server';
import { getCityCmsContent, updateCityCmsContent } from '@/lib/cms/city-pages';
import { getSession } from '@/lib/auth/session';
import { requireCmsSession } from '@/lib/auth/api-guard';
import pool from '@/lib/db';
import { writeChangelog } from '@/lib/cms/changelog';
import { errorCode } from '@/lib/cms/errors';
import { isCityV2City } from '@/lib/content/city-services-v2/registry';
import { OLD_SHAPE_MESSAGE } from '@/lib/city-v2-cms/model';

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const auth = await requireCmsSession(req);
  if (!auth.ok) return auth.response;

  try {
    const data = await getCityCmsContent(params.slug);
    if (!data) {
      return NextResponse.json({ error: `No CMS content found for city "${params.slug}"` }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error(`[cms/city/${params.slug} GET]`, err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    if (body._ping) return NextResponse.json({ ok: true });
    // Brief 209 CMS wiring: the 5 City Hubs V2 are edited only through the City v2 editor's
    // versions (the hub + the city's shared service-page parts). A stale tab of the old city editor
    // is refused instead of overwriting the legacy columns the pre-v2 archive describes.
    if (isCityV2City(params.slug)) {
      return NextResponse.json({ error: OLD_SHAPE_MESSAGE }, { status: 409 });
    }

    // SEC-2 note: contentBody/f2Body rich text is sanitized inside
    // updateCityCmsContent so both this route and the draft-publish path store
    // clean HTML from a single point.
    const updatedBy = session?.userId ?? null;
    // Brief 75 (DP-1): if the editor sent the version it loaded, enforce optimistic
    // concurrency so a stale direct edit is rejected (409) rather than clobbering.
    const expectedVersion = typeof body.version === 'number' ? body.version : null;
    const version = await updateCityCmsContent(params.slug, body, updatedBy, expectedVersion);

    if (updatedBy) {
      const client = await pool.connect();
      try {
        await writeChangelog(client, 'city', params.slug, updatedBy, body);
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
    console.error(`[cms/city/${params.slug} PUT]`, err);
    const msg = err instanceof Error ? err.message : 'Failed to save';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
