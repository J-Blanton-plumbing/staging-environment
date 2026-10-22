/**
 * Brief 217 (Track A) — add the Highland Park, IL office to `global_settings.offices` on an EXISTING
 * database (the live box), without touching any of the other 18 offices. The Brief 154 Columbus
 * pattern (scripts/add-columbus-office.ts), one office later.
 *
 * ── WHY A DEPLOY STEP ─────────────────────────────────────────────────────────
 * The office was kept OUT of Global Settings until its Google Business Profile went live (Brief 195).
 * Marketing approved it on 2026-10-22. The live DB is not reachable from the workstation, and a manual
 * /admin write leaves no record, so it lands here (Brief 216 pattern).
 *
 * ── THE RECORD (Marketing decisions 2 + 3, 2026-10-22) ────────────────────────
 *   - street EXACTLY "1904 Green Bay Rd B" — the GBP's, character for character, NO "#";
 *   - map link = the GBP share link; coordinates = the GBP listing's (like every other office record);
 *   - no office-level phone: the office uses the sitewide 773 number (CmsOffice has no phone field);
 *   - showInFooter on (footer office list + store locator, like every other office).
 * The Highland Park town then resolves to this office through Brief 178's own-town rule (exact slug),
 * like every other office town (Marketing 2026-10-22). No other town moves — there is no distance logic.
 *
 * ── SELECTOR ────────────────────────────────────────────────────────────────
 * By slug, NEVER by array index. An office whose slug (trimmed, one leading "/" stripped) is
 * `highland-park`, OR whose `city` is Highland Park, already counts: ALREADY-APPLIED, nothing changes —
 * a record Marketing has edited by hand is never overwritten or duplicated.
 *
 * ── SAFETY ──────────────────────────────────────────────────────────────────
 * Dry run unless invoked with `commit` (scripts/lib/run-mode.ts refuses to guess in CI). The prior
 * `offices` value is copied into `brief217_row_backup` (+ a JSON log) before the write. Append-only:
 * the existing offices are copied through unchanged, in order. Idempotent: safe on every deploy.
 * Content state is never a failure (Brief 186): exit 1 only for a code/schema fault.
 *
 *   npx ts-node --project tsconfig.scripts.json scripts/add-highland-park-office.ts          # preview
 *   npx ts-node --project tsconfig.scripts.json scripts/add-highland-park-office.ts commit   # apply
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

const SCRIPT = 'add-highland-park-office';
const mode = resolveRunMode(SCRIPT);

// Brief 217 Track A, verbatim. The slug matches the registry city `highland-park` (Brief 108 lesson:
// a mismatched slug 404s the footer link). GBP checked by Marketing on 2026-10-22.
const HIGHLAND_PARK_OFFICE = {
  slug: 'highland-park',
  name: 'Highland Park',
  streetAddress: '1904 Green Bay Rd B',
  city: 'Highland Park',
  state: 'IL',
  zip: '60035',
  mapUrl: 'https://maps.app.goo.gl/2TwjsZRjsfZmukRr6',
  lat: 42.1870645,
  lng: -87.8044747,
  showInFooter: true,
};

const normSlug = (s: unknown) => (typeof s === 'string' ? s.trim().replace(/^\//, '').toLowerCase() : '');
const normCity = (s: unknown) => (typeof s === 'string' ? s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') : '');

class StopAndReport extends Error {}
function stop(msg: string): never {
  throw new StopAndReport(msg);
}

async function main() {
  const client = await pool.connect();
  try {
    announceMode(SCRIPT, mode);
    const tableExists = await client.query(`SELECT 1 FROM information_schema.tables WHERE table_name = 'global_settings'`);
    if (!tableExists.rowCount) stop('global_settings table does not exist — run migrate-global-settings.ts first.');
    const row = (await client.query<{ id: number; offices: unknown }>(`SELECT id, offices FROM global_settings WHERE id = 1`)).rows[0];
    if (!row) stop('global_settings has no id=1 row — run migrate-global-settings.ts first.');

    const offices = Array.isArray(row.offices) ? (row.offices as Array<Record<string, unknown>>) : [];
    if (!Array.isArray(row.offices)) console.log('global_settings.offices is not an array (null/missing) — treating as empty.');

    const existing = offices.find((o) => normSlug(o.slug) === HIGHLAND_PARK_OFFICE.slug || normCity(o.city) === 'highland-park');
    if (existing) {
      console.log('already-applied: a Highland Park office already exists:', existing);
      if (existing.streetAddress !== HIGHLAND_PARK_OFFICE.streetAddress) {
        console.log(`  NOTE: its street is "${String(existing.streetAddress)}", not "${HIGHLAND_PARK_OFFICE.streetAddress}" — left as is (edited in /admin?).`);
      }
      verdict(SCRIPT, 'ALREADY-APPLIED', 'highland-park office already present — left untouched');
      return;
    }

    console.log(`found ${offices.length} existing office(s): ${offices.map((o) => o.slug).join(', ')}`);
    console.log('will append:', HIGHLAND_PARK_OFFICE);
    if (mode !== 'commit') {
      console.log('\nwould append the Highland Park office. No changes were written. Re-run with `commit` to apply.');
      verdict(SCRIPT, 'NOT-APPLIED (dry run)');
      return;
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS brief217_row_backup (
        id            SERIAL PRIMARY KEY,
        source_table  TEXT NOT NULL,
        source_id     INTEGER NOT NULL,
        reason        TEXT NOT NULL,
        row_json      JSONB NOT NULL,
        backed_up_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
    const patched = [...offices, HIGHLAND_PARK_OFFICE];
    await client.query('BEGIN');
    try {
      await client.query(
        `INSERT INTO brief217_row_backup (source_table, source_id, reason, row_json) VALUES ('global_settings', $1, $2, $3)`,
        [row.id, 'offices value before appending the Highland Park office (Brief 217, Track A)', JSON.stringify(row.offices ?? [])]
      );
      const upd = await client.query(`UPDATE global_settings SET offices = $1::jsonb WHERE id = $2`, [JSON.stringify(patched), row.id]);
      if (upd.rowCount !== 1) throw new Error(`expected to update 1 row, updated ${upd.rowCount}.`);
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    }

    // ── Verify (the write itself — a fault here is a code/schema fault, exit 1) ──
    const after = (await client.query<{ offices: Array<Record<string, unknown>> }>(`SELECT offices FROM global_settings WHERE id = $1`, [row.id])).rows[0];
    const list = after.offices ?? [];
    const hp = list.filter((o) => o.slug === HIGHLAND_PARK_OFFICE.slug);
    if (hp.length !== 1 || hp[0].streetAddress !== HIGHLAND_PARK_OFFICE.streetAddress) throw new Error('verify failed: the Highland Park office did not land as written.');
    if (JSON.stringify(list.slice(0, offices.length)) !== JSON.stringify(offices)) throw new Error('verify failed: existing offices were reordered or mutated.');
    console.log(`verify: offices holds ${list.length} record(s) in order: ${list.map((o) => o.slug).join(', ')}.`);

    const dir = join(process.cwd(), 'scripts', 'backups');
    mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const file = join(dir, `brief-217-add-highland-park-office-${mode}-${stamp}.json`);
    writeFileSync(file, JSON.stringify({ mode, generated: stamp, before: offices, after: patched }, null, 2));
    console.log(`log: ${file}`);
    verdict(SCRIPT, 'APPLIED', `highland-park office appended to global_settings.offices (${list.length} offices)`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  if (e instanceof StopAndReport) {
    console.log('\n' + '!'.repeat(72));
    console.log('BRIEF 217 TRACK A — STOPPED, NOTHING WRITTEN');
    console.log(e.message);
    console.log('This is a data condition that needs a human decision, not a deploy failure.');
    console.log('!'.repeat(72) + '\n');
    verdict(SCRIPT, 'NOT-APPLIED (guard tripped)', e.message.split('.')[0]);
    return;
  }
  console.error('FAILED:', e);
  process.exitCode = 1;
});
