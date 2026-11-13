/**
 * Brief 227 (Track A + Track C) — add the German Village (Columbus, OH) office to Global Settings as the
 * 20th office, on an EXISTING database (the live box), without touching any of the other 19. The Brief
 * 217 Highland Park pattern (scripts/add-highland-park-office.ts), one office later, plus its Mainline
 * rating source.
 *
 * ── THE RECORD (Marketing decisions 6 + 7, 2026-11-13) ────────────────────────
 *   - slug `columbus-german-village-oh` = the office page's own slug (the footer link, the City Hub's
 *     rating key and Brief 178's own-town claim — it claims only its own page: no town moves);
 *   - street EXACTLY "490 City Park Ave, Suite B2", Columbus, OH 43215 (the brief's GBP form);
 *   - map link = the listing's public Google link (its CID — the MD's business.google.com link is an
 *     owner link and is never published); coordinates = the GBP listing's, like every other office;
 *   - `phone` "(614) 379-4898" — the FIRST office-level phone (decision 6). Additive: no other record
 *     gets the key, so every other office keeps the sitewide number;
 *   - showInFooter on (footer office list + homepage store locator, like every other office).
 * And (Track C) `global_settings.office_mainline_locations["columbus-german-village-oh"]` =
 * "columbus-german-village" (Mainline's location key for this GBP), FILL-GAP ONLY — an edited value is
 * never overwritten. It never writes a rating: only scripts/sync-gbp-ratings.ts writes office_ratings.
 *
 * ── SELECTOR ────────────────────────────────────────────────────────────────
 * By slug, NEVER by array index. An office whose slug (trimmed, one leading "/" stripped) is
 * `columbus-german-village-oh`, OR whose street starts "490 City Park" in Columbus, already counts:
 * ALREADY-APPLIED for the record, nothing changes — a record Marketing has edited by hand is never
 * overwritten or duplicated.
 *
 * ── SAFETY ──────────────────────────────────────────────────────────────────
 * Dry run unless invoked with `commit` (scripts/lib/run-mode.ts refuses to guess in CI). The prior
 * `offices` value is copied into `brief227_row_backup` (+ a JSON log) before the write. Append-only:
 * the existing offices are copied through unchanged, in order. Idempotent: safe on every deploy.
 * Content state is never a failure (Brief 186): exit 1 only for a code/schema fault.
 *
 *   npx ts-node --project tsconfig.scripts.json scripts/add-german-village-office.ts          # preview
 *   npx ts-node --project tsconfig.scripts.json scripts/add-german-village-office.ts commit   # apply
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

const SCRIPT = 'add-german-village-office';
const mode = resolveRunMode(SCRIPT);

// Brief 227 Track A, verbatim. GBP checked by Marketing on 2026-11-13; the public link and the
// coordinates are the listing's own (Google Maps, CID 885424617987951227 = 0xc49a8ffb68eca7b).
export const GERMAN_VILLAGE_OFFICE = {
  slug: 'columbus-german-village-oh',
  name: 'German Village',
  streetAddress: '490 City Park Ave, Suite B2',
  city: 'Columbus',
  state: 'OH',
  zip: '43215',
  mapUrl: 'https://www.google.com/maps?cid=885424617987951227',
  lat: 39.9523706,
  lng: -82.9968145,
  showInFooter: true,
  phone: '(614) 379-4898',
};
/** Track C: Mainline's location key for the German Village GBP (its /api/public/gbp-ratings list, 2026-11-13). */
export const GERMAN_VILLAGE_MAINLINE_LOCATION = 'columbus-german-village';

const normSlug = (s: unknown) => (typeof s === 'string' ? s.trim().replace(/^\//, '').toLowerCase() : '');

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
    const row = (
      await client.query<{ id: number; offices: unknown; m: Record<string, unknown> | null }>(
        `SELECT id, offices, to_jsonb(g) -> 'office_mainline_locations' AS m FROM global_settings g WHERE id = 1`
      )
    ).rows[0];
    if (!row) stop('global_settings has no id=1 row — run migrate-global-settings.ts first.');

    const offices = Array.isArray(row.offices) ? (row.offices as Array<Record<string, unknown>>) : [];
    if (!Array.isArray(row.offices)) console.log('global_settings.offices is not an array (null/missing) — treating as empty.');

    const existing = offices.find(
      (o) =>
        normSlug(o.slug) === GERMAN_VILLAGE_OFFICE.slug ||
        (typeof o.streetAddress === 'string' && /^490 City Park/i.test(o.streetAddress.trim()) && String(o.city ?? '').trim().toLowerCase() === 'columbus')
    );
    // Track C: the rating source, fill-gap only (the column exists since Brief 221's ensure-schema).
    const hasColumn = (await client.query(`SELECT 1 FROM information_schema.columns WHERE table_name = 'global_settings' AND column_name = 'office_mainline_locations'`)).rowCount;
    const mapping = row.m && typeof row.m === 'object' && !Array.isArray(row.m) ? (row.m as Record<string, unknown>) : {};
    const mappingDue = !!hasColumn && !(typeof mapping[GERMAN_VILLAGE_OFFICE.slug] === 'string' && String(mapping[GERMAN_VILLAGE_OFFICE.slug]).trim());
    if (!hasColumn) console.log('NOTE: global_settings.office_mainline_locations does not exist yet (ensure-schema has not run) — rating source not set.');

    if (existing) {
      console.log('already-applied: a German Village office already exists:', existing);
      if (existing.streetAddress !== GERMAN_VILLAGE_OFFICE.streetAddress) {
        console.log(`  NOTE: its street is "${String(existing.streetAddress)}", not "${GERMAN_VILLAGE_OFFICE.streetAddress}" — left as is (edited in /admin?).`);
      }
    } else {
      console.log(`found ${offices.length} existing office(s): ${offices.map((o) => o.slug).join(', ')}`);
      console.log('will append:', GERMAN_VILLAGE_OFFICE);
    }
    if (mappingDue) console.log(`will set office_mainline_locations["${GERMAN_VILLAGE_OFFICE.slug}"] = "${GERMAN_VILLAGE_MAINLINE_LOCATION}"`);
    else if (hasColumn) console.log(`rating source already set: ${GERMAN_VILLAGE_OFFICE.slug} → ${String(mapping[GERMAN_VILLAGE_OFFICE.slug])} (left as is)`);

    if (existing && !mappingDue) {
      verdict(SCRIPT, 'ALREADY-APPLIED', 'German Village office (and its rating source) already present — left untouched');
      return;
    }
    if (mode !== 'commit') {
      console.log('\nNo changes were written. Re-run with `commit` to apply.');
      verdict(SCRIPT, 'NOT-APPLIED (dry run)');
      return;
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS brief227_row_backup (
        id            SERIAL PRIMARY KEY,
        source_table  TEXT NOT NULL,
        source_id     INTEGER NOT NULL,
        reason        TEXT NOT NULL,
        row_json      JSONB NOT NULL,
        backed_up_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
    const patched = existing ? offices : [...offices, GERMAN_VILLAGE_OFFICE];
    await client.query('BEGIN');
    try {
      await client.query(
        `INSERT INTO brief227_row_backup (source_table, source_id, reason, row_json) VALUES ('global_settings', $1, $2, $3)`,
        [row.id, 'offices + office_mainline_locations before adding the German Village office (Brief 227, Tracks A + C)', JSON.stringify({ offices: row.offices ?? [], officeMainlineLocations: row.m ?? null })]
      );
      if (!existing) {
        const upd = await client.query(`UPDATE global_settings SET offices = $1::jsonb WHERE id = $2`, [JSON.stringify(patched), row.id]);
        if (upd.rowCount !== 1) throw new Error(`expected to update 1 row, updated ${upd.rowCount}.`);
      }
      if (mappingDue) {
        await client.query(
          `UPDATE global_settings SET office_mainline_locations = COALESCE(office_mainline_locations, '{}'::jsonb) || jsonb_build_object($1::text, $2::text) WHERE id = $3`,
          [GERMAN_VILLAGE_OFFICE.slug, GERMAN_VILLAGE_MAINLINE_LOCATION, row.id]
        );
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    }

    // ── Verify (the write itself — a fault here is a code/schema fault, exit 1) ──
    const after = (
      await client.query<{ offices: Array<Record<string, unknown>>; m: Record<string, unknown> | null }>(
        `SELECT offices, to_jsonb(g) -> 'office_mainline_locations' AS m FROM global_settings g WHERE id = $1`,
        [row.id]
      )
    ).rows[0];
    const list = after.offices ?? [];
    if (!existing) {
      const gv = list.filter((o) => o.slug === GERMAN_VILLAGE_OFFICE.slug);
      if (gv.length !== 1 || gv[0].streetAddress !== GERMAN_VILLAGE_OFFICE.streetAddress || gv[0].phone !== GERMAN_VILLAGE_OFFICE.phone) {
        throw new Error('verify failed: the German Village office did not land as written.');
      }
      if (JSON.stringify(list.slice(0, offices.length)) !== JSON.stringify(offices)) throw new Error('verify failed: existing offices were reordered or mutated.');
    }
    if (mappingDue && after.m?.[GERMAN_VILLAGE_OFFICE.slug] !== GERMAN_VILLAGE_MAINLINE_LOCATION) throw new Error('verify failed: the rating source did not land.');
    console.log(`verify: offices holds ${list.length} record(s) in order: ${list.map((o) => o.slug).join(', ')}.`);

    const dir = join(process.cwd(), 'scripts', 'backups');
    mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const file = join(dir, `brief-227-add-german-village-office-${mode}-${stamp}.json`);
    writeFileSync(file, JSON.stringify({ mode, generated: stamp, before: { offices, officeMainlineLocations: row.m }, after: { offices: list, officeMainlineLocations: after.m } }, null, 2));
    console.log(`log: ${file}`);
    verdict(SCRIPT, 'APPLIED', `${existing ? '' : `German Village office appended (${list.length} offices)`}${!existing && mappingDue ? '; ' : ''}${mappingDue ? 'rating source set' : ''}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  if (e instanceof StopAndReport) {
    console.log('\n' + '!'.repeat(72));
    console.log('BRIEF 227 TRACK A — STOPPED, NOTHING WRITTEN');
    console.log(e.message);
    console.log('This is a data condition that needs a human decision, not a deploy failure.');
    console.log('!'.repeat(72) + '\n');
    verdict(SCRIPT, 'NOT-APPLIED (guard tripped)', e.message.split('.')[0]);
    return;
  }
  console.error('FAILED:', e);
  process.exitCode = 1;
});
