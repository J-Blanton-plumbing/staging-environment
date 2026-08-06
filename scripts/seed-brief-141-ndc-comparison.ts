/**
 * Brief 141 (Track F) — seed the No Drip Club page's `comparison` template
 * variant and its `membershipComparison` block instance.
 *
 * Writes TWO keys into the existing `main_pages.content` JSONB blob for slug
 * 'no-drip-club' (no new table, no column, no schema migration):
 *
 *   content.membership_comparison  the block instance ({id, type, data}), with the
 *                                  approved sell-sheet content from
 *                                  `staticNdcMembershipComparisonData()` — the SAME
 *                                  mapper the public page's pre-seed fallback, the
 *                                  editor's initial state and the registry's
 *                                  defaultData use, so all four can never drift.
 *   content.template_variant       'comparison' — the new template goes live on
 *                                  staging (confirmed with the marketing lead).
 *
 * Price `amount` values are the Global Settings TOKENS ({{ndc_price_1yr}} /
 * {{ndc_price_2yr}}), not the literals, so the cards stay driven by Global
 * Settings. A card rendering EMPTY means the Track A price seed
 * (`seed-brief-141-ndc-prices.ts`) has not run.
 *
 * ⚠️ PRODUCTION IS A SEPARATE DECISION. Flipping `template_variant` to
 * 'comparison' on production without the $29.97 → annual price sweep would
 * advertise two different prices at once (~36 stale occurrences remain across
 * city/service/home CMS content). See the Brief 141 report's downstream risks and
 * `production-migration-checklist.md`.
 *
 * Does NOT touch `content.benefits_card` — the classic variant's content stays
 * exactly as it is, and switching back is one selection away. That isolation is
 * the whole point of the Brief 141 design; do not add a migration step here.
 *
 * SAFE BY DEFAULT: dry run unless invoked with `commit`. Always exports a full
 * backup of the `main_pages` row to `scripts/backups/` first (read-only, so it
 * runs in both modes).
 *
 * IDEMPOTENT: each key is written only when it is absent/malformed. An existing
 * well-formed instance is never overwritten (editor changes are safe), and an
 * existing `template_variant` — including a deliberate switch BACK to 'classic'
 * — is never re-flipped, so re-running on every deploy can't undo an editor's
 * choice.
 *
 *   # preview (no writes):
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/seed-brief-141-ndc-comparison.ts
 *   # apply:
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/seed-brief-141-ndc-comparison.ts commit
 *
 * `-r tsconfig-paths/register` is REQUIRED — this script imports from src/ via
 * `@/…` path aliases.
 */
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import { randomUUID } from 'crypto';
import { join } from 'path';
import { Pool } from 'pg';

import {
  normalizeMembershipComparisonInstance,
  staticNdcMembershipComparisonData,
  NDC_MEMBERSHIP_COMPARISON_CONTENT_KEY,
  type MembershipComparisonInstance,
} from '@/lib/cms/membership-comparison';
import { NDC_TEMPLATE_VARIANT_CONTENT_KEY } from '@/lib/cms/ndc-template-variant';

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
const SLUG = 'no-drip-club';
const TARGET_VARIANT = 'comparison';

async function backup(client: import('pg').PoolClient) {
  const row = (await client.query('SELECT * FROM main_pages WHERE slug = $1', [SLUG])).rows[0] ?? null;
  mkdirSync(join(process.cwd(), 'scripts', 'backups'), { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const path = join(process.cwd(), 'scripts', 'backups', `brief-141-pre-seed-${stamp}.json`);
  writeFileSync(path, JSON.stringify({ exported_at: new Date().toISOString(), main_pages_row: row }, null, 2));
  console.log(`✓ backup written: ${path}`);
  return row;
}

async function main() {
  const client = await pool.connect();
  try {
    console.log(mode === 'commit' ? 'MODE: COMMIT (writing changes)\n' : 'MODE: DRY RUN (no writes — pass "commit" to apply)\n');

    const row = await backup(client);
    if (!row) {
      console.error(`✗ no main_pages row for slug "${SLUG}" — nothing to seed. Run scripts/seed-main-pages.ts first.`);
      process.exitCode = 1;
      return;
    }

    const content = (row.content ?? {}) as Record<string, unknown>;

    // ── 1. the block instance ────────────────────────────────────────────────
    const existing = normalizeMembershipComparisonInstance(content[NDC_MEMBERSHIP_COMPARISON_CONTENT_KEY]);
    let instance: MembershipComparisonInstance | null = null;
    if (existing) {
      console.log(`= ${SLUG}: content.${NDC_MEMBERSHIP_COMPARISON_CONTENT_KEY} already holds instance "${existing.id}" — skipped (idempotent no-op).`);
    } else {
      instance = {
        id: `membershipComparison-${randomUUID()}`,
        type: 'membershipComparison',
        data: staticNdcMembershipComparisonData(),
      };
      console.log(`✎ ${SLUG}: seeding content.${NDC_MEMBERSHIP_COMPARISON_CONTENT_KEY} —`);
      console.log(`    title:     ${JSON.stringify(instance.data.title)} / ${JSON.stringify(instance.data.subtitle)}`);
      console.log(`    columns:   ${JSON.stringify(instance.data.memberColumnLabel)} vs ${JSON.stringify(instance.data.nonMemberColumnLabel)}`);
      instance.data.rows.forEach((r, i) =>
        console.log(`    row ${String(i + 1).padStart(2)}:   ${r.child ? '  • ' : ''}${r.label}${r.caveat ? `  ${r.caveat}` : ''}  [member=${r.member} nonMember=${r.nonMember}]`)
      );
      console.log(`    closing:   ${JSON.stringify(instance.data.closingLine)}`);
      instance.data.prices.forEach((p) =>
        console.log(`    price:     ${p.termLabel} = ${JSON.stringify(p.amount)} (Global Settings token)${p.emphasized ? ' [emphasized]' : ''}`)
      );
      console.log(`    footnote:  ${JSON.stringify(instance.data.priceFootnote)}`);
    }

    // ── 2. the template variant ──────────────────────────────────────────────
    const currentVariant = content[NDC_TEMPLATE_VARIANT_CONTENT_KEY];
    const variantIsSet = currentVariant === 'classic' || currentVariant === 'comparison';
    if (variantIsSet) {
      console.log(`= ${SLUG}: content.${NDC_TEMPLATE_VARIANT_CONTENT_KEY} already "${String(currentVariant)}" — skipped (never re-flips an editor's choice).`);
    } else {
      console.log(`✎ ${SLUG}: seeding content.${NDC_TEMPLATE_VARIANT_CONTENT_KEY} = "${TARGET_VARIANT}" (classic variant left fully intact, one switch away).`);
    }

    if (instance === null && variantIsSet) {
      console.log('\nNothing to write (idempotent no-op).');
      return;
    }

    if (mode === 'commit') {
      // jsonb_set per key so every OTHER content key — the hero/wait/how copy and
      // the classic variant's `benefits_card` — stays byte-untouched. version+1
      // keeps the Brief 78 optimistic-lock chain honest (an admin editor loaded
      // pre-seed will 409 instead of silently overwriting).
      if (instance) {
        await client.query(
          `UPDATE main_pages SET content = jsonb_set(content, $1, $2::jsonb, true) WHERE slug = $3`,
          [`{${NDC_MEMBERSHIP_COMPARISON_CONTENT_KEY}}`, JSON.stringify(instance), SLUG]
        );
      }
      if (!variantIsSet) {
        await client.query(
          `UPDATE main_pages SET content = jsonb_set(content, $1, $2::jsonb, true) WHERE slug = $3`,
          [`{${NDC_TEMPLATE_VARIANT_CONTENT_KEY}}`, JSON.stringify(TARGET_VARIANT), SLUG]
        );
      }
      await client.query(
        `UPDATE main_pages SET version = version + 1, updated_at = NOW() WHERE slug = $1`,
        [SLUG]
      );
      console.log('\n✓ seed committed.');
    } else {
      console.log('\nDRY RUN complete — no changes written. Re-run with "commit" to apply.');
      return;
    }

    // ── Parity verification ──────────────────────────────────────────────────
    console.log('\nParity check:');
    const after = (await client.query('SELECT content FROM main_pages WHERE slug = $1', [SLUG])).rows[0];
    const afterContent = after.content as Record<string, unknown>;
    const stored = normalizeMembershipComparisonInstance(afterContent[NDC_MEMBERSHIP_COMPARISON_CONTENT_KEY]);
    if (instance) {
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
    } else if (stored) {
      console.log('  ✓ pre-existing instance untouched.');
    }
    console.log(`  ${afterContent[NDC_TEMPLATE_VARIANT_CONTENT_KEY] === TARGET_VARIANT || variantIsSet ? '✓' : '✗'} template_variant = ${JSON.stringify(afterContent[NDC_TEMPLATE_VARIANT_CONTENT_KEY])}`);
    // The classic variant's content must be exactly as it was.
    const beforeCard = JSON.stringify((row.content as Record<string, unknown>)?.benefits_card ?? null);
    const afterCard = JSON.stringify(afterContent.benefits_card ?? null);
    if (beforeCard === afterCard) {
      console.log('  ✓ content.benefits_card (classic variant) byte-identical before and after.');
    } else {
      console.error('  ✗ content.benefits_card CHANGED — the seed must never touch the classic variant.');
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
