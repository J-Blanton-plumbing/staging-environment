import { Pool } from 'pg';

/**
 * Brief-61 Track A — bring the CMS DB row's hero_intro in sync with the
 * corrected static/seed copy so the rendered `/sewer-rodding` hero matches the
 * live page. One-off; safe to re-run (idempotent single-column UPDATE).
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:jbp@localhost:5432/jbp_cms',
});

const NEW_INTRO =
  'Clogged drains, recurring backups, and odors are key signs you may need sewer rodding, and our rodding services deliver fast, safe results with expert sewer rodding services when rodding a blocked drain is the best solution.';

async function main() {
  const res = await pool.query(
    `UPDATE service_category_pages SET hero_intro = $1, updated_at = NOW() WHERE slug = $2`,
    [NEW_INTRO, 'sewer-rodding']
  );
  console.log(`Updated ${res.rowCount} row(s).`);
  const check = await pool.query(
    `SELECT hero_intro FROM service_category_pages WHERE slug = 'sewer-rodding'`
  );
  console.log('Current hero_intro:', check.rows[0]?.hero_intro);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
