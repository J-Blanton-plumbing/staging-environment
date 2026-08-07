import { NextRequest, NextResponse } from 'next/server';
import { getCityServiceCmsContent, updateCityServiceCmsContent } from '@/lib/cms/city-service-pages';
import { getSession } from '@/lib/auth/session';
import { requireCmsSession } from '@/lib/auth/api-guard';
import { getAllServiceSlugs } from '@/lib/content/city-services';
import pool from '@/lib/db';
import { errorCode } from '@/lib/cms/errors';

export async function GET(
  req: NextRequest,
  { params }: { params: { city: string; service: string } }
) {
  const auth = await requireCmsSession(req);
  if (!auth.ok) return auth.response;

  try {
    const data = await getCityServiceCmsContent(params.city, params.service);
    if (!data) {
      return NextResponse.json({ error: 'No content found' }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error(`[cms/city-service/${params.city}/${params.service} GET]`, err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { city: string; service: string } }
) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Validate parent_slug if provided. Under Brief 64 the parent is a SERVICE HUB
  // slug (e.g. `emergency-plumbing`, `hydro-jetting`, `clogged-drains-in-chicago`),
  // not a broad category. Accept a value that is any of:
  //   - a city-services registry slug (the common case: hub === service_slug)
  //   - a `sub_service_pages.slug` (covers location-suffixed hub variants)
  //   - a `service_category_pages.slug` (backward compat with Brief 63 values)
  // Anything else still 400s — validation is not silently dropped.
  const rawParent = 'parentSlug' in body ? body.parentSlug : undefined;
  if (rawParent !== undefined && rawParent !== null) {
    const parentStr = String(rawParent);
    let valid = getAllServiceSlugs().includes(parentStr);
    if (!valid) {
      const check = await pool.connect();
      try {
        const exists = await check.query(
          `SELECT 1 FROM sub_service_pages WHERE slug = $1
           UNION ALL
           SELECT 1 FROM service_category_pages WHERE slug = $1
           LIMIT 1`,
          [parentStr]
        );
        valid = (exists.rowCount ?? 0) > 0;
      } finally {
        check.release();
      }
    }
    if (!valid) {
      return NextResponse.json(
        { error: 'Invalid parentSlug: not a known service hub, sub-service, or category slug' },
        { status: 400 }
      );
    }
  }

  try {
    const payload = body as unknown as Parameters<typeof updateCityServiceCmsContent>[2];
    if (rawParent !== undefined) {
      payload.parentSlug = rawParent as string | null;
    }
    // Brief 75/78 (DP-1): optimistic concurrency — reject a stale direct edit (409).
    const expectedVersion = typeof body.version === 'number' ? body.version : null;
    const version = await updateCityServiceCmsContent(params.city, params.service, payload, expectedVersion);
    return NextResponse.json({ ok: true, version });
  } catch (err) {
    if (errorCode(err) === '409') {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Conflict' },
        { status: 409 }
      );
    }
    console.error(`[cms/city-service/${params.city}/${params.service} PUT]`, err);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
