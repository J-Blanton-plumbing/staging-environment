/**
 * Brief 90 (Track B) — additive, idempotent migration: convert each sub-service
 * row's `blocks` from the Brief 89 type-keyed shape (`{ type, order, data }`) to
 * the Brief 90 per-instance shape (`{ id, type, data }`), folding the current
 * named-column values into the FIRST instance's data.
 *
 *  - `blocks` already exists (Brief 89). This migration only reshapes its contents.
 *  - Each row's first instance of a type gets its `data` re-derived from the named
 *    columns (the authoritative rollback snapshot); array position becomes the
 *    order and each instance gets a stable unique `id`.
 *  - ADDITIVE + IDEMPOTENT: a row already in the new shape (first block has `id`
 *    and no `order`) is SKIPPED, so re-running never clobbers a post-migration
 *    edit (e.g. an inserted duplicate block or a reorder). Rows with NULL blocks
 *    are backfilled from the named columns in canonical order.
 *  - Then verifies content parity for ALL rows: the first-instance snapshot inside
 *    `blocks` must equal the named column it came from.
 *
 * Never run this against production. Run with:
 *   npx ts-node --project tsconfig.scripts.json scripts/migrate-brief-90-block-content.ts
 */
import { existsSync, readFileSync } from 'fs';
import { randomUUID } from 'crypto';
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

type LegacyBlock = { type: string; order?: number; data?: Record<string, unknown> };
type InstanceBlock = { id: string; type: string; data: Record<string, unknown> };

const nn = (v: string | null | undefined) => (v == null || v === '' ? null : v);

/** Per-type data payload derived from named columns — mirrors blockDataFor() in the app. */
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

/** Is a stored blocks value already in the Brief 90 instance shape? */
function isInstanceShape(blocks: unknown): boolean {
  return (
    Array.isArray(blocks) &&
    blocks.length > 0 &&
    blocks.every((b) => b && typeof b === 'object' && 'id' in b && !('order' in b))
  );
}

/** Build the new instance array for a row, folding named columns into the first instance. */
function toInstances(r: Row): InstanceBlock[] {
  const legacy = Array.isArray(r.blocks) ? (r.blocks as LegacyBlock[]) : null;
  // Determine order: legacy blocks' order if present, else canonical.
  let order: string[];
  let extraByType: Record<string, Record<string, unknown>[]> = {};
  if (legacy && legacy.length > 0) {
    const sorted = [...legacy].sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0));
    order = sorted.map((b) => b.type).filter((t) => (BLOCK_ORDER as readonly string[]).includes(t));
    // Preserve any 2nd+ instance data (none exist pre-Brief-90, but be safe).
    const counts: Record<string, number> = {};
    for (const b of sorted) {
      counts[b.type] = (counts[b.type] ?? 0) + 1;
      if (counts[b.type] > 1) {
        (extraByType[b.type] ??= []).push(b.data ?? {});
      }
    }
  } else {
    order = [...BLOCK_ORDER];
  }
  const seen = new Set<string>();
  const out: InstanceBlock[] = [];
  for (const type of order) {
    if (!seen.has(type)) {
      seen.add(type);
      // First instance: authoritative snapshot from named columns.
      out.push({ id: `${type}-${randomUUID()}`, type, data: dataFor(type, r) });
    } else {
      // Additional instance of an already-seen type — keep its stored data.
      const extra = extraByType[type]?.shift() ?? {};
      out.push({ id: `${type}-${randomUUID()}`, type, data: extra });
    }
  }
  return out;
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

    let migrated = 0;
    let skipped = 0;
    for (const r of rows) {
      if (isInstanceShape(r.blocks)) {
        skipped++; // idempotent: already Brief 90 shape — never clobber
        continue;
      }
      const instances = toInstances(r);
      await client.query(`UPDATE sub_service_pages SET blocks = $1::jsonb WHERE slug = $2`, [
        JSON.stringify(instances),
        r.slug,
      ]);
      migrated++;
    }
    console.log(`✓ migrated ${migrated} row(s) to {id,type,data}; skipped ${skipped} already-migrated`);

    // ── Parity verification: first-instance snapshot must match its named column ──
    const after = await client.query<Row>(`SELECT ${SELECT_COLS} FROM sub_service_pages ORDER BY slug`);
    let pass = 0;
    const failures: string[] = [];
    for (const r of after.rows) {
      const blocks = (r.blocks ?? []) as InstanceBlock[];
      const problems: string[] = [];

      if (!isInstanceShape(r.blocks)) {
        problems.push('blocks not in {id,type,data} instance shape');
      }

      // First instance of each type = the primary snapshot.
      const firstByType: Record<string, Record<string, unknown>> = {};
      for (const b of blocks) {
        if (!(b.type in firstByType)) firstByType[b.type] = b.data ?? {};
      }
      for (const type of BLOCK_ORDER) {
        const got = firstByType[type] ?? {};
        const want = dataFor(type, r);
        for (const key of Object.keys(want)) {
          const a = JSON.stringify(got[key] ?? null);
          const b = JSON.stringify(want[key] ?? null);
          if (a !== b) problems.push(`${type}.${key}: blocks=${a} vs column=${b}`);
        }
      }
      // Every instance must carry a unique, non-empty id.
      const ids = blocks.map((b) => b.id);
      if (ids.some((id) => typeof id !== 'string' || id === '')) problems.push('missing/empty block id');
      if (new Set(ids).size !== ids.length) problems.push('duplicate block ids');

      if (problems.length === 0) pass++;
      else failures.push(`✗ ${r.slug}\n    ${problems.join('\n    ')}`);
    }

    console.log(`\nParity: ${pass}/${after.rows.length} rows OK`);
    if (failures.length) {
      console.log(failures.join('\n'));
      process.exitCode = 1;
    } else {
      console.log('✓ all rows: every first-instance block value matches its named column, ids unique');
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
