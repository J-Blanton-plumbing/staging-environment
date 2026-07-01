/**
 * Best-effort seed: set parent_slug for known sub-service pages.
 * Safe to re-run — only updates rows where parent_slug IS NULL.
 * Run with: npx ts-node scripts/seed-sub-service-parents.ts
 */
import pool from '../src/lib/db';

const MAPPINGS: Array<{ slug: string; parentSlug: string }> = [
  // Plumbing
  { slug: 'bathroom-plumbing',         parentSlug: 'plumbing' },
  { slug: 'bathroom-plumbing-chicago', parentSlug: 'plumbing' },
  { slug: 'kitchen-plumbing',          parentSlug: 'plumbing' },
  { slug: 'laundry-room-plumbing',     parentSlug: 'plumbing' },
  { slug: 'gas-lines-chicago',         parentSlug: 'plumbing' },
  // Sewer
  { slug: 'home-repipe',               parentSlug: 'sewer' },
  { slug: 'hydro-jetting',             parentSlug: 'sewer' },
  { slug: 'sewer-rodding',             parentSlug: 'sewer' },
  { slug: 'sewer-repair',              parentSlug: 'sewer' },
  { slug: 'sewer-maintenance',         parentSlug: 'sewer' },
  // Drain
  { slug: 'basement-flooding',                  parentSlug: 'drain' },
  { slug: 'clogged-drains-in-chicago',          parentSlug: 'drain' },
  { slug: 'drain-cleaning-services-in-chicago', parentSlug: 'drain' },
  { slug: 'kitchen-sink-drain',                 parentSlug: 'drain' },
  // Water Heater
  { slug: 'residential-water-heater',   parentSlug: 'water-heater' },
  { slug: 'commercial-water-heater',    parentSlug: 'water-heater' },
  { slug: 'tankless-water-heater',      parentSlug: 'water-heater' },
  // Water Quality
  { slug: 'water-filtration-systems',  parentSlug: 'water-quality' },
  // Commercial
  { slug: 'commercial-drain-service',     parentSlug: 'commercial' },
  { slug: 'commercial-jetting',           parentSlug: 'commercial' },
  { slug: 'restaurant-drain-clearing',    parentSlug: 'commercial' },
  { slug: 'restaurant-water-heater',      parentSlug: 'commercial' },
  { slug: 'restaurant-plumbing-services', parentSlug: 'commercial' },
];

async function main() {
  const client = await pool.connect();
  try {
    let updated = 0;
    let skipped = 0;
    for (const { slug, parentSlug } of MAPPINGS) {
      const res = await client.query(
        `UPDATE sub_service_pages
            SET parent_slug = $1
          WHERE slug = $2 AND parent_slug IS NULL
          RETURNING slug`,
        [parentSlug, slug]
      );
      if ((res.rowCount ?? 0) > 0) {
        console.log(`  ✓ ${slug} → ${parentSlug}`);
        updated++;
      } else {
        console.log(`  – ${slug}: skipped (row not found or parent already set)`);
        skipped++;
      }
    }
    console.log(`\nDone. ${updated} updated, ${skipped} skipped.`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
