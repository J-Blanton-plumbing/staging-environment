/**
 * Brief 40: Add meta_title, meta_description, created_by, updated_by, updated_at
 * to all page tables that are missing them, and create the page_archives table.
 *
 * Run: npx ts-node --project tsconfig.scripts.json scripts/migrate-meta-fields.ts
 */

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:jbp@localhost:5432/jbp_cms',
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('Running Brief 40 migration…');

    // ── city_pages ───────────────────────────────────────────────────────────
    await client.query(`
      ALTER TABLE city_pages
        ADD COLUMN IF NOT EXISTS meta_title        TEXT,
        ADD COLUMN IF NOT EXISTS meta_description  TEXT,
        ADD COLUMN IF NOT EXISTS created_by        TEXT,
        ADD COLUMN IF NOT EXISTS created_at        TIMESTAMP DEFAULT NOW()
    `);
    // updated_by on city_pages is INTEGER referencing cms_users — keep as-is, just add email variant
    // The CMS now tracks email as text; we add updated_by_email alongside.
    // But to avoid column collision, check the type first and add only what's needed.
    // The API will write session.email to a new updated_by_email column:
    await client.query(`
      ALTER TABLE city_pages
        ADD COLUMN IF NOT EXISTS updated_by_email  TEXT
    `);
    console.log('  ✓ city_pages');

    // ── service_category_pages ───────────────────────────────────────────────
    await client.query(`
      ALTER TABLE service_category_pages
        ADD COLUMN IF NOT EXISTS meta_title        TEXT,
        ADD COLUMN IF NOT EXISTS meta_description  TEXT,
        ADD COLUMN IF NOT EXISTS created_by        TEXT,
        ADD COLUMN IF NOT EXISTS created_at        TIMESTAMP DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS updated_by_email  TEXT
    `);
    console.log('  ✓ service_category_pages');

    // ── city_service_pages ───────────────────────────────────────────────────
    await client.query(`
      ALTER TABLE city_service_pages
        ADD COLUMN IF NOT EXISTS meta_title        TEXT,
        ADD COLUMN IF NOT EXISTS meta_description  TEXT,
        ADD COLUMN IF NOT EXISTS created_by        TEXT,
        ADD COLUMN IF NOT EXISTS created_at        TIMESTAMP DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS updated_by        TEXT,
        ADD COLUMN IF NOT EXISTS updated_by_email  TEXT
    `);
    console.log('  ✓ city_service_pages');

    // ── emergency_plumbing_page ───────────────────────────────────────────────
    await client.query(`
      ALTER TABLE emergency_plumbing_page
        ADD COLUMN IF NOT EXISTS meta_title        TEXT,
        ADD COLUMN IF NOT EXISTS meta_description  TEXT,
        ADD COLUMN IF NOT EXISTS created_by        TEXT,
        ADD COLUMN IF NOT EXISTS created_at        TIMESTAMP DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS updated_by_email  TEXT
    `);
    console.log('  ✓ emergency_plumbing_page');

    // ── page_archives (new table) ────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS page_archives (
        id           SERIAL PRIMARY KEY,
        page_type    VARCHAR(100) NOT NULL,
        slug         VARCHAR(200) NOT NULL,
        template     VARCHAR(100) NOT NULL,
        archive_name TEXT NOT NULL,
        content_json JSONB NOT NULL,
        archived_by  TEXT,
        archived_at  TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('  ✓ page_archives table created');

    // ── created_by column for service_category_pages (ensure slug is unique) ─
    // Check if unique constraint exists; if not, add it (required for ON CONFLICT in pages API)
    const uqCheck = await client.query(`
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_name = 'service_category_pages'
        AND constraint_type = 'UNIQUE'
        AND constraint_name LIKE '%slug%'
      LIMIT 1
    `);
    if ((uqCheck.rowCount ?? 0) === 0) {
      // Try to add unique constraint (may already exist as PK or implicit unique)
      try {
        await client.query(`
          ALTER TABLE service_category_pages ADD CONSTRAINT service_category_pages_slug_unique UNIQUE (slug)
        `);
        console.log('  ✓ added UNIQUE(slug) to service_category_pages');
      } catch {
        console.log('  · UNIQUE(slug) on service_category_pages already exists or could not be added — OK');
      }
    }

    console.log('\nMigration complete.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
