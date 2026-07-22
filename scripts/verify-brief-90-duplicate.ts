/**
 * Brief 90 (Track B/D) verification helper — proves the public render supports
 * DUPLICATE block instances (the core free-builder claim). Inserts a second
 * No Drip Club instance (with a marker title) into basement-flooding's `blocks`,
 * then removes it again. This is the same `{id,type,data}` shape the editor's
 * Save/Publish path persists.
 *
 *   npx ts-node --project tsconfig.scripts.json scripts/verify-brief-90-duplicate.ts dup
 *   npx ts-node --project tsconfig.scripts.json scripts/verify-brief-90-duplicate.ts restore
 *   npx ts-node --project tsconfig.scripts.json scripts/verify-brief-90-duplicate.ts show
 *
 * NEVER run this against production — it writes directly to the DB, bypassing auth.
 */
import { readFileSync } from 'fs';
import { randomUUID } from 'crypto';
import { Pool } from 'pg';

const env = readFileSync('.env.local', 'utf8');
const get = (k: string) => {
  const m = env.match(new RegExp('^' + k + '=(.*)$', 'm'));
  return m ? m[1].trim() : '';
};
const pool = new Pool({ connectionString: get('DATABASE_URL') || 'postgresql://postgres:jbp@localhost:5432/jbp_cms' });

const SLUG = 'basement-flooding';
const MARKER = 'DUPLICATE NDC TEST';
const mode = process.argv[2] ?? 'show';

type Block = { id: string; type: string; data: Record<string, unknown> };

async function main() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(`SELECT blocks FROM sub_service_pages WHERE slug = $1`, [SLUG]);
    let blocks = (rows[0]?.blocks ?? []) as Block[];
    console.log('current:', blocks.map((b) => b.type).join(' → '));

    if (mode === 'show') return;

    if (mode === 'restore') {
      blocks = blocks.filter((b) => !(b.type === 'noDripClub' && b.data?.ndcTitle === MARKER));
    } else {
      // dup: clone the first noDripClub, give it a marker title, insert right after.
      const idx = blocks.findIndex((b) => b.type === 'noDripClub');
      if (idx === -1) throw new Error('no noDripClub block to duplicate');
      const dup: Block = { id: `noDripClub-${randomUUID()}`, type: 'noDripClub', data: { ndcTitle: MARKER, ndcBody: 'Second No Drip Club instance — duplicate render proof.' } };
      blocks = [...blocks.slice(0, idx + 1), dup, ...blocks.slice(idx + 1)];
    }

    await client.query(`UPDATE sub_service_pages SET blocks = $1::jsonb, updated_at = NOW() WHERE slug = $2`, [JSON.stringify(blocks), SLUG]);
    console.log('new:    ', blocks.map((b) => b.type).join(' → '));
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
