/**
 * Migration: Brief 35 — Template Switching
 *
 * 1. Adds template_type column to city_pages
 * 2. Seeds existing rows with correct template values
 * 3. Creates template_switch_archive table
 */
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:jbp@localhost:5432/jbp_cms',
});

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Add template_type to city_pages
    await client.query(`
      ALTER TABLE city_pages
        ADD COLUMN IF NOT EXISTS template_type TEXT NOT NULL DEFAULT 'coverage-area'
    `);

    // 2. Seed Evanston as local-office; all others stay coverage-area (default)
    await client.query(`
      UPDATE city_pages SET template_type = 'local-office' WHERE city_slug = 'evanston'
    `);

    // 3. Create archive table
    await client.query(`
      CREATE TABLE IF NOT EXISTS template_switch_archive (
        id               SERIAL PRIMARY KEY,
        page_type        TEXT NOT NULL,
        page_slug        TEXT NOT NULL,
        from_template    TEXT NOT NULL,
        to_template      TEXT NOT NULL,
        archived_content JSONB NOT NULL,
        switched_by      INTEGER REFERENCES cms_users(id),
        switched_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query('COMMIT');
    console.log('Migration complete: template_type column added, template_switch_archive table created.');
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
