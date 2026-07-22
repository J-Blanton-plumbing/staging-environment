/**
 * Idempotent migration: add the intro-section and closing-CTA image columns to
 * sub_service_pages so the sub-service CMS editor can set them (brief-61 made
 * the template render both images per page; previously they were hardcoded).
 *   - f_image  → intro/expert section photo (ServiceContent.expertSection.image1)
 *   - f3_image → closing-CTA photo         (ServiceContent.closingCTA.image)
 * Mirrors the service_category_pages column names (f_image / f3_image).
 * Run with: npx ts-node scripts/migrate-sub-service-section-images.ts
 */
import { existsSync, readFileSync } from 'fs';
import { Pool } from 'pg';

const env = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
const get = (k: string) => {
  if (process.env[k]) return process.env[k] as string;
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
        ADD COLUMN IF NOT EXISTS f_image  TEXT,
        ADD COLUMN IF NOT EXISTS f3_image TEXT
    `);
    console.log('✓ sub_service_pages.f_image and f3_image columns ensured');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
