/**
 * Idempotent migration: add parent_slug FK column to city_service_pages.
 * Run with: npx ts-node scripts/migrate-city-service-parent.ts
 */
import pool from '../src/lib/db';

async function main() {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE city_service_pages
        ADD COLUMN IF NOT EXISTS parent_slug TEXT
          REFERENCES service_category_pages(slug)
    `);
    console.log('✓ city_service_pages.parent_slug column ensured (FK → service_category_pages.slug)');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
