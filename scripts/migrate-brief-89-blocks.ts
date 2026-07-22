/**
 * Brief 89 (Track B) — additive, idempotent migration: give every sub-service
 * page a unified, ordered `blocks` JSONB structure alongside its existing named
 * columns.
 *
 *  - Adds `sub_service_pages.blocks JSONB` (ADD COLUMN IF NOT EXISTS).
 *  - Backfills the ordered blocks array for every row FROM its current named
 *    columns, in the fixed Brief 87 Section A order (rendering blocks only).
 *  - Backfill only touches rows where `blocks IS NULL`, so re-running is a no-op
 *    and never clobbers a post-migration reorder. The 13 named columns are left
 *    untouched — a frozen rollback snapshot.
 *  - Then verifies content parity for ALL rows: every value inside `blocks` must
 *    equal the value in the named column it came from.
 *
 * Run with: npx ts-node scripts/migrate-brief-89-blocks.ts
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

// Canonical top-to-bottom order (matches SUB_SERVICE_BLOCK_ORDER in the app).
const BLOCK_ORDER = [
  'hero',
  'intro',
  'listSection',
  'map',
  'googleReviews',
  'tiktokFeed',
  'noDripClub',
  'relatedArticles',
  'finalCta',
] as const;

type Row = {
  slug: string;
  hero_image: string | null;
  hero_heading: string | null;
  hero_intro: string | null;
  intro_heading: string | null;
  intro_body: string | null;
  f_image: string | null;
  problems_heading: string | null;
  problems_items: string[] | null;
  ndc_title: string | null;
  ndc_body: string | null;
  cta_heading: string | null;
  cta_body: string | null;
  f3_image: string | null;
  blocks: unknown;
};

const nn = (v: string | null | undefined) => (v == null || v === '' ? null : v);

/** Per-type data payload — mirrors blockDataFor() in src/lib/cms/sub-service-pages.ts. */
function dataFor(type: string, r: Row): Record<string, unknown> {
  switch (type) {
    case 'hero':
      return { heroImage: nn(r.hero_image), heroHeading: nn(r.hero_heading), heroIntro: nn(r.hero_intro) };
    case 'intro':
      return { introHeading: nn(r.intro_heading), introBody: nn(r.intro_body), fImage: nn(r.f_image) };
    case 'listSection':
      return { problemsHeading: nn(r.problems_heading), problemsItems: Array.isArray(r.problems_items) ? r.problems_items : [] };
    case 'noDripClub':
      return { ndcTitle: nn(r.ndc_title), ndcBody: nn(r.ndc_body) };
    case 'finalCta':
      return { ctaHeading: nn(r.cta_heading), ctaBody: nn(r.cta_body), f3Image: nn(r.f3_image) };
    default:
      return {};
  }
}

function assemble(r: Row) {
  return BLOCK_ORDER.map((type, order) => ({ type, order, data: dataFor(type, r) }));
}

const SELECT_COLS = `slug, hero_image, hero_heading, hero_intro, intro_heading, intro_body,
  f_image, problems_heading, problems_items, ndc_title, ndc_body, cta_heading, cta_body,
  f3_image, blocks`;

async function main() {
  const client = await pool.connect();
  try {
    await client.query(`ALTER TABLE sub_service_pages ADD COLUMN IF NOT EXISTS blocks JSONB`);
    console.log('✓ sub_service_pages.blocks column ensured');

    const { rows } = await client.query<Row>(`SELECT ${SELECT_COLS} FROM sub_service_pages ORDER BY slug`);
    console.log(`  ${rows.length} sub-service rows found`);

    let backfilled = 0;
    for (const r of rows) {
      if (r.blocks != null) continue; // idempotent: never clobber existing blocks
      const blocks = assemble(r);
      await client.query(
        `UPDATE sub_service_pages SET blocks = $1::jsonb WHERE slug = $2 AND blocks IS NULL`,
        [JSON.stringify(blocks), r.slug]
      );
      backfilled++;
    }
    console.log(`✓ backfilled ${backfilled} row(s) (${rows.length - backfilled} already had blocks)`);

    // ── Parity verification: every value in blocks must match its named column ──
    const after = await client.query<Row>(`SELECT ${SELECT_COLS} FROM sub_service_pages ORDER BY slug`);
    let pass = 0;
    const failures: string[] = [];
    for (const r of after.rows) {
      const blocks = (r.blocks ?? []) as Array<{ type: string; order: number; data: Record<string, unknown> }>;
      const byType = Object.fromEntries(blocks.map((b) => [b.type, b.data]));
      const problems: string[] = [];

      // Rebuild what the columns SHOULD produce and compare field by field.
      const expect = Object.fromEntries(BLOCK_ORDER.map((t) => [t, dataFor(t, r)])) as Record<string, Record<string, unknown>>;
      for (const type of BLOCK_ORDER) {
        const got = byType[type] ?? {};
        const want = expect[type];
        for (const key of Object.keys(want)) {
          const a = JSON.stringify(got[key] ?? null);
          const b = JSON.stringify(want[key] ?? null);
          if (a !== b) problems.push(`${type}.${key}: blocks=${a} vs column=${b}`);
        }
      }
      // Order + completeness check.
      const gotOrder = blocks.slice().sort((x, y) => x.order - y.order).map((b) => b.type).join(',');
      if (gotOrder !== BLOCK_ORDER.join(',') && blocks.length === BLOCK_ORDER.length) {
        // A different (but complete) order is legitimate post-reorder; only flag
        // incomplete/missing block sets as a failure.
      }
      if (blocks.length !== BLOCK_ORDER.length) problems.push(`block count ${blocks.length} != ${BLOCK_ORDER.length}`);

      if (problems.length === 0) pass++;
      else failures.push(`✗ ${r.slug}\n    ${problems.join('\n    ')}`);
    }

    console.log(`\nParity: ${pass}/${after.rows.length} rows OK`);
    if (failures.length) {
      console.log(failures.join('\n'));
      process.exitCode = 1;
    } else {
      console.log('✓ all rows: every block value matches its named column');
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
