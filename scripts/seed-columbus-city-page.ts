/**
 * Brief 158 (Track A) — create the ONE missing `city_pages` row: `columbus`.
 *
 * ── WHY ─────────────────────────────────────────────────────────────────────
 * Columbus is the only one of the 249 registered cities with no `city_pages`
 * row (Brief 157, Q2/Q7 — measured on the local dev DB *and*, via the
 * `/sitemap-cities.xml` `<lastmod>` probe, on the database serving the live
 * site). With no row, `/admin/city/columbus` renders the "No CMS content found"
 * warning card instead of a form, and the save path is `UPDATE`-only
 * (`updateCityCmsContent` throws *"No city_pages row found for slug…"*), so the
 * editor cannot bootstrap the row itself. Marketing can see the copy on the live
 * page and cannot edit a word of it.
 *
 * Nothing in the pipeline creates a row for a city that never existed in
 * WordPress: `migrate-wp-cities.ts` is gated on `jb_type=city_overview`,
 * `backfill-brief131-city-content.ts` is allow-listed to 21 WP-sourced slugs,
 * and the seed scripts cover Evanston/Elgin/the V2 set. Columbus is the first
 * city born AFTER the migration (Brief 154), so this is the fill-gaps path — the
 * same shape as `add-columbus-office.ts`, one table over.
 *
 * ── WHY THE LIVE PAGE DOES NOT MOVE ─────────────────────────────────────────
 * The coverage-area merge in `src/app/[city]/page.tsx` is `db.X || base.X` PER
 * FIELD, where `base` is `getCoverageContent('columbus')` — i.e. the checked-in
 * `src/lib/content/cities/columbus.ts`. This script seeds each column with the
 * value that file already supplies, so every `||` resolves to the same string it
 * resolves to today. `src/lib/content/cities/columbus.ts` STAYS in place and
 * stays wired into `COVERAGE_CONTENT`; it is now the fallback tier rather than
 * the only tier. Do not "clean up" the duplication by deleting it — that takes
 * live copy off an indexed page.
 *
 * ⚠️ `hero_heading_line1` IS SEEDED AS THE EMPTY STRING, DELIBERATELY.
 * It is the one column that can silently rewrite the H1 of an indexed page:
 * `CoverageAreaCity.tsx` renders `content?.h1Override ?? \`${name} Plumber\``,
 * and the merge sets `h1Override = db.heroHeadingLine1 || base.h1Override`. A
 * non-empty value here replaces `<h1>Columbus Plumber</h1>`. `''` is the
 * established precedent — the 21 Brief-140 backfill rows all carry `''` and all
 * render the `{City} Plumber` default correctly. Never seed a headline here.
 *
 * FAQs are seeded as `[]` on purpose too: `mergedFaqs` picks the DB array only
 * when non-empty, so `[]` preserves today's `WATER_TESTING_FAQS` fallback
 * exactly. Marketing replaces them in the editor once this ships.
 *
 * ── SELECTOR ────────────────────────────────────────────────────────────────
 * By `city_slug = 'columbus'`, NEVER by `id`, serial or array index — ids differ
 * per environment (Brief 146 lesson). Note the column name is `city_slug`, not
 * `slug`: that trap has already cost this project twice (Brief 144's dead
 * canonical resolver, Brief 147 Track D's missing sitemap lastmod).
 *
 * ── SAFETY ──────────────────────────────────────────────────────────────────
 * SAFE BY DEFAULT: dry run unless invoked with `commit` (scripts/lib/run-mode.ts
 *   refuses to guess in CI, so a pipeline step with no flag exits non-zero
 *   instead of silently no-op'ing — the Brief 146/147 lesson).
 * SANITIZER-ASSERTED: the three prose values are run through the real
 *   `sanitizeCmsHtml` (the same allow-list the CMS write path applies) and the
 *   output must be byte-identical to the input, or the script stops without
 *   writing. Brief 157 Q9 measured this as lossless; this asserts it.
 * META-ASSERTED: `COLUMBUS.meta` must still equal `staticCityMeta('columbus')`,
 *   so seeding `meta_title`/`meta_description` cannot change what the page
 *   already renders.
 * BACKUP-FIRST: the pre-state (row JSON, or an explicit "no row" marker) is
 *   written to `brief158_row_backup` plus a JSON file before any write.
 * FILL-GAPS ONLY: an existing non-empty column is NEVER overwritten. Marketing-
 *   authored CMS content is authoritative.
 * IDEMPOTENT: three outcomes, each logged — APPLIED (row created),
 *   ALREADY-APPLIED (nothing left to do), FILLED-GAPS (only empty columns set).
 * SINGLE ROW: every statement names the slug `columbus`. No other city can be
 *   touched, and no `city_service_pages` row is created (that is Brief 158's
 *   explicitly rejected Option B2 — it would rewrite 45 live pages).
 *
 *   # preview (no writes):
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/seed-columbus-city-page.ts
 *   # apply:
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/seed-columbus-city-page.ts commit
 *
 * `-r tsconfig-paths/register` is REQUIRED — this script imports from `src/`,
 * which resolves `@/…` path aliases. Do not drop it when copying the line.
 */
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';
import { resolveRunMode, announceMode, verdict } from './lib/run-mode';
import { COLUMBUS } from '@/lib/content/cities/columbus';
import { staticCityMeta } from '@/lib/content/cities';
import { sanitizeCmsHtml } from '@/lib/cms/sanitize';

const env = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
const get = (k: string) => {
  if (process.env[k]) return process.env[k] as string;
  const m = env.match(new RegExp('^' + k + '=(.*)$', 'm'));
  return m ? m[1].trim() : '';
};
const pool = new Pool({
  connectionString: get('DATABASE_URL') || 'postgresql://postgres:jbp@localhost:5432/jbp_cms',
});

const SCRIPT = 'seed-columbus-city-page';
const CITY_SLUG = 'columbus';
const CREATED_BY = 'brief-158-seed';
const mode = resolveRunMode(SCRIPT);

class StopAndReport extends Error {}
function stop(msg: string): never {
  throw new StopAndReport(msg);
}

/**
 * The target row, derived ENTIRELY from the checked-in content file — never
 * pasted literals. That import is what guarantees byte-identity: a single smart
 * quote or non-breaking space typed by hand would show up as a live diff.
 *
 * `hero_image` is left NULL so `resolveHeroImage()` keeps resolving exactly as
 * it does today (the file sets no `heroImage`); `content_heading` is `''`
 * because it is a confirmed dead column on this template (Brief 94 §3 item 3 /
 * Brief 157 Q9) — it means "Why heading" on local-office only.
 */
type TargetColumn =
  | 'hero_callout'
  | 'content_body'
  | 'f2_heading'
  | 'f2_body'
  | 'meta_title'
  | 'meta_description';

const TARGET: Record<TargetColumn, string> = {
  hero_callout: COLUMBUS.callout ?? '',
  content_body: COLUMBUS.coveredBody ?? '',
  f2_heading: COLUMBUS.manplumberHeading ?? '',
  f2_body: COLUMBUS.manplumberBody ?? '',
  meta_title: COLUMBUS.meta?.title ?? '',
  meta_description: COLUMBUS.meta?.description ?? '',
};

/** The three values that pass through `sanitizeCmsHtml` on the CMS write path. */
const PROSE_COLUMNS: TargetColumn[] = ['hero_callout', 'content_body', 'f2_body'];

const TARGET_COLUMNS = Object.keys(TARGET) as TargetColumn[];

interface ExistingRow {
  id: number;
  version: number;
  city_type: string | null;
  template_type: string | null;
  hero_heading_line1: string | null;
  hero_callout: string | null;
  content_body: string | null;
  f2_heading: string | null;
  f2_body: string | null;
  meta_title: string | null;
  meta_description: string | null;
}

function isEmpty(v: string | null | undefined): boolean {
  return (v ?? '').trim() === '';
}

/** Preflight assertions — abort BEFORE opening a transaction if any fails. */
function preflight(): void {
  // 1. The content file must still be wired to this slug.
  if (COLUMBUS.slug !== CITY_SLUG) {
    stop(`columbus.ts declares slug "${COLUMBUS.slug}", expected "${CITY_SLUG}". Refusing to seed a row under a slug the content file does not claim.`);
  }

  // 2. Every value must be non-empty — an empty seed would be a silent no-op
  //    dressed up as a fix (the Brief 146 failure shape).
  for (const col of TARGET_COLUMNS) {
    if (isEmpty(TARGET[col])) {
      stop(`columbus.ts supplies nothing for "${col}". Seeding an empty column would leave the editor blank next to a page full of copy — refusing.`);
    }
  }

  // 3. The sanitizer must be lossless on this exact copy. It runs on the CMS
  //    write path AND on the render path, so a lossy pass would mean the first
  //    save in the admin silently degrades copy that is live today.
  for (const col of PROSE_COLUMNS) {
    const before = TARGET[col];
    const after = sanitizeCmsHtml(before);
    if (after !== before) {
      stop(
        `sanitizeCmsHtml() is NOT lossless on ${col} (${before.length} chars in, ${after.length} out). ` +
          `Brief 157 Q9 measured it as byte-identical; something in the allow-list or the copy has changed. ` +
          `Seeding now would put a value in the DB that differs from what the page renders.`
      );
    }
    console.log(`  sanitizer ok  ${col.padEnd(16)} ${before.length} chars in, ${after.length} out — byte-identical`);
  }

  // 4. The meta must still equal what the page renders today, so seeding
  //    meta_title/meta_description cannot move the <title> or the description.
  const staticMeta = staticCityMeta(CITY_SLUG);
  if (!staticMeta) {
    stop(`staticCityMeta("${CITY_SLUG}") returned null — the city is not in CITY_REGISTRY. Refusing to seed a row for an unregistered slug.`);
  }
  if (staticMeta.title !== TARGET.meta_title) {
    stop(`meta_title mismatch: columbus.ts has "${TARGET.meta_title}", staticCityMeta() renders "${staticMeta.title}". Seeding would change the live <title>.`);
  }
  if (staticMeta.description !== TARGET.meta_description) {
    stop(`meta_description mismatch: columbus.ts and staticCityMeta() disagree. Seeding would change the live meta description.`);
  }
  console.log(`  meta ok       matches staticCityMeta("${CITY_SLUG}") exactly (title + description)`);
}

async function main() {
  const client = await pool.connect();
  try {
    announceMode(SCRIPT, mode);

    const tableExists = await client.query(
      `SELECT 1 FROM information_schema.tables WHERE table_name = 'city_pages'`
    );
    if (!tableExists.rowCount) {
      stop('city_pages table does not exist — run ensure-schema.ts first.');
    }

    console.log('preflight:');
    preflight();
    console.log('');

    const existingRes = await client.query<ExistingRow>(
      `SELECT id, version, city_type, template_type, hero_heading_line1,
              hero_callout, content_body, f2_heading, f2_body,
              meta_title, meta_description
         FROM city_pages
        WHERE city_slug = $1`,
      [CITY_SLUG]
    );
    const existing = existingRes.rows[0] ?? null;

    // ── Case 1: no row ────────────────────────────────────────────────────────
    if (!existing) {
      console.log(`pre-state: NO city_pages row for "${CITY_SLUG}" (this is the expected state — Brief 157 Q2).`);
      console.log('proposed INSERT (coverage-area):');
      console.log(`  city_slug           = ${JSON.stringify(CITY_SLUG)}`);
      console.log(`  city_type           = "coverage-area"`);
      console.log(`  template_type       = "coverage-area"`);
      console.log(`  hero_heading_line1  = ""            <- deliberately EMPTY; keeps <h1>Columbus Plumber</h1>`);
      console.log(`  hero_image          = NULL          <- resolveHeroImage() keeps resolving as today`);
      console.log(`  content_heading     = ""            <- dead column on this template`);
      console.log(`  faqs                = []            <- preserves the WATER_TESTING_FAQS fallback`);
      for (const col of TARGET_COLUMNS) {
        const v = TARGET[col];
        const preview = v.replace(/\s+/g, ' ').trim();
        console.log(`  ${col.padEnd(19)} = ${v.length} chars :: ${preview.slice(0, 90)}${preview.length > 90 ? '…' : ''}`);
      }

      if (mode !== 'commit') {
        console.log('\nwould INSERT the row above. No changes were written. Re-run with `commit` to apply.');
        verdict(SCRIPT, 'NOT-APPLIED (dry run)');
        return;
      }

      await ensureBackupTable(client);
      await client.query('BEGIN');
      try {
        await client.query(
          `INSERT INTO brief158_row_backup (source_table, city_slug, reason, row_json)
           VALUES ('city_pages', $1, $2, $3::jsonb)`,
          [CITY_SLUG, 'pre-state before creating the Columbus city_pages row (Brief 158, Track A)', JSON.stringify(null)]
        );
        const ins = await client.query(
          `INSERT INTO city_pages
             (city_slug, city_type, template_type,
              hero_heading_line1, hero_heading_line2, hero_description, hero_callout, hero_image,
              content_heading, content_body, f2_heading, f2_body, faqs,
              meta_title, meta_description,
              created_by, created_at, updated_at, version)
           VALUES ($1, 'coverage-area', 'coverage-area',
                   '', NULL, '', $2, NULL,
                   '', $3, $4, $5, '[]'::jsonb,
                   $6, $7,
                   $8, NOW(), NOW(), 0)
           ON CONFLICT (city_slug) DO NOTHING`,
          [
            CITY_SLUG,
            TARGET.hero_callout,
            TARGET.content_body,
            TARGET.f2_heading,
            TARGET.f2_body,
            TARGET.meta_title,
            TARGET.meta_description,
            CREATED_BY,
          ]
        );
        if (ins.rowCount !== 1) {
          // ON CONFLICT DO NOTHING fired — a row appeared between the SELECT and
          // the INSERT. Roll back rather than guess which state is authoritative.
          throw new Error(
            `expected to insert 1 row, inserted ${ins.rowCount}. A city_pages row for "${CITY_SLUG}" appeared mid-run — re-run the script.`
          );
        }
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      }

      await verifyAndLog(client, 'insert', null);
      verdict(SCRIPT, 'APPLIED', 'created the columbus city_pages row, pre-filled from columbus.ts');
      return;
    }

    // ── Cases 2 & 3: a row exists ─────────────────────────────────────────────
    console.log(`pre-state: city_pages row EXISTS for "${CITY_SLUG}" — id=${existing.id}, version=${existing.version}, city_type=${existing.city_type}, template_type=${existing.template_type}.`);

    // The H1 column gets its own rule: never touched, but loudly reported when it
    // holds anything other than the expected empty string.
    if (!isEmpty(existing.hero_heading_line1)) {
      console.log('');
      console.log('!'.repeat(72));
      console.log(`HERO HEADING IS NOT EMPTY: hero_heading_line1 = ${JSON.stringify(existing.hero_heading_line1)}`);
      console.log('');
      console.log('This column overrides the page H1: `/columbus` is rendering');
      console.log(`  <h1>${existing.hero_heading_line1}</h1>`);
      console.log('instead of the default <h1>Columbus Plumber</h1>. That is a probable');
      console.log('live-H1 defect on an indexed page — most likely someone typed a City');
      console.log('Name into the admin "Create New Page" modal, which writes it here.');
      console.log('');
      console.log('This script will NOT change it: overwriting a value a human typed is');
      console.log('not this script\'s call. Marketing decides — clear the "Hero Heading —');
      console.log('Line 1" field in /admin/city/columbus to restore the default H1.');
      console.log('!'.repeat(72));
      console.log('');
    } else {
      console.log(`  hero_heading_line1 is empty — correct; the H1 stays "Columbus Plumber".`);
    }

    const gaps = TARGET_COLUMNS.filter((col) => isEmpty(existing[col]));
    const kept = TARGET_COLUMNS.filter((col) => !isEmpty(existing[col]));
    for (const col of kept) {
      console.log(`  = ${col.padEnd(19)} already non-empty (${(existing[col] ?? '').length} chars) — LEFT UNTOUCHED`);
    }

    if (gaps.length === 0) {
      console.log('\nnothing to fill — every column this brief seeds already holds content.');
      verdict(SCRIPT, 'ALREADY-APPLIED', 'columbus city_pages row already present and populated');
      return;
    }

    for (const col of gaps) {
      const preview = TARGET[col].replace(/\s+/g, ' ').trim();
      console.log(`  + ${col.padEnd(19)} EMPTY → ${TARGET[col].length} chars :: ${preview.slice(0, 90)}${preview.length > 90 ? '…' : ''}`);
    }

    if (mode !== 'commit') {
      console.log(`\nwould fill ${gaps.length} empty column(s): ${gaps.join(', ')}. No changes were written. Re-run with \`commit\` to apply.`);
      verdict(SCRIPT, 'NOT-APPLIED (dry run)');
      return;
    }

    await ensureBackupTable(client);
    await client.query('BEGIN');
    try {
      await client.query(
        `INSERT INTO brief158_row_backup (source_table, city_slug, reason, row_json)
         VALUES ('city_pages', $1, $2, $3::jsonb)`,
        [
          CITY_SLUG,
          `pre-state before filling ${gaps.join(', ')} on the Columbus city_pages row (Brief 158, Track A)`,
          JSON.stringify(existing),
        ]
      );

      // One UPDATE per gap column, each re-asserting emptiness in the WHERE
      // clause so a concurrent write cannot be clobbered.
      for (const col of gaps) {
        const upd = await client.query(
          `UPDATE city_pages
              SET ${col} = $2, updated_at = NOW()
            WHERE city_slug = $1 AND coalesce(${col}, '') = ''`,
          [CITY_SLUG, TARGET[col]]
        );
        if (upd.rowCount !== 1) {
          throw new Error(`expected to fill 1 row for column "${col}", updated ${upd.rowCount} — the column stopped being empty mid-run. Re-run the script.`);
        }
      }
      // One version bump for the whole fill, matching the optimistic-lock
      // contract (`updateCityCmsContent` bumps once per save).
      await client.query(
        `UPDATE city_pages SET version = version + 1 WHERE city_slug = $1`,
        [CITY_SLUG]
      );
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    }

    await verifyAndLog(client, 'fill-gaps', existing, gaps);
    verdict(SCRIPT, 'APPLIED', `FILLED-GAPS: ${gaps.join(', ')}`);
  } finally {
    client.release();
    await pool.end();
  }
}

async function ensureBackupTable(client: import('pg').PoolClient) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS brief158_row_backup (
      id            SERIAL PRIMARY KEY,
      source_table  TEXT NOT NULL,
      city_slug     TEXT NOT NULL,
      reason        TEXT NOT NULL,
      row_json      JSONB,
      backed_up_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
}

/** Re-read the row, assert the invariants that protect the live page, log a file. */
async function verifyAndLog(
  client: import('pg').PoolClient,
  action: 'insert' | 'fill-gaps',
  before: ExistingRow | null,
  gaps: TargetColumn[] = TARGET_COLUMNS
) {
  const after = (
    await client.query<ExistingRow>(
      `SELECT id, version, city_type, template_type, hero_heading_line1,
              hero_callout, content_body, f2_heading, f2_body,
              meta_title, meta_description
         FROM city_pages
        WHERE city_slug = $1`,
      [CITY_SLUG]
    )
  ).rows[0];

  if (!after) throw new Error('verify failed: no city_pages row for columbus after the write.');
  if (after.template_type !== 'coverage-area') {
    throw new Error(`verify failed: template_type is "${after.template_type}", expected "coverage-area".`);
  }
  // The single live-appearance invariant. An INSERT must leave the H1 column
  // empty; a fill-gaps run must not have moved whatever was there.
  if (action === 'insert' && !isEmpty(after.hero_heading_line1)) {
    throw new Error(
      `verify failed: hero_heading_line1 is ${JSON.stringify(after.hero_heading_line1)}, expected "". This would rewrite the live H1.`
    );
  }
  if (action === 'fill-gaps' && (after.hero_heading_line1 ?? '') !== (before?.hero_heading_line1 ?? '')) {
    throw new Error('verify failed: hero_heading_line1 changed during a fill-gaps run. It must never be touched.');
  }
  for (const col of gaps) {
    if (after[col] !== TARGET[col]) {
      throw new Error(`verify failed: ${col} does not match the value from columbus.ts after the write.`);
    }
  }
  // Nothing this brief does may create a city_service_pages row (rejected B2).
  const cs = await client.query<{ c: string }>(
    `SELECT count(*)::text AS c FROM city_service_pages WHERE city_slug = $1`,
    [CITY_SLUG]
  );
  console.log(`verify: row id=${after.id} version=${after.version} template_type=${after.template_type}, hero_heading_line1=${JSON.stringify(after.hero_heading_line1)}, ${gaps.length} column(s) match columbus.ts.`);
  console.log(`verify: city_service_pages rows for "${CITY_SLUG}" = ${cs.rows[0].c} (this script never creates any).`);

  const dir = join(process.cwd(), 'scripts', 'backups');
  mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = join(dir, `brief-158-seed-columbus-city-page-${mode}-${stamp}.json`);
  writeFileSync(
    file,
    JSON.stringify({ mode, action, generated: stamp, columnsWritten: gaps, before, after }, null, 2)
  );
  console.log(`log: ${file}`);
}

main().catch((e) => {
  if (e instanceof StopAndReport) {
    console.log('\n' + '!'.repeat(72));
    console.log('BRIEF 158 TRACK A — STOPPED, NOTHING WRITTEN');
    console.log(e.message);
    console.log('This is a data/content condition that needs a human decision, not a deploy failure.');
    console.log('!'.repeat(72) + '\n');
    verdict(SCRIPT, 'NOT-APPLIED (guard tripped)', e.message.split('.')[0]);
    return; // exit 0 — same convention as the Brief 145/146/150/154 fix scripts
  }
  console.error('FAILED:', e);
  process.exitCode = 1;
});
