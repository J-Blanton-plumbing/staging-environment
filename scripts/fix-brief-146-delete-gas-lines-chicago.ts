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
 * Three blocking guards, none of which any flag can switch off:
 *   1. The `/gas-lines-chicago` → `/gas-lines` redirect must still be present in
 *      next.config.mjs. Without it the URL could serve, and deleting the row
 *      would turn a live page into a 404.
 *   2. Exactly one row may carry the doomed slug, and the canonical `gas-lines`
 *      row must exist and be a different row. `gas-lines` (id 26 on dev) carries
 *      marketing's live copy and image uploads and must never be the target.
 *   3. The content comparison against the `gas-lines` row — unless the run
 *      carries the explicit marketing approval described below.
 *
 * ── THE `--approved-id` OVERRIDE (Brief 148, Track B, 2026-08-08) ───────────
 * Guard 3 blocked the Brief 146 release, and correctly by its own logic:
 * marketing uploaded images to the live `gas-lines` row, so this row no longer
 * matched it on `hero_image` / `f_image` and the script refused to delete —
 * leaving the phantom row in the admin list for the whole release (staging showed
 * 23 sub-service rows, not the 22 the Brief 146 report claimed). Brief 147
 * downgraded the guard to report-only to unstick it, which quietly removed the
 * protection for every future run as well.
 *
 * Brief 148 puts guard 3 back and answers it properly instead. The marketing lead
 * approved this specific deletion on 2026-08-08 — "as long as /gas-lines-chicago
 * redirects to /gas-lines we can delete it; we only need the redirect" — and that
 * approval now travels with the invocation, not with the source:
 *
 *     ... scripts/fix-brief-146-delete-gas-lines-chicago.ts commit --approved-id=48
 *
 * With the flag, a content mismatch is printed in full and the delete proceeds.
 * Without it, a mismatch stops the run exactly as it did before Brief 147. So the
 * general "don't delete a row that has diverged" rule is intact, and unsticking a
 * future phantom row takes a deliberate, greppable, human-approved argument.
 *
 * WHY THE ID IS A LABEL AND NOT THE SELECTOR: the row is selected by SLUG, which
 * is unique in the table. `--approved-id=48` records WHICH row marketing looked
 * at (id 48 on dev and in the Brief 145 audit). Dev and staging were seeded
 * independently, so staging's serial for the same phantom row may differ — an id
 * mismatch therefore prints a loud notice and continues rather than blocking a
 * deletion marketing has already approved. It is not a safety property: guards 1
 * and 2 are, and the DELETE is `WHERE slug = 'gas-lines-chicago'` inside a
 * transaction that rolls back unless exactly one row goes.
 *
 * ── SAFETY ──────────────────────────────────────────────────────────────────
 * SAFE BY DEFAULT: dry run unless invoked with `commit`.
 * BACKUP-FIRST: full `row_to_json` into `brief146_row_backup` + a JSON file.
 * IDEMPOTENT: with the row already gone it reports `already-applied` and writes
 *   nothing — safe on every deploy.
 *
 *   # preview (no writes):
 *   npx ts-node --project tsconfig.scripts.json scripts/fix-brief-146-delete-gas-lines-chicago.ts
 *   # apply, carrying marketing's 2026-08-08 approval:
 *   ... scripts/fix-brief-146-delete-gas-lines-chicago.ts commit --approved-id=48
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

/**
 * Brief 148 (Track B): `--approved-id=<n>` carries the marketing lead's explicit
 * 2026-08-08 approval for this deletion. Its only power is to let the content
 * comparison (guard 3) report instead of block; see the header for why the id is
 * a label rather than the selector.
 */
const APPROVED_ID: number | null = (() => {
  const arg = process.argv.slice(2).find((a) => a.startsWith('--approved-id='));
  if (!arg) return null;
  const n = Number(arg.slice('--approved-id='.length));
  if (!Number.isInteger(n) || n <= 0) {
    console.error(`\n${SCRIPT}: --approved-id must be a positive integer (got "${arg}").\n`);
    process.exit(2);
  }
  return n;
})();

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

    const doomedRows = (
      await client.query<{ id: number; row_json: Record<string, unknown> }>(
        `SELECT id, row_to_json(t)::jsonb AS row_json FROM sub_service_pages t WHERE slug = $1 ORDER BY id`,
        [DOOMED_SLUG]
      )
    ).rows;

    // Brief 148 (Track B), part of guard 2: the delete below asserts it removed
    // exactly one row and rolls back otherwise, but finding two here means the
    // table is in a state nobody has looked at — stop before the backup, not
    // after a rollback.
    if (doomedRows.length > 1) {
      stop(
        `${doomedRows.length} sub_service_pages rows carry the slug "${DOOMED_SLUG}" ` +
          `(ids ${doomedRows.map((r) => r.id).join(', ')}). This script deletes one phantom row, ` +
          'not an unexamined set. Investigate before re-running.'
      );
    }

    const doomed = doomedRows[0];

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

    // ── Guard 2: the canonical row must exist, and must not be the target ─────
    const canonicalRow = (
      await client.query<{ id: number; row_json: Record<string, unknown> }>(
        `SELECT id, row_to_json(t)::jsonb AS row_json FROM sub_service_pages t WHERE slug = $1`,
        [CANONICAL_SLUG]
      )
    ).rows[0];

    if (!canonicalRow) {
      stop(
        `there is no "${CANONICAL_SLUG}" row to redirect to. Deleting "${DOOMED_SLUG}" now ` +
          'would leave the 301 pointing at a 404.'
      );
    }
    if (doomed && doomed.id === canonicalRow.id) {
      // Impossible while the slugs differ, and cheap enough to assert anyway:
      // id 26 carries marketing's live Gas Lines copy and image uploads.
      stop(
        `the row selected for deletion IS the canonical "${CANONICAL_SLUG}" row (id ${canonicalRow.id}). ` +
          'Refusing.'
      );
    }
    console.log(
      `guard OK — canonical "${CANONICAL_SLUG}" row present (id ${canonicalRow.id})` +
        `${doomed ? `, distinct from the target (id ${doomed.id})` : ''}.`
    );

    // ── Guard 3: no unique content, unless marketing approved this deletion ───
    if (doomed) {
      if (APPROVED_ID !== null && APPROVED_ID !== doomed.id) {
        // See the header: the id is a label for WHICH row was approved, not the
        // selector. Dev and staging were seeded separately, so their serials for
        // the same phantom row differ. Say so loudly, then honour the approval.
        console.log('');
        console.log('!'.repeat(72));
        console.log(`ID MISMATCH: --approved-id=${APPROVED_ID} but the "${DOOMED_SLUG}" row here is id ${doomed.id}.`);
        console.log('The row is selected by slug (unique), not by id, and ids differ between dev');
        console.log('and staging because they were seeded independently. Continuing — the approval');
        console.log('is for the phantom gas-lines-chicago row, whatever serial it happens to hold.');
        console.log('!'.repeat(72));
        console.log('');
      }

      const prePort = (
        await client.query<{ row_json: Record<string, unknown> }>(
          `SELECT row_json FROM brief146_row_backup
            WHERE track = 'A' AND source_table = 'sub_service_pages' AND slug = $1
            ORDER BY id LIMIT 1`,
          [CANONICAL_SLUG]
        )
      ).rows[0];

      const candidates: Array<{ label: string; row: Record<string, unknown> }> = [
        { label: `current ${CANONICAL_SLUG} row`, row: canonicalRow.row_json },
      ];
      if (prePort) candidates.push({ label: `pre-Track-A ${CANONICAL_SLUG} snapshot`, row: prePort.row_json });

      const diffs = candidates.map((c) => ({ label: c.label, cols: diffColumns(doomed.row_json, c.row) }));
      const match = diffs.find((d) => d.cols.length === 0);
      if (!match) {
        // Brief 148 (Track B) restored this as a BLOCKING guard (Brief 147 had
        // made it report-only for every run, which removed the protection
        // permanently instead of answering it once). Print everything either way;
        // only an explicit --approved-id lets the run continue.
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
        console.log('!'.repeat(72));
        console.log('');

        if (APPROVED_ID === null) {
          stop(
            `"${DOOMED_SLUG}" has diverged from the "${CANONICAL_SLUG}" row (see the columns above), ` +
              'so this run cannot prove it is a content-free duplicate. If a human has looked at ' +
              'those columns and approved the deletion anyway, re-run with ' +
              `\`--approved-id=${doomed.id}\`. Marketing approved exactly this on 2026-08-08 ` +
              '(Brief 148, Track B); deploy.yml passes the flag.'
          );
        }

        console.log(
          `Deleting anyway — carrying --approved-id=${APPROVED_ID} (marketing lead, 2026-08-08).\n` +
            `The URL 301s to /${CANONICAL_SLUG}, so nothing on this row can ever render and there is\n` +
            'no copy to lose. The full row is backed up to brief146_row_backup below.\n'
        );
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
