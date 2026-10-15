import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireCmsSession } from '@/lib/auth/api-guard';
import { loadCityHubSharedLive } from '@/lib/cms/city-hubs';
import { CITY_HUB_SHARED_SLUG } from '@/lib/city-hub-cms/model';

/**
 * Brief 212 (= Brief 206 C7) — GET /api/cms/city-hubs-shared: the "Shared across all City Hubs"
 * editor's initial state (the published shared record, or the code default before the seed ran).
 * Read-only; edits go through versions. Session-gated.
 */
export async function GET(req: NextRequest) {
  const auth = await requireCmsSession(req);
  if (!auth.ok) return auth.response;
  try {
    const live = await loadCityHubSharedLive();
    const r = (await pool.query(`SELECT status, version, updated_at FROM main_pages WHERE slug = $1`, [CITY_HUB_SHARED_SLUG])).rows[0];
    return NextResponse.json(
      {
        exists: !!r,
        status: r?.status ?? null,
        version: r?.version ?? 0,
        updatedAt: r?.updated_at ? new Date(r.updated_at).toISOString() : null,
        shared: live.shared,
        source: live.source,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('[cms/city-hubs-shared GET]', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
