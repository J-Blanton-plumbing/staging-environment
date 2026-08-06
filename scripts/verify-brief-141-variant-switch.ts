/**
 * Brief 141 QA — proves the template-variant switch is non-destructive in BOTH
 * directions, and that a top-level string content value survives the sanitizer.
 *
 * What it does:
 *  1. Snapshots `main_pages.content` for 'no-drip-club'.
 *  2. Asserts `sanitizeMainPageContent` leaves `template_variant` (a top-level
 *     STRING — a different path through the sanitizer than Brief 121's nested
 *     object) and both variant content keys byte-identical.
 *  3. Performs N variant switches through `updateMainPage()` — the SAME writer
 *     `publishDraft` routes main-page draft publishes to, and the same sanitizer
 *     the PATCH route uses — sending the full editor-shaped payload each time
 *     (both content keys, exactly as the admin's `buildPayload` does).
 *  4. Compares `content.benefits_card` and `content.membership_comparison`
 *     byte-for-byte against the snapshot after every switch.
 *  5. Leaves the row on the variant it started on.
 *
 * READ-MOSTLY: it writes only `template_variant` values that it also restores,
 * and it backs the row up first. Exits non-zero on any mismatch.
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/verify-brief-141-variant-switch.ts
 */
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';

import { sanitizeMainPageContent } from '@/lib/cms/sanitize';
import { NDC_TEMPLATE_VARIANT_CONTENT_KEY, normalizeNdcTemplateVariant } from '@/lib/cms/ndc-template-variant';
import { NDC_MEMBERSHIP_COMPARISON_CONTENT_KEY } from '@/lib/cms/membership-comparison';
import { NDC_BENEFITS_CARD_CONTENT_KEY } from '@/lib/cms/benefits-card';

const env = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
const get = (k: string) => {
  if (process.env[k]) return process.env[k] as string;
  const m = env.match(new RegExp('^' + k + '=(.*)$', 'm'));
  return m ? m[1].trim() : '';
};
const DB = get('DATABASE_URL') || 'postgresql://postgres:jbp@localhost:5432/jbp_cms';
process.env.DATABASE_URL = DB; // so the `@/lib/db` pool used by updateMainPage connects
const pool = new Pool({ connectionString: DB });

const SLUG = 'no-drip-club';
const SWITCHES = 10;
let failures = 0;

function check(ok: boolean, msg: string) {
  console.log(`  ${ok ? '✓' : '✗'} ${msg}`);
  if (!ok) failures++;
}

async function readRow() {
  const r = await pool.query('SELECT content, meta_title, meta_description, version FROM main_pages WHERE slug = $1', [SLUG]);
  return r.rows[0] as { content: Record<string, unknown>; meta_title: string | null; meta_description: string | null; version: number };
}

async function main() {
  const { updateMainPage } = await import('@/lib/cms/main-pages');

  const start = await readRow();
  mkdirSync(join(process.cwd(), 'scripts', 'backups'), { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = join(process.cwd(), 'scripts', 'backups', `brief-141-verify-pre-${stamp}.json`);
  writeFileSync(backupPath, JSON.stringify({ exported_at: new Date().toISOString(), row: start }, null, 2));
  console.log(`✓ backup written: ${backupPath}\n`);

  const startVariant = normalizeNdcTemplateVariant(start.content[NDC_TEMPLATE_VARIANT_CONTENT_KEY]);
  const cardBefore = JSON.stringify(start.content[NDC_BENEFITS_CARD_CONTENT_KEY] ?? null);
  const compBefore = JSON.stringify(start.content[NDC_MEMBERSHIP_COMPARISON_CONTENT_KEY] ?? null);
  console.log(`start variant: ${startVariant}`);
  console.log(`benefits_card bytes:         ${cardBefore.length}`);
  console.log(`membership_comparison bytes: ${compBefore.length}\n`);

  // ── 1. sanitizer pass-through ─────────────────────────────────────────────
  console.log('Sanitizer (sanitizeMainPageContent — the write path for PATCH and publishDraft):');
  const sanitized = sanitizeMainPageContent(SLUG, start.content);
  check(
    sanitized[NDC_TEMPLATE_VARIANT_CONTENT_KEY] === start.content[NDC_TEMPLATE_VARIANT_CONTENT_KEY],
    `template_variant (top-level string) untouched: ${JSON.stringify(sanitized[NDC_TEMPLATE_VARIANT_CONTENT_KEY])}`
  );
  check(
    JSON.stringify(sanitized[NDC_BENEFITS_CARD_CONTENT_KEY] ?? null) === cardBefore,
    'benefits_card untouched by the sanitizer'
  );
  check(
    JSON.stringify(sanitized[NDC_MEMBERSHIP_COMPARISON_CONTENT_KEY] ?? null) === compBefore,
    'membership_comparison untouched by the sanitizer'
  );

  // ── 2. round-trip switches through the real writer ────────────────────────
  console.log(`\n${SWITCHES} variant switches through updateMainPage() (full editor-shaped payload each time):`);
  let version = start.version;
  let variant = startVariant;
  for (let i = 1; i <= SWITCHES; i++) {
    const row = await readRow();
    variant = variant === 'classic' ? 'comparison' : 'classic';
    // Exactly what the admin editor's buildPayload sends: every content key,
    // including the NON-selected variant's, plus meta + the optimistic-lock version.
    const payload = {
      ...row.content,
      [NDC_TEMPLATE_VARIANT_CONTENT_KEY]: variant,
      meta_title: row.meta_title,
      meta_description: row.meta_description,
    };
    version = await updateMainPage(SLUG, payload, null, row.version);
    const after = await readRow();
    const cardNow = JSON.stringify(after.content[NDC_BENEFITS_CARD_CONTENT_KEY] ?? null);
    const compNow = JSON.stringify(after.content[NDC_MEMBERSHIP_COMPARISON_CONTENT_KEY] ?? null);
    const variantNow = after.content[NDC_TEMPLATE_VARIANT_CONTENT_KEY];
    check(
      variantNow === variant && cardNow === cardBefore && compNow === compBefore,
      `switch ${String(i).padStart(2)} → ${variant} (v${version}): benefits_card ${cardNow === cardBefore ? 'identical' : 'CHANGED'}, membership_comparison ${compNow === compBefore ? 'identical' : 'CHANGED'}`
    );
  }

  // ── 3. restore the starting variant ───────────────────────────────────────
  if (variant !== startVariant) {
    const row = await readRow();
    await updateMainPage(
      SLUG,
      { ...row.content, [NDC_TEMPLATE_VARIANT_CONTENT_KEY]: startVariant, meta_title: row.meta_title, meta_description: row.meta_description },
      null,
      row.version
    );
  }
  const end = await readRow();
  console.log('\nFinal state:');
  check(normalizeNdcTemplateVariant(end.content[NDC_TEMPLATE_VARIANT_CONTENT_KEY]) === startVariant, `variant restored to "${startVariant}"`);
  check(JSON.stringify(end.content[NDC_BENEFITS_CARD_CONTENT_KEY] ?? null) === cardBefore, 'benefits_card byte-identical to the pre-test snapshot');
  check(JSON.stringify(end.content[NDC_MEMBERSHIP_COMPARISON_CONTENT_KEY] ?? null) === compBefore, 'membership_comparison byte-identical to the pre-test snapshot');
  // Every other content key must also be untouched.
  const otherKeysMatch = Object.keys(start.content)
    .filter((k) => k !== NDC_TEMPLATE_VARIANT_CONTENT_KEY)
    .every((k) => JSON.stringify(start.content[k]) === JSON.stringify(end.content[k]));
  check(otherKeysMatch, 'every other content key (hero/wait/how/pricing) byte-identical');

  console.log(failures === 0 ? '\n✓ ALL CHECKS PASSED' : `\n✗ ${failures} CHECK(S) FAILED`);
  if (failures > 0) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
