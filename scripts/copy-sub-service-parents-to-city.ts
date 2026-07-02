/**
 * Copy parent_slug (service category) from sub_service_pages onto matching
 * city_service_pages rows, so a city-service page is categorized the same way as
 * its sibling sub-service page. Taxonomy source of truth = the sub-service pages,
 * which were categorized by hand in /admin/sub-service/[slug].
 *
 * Matching:
 *   1. Exact slug match (city_service_pages.service_slug === sub_service_pages.slug)
 *   2. Curated aliases for the location-suffixed sub-service variants that are the
 *      same service as a city-service slug (e.g. clogged-drains-in-chicago ↔ clogged-drains)
 *
 * A matched city-service slug has its parent_slug OVERWRITTEN with the sub-service
 * value (so e.g. basement-flooding moves sewer → drain to match the sub-service).
 * Sub-service rows whose parent_slug is NULL are skipped (nothing to copy).
 *
 * Idempotent — safe to re-run. UI-only column, no schema change.
 * Run with: npx ts-node --project tsconfig.scripts.json scripts/copy-sub-service-parents-to-city.ts
 */
import * as fs from 'fs';

// --- env bootstrap: load .env.local if DATABASE_URL isn't already set ---------
if (!process.env.DATABASE_URL && fs.existsSync('.env.local')) {
  for (const line of fs.readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}
// db.ts constructs its Pool from DATABASE_URL at import time, so require it AFTER
// the env is loaded.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pool = require('../src/lib/db').default as import('pg').Pool;

/**
 * Maps a city-service `service_slug` to the sub-service `slug` it should inherit
 * its category from. Exact matches are added programmatically; this table only
 * holds the location-suffixed variants that don't match by string but are clearly
 * the same service.
 */
const CITY_SLUG_TO_SUB_SLUG_ALIAS: Record<string, string> = {
  'bathroom-plumbing': 'bathroom-plumbing-chicago',
  'clogged-drains': 'clogged-drains-in-chicago',
  'drain-cleaning': 'drain-cleaning-services-in-chicago',
};

async function main() {
  const client = await pool.connect();
  try {
    // 1. Load the sub-service taxonomy (slug → parent_slug)
    const sub = await client.query<{ slug: string; parent_slug: string | null }>(
      `SELECT slug, parent_slug FROM sub_service_pages`
    );
    const subParent = new Map<string, string | null>();
    for (const r of sub.rows) subParent.set(r.slug, r.parent_slug);

    // 2. Distinct city-service slugs
    const citySlugs = await client.query<{ service_slug: string }>(
      `SELECT DISTINCT service_slug FROM city_service_pages ORDER BY service_slug`
    );

    // 3. Build the city_service_slug → parent decision from sub-service data
    const plan: Array<{ citySlug: string; via: string; parent: string }> = [];
    for (const { service_slug } of citySlugs.rows) {
      // Emergency is handled as a direct link, never categorized
      if (service_slug === 'emergency-plumbing') continue;

      const subSlug = subParent.has(service_slug)
        ? service_slug
        : CITY_SLUG_TO_SUB_SLUG_ALIAS[service_slug];
      if (!subSlug) continue; // no matching sub-service page

      const parent = subParent.get(subSlug);
      if (!parent) continue; // sub-service page has no category to copy (e.g. kitchen-sink-drain)

      plan.push({
        citySlug: service_slug,
        via: subSlug === service_slug ? 'exact' : `alias:${subSlug}`,
        parent,
      });
    }

    // 4. Apply
    let totalRows = 0;
    console.log(`Copying category from ${plan.length} matched sub-service pages:\n`);
    for (const { citySlug, via, parent } of plan) {
      const res = await client.query(
        `UPDATE city_service_pages
            SET parent_slug = $1
          WHERE service_slug = $2
            AND (parent_slug IS DISTINCT FROM $1)`,
        [parent, citySlug]
      );
      const n = res.rowCount ?? 0;
      totalRows += n;
      console.log(`  ${citySlug.padEnd(38)} → ${parent.padEnd(13)} (${via}) — ${n} rows changed`);
    }

    console.log(`\nDone. ${totalRows} city_service_pages rows updated across ${plan.length} service slugs.`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
