/**
 * seed-hiring-page.ts — idempotent seed for the "Join Our Team" utility page
 * (Brief 109).
 *
 * WHY THIS EXISTS:
 * The public page (/j-blanton-is-hiring) renders from static defaults when no
 * DB row exists, but the CMS editor (/admin/j-blanton-is-hiring) needs the
 * `main_pages` row to load (GET) and save (PATCH is an UPDATE, not an upsert).
 * The deploy pipeline runs ensure-schema (columns only, never row data) and the
 * global-settings migration — it does NOT run seed-main-pages — so a brand-new
 * slug would have no row on staging/prod. This script provisions exactly that
 * one row and nothing else.
 *
 * SAFETY: single `INSERT ... ON CONFLICT (slug) DO NOTHING`. If the row already
 * exists it is left untouched (marketing's edits are never clobbered). Running
 * it on every deploy is a safe no-op once seeded. It only ever touches the
 * `j-blanton-is-hiring` row.
 */

import pool from '../src/lib/db';
import { HIRING_CMS_FIELDS } from '../src/lib/content/is-hiring';

const SLUG = 'j-blanton-is-hiring';

async function run() {
  const client = await pool.connect();
  try {
    const res = await client.query(
      `INSERT INTO main_pages (slug, content, page_type)
       VALUES ($1, $2, 'main')
       ON CONFLICT (slug) DO NOTHING`,
      [SLUG, JSON.stringify(HIRING_CMS_FIELDS)]
    );
    if ((res.rowCount ?? 0) > 0) {
      console.log(`seed-hiring-page: inserted main_pages row for "${SLUG}".`);
    } else {
      console.log(`seed-hiring-page: row for "${SLUG}" already exists — no change.`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => { console.error('seed-hiring-page failed:', err); process.exit(1); });
