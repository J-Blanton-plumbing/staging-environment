/**
 * Brief 63 — Populate `parent_slug` in `city_service_pages`.
 *
 * One-time (idempotent) migration that writes the correct `parent_slug` value to every
 * row in `city_service_pages`, based on the service_slug → category map that is the
 * source of truth in src/app/admin/cities/page.tsx (SERVICE_TO_CATEGORY). The admin
 * page previously fell back to that map client-side because the DB column was mostly
 * NULL; this migration bakes the same mapping into the DB so the fallback is no longer
 * needed and the city-service editor's "PARENT PAGE" field resolves correctly.
 *
 * Idempotent: each UPDATE only touches rows whose parent_slug differs from the target
 * (`parent_slug IS NULL OR parent_slug <> $value`), so it is safe to re-run.
 *
 * `emergency-plumbing` is intentionally left with parent_slug = NULL — it is rendered as
 * a direct "Emergency" link in the admin UI, keyed off its service_slug, not a category.
 *
 * The six valid category values: plumbing, sewer, drain, water-heater, water-quality,
 * commercial. (No city-service page currently maps to `commercial`; commercial-water-heater
 * is categorized as water-heater to match the sub-service taxonomy.)
 *
 * Run with: npx ts-node scripts/migrate-city-service-parent-slugs.ts
 */
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:jbp@localhost:5432/jbp_cms',
});

/**
 * category → service_slug[]. Mirrors SERVICE_TO_CATEGORY in src/app/admin/cities/page.tsx.
 * `emergency-plumbing` is intentionally excluded (stays NULL).
 */
const CATEGORY_TO_SERVICES: Record<string, string[]> = {
  plumbing: [
    'bathroom-plumbing',
    'kitchen-plumbing',
    'kitchen-faucet-repair-and-installation',
    'faucet-installation-repair',
    'toilet-installation-repair',
    'shower-repair',
    'garbage-disposal-installation-repair',
    'burst-pipe-repair',
    'leak-repairs',
    'plumbing-fixture-installations',
    'plumbing-maintenance',
    'plumbing-services',
    'gas-lines',
    'gas-line-installation',
    'gas-line-repair',
    'gas-line-leak-detection',
    'gas-fireplace',
  ],
  sewer: [
    'sewer-rodding',
    'sewer-repair',
    'sewer-maintenance',
    'sewer-drain-clearing',
    'sewage-line-backup-services',
    'overhead-sewer-systems',
    'trenchless-sewer-repair',
    'video-camera-sewer-inspections',
    'hydro-jetting',
    'basement-waterproofing',
    'flood-control-maintenance',
    'ejector-pump',
    'sump-pumps',
  ],
  drain: [
    'basement-flooding',
    'drain-cleaning',
    'clogged-drains',
    'drain-camera-inspection',
    'kitchen-sink-drain',
    'catch-basin',
  ],
  'water-heater': [
    'water-heater-installation',
    'water-heater-repair',
    'water-heater-maintenance',
    'tankless-water-heater',
    'residential-water-heater',
    'commercial-water-heater',
  ],
  'water-quality': [
    'water-filtration-systems',
    'water-testing',
  ],
  // commercial: [] — no city-service page currently maps here.
};

async function main() {
  const client = await pool.connect();
  try {
    let totalUpdated = 0;

    for (const [parentSlug, serviceSlugs] of Object.entries(CATEGORY_TO_SERVICES)) {
      const res = await client.query(
        `UPDATE city_service_pages
            SET parent_slug = $1
          WHERE service_slug = ANY($2::text[])
            AND (parent_slug IS NULL OR parent_slug <> $1)`,
        [parentSlug, serviceSlugs]
      );
      const count = res.rowCount ?? 0;
      console.log(`  ✓ ${parentSlug.padEnd(14)} → ${count} rows updated`);
      totalUpdated += count;
    }

    console.log(`\nDone. ${totalUpdated} rows updated.\n`);

    // Verification: category distribution + any remaining NULLs.
    const { rows: dist } = await client.query<{ parent_slug: string | null; n: string }>(
      `SELECT parent_slug, COUNT(*) AS n
         FROM city_service_pages
         GROUP BY parent_slug
         ORDER BY parent_slug NULLS FIRST`
    );
    console.log('parent_slug distribution:');
    for (const r of dist) {
      console.log(`  ${(r.parent_slug ?? 'NULL').padEnd(14)} ${r.n}`);
    }

    // Any NULL rows that are NOT emergency-plumbing would indicate an unmapped slug.
    const { rows: strayNull } = await client.query<{ service_slug: string; n: string }>(
      `SELECT service_slug, COUNT(*) AS n
         FROM city_service_pages
         WHERE parent_slug IS NULL AND service_slug <> 'emergency-plumbing'
         GROUP BY service_slug
         ORDER BY service_slug`
    );
    if (strayNull.length > 0) {
      console.warn('\n⚠ Unmapped slugs still NULL (excluding emergency-plumbing):');
      for (const r of strayNull) console.warn(`  ${r.service_slug} (${r.n})`);
    } else {
      console.log('\n✓ No stray NULLs — only emergency-plumbing remains NULL, as intended.');
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
