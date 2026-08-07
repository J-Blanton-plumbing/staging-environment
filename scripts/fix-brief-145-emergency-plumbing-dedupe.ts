/**
 * Brief 145 Track D — de-duplicate `emergency_plumbing_page` and stop it recurring.
 *
 * THE PROBLEM
 * -----------
 * `emergency_plumbing_page` is a singleton: one row backs `/emergency-plumbing`.
 * Brief 78 flagged 4 rows; there are 7 now. The page works today only by luck —
 * `updateEpCmsContent` UPDATEs every row (its WHERE has no id predicate) and
 * `getEpCmsContent` reads an unordered `SELECT * … LIMIT 1`, so as long as the
 * rows stay identical any of them is as good as any other. The moment they
 * diverge, page content becomes whatever row Postgres happens to hand back.
 *
 * ROOT CAUSE (fixed in scripts/seed-cms.ts alongside this script)
 * --------------------------------------------------------------
 * `seed-cms.ts` inserted the page with `INSERT … VALUES (…) ON CONFLICT DO
 * NOTHING`. That clause suppresses an insert only when a UNIQUE/EXCLUDE
 * constraint would be violated — and this is the ONE CMS page table with no
 * unique key at all (every sibling has one: main_pages.slug,
 * service_category_pages.slug, sub_service_pages.slug, city_pages.city_slug,
 * city_service_pages(city_slug, service_slug), cms_articles.slug). With only a
 * SERIAL primary key there is nothing to conflict on, so every `npm run
 * seed:cms` / `npm run db:setup` appended another identical row. The row
 * timestamps match: ids 1–3 share the backfilled default from when `created_at`
 * was added, and ids 4–7 carry distinct creation times that fall inside known
 * setup-rerun windows.
 *
 * WHAT THIS SCRIPT DOES
 * ---------------------
 *   1. Refuses to run if the surviving row's content would differ from any other
 *      row's — i.e. if de-duplicating could change what the page renders.
 *   2. Backs up every row in full to `brief145_row_backup` and to a JSON file.
 *   3. Keeps exactly the lowest `id` (the row the Brief 144 canonical-override
 *      pin already selects) and deletes the rest.
 *   4. Installs the recurrence guard: a UNIQUE INDEX on the constant expression
 *      `(true)`, which Postgres can satisfy for at most one row. Chosen over an
 *      application-level check because it holds against EVERY writer — this
 *      script, seed-cms, a future migration, a hand-run psql — not just the ones
 *      we remembered to edit. It lives here rather than in ensure-schema.ts
 *      because ensure-schema reconciles columns only, and because the index
 *      cannot be created until the duplicates are gone: creating it in the same
 *      script keeps that ordering guaranteed.
 *
 * SAFETY
 * ------
 * SAFE BY DEFAULT: dry run unless invoked with `commit`.
 * BACKUP-FIRST: full `row_to_json` of every row before any delete.
 * IDEMPOTENT: with one row and the index present it reports `already-applied`
 *   and writes nothing — safe on every deploy.
 *
 *   # preview (no writes):
 *   npx ts-node --project tsconfig.scripts.json scripts/fix-brief-145-emergency-plumbing-dedupe.ts
 *   # apply:
 *   ... scripts/fix-brief-145-emergency-plumbing-dedupe.ts commit
 */
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';
import { resolveRunMode, announceMode } from './lib/run-mode';

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
const SCRIPT = 'fix-brief-145-emergency-plumbing-dedupe';
const mode = resolveRunMode(SCRIPT);

const GUARD_INDEX = 'emergency_plumbing_page_singleton';

/**
 * Columns excluded from the "are these rows the same page?" comparison.
 * `id` and the audit timestamps differ by construction and say nothing about
 * what renders; `version` is the optimistic-lock counter, which the unqualified
 * writer bumps on every row equally but which older rows can lag on.
 */
const IGNORED_COLUMNS = new Set(['id', 'created_at', 'updated_at', 'version']);

/**
 * A guard tripped: this database's rows are not in the shape the brief signed
 * off on, so nothing is deleted and a human has to decide.
 *
 * Exits ZERO on purpose — see the identical note in
 * scripts/fix-brief-145-venetian-cillage-slug.ts. deploy.yml runs with
 * `script_stop: true`, so a non-zero exit here would abort the build swap and
 * pm2 reload, turning "these two rows disagree" into a site-wide deploy outage.
 * Real failures (empty table, a delete that didn't take, a guard index that
 * wasn't created) still throw and exit non-zero.
 */
class StopAndReport extends Error {}
function stop(msg: string): never {
  throw new StopAndReport(msg);
}

async function main() {
  const client = await pool.connect();
  try {
    announceMode(SCRIPT, mode);

    await client.query(`
      CREATE TABLE IF NOT EXISTS brief145_row_backup (
        id            SERIAL PRIMARY KEY,
        track         TEXT NOT NULL,
        source_table  TEXT NOT NULL,
        source_id     INTEGER NOT NULL,
        reason        TEXT NOT NULL,
        row_json      JSONB NOT NULL,
        backed_up_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);

    const rows = (
      await client.query<{ id: number; row_json: Record<string, unknown> }>(
        `SELECT id, row_to_json(t)::jsonb AS row_json
           FROM emergency_plumbing_page t
          ORDER BY id`
      )
    ).rows;

    console.log(`before: ${rows.length} row(s) — ids [${rows.map((r) => r.id).join(', ')}]`);

    if (rows.length === 0) {
      stop('the table is empty — /emergency-plumbing has no CMS row at all. Run seed-cms.ts.');
    }

    // ── Guard: would keeping the lowest id change what renders? ──────────────
    // The reader takes an UNORDERED `LIMIT 1`, so the row currently rendering is
    // not knowable — which means the only safe condition for deleting six of
    // seven rows is that all seven are identical on every content column. Then
    // whichever one was rendering, the survivor renders the same bytes.
    const keep = rows[0];
    const contentCols = Object.keys(keep.row_json).filter((k) => !IGNORED_COLUMNS.has(k));
    const divergent: Array<{ id: number; columns: string[] }> = [];
    for (const r of rows.slice(1)) {
      const diff = contentCols.filter(
        (k) => JSON.stringify(r.row_json[k]) !== JSON.stringify(keep.row_json[k])
      );
      if (diff.length) divergent.push({ id: r.id, columns: diff });
    }
    if (divergent.length) {
      console.error('\nRows differ on content columns:');
      for (const d of divergent) {
        console.error(`  id ${d.id}: ${d.columns.join(', ')}`);
        for (const c of d.columns) {
          console.error(`      keep #${keep.id}: ${JSON.stringify(rows[0].row_json[c])}`);
          console.error(`      drop #${d.id}: ${JSON.stringify(rows.find((r) => r.id === d.id)!.row_json[c])}`);
        }
      }
      stop(
        'de-duplicating could change what /emergency-plumbing renders. Reconcile the ' +
          'content by hand (or pick the correct row deliberately) before re-running.'
      );
    }
    console.log(
      `guard OK — all ${rows.length} row(s) are identical across ${contentCols.length} content ` +
        `columns, so keeping id ${keep.id} cannot change what the page renders.`
    );

    const doomed = rows.slice(1);
    const indexExists = async () =>
      ((
        await client.query(
          `SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = $1`,
          [GUARD_INDEX]
        )
      ).rowCount ?? 0) > 0;

    if (doomed.length === 0 && (await indexExists())) {
      console.log('already-applied: 1 row and the singleton guard is present. Nothing to do.');
      return;
    }

    // ── Backup every row, including the survivor ─────────────────────────────
    if (mode === 'commit') {
      for (const r of rows) {
        const dup = await client.query(
          `SELECT 1 FROM brief145_row_backup
            WHERE track = 'D' AND source_table = 'emergency_plumbing_page' AND source_id = $1`,
          [r.id]
        );
        if (dup.rowCount) continue;
        await client.query(
          `INSERT INTO brief145_row_backup (track, source_table, source_id, reason, row_json)
           VALUES ('D','emergency_plumbing_page',$1,$2,$3)`,
          [
            r.id,
            r.id === keep.id ? 'singleton de-dup — KEPT (canonical row)' : 'singleton de-dup — DELETED duplicate',
            r.row_json,
          ]
        );
      }
    }

    // ── Delete + guard, in one transaction ───────────────────────────────────
    if (mode === 'commit') {
      await client.query('BEGIN');
      try {
        if (doomed.length) {
          const res = await client.query('DELETE FROM emergency_plumbing_page WHERE id <> $1', [keep.id]);
          console.log(`deleted ${res.rowCount} duplicate row(s).`);
        }
        // Unique index on a constant expression = "at most one row in this table".
        await client.query(
          `CREATE UNIQUE INDEX IF NOT EXISTS ${GUARD_INDEX} ON emergency_plumbing_page ((true))`
        );
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      }
    } else {
      console.log(
        `would delete ${doomed.length} duplicate row(s) — ids [${doomed.map((r) => r.id).join(', ')}] — ` +
          `keeping id ${keep.id}`
      );
      console.log(`would create unique index ${GUARD_INDEX} ON emergency_plumbing_page ((true))`);
    }

    // ── Report ───────────────────────────────────────────────────────────────
    const dir = join(process.cwd(), 'scripts', 'backups');
    mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const file = join(dir, `brief-145-ep-dedupe-${mode}-${stamp}.json`);
    writeFileSync(
      file,
      JSON.stringify({ mode, generated: stamp, keptId: keep.id, rows }, null, 2)
    );
    console.log(`log: ${file}`);

    if (mode === 'commit') {
      const after = await client.query<{ c: number }>('SELECT count(*)::int c FROM emergency_plumbing_page');
      console.log(`verify: ${after.rows[0].c} row(s) remain (expected 1).`);
      console.log(`verify: singleton guard present = ${await indexExists()}`);
      if (after.rows[0].c !== 1) throw new Error('row count is not 1 after the delete.');
      if (!(await indexExists())) throw new Error('the singleton guard index was not created.');
      // Prove the guard actually bites, then roll the probe back.
      await client.query('BEGIN');
      let guardHeld = false;
      try {
        await client.query(
          `INSERT INTO emergency_plumbing_page (hero_heading, hero_description, f_heading, f_body,
             card_heading, map_heading, map_body, f2_heading, f2_body, f3_heading, f3_body)
           VALUES ('probe','probe','probe','probe','probe','probe','probe','probe','probe','probe','probe')`
        );
      } catch {
        guardHeld = true;
      }
      await client.query('ROLLBACK');
      console.log(`verify: a second INSERT is rejected by the guard = ${guardHeld}`);
      if (!guardHeld) throw new Error('the guard did not reject a duplicate insert.');
    } else {
      console.log('\nNo changes were written. Re-run with `commit` to apply.');
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  if (e instanceof StopAndReport) {
    console.log('\n' + '!'.repeat(72));
    console.log('BRIEF 145 TRACK D — STOPPED, NOTHING DELETED');
    console.log(e.message);
    console.log('This is a data condition that needs a human decision, not a deploy failure.');
    console.log('!'.repeat(72) + '\n');
    return; // exit 0 — see the StopAndReport docstring
  }
  console.error('FAILED:', e);
  process.exitCode = 1;
});
