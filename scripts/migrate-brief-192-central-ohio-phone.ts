/**
 * Brief 192 (Track A) — the Central Ohio phone in Global Settings.
 *
 *   global_settings.central_ohio_phone_display TEXT NULL
 *   global_settings.central_ohio_phone_href    TEXT NULL
 *
 * Blank (NULL or '') means "use the main phone". Article V2 reads it for an
 * article whose office is in Central Ohio (offices.ts `officeRegion`).
 *
 * ── SHIPPING ORDER ──────────────────────────────────────────────────────────
 * Runs from scripts/deploy.sh BEFORE the build swap: ADDITIVE ONLY. Two nullable
 * columns; the old code never reads them. Also in ensure-schema.ts.
 *
 * ── THE SEED: FILL-GAPS, AND ONCE ───────────────────────────────────────────
 * Marketing's value is 614-547-6516 (Brief 192, decision 1). It is written only
 * when BOTH columns are still empty, and only on the first run: the run is
 * recorded in `brief192_applied`, so if Marketing later CLEARS the field on
 * purpose ("use the main phone" is a real choice), no deploy ever refills it
 * (the Brief 188 lesson). An editor's value is never overwritten.
 *
 * ── CONTENT STATE NEVER FAILS A DEPLOY (Brief 186) ──────────────────────────
 * A missing global_settings row, a value already set, or an earlier run are all
 * reported and exit 0. Non-zero ONLY for a schema/SQL fault (a column missing or
 * of the wrong type afterwards, or an ALTER that errors).
 *
 * Applies by default; `commit` is accepted (deploy.sh passes it); `--dry-run`
 * runs everything in a transaction and rolls it back.
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/migrate-brief-192-central-ohio-phone.ts commit
 */
import { existsSync, readFileSync } from 'fs';
import { Pool } from 'pg';
import { verdict } from './lib/run-mode';

const SCRIPT = 'migrate-brief-192-central-ohio-phone';
const DRY = process.argv.slice(2).some((a) => ['dry', '--dry', 'dry-run', '--dry-run'].includes(a));

/** Marketing, 2026-09-25 (Brief 192 decision 1). */
const SEED_DISPLAY = '614-547-6516';
const SEED_HREF = 'tel:614-547-6516';
const SEED_KEY = 'central-ohio-phone-seed';

const env = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
const get = (k: string) =>
  process.env[k] || (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim() || '';
const pool = new Pool({ connectionString: get('DATABASE_URL') || 'postgresql://postgres:jbp@localhost:5432/jbp_cms' });

const COLUMNS = ['central_ohio_phone_display', 'central_ohio_phone_href'];

async function main() {
  console.log(`MODE: ${DRY ? 'DRY RUN (transaction rolled back at the end)' : 'APPLY'}\n`);
  const c = await pool.connect();
  let committed = false;
  try {
    await c.query('BEGIN');
    const typesOf = async () =>
      new Map(
        (await c.query<{ column_name: string; data_type: string }>(
          `SELECT column_name, data_type FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'global_settings' AND column_name = ANY($1)`,
          [COLUMNS]
        )).rows.map((r) => [r.column_name, r.data_type])
      );
    const before = await typesOf();
    for (const col of COLUMNS) await c.query(`ALTER TABLE global_settings ADD COLUMN IF NOT EXISTS ${col} TEXT`);
    await c.query(`CREATE TABLE IF NOT EXISTS brief192_applied (
      key TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), detail JSONB NOT NULL DEFAULT '{}'::jsonb)`);
    const after = await typesOf();
    console.log('── Schema ──');
    for (const col of COLUMNS) {
      if (after.get(col) !== 'text') throw new Error(`global_settings.${col} is ${after.get(col) ?? 'missing'} after the migration (expected text)`);
      console.log(`  ${before.has(col) ? '=' : '+'} global_settings.${col} (text)`);
    }
    const added = COLUMNS.filter((col) => !before.has(col));

    // ── Seed: once, and only into empty fields ──
    console.log('\n── Central Ohio phone seed ──');
    let seed = 'already done on an earlier run';
    const done = ((await c.query(`SELECT 1 FROM brief192_applied WHERE key = $1`, [SEED_KEY])).rowCount ?? 0) > 0;
    if (!done) {
      const row = (await c.query<{ d: string | null; h: string | null }>(
        `SELECT central_ohio_phone_display AS d, central_ohio_phone_href AS h FROM global_settings WHERE id = 1`
      )).rows[0];
      if (!row) {
        // Content state: no settings row yet (a fresh DB). Not recorded, so a later
        // deploy seeds it once the row exists.
        seed = 'no global_settings row (id=1) — nothing seeded, will retry next deploy';
      } else if ((row.d ?? '').trim() || (row.h ?? '').trim()) {
        seed = `kept the existing value "${row.d ?? ''}" / "${row.h ?? ''}"`;
        await c.query(`INSERT INTO brief192_applied (key, detail) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [SEED_KEY, JSON.stringify({ kept: row })]);
      } else {
        await c.query(
          `UPDATE global_settings SET central_ohio_phone_display = $1, central_ohio_phone_href = $2
            WHERE id = 1 AND coalesce(central_ohio_phone_display, '') = '' AND coalesce(central_ohio_phone_href, '') = ''`,
          [SEED_DISPLAY, SEED_HREF]
        );
        seed = `set to ${SEED_DISPLAY} / ${SEED_HREF}`;
        await c.query(`INSERT INTO brief192_applied (key, detail) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [SEED_KEY, JSON.stringify({ set: SEED_DISPLAY })]);
      }
    }
    console.log(`  ${seed}`);
    const current = (await c.query<{ d: string | null }>(`SELECT central_ohio_phone_display AS d FROM global_settings WHERE id = 1`)).rows[0];
    console.log(`  i current value: ${current ? JSON.stringify(current.d) : '(no row)'}`);

    const changed = added.length > 0 || seed.startsWith('set to');
    if (DRY) {
      await c.query('ROLLBACK');
      console.log('\n  (dry run — rolled back)');
      verdict(SCRIPT, 'NOT-APPLIED (dry run)', changed ? 'changes previewed' : 'nothing to do');
      return;
    }
    await c.query('COMMIT');
    committed = true;
    verdict(SCRIPT, changed ? 'APPLIED' : 'ALREADY-APPLIED',
      `${added.length ? `added ${added.join(', ')}; ` : ''}seed: ${seed}`);
  } catch (err) {
    if (!committed) await c.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    c.release();
  }
}

main()
  .catch((err) => {
    console.error(err);
    verdict(SCRIPT, 'FAILED', err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  })
  .finally(() => pool.end());
