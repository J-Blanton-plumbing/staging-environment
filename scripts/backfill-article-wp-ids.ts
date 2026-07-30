/**
 * backfill-article-wp-ids.ts — Brief 122: stamp each imported article with its
 * original WordPress post ID.
 *
 * WHY: the live site orders the Knowledge Hub feed by post_date DESC with the
 * WP post ID as the effective tiebreaker — and the WP export has all 812
 * articles' post_dates clustered in a 33-second window (2026-02-18 06:20:54 –
 * 06:21:26), so nearly every row ties on created_at. Without a stored
 * tiebreaker, Postgres returns tied rows in arbitrary order and the public
 * /knowledge-hub page 1 never matches the live site (and can even shuffle
 * between requests, duplicating/dropping cards across pages).
 *
 * The Brief 50 migration never stored wp:post_id, and the 146 MB WP XML export
 * only exists on the dev machine — so the slug → post ID mapping is checked in
 * as scripts/data/wp-article-ids.json (generated from the export) and this
 * script applies it wherever it runs.
 *
 * SAFETY / IDEMPOTENCY: pure UPDATE by slug of a single nullable column; rows
 * already carrying the correct value are re-written to the same value. No
 * inserts, no deletes, no content columns touched. Safe to run on every
 * deploy. Articles created in the CMS (no WP ancestry) simply keep NULL.
 *
 * Usage:
 *   npx ts-node --project tsconfig.scripts.json scripts/backfill-article-wp-ids.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import pool from '../src/lib/db';

const MAPPING_PATH = path.join(__dirname, 'data', 'wp-article-ids.json');

async function main() {
  const mapping: Record<string, number> = JSON.parse(
    fs.readFileSync(MAPPING_PATH, 'utf8')
  );
  const entries = Object.entries(mapping);
  console.log(`backfill-article-wp-ids: ${entries.length} slug → wp_post_id entries loaded`);

  const client = await pool.connect();
  try {
    // One set-based UPDATE instead of 812 round-trips.
    const result = await client.query(
      `UPDATE cms_articles a
       SET wp_post_id = m.wp_id_text::integer
       FROM jsonb_each_text($1::jsonb) AS m(slug, wp_id_text)
       WHERE a.slug = m.slug`,
      [JSON.stringify(mapping)]
    );
    console.log(`  updated ${result.rowCount} rows`);

    const unmatched = await client.query(
      `SELECT COUNT(*)::int AS n FROM cms_articles WHERE wp_post_id IS NULL`
    );
    console.log(
      `  rows without wp_post_id after backfill: ${unmatched.rows[0].n} ` +
        `(expected: only articles created directly in the CMS)`
    );
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error('backfill-article-wp-ids failed:', e);
  process.exit(1);
});
