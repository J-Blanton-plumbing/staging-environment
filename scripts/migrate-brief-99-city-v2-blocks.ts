/**
 * Brief 99 (Track B) — additive, idempotent migration: give every
 * `template_type='local-office-v2'` `city_pages` row a `blocks` JSONB column
 * (an array of `{id,type,data}` instances, the Brief 90 shape) folding its
 * current named-column values into the canonical order:
 *
 *   hero → trust bar → services grid → most-requested → mid CTA → why →
 *   video → reviews → FAQ → NDC v1 → final CTA
 *
 * V1 template rows (`coverage-area`, `local-office`) are left completely
 * untouched — `blocks` stays NULL for them, and the reader/writer never look
 * at it for those template types.
 *
 * SAFE BY DEFAULT: dry run (reports what it would change) unless invoked with
 * `commit`. Always exports a full backup of every V2 row's named columns +
 * `blocks` to a timestamped JSON file under `scripts/backups/` before any
 * write — read-only, so it runs in both dry and commit mode.
 *
 * IDEMPOTENT: a row whose `blocks` already contains at least one instance is
 * skipped — re-running `commit` is a verified no-op.
 *
 * The 15 named V2 columns are NOT cleared or altered — they stay as the
 * Brief 90-style rollback snapshot of each row's primary (first) instance.
 *
 *   # preview (no writes):
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/migrate-brief-99-city-v2-blocks.ts
 *   # apply:
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/migrate-brief-99-city-v2-blocks.ts commit
 */
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import { randomUUID } from 'crypto';
import { join } from 'path';
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

const mode = process.argv[2] === 'commit' ? 'commit' : 'dry';

const BLOCK_ORDER = [
  'localOfficeV2Hero',
  'trustBar',
  'servicesGrid',
  'mostRequestedServices',
  'midCta',
  'whyPoints',
  'videoPlaceholder',
  'reviews',
  'faqAccordion',
  'noDripClub',
  'finalCta',
] as const;
type BlockType = (typeof BLOCK_ORDER)[number];

type Row = {
  city_slug: string;
  hero_image: string | null;
  hero_heading_line1: string | null;
  hero_description: string | null;
  trust_bar_stars: string | null;
  trust_bar_review_count: string | null;
  services_intro: string | null;
  most_requested_services: unknown;
  mid_cta_text: string | null;
  why_points: unknown;
  video_heading: string | null;
  video_intro: string | null;
  video_script: string | null;
  reviews: unknown;
  faqs: unknown;
  ndc_intro: string | null;
  final_cta_heading: string | null;
  final_cta_body: string | null;
  blocks: unknown;
};

type BlockInstance = { id: string; type: BlockType; data: Record<string, unknown> };

const nn = (v: string | null | undefined) => (v == null || v === '' ? null : v);
const asArr = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? (v as Record<string, unknown>[]) : []);

/** Per-type data payload derived from named columns — mirrors `cityV2BlockDataFor()` in the app. */
function dataFor(type: BlockType, r: Row): Record<string, unknown> {
  switch (type) {
    case 'localOfficeV2Hero':
      return { heroImage: nn(r.hero_image), heroHeadingLine1: nn(r.hero_heading_line1), heroDescription: nn(r.hero_description) };
    case 'trustBar':
      return { trustBarStars: nn(r.trust_bar_stars), trustBarReviewCount: nn(r.trust_bar_review_count) };
    case 'servicesGrid':
      return { servicesIntro: nn(r.services_intro) };
    case 'mostRequestedServices':
      return { items: asArr(r.most_requested_services) };
    case 'midCta':
      return { midCtaText: nn(r.mid_cta_text) };
    case 'whyPoints':
      return { items: asArr(r.why_points) };
    case 'videoPlaceholder':
      return { videoHeading: nn(r.video_heading), videoIntro: nn(r.video_intro), videoScript: nn(r.video_script) };
    case 'reviews':
      return { items: asArr(r.reviews) };
    case 'faqAccordion':
      return { heading: null, faqs: asArr(r.faqs) };
    case 'noDripClub':
      return { variant: 'v1', ndcBody: nn(r.ndc_intro) };
    case 'finalCta':
      return { ctaHeading: nn(r.final_cta_heading), ctaBody: nn(r.final_cta_body) };
    default:
      return {};
  }
}

function toInstances(r: Row): BlockInstance[] {
  return BLOCK_ORDER.map((type) => ({ id: `${type}-${randomUUID()}`, type, data: dataFor(type, r) }));
}

function isMigrated(blocks: unknown): boolean {
  return Array.isArray(blocks) && blocks.length > 0;
}

const SELECT_COLS = `city_slug, hero_image, hero_heading_line1, hero_description,
  trust_bar_stars, trust_bar_review_count, services_intro, most_requested_services,
  mid_cta_text, why_points, video_heading, video_intro, video_script, reviews, faqs,
  ndc_intro, final_cta_heading, final_cta_body, blocks`;

async function blocksColumnExists(client: import('pg').PoolClient): Promise<boolean> {
  const res = await client.query(
    `SELECT 1 FROM information_schema.columns WHERE table_name = 'city_pages' AND column_name = 'blocks'`
  );
  return (res.rowCount ?? 0) > 0;
}

async function backup(client: import('pg').PoolClient, hasBlocks: boolean) {
  const rows = (
    await client.query(
      hasBlocks
        ? `SELECT ${SELECT_COLS} FROM city_pages WHERE template_type = 'local-office-v2' ORDER BY city_slug`
        : `SELECT ${SELECT_COLS.replace(', blocks', ', NULL AS blocks')} FROM city_pages WHERE template_type = 'local-office-v2' ORDER BY city_slug`
    )
  ).rows;
  mkdirSync(join(process.cwd(), 'scripts', 'backups'), { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const path = join(process.cwd(), 'scripts', 'backups', `brief-99-pre-migration-${stamp}.json`);
  writeFileSync(path, JSON.stringify({ exported_at: new Date().toISOString(), city_pages_v2: rows }, null, 2));
  console.log(`✓ backup written: ${path}`);
  console.log(`  city_pages (template_type='local-office-v2'): ${rows.length} row(s)`);
  return rows.length;
}

async function main() {
  const client = await pool.connect();
  try {
    console.log(mode === 'commit' ? 'MODE: COMMIT (writing changes)\n' : 'MODE: DRY RUN (no writes — pass "commit" to apply)\n');

    let hasBlocks = await blocksColumnExists(client);
    const v2Count = await backup(client, hasBlocks);
    if (v2Count === 0) {
      console.log('\nNo local-office-v2 rows found — nothing to migrate.');
      return;
    }

    if (mode === 'commit') {
      if (!hasBlocks) {
        await client.query(`ALTER TABLE city_pages ADD COLUMN IF NOT EXISTS blocks JSONB`);
        hasBlocks = true;
      }
      console.log('✓ city_pages.blocks column ensured\n');
    } else {
      console.log(
        hasBlocks
          ? '  city_pages.blocks column already exists\n'
          : '  city_pages.blocks column does NOT exist yet — commit would add it\n'
      );
    }

    const rows = (
      await client.query<Row>(
        hasBlocks
          ? `SELECT ${SELECT_COLS} FROM city_pages WHERE template_type = 'local-office-v2' ORDER BY city_slug`
          : `SELECT ${SELECT_COLS.replace(', blocks', ', NULL AS blocks')} FROM city_pages WHERE template_type = 'local-office-v2' ORDER BY city_slug`
      )
    ).rows;

    let migrated = 0;
    let skipped = 0;
    for (const r of rows) {
      if (isMigrated(r.blocks)) {
        skipped++;
        console.log(`= ${r.city_slug}: already has blocks — skipped (idempotent)`);
        continue;
      }
      const instances = toInstances(r);
      console.log(`✎ ${r.city_slug}: ${instances.length} blocks (hero → … → final CTA)`);
      if (mode === 'commit') {
        await client.query(`UPDATE city_pages SET blocks = $1::jsonb WHERE city_slug = $2`, [
          JSON.stringify(instances),
          r.city_slug,
        ]);
      }
      migrated++;
    }
    console.log(`\n${migrated} row(s) migrated, ${skipped} already-migrated (skipped)`);

    // ── Parity verification — first instance of each type must equal its named column ──
    console.log('\nParity check:');
    let pass = 0;
    const failures: string[] = [];
    const checkRows = mode === 'commit'
      ? (await client.query<Row>(
          `SELECT ${SELECT_COLS} FROM city_pages WHERE template_type = 'local-office-v2' ORDER BY city_slug`
        )).rows
      : rows.filter((r) => isMigrated(r.blocks)); // dry run: only already-migrated rows have anything to check

    for (const r of checkRows) {
      const problems: string[] = [];
      const blocks = Array.isArray(r.blocks) ? (r.blocks as BlockInstance[]) : [];
      if (!isMigrated(r.blocks)) {
        console.log(`  ~ ${r.city_slug}: not yet migrated (dry run) — parity check deferred to commit`);
        continue;
      }
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
      const ids = blocks.map((b) => b.id);
      if (ids.some((id) => typeof id !== 'string' || id === '')) problems.push('missing/empty block id');
      if (new Set(ids).size !== ids.length) problems.push('duplicate block ids');
      if (blocks.length !== BLOCK_ORDER.length) problems.push(`expected ${BLOCK_ORDER.length} blocks, found ${blocks.length}`);

      if (problems.length === 0) pass++;
      else failures.push(`✗ ${r.city_slug}\n    ${problems.join('\n    ')}`);
    }

    const checked = mode === 'commit' ? checkRows.length : pass + failures.length;
    console.log(`\nParity: ${pass}/${checked} row(s) OK`);
    if (failures.length) {
      console.log(failures.join('\n'));
      process.exitCode = 1;
    } else if (mode === 'commit') {
      console.log('✓ all local-office-v2 rows: every first-instance block value matches its named column, ids unique, canonical order complete');
    }

    if (mode === 'dry') {
      console.log('\nDRY RUN complete — no changes written. Re-run with "commit" to apply.');
    } else if (migrated === 0) {
      console.log('\nNothing to migrate — already fully migrated (idempotent no-op).');
    } else {
      console.log('\n✓ Migration committed.');
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
