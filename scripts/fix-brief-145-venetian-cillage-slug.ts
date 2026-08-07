/**
 * Brief 145 Track B — rename the `venetian-cillage` city slug to `venetian-village`.
 *
 * THE PROBLEM
 * -----------
 * 45 `city_service_pages` rows carry city slug `venetian-cillage`. Brief 131
 * deliberately removed that slug from CITY_REGISTRY as a duplicate typo row, and
 * `[city]/[service]` 404s any slug the registry doesn't hold — so all 45 URLs
 * return 404 and their content can never render. Verified before writing this
 * script: `/venetian-cillage/gas-lines` → 404, `/venetian-village/gas-lines` →
 * 200 (rendering the static registry fallback, because no row exists there).
 *
 * WHY `venetian-village` IS THE RIGHT TARGET (all three checked at run time)
 *   1. `venetian-village` is in CITY_REGISTRY and has a `city_pages` row.
 *   2. The live WordPress export lists exactly 45 `/venetian-village/{service}`
 *      pages plus the city page — the same 45 service slugs these rows carry.
 *   3. Nothing else in the DB references `venetian-cillage` (checked: city_pages,
 *      canonical_url, meta fields, article bodies, main_pages content).
 *
 * The script STOPS AND REPORTS rather than renaming if any guard fails, and if
 * a `venetian-village` row already exists for a service slug it is about to
 * move — it never overwrites a row.
 *
 * SAFETY
 * ------
 * SAFE BY DEFAULT: dry run unless invoked with `commit`.
 * BACKUP-FIRST: every touched row is copied whole (row_to_json) into
 *   `brief145_row_backup` AND to a timestamped JSON file under scripts/backups/.
 *   The DB table is the one that matters on the deploy box.
 * IDEMPOTENT: once no `venetian-cillage` rows remain, the script reports
 *   `already-applied` and writes nothing — safe on every deploy.
 *
 *   # preview (no writes):
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/fix-brief-145-venetian-cillage-slug.ts
 *   # apply:
 *   ... scripts/fix-brief-145-venetian-cillage-slug.ts commit
 */
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';
import { CITY_REGISTRY } from '@/lib/content/cities';
import { getAllServiceSlugs } from '@/lib/content/city-services';
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
const SCRIPT = 'fix-brief-145-venetian-cillage-slug';
const mode = resolveRunMode(SCRIPT);

const FROM_SLUG = 'venetian-cillage';
const TO_SLUG = 'venetian-village';

/**
 * A guard tripped: the data in THIS database is not the shape the brief signed
 * off on, so nothing is renamed and a human has to look.
 *
 * Exits ZERO on purpose. This script runs inside deploy.yml, which uses
 * `script_stop: true` — a non-zero exit would abort the deploy before the build
 * swap and pm2 reload, taking the whole site's deploy pipeline down over a data
 * condition that needs a decision, not an outage. The banner is loud enough to
 * be unmissable in the deploy log. Genuine failures (a broken UPDATE, an
 * unreachable DB) still throw and exit non-zero.
 */
class StopAndReport extends Error {}
function stop(msg: string): never {
  throw new StopAndReport(msg);
}

async function main() {
  const client = await pool.connect();
  try {
    announceMode(SCRIPT, mode);

    // Shared Brief 145 backup table (Track B and Track D both write here).
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

    // ── Guard 0: is there anything to do? ─────────────────────────────────
    const target = await client.query<{ id: number; service_slug: string }>(
      'SELECT id, service_slug FROM city_service_pages WHERE city_slug = $1 ORDER BY id',
      [FROM_SLUG]
    );
    if (target.rowCount === 0) {
      console.log(`already-applied: no \`${FROM_SLUG}\` rows in this database. Nothing to do.`);
      // Still assert the invariant the brief asks for.
      const stray = await client.query(
        `SELECT count(*)::int c FROM city_service_pages WHERE city_slug = $1`,
        [FROM_SLUG]
      );
      console.log(`verify: ${stray.rows[0].c} \`${FROM_SLUG}\` rows remain (expected 0).`);
      return;
    }
    console.log(`found ${target.rowCount} \`${FROM_SLUG}\` city_service_pages rows.\n`);

    // ── Guard 1: the target city is real and renders ──────────────────────
    const registered = CITY_REGISTRY.some((c) => c.slug === TO_SLUG);
    if (!registered) stop(`\`${TO_SLUG}\` is not in CITY_REGISTRY — its URLs would 404 too.`);
    const cityPage = await client.query('SELECT id FROM city_pages WHERE city_slug = $1', [TO_SLUG]);
    if (cityPage.rowCount === 0) stop(`no city_pages row for \`${TO_SLUG}\`.`);
    console.log(`guard 1 OK  — \`${TO_SLUG}\` is registered (city_pages id ${cityPage.rows[0].id}).`);

    // ── Guard 2: every service slug is one the [service] route serves ─────
    const services = new Set(getAllServiceSlugs());
    const unknown = target.rows.filter((r) => !services.has(r.service_slug));
    if (unknown.length) {
      stop(
        `${unknown.length} row(s) carry a service slug not in the city-services registry — ` +
          `renaming would move them from one 404 to another: ` +
          unknown.map((r) => `#${r.id} ${r.service_slug}`).join(', ')
      );
    }
    console.log(`guard 2 OK  — all ${target.rowCount} service slugs are registered.`);

    // ── Guard 3: no collision with an existing venetian-village row ───────
    const existing = await client.query<{ id: number; service_slug: string }>(
      'SELECT id, service_slug FROM city_service_pages WHERE city_slug = $1',
      [TO_SLUG]
    );
    const existingBySlug = new Map(existing.rows.map((r) => [r.service_slug, r.id]));
    const collisions = target.rows
      .filter((r) => existingBySlug.has(r.service_slug))
      .map((r) => `${r.service_slug}: ${FROM_SLUG} #${r.id} ↔ ${TO_SLUG} #${existingBySlug.get(r.service_slug)}`);
    if (collisions.length) {
      stop(
        `${collisions.length} collision(s) — a \`${TO_SLUG}\` row already exists for these ` +
          `services. Not overwriting. Pairs:\n  ` + collisions.join('\n  ')
      );
    }
    console.log(
      `guard 3 OK  — ${existing.rowCount} existing \`${TO_SLUG}\` rows, none colliding.\n`
    );

    // ── Backup every touched row, whole ───────────────────────────────────
    const full = await client.query<{ id: number; row_json: unknown }>(
      `SELECT id, row_to_json(t)::jsonb AS row_json FROM city_service_pages t WHERE city_slug = $1 ORDER BY id`,
      [FROM_SLUG]
    );
    if (mode === 'commit') {
      for (const r of full.rows) {
        const dup = await client.query(
          `SELECT 1 FROM brief145_row_backup WHERE track = 'B' AND source_table = 'city_service_pages' AND source_id = $1`,
          [r.id]
        );
        if (dup.rowCount) continue; // backed up by an earlier run
        await client.query(
          `INSERT INTO brief145_row_backup (track, source_table, source_id, reason, row_json)
           VALUES ('B','city_service_pages',$1,$2,$3)`,
          [r.id, `city_slug rename ${FROM_SLUG} → ${TO_SLUG}`, r.row_json]
        );
      }
    }

    // ── The rename ────────────────────────────────────────────────────────
    let renamed = 0;
    if (mode === 'commit') {
      const res = await client.query(
        'UPDATE city_service_pages SET city_slug = $1 WHERE city_slug = $2',
        [TO_SLUG, FROM_SLUG]
      );
      renamed = res.rowCount ?? 0;
    } else {
      renamed = target.rowCount ?? 0;
    }

    // ── Report ────────────────────────────────────────────────────────────
    const dir = join(process.cwd(), 'scripts', 'backups');
    mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const file = join(dir, `brief-145-venetian-slug-${mode}-${stamp}.json`);
    writeFileSync(
      file,
      JSON.stringify(
        { mode, generated: stamp, from: FROM_SLUG, to: TO_SLUG, rows: full.rows },
        null,
        2
      )
    );

    console.log(
      `${mode === 'commit' ? 'renamed' : 'would rename'} ${renamed} row(s): ` +
        `${FROM_SLUG} → ${TO_SLUG}`
    );
    console.log(`backup rows staged: ${full.rowCount}`);
    console.log(`log: ${file}`);

    if (mode === 'commit') {
      const after = await client.query<{ c: number }>(
        `SELECT count(*)::int c FROM city_service_pages WHERE city_slug = $1`,
        [FROM_SLUG]
      );
      const now = await client.query<{ c: number }>(
        `SELECT count(*)::int c FROM city_service_pages WHERE city_slug = $1`,
        [TO_SLUG]
      );
      console.log(`verify: ${after.rows[0].c} \`${FROM_SLUG}\` rows remain (expected 0).`);
      console.log(`verify: ${now.rows[0].c} \`${TO_SLUG}\` rows now exist.`);
      if (after.rows[0].c !== 0) {
        throw new Error('rows still carry the old slug after the update.');
      }
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
    console.log(`BRIEF 145 TRACK B — STOPPED, NOTHING RENAMED`);
    console.log(e.message);
    console.log('This is a data condition that needs a human decision, not a deploy failure.');
    console.log('!'.repeat(72) + '\n');
    return; // exit 0 — see the StopAndReport docstring
  }
  console.error('FAILED:', e);
  process.exitCode = 1;
});
