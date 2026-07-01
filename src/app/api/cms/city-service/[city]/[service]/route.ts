import { NextRequest, NextResponse } from 'next/server';
import { getCityServiceCmsContent, updateCityServiceCmsContent } from '@/lib/cms/city-service-pages';
import { getSession } from '@/lib/auth/session';
import pool from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: { city: string; service: string } }
) {
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
  const authHeader = req.headers.get('authorization');
  const legacyAuth = authHeader === `Bearer ${process.env.CMS_ADMIN_PASSWORD}`;

  if (!session && !legacyAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Validate parent_slug if provided
  const rawParent = 'parentSlug' in body ? body.parentSlug : undefined;
  if (rawParent !== undefined && rawParent !== null) {
    const check = await pool.connect();
    try {
      const exists = await check.query(
        `SELECT 1 FROM service_category_pages WHERE slug = $1`,
        [rawParent]
      );
      if (exists.rowCount === 0) {
        return NextResponse.json({ error: 'Invalid parentSlug: not found in service_category_pages' }, { status: 400 });
      }
    } finally {
      check.release();
    }
  }

  try {
    const payload = body as unknown as Parameters<typeof updateCityServiceCmsContent>[2];
    if (rawParent !== undefined) {
      payload.parentSlug = rawParent as string | null;
    }
    await updateCityServiceCmsContent(params.city, params.service, payload);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`[cms/city-service/${params.city}/${params.service} PUT]`, err);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
