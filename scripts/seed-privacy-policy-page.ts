/**
 * seed-privacy-policy-page.ts — idempotent seed for the "Terms of Use & Privacy
 * Policy" utility page (Brief 110).
 *
 * WHY THIS EXISTS:
 * The public page (/privacy-policy) renders from static defaults when no DB row
 * exists, but the CMS editor (/admin/privacy-policy) needs the `main_pages` row
 * to load (GET) and save (PATCH is an UPDATE, not an upsert). The deploy pipeline
 * runs ensure-schema (columns only, never row data) and the global-settings
 * migration — it does NOT run seed-main-pages — so a brand-new slug would have no
 * row on staging/prod. This script provisions exactly that one row and nothing
 * else. Mirrors scripts/seed-hiring-page.ts (Brief 109).
 *
 * SAFETY: single `INSERT ... ON CONFLICT (slug) DO NOTHING`. If the row already
 * exists it is left untouched (marketing's edits are never clobbered). Running
 * it on every deploy is a safe no-op once seeded. It only ever touches the
 * `privacy-policy` row.
 */

import pool from '../src/lib/db';
import { PRIVACY_POLICY_CMS_FIELDS } from '../src/lib/content/privacy-policy';

const SLUG = 'privacy-policy';

async function run() {
  const client = await pool.connect();
  try {
    const res = await client.query(
      `INSERT INTO main_pages (slug, content, page_type)
       VALUES ($1, $2, 'main')
       ON CONFLICT (slug) DO NOTHING`,
      [SLUG, JSON.stringify(PRIVACY_POLICY_CMS_FIELDS)]
    );
    if ((res.rowCount ?? 0) > 0) {
      console.log(`seed-privacy-policy-page: inserted main_pages row for "${SLUG}".`);
    } else {
      console.log(`seed-privacy-policy-page: row for "${SLUG}" already exists — no change.`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => { console.error('seed-privacy-policy-page failed:', err); process.exit(1); });
