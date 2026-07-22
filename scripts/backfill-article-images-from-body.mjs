/**
 * Backfill `cms_articles.image` from the first <img> found in the article's stored
 * body HTML.
 *
 * Context (Brief 92 follow-up): all 812 migrated articles have a NULL `image`. Their
 * source WordPress posts have no featured image either (`featured_media: 0`), and the
 * local WP export carried no media — so there is nothing to fetch from the live web
 * for the vast majority. The only recoverable images are the handful embedded inline
 * in the article body (listicle posts). This script sets `image` for exactly those,
 * leaving the rest NULL to fall back to the shared placeholder at render time.
 *
 * Idempotent: only touches rows where `image` is NULL/empty AND the body contains an
 * <img>. Pass --dry to preview without writing.
 *
 * Usage:
 *   node --env-file=.env.local scripts/backfill-article-images-from-body.mjs [--dry]
 */

import pg from 'pg';

const DRY = process.argv.includes('--dry');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: false });

function firstImg(html) {
  const m = (html || '').match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? m[1].trim() : null;
}

const client = await pool.connect();
try {
  const { rows } = await client.query(
    `SELECT slug, body->>'html' AS html
       FROM cms_articles
      WHERE image IS NULL OR image = ''`
  );

  let updated = 0;
  for (const r of rows) {
    const src = firstImg(r.html);
    if (!src) continue;
    console.log(`${DRY ? '[dry] ' : ''}${r.slug}\n    -> ${src}`);
    if (!DRY) {
      await client.query(`UPDATE cms_articles SET image = $1, updated_at = NOW() WHERE slug = $2`, [src, r.slug]);
    }
    updated++;
  }
  console.log(`\n${DRY ? 'Would update' : 'Updated'} ${updated} article(s).`);
} finally {
  client.release();
  await pool.end();
}
