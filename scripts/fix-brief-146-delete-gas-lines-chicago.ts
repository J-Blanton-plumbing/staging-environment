/**
 * Brief 146 (Track D) — delete the phantom `sub_service_pages` row
 * `gas-lines-chicago` (id 48 on dev).
 *
 * ── WHY ─────────────────────────────────────────────────────────────────────
 * Brief 145 (finding D-5) verified this row is byte-identical to the `gas-lines`
 * row on every content column — only `id`, `slug` and the timestamps differ. It
 * was created 2026-07-22, inside the same setup-rerun window that produced the
 * `emergency_plumbing_page` duplicates. Its URL `/gas-lines-chicago` 301s to
 * `/gas-lines` in `next.config.mjs` (Brief 54), so NOTHING set on it can ever
 * render; its only effect is a phantom fourth "Gas Lines" page in the admin list.
 * Marketing approved deletion on 2026-08-07.
 *
 * ── WHAT IT DELETES ─────────────────────────────────────────────────────────
 *   1. The `sub_service_pages` row itself.
 *   2. Any `page_drafts` rows for (page_type 'sub-service', slug
 *      'gas-lines-chicago') — dev has one, an auto "Version 1" holding the same
 *      scraped nav-menu text. With the row gone these are unreachable from the
 *      admin, and publishing one would throw ("No sub_service_pages row found").
 *      Both are backed up in full first.
 *
 * `page_changelog` rows are deliberately KEPT: they are an audit trail, not
 * content, and the same reasoning was applied in Brief 145.
 *
 * ── GUARDS ──────────────────────────────────────────────────────────────────
 *   • THE ONLY BLOCKING GUARD: the `/gas-lines-chicago` → `/gas-lines` redirect
 *     must still be present in next.config.mjs. Without it the URL could serve,
 *     and deleting the row would turn a live page into a 404.
 *   • The content comparison against the `gas-lines` row is REPORT-ONLY (Brief
 *     147). It used to block. See the note below.
 *
 * ── WHY THE CONTENT GUARD NO LONGER BLOCKS (Brief 147, 2026-08-07) ──────────
 * It blocked on staging, and correctly by its own logic: marketing uploaded images
 * to the live `gas-lines` row, so this row no longer matched it on `hero_image` /
 * `f_image`, and the script refused to delete — leaving the phantom row in the
 * admin list through the whole Brief 146 release (staging showed 23 sub-service
 * rows, not the 22 the Brief 146 report claimed).
 *
 * The marketing lead's call, 2026-08-07: "As long as the slug /gas-lines-chicago is
 * redirecting to /gas-lines we can delete it. We only need the redirect." That is
 * the right call and it is what the guard was really protecting: content on this
 * row can NEVER render, because the URL 301s away before anything reads the row.
 * There is no copy to lose — only a duplicate admin entry to lose. Verified live
 * the same day: `/gas-lines-chicago` → 301 → `/gas-lines`, which 200s.
 *
 * So the comparison still runs and still PRINTS every differing column and both
 * values, and the full row still goes into `brief146_row_backup` before the delete
 * — the audit trail is unchanged, and the row is restorable. It simply no longer
 * stops the deletion. If the redirect ever goes, the FIRST guard stops everything.
 *
 * ── SAFETY ──────────────────────────────────────────────────────────────────
 * SAFE BY DEFAULT: dry run unless invoked with `commit`.
 * BACKUP-FIRST: full `row_to_json` into `brief146_row_backup` + a JSON file.
 * IDEMPOTENT: with the row already gone it reports `already-applied` and writes
 *   nothing — safe on every deploy.
 *
 *   # preview (no writes):
 *   npx ts-node --project tsconfig.scripts.json scripts/fix-brief-146-delete-gas-lines-chicago.ts
 *   # apply:
 *   ... scripts/fix-brief-146-delete-gas-lines-chicago.ts commit
 */
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';
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

// Brief 147 (Track A): one shared rule for apply-vs-preview. Still dry-run by
// default at a terminal — but a PIPELINE run (JBP_PIPELINE/CI set) with no
// explicit `commit` or `--dry-run` now exits NON-ZERO instead of quietly
// previewing and letting the deploy report success. That silent-no-op path is
// how the Brief 146 content port shipped an empty page. See scripts/lib/run-mode.ts.
const SCRIPT = 'fix-brief-146-delete-gas-lines-chicago';
const mode = resolveRunMode(SCRIPT);

const DOOMED_SLUG = 'gas-lines-chicago';
const CANONICAL_SLUG = 'gas-lines';

/** Columns that differ by construction and say nothing about what the page holds. */
const IGNORED_COLUMNS = new Set([
  'id',
  'slug',
  'created_at',
  'updated_at',
  'created_by',
  'updated_by',
  'version',
]);

/** See the identical note in scripts/fix-brief-145-emergency-plumbing-dedupe.ts. */
class StopAndReport extends Error {}
function stop(msg: string): never {
  throw new StopAndReport(msg);
}

/** The Brief 54 redirect must still exist, or this URL could serve. */
function redirectStillPresent(): boolean {
  const cfg = join(process.cwd(), 'next.config.mjs');
  if (!existsSync(cfg)) return false;
  const src = readFileSync(cfg, 'utf8');
  return /source:\s*'\/gas-lines-chicago'[\s\S]{0,120}?destination:\s*'\/gas-lines'/.test(src);
}

function diffColumns(a: Record<string, unknown>, b: Record<string, unknown>): string[] {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].filter(
    (k) => !IGNORED_COLUMNS.has(k) && JSON.stringify(a[k]) !== JSON.stringify(b[k])
  );
}

async function main() {
  const client = await pool.connect();
  try {
    announceMode(SCRIPT, mode);

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

    const doomed = (
      await client.query<{ id: number; row_json: Record<string, unknown> }>(
        `SELECT id, row_to_json(t)::jsonb AS row_json FROM sub_service_pages t WHERE slug = $1`,
        [DOOMED_SLUG]
      )
    ).rows[0];

    if (!doomed) {
      console.log(`already-applied: no sub_service_pages row with slug "${DOOMED_SLUG}".`);
      // Sweep any drafts left behind by an earlier partial run, then stop.
      const leftover = await client.query<{ id: number }>(
        `SELECT id FROM page_drafts WHERE page_slug = $1`,
        [DOOMED_SLUG]
      );
      if (leftover.rowCount) {
        console.log(`note: ${leftover.rowCount} orphan page_drafts row(s) remain — see below.`);
      } else {
        verdict(SCRIPT, 'ALREADY-APPLIED', 'the phantom row and its drafts are gone');
        return;
      }
    }

    // ── Guard 1: the URL must still be redirected away ────────────────────────
    if (!redirectStillPresent()) {
      stop(
        `the /${DOOMED_SLUG} → /${CANONICAL_SLUG} 301 is no longer in next.config.mjs. ` +
          'Deleting the row while that URL can serve would turn a live page into a 404.'
      );
    }
    console.log(`guard OK — /${DOOMED_SLUG} still 301s to /${CANONICAL_SLUG} (next.config.mjs).`);

    // ── Guard 2: no unique content ────────────────────────────────────────────
    if (doomed) {
      const canonical = (
        await client.query<{ row_json: Record<string, unknown> }>(
          `SELECT row_to_json(t)::jsonb AS row_json FROM sub_service_pages t WHERE slug = $1`,
          [CANONICAL_SLUG]
        )
      ).rows[0];
      const prePort = (
        await client.query<{ row_json: Record<string, unknown> }>(
          `SELECT row_json FROM brief146_row_backup
            WHERE track = 'A' AND source_table = 'sub_service_pages' AND slug = $1
            ORDER BY id LIMIT 1`,
          [CANONICAL_SLUG]
        )
      ).rows[0];

      const candidates: Array<{ label: string; row: Record<string, unknown> }> = [];
      if (canonical) candidates.push({ label: `current ${CANONICAL_SLUG} row`, row: canonical.row_json });
      if (prePort) candidates.push({ label: `pre-Track-A ${CANONICAL_SLUG} snapshot`, row: prePort.row_json });

      // Brief 147: no longer a reason to stop. Nothing to compare against just means
      // nothing to compare against — the delete is authorised by the redirect
      // (guard 1) and covered by the backup below, not by this comparison.
      const diffs = candidates.map((c) => ({ label: c.label, cols: diffColumns(doomed.row_json, c.row) }));
      const match = diffs.find((d) => d.cols.length === 0);
      if (!match) {
        // REPORT ONLY as of Brief 147 — this used to `stop()`. See the header note:
        // marketing's image uploads on the live row made this comparison fail on
        // staging, and the marketing lead's decision is that the redirect is the only
        // condition. Print everything, then continue to the backup + delete.
        console.log('');
        console.log('!'.repeat(72));
        console.log(`NOTE: "${DOOMED_SLUG}" does not match the ${CANONICAL_SLUG} row exactly:`);
        for (const d of diffs) {
          console.log(`  vs ${d.label}: differs on ${d.cols.join(', ')}`);
          for (const col of d.cols) {
            const other = candidates.find((c) => c.label === d.label)!.row;
            console.log(`      ${DOOMED_SLUG}: ${JSON.stringify(doomed.row_json[col])?.slice(0, 160)}`);
            console.log(`      ${d.label}: ${JSON.stringify(other[col])?.slice(0, 160)}`);
          }
        }
        if (candidates.length === 0) {
          console.log(`  (no "${CANONICAL_SLUG}" row or snapshot exists to compare against)`);
        }
        console.log('');
        console.log('Deleting anyway — approved by the marketing lead 2026-08-07: the URL 301s to');
        console.log(`/${CANONICAL_SLUG}, so nothing on this row can ever render and there is no copy`);
        console.log('to lose. The full row is backed up to brief146_row_backup below.');
        console.log('!'.repeat(72));
        console.log('');
      } else {
        console.log(`content check — identical to the ${match.label} on every content column.`);
      }
    }

    // ── Orphan drafts ─────────────────────────────────────────────────────────
    const drafts = (
      await client.query<{ id: number; row_json: Record<string, unknown> }>(
        `SELECT id, row_to_json(t)::jsonb AS row_json FROM page_drafts t WHERE page_slug = $1 ORDER BY id`,
        [DOOMED_SLUG]
      )
    ).rows;
    console.log(
      drafts.length
        ? `page_drafts: ${drafts.length} row(s) — ids [${drafts.map((d) => d.id).join(', ')}] — will be removed with the page.`
        : 'page_drafts: none.'
    );

    if (mode !== 'commit') {
      console.log(
        `\nwould delete sub_service_pages id ${doomed ? doomed.id : '(none)'} and ${drafts.length} draft(s).`
      );
      console.log('No changes were written. Re-run with `commit` to apply.');
      verdict(SCRIPT, 'NOT-APPLIED (dry run)');
      return;
    }

    await client.query('BEGIN');
    try {
      if (doomed) {
        await client.query(
          `INSERT INTO brief146_row_backup (track, source_table, source_id, slug, reason, row_json)
           VALUES ('D','sub_service_pages',$1,$2,$3,$4)`,
          [doomed.id, DOOMED_SLUG, 'phantom duplicate of gas-lines — DELETED (Brief 146 Track D)', doomed.row_json]
        );
      }
      for (const d of drafts) {
        await client.query(
          `INSERT INTO brief146_row_backup (track, source_table, source_id, slug, reason, row_json)
           VALUES ('D','page_drafts',$1,$2,$3,$4)`,
          [d.id, DOOMED_SLUG, 'orphan draft of the deleted phantom page — DELETED', d.row_json]
        );
      }
      if (drafts.length) {
        await client.query(`DELETE FROM page_drafts WHERE page_slug = $1`, [DOOMED_SLUG]);
      }
      if (doomed) {
        const del = await client.query(`DELETE FROM sub_service_pages WHERE slug = $1`, [DOOMED_SLUG]);
        if (del.rowCount !== 1) throw new Error(`expected to delete 1 row, deleted ${del.rowCount}.`);
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    }
    console.log(`deleted: ${doomed ? 1 : 0} sub_service_pages row + ${drafts.length} draft(s).`);

    // ── Verify ────────────────────────────────────────────────────────────────
    const gone = await client.query(`SELECT 1 FROM sub_service_pages WHERE slug = $1`, [DOOMED_SLUG]);
    if (gone.rowCount) throw new Error('the row is still present after the delete.');
    const canonicalStill = await client.query(`SELECT status FROM sub_service_pages WHERE slug = $1`, [
      CANONICAL_SLUG,
    ]);
    if (canonicalStill.rowCount !== 1) {
      throw new Error(`the "${CANONICAL_SLUG}" row is missing — /gas-lines would 404.`);
    }
    console.log(
      `verify: "${DOOMED_SLUG}" gone; "${CANONICAL_SLUG}" still present ` +
        `(status = ${canonicalStill.rows[0].status}).`
    );

    const dir = join(process.cwd(), 'scripts', 'backups');
    mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const file = join(dir, `brief-146-delete-gas-lines-chicago-${mode}-${stamp}.json`);
    writeFileSync(
      file,
      JSON.stringify({ mode, generated: stamp, deletedRow: doomed ?? null, deletedDrafts: drafts }, null, 2)
    );
    console.log(`log: ${file}`);
    verdict(SCRIPT, 'APPLIED', `${doomed ? 1 : 0} row + ${drafts.length} draft(s) deleted`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  if (e instanceof StopAndReport) {
    console.log('\n' + '!'.repeat(72));
    console.log('BRIEF 146 TRACK D — STOPPED, NOTHING DELETED');
    console.log(e.message);
    console.log('This is a data condition that needs a human decision, not a deploy failure.');
    console.log('!'.repeat(72) + '\n');
    // Brief 147 (Track A): make a non-deletion greppable in the deploy log. This
    // guard HAS tripped on staging — the phantom row is still there (23 sub-service
    // rows, not 22), because marketing's image uploads made the live `gas-lines`
    // row differ from it on the image columns. See the Brief 147 report.
    verdict(SCRIPT, 'NOT-APPLIED (guard tripped)', e.message.split('.')[0]);
    return; // exit 0 — see the StopAndReport docstring
  }
  console.error('FAILED:', e);
  process.exitCode = 1;
});
