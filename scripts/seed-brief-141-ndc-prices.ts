/**
 * Brief 141 (Track A) — seed the THREE No Drip Club membership prices in
 * `global_settings`.
 *
 *   ndc_price      "$29.97"  — the CLASSIC template's monthly price (pre-existing)
 *   ndc_price_1yr  "$149"    — the COMPARISON template's 1-year card   (new)
 *   ndc_price_2yr  "$229"    — the COMPARISON template's 2-year card   (new)
 *
 * All three are permanent and independent. `ndc_price` is NOT deprecated — the
 * classic template is a first-class, supported template, so this script never
 * rewrites, renames or repoints it.
 *
 * The columns themselves are created by `scripts/ensure-schema.ts`
 * (`ADD COLUMN IF NOT EXISTS`), which the deploy runs first; this script only
 * fills values.
 *
 * SAFE BY DEFAULT: dry run unless invoked with `commit`. Always writes a full
 * backup of the `global_settings` row to `scripts/backups/` first (read-only, so
 * it runs in both modes).
 *
 * IDEMPOTENT: a key that already holds a NON-EMPTY value is left alone — an
 * editor's price change can never be clobbered by a re-run, which is what makes
 * this safe to run on every deploy. Only NULL/'' values are filled.
 *
 *   # preview (no writes):
 *   npx ts-node --project tsconfig.scripts.json scripts/seed-brief-141-ndc-prices.ts
 *   # apply:
 *   npx ts-node --project tsconfig.scripts.json scripts/seed-brief-141-ndc-prices.ts commit
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
const SCRIPT = 'seed-brief-141-ndc-prices';
const mode = resolveRunMode(SCRIPT);

/** column → approved value (transcribed from the signed-off sell sheet). */
const PRICES: Array<{ column: string; value: string; used_by: string }> = [
  { column: 'ndc_price', value: '$29.97', used_by: 'classic template (monthly)' },
  { column: 'ndc_price_1yr', value: '$149', used_by: 'comparison template (1 year)' },
  { column: 'ndc_price_2yr', value: '$229', used_by: 'comparison template (2 years)' },
];

async function main() {
  const client = await pool.connect();
  try {
    announceMode(SCRIPT, mode);

    const row = (await client.query('SELECT * FROM global_settings WHERE id = 1')).rows[0] ?? null;
    mkdirSync(join(process.cwd(), 'scripts', 'backups'), { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const path = join(process.cwd(), 'scripts', 'backups', `brief-141-global-settings-pre-seed-${stamp}.json`);
    writeFileSync(path, JSON.stringify({ exported_at: new Date().toISOString(), global_settings_row: row }, null, 2));
    console.log(`✓ backup written: ${path}`);

    if (!row) {
      console.error('✗ no global_settings row with id = 1 — run scripts/migrate-global-settings.ts first.');
      process.exitCode = 1;
      return;
    }

    // A missing column reads as `undefined` from `SELECT *`, which would look
    // exactly like an empty value and then fail the UPDATE. Check explicitly so
    // the failure names its own fix instead of surfacing a Postgres parse error.
    const cols = (
      await client.query(
        `SELECT column_name FROM information_schema.columns
          WHERE table_name = 'global_settings' AND column_name = ANY($1::text[])`,
        [PRICES.map((p) => p.column)]
      )
    ).rows.map((r) => r.column_name as string);
    const missing = PRICES.map((p) => p.column).filter((c) => !cols.includes(c));
    if (missing.length > 0) {
      console.error(`✗ global_settings is missing column(s): ${missing.join(', ')} — run scripts/ensure-schema.ts first (the deploy runs it before this script).`);
      process.exitCode = 1;
      return;
    }

    const toWrite = PRICES.filter((p) => {
      const current = row[p.column];
      const empty = current === null || current === undefined || current === '';
      console.log(
        empty
          ? `✎ ${p.column}: empty → "${p.value}"   (${p.used_by})`
          : `= ${p.column}: "${current}" already set — skipped (${p.used_by})`
      );
      return empty;
    });

    if (toWrite.length === 0) {
      console.log('\nNothing to write — all three prices already have values (idempotent no-op).');
      return;
    }

    if (mode === 'commit') {
      // One UPDATE, only the empty columns. Column names come from this file's
      // own constant list, never from input.
      const sets = toWrite.map((p, i) => `${p.column} = $${i + 1}`).join(', ');
      await client.query(
        `UPDATE global_settings SET ${sets}, updated_at = NOW() WHERE id = 1`,
        toWrite.map((p) => p.value)
      );
      console.log('\n✓ seed committed.');

      const after = (await client.query('SELECT ndc_price, ndc_price_1yr, ndc_price_2yr FROM global_settings WHERE id = 1')).rows[0];
      console.log('\nVerification:');
      let ok = true;
      for (const p of PRICES) {
        const got = after[p.column];
        const want = row[p.column] === null || row[p.column] === undefined || row[p.column] === '' ? p.value : row[p.column];
        const pass = got === want;
        ok = ok && pass;
        console.log(`  ${pass ? '✓' : '✗'} ${p.column} = ${JSON.stringify(got)} (expected ${JSON.stringify(want)})`);
      }
      if (!ok) process.exitCode = 1;
      return;
    }

    console.log('\nDRY RUN complete — no changes written. Re-run with "commit" to apply.');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
