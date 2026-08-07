import { NextRequest, NextResponse } from 'next/server';
import { requireCmsSession } from '@/lib/auth/api-guard';
import pool from '@/lib/db';

// See src/app/api/cms/global-settings/route.ts for why this is needed: a GET
// handler with no dynamic function usage gets statically cached at build time
// on a real `next build` deploy — here that would mean the admin service-pages
// list (titles/status/parent) never reflects new saves after the first deploy.
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireCmsSession(req);
  if (!auth.ok) return auth.response;

  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT s.slug, s.title, s.status, s.parent_slug,
             s.updated_at, u.name AS updated_by_name
        FROM sub_service_pages s
        LEFT JOIN cms_users u ON u.id = s.updated_by
       ORDER BY s.title ASC
    `);
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error('[cms/sub-service-pages GET]', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  } finally {
    client.release();
  }
}
