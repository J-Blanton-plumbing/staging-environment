/**
 * Idempotent migration: add per-page No Drip Club columns to sub_service_pages
 * so each sub-service can have its own NDC selling point instead of the generic
 * global default (brief-61's NoDripClubSimple renders title + body per page).
 *   - ndc_title → NDC red label / selling point (noDropClubSection.title)
 *   - ndc_body  → NDC paragraph copy           (noDropClubSection.body)
 * When left blank, the template falls back to the generic default copy.
 * Run with: npx ts-node scripts/migrate-sub-service-ndc.ts
 */
import { readFileSync } from 'fs';
import { Pool } from 'pg';

const env = readFileSync('.env.local', 'utf8');
const get = (k: string) => {
  const m = env.match(new RegExp('^' + k + '=(.*)$', 'm'));
  return m ? m[1].trim() : '';
};
const pool = new Pool({
  connectionString: get('DATABASE_URL') || 'postgresql://postgres:jbp@localhost:5432/jbp_cms',
});

async function main() {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE sub_service_pages
        ADD COLUMN IF NOT EXISTS ndc_title TEXT,
        ADD COLUMN IF NOT EXISTS ndc_body  TEXT
    `);
    console.log('✓ sub_service_pages.ndc_title and ndc_body columns ensured');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
