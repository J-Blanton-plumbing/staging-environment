/**
 * Brief 93 verification helper — proves the 2 Column Section's alignment flip and
 * optional button render correctly. Inserts a temporary test instance (image LEFT,
 * button ON with a custom label/link) into basement-flooding's `blocks`, then
 * removes it again. Same `{id,type,data}` shape the editor's Save path persists.
 *
 *   npx ts-node --project tsconfig.scripts.json scripts/verify-brief-93-two-column.ts add
 *   npx ts-node --project tsconfig.scripts.json scripts/verify-brief-93-two-column.ts restore
 *   npx ts-node --project tsconfig.scripts.json scripts/verify-brief-93-two-column.ts show
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
const MARKER = 'BRIEF 93 TEST — IMAGE LEFT + BUTTON';
const mode = process.argv[2] ?? 'show';

type Block = { id: string; type: string; data: Record<string, unknown> };

async function main() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(`SELECT blocks FROM sub_service_pages WHERE slug = $1`, [SLUG]);
    let blocks = (rows[0]?.blocks ?? []) as Block[];
    console.log('current:', blocks.map((b) => `${b.type}${(b.data as { label?: string })?.label ? `(${b.data.label})` : ''}`).join(' → '));

    if (mode === 'show') return;

    if (mode === 'restore') {
      blocks = blocks.filter((b) => (b.data as { introHeading?: string })?.introHeading !== MARKER);
    } else {
      const idx = blocks.findIndex((b) => b.type === 'intro');
      if (idx === -1) throw new Error('no intro block to insert after');
      const test: Block = {
        id: `intro-${randomUUID()}`,
        type: 'intro',
        data: {
          introHeading: MARKER,
          introBody: 'If this reads correctly the image sits on the LEFT (desktop) and a button below reads "TEST BUTTON" linking to /no-drip-club.',
          fImage: 'https://d1rplazj5a80fb.cloudfront.net/images/manplumber.webp',
          style: { position: 'left' },
          button: { enabled: true, label: 'TEST BUTTON', href: '/no-drip-club' },
          label: 'Brief 93 Test Block',
        },
      };
      blocks = [...blocks.slice(0, idx + 1), test, ...blocks.slice(idx + 1)];
    }

    await client.query(`UPDATE sub_service_pages SET blocks = $1::jsonb, updated_at = NOW() WHERE slug = $2`, [JSON.stringify(blocks), SLUG]);
    console.log('new:    ', blocks.map((b) => `${b.type}${(b.data as { label?: string })?.label ? `(${b.data.label})` : ''}`).join(' → '));
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
