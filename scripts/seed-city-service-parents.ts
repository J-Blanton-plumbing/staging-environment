/**
 * Best-effort seed: derive parent_slug for city_service_pages rows from their service_slug.
 * Uses the same service→category mapping as seed-sub-service-parents.ts.
 * Safe to re-run — only updates rows where parent_slug IS NULL.
 * Run with: npx ts-node scripts/seed-city-service-parents.ts
 */
import pool from '../src/lib/db';

const SERVICE_TO_PARENT: Record<string, string> = {
  'bathroom-plumbing':  'plumbing',
  'kitchen-plumbing':   'plumbing',
  'hydro-jetting':      'sewer',
  'sewer-rodding':      'sewer',
  'basement-flooding':  'sewer',
};

async function main() {
  const client = await pool.connect();
  try {
    // Fetch all distinct service_slug values that have no parent yet
    const { rows } = await client.query<{ service_slug: string }>(
      `SELECT DISTINCT service_slug FROM city_service_pages WHERE parent_slug IS NULL`
    );

    let updated = 0;
    let skipped = 0;
    let warned = 0;

    for (const { service_slug } of rows) {
      const parentSlug = SERVICE_TO_PARENT[service_slug];
      if (!parentSlug) {
        console.warn(`  ⚠ No mapping for service_slug "${service_slug}" — leaving NULL`);
        warned++;
        continue;
      }
      const res = await client.query(
        `UPDATE city_service_pages
            SET parent_slug = $1
          WHERE service_slug = $2 AND parent_slug IS NULL
          RETURNING city_slug`,
        [parentSlug, service_slug]
      );
      const count = res.rowCount ?? 0;
      console.log(`  ✓ ${service_slug} → ${parentSlug} (${count} rows updated)`);
      updated += count;
    }

    // Count skipped (rows that already had a parent)
    const alreadySet = await client.query(
      `SELECT COUNT(*) AS n FROM city_service_pages WHERE parent_slug IS NOT NULL`
    );
    skipped = parseInt(alreadySet.rows[0].n, 10);

    console.log(`\nDone. ${updated} rows updated, ${skipped} already had a parent, ${warned} service slugs unmapped.`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
