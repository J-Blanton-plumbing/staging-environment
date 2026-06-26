/**
 * migrate-brief-45.ts — Brief 45 (CMS Create-Page Flow Fix)
 *
 * What this does:
 *   1. Adds `created_by TEXT` and `created_at TIMESTAMPTZ` to service_category_pages
 *      (fixes "Database error" on Service Category creation — the route was inserting
 *       a created_by value into a column that didn't yet exist)
 *   2. Same fix for city_pages and city_service_pages
 *   3. Creates the `cms_articles` table (enables Article creation flow)
 *   4. Creates the `sub_service_pages` table (enables Sub-Service creation flow)
 *
 * Idempotent — safe to re-run. All DDL uses IF NOT EXISTS / IF NOT EXISTS variants.
 *
 * Usage:
 *   npx ts-node --project tsconfig.scripts.json scripts/migrate-brief-45.ts
 */

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:jbp@localhost:5432/jbp_cms',
});

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── Fix 1 & 3: service_category_pages ────────────────────────────────────
    await client.query(`
      ALTER TABLE service_category_pages
        ADD COLUMN IF NOT EXISTS created_by  TEXT,
        ADD COLUMN IF NOT EXISTS created_at  TIMESTAMPTZ DEFAULT NOW()
    `);
    console.log('✓ service_category_pages: created_by / created_at ensured');

    // ── Fix 3: city_pages ─────────────────────────────────────────────────────
    await client.query(`
      ALTER TABLE city_pages
        ADD COLUMN IF NOT EXISTS created_by  TEXT,
        ADD COLUMN IF NOT EXISTS created_at  TIMESTAMPTZ DEFAULT NOW()
    `);
    console.log('✓ city_pages: created_by / created_at ensured');

    // ── Fix 4: city_service_pages ─────────────────────────────────────────────
    await client.query(`
      ALTER TABLE city_service_pages
        ADD COLUMN IF NOT EXISTS created_by  TEXT,
        ADD COLUMN IF NOT EXISTS created_at  TIMESTAMPTZ DEFAULT NOW()
    `);
    console.log('✓ city_service_pages: created_by / created_at ensured');

    // ── Fix 7: cms_articles ───────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS cms_articles (
        id               SERIAL PRIMARY KEY,
        slug             TEXT        NOT NULL UNIQUE,
        title            TEXT        NOT NULL DEFAULT 'New article — edit me.',
        excerpt          TEXT        NOT NULL DEFAULT '',
        body             JSONB       NOT NULL DEFAULT '[]',
        image            TEXT,
        status           TEXT        NOT NULL DEFAULT 'draft',
        meta_title       TEXT,
        meta_description TEXT,
        created_by       INTEGER     REFERENCES cms_users(id),
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by       INTEGER     REFERENCES cms_users(id),
        updated_at       TIMESTAMPTZ
      )
    `);
    console.log('✓ cms_articles table created');

    // ── Fix 2: sub_service_pages ──────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS sub_service_pages (
        id               SERIAL PRIMARY KEY,
        slug             TEXT        NOT NULL UNIQUE,
        title            TEXT        NOT NULL DEFAULT 'New page — edit me.',
        hero_heading     TEXT        NOT NULL DEFAULT 'New page — edit me.',
        hero_intro       TEXT        NOT NULL DEFAULT '',
        intro_heading    TEXT        NOT NULL DEFAULT '',
        intro_body       TEXT        NOT NULL DEFAULT '',
        problems_heading TEXT        NOT NULL DEFAULT '',
        problems_items   JSONB       NOT NULL DEFAULT '[]',
        cta_heading      TEXT        NOT NULL DEFAULT '',
        cta_body         TEXT        NOT NULL DEFAULT '',
        status           TEXT        NOT NULL DEFAULT 'draft',
        meta_title       TEXT,
        meta_description TEXT,
        created_by       INTEGER     REFERENCES cms_users(id),
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by       INTEGER     REFERENCES cms_users(id),
        updated_at       TIMESTAMPTZ
      )
    `);
    console.log('✓ sub_service_pages table created');

    await client.query('COMMIT');
    console.log('\n✅ Brief 45 migration complete.\n');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
