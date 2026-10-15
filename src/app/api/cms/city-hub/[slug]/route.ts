import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireCmsSession } from '@/lib/auth/api-guard';
import { loadCityHubForEditor } from '@/lib/cms/city-hubs';
import { CITY_HUB_TEMPLATE, CITY_PAGE_TYPES } from '@/lib/city-hub-cms/model';
import { CITY_REGISTRY } from '@/lib/content/cities';
import { getAllServiceSlugs } from '@/lib/content/city-services';

/**
 * Brief 212 (= Brief 206 C1) — GET /api/cms/city-hub/{slug}: the City Hub editor's initial state for
 * one city (the live hub, row over code, or nothing yet), plus whether the city already has a City
 * Hub version (which opens the hub editor even before the template switch). Read-only: every edit
 * goes through versions (/api/cms/drafts → publish). Session-gated like every /api/cms route.
 */
export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const auth = await requireCmsSession(req);
  if (!auth.ok) return auth.response;
  try {
    const load = await loadCityHubForEditor(params.slug);
    if (!load) return NextResponse.json({ error: 'Not a city' }, { status: 404 });
    const v = await pool.query(
      `SELECT 1 FROM page_drafts WHERE page_type = ANY($1) AND page_slug = $2 AND template_type = $3 LIMIT 1`,
      [[...CITY_PAGE_TYPES], params.slug, CITY_HUB_TEMPLATE]
    );
    // Pickers: the city's service pages (cards) and every registered city (community links).
    const serviceOptions = getAllServiceSlugs().sort().map((s) => ({ value: s, label: s.replace(/-/g, ' ') }));
    const cityOptions = CITY_REGISTRY.map((c) => ({ value: c.slug, label: c.name })).sort((a, b) => a.label.localeCompare(b.label));
    return NextResponse.json(
      { ...load, hasHubVersion: (v.rowCount ?? 0) > 0, serviceOptions, cityOptions },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error(`[cms/city-hub/${params.slug} GET]`, err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
