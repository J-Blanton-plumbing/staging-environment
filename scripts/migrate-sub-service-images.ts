/**
 * Idempotent migration: ensure sub_service_pages image columns exist.
 * Run with: npx ts-node scripts/migrate-sub-service-images.ts
 */
import pool from '../src/lib/db';

async function main() {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE sub_service_pages
        ADD COLUMN IF NOT EXISTS hero_image TEXT
    `);
    console.log('✓ sub_service_pages.hero_image column ensured');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
