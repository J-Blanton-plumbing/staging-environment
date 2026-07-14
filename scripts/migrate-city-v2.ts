/**
 * Brief 67 — Local Office City V2 migration.
 *
 * Adds the V2 content columns to `city_pages`, the `template_type` column to
 * `page_drafts` (Track A — so a draft records which template it was authored for),
 * and the 7 service-category description columns to `global_settings` (Track F).
 *
 * Fully idempotent (`ADD COLUMN IF NOT EXISTS` throughout) — safe to re-run.
 * Run BEFORE the seed script:
 *   npx ts-node --project tsconfig.scripts.json scripts/migrate-city-v2.ts
 */

import pool from '../src/lib/db';

async function run() {
  const client = await pool.connect();
  try {
    // ── city_pages: V2 content fields ────────────────────────────────────────
    const cityCols = [
      `ALTER TABLE city_pages ADD COLUMN IF NOT EXISTS trust_bar_stars TEXT`,
      `ALTER TABLE city_pages ADD COLUMN IF NOT EXISTS trust_bar_review_count TEXT`,
      `ALTER TABLE city_pages ADD COLUMN IF NOT EXISTS services_intro TEXT`,
      `ALTER TABLE city_pages ADD COLUMN IF NOT EXISTS most_requested_services JSONB`,
      `ALTER TABLE city_pages ADD COLUMN IF NOT EXISTS mid_cta_text TEXT`,
      `ALTER TABLE city_pages ADD COLUMN IF NOT EXISTS video_heading TEXT`,
      `ALTER TABLE city_pages ADD COLUMN IF NOT EXISTS video_intro TEXT`,
      `ALTER TABLE city_pages ADD COLUMN IF NOT EXISTS video_script TEXT`,
      `ALTER TABLE city_pages ADD COLUMN IF NOT EXISTS reviews JSONB`,
      `ALTER TABLE city_pages ADD COLUMN IF NOT EXISTS ndc_intro TEXT`,
      `ALTER TABLE city_pages ADD COLUMN IF NOT EXISTS final_cta_heading TEXT`,
      `ALTER TABLE city_pages ADD COLUMN IF NOT EXISTS final_cta_body TEXT`,
      `ALTER TABLE city_pages ADD COLUMN IF NOT EXISTS why_points JSONB`,
    ];
    for (const sql of cityCols) await client.query(sql);
    console.log('✓ city_pages V2 columns ensured.');

    // ── page_drafts: template_type (Track A) ─────────────────────────────────
    // Records which template a draft was authored for, so previews always render
    // that template even if the live page has since switched.
    await client.query(`ALTER TABLE page_drafts ADD COLUMN IF NOT EXISTS template_type TEXT`);
    console.log('✓ page_drafts.template_type ensured.');

    // ── global_settings: service category descriptions (Track F) ─────────────
    const settingCols: Array<[string, string]> = [
      ['service_desc_emergency', 'Fast response for plumbing emergencies, day or night.'],
      ['service_desc_plumbing', 'Licensed plumbers for any residential or commercial job.'],
      ['service_desc_sewer', 'Sewer inspections, repairs, and full line replacements.'],
      ['service_desc_drain', 'Drain cleaning and clearing for all drain types.'],
      ['service_desc_water_heater', 'Water heater installation, repair, and maintenance.'],
      ['service_desc_water_quality', 'Water filtration, testing, and treatment solutions.'],
      ['service_desc_commercial', 'Commercial plumbing built for business reliability.'],
    ];
    for (const [col, def] of settingCols) {
      // Escape single quotes in the default literal.
      const safeDef = def.replace(/'/g, "''");
      await client.query(
        `ALTER TABLE global_settings ADD COLUMN IF NOT EXISTS ${col} TEXT DEFAULT '${safeDef}'`
      );
      // Backfill any existing NULL rows with the default.
      await client.query(
        `UPDATE global_settings SET ${col} = $1 WHERE ${col} IS NULL`,
        [def]
      );
    }
    console.log('✓ global_settings service description columns ensured.');

    console.log('\nBrief 67 migration complete.');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => { console.error(err); process.exit(1); });
