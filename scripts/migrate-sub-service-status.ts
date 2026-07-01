/**
 * Idempotent migration: ensure sub_service_pages.status column exists.
 * Run with: npx ts-node scripts/migrate-sub-service-status.ts
 */
import pool from '../src/lib/db';

async function main() {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE sub_service_pages
        ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published'
    `);
    console.log('✓ sub_service_pages.status column ensured');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
