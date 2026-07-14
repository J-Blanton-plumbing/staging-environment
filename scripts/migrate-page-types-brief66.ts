/**
 * migrate-page-types-brief66.ts — Brief 66, Track E
 *
 * Brief 44 (migrate-page-types.ts) stamped the four "utility" main_pages rows
 * (financing, customer-stories, help-and-support, locations). The remaining
 * main_pages rows were left with page_type = NULL, making them invisible to any
 * query that filters by type. This stamps them with their canonical type keys.
 *
 * NOTE: `emergency-plumbing` is NOT a main_pages row (it has its own CMS table via
 * updateEpCmsContent), so it is intentionally omitted here even though the brief
 * listed it — there is no NULL main_pages row for it to stamp.
 *
 * Idempotent: only updates rows where page_type IS NULL. Safe to re-run.
 * Run: npx ts-node --project tsconfig.scripts.json scripts/migrate-page-types-brief66.ts
 */

import pool from '../src/lib/db';

const UPDATES: Array<{ slug: string; type: string }> = [
  { slug: 'home',          type: 'home' },
  { slug: 'why-j-blanton', type: 'why-j-blanton' },
  { slug: 'no-drip-club',  type: 'no-drip-club' },
  { slug: 'knowledge-hub', type: 'knowledge-hub' },
];

async function migrate() {
  const client = await pool.connect();
  try {
    for (const { slug, type } of UPDATES) {
      const res = await client.query(
        `UPDATE main_pages SET page_type = $1 WHERE slug = $2 AND page_type IS NULL`,
        [type, slug]
      );
      console.log(`✓ ${slug.padEnd(24)} → page_type = '${type}' (${res.rowCount} row(s))`);
    }

    const nulls = await client.query(`SELECT slug FROM main_pages WHERE page_type IS NULL`);
    if (nulls.rowCount) {
      console.warn(`⚠ ${nulls.rowCount} main_pages row(s) still NULL:`, nulls.rows.map(r => r.slug));
    } else {
      console.log('✓ No NULL page_type values remain in main_pages.');
    }

    const state = await client.query(`SELECT slug, page_type FROM main_pages ORDER BY slug`);
    console.log('\nCurrent main_pages state:');
    for (const row of state.rows) {
      console.log(`  ${row.slug.padEnd(24)} page_type = ${row.page_type ?? '(null)'}`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(err => { console.error('Migration failed:', err); process.exit(1); });
