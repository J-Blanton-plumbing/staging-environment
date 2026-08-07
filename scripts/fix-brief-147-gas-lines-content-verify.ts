/**
 * Brief 147 (Track A, step 3) — verify the live `gas-lines` row against the
 * Brief 146 approved copy and fill ONLY what is missing.
 *
 * ── WHY ─────────────────────────────────────────────────────────────────────
 * The Brief 146 content port did not reach staging: `/gas-lines` went live with no
 * copy on it and marketing re-typed the approved text by hand on 2026-08-08. Their
 * work is now the source of truth for anything they typed. But the page STILL is
 * not whole — staging's rendered `/gas-lines` shows an EMPTY Final CTA heading and
 * falls back to the default CTA photo, i.e. `cta_heading` / `cta_body` are blank.
 * That is the one section Brief 146 mapped into the Final CTA block and the one
 * section its report (§5, item 2) flagged as unverifiable from the dev machine.
 *
 * ── THE HARD RULE THIS SCRIPT OBEYS ─────────────────────────────────────────
 * NEVER overwrite copy that is already there. A field is written only when it is
 * (a) NULL / empty / whitespace, or (b) still holding the identifiable pre-146
 * junk — the scraped WordPress navigation menu ("WHY J. BLANTON / SERVICES /
 * NO DRIP CLUB …") that Brief 145 (D-4) found in `intro_body`.
 *
 * Anything else — including copy that merely differs from the brief because
 * marketing reworded it — is REPORTED and LEFT ALONE.
 *
 * IMAGE COLUMNS ARE NEVER TOUCHED. `hero_image`, `f_image` and `f3_image` are
 * asserted byte-identical after the write and the script fails loudly if they
 * moved. Marketing's uploads are the whole reason this page was moved onto the CMS.
 *
 * ── BLOCKS ──────────────────────────────────────────────────────────────────
 * `blocks` is authoritative for the render when present, so the named columns are
 * not enough on their own. For each block type this script has copy for it patches
 * the FIRST instance's own empty/junk text keys — same rule, per key. And unlike
 * the Brief 146 script, if a type has NO instance at all it INSERTS one in the
 * canonical position, because approved copy sitting in a column that nothing reads
 * is exactly the failure this brief exists to close. Image keys, `style`,
 * `button`, related-articles config and every duplicate instance are untouched.
 *
 * ── SAFETY ──────────────────────────────────────────────────────────────────
 * Dry run unless invoked with `commit` (and, in the pipeline, it refuses to run at
 * all without an explicit choice — see scripts/lib/run-mode.ts).
 * Backup-first: full `row_to_json` into `brief147_row_backup` + a JSON file.
 * IDEMPOTENT AND SAFE ON EVERY DEPLOY: it is a fill-the-gaps pass, not a one-time
 * port, so it must NOT use an applied-marker. Once every field holds copy it
 * reports `nothing to fill` and writes nothing, forever.
 *
 *   # preview (no writes):
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/fix-brief-147-gas-lines-content-verify.ts
 *   # apply:
 *   ... scripts/fix-brief-147-gas-lines-content-verify.ts commit
 */
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';
import { sanitizeCmsHtml } from '@/lib/cms/sanitize';
import { SUB_SERVICE_BLOCK_ORDER, newBlockId } from '@/lib/cms/sub-service-blocks';
import { resolveRunMode, announceMode, verdict } from './lib/run-mode';

const env = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
const get = (k: string) => {
  if (process.env[k]) return process.env[k] as string;
  const m = env.match(new RegExp('^' + k + '=(.*)$', 'm'));
  return m ? m[1].trim() : '';
};
const pool = new Pool({
  connectionString: get('DATABASE_URL') || 'postgresql://postgres:jbp@localhost:5432/jbp_cms',
});

const SCRIPT = 'fix-brief-147-gas-lines-content-verify';
const mode = resolveRunMode(SCRIPT);
const SLUG = 'gas-lines';

// ── APPROVED COPY — Brief 146 Track A, verbatim. Do not reword or re-case. ────
// Kept as its own copy rather than imported from the Brief 146 script: that script
// is a one-time port with an applied-marker, and importing it would execute its
// module-level `resolveRunMode`.
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

// Brief 146 "Section 2" → the Final CTA block. This is the section that is empty
// on staging today, and the reason this script exists.
const CTA_HEADING = 'Reliable Gas Lines Plumbing in the Chicagoland Area';
const CTA_BODY = [
  "Our team of gas line plumbers at J. Blanton offers quick and reliable plumbing service for all types of gas and natural gas-fueled water systems in the Chicagoland area. We've been in the industry for over 30 years, having consistently provided quality work to homeowners.",
  'Our transparent pricing and detailed estimates, top-notch workmanship, and excellent customer service have guaranteed satisfaction. Contact us today to ensure home safety.',
  "Don't compromise on your home's safety. Get in touch with us now, and our gas line plumbers will promptly address any issues, providing you with peace of mind.",
].join('\n\n');

const INTRO_BODY_CLEAN = sanitizeCmsHtml(INTRO_BODY);
const CTA_BODY_CLEAN = sanitizeCmsHtml(CTA_BODY);

/** Every column this script may fill, with the block type + data key it mirrors. */
interface Target {
  column: string;
  blockType: string;
  dataKey: string;
  value: unknown;
}
const TARGETS: Target[] = [
  { column: 'hero_heading', blockType: 'hero', dataKey: 'heroHeading', value: HERO_HEADING },
  { column: 'hero_intro', blockType: 'hero', dataKey: 'heroIntro', value: HERO_INTRO },
  { column: 'intro_heading', blockType: 'intro', dataKey: 'introHeading', value: INTRO_HEADING },
  { column: 'intro_body', blockType: 'intro', dataKey: 'introBody', value: INTRO_BODY_CLEAN },
  { column: 'problems_heading', blockType: 'listSection', dataKey: 'problemsHeading', value: PROBLEMS_HEADING },
  { column: 'problems_items', blockType: 'listSection', dataKey: 'problemsItems', value: PROBLEMS_ITEMS },
  { column: 'cta_heading', blockType: 'finalCta', dataKey: 'ctaHeading', value: CTA_HEADING },
  { column: 'cta_body', blockType: 'finalCta', dataKey: 'ctaBody', value: CTA_BODY_CLEAN },
];

/** Columns this script must never write, and asserts it did not. */
const IMAGE_COLUMNS = ['hero_image', 'f_image', 'f3_image'];

/**
 * The pre-Brief-146 junk: scraped WordPress navigation-menu text. Brief 145 (D-4)
 * found it in `intro_body`; matched loosely so a partially-scraped variant of the
 * same menu is still recognised as junk rather than as somebody's copy.
 */
function isPre146Junk(v: unknown): boolean {
  if (typeof v !== 'string') return false;
  const flat = v.replace(/\s+/g, ' ').toUpperCase();
  const menuWords = [
    'WHY J. BLANTON',
    'NO DRIP CLUB',
    'KNOWLEDGE HUB',
    'CUSTOMER STORIES',
    'SERVICE AREAS',
  ];
  const hits = menuWords.filter((w) => flat.includes(w)).length;
  // Two or more nav labels AND no run of prose. The scraped menu is all-caps, so a
  // 4+ letter lowercase run means somebody wrote a sentence — leave it alone.
  // (Testing for sentence punctuation instead does not work: "J. Blanton" has a
  // period in it, so every variant of this menu looked like prose.)
  return hits >= 2 && !/[a-z]{4,}/.test(v);
}

/** Is this value empty, or pre-146 junk — i.e. safe to fill? */
function isFillable(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string') return v.trim() === '' || isPre146Junk(v);
  if (Array.isArray(v)) return v.length === 0 || v.every((x) => typeof x === 'string' && x.trim() === '');
  return false;
}

interface BlockInstance {
  id?: string;
  type?: string;
  data?: Record<string, unknown>;
}

const trunc = (v: unknown) => {
  const s = typeof v === 'string' ? v : JSON.stringify(v);
  if (s == null) return 'NULL';
  const flat = s.replace(/\n/g, '\\n');
  return flat.length > 88 ? flat.slice(0, 88) + '…' : flat;
};

async function main() {
  const client = await pool.connect();
  try {
    announceMode(SCRIPT, mode);

    await client.query(`
      CREATE TABLE IF NOT EXISTS brief147_row_backup (
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
      `SELECT id, status, row_to_json(t)::jsonb AS row_json FROM sub_service_pages t WHERE slug = $1`,
      [SLUG]
    );
    const row = res.rows[0];
    if (!row) {
      console.log('');
      console.log('!'.repeat(72));
      console.log(`NO sub_service_pages ROW FOR "${SLUG}" — /gas-lines is 404ing right now.`);
      console.log('SubServicePageView 404s without a published row (Brief 146, decision 3).');
      console.log('This needs a human: restore the row from brief146_row_backup, or re-seed it.');
      console.log('!'.repeat(72));
      console.log('');
      verdict(SCRIPT, 'NOT-APPLIED (guard tripped)', 'no gas-lines row');
      return;
    }
    const before = row.row_json;
    console.log(`found sub_service_pages id ${row.id} (status = ${row.status ?? 'NULL'})`);
    if (row.status !== 'published') {
      console.log('');
      console.log('!'.repeat(72));
      console.log(`WARNING: status is "${row.status ?? 'NULL'}", not "published" — /gas-lines 404s.`);
      console.log('Publish it from /admin/sub-service/gas-lines.');
      console.log('!'.repeat(72));
      console.log('');
    }

    // ── Columns: decide per field ─────────────────────────────────────────────
    const fill: Target[] = [];
    console.log('\ncolumns:');
    for (const t of TARGETS) {
      const current = before[t.column];
      if (isFillable(current)) {
        fill.push(t);
        console.log(`  FILL  ${t.column}: ${trunc(current)}`);
        console.log(`          → ${trunc(t.value)}`);
      } else {
        const same = JSON.stringify(current) === JSON.stringify(t.value);
        console.log(`  keep  ${t.column}: ${same ? 'matches the approved copy' : 'differs — LEFT ALONE'}`);
        if (!same) console.log(`          live:     ${trunc(current)}`);
      }
    }

    // ── Blocks: patch empty keys on the first instance, insert a missing type ──
    const rawBlocks = before.blocks;
    const hasBlocks = Array.isArray(rawBlocks) && rawBlocks.length > 0;
    let blocks: BlockInstance[] | null = null;
    const blockNotes: string[] = [];

    if (hasBlocks) {
      const instances = [...(rawBlocks as BlockInstance[])];
      const firstOf = new Map<string, number>();
      instances.forEach((b, i) => {
        const type = typeof b?.type === 'string' ? b.type : '';
        if (type && !firstOf.has(type)) firstOf.set(type, i);
      });

      let touched = false;
      // Group the targets by block type so each instance is visited once.
      const byType = new Map<string, Target[]>();
      for (const t of TARGETS) {
        if (!byType.has(t.blockType)) byType.set(t.blockType, []);
        byType.get(t.blockType)!.push(t);
      }

      for (const [type, targets] of byType) {
        const idx = firstOf.get(type);
        if (idx === undefined) {
          // No instance of this type: the copy would have nowhere to render, which
          // is the whole defect. Insert one in its canonical position.
          const data: Record<string, unknown> = {};
          for (const t of targets) data[t.dataKey] = t.value;
          const instance: BlockInstance = { id: newBlockId(type), type, data };
          const canonical = SUB_SERVICE_BLOCK_ORDER.indexOf(type as never);
          // Insert after the last present block whose canonical position is earlier.
          let at = instances.length;
          for (let i = 0; i < instances.length; i++) {
            const p = SUB_SERVICE_BLOCK_ORDER.indexOf((instances[i].type ?? '') as never);
            if (p > canonical && p !== -1) { at = i; break; }
          }
          instances.splice(at, 0, instance);
          // Recompute first-instance indices after the splice.
          firstOf.clear();
          instances.forEach((b, i) => {
            const ty = typeof b?.type === 'string' ? b.type : '';
            if (ty && !firstOf.has(ty)) firstOf.set(ty, i);
          });
          touched = true;
          blockNotes.push(`INSERTED a "${type}" block at position ${at + 1} (none existed) with ${targets.length} field(s)`);
          continue;
        }
        const b = instances[idx];
        const data = { ...(b.data ?? {}) };
        const filled: string[] = [];
        for (const t of targets) {
          if (isFillable(data[t.dataKey])) {
            data[t.dataKey] = t.value;
            filled.push(t.dataKey);
          }
        }
        if (filled.length > 0) {
          instances[idx] = { ...b, data };
          touched = true;
          blockNotes.push(`patched "${type}" instance #${idx + 1}: filled ${filled.join(', ')}`);
        } else {
          blockNotes.push(`"${type}" instance #${idx + 1}: every field already holds copy — untouched`);
        }
      }
      blocks = touched ? instances : null;
      console.log(`\nblocks: ${(rawBlocks as unknown[]).length} instance(s) stored — blocks drive the render.`);
      for (const n of blockNotes) console.log(`  ${n}`);
    } else {
      console.log(
        '\nblocks: none stored — the reader synthesises them from the named columns, so ' +
          'writing the columns is sufficient.'
      );
    }

    console.log(
      `\nimage columns (never written): ` +
        IMAGE_COLUMNS.map((c) => `${c}=${trunc(before[c])}`).join(', ')
    );

    if (fill.length === 0 && blocks === null) {
      console.log('\nnothing to fill — every approved field already holds copy.');
      verdict(SCRIPT, 'ALREADY-APPLIED', 'no empty or pre-146 fields remain');
      return;
    }

    if (mode !== 'commit') {
      console.log(
        `\nwould fill ${fill.length} column(s)` +
          (blocks ? ` and rewrite the blocks array (${blockNotes.filter((n) => !n.includes('untouched')).length} change(s))` : '') +
          '. No changes were written. Re-run with `commit` to apply.'
      );
      verdict(SCRIPT, 'NOT-APPLIED (dry run)');
      return;
    }

    // ── Backup, then write, in one transaction ────────────────────────────────
    await client.query('BEGIN');
    try {
      await client.query(
        `INSERT INTO brief147_row_backup (track, source_table, source_id, slug, reason, row_json)
         VALUES ('A','sub_service_pages',$1,$2,$3,$4)`,
        [row.id, SLUG, 'pre-Brief-147 gas-lines gap fill (empty/pre-146 fields only)', before]
      );

      // Build the UPDATE from only the fields that are actually being filled, so a
      // column that already holds copy is not even mentioned in the statement.
      const sets: string[] = [];
      const params: unknown[] = [SLUG];
      for (const t of fill) {
        const cast = t.column === 'problems_items' ? '::jsonb' : '';
        params.push(t.column === 'problems_items' ? JSON.stringify(t.value) : t.value);
        sets.push(`${t.column} = $${params.length}${cast}`);
      }
      if (blocks) {
        params.push(JSON.stringify(blocks));
        sets.push(`blocks = $${params.length}::jsonb`);
      }
      sets.push('version = version + 1', 'updated_at = NOW()');
      const upd = await client.query(
        `UPDATE sub_service_pages SET ${sets.join(', ')} WHERE slug = $1`,
        params
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

    for (const t of fill) {
      if (JSON.stringify(after[t.column]) !== JSON.stringify(t.value)) {
        throw new Error(`verify failed: ${t.column} did not take.`);
      }
    }
    for (const col of IMAGE_COLUMNS) {
      if (JSON.stringify(after[col]) !== JSON.stringify(before[col])) {
        throw new Error(`verify failed: image column ${col} was modified — it must never be.`);
      }
    }
    // Nothing that already held copy may have moved.
    for (const t of TARGETS) {
      if (fill.includes(t)) continue;
      if (JSON.stringify(after[t.column]) !== JSON.stringify(before[t.column])) {
        throw new Error(`verify failed: ${t.column} changed, but it was supposed to be left alone.`);
      }
    }
    console.log(
      `\nverify: ${fill.length} column(s) filled; ${TARGETS.length - fill.length} left alone; ` +
        `${IMAGE_COLUMNS.length} image columns unchanged.`
    );

    const dir = join(process.cwd(), 'scripts', 'backups');
    mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const file = join(dir, `brief-147-gas-lines-verify-${mode}-${stamp}.json`);
    writeFileSync(
      file,
      JSON.stringify(
        { mode, generated: stamp, slug: SLUG, filled: fill.map((f) => f.column), blockNotes, before, after },
        null,
        2
      )
    );
    console.log(`log: ${file}`);
    verdict(
      SCRIPT,
      'APPLIED',
      `filled [${fill.map((f) => f.column).join(', ') || 'no columns'}]${blocks ? '; blocks rewritten' : ''}`
    );
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error('FAILED:', e);
  verdict(SCRIPT, 'FAILED', e instanceof Error ? e.message.split('\n')[0] : String(e));
  process.exitCode = 1;
});
