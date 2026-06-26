import { Pool } from 'pg';

/**
 * migrate-page-types.ts — Brief 44
 *
 * Adds a `page_type` column to `main_pages` and stamps the four pages that
 * were previously grouped under the generic "Utility Page" dropdown option
 * with their correct individual type keys.
 *
 * Idempotent: safe to re-run. Uses ADD COLUMN IF NOT EXISTS and WHERE
 * conditions so repeated runs are no-ops.
 *
 * Page type registry (12 types as of Brief 44):
 *   service-category        — Service Category pages (service_category_pages table)
 *   sub-service             — Sub-service pages; static for now (src/lib/content/*.ts)
 *   city-coverage           — City — Coverage Area (city_pages table)
 *   city-local              — City — Local Office (city_pages table)
 *   city-service-standard   — City-Service pages (city_service_pages table)
 *   city-service-emergency  — City-Service (Emergency); CMS editor: future work
 *   emergency-plumbing      — Standalone /emergency-plumbing page (main_pages)
 *   article                 — Articles; static for now (src/lib/articles.ts)
 *   financing               — /financing page (main_pages)
 *   customer-stories        — /customer-stories page (main_pages)
 *   help-and-support        — /help-and-support page (main_pages)
 *   locations               — /locations page (main_pages)
 */

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:jbp@localhost:5432/jbp_cms',
});

async function migrate() {
  const client = await pool.connect();
  try {
    // Step 1: Add page_type column if it doesn't already exist
    await client.query(`
      ALTER TABLE main_pages
        ADD COLUMN IF NOT EXISTS page_type TEXT
    `);
    console.log('✓ page_type column ensured on main_pages');

    // Step 2: Stamp the four former "utility" pages with their correct types.
    // Only updates rows that don't yet have a type set (or have the wrong type)
    // so re-runs leave correctly-typed rows untouched.
    const updates: Array<{ slug: string; type: string }> = [
      { slug: 'financing',        type: 'financing' },
      { slug: 'customer-stories', type: 'customer-stories' },
      { slug: 'help-and-support', type: 'help-and-support' },
      { slug: 'locations',        type: 'locations' },
    ];

    for (const { slug, type } of updates) {
      const res = await client.query(
        `UPDATE main_pages SET page_type = $1 WHERE slug = $2 AND (page_type IS NULL OR page_type != $1)`,
        [type, slug]
      );
      console.log(`✓ ${slug} → page_type = '${type}' (${res.rowCount} row(s) updated)`);
    }

    // Step 3: Verify — confirm zero rows carry the legacy 'utility-page' value
    const legacyCheck = await client.query(
      `SELECT COUNT(*) AS cnt FROM main_pages WHERE page_type = 'utility-page'`
    );
    const legacyCount = parseInt(legacyCheck.rows[0].cnt, 10);
    if (legacyCount > 0) {
      console.error(`✗ ${legacyCount} row(s) still have page_type = 'utility-page' — investigate`);
      process.exit(1);
    }
    console.log("✓ Zero rows with legacy page_type = 'utility-page'");

    // Step 4: Report current state
    const state = await client.query(
      `SELECT slug, page_type FROM main_pages ORDER BY slug`
    );
    console.log('\nCurrent main_pages state:');
    for (const row of state.rows) {
      console.log(`  ${row.slug.padEnd(24)} page_type = ${row.page_type ?? '(null)'}`);
    }

    console.log('\nMigration complete.');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
