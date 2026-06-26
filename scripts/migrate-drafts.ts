/**
 * Creates the page_drafts table (Brief 34).
 * Run with: npx ts-node --project tsconfig.scripts.json scripts/migrate-drafts.ts
 */

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:jbp@localhost:5432/jbp_cms',
});

async function main() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS page_drafts (
        id           SERIAL PRIMARY KEY,
        page_type    TEXT NOT NULL,
        page_slug    TEXT NOT NULL,
        label        TEXT NOT NULL,
        content      JSONB NOT NULL,
        created_by   INTEGER NOT NULL REFERENCES cms_users(id),
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        published_at TIMESTAMPTZ
      );
    `);
    console.log('✓ page_drafts table ready');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
