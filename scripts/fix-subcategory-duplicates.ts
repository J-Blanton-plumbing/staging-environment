/**
 * Brief 41 — Track B: One-time fix for triplicated service_subcategories rows.
 *
 * Root cause: scripts/seed-cms.ts used `ON CONFLICT DO NOTHING` without a unique
 * constraint on service_subcategories, so each seed run inserted another full set
 * of subcategory rows. If the seed ran 3×, each page has 3× the expected rows.
 *
 * This script deduplicates service_subcategories by keeping only the lowest-id
 * row per (page_slug, label) pair, then re-sequences sort_order within each page.
 *
 * Safe to re-run — the DELETE targets only exact duplicates.
 */

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:jbp@localhost:5432/jbp_cms',
});

async function fixSubcategoryDuplicates() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Show current state before fix
    const before = await client.query(
      `SELECT page_slug, COUNT(*) AS row_count
         FROM service_subcategories
        GROUP BY page_slug
        ORDER BY page_slug`
    );
    console.log('Before fix:');
    before.rows.forEach(r => console.log(`  ${r.page_slug}: ${r.row_count} rows`));

    // Delete duplicate rows — keep the first (lowest id) occurrence per (page_slug, label)
    const deleteResult = await client.query(`
      DELETE FROM service_subcategories
      WHERE id NOT IN (
        SELECT DISTINCT ON (page_slug, label) id
        FROM service_subcategories
        ORDER BY page_slug, label, id ASC
      )
    `);
    console.log(`\nDeleted ${deleteResult.rowCount} duplicate rows.`);

    // Re-sequence sort_order within each page so they are 0-based and contiguous
    await client.query(`
      UPDATE service_subcategories s
         SET sort_order = ranked.new_order
        FROM (
          SELECT id,
                 ROW_NUMBER() OVER (PARTITION BY page_slug ORDER BY sort_order, id) - 1 AS new_order
            FROM service_subcategories
        ) ranked
       WHERE s.id = ranked.id
    `);
    console.log('sort_order re-sequenced.');

    // Show state after fix
    const after = await client.query(
      `SELECT page_slug, COUNT(*) AS row_count
         FROM service_subcategories
        GROUP BY page_slug
        ORDER BY page_slug`
    );
    console.log('\nAfter fix:');
    after.rows.forEach(r => console.log(`  ${r.page_slug}: ${r.row_count} rows`));

    await client.query('COMMIT');
    console.log('\nFix complete.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Fix failed — rolled back:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

fixSubcategoryDuplicates();
