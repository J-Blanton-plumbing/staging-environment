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
 *   • The `/gas-lines-chicago` → `/gas-lines` redirect must still be present in
 *     next.config.mjs. Without it the URL could serve, and deleting the row would
 *     turn a live page into a 404.
 *   • The row's content must match the `gas-lines` row — either as it is now, or
 *     as it was before the Track A content port (the pre-port snapshot in
 *     `brief146_row_backup`). If someone has typed unique content into this row
 *     since Brief 145 audited it, the script stops and reports the differing
 *     columns rather than destroying it.
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
      if (candidates.length === 0) {
        stop(`no "${CANONICAL_SLUG}" row to compare against — refusing to delete blind.`);
      }

      const diffs = candidates.map((c) => ({ label: c.label, cols: diffColumns(doomed.row_json, c.row) }));
      const match = diffs.find((d) => d.cols.length === 0);
      if (!match) {
        console.error(`\n"${DOOMED_SLUG}" holds content that matches neither comparison:`);
        for (const d of diffs) {
          console.error(`  vs ${d.label}: differs on ${d.cols.join(', ')}`);
          for (const col of d.cols) {
            const other = candidates.find((c) => c.label === d.label)!.row;
            console.error(`      ${DOOMED_SLUG}: ${JSON.stringify(doomed.row_json[col])?.slice(0, 160)}`);
            console.error(`      ${d.label}: ${JSON.stringify(other[col])?.slice(0, 160)}`);
          }
        }
        stop(
          'this row may hold unique content someone typed in. It can never render (the URL ' +
            '301s away), but deleting it would destroy that copy — decide by hand first.'
        );
      }
      console.log(`guard OK — identical to the ${match.label} on every content column.`);
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
    return; // exit 0 — see the StopAndReport docstring
  }
  console.error('FAILED:', e);
  process.exitCode = 1;
});
