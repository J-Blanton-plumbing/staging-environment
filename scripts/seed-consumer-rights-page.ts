/**
 * seed-consumer-rights-page.ts — idempotent seed for the "Home Repair: Know Your
 * Consumer Rights" utility page (Brief 176).
 *
 * WHY THIS EXISTS:
 * The public page (/consumer-rights) renders from static defaults when no DB row
 * exists, but the CMS editor (/admin/consumer-rights) needs the `main_pages` row
 * to load (GET) and save (PATCH is an UPDATE, not an upsert). The deploy pipeline
 * runs ensure-schema (columns only, never row data) and the global-settings
 * migration — it does NOT run seed-main-pages — so a brand-new slug would have no
 * row on staging/prod. This script provisions exactly that one row and nothing
 * else. Mirrors scripts/seed-privacy-policy-page.ts (Brief 110).
 *
 * SAFETY: single `INSERT ... ON CONFLICT (slug) DO NOTHING`. If the row already
 * exists it is left untouched (marketing's edits are never clobbered). Running
 * it on every deploy is a safe no-op once seeded. It only ever touches the
 * `consumer-rights` row.
 *
 * NOTE: the row seeds the CMS-editable PROSE only. The two verbatim statutory
 * blocks, the three tables, the six warning-sign cards and the CTA are not CMS
 * fields — they live in src/lib/content/consumer-rights.ts by design (Brief 176,
 * C1). Nothing in the database can change them.
 */

import pool from '../src/lib/db';
import { CONSUMER_RIGHTS_CMS_FIELDS } from '../src/lib/content/consumer-rights';

const SLUG = 'consumer-rights';

async function run() {
  const client = await pool.connect();
  try {
    const res = await client.query(
      `INSERT INTO main_pages (slug, content, page_type)
       VALUES ($1, $2, 'main')
       ON CONFLICT (slug) DO NOTHING`,
      [SLUG, JSON.stringify(CONSUMER_RIGHTS_CMS_FIELDS)]
    );
    if ((res.rowCount ?? 0) > 0) {
      console.log(`seed-consumer-rights-page: inserted main_pages row for "${SLUG}".`);
    } else {
      console.log(`seed-consumer-rights-page: row for "${SLUG}" already exists — no change.`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => { console.error('seed-consumer-rights-page failed:', err); process.exit(1); });
