import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAllServiceSlugs } from '@/lib/content/city-services';

function titleCase(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Parent-page options for the city-service editor's "Parent Page" dropdown.
 *
 * Brief 64: `city_service_pages.parent_slug` now holds a SERVICE HUB slug, so the
 * dropdown must offer every valid hub — not just the 6 category landing pages in
 * service_category_pages. We return the union of:
 *   - service_category_pages.slug  (category landing pages + legacy hubs)
 *   - sub_service_pages.slug        (hub pages incl. location-suffixed variants)
 *   - the city-services registry    (hub === service_slug for most rows)
 * deduped and sorted, so a hub-parented page resolves in the editor and its parent
 * is preserved on save (previously a hub value showed as "None assigned").
 */
// See src/app/api/cms/global-settings/route.ts for why this is needed: a GET
// handler with no dynamic function usage gets statically cached at build time
// on a real `next build` deploy, serving one build-time snapshot forever —
// here that would mean newly added/renamed pages never appear in this dropdown.
export const dynamic = 'force-dynamic';

export async function GET() {
  const client = await pool.connect();
  try {
    const [cats, subs] = await Promise.all([
      client.query(`SELECT slug FROM service_category_pages`),
      client.query(`SELECT slug FROM sub_service_pages`),
    ]);

    const slugs = new Set<string>();
    for (const r of cats.rows) slugs.add(r.slug as string);
    for (const r of subs.rows) slugs.add(r.slug as string);
    for (const s of getAllServiceSlugs()) slugs.add(s);

    const rows = Array.from(slugs)
      .sort((a, b) => a.localeCompare(b))
      .map((slug) => ({ slug, title: titleCase(slug) }));

    return NextResponse.json(rows);
  } catch (err) {
    console.error('[cms/service-categories GET]', err);
    return NextResponse.json({ error: 'Failed to fetch service categories' }, { status: 500 });
  } finally {
    client.release();
  }
}
