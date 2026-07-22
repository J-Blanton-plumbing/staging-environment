/**
 * Brief 98 (Track A) — migrate the service-category "Subcategories Grid" off
 * the relational `service_subcategories` table onto the generic `{id,type,data}`
 * JSONB `blocks` model already used by sub-service pages (Brief 90).
 *
 * Scope: the 6 canonical `SERVICE_CATEGORY_SLUGS` (plumbing, sewer, drain,
 * water-heater, water-quality, commercial) — the pages actually rendered by
 * `src/app/services/<slug>/page.tsx`. `service_category_pages` also holds 2
 * more rows (`hydro-jetting`, `sewer-rodding`) used by their own top-level
 * routes, which never read `.subcategories` at all (confirmed by inspection —
 * `src/app/hydro-jetting/page.tsx` only merges hero + problems from the CMS)
 * — those 2 rows are deliberately left untouched.
 *
 * Per-item `image`: the live render shows a per-card thumbnail that, before
 * this migration, came from each category's static content file
 * (`src/lib/content/<slug>.ts`) zipped to the DB row by array index (verified
 * 1:1 order match against `service_subcategories.sort_order` for all 6 pages).
 * This script bakes that image into the migrated block so the JSONB block
 * becomes a single, fully self-contained, editable source of truth.
 *
 * SAFE BY DEFAULT: dry run (reports what it would change) unless invoked with
 * `commit`. Always exports a full backup of `service_subcategories` (all rows,
 * every page) and each `service_category_pages` row's
 * {slug, subcategories_heading, blocks} to a timestamped JSON file under
 * `scripts/backups/` before any write — this export itself is read-only, so it
 * runs in both dry and commit mode (useful to inspect a dry run's "before").
 *
 * IDEMPOTENT: a page whose `blocks` already contains a `serviceSubcategories`
 * instance is skipped — re-running `commit` is a verified no-op.
 *
 * `service_subcategories` is NOT deleted or altered — it stays as a read-only
 * rollback snapshot (per Brief 98 hard rules; dropping it is a follow-up once
 * the JSONB render path is proven in production).
 *
 *   # preview (no writes):
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/migrate-brief-98-subcategories-to-blocks.ts
 *   # apply:
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/migrate-brief-98-subcategories-to-blocks.ts commit
 */
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import { randomUUID } from 'crypto';
import { join } from 'path';
import { Pool } from 'pg';

import { SERVICE_CATEGORY_SLUGS } from '@/lib/services';
import { PLUMBING } from '@/lib/content/plumbing';
import { SEWER } from '@/lib/content/sewer';
import { DRAIN } from '@/lib/content/drain';
import { WATER_HEATER } from '@/lib/content/water-heater';
import { WATER_QUALITY } from '@/lib/content/water-quality';
import { COMMERCIAL } from '@/lib/content/commercial';

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

const BLOCK_TYPE = 'serviceSubcategories' as const;

interface StaticSubItem {
  label: string;
  href: string;
  image: string;
  desc: string;
}

// The static-content source of each category's per-item `image` (by index).
const STATIC_ITEMS: Record<string, StaticSubItem[]> = {
  plumbing: PLUMBING.subcategories.items,
  sewer: SEWER.subcategories.items,
  drain: DRAIN.subcategories.items,
  'water-heater': WATER_HEATER.subcategories.items,
  'water-quality': WATER_QUALITY.subcategories.items,
  commercial: COMMERCIAL.subcategories.items,
};

type SubcategoryRow = { label: string; href: string; description: string; sort_order: number };
type BlockInstance = { id: string; type: string; data: { heading: string | null; items: Record<string, unknown>[] } };

function findSubcategoriesBlock(blocks: unknown): BlockInstance | undefined {
  if (!Array.isArray(blocks)) return undefined;
  return (blocks as BlockInstance[]).find((b) => b && typeof b === 'object' && b.type === BLOCK_TYPE);
}

async function blocksColumnExists(client: import('pg').PoolClient): Promise<boolean> {
  const res = await client.query(
    `SELECT 1 FROM information_schema.columns WHERE table_name = 'service_category_pages' AND column_name = 'blocks'`
  );
  return (res.rowCount ?? 0) > 0;
}

async function backup(client: import('pg').PoolClient) {
  const subRows = (await client.query('SELECT * FROM service_subcategories ORDER BY page_slug, sort_order')).rows;
  // Pre-first-run dry run: the `blocks` column may not exist yet.
  const hasBlocks = await blocksColumnExists(client);
  const pageRows = (
    await client.query(
      hasBlocks
        ? `SELECT slug, subcategories_heading, blocks FROM service_category_pages ORDER BY slug`
        : `SELECT slug, subcategories_heading FROM service_category_pages ORDER BY slug`
    )
  ).rows;

  mkdirSync(join(process.cwd(), 'scripts', 'backups'), { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const path = join(process.cwd(), 'scripts', 'backups', `brief-98-pre-migration-${stamp}.json`);
  writeFileSync(
    path,
    JSON.stringify({ exported_at: new Date().toISOString(), service_subcategories: subRows, service_category_pages: pageRows }, null, 2)
  );
  console.log(`✓ backup written: ${path}`);
  console.log(`  service_subcategories: ${subRows.length} rows, service_category_pages: ${pageRows.length} rows`);
  return path;
}

async function main() {
  const client = await pool.connect();
  try {
    console.log(mode === 'commit' ? 'MODE: COMMIT (writing changes)\n' : 'MODE: DRY RUN (no writes — pass "commit" to apply)\n');

    await backup(client);

    let hasBlocks = await blocksColumnExists(client);
    if (mode === 'commit') {
      if (!hasBlocks) {
        await client.query(`ALTER TABLE service_category_pages ADD COLUMN IF NOT EXISTS blocks JSONB`);
        hasBlocks = true;
      }
      console.log('✓ service_category_pages.blocks column ensured\n');
    } else {
      console.log(
        hasBlocks
          ? '  service_category_pages.blocks column already exists\n'
          : '  service_category_pages.blocks column does NOT exist yet — commit would add it\n'
      );
    }

    let migrated = 0;
    let skipped = 0;

    for (const slug of SERVICE_CATEGORY_SLUGS) {
      const pageRes = await client.query<{ subcategories_heading: string | null; blocks: unknown }>(
        hasBlocks
          ? `SELECT subcategories_heading, blocks FROM service_category_pages WHERE slug = $1`
          : `SELECT subcategories_heading, NULL AS blocks FROM service_category_pages WHERE slug = $1`,
        [slug]
      );
      if (pageRes.rowCount === 0) {
        console.log(`✗ ${slug}: no service_category_pages row found — skipped`);
        continue;
      }
      const { subcategories_heading, blocks } = pageRes.rows[0];

      if (findSubcategoriesBlock(blocks)) {
        skipped++;
        console.log(`= ${slug}: already has a serviceSubcategories block — skipped (idempotent)`);
        continue;
      }

      const subRes = await client.query<SubcategoryRow>(
        `SELECT label, href, description, sort_order FROM service_subcategories WHERE page_slug = $1 ORDER BY sort_order`,
        [slug]
      );
      const staticItems = STATIC_ITEMS[slug] ?? [];

      const items = subRes.rows.map((row, i) => ({
        label: row.label,
        href: row.href,
        desc: row.description,
        image: staticItems[i]?.image ?? '',
      }));

      const newBlock: BlockInstance = {
        id: `${BLOCK_TYPE}-${randomUUID()}`,
        type: BLOCK_TYPE,
        data: { heading: subcategories_heading || null, items },
      };
      const nextBlocks = [...(Array.isArray(blocks) ? blocks : []), newBlock];

      console.log(`✎ ${slug}: ${items.length} subcategory item(s) → 1 serviceSubcategories block`);
      if (mode === 'commit') {
        await client.query(`UPDATE service_category_pages SET blocks = $1::jsonb WHERE slug = $2`, [
          JSON.stringify(nextBlocks),
          slug,
        ]);
      }
      migrated++;
    }

    console.log(`\n${migrated} page(s) migrated, ${skipped} already-migrated (skipped)`);

    // ── Parity verification ────────────────────────────────────────────────
    console.log('\nParity check:');
    let pass = 0;
    const failures: string[] = [];
    for (const slug of SERVICE_CATEGORY_SLUGS) {
      const problems: string[] = [];
      if (!hasBlocks) {
        console.log(`  ~ ${slug}: blocks column doesn't exist yet (dry run) — parity check deferred to commit`);
        continue;
      }
      const pageRes = await client.query<{ subcategories_heading: string | null; blocks: unknown }>(
        `SELECT subcategories_heading, blocks FROM service_category_pages WHERE slug = $1`,
        [slug]
      );
      const row = pageRes.rows[0];
      if (!row) {
        failures.push(`✗ ${slug}: no row found`);
        continue;
      }

      const block = findSubcategoriesBlock(row.blocks);
      if (mode === 'dry' && !block) {
        // Dry run never wrote anything — nothing to verify yet for pages that
        // weren't already migrated.
        console.log(`  ~ ${slug}: not yet migrated (dry run) — parity check deferred to commit`);
        continue;
      }
      if (!block) {
        failures.push(`✗ ${slug}: no serviceSubcategories block found after migration`);
        continue;
      }

      const subRes = await client.query<SubcategoryRow>(
        `SELECT label, href, description, sort_order FROM service_subcategories WHERE page_slug = $1 ORDER BY sort_order`,
        [slug]
      );
      const staticItems = STATIC_ITEMS[slug] ?? [];
      const want = subRes.rows.map((r, i) => ({
        label: r.label,
        href: r.href,
        desc: r.description,
        image: staticItems[i]?.image ?? '',
      }));
      const got = block.data.items;

      if (got.length !== want.length) {
        problems.push(`item count: blocks=${got.length} vs relational=${want.length}`);
      } else {
        for (let i = 0; i < want.length; i++) {
          for (const key of ['label', 'href', 'desc', 'image'] as const) {
            const a = JSON.stringify(got[i]?.[key] ?? null);
            const b = JSON.stringify(want[i][key] ?? null);
            if (a !== b) problems.push(`item[${i}].${key}: blocks=${a} vs expected=${b}`);
          }
        }
      }
      const wantHeading = JSON.stringify(row.subcategories_heading || null);
      const gotHeading = JSON.stringify(block.data.heading ?? null);
      if (wantHeading !== gotHeading) problems.push(`heading: blocks=${gotHeading} vs column=${wantHeading}`);

      if (typeof block.id !== 'string' || block.id === '') problems.push('missing/empty block id');

      if (problems.length === 0) {
        pass++;
      } else {
        failures.push(`✗ ${slug}\n    ${problems.join('\n    ')}`);
      }
    }

    const checked = mode === 'commit' ? SERVICE_CATEGORY_SLUGS.length : pass + failures.length;
    console.log(`\nParity: ${pass}/${checked} page(s) OK`);
    if (failures.length) {
      console.log(failures.join('\n'));
      process.exitCode = 1;
    } else if (mode === 'commit') {
      console.log('✓ all 6 canonical category pages: blocks match the relational rows + static images, ids present');
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
