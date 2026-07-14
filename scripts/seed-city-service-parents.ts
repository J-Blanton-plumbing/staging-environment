/**
 * Backfill parent_slug for city_service_pages rows that are missing one.
 *
 * ── Brief 66, Track B note ────────────────────────────────────────────────────
 * Brief 64 changed the meaning of `city_service_pages.parent_slug`: it now holds
 * the SERVICE HUB slug (e.g. `hydro-jetting`), and the broad CATEGORY
 * (plumbing/sewer/drain/water-heater/water-quality/commercial) is DERIVED at read
 * time via `@/lib/content/service-taxonomy` (`deriveCategory`). The `/admin/cities`
 * view and breadcrumb silo both categorize through that taxonomy, which already
 * covers every service slug in the DB — so as of Brief 66 there are ZERO
 * Uncategorized city-service pages and this script is a no-op on current data.
 *
 * This script is kept as a safety net for any FUTURE rows inserted with
 * parent_slug = NULL: it stamps them with their derived CATEGORY. The read-side
 * `categoryOf()` in /admin/cities treats a category-key parent_slug as a valid
 * (back-compat) value, so a category backfill never regresses to Uncategorized.
 * It only touches NULL rows, so it will never clobber a Brief 64 hub-slug value.
 *
 * The service→category mapping is imported from the shared taxonomy rather than
 * duplicated here, so the two can never drift.
 *
 * Run: npx ts-node --project tsconfig.scripts.json scripts/seed-city-service-parents.ts
 */
import pool from '../src/lib/db';
import { deriveCategory } from '../src/lib/content/service-taxonomy';

async function main() {
  const client = await pool.connect();
  try {
    // Distinct service_slug values that have no parent yet.
    const { rows } = await client.query<{ service_slug: string }>(
      `SELECT DISTINCT service_slug FROM city_service_pages WHERE parent_slug IS NULL`
    );

    if (rows.length === 0) {
      console.log('No city_service_pages rows with parent_slug IS NULL — nothing to backfill.');
    }

    let updated = 0;
    let warned = 0;

    for (const { service_slug } of rows) {
      const category = deriveCategory(service_slug);
      if (!category) {
        console.warn(`  ⚠ No category for service_slug "${service_slug}" — leaving NULL`);
        warned++;
        continue;
      }
      const res = await client.query(
        `UPDATE city_service_pages
            SET parent_slug = $1
          WHERE service_slug = $2 AND parent_slug IS NULL
          RETURNING city_slug`,
        [category, service_slug]
      );
      const count = res.rowCount ?? 0;
      console.log(`  ✓ ${service_slug} → ${category} (${count} rows updated)`);
      updated += count;
    }

    const alreadySet = await client.query(
      `SELECT COUNT(*) AS n FROM city_service_pages WHERE parent_slug IS NOT NULL`
    );
    const skipped = parseInt(alreadySet.rows[0].n, 10);

    console.log(`\nDone. ${updated} rows updated, ${skipped} already had a parent, ${warned} service slugs unmapped.`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
