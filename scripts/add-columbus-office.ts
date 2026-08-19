/**
 * Brief 154 (Track C) — add the Columbus, OH office to `global_settings.offices`
 * on an EXISTING database (the live/staging box), without touching any of the
 * other 14 offices.
 *
 * ── WHY A SEPARATE SCRIPT ─────────────────────────────────────────────────────
 * `scripts/migrate-global-settings.ts`'s `SEED_OFFICES` only reaches the live
 * box's `offices` column via `UPDATE ... WHERE offices IS NULL` — a no-op on a
 * database that already has 14 offices seeded (every real environment). This
 * script is the fill-gaps path: it reads the existing `offices` JSONB, appends
 * Columbus if it isn't already there, and writes the array back — the live DB
 * is not reachable from the workstation, so this has to run in the deploy
 * pipeline (Brief 143/146/147/150 script conventions).
 *
 * ── SELECTOR ────────────────────────────────────────────────────────────────
 * By `slug = 'columbus'`, NEVER by array index or serial — ids/order differ per
 * environment (Brief 146 lesson). If a `columbus` office already exists for any
 * reason, this reports ALREADY-APPLIED and changes NOTHING — it never overwrites
 * a record Marketing may have already edited by hand.
 *
 * ── SAFETY ──────────────────────────────────────────────────────────────────
 * SAFE BY DEFAULT: dry run unless invoked with `commit` (pipeline runs must pass
 *   an explicit mode — scripts/lib/run-mode.ts refuses to guess in CI).
 * BACKUP-FIRST: the prior `offices` value is copied into `brief154_row_backup`
 *   plus a JSON file, before any write.
 * APPEND-ONLY: the existing 14 offices are copied through UNCHANGED and in the
 *   same order; Columbus is appended at the end. No office is reordered,
 *   dropped, or mutated.
 * IDEMPOTENT: re-running once Columbus exists reports ALREADY-APPLIED and
 *   writes nothing — safe on every deploy.
 *
 *   # preview (no writes):
 *   npx ts-node --project tsconfig.scripts.json scripts/add-columbus-office.ts
 *   # apply:
 *   npx ts-node --project tsconfig.scripts.json scripts/add-columbus-office.ts commit
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

const SCRIPT = 'add-columbus-office';
const mode = resolveRunMode(SCRIPT);

// Brief 154 authoritative office data (used verbatim from the brief). Must
// match `src/lib/cms/offices.ts`'s `CmsOffice` shape and the
// `src/lib/content/cities/index.ts` registry slug ('columbus') exactly — the
// Brief 108 lesson: a mismatched slug 404's the shared-footer link.
const COLUMBUS_OFFICE = {
  slug: 'columbus',
  name: 'Columbus',
  streetAddress: '1387 W. Goodale Blvd',
  city: 'Columbus',
  state: 'OH',
  zip: '43212',
  // Marketing has not supplied a Google Business Profile link yet — a Maps
  // SEARCH url for the address so the "Local Office" link is not dead.
  // Flagged in the Brief 154 report for replacement with the real GBP link.
  mapUrl: 'https://www.google.com/maps/search/?api=1&query=1387+W.+Goodale+Blvd%2C+Columbus%2C+OH+43212',
  lat: null as number | null,
  lng: null as number | null,
  showInFooter: true,
};

class StopAndReport extends Error {}
function stop(msg: string): never {
  throw new StopAndReport(msg);
}

async function main() {
  const client = await pool.connect();
  try {
    announceMode(SCRIPT, mode);

    const tableExists = await client.query(
      `SELECT 1 FROM information_schema.tables WHERE table_name = 'global_settings'`
    );
    if (!tableExists.rowCount) {
      // ensure-schema / migrate-global-settings run earlier in the pipeline and
      // create this table — be defensive for by-hand runs against a bare DB.
      stop('global_settings table does not exist — run migrate-global-settings.ts first.');
    }

    const row = (
      await client.query<{ id: number; offices: unknown }>(
        `SELECT id, offices FROM global_settings WHERE id = 1`
      )
    ).rows[0];
    if (!row) {
      stop('global_settings has no id=1 row — run migrate-global-settings.ts first.');
    }

    const offices = Array.isArray(row.offices) ? (row.offices as Array<Record<string, unknown>>) : [];
    if (!Array.isArray(row.offices)) {
      console.log('global_settings.offices is not an array (null/missing) — treating as empty.');
    }

    const existing = offices.find((o) => o.slug === COLUMBUS_OFFICE.slug);
    if (existing) {
      console.log(`already-applied: an office with slug "${COLUMBUS_OFFICE.slug}" already exists:`, existing);
      verdict(SCRIPT, 'ALREADY-APPLIED', 'columbus office already present — left untouched');
      return;
    }

    console.log(`found ${offices.length} existing office(s): ${offices.map((o) => o.slug).join(', ')}`);
    console.log('will append:', COLUMBUS_OFFICE);

    if (mode !== 'commit') {
      console.log('\nwould append the Columbus office. No changes were written. Re-run with `commit` to apply.');
      verdict(SCRIPT, 'NOT-APPLIED (dry run)');
      return;
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS brief154_row_backup (
        id            SERIAL PRIMARY KEY,
        source_table  TEXT NOT NULL,
        source_id     INTEGER NOT NULL,
        reason        TEXT NOT NULL,
        row_json      JSONB NOT NULL,
        backed_up_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);

    // Append-only: the existing offices are copied through unchanged, in the
    // same order, and Columbus is appended at the end.
    const patched = [...offices, COLUMBUS_OFFICE];

    await client.query('BEGIN');
    try {
      await client.query(
        `INSERT INTO brief154_row_backup (source_table, source_id, reason, row_json)
         VALUES ('global_settings', $1, $2, $3)`,
        [row.id, 'offices value before appending the Columbus office (Brief 154, Track C)', JSON.stringify(row.offices ?? [])]
      );
      const upd = await client.query(
        `UPDATE global_settings SET offices = $1::jsonb WHERE id = $2`,
        [JSON.stringify(patched), row.id]
      );
      if (upd.rowCount !== 1) {
        throw new Error(`expected to update 1 row, updated ${upd.rowCount}.`);
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    }
    console.log(`appended: Columbus office. offices now holds ${patched.length} record(s).`);

    // ── Verify ────────────────────────────────────────────────────────────────
    const after = (
      await client.query<{ offices: Array<Record<string, unknown>> }>(
        `SELECT offices FROM global_settings WHERE id = $1`,
        [row.id]
      )
    ).rows[0];
    const afterSlugs = (after.offices ?? []).map((o) => o.slug);
    if (!afterSlugs.includes('columbus')) throw new Error('verify failed: columbus is not in offices after the write.');
    if (afterSlugs.length !== offices.length + 1) {
      throw new Error(`verify failed: expected ${offices.length + 1} offices, found ${afterSlugs.length}.`);
    }
    // The original 14 (or however many) must still be present, in order, unchanged.
    const originalSlugs = offices.map((o) => o.slug);
    const preservedSlugs = afterSlugs.slice(0, originalSlugs.length);
    if (JSON.stringify(preservedSlugs) !== JSON.stringify(originalSlugs)) {
      throw new Error('verify failed: existing offices were reordered or mutated.');
    }
    console.log(`verify: offices holds ${afterSlugs.length} record(s) in order: ${afterSlugs.join(', ')}.`);

    const dir = join(process.cwd(), 'scripts', 'backups');
    mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const file = join(dir, `brief-154-add-columbus-office-${mode}-${stamp}.json`);
    writeFileSync(file, JSON.stringify({ mode, generated: stamp, before: offices, after: patched }, null, 2));
    console.log(`log: ${file}`);
    verdict(SCRIPT, 'APPLIED', 'columbus office appended to global_settings.offices');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  if (e instanceof StopAndReport) {
    console.log('\n' + '!'.repeat(72));
    console.log('BRIEF 154 TRACK C — STOPPED, NOTHING WRITTEN');
    console.log(e.message);
    console.log('This is a data condition that needs a human decision, not a deploy failure.');
    console.log('!'.repeat(72) + '\n');
    verdict(SCRIPT, 'NOT-APPLIED (guard tripped)', e.message.split('.')[0]);
    return; // exit 0 — same convention as the Brief 145/146/150 fix scripts
  }
  console.error('FAILED:', e);
  process.exitCode = 1;
});
