import { NextRequest, NextResponse } from 'next/server';
import { requireCmsSession } from '@/lib/auth/api-guard';
import pool from '@/lib/db';

export async function GET(req: NextRequest) {
  const auth = await requireCmsSession(req);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const view = searchParams.get('view');

  const client = await pool.connect();
  try {
    // view=city-services returns city_service_pages rows for the grouped cities admin page
    if (view === 'city-services') {
      // NOTE: city_service_pages has no `status` column. Select NULL so the query
      // succeeds and the admin page degrades gracefully (renders "—" / grey dot).
      const result = await client.query(`
        SELECT cs.city_slug, cs.service_slug, cs.parent_slug,
               cs.updated_at, NULL::text AS status
          FROM city_service_pages cs
         ORDER BY cs.parent_slug ASC NULLS LAST, cs.service_slug ASC, cs.city_slug ASC
      `);
      return NextResponse.json(result.rows);
    }

    // Default: return flat city list (existing behaviour — do not break sidebar/other callers).
    //
    // Brief 158 (Track B): `updated_at` is ADDITIVE. /admin/cities now builds its
    // card set from the UNION of this list and the city-service rows, so a city
    // with a `city_pages` row but no service pages gets a card — and needs a
    // freshness value of its own, or it could never surface in the "Recent" view
    // no matter how recently someone edited its city page. Existing callers
    // (CreatePageModal) read `slug`/`cityType` and are unaffected by an extra key.
    const result = await client.query(
      `SELECT city_slug, city_type, updated_at FROM city_pages ORDER BY city_slug ASC`
    );
    return NextResponse.json(
      result.rows.map(r => ({
        slug: r.city_slug as string,
        cityType: r.city_type as string,
        updatedAt: r.updated_at ? new Date(r.updated_at as string | Date).toISOString() : null,
      }))
    );
  } catch (err) {
    console.error('GET /api/cms/cities error:', err);
    return NextResponse.json({ error: 'Failed to fetch cities' }, { status: 500 });
  } finally {
    client.release();
  }
}
