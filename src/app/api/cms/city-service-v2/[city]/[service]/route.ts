import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireCmsSession } from '@/lib/auth/api-guard';
import { loadCityServiceV2ForEditor } from '@/lib/cms/city-services-v2';
import { CITY_SERVICE_V2_TEMPLATE } from '@/lib/city-service-v2-cms/model';

/**
 * Brief 212 (Track B) — GET /api/cms/city-service-v2/{city}/{service}: the City Service V2 editor's
 * initial state (the live V2 content, row over code, or null for a legacy page), plus whether the
 * page already has a V2 version. Read-only; edits go through versions. Session-gated.
 */
export async function GET(req: NextRequest, { params }: { params: { city: string; service: string } }) {
  const auth = await requireCmsSession(req);
  if (!auth.ok) return auth.response;
  try {
    const load = await loadCityServiceV2ForEditor(params.city, params.service);
    if (!load) return NextResponse.json({ error: 'No City Service V2 layout for this page' }, { status: 404 });
    const v = await pool.query(
      `SELECT 1 FROM page_drafts WHERE page_type = 'city-service' AND page_slug = $1 AND template_type = $2 LIMIT 1`,
      [`${params.city}/${params.service}`, CITY_SERVICE_V2_TEMPLATE]
    );
    return NextResponse.json({ ...load, hasV2Version: (v.rowCount ?? 0) > 0 }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error(`[cms/city-service-v2/${params.city}/${params.service} GET]`, err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
