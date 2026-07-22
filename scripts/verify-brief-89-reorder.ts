/**
 * Brief 89 (Track B) verification helper — reorders basement-flooding's `blocks`
 * to prove the public render honors the saved block order, then restores it.
 *
 *   npx ts-node scripts/verify-brief-89-reorder.ts swap     # move tiktokFeed above map
 *   npx ts-node scripts/verify-brief-89-reorder.ts restore  # back to canonical order
 *   npx ts-node scripts/verify-brief-89-reorder.ts show      # print current order
 *
 * This exercises the persisted-order → render path (the core prototype proof).
 * It does NOT go through the auth-gated admin UI; it writes the same `blocks`
 * shape the editor's Save/Publish path produces.
 */
import { readFileSync } from 'fs';
import { Pool } from 'pg';

const env = readFileSync('.env.local', 'utf8');
const get = (k: string) => {
  const m = env.match(new RegExp('^' + k + '=(.*)$', 'm'));
  return m ? m[1].trim() : '';
};
const pool = new Pool({ connectionString: get('DATABASE_URL') || 'postgresql://postgres:jbp@localhost:5432/jbp_cms' });

const CANONICAL = ['hero', 'intro', 'listSection', 'map', 'googleReviews', 'tiktokFeed', 'noDripClub', 'relatedArticles', 'finalCta'];
const SLUG = 'basement-flooding';
const mode = process.argv[2] ?? 'show';

async function main() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(`SELECT blocks FROM sub_service_pages WHERE slug = $1`, [SLUG]);
    const blocks = (rows[0]?.blocks ?? []) as Array<{ type: string; order: number; data: unknown }>;
    const current = [...blocks].sort((a, b) => a.order - b.order).map((b) => b.type);
    console.log('current order:', current.join(' → '));

    if (mode === 'show') return;

    let nextOrder: string[];
    if (mode === 'restore') {
      nextOrder = [...CANONICAL];
    } else {
      // swap: move tiktokFeed directly above map (two clearly-identifiable blocks)
      nextOrder = current.filter((t) => t !== 'tiktokFeed');
      const mapIdx = nextOrder.indexOf('map');
      nextOrder.splice(mapIdx, 0, 'tiktokFeed');
    }

    const byType = Object.fromEntries(blocks.map((b) => [b.type, b.data]));
    const next = nextOrder.map((type, order) => ({ type, order, data: byType[type] ?? {} }));
    await client.query(`UPDATE sub_service_pages SET blocks = $1::jsonb, updated_at = NOW() WHERE slug = $2`, [JSON.stringify(next), SLUG]);
    console.log('new order:    ', nextOrder.join(' → '));
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
