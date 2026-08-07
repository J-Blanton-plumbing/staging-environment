import { NextRequest, NextResponse } from 'next/server';
import { requireCmsSession } from '@/lib/auth/api-guard';
import pool from '@/lib/db';

// See src/app/api/cms/global-settings/route.ts for why this is needed: a GET
// handler with no dynamic function usage gets statically cached at build time
// on a real `next build` deploy — here that would mean newly added sub-services
// never appear in this list after the first deploy.
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireCmsSession(req);
  if (!auth.ok) return auth.response;

  const client = await pool.connect();
  try {
    // Distinct sub-services from the subcategories table, slug derived from href
    const result = await client.query(`
      SELECT DISTINCT ON (href)
        label,
        TRIM(BOTH '/' FROM href) AS slug
      FROM service_subcategories
      WHERE href IS NOT NULL AND href != ''
      ORDER BY href, label
    `);

    const services = result.rows
      .map((r: { label: string; slug: string }) => ({ slug: r.slug, title: r.label }))
      .sort((a: { title: string }, b: { title: string }) => a.title.localeCompare(b.title));

    return NextResponse.json(services);
  } catch (err) {
    console.error('[cms/sub-services GET]', err);
    return NextResponse.json({ error: 'Failed to fetch sub-services' }, { status: 500 });
  } finally {
    client.release();
  }
}
