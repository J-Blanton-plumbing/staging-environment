import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(req: NextRequest) {
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

    // Default: return flat city list (existing behaviour — do not break sidebar/other callers)
    const result = await client.query(
      `SELECT city_slug, city_type FROM city_pages ORDER BY city_slug ASC`
    );
    return NextResponse.json(
      result.rows.map(r => ({ slug: r.city_slug as string, cityType: r.city_type as string }))
    );
  } catch (err) {
    console.error('GET /api/cms/cities error:', err);
    return NextResponse.json({ error: 'Failed to fetch cities' }, { status: 500 });
  } finally {
    client.release();
  }
}
