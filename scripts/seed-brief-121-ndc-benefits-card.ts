/**
 * Brief 121 (Track D) — seed the No Drip Club page's `benefitsCard` block
 * instance from today's static card content (`src/lib/content/ndc.ts`, itself
 * verbatim from Brief 12 / the live theme).
 *
 * Writes ONE key — `benefits_card` — into the existing
 * `main_pages.content` JSONB blob for slug 'no-drip-club' (the contained
 * integration path: no new table, no column, no block-builder migration).
 * The instance's `data` comes from `staticNdcBenefitsCardData()` — the same
 * mapper the public page's pre-seed fallback and the admin editor's initial
 * state use — so the seeded card renders byte-identically to the card the
 * page rendered before the seed ran.
 *
 * Deliberately does NOT bump `version` semantics beyond the normal +1 and does
 * NOT touch any other content key (the legacy `content.pricing` string is left
 * in place as an inert historical value).
 *
 * SAFE BY DEFAULT: dry run (reports what it would change) unless invoked with
 * `commit`. Always exports a full backup of the `main_pages` row to a
 * timestamped JSON file under `scripts/backups/` before any write — the
 * export is read-only, so it runs in both modes.
 *
 * IDEMPOTENT: if `content.benefits_card` already holds a well-formed
 * `benefitsCard` instance, the row is skipped — re-running `commit` is a
 * verified no-op (an existing instance is never overwritten, so editor
 * changes can't be clobbered by a re-run).
 *
 *   # preview (no writes):
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/seed-brief-121-ndc-benefits-card.ts
 *   # apply:
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/seed-brief-121-ndc-benefits-card.ts commit
 */
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import { randomUUID } from 'crypto';
import { join } from 'path';
import { Pool } from 'pg';
import { resolveRunMode, announceMode } from './lib/run-mode';

import {
  normalizeBenefitsCardInstance,
  staticNdcBenefitsCardData,
  NDC_BENEFITS_CARD_CONTENT_KEY,
  type BenefitsCardInstance,
} from '@/lib/cms/benefits-card';

const env = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
const get = (k: string) => {
  if (process.env[k]) return process.env[k] as string;
  const m = env.match(new RegExp('^' + k + '=(.*)$', 'm'));
  return m ? m[1].trim() : '';
};
const pool = new Pool({
  connectionString: get('DATABASE_URL') || 'postgresql://postgres:jbp@localhost:5432/jbp_cms',
});

// Brief 147 (Track A): one shared rule for apply-vs-preview. Still dry-run by
// default at a terminal — but a PIPELINE run (JBP_PIPELINE/CI set) with no
// explicit `commit` or `--dry-run` now exits NON-ZERO instead of quietly
// previewing and letting the deploy report success. That silent-no-op path is
// how the Brief 146 content port shipped an empty page. See scripts/lib/run-mode.ts.
const SCRIPT = 'seed-brief-121-ndc-benefits-card';
const mode = resolveRunMode(SCRIPT);
const SLUG = 'no-drip-club';

async function backup(client: import('pg').PoolClient) {
  const row = (await client.query('SELECT * FROM main_pages WHERE slug = $1', [SLUG])).rows[0] ?? null;
  mkdirSync(join(process.cwd(), 'scripts', 'backups'), { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const path = join(process.cwd(), 'scripts', 'backups', `brief-121-pre-seed-${stamp}.json`);
  writeFileSync(path, JSON.stringify({ exported_at: new Date().toISOString(), main_pages_row: row }, null, 2));
  console.log(`✓ backup written: ${path}`);
  return row;
}

async function main() {
  const client = await pool.connect();
  try {
    announceMode(SCRIPT, mode);

    const row = await backup(client);
    if (!row) {
      console.error(`✗ no main_pages row for slug "${SLUG}" — nothing to seed. Run scripts/seed-main-pages.ts first.`);
      process.exitCode = 1;
      return;
    }

    const content = (row.content ?? {}) as Record<string, unknown>;
    const existing = normalizeBenefitsCardInstance(content[NDC_BENEFITS_CARD_CONTENT_KEY]);
    if (existing) {
      console.log(`= ${SLUG}: content.${NDC_BENEFITS_CARD_CONTENT_KEY} already holds instance "${existing.id}" — skipped (idempotent no-op).`);
      return;
    }

    const instance: BenefitsCardInstance = {
      id: `benefitsCard-${randomUUID()}`,
      type: 'benefitsCard',
      data: staticNdcBenefitsCardData(),
    };

    console.log(`✎ ${SLUG}: seeding content.${NDC_BENEFITS_CARD_CONTENT_KEY} —`);
    console.log(`    title:     ${JSON.stringify(instance.data.title)}`);
    console.log(`    columns:   ${instance.data.columns}`);
    instance.data.groups.forEach((g) =>
      console.log(`    group:     col ${g.column} · ${JSON.stringify(g.heading)} · ${g.items.length} item(s)`)
    );
    console.log(`    price:     enabled=${instance.data.price.enabled}, amount=${JSON.stringify(instance.data.price.amount)} (Global Settings token)`);
    console.log(`    footnotes: ${instance.data.footnotes.length} line(s)`);

    if (mode === 'commit') {
      // jsonb_set only touches the one new key; every other content key —
      // hero/wait/how copy, the legacy `pricing` string — is byte-untouched.
      // version+1 keeps the Brief 78 optimistic-lock chain honest (an admin
      // editor loaded pre-seed will 409 instead of silently overwriting).
      await client.query(
        `UPDATE main_pages
           SET content    = jsonb_set(content, $1, $2::jsonb, true),
               version    = version + 1,
               updated_at = NOW()
         WHERE slug = $3`,
        [`{${NDC_BENEFITS_CARD_CONTENT_KEY}}`, JSON.stringify(instance), SLUG]
      );
      console.log('\n✓ seed committed.');
    }

    // ── Parity verification ──────────────────────────────────────────────────
    console.log('\nParity check:');
    if (mode === 'dry') {
      console.log('  ~ dry run — nothing written; parity check runs on commit.');
      console.log('\nDRY RUN complete — no changes written. Re-run with "commit" to apply.');
      return;
    }
    const after = (await client.query('SELECT content FROM main_pages WHERE slug = $1', [SLUG])).rows[0];
    const stored = normalizeBenefitsCardInstance((after.content as Record<string, unknown>)[NDC_BENEFITS_CARD_CONTENT_KEY]);
    const want = JSON.stringify(instance.data);
    const got = stored ? JSON.stringify(stored.data) : null;
    if (stored && got === want && stored.id === instance.id) {
      console.log('  ✓ stored instance round-trips the static mapper exactly (normalized data + id match).');
    } else {
      console.error('  ✗ stored instance does NOT match what was written:');
      console.error(`    want: ${want}`);
      console.error(`    got:  ${got}`);
      process.exitCode = 1;
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
