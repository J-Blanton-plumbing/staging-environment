/**
 * migrate-brief-126-clear-wp-image-refs.ts — Brief 126 (Fix A2): clear dead
 * WordPress image URLs out of the CMS so the code-level fallback applies.
 *
 * WHY: 185 city_pages rows (hero_image) and 190 city_service_pages rows
 * (service_intro_image) still hold the Brief 50-era WordPress URL
 * `https://jblantonplumbing.com/wp-content/uploads/2019/11/Plumbing-Rough-In-800x600.jpg`,
 * which 404s — so 80% of city pages rendered a broken image in the hero AND the
 * "We've got you covered" section. The 45 working pages simply have an EMPTY
 * image field, letting the template fall back to hero_image.webp
 * (resolveHeroImage in src/lib/content/cities/shared.ts). Clearing the field —
 * rather than hard-coding a replacement URL — keeps that fallback as the single
 * source of truth.
 *
 * SCOPE: the predicate matches ONLY the Plumbing-Rough-In-800x600.jpg URL, per
 * Brief 126's non-goals ("this brief only addresses the
 * Plumbing-Rough-In-800x600.jpg image references"). NOTE: city_service_pages
 * holds ~2,087 further service_intro_image values under 10 OTHER
 * wp-content/uploads URLs — every one verified 404 on 2026-07-31 — left in
 * place here but neutralized at render time by CityPageImage's wp-content
 * guard (Fix A1). Clearing those too is a candidate follow-up brief.
 *
 * WHAT IT DOES (forward, the default):
 *  1. Backs up every affected row (table, id, slug, column, old value) into
 *     `brief126_wp_image_backup` — created if missing, kept after the run.
 *  2. Sets city_pages.hero_image = '' where it holds the dead URL.
 *  3. Sets city_service_pages.service_intro_image = '' likewise.
 *  Both updates bump version + updated_at so open CMS editors get the standard
 *  optimistic-concurrency 409 instead of silently re-saving the dead URL.
 *
 * SAFETY / IDEMPOTENCY: single transaction; pure column-clear driven by a LIKE
 * predicate, so a second run matches nothing and is a no-op. History tables
 * (page_changelog, template_switch_archive) are intentionally NOT touched —
 * they are audit records.
 *
 * ROLLBACK: run with --rollback to restore the backed-up values. Only rows
 * whose field is still empty are restored, so content edited after the cleanup
 * is never clobbered.
 *
 * Usage:
 *   npx ts-node --project tsconfig.scripts.json scripts/migrate-brief-126-clear-wp-image-refs.ts
 *   npx ts-node --project tsconfig.scripts.json scripts/migrate-brief-126-clear-wp-image-refs.ts --rollback
 */

import pool from '../src/lib/db';

const DEAD_IMAGE_LIKE = '%wp-content/uploads/2019/11/Plumbing-Rough-In-800x600%';

const TARGETS = [
  { table: 'city_pages', idCol: 'id', slugCol: 'city_slug', column: 'hero_image' },
  { table: 'city_service_pages', idCol: 'id', slugCol: 'city_slug', column: 'service_intro_image' },
] as const;

async function main() {
  const rollback = process.argv.includes('--rollback');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS brief126_wp_image_backup (
        id            SERIAL PRIMARY KEY,
        source_table  TEXT NOT NULL,
        source_id     INTEGER NOT NULL,
        city_slug     TEXT NOT NULL,
        service_slug  TEXT,
        column_name   TEXT NOT NULL,
        old_value     TEXT NOT NULL,
        backed_up_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);

    for (const t of TARGETS) {
      const serviceSlugExpr = t.table === 'city_service_pages' ? 'service_slug' : 'NULL';

      if (rollback) {
        const res = await client.query(
          `UPDATE ${t.table} x
           SET ${t.column} = b.old_value,
               version     = x.version + 1,
               updated_at  = NOW()
           FROM brief126_wp_image_backup b
           WHERE b.source_table = $1
             AND b.column_name  = $2
             AND x.${t.idCol}   = b.source_id
             AND x.${t.column}  = ''`,
          [t.table, t.column]
        );
        console.log(`rollback: restored ${res.rowCount} ${t.table}.${t.column} values`);
        continue;
      }

      const backup = await client.query(
        `INSERT INTO brief126_wp_image_backup
           (source_table, source_id, city_slug, service_slug, column_name, old_value)
         SELECT $1, ${t.idCol}, ${t.slugCol}, ${serviceSlugExpr}, $2, ${t.column}
         FROM ${t.table}
         WHERE ${t.column} LIKE $3`,
        [t.table, t.column, DEAD_IMAGE_LIKE]
      );
      const cleared = await client.query(
        `UPDATE ${t.table}
         SET ${t.column} = '',
             version     = version + 1,
             updated_at  = NOW()
         WHERE ${t.column} LIKE $1`,
        [DEAD_IMAGE_LIKE]
      );
      console.log(
        `${t.table}.${t.column}: backed up ${backup.rowCount}, cleared ${cleared.rowCount}` +
          (cleared.rowCount === 0 ? ' (already clean — no-op)' : '')
      );
    }

    await client.query('COMMIT');
    console.log(rollback ? 'rollback complete' : 'cleanup complete');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('migrate-brief-126-clear-wp-image-refs failed:', err);
  process.exit(1);
});
