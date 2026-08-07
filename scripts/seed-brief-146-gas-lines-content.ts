/**
 * Brief 146 (Track A) — port the APPROVED Gas Lines copy into `sub_service_pages`
 * slug `gas-lines` (id 26 on dev).
 *
 * ── WHY ─────────────────────────────────────────────────────────────────────
 * Brief 145 (finding D-3) found `/gas-lines` renders 100% static content while
 * its `sub_service_pages` row sits editable in the CMS and is never read. Track B
 * of this brief repoints the route at `SubServicePageView` so the row finally
 * drives the page — but finding D-4 warned that the row is NOT fit to render as
 * it stands: `intro_body` holds scraped WordPress navigation-menu text
 * ("WHY J. BLANTON / SERVICES / NO DRIP CLUB …") and the hero intro, problems and
 * CTA fields are empty. Repointing onto that row would visibly degrade the page.
 *
 * This script lands the marketing-approved copy (supplied verbatim in Brief 146,
 * Track A, 2026-08-07) first, so the route swap is a no-degradation change.
 *
 * ── WHAT IT WRITES (and what it deliberately does NOT) ──────────────────────
 * TEXT ONLY. The columns written are hero_heading, hero_intro, intro_heading,
 * intro_body, problems_heading, problems_items, cta_heading, cta_body.
 *
 * It NEVER touches hero_image, f_image or f3_image. That is a hard rule of the
 * brief: marketing has already uploaded the correct images through the CMS admin
 * on staging, and this whole brief exists so those uploads finally render. Nor
 * does it touch title/meta_title/meta_description (no approved SEO copy was
 * supplied, and the row's suffix-free meta_title is exactly what fixes the
 * doubled <title> — Track C), status, parent_slug, ndc_* or canonical_url.
 *
 * ── FIELD MAPPING ───────────────────────────────────────────────────────────
 * The brief's "Section 2" (heading + 3 paragraphs) has no dedicated column on
 * this table — `sub_service_pages` carries no secondary/preventive section, and
 * `subServiceToServiceContent` maps only hero / intro / list / NDC / final-CTA.
 * It is therefore stored in the FINAL CTA block (cta_heading + cta_body), which
 * is where the healthy reference rows (kitchen-plumbing, basement-flooding) carry
 * their closing pitch. That block also renders the "MAKE A GOOD CALL" phone
 * button, which suits copy that ends "Get in touch with us now". The Final CTA
 * block renders unconditionally on a DB-backed page, so leaving it empty would
 * have shipped a blank section — this fills it with approved copy instead.
 *
 * Body copy is stored as PLAIN TEXT with a blank line between paragraphs, not as
 * `<p>` markup. `renderCmsInline` flattens block markup to inline (`</p>` → a
 * single `<br>`), so `<p>` paragraphs would render run-together with one line
 * break; plain text with blank lines renders `<br><br>` and keeps the paragraph
 * separation the page has today. It still routes through the shared Brief 73
 * sanitizer on write, exactly like the admin save path.
 *
 * ── BLOCKS ──────────────────────────────────────────────────────────────────
 * If the row has a non-empty `blocks` JSONB (the editor writes one on every save,
 * so staging may well have one even though dev does not), `blocks` is the source
 * of truth for the render — writing the named columns alone would change nothing
 * on the front end. So each block instance's own text keys are patched in place:
 * FIRST instance per type, image keys and every other key (style, button,
 * relatedArticles config, extra duplicate instances) left untouched.
 *
 * ── SAFETY ──────────────────────────────────────────────────────────────────
 * SAFE BY DEFAULT: dry run unless invoked with `commit`.
 * BACKUP-FIRST: full `row_to_json` into `brief146_row_backup` plus a JSON file.
 * ONE-TIME: the backup row IS the applied-marker. Once it exists the script
 *   reports `already-applied` and writes nothing — so a later editor change to
 *   this copy is never re-clobbered by a subsequent deploy.
 *
 *   # preview (no writes):
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/seed-brief-146-gas-lines-content.ts
 *   # apply:
 *   ... scripts/seed-brief-146-gas-lines-content.ts commit
 */
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';
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

const mode = process.argv[2] === 'commit' ? 'commit' : 'dry';
const SLUG = 'gas-lines';

// ── APPROVED COPY — Brief 146 Track A, verbatim. Do not reword or re-case. ────
const HERO_HEADING = 'Gas Line Services in Chicagoland Plumber';
const HERO_INTRO =
  "When there's a gas line issue, fast and reliable service isn't optional. Our licensed techs arrive prepared, diagnose the problem, and fix it right the first time.";

const INTRO_HEADING = 'Gas Lines';
const INTRO_BODY = [
  "Chicagoland's Premier Gas Line Plumbing Solution — 30+ Years of Expertise, 5-Star Service, Same-Day Availability.",
  "While natural gas line plumbing offers numerous benefits, occasional service needs can arise. If you're in search of a gas leak plumber near you, you've found the right team. J. Blanton's certified plumbers are not only qualified but also equipped with the expertise to repair and maintain your gas line system. Your home's safety is paramount, and addressing any plumbing-related risks should be a top priority. That's why we prioritize your home's comfort and satisfaction above all else!",
  'Trust J. Blanton Plumbing to ensure your gas line plumbing runs smoothly and safely. Contact us today to schedule your service appointment.',
].join('\n\n');

const PROBLEMS_HEADING = 'Signs of Gas Line Issues';
const PROBLEMS_ITEMS = [
  'Smell of sulfur or rotten egg odor near appliances or gas lines',
  'Hissing or whistling sound coming from gas pipes',
  'Dead or discolored vegetation above buried gas lines',
  'Pilot lights that go out repeatedly',
  'Unexplained spike in gas bills',
];

// Brief "Section 2" → the Final CTA block (see FIELD MAPPING above).
const CTA_HEADING = 'Reliable Gas Lines Plumbing in the Chicagoland Area';
const CTA_BODY = [
  "Our team of gas line plumbers at J. Blanton offers quick and reliable plumbing service for all types of gas and natural gas-fueled water systems in the Chicagoland area. We've been in the industry for over 30 years, having consistently provided quality work to homeowners.",
  'Our transparent pricing and detailed estimates, top-notch workmanship, and excellent customer service have guaranteed satisfaction. Contact us today to ensure home safety.',
  "Don't compromise on your home's safety. Get in touch with us now, and our gas line plumbers will promptly address any issues, providing you with peace of mind.",
].join('\n\n');

/** Rich-text fields go through the SAME sanitizer the admin save path uses. */
const INTRO_BODY_CLEAN = sanitizeCmsHtml(INTRO_BODY);
const CTA_BODY_CLEAN = sanitizeCmsHtml(CTA_BODY);

/** Per-block-type text keys to patch when the row carries a `blocks` array. */
const BLOCK_PATCH: Record<string, Record<string, unknown>> = {
  hero: { heroHeading: HERO_HEADING, heroIntro: HERO_INTRO },
  intro: { introHeading: INTRO_HEADING, introBody: INTRO_BODY_CLEAN },
  listSection: { problemsHeading: PROBLEMS_HEADING, problemsItems: PROBLEMS_ITEMS },
  finalCta: { ctaHeading: CTA_HEADING, ctaBody: CTA_BODY_CLEAN },
};

/**
 * A guard tripped: the database is not in the shape the brief signed off on, so
 * nothing is written and a human has to decide.
 *
 * Exits ZERO on purpose — deploy.yml runs with `script_stop: true`, so a non-zero
 * exit here would abort the build swap and pm2 reload, turning a content question
 * into a site-wide outage. Genuine failures (unreachable DB, a write that didn't
 * take) still throw and exit non-zero. Read the deploy log: silence is not proof.
 */
class StopAndReport extends Error {}
function stop(msg: string): never {
  throw new StopAndReport(msg);
}

interface BlockInstance {
  id?: string;
  type?: string;
  data?: Record<string, unknown>;
}

async function main() {
  const client = await pool.connect();
  try {
    console.log(
      mode === 'commit'
        ? 'MODE: COMMIT (writing changes)\n'
        : 'MODE: DRY RUN (no writes — pass "commit" to apply)\n'
    );

    await client.query(`
      CREATE TABLE IF NOT EXISTS brief146_row_backup (
        id            SERIAL PRIMARY KEY,
        track         TEXT NOT NULL,
        source_table  TEXT NOT NULL,
        source_id     INTEGER NOT NULL,
        slug          TEXT NOT NULL,
        reason        TEXT NOT NULL,
        row_json      JSONB NOT NULL,
        backed_up_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);

    const res = await client.query<{ id: number; status: string | null; row_json: Record<string, unknown> }>(
      `SELECT id, status, row_to_json(t)::jsonb AS row_json
         FROM sub_service_pages t
        WHERE slug = $1`,
      [SLUG]
    );
    const row = res.rows[0];
    if (!row) {
      stop(
        `no sub_service_pages row with slug "${SLUG}". Track B repoints /gas-lines at ` +
          'that row, so without it the page 404s. Restore/seed the row before deploying.'
      );
    }
    console.log(`found sub_service_pages id ${row.id} (status = ${row.status ?? 'NULL'})`);
    if (row.status !== 'published') {
      // Not fatal — but the route 404s in this state once Track B is live.
      console.log('');
      console.log('!'.repeat(72));
      console.log(`WARNING: the row's status is "${row.status ?? 'NULL'}", not "published".`);
      console.log('SubServicePageView 404s on an unpublished row, so /gas-lines will 404.');
      console.log('Publish it from /admin/sub-service/gas-lines.');
      console.log('!'.repeat(72));
      console.log('');
    }

    // ── Applied-marker: the backup row. One-time by design. ───────────────────
    const applied = await client.query(
      `SELECT 1 FROM brief146_row_backup
        WHERE track = 'A' AND source_table = 'sub_service_pages' AND slug = $1`,
      [SLUG]
    );
    if (applied.rowCount) {
      console.log(
        'already-applied: the approved copy was ported on an earlier run (a backup row ' +
          'exists). Nothing written — later CMS edits to this copy are never re-clobbered.'
      );
      return;
    }

    // ── Patch `blocks` in place when the row carries one ──────────────────────
    const rawBlocks = row.row_json.blocks;
    const hasBlocks = Array.isArray(rawBlocks) && rawBlocks.length > 0;
    let blocks: BlockInstance[] | null = null;
    if (hasBlocks) {
      const seen = new Set<string>();
      blocks = (rawBlocks as BlockInstance[]).map((b) => {
        const type = typeof b?.type === 'string' ? b.type : '';
        const patch = BLOCK_PATCH[type];
        if (!patch || seen.has(type)) return b; // first instance per type only
        seen.add(type);
        return { ...b, data: { ...(b.data ?? {}), ...patch } };
      });
      const missing = Object.keys(BLOCK_PATCH).filter((t) => !seen.has(t));
      console.log(
        `blocks: ${(rawBlocks as unknown[]).length} instance(s); patched first instance of ` +
          `[${[...seen].join(', ')}]`
      );
      if (missing.length) {
        console.log('');
        console.log('!'.repeat(72));
        console.log(`WARNING: no block instance of type(s) [${missing.join(', ')}] on this page,`);
        console.log('so the approved copy for those sections has nowhere to render. The named');
        console.log('columns were still written. Add the block(s) in /admin/sub-service/gas-lines.');
        console.log('!'.repeat(72));
        console.log('');
      }
    } else {
      console.log(
        'blocks: none stored — the reader synthesises them from the named columns, so ' +
          'writing the columns is sufficient.'
      );
    }

    // ── Report what changes ───────────────────────────────────────────────────
    const before = row.row_json;
    const targets: Array<[string, unknown]> = [
      ['hero_heading', HERO_HEADING],
      ['hero_intro', HERO_INTRO],
      ['intro_heading', INTRO_HEADING],
      ['intro_body', INTRO_BODY_CLEAN],
      ['problems_heading', PROBLEMS_HEADING],
      ['problems_items', PROBLEMS_ITEMS],
      ['cta_heading', CTA_HEADING],
      ['cta_body', CTA_BODY_CLEAN],
    ];
    const trunc = (v: unknown) => {
      const s = typeof v === 'string' ? v : JSON.stringify(v);
      return s == null ? 'NULL' : s.length > 90 ? s.slice(0, 90).replace(/\n/g, '\\n') + '…' : s.replace(/\n/g, '\\n');
    };
    console.log('\nfield changes:');
    for (const [col, val] of targets) {
      const same = JSON.stringify(before[col] ?? null) === JSON.stringify(val);
      console.log(`  ${same ? '=' : '→'} ${col}: ${trunc(before[col])}`);
      if (!same) console.log(`      becomes: ${trunc(val)}`);
    }
    console.log(
      `\nimage columns left untouched: hero_image=${trunc(before.hero_image)}, ` +
        `f_image=${trunc(before.f_image)}, f3_image=${trunc(before.f3_image)}`
    );

    if (mode !== 'commit') {
      console.log('\nNo changes were written. Re-run with `commit` to apply.');
      return;
    }

    // ── Backup, then write, in one transaction ────────────────────────────────
    await client.query('BEGIN');
    try {
      await client.query(
        `INSERT INTO brief146_row_backup (track, source_table, source_id, slug, reason, row_json)
         VALUES ('A','sub_service_pages',$1,$2,$3,$4)`,
        [row.id, SLUG, 'pre-Brief-146 content port (approved copy)', row.row_json]
      );
      const upd = await client.query(
        `UPDATE sub_service_pages SET
           hero_heading     = $2,
           hero_intro       = $3,
           intro_heading    = $4,
           intro_body       = $5,
           problems_heading = $6,
           problems_items   = $7::jsonb,
           cta_heading      = $8,
           cta_body         = $9,
           blocks           = COALESCE($10::jsonb, blocks),
           version          = version + 1,
           updated_at       = NOW()
         WHERE slug = $1`,
        [
          SLUG,
          HERO_HEADING,
          HERO_INTRO,
          INTRO_HEADING,
          INTRO_BODY_CLEAN,
          PROBLEMS_HEADING,
          JSON.stringify(PROBLEMS_ITEMS),
          CTA_HEADING,
          CTA_BODY_CLEAN,
          blocks ? JSON.stringify(blocks) : null,
        ]
      );
      if (upd.rowCount !== 1) throw new Error(`expected to update 1 row, updated ${upd.rowCount}.`);
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    }

    // ── Verify ────────────────────────────────────────────────────────────────
    const after = (
      await client.query<{ row_json: Record<string, unknown> }>(
        `SELECT row_to_json(t)::jsonb AS row_json FROM sub_service_pages t WHERE slug = $1`,
        [SLUG]
      )
    ).rows[0].row_json;
    for (const [col, val] of targets) {
      if (JSON.stringify(after[col]) !== JSON.stringify(val)) {
        throw new Error(`verify failed: ${col} did not take.`);
      }
    }
    for (const col of ['hero_image', 'f_image', 'f3_image']) {
      if (JSON.stringify(after[col]) !== JSON.stringify(before[col])) {
        throw new Error(`verify failed: image column ${col} was modified — it must never be.`);
      }
    }
    console.log('\nverify: all 8 text fields applied; 3 image columns unchanged.');

    const dir = join(process.cwd(), 'scripts', 'backups');
    mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const file = join(dir, `brief-146-gas-lines-content-${mode}-${stamp}.json`);
    writeFileSync(file, JSON.stringify({ mode, generated: stamp, slug: SLUG, before, after }, null, 2));
    console.log(`log: ${file}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  if (e instanceof StopAndReport) {
    console.log('\n' + '!'.repeat(72));
    console.log('BRIEF 146 TRACK A — STOPPED, NOTHING WRITTEN');
    console.log(e.message);
    console.log('This is a data condition that needs a human decision, not a deploy failure.');
    console.log('!'.repeat(72) + '\n');
    return; // exit 0 — see the StopAndReport docstring
  }
  console.error('FAILED:', e);
  process.exitCode = 1;
});
