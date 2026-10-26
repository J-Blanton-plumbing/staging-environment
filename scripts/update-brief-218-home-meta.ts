/**
 * Brief 218 (Track A) — the homepage's new SEO title + meta description, written into the
 * `main_pages` row `home` on an EXISTING database (the live box).
 *
 * ── WHY A DEPLOY STEP ─────────────────────────────────────────────────────────
 * `getMainPageMeta('home', STATIC_META)` lets a non-blank CMS field beat the page's STATIC_META, and
 * Brief 149's backfill (scripts/backfill-brief-149-page-meta.ts, every deploy) filled production's
 * blank fields with the OLD homepage values. So changing STATIC_META alone would change nothing live.
 * The live DB is not reachable from the workstation, and a manual /admin write leaves no record — so
 * it lands here (Brief 216/217 pattern).
 *
 * ── THE COPY (Marketing, locked 2026-10-26 — Homepage_Metadata_Locked.md) ──────
 * Stored SUFFIX-FREE, like every title field (Brief 147): the page composes "| J. Blanton Plumbing"
 * through TITLE_TEMPLATE exactly once.
 *
 * ── GUARD ──────────────────────────────────────────────────────────────────────
 * A field is replaced only when it is blank or still holds the OLD value (title compared after
 * `pageTitle()`, so a stored brand tail doesn't matter). Both fields already new → ALREADY-APPLIED.
 * Any field holding something else was edited in /admin since: NOT-APPLIED, nothing written — that is
 * a human decision, not a deploy failure (Brief 186).
 *
 * ── SAFETY ─────────────────────────────────────────────────────────────────────
 * Dry run unless invoked with `commit` (scripts/lib/run-mode.ts refuses to guess in CI). The prior
 * values go to `brief218_row_backup` (+ a JSON log) first. `version` is bumped (the render changes, so
 * an editor with /admin/home open gets a conflict instead of saving the old copy back) and `updated_at`
 * moves (the homepage's sitemap lastmod should). Exit 1 only for a code/schema fault.
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/update-brief-218-home-meta.ts          # preview
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/update-brief-218-home-meta.ts commit   # apply
 */
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';
import { pageTitle } from '../src/lib/seo';
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

const SCRIPT = 'update-brief-218-home-meta';
const mode = resolveRunMode(SCRIPT);

// Keep in step with STATIC_META in src/app/page.tsx (a route file cannot be imported by a script).
const NEW = {
  meta_title: 'Plumbers in Chicagoland & Columbus, OH',
  meta_description:
    "Need a plumber near you? For 30+ years, we've helped homeowners with water heaters, clogged drains, sewer lines and more. Available 24/7, with upfront pricing.",
};
// What the Brief 149 backfill stored (scripts/backups/brief-149-page-meta-commit-2026-08-07…json).
const OLD = {
  meta_title: 'Chicago Plumbing Experts | Make a Good Call',
  meta_description: 'J. Blanton Plumbing — Chicago and suburbs, over 30 years.',
};

type Field = keyof typeof NEW;
const blank = (v: string | null) => v == null || v.trim() === '';
const norm = (f: Field, v: string | null) => (v == null ? '' : f === 'meta_title' ? pageTitle(v) : v.trim());

async function main() {
  const client = await pool.connect();
  try {
    announceMode(SCRIPT, mode);
    const row = (
      await client.query<{ id: number; version: number; meta_title: string | null; meta_description: string | null }>(
        `SELECT id, version, meta_title, meta_description FROM main_pages WHERE slug = 'home'`
      )
    ).rows[0];
    if (!row) {
      // No row = the page renders STATIC_META, which already holds the new copy.
      verdict(SCRIPT, 'ALREADY-APPLIED', 'no main_pages home row — the page renders STATIC_META (the new copy)');
      return;
    }

    const plan: Partial<Record<Field, string>> = {};
    const edited: string[] = [];
    for (const f of Object.keys(NEW) as Field[]) {
      const cur = row[f];
      if (norm(f, cur) === NEW[f]) continue;
      if (blank(cur) || norm(f, cur) === OLD[f]) plan[f] = NEW[f];
      else edited.push(`${f} = ${JSON.stringify(cur)}`);
    }
    console.log(`main_pages/home (id ${row.id}, version ${row.version}):`);
    console.log(`  meta_title       ${JSON.stringify(row.meta_title)}`);
    console.log(`  meta_description ${JSON.stringify(row.meta_description)}`);

    if (edited.length) {
      console.log('\n' + '!'.repeat(72));
      console.log('BRIEF 218 TRACK A — STOPPED, NOTHING WRITTEN');
      console.log(`A homepage meta field holds neither the old nor the new copy (edited in /admin?): ${edited.join('; ')}`);
      console.log('Marketing decides whether the locked Brief 218 copy should replace it.');
      console.log('!'.repeat(72) + '\n');
      verdict(SCRIPT, 'NOT-APPLIED (guard tripped)', 'home meta edited since the Brief 149 backfill');
      return;
    }
    if (Object.keys(plan).length === 0) {
      verdict(SCRIPT, 'ALREADY-APPLIED', 'home meta already holds the Brief 218 copy');
      return;
    }
    console.log('will write:', plan);
    if (mode !== 'commit') {
      console.log('\nNo changes were written. Re-run with `commit` to apply.');
      verdict(SCRIPT, 'NOT-APPLIED (dry run)');
      return;
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS brief218_row_backup (
        id            SERIAL PRIMARY KEY,
        source_table  TEXT NOT NULL,
        source_id     INTEGER NOT NULL,
        reason        TEXT NOT NULL,
        row_json      JSONB NOT NULL,
        backed_up_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
    const next = { meta_title: plan.meta_title ?? row.meta_title, meta_description: plan.meta_description ?? row.meta_description };
    await client.query('BEGIN');
    try {
      await client.query(
        `INSERT INTO brief218_row_backup (source_table, source_id, reason, row_json) VALUES ('main_pages', $1, $2, $3)`,
        [row.id, 'home meta_title / meta_description before the Brief 218 copy (Track A)', JSON.stringify({ version: row.version, meta_title: row.meta_title, meta_description: row.meta_description })]
      );
      const upd = await client.query(
        `UPDATE main_pages SET meta_title = $1, meta_description = $2, version = version + 1, updated_at = NOW()
          WHERE id = $3 AND version = $4`,
        [next.meta_title, next.meta_description, row.id, row.version]
      );
      if (upd.rowCount !== 1) throw new Error(`expected to update 1 row, updated ${upd.rowCount} (the row changed during the run).`);
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    }

    const after = (await client.query<{ meta_title: string; meta_description: string }>(`SELECT meta_title, meta_description FROM main_pages WHERE id = $1`, [row.id])).rows[0];
    if (after.meta_title !== NEW.meta_title || after.meta_description !== NEW.meta_description) throw new Error('verify failed: the homepage meta did not land as written.');
    console.log('verify: main_pages/home meta now holds the Brief 218 copy.');

    const dir = join(process.cwd(), 'scripts', 'backups');
    mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const file = join(dir, `brief-218-home-meta-${mode}-${stamp}.json`);
    writeFileSync(file, JSON.stringify({ mode, generated: stamp, before: { meta_title: row.meta_title, meta_description: row.meta_description }, after }, null, 2));
    console.log(`log: ${file}`);
    verdict(SCRIPT, 'APPLIED', 'home meta_title + meta_description = the Brief 218 copy');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error('FAILED:', e);
  process.exitCode = 1;
});
