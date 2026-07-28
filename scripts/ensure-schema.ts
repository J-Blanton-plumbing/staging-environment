/**
 * ensure-schema.ts — idempotent schema reconciliation for every CMS table.
 *
 * WHY THIS EXISTS (Brief 107 follow-up):
 * The deploy pipeline historically only built + restarted the app; it never ran
 * database migrations. Schema changes therefore had to be applied by hand on the
 * box, and at least one was missed — Brief 102's `global_settings.offices` column
 * was never created on staging, so every Global Settings save 500'd with
 * `column "offices" ... does not exist` while reads silently fell back to
 * hardcoded defaults, masking the drift. This is the systemic fix: one script,
 * run on every deploy, that guarantees the live schema has every column the
 * application code writes to.
 *
 * SAFETY:
 * - Every statement is `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`. A column that
 *   already exists is skipped; only genuinely-missing columns are added. Running
 *   this repeatedly is a no-op once the schema is in sync.
 * - The column set below is generated from the known-good schema (the same schema
 *   the app works against). Base NOT NULL columns (identity/content) provably
 *   already exist in every environment — the site's reads would fail otherwise —
 *   so their ADD is always a no-op. Every column that could actually be missing
 *   is nullable or carries a DEFAULT, so adding it to a populated table is safe.
 * - This script does NOT create tables (all CMS tables already exist wherever the
 *   app runs) and does NOT touch row data. Data seeds/backfills stay in their own
 *   migration scripts (e.g. migrate-global-settings.ts seeds `offices`).
 *
 * If you add a new column to a CMS table in code, add its ADD COLUMN line here so
 * the next deploy provisions it automatically.
 */

import pool from '../src/lib/db';

const STATEMENTS: string[] = [
  // ── city_pages ──────────────────────────────────────────────────────────
  `ALTER TABLE city_pages ADD COLUMN IF NOT EXISTS hero_heading_line2 TEXT`,
  `ALTER TABLE city_pages ADD COLUMN IF NOT EXISTS hero_description TEXT`,
  `ALTER TABLE city_pages ADD COLUMN IF NOT EXISTS faqs JSONB DEFAULT '[]'::jsonb`,
  `ALTER TABLE city_pages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT now()`,
  `ALTER TABLE city_pages ADD COLUMN IF NOT EXISTS hero_image TEXT DEFAULT ''::text`,
  `ALTER TABLE city_pages ADD COLUMN IF NOT EXISTS hero_callout TEXT DEFAULT ''::text`,
  `ALTER TABLE city_pages ADD COLUMN IF NOT EXISTS content_heading TEXT DEFAULT ''::text`,
  `ALTER TABLE city_pages ADD COLUMN IF NOT EXISTS content_body TEXT DEFAULT ''::text`,
  `ALTER TABLE city_pages ADD COLUMN IF NOT EXISTS f2_heading TEXT DEFAULT ''::text`,
  `ALTER TABLE city_pages ADD COLUMN IF NOT EXISTS f2_body TEXT DEFAULT ''::text`,
  `ALTER TABLE city_pages ADD COLUMN IF NOT EXISTS updated_by INTEGER`,
  `ALTER TABLE city_pages ADD COLUMN IF NOT EXISTS created_by TEXT`,
  `ALTER TABLE city_pages ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now()`,
  `ALTER TABLE city_pages ADD COLUMN IF NOT EXISTS template_type TEXT DEFAULT 'coverage-area'::text`,
  `ALTER TABLE city_pages ADD COLUMN IF NOT EXISTS meta_title TEXT`,
  `ALTER TABLE city_pages ADD COLUMN IF NOT EXISTS meta_description TEXT`,
  `ALTER TABLE city_pages ADD COLUMN IF NOT EXISTS updated_by_email TEXT`,
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
  `ALTER TABLE city_pages ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE city_pages ADD COLUMN IF NOT EXISTS blocks JSONB`,

  // ── city_service_pages ──────────────────────────────────────────────────
  `ALTER TABLE city_service_pages ADD COLUMN IF NOT EXISTS service_intro_heading TEXT NOT NULL DEFAULT ''::text`,
  `ALTER TABLE city_service_pages ADD COLUMN IF NOT EXISTS service_intro_paragraphs JSONB NOT NULL DEFAULT '[]'::jsonb`,
  `ALTER TABLE city_service_pages ADD COLUMN IF NOT EXISTS service_intro_image TEXT NOT NULL DEFAULT ''::text`,
  `ALTER TABLE city_service_pages ADD COLUMN IF NOT EXISTS secondary_heading TEXT NOT NULL DEFAULT ''::text`,
  `ALTER TABLE city_service_pages ADD COLUMN IF NOT EXISTS secondary_paragraphs JSONB NOT NULL DEFAULT '[]'::jsonb`,
  `ALTER TABLE city_service_pages ADD COLUMN IF NOT EXISTS secondary_image TEXT NOT NULL DEFAULT ''::text`,
  `ALTER TABLE city_service_pages ADD COLUMN IF NOT EXISTS faqs JSONB NOT NULL DEFAULT '[]'::jsonb`,
  `ALTER TABLE city_service_pages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT now()`,
  `ALTER TABLE city_service_pages ADD COLUMN IF NOT EXISTS created_by TEXT`,
  `ALTER TABLE city_service_pages ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now()`,
  `ALTER TABLE city_service_pages ADD COLUMN IF NOT EXISTS meta_title TEXT NOT NULL DEFAULT ''::text`,
  `ALTER TABLE city_service_pages ADD COLUMN IF NOT EXISTS meta_description TEXT NOT NULL DEFAULT ''::text`,
  `ALTER TABLE city_service_pages ADD COLUMN IF NOT EXISTS updated_by TEXT`,
  `ALTER TABLE city_service_pages ADD COLUMN IF NOT EXISTS updated_by_email TEXT`,
  `ALTER TABLE city_service_pages ADD COLUMN IF NOT EXISTS parent_slug TEXT`,
  `ALTER TABLE city_service_pages ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 0`,

  // ── cms_articles ────────────────────────────────────────────────────────
  `ALTER TABLE cms_articles ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT 'New article — edit me.'::text`,
  `ALTER TABLE cms_articles ADD COLUMN IF NOT EXISTS excerpt TEXT NOT NULL DEFAULT ''::text`,
  `ALTER TABLE cms_articles ADD COLUMN IF NOT EXISTS body JSONB NOT NULL DEFAULT '[]'::jsonb`,
  `ALTER TABLE cms_articles ADD COLUMN IF NOT EXISTS image TEXT`,
  `ALTER TABLE cms_articles ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft'::text`,
  `ALTER TABLE cms_articles ADD COLUMN IF NOT EXISTS meta_title TEXT`,
  `ALTER TABLE cms_articles ADD COLUMN IF NOT EXISTS meta_description TEXT`,
  `ALTER TABLE cms_articles ADD COLUMN IF NOT EXISTS created_by INTEGER`,
  `ALTER TABLE cms_articles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now()`,
  `ALTER TABLE cms_articles ADD COLUMN IF NOT EXISTS updated_by INTEGER`,
  `ALTER TABLE cms_articles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ`,
  `ALTER TABLE cms_articles ADD COLUMN IF NOT EXISTS category TEXT[] DEFAULT '{}'::text[]`,

  // ── emergency_plumbing_page ─────────────────────────────────────────────
  `ALTER TABLE emergency_plumbing_page ADD COLUMN IF NOT EXISTS card_items JSONB NOT NULL DEFAULT '[]'::jsonb`,
  `ALTER TABLE emergency_plumbing_page ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT now()`,
  `ALTER TABLE emergency_plumbing_page ADD COLUMN IF NOT EXISTS hero_image TEXT NOT NULL DEFAULT ''::text`,
  `ALTER TABLE emergency_plumbing_page ADD COLUMN IF NOT EXISTS f_image TEXT NOT NULL DEFAULT ''::text`,
  `ALTER TABLE emergency_plumbing_page ADD COLUMN IF NOT EXISTS f2_image TEXT NOT NULL DEFAULT ''::text`,
  `ALTER TABLE emergency_plumbing_page ADD COLUMN IF NOT EXISTS f3_image TEXT NOT NULL DEFAULT ''::text`,
  `ALTER TABLE emergency_plumbing_page ADD COLUMN IF NOT EXISTS updated_by INTEGER`,
  `ALTER TABLE emergency_plumbing_page ADD COLUMN IF NOT EXISTS meta_title TEXT`,
  `ALTER TABLE emergency_plumbing_page ADD COLUMN IF NOT EXISTS meta_description TEXT`,
  `ALTER TABLE emergency_plumbing_page ADD COLUMN IF NOT EXISTS created_by TEXT`,
  `ALTER TABLE emergency_plumbing_page ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT now()`,
  `ALTER TABLE emergency_plumbing_page ADD COLUMN IF NOT EXISTS updated_by_email TEXT`,
  `ALTER TABLE emergency_plumbing_page ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 0`,

  // ── global_settings ─────────────────────────────────────────────────────
  `ALTER TABLE global_settings ADD COLUMN IF NOT EXISTS header_phone TEXT`,
  `ALTER TABLE global_settings ADD COLUMN IF NOT EXISTS ndc_price TEXT`,
  `ALTER TABLE global_settings ADD COLUMN IF NOT EXISTS service_desc_emergency TEXT DEFAULT 'Fast response for plumbing emergencies, day or night.'::text`,
  `ALTER TABLE global_settings ADD COLUMN IF NOT EXISTS service_desc_plumbing TEXT DEFAULT 'Licensed plumbers for any residential or commercial job.'::text`,
  `ALTER TABLE global_settings ADD COLUMN IF NOT EXISTS service_desc_sewer TEXT DEFAULT 'Sewer inspections, repairs, and full line replacements.'::text`,
  `ALTER TABLE global_settings ADD COLUMN IF NOT EXISTS service_desc_drain TEXT DEFAULT 'Drain cleaning and clearing for all drain types.'::text`,
  `ALTER TABLE global_settings ADD COLUMN IF NOT EXISTS service_desc_water_heater TEXT DEFAULT 'Water heater installation, repair, and maintenance.'::text`,
  `ALTER TABLE global_settings ADD COLUMN IF NOT EXISTS service_desc_water_quality TEXT DEFAULT 'Water filtration, testing, and treatment solutions.'::text`,
  `ALTER TABLE global_settings ADD COLUMN IF NOT EXISTS service_desc_commercial TEXT DEFAULT 'Commercial plumbing built for business reliability.'::text`,
  `ALTER TABLE global_settings ADD COLUMN IF NOT EXISTS offices JSONB`,

  // ── main_pages ──────────────────────────────────────────────────────────
  `ALTER TABLE main_pages ADD COLUMN IF NOT EXISTS content JSONB NOT NULL DEFAULT '{}'::jsonb`,
  `ALTER TABLE main_pages ADD COLUMN IF NOT EXISTS meta_title TEXT`,
  `ALTER TABLE main_pages ADD COLUMN IF NOT EXISTS meta_description TEXT`,
  `ALTER TABLE main_pages ADD COLUMN IF NOT EXISTS updated_by TEXT`,
  `ALTER TABLE main_pages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now()`,
  `ALTER TABLE main_pages ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now()`,
  `ALTER TABLE main_pages ADD COLUMN IF NOT EXISTS page_type TEXT`,
  `ALTER TABLE main_pages ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 0`,

  // ── page_archives ───────────────────────────────────────────────────────
  `ALTER TABLE page_archives ADD COLUMN IF NOT EXISTS archive_name TEXT NOT NULL DEFAULT ''::text`,
  `ALTER TABLE page_archives ADD COLUMN IF NOT EXISTS content_json JSONB`,
  `ALTER TABLE page_archives ADD COLUMN IF NOT EXISTS archived_by TEXT`,
  `ALTER TABLE page_archives ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP DEFAULT now()`,

  // ── page_changelog ──────────────────────────────────────────────────────
  `ALTER TABLE page_changelog ADD COLUMN IF NOT EXISTS changed_by INTEGER`,
  `ALTER TABLE page_changelog ADD COLUMN IF NOT EXISTS changed_at TIMESTAMPTZ NOT NULL DEFAULT now()`,

  // ── page_drafts ─────────────────────────────────────────────────────────
  `ALTER TABLE page_drafts ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ`,
  `ALTER TABLE page_drafts ADD COLUMN IF NOT EXISTS template_type TEXT`,
  `ALTER TABLE page_drafts ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE page_drafts ADD COLUMN IF NOT EXISTS base_version INTEGER`,

  // ── service_category_pages ──────────────────────────────────────────────
  `ALTER TABLE service_category_pages ADD COLUMN IF NOT EXISTS problems_items JSONB NOT NULL DEFAULT '[]'::jsonb`,
  `ALTER TABLE service_category_pages ADD COLUMN IF NOT EXISTS articles_featured_slugs JSONB NOT NULL DEFAULT '[]'::jsonb`,
  `ALTER TABLE service_category_pages ADD COLUMN IF NOT EXISTS hero_image TEXT`,
  `ALTER TABLE service_category_pages ADD COLUMN IF NOT EXISTS f_image TEXT`,
  `ALTER TABLE service_category_pages ADD COLUMN IF NOT EXISTS f3_image TEXT`,
  `ALTER TABLE service_category_pages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT now()`,
  `ALTER TABLE service_category_pages ADD COLUMN IF NOT EXISTS updated_by INTEGER`,
  `ALTER TABLE service_category_pages ADD COLUMN IF NOT EXISTS created_by TEXT`,
  `ALTER TABLE service_category_pages ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now()`,
  `ALTER TABLE service_category_pages ADD COLUMN IF NOT EXISTS meta_title TEXT`,
  `ALTER TABLE service_category_pages ADD COLUMN IF NOT EXISTS meta_description TEXT`,
  `ALTER TABLE service_category_pages ADD COLUMN IF NOT EXISTS updated_by_email TEXT`,
  `ALTER TABLE service_category_pages ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE service_category_pages ADD COLUMN IF NOT EXISTS blocks JSONB`,

  // ── service_subcategories ───────────────────────────────────────────────
  `ALTER TABLE service_subcategories ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE service_subcategories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT now()`,

  // ── sub_service_pages ───────────────────────────────────────────────────
  `ALTER TABLE sub_service_pages ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT 'New page — edit me.'::text`,
  `ALTER TABLE sub_service_pages ADD COLUMN IF NOT EXISTS hero_heading TEXT NOT NULL DEFAULT 'New page — edit me.'::text`,
  `ALTER TABLE sub_service_pages ADD COLUMN IF NOT EXISTS hero_intro TEXT NOT NULL DEFAULT ''::text`,
  `ALTER TABLE sub_service_pages ADD COLUMN IF NOT EXISTS intro_heading TEXT NOT NULL DEFAULT ''::text`,
  `ALTER TABLE sub_service_pages ADD COLUMN IF NOT EXISTS intro_body TEXT NOT NULL DEFAULT ''::text`,
  `ALTER TABLE sub_service_pages ADD COLUMN IF NOT EXISTS problems_heading TEXT NOT NULL DEFAULT ''::text`,
  `ALTER TABLE sub_service_pages ADD COLUMN IF NOT EXISTS problems_items JSONB NOT NULL DEFAULT '[]'::jsonb`,
  `ALTER TABLE sub_service_pages ADD COLUMN IF NOT EXISTS cta_heading TEXT NOT NULL DEFAULT ''::text`,
  `ALTER TABLE sub_service_pages ADD COLUMN IF NOT EXISTS cta_body TEXT NOT NULL DEFAULT ''::text`,
  `ALTER TABLE sub_service_pages ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft'::text`,
  `ALTER TABLE sub_service_pages ADD COLUMN IF NOT EXISTS meta_title TEXT`,
  `ALTER TABLE sub_service_pages ADD COLUMN IF NOT EXISTS meta_description TEXT`,
  `ALTER TABLE sub_service_pages ADD COLUMN IF NOT EXISTS created_by INTEGER`,
  `ALTER TABLE sub_service_pages ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now()`,
  `ALTER TABLE sub_service_pages ADD COLUMN IF NOT EXISTS updated_by INTEGER`,
  `ALTER TABLE sub_service_pages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ`,
  `ALTER TABLE sub_service_pages ADD COLUMN IF NOT EXISTS hero_image TEXT`,
  `ALTER TABLE sub_service_pages ADD COLUMN IF NOT EXISTS parent_slug TEXT`,
  `ALTER TABLE sub_service_pages ADD COLUMN IF NOT EXISTS f_image TEXT`,
  `ALTER TABLE sub_service_pages ADD COLUMN IF NOT EXISTS f3_image TEXT`,
  `ALTER TABLE sub_service_pages ADD COLUMN IF NOT EXISTS ndc_title TEXT`,
  `ALTER TABLE sub_service_pages ADD COLUMN IF NOT EXISTS ndc_body TEXT`,
  `ALTER TABLE sub_service_pages ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE sub_service_pages ADD COLUMN IF NOT EXISTS blocks JSONB`,

  // ── template_switch_archive ─────────────────────────────────────────────
  `ALTER TABLE template_switch_archive ADD COLUMN IF NOT EXISTS from_template TEXT NOT NULL DEFAULT ''::text`,
  `ALTER TABLE template_switch_archive ADD COLUMN IF NOT EXISTS to_template TEXT NOT NULL DEFAULT ''::text`,
  `ALTER TABLE template_switch_archive ADD COLUMN IF NOT EXISTS archived_content JSONB`,
  `ALTER TABLE template_switch_archive ADD COLUMN IF NOT EXISTS switched_by INTEGER`,
  `ALTER TABLE template_switch_archive ADD COLUMN IF NOT EXISTS switched_at TIMESTAMPTZ NOT NULL DEFAULT now()`,
  // Brief 116 — draft re-templates archive to the same table (page_type
  // 'city-draft'); draft_id keys their restore lookups apart from live-page
  // switches (which leave it NULL).
  `ALTER TABLE template_switch_archive ADD COLUMN IF NOT EXISTS draft_id INTEGER`,
];

async function run() {
  const client = await pool.connect();
  let applied = 0;
  const failures: Array<{ stmt: string; error: string }> = [];
  try {
    for (const stmt of STATEMENTS) {
      try {
        await client.query(stmt);
        applied++;
      } catch (err) {
        // A "relation does not exist" (42P01) means a whole table is missing —
        // that's created by the seed scripts, not here; log and keep going so
        // one absent table can't block provisioning the rest.
        const code = (err as { code?: string })?.code;
        const msg = err instanceof Error ? err.message : String(err);
        failures.push({ stmt, error: `${msg}${code ? ` (${code})` : ''}` });
      }
    }
  } finally {
    client.release();
    await pool.end();
  }

  console.log(`ensure-schema: ran ${applied}/${STATEMENTS.length} ADD COLUMN statements (existing columns are no-ops).`);
  if (failures.length) {
    console.error(`ensure-schema: ${failures.length} statement(s) failed:`);
    for (const f of failures) console.error(`  - ${f.stmt}\n    → ${f.error}`);
    process.exit(1);
  }
  console.log('ensure-schema: all CMS tables reconciled.');
}

run().catch(err => { console.error(err); process.exit(1); });
