/**
 * Brief 150 (Track D) — delete the `.gitkeep` row(s) from `cms_media`.
 *
 * ── WHY ─────────────────────────────────────────────────────────────────────
 * `scripts/migrate-brief-112-media.ts` backfills a `cms_media` row for every
 * file in public/uploads/cms/ on every deploy, and until Brief 150 it had no
 * dotfile filter — so the git placeholder `.gitkeep` was catalogued as media
 * (row #398 on the live box, per the 2026-08-10 finding). The Brief 134 S3
 * migration then repointed its URL at CloudFront, where nothing is behind it:
 * a permanently-404 "image" sitting in the admin media library. Brief 150
 * adds the dotfile filter to the backfill (the root cause) and this script
 * removes the row(s) it already created.
 *
 * ── SELECTOR ────────────────────────────────────────────────────────────────
 * By `filename = '.gitkeep'`, NOT by id — the Brief 146 lesson: serials differ
 * between environments (dev/staging were seeded independently, and the
 * post-Brief-134 deploys may have re-inserted a second row with a local URL
 * after the first row's URL was repointed to CloudFront). Every row whose
 * filename is exactly `.gitkeep` is a placeholder, whatever its id or URL, so
 * unlike a content-row delete this one may legitimately remove more than one
 * row. Id #398 is recorded here as the label of the row Marketing looked at.
 *
 * ── GUARD ───────────────────────────────────────────────────────────────────
 * Refuses (exit 0, NOT-APPLIED banner — deploy must not fail over a data
 * question) if any matched row carries editor-added metadata (alt_text or
 * caption), because that would mean a human curated it and a human should look.
 *
 * ── SAFETY ──────────────────────────────────────────────────────────────────
 * SAFE BY DEFAULT: dry run unless invoked with `commit` (pipeline runs must
 *   pass an explicit mode — scripts/lib/run-mode.ts).
 * BACKUP-FIRST: full `row_to_json` into `brief150_row_backup` + a JSON file.
 * IDEMPOTENT: with no `.gitkeep` rows left it reports `ALREADY-APPLIED` and
 *   writes nothing — safe on every deploy.
 *
 *   # preview (no writes):
 *   npx ts-node --project tsconfig.scripts.json scripts/fix-brief-150-delete-gitkeep-media-row.ts
 *   # apply:
 *   npx ts-node --project tsconfig.scripts.json scripts/fix-brief-150-delete-gitkeep-media-row.ts commit
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

const SCRIPT = 'fix-brief-150-delete-gitkeep-media-row';
const mode = resolveRunMode(SCRIPT);

const DOOMED_FILENAME = '.gitkeep';

class StopAndReport extends Error {}
function stop(msg: string): never {
  throw new StopAndReport(msg);
}

async function main() {
  const client = await pool.connect();
  try {
    announceMode(SCRIPT, mode);

    // The table is created by migrate-brief-112-media.ts, which deploy.yml
    // runs earlier in the same pipeline — but be defensive for by-hand runs
    // against a DB that never had it.
    const tableExists = await client.query(
      `SELECT 1 FROM information_schema.tables WHERE table_name = 'cms_media'`
    );
    if (!tableExists.rowCount) {
      console.log('cms_media table does not exist — nothing to delete.');
      verdict(SCRIPT, 'ALREADY-APPLIED', 'no cms_media table in this environment');
      return;
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS brief150_row_backup (
        id            SERIAL PRIMARY KEY,
        track         TEXT NOT NULL,
        source_table  TEXT NOT NULL,
        source_id     INTEGER NOT NULL,
        reason        TEXT NOT NULL,
        row_json      JSONB NOT NULL,
        backed_up_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);

    const doomed = (
      await client.query<{ id: number; url: string; alt_text: string | null; caption: string | null; row_json: Record<string, unknown> }>(
        `SELECT id, url, alt_text, caption, row_to_json(t)::jsonb AS row_json
           FROM cms_media t WHERE filename = $1 ORDER BY id`,
        [DOOMED_FILENAME]
      )
    ).rows;

    if (doomed.length === 0) {
      console.log(`already-applied: no cms_media row with filename "${DOOMED_FILENAME}".`);
      verdict(SCRIPT, 'ALREADY-APPLIED', 'no .gitkeep rows in cms_media');
      return;
    }

    console.log(`found ${doomed.length} .gitkeep row(s): ${doomed.map((r) => `id ${r.id} (${r.url})`).join(', ')}`);
    console.log('(live box row was id 398 at the 2026-08-10 finding — ids differ per environment; the selector is the filename.)');

    // ── Guard: a curated row means a human should look first ─────────────────
    const curated = doomed.filter((r) => (r.alt_text ?? '').trim() || (r.caption ?? '').trim());
    if (curated.length) {
      stop(
        `cms_media row(s) ${curated.map((r) => r.id).join(', ')} carry editor-added alt text or a caption. ` +
          'A .gitkeep row should never have been curated — investigate before deleting.'
      );
    }
    console.log('guard OK — no matched row carries editor-added metadata.');

    if (mode !== 'commit') {
      console.log(`\nwould delete ${doomed.length} cms_media row(s). No changes were written. Re-run with \`commit\` to apply.`);
      verdict(SCRIPT, 'NOT-APPLIED (dry run)');
      return;
    }

    await client.query('BEGIN');
    try {
      for (const row of doomed) {
        await client.query(
          `INSERT INTO brief150_row_backup (track, source_table, source_id, reason, row_json)
           VALUES ('D','cms_media',$1,$2,$3)`,
          [row.id, '.gitkeep placeholder catalogued as media, URL 404s — DELETED (Brief 150 Track D)', row.row_json]
        );
      }
      const del = await client.query(`DELETE FROM cms_media WHERE filename = $1`, [DOOMED_FILENAME]);
      if (del.rowCount !== doomed.length) {
        throw new Error(`expected to delete ${doomed.length} row(s), deleted ${del.rowCount}.`);
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    }
    console.log(`deleted: ${doomed.length} cms_media row(s).`);

    // ── Verify ────────────────────────────────────────────────────────────────
    const gone = await client.query(`SELECT 1 FROM cms_media WHERE filename = $1`, [DOOMED_FILENAME]);
    if (gone.rowCount) throw new Error('a .gitkeep row is still present after the delete.');
    const remaining = await client.query<{ n: string }>(`SELECT count(*)::text AS n FROM cms_media`);
    console.log(`verify: no "${DOOMED_FILENAME}" rows remain; cms_media holds ${remaining.rows[0].n} row(s).`);

    const dir = join(process.cwd(), 'scripts', 'backups');
    mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const file = join(dir, `brief-150-delete-gitkeep-media-row-${mode}-${stamp}.json`);
    writeFileSync(file, JSON.stringify({ mode, generated: stamp, deletedRows: doomed.map((r) => r.row_json) }, null, 2));
    console.log(`log: ${file}`);
    verdict(SCRIPT, 'APPLIED', `${doomed.length} .gitkeep cms_media row(s) deleted`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  if (e instanceof StopAndReport) {
    console.log('\n' + '!'.repeat(72));
    console.log('BRIEF 150 TRACK D — STOPPED, NOTHING DELETED');
    console.log(e.message);
    console.log('This is a data condition that needs a human decision, not a deploy failure.');
    console.log('!'.repeat(72) + '\n');
    verdict(SCRIPT, 'NOT-APPLIED (guard tripped)', e.message.split('.')[0]);
    return; // exit 0 — same convention as the Brief 145/146 fix scripts
  }
  console.error('FAILED:', e);
  process.exitCode = 1;
});
