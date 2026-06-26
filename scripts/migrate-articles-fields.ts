/**
 * migrate-articles-fields.ts — Brief 51
 *
 * Adds missing columns to cms_articles:
 *   - status TEXT NOT NULL DEFAULT 'draft'
 *   - created_by INTEGER REFERENCES cms_users(id)
 *   - updated_by INTEGER REFERENCES cms_users(id)
 *   - updated_at TIMESTAMPTZ DEFAULT NOW()
 *   - category TEXT[] DEFAULT '{}'
 *
 * Idempotent — safe to re-run.
 *
 * Usage:
 *   npx ts-node --project tsconfig.scripts.json scripts/migrate-articles-fields.ts
 */

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:jbp@localhost:5432/jbp_cms',
});

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`ALTER TABLE cms_articles ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft'`);
    await client.query(`ALTER TABLE cms_articles ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES cms_users(id)`);
    await client.query(`ALTER TABLE cms_articles ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES cms_users(id)`);
    await client.query(`ALTER TABLE cms_articles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`);
    await client.query(`ALTER TABLE cms_articles ADD COLUMN IF NOT EXISTS category TEXT[] DEFAULT '{}'`);

    await client.query('COMMIT');
    console.log('Migration complete — cms_articles columns verified/added.');
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
