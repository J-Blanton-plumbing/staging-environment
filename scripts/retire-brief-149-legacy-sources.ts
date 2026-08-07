/**
 * Brief 149 (Tracks A + B, step 3) — retire the now-unread
 * `service_category_pages` rows for `sewer-rodding` (id 25) and `hydro-jetting`
 * (id 24).
 *
 * ── WHY ─────────────────────────────────────────────────────────────────────
 * Until this brief, each of these two pages had TWO editable records behind it:
 * a `service_category_pages` row (whose hero + problems fields the old route
 * merged in) and a `sub_service_pages` row (editable in the admin, never read).
 * Two editors for one page is the confusion the brief exists to end. With the
 * routes repointed at `SubServicePageView`, the category rows have no reader at
 * all — they are pure trap: an edit there changes nothing, silently.
 *
 * DELETE, not delist — matching Brief 146, which deleted both its retired
 * sources (the static content file, and the phantom `gas-lines-chicago` row)
 * rather than hiding them. A row that still exists is a row someone can still be
 * pointed at by a stale bookmark to `/admin/{slug}`; the backup is the safety
 * net, not the live row.
 *
 * ── GUARDS (blocking; this script deletes the OLD source of live copy) ──────
 *   1. The `sub_service_pages` row for the same slug must exist and be
 *      `published` — `SubServicePageView` reads published rows only, so without
 *      it the page 404s and this delete would remove the last copy of its text.
 *   2. That row must be FIT TO RENDER: non-empty `hero_heading`, and a `blocks`
 *      array carrying the sections this page has always shown, including the
 *      three Brief 149 added block types for (`relatedServices` + `textSection`).
 *      This is Brief 146's sequencing lesson as an assertion — content lands and
 *      is verified BEFORE the old source goes.
 *   3. The route file must already be repointed. Checked by reading
 *      `src/app/{slug}/page.tsx` for `SubServicePageView`: deleting the category
 *      row while the old route still merges from it would blank the hero.
 *
 * A tripped guard prints a banner and exits ZERO on purpose — deploy.yml runs
 * with `script_stop: true`, so a non-zero exit here would abort the build swap
 * and take the site down over a data question. Read the PIPELINE VERDICT block.
 *
 * ── SAFETY ──────────────────────────────────────────────────────────────────
 * SAFE BY DEFAULT: dry run unless invoked with `commit`.
 * BACKUP-FIRST: full `row_to_json` into `brief149_row_backup` + a JSON file.
 * IDEMPOTENT: reports `ALREADY-APPLIED` once both rows are gone.
 *
 * `page_changelog` rows are deliberately KEPT — an audit trail, not content, the
 * same call Briefs 145 and 146 made.
 *
 * ── DEPENDENT ROWS ──────────────────────────────────────────────────────────
 * `service_subcategories.page_slug` has an FK onto `service_category_pages.slug`,
 * and each retired category owns two rows. They are not incidental: they are the
 * DB mirror of the very "More … Solutions" cards this brief moved into the new
 * `relatedServices` block (identical labels, hrefs and descriptions — verified on
 * dev before deleting). With the category row gone they have no page and no
 * reader, so they are backed up and deleted in the same transaction rather than
 * left to block the delete or dangle.
 *
 *   # preview (no writes):
 *   npx ts-node --project tsconfig.scripts.json scripts/retire-brief-149-legacy-sources.ts
 *   # apply:
 *   ... scripts/retire-brief-149-legacy-sources.ts commit
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

const SCRIPT = 'retire-brief-149-legacy-sources';
const mode = resolveRunMode(SCRIPT);

const SLUGS = ['sewer-rodding', 'hydro-jetting'] as const;

/** Block types the consolidated page must carry before its old source may go. */
const REQUIRED_BLOCKS = ['hero', 'intro', 'listSection', 'relatedServices', 'textSection', 'noDripClub'];

class StopAndReport extends Error {}
function stop(msg: string): never {
  throw new StopAndReport(msg);
}

/** Guard 3 — the route must already render from the CMS. */
function routeIsRepointed(slug: string): boolean {
  const file = join(process.cwd(), 'src', 'app', slug, 'page.tsx');
  if (!existsSync(file)) return false;
  return readFileSync(file, 'utf8').includes('SubServicePageView');
}

async function main() {
  const client = await pool.connect();
  try {
    announceMode(SCRIPT, mode);

    await client.query(`
      CREATE TABLE IF NOT EXISTS brief149_row_backup (
        id            SERIAL PRIMARY KEY,
        track         TEXT NOT NULL,
        source_table  TEXT NOT NULL,
        source_id     INTEGER NOT NULL,
        slug          TEXT NOT NULL,
        reason        TEXT NOT NULL,
        row_json      JSONB NOT NULL,
        backed_up_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);

    const doomed: Array<{ slug: string; id: number; row_json: Record<string, unknown> }> = [];
    const doomedSubcats: Array<{ slug: string; id: number; row_json: Record<string, unknown> }> = [];

    for (const slug of SLUGS) {
      const cat = (
        await client.query<{ id: number; row_json: Record<string, unknown> }>(
          `SELECT id, row_to_json(t)::jsonb AS row_json FROM service_category_pages t WHERE slug = $1`,
          [slug]
        )
      ).rows[0];

      if (!cat) {
        console.log(`already-applied: no service_category_pages row for "${slug}".`);
        continue;
      }

      // ── Guard 3 first: cheapest, and a "no" means the release is half-applied.
      if (!routeIsRepointed(slug)) {
        stop(
          `src/app/${slug}/page.tsx does not render SubServicePageView yet, so it still merges ` +
            `from service_category_pages. Deleting that row now would blank the page's hero.`
        );
      }

      // ── Guard 1 + 2: the new source must be fit to serve the page.
      const sub = (
        await client.query<{
          id: number;
          status: string;
          hero_heading: string | null;
          blocks: Array<{ type: string }> | null;
        }>(
          `SELECT id, status, hero_heading, blocks FROM sub_service_pages WHERE slug = $1`,
          [slug]
        )
      ).rows[0];

      if (!sub) stop(`no sub_service_pages row for "${slug}" — nothing would render after the delete.`);
      if (sub.status !== 'published') {
        stop(`sub_service_pages "${slug}" is "${sub.status}", not published — /${slug} would 404.`);
      }
      if (!sub.hero_heading || sub.hero_heading.trim() === '') {
        stop(
          `sub_service_pages "${slug}" has an empty hero_heading. Run ` +
            'seed-brief-149-subservice-consolidation.ts first — this is the Brief 146 failure ' +
            '(a route repointed onto a row nothing had filled).'
        );
      }
      const types = (sub.blocks ?? []).map((b) => b.type);
      const missing = REQUIRED_BLOCKS.filter((t) => !types.includes(t));
      if (missing.length) {
        stop(
          `sub_service_pages "${slug}" is missing block(s) [${missing.join(', ')}] — the page would ` +
            `render without ${missing.length} section(s) it shows today. Order is: ${types.join(', ') || '(none)'}. ` +
            'Run seed-brief-149-subservice-consolidation.ts first.'
        );
      }

      console.log(
        `guard OK — /${slug}: route repointed; sub_service_pages id ${sub.id} published with ` +
          `${types.length} blocks (${types.join(' · ')}).`
      );
      doomed.push({ slug, id: cat.id, row_json: cat.row_json });

      // Dependent rows — see the DEPENDENT ROWS note in the header.
      const subcats = (
        await client.query<{ id: number; label: string; href: string; row_json: Record<string, unknown> }>(
          `SELECT id, label, href, row_to_json(t)::jsonb AS row_json
             FROM service_subcategories t WHERE page_slug = $1 ORDER BY sort_order, id`,
          [slug]
        )
      ).rows;
      for (const sc of subcats) {
        console.log(`  dependent service_subcategories id ${sc.id}: "${sc.label}" → ${sc.href}`);
        doomedSubcats.push({ slug, id: sc.id, row_json: sc.row_json });
      }
    }

    if (doomed.length === 0) {
      verdict(SCRIPT, 'ALREADY-APPLIED', 'both legacy category rows are gone');
      return;
    }

    console.log(
      `\nwould delete service_category_pages ${doomed.map((d) => `${d.slug} (id ${d.id})`).join(', ')}` +
        ` + ${doomedSubcats.length} dependent service_subcategories row(s).`
    );

    if (mode !== 'commit') {
      console.log('No changes were written. Re-run with `commit` to apply.');
      verdict(SCRIPT, 'NOT-APPLIED (dry run)');
      return;
    }

    await client.query('BEGIN');
    try {
      // Dependents first — the FK points this way.
      for (const sc of doomedSubcats) {
        await client.query(
          `INSERT INTO brief149_row_backup (track, source_table, source_id, slug, reason, row_json)
           VALUES ('A/B','service_subcategories',$1,$2,$3,$4)`,
          [
            sc.id,
            sc.slug,
            'dependent on a retired category row; its content now lives in the relatedServices block (Brief 149)',
            sc.row_json,
          ]
        );
        const del = await client.query(`DELETE FROM service_subcategories WHERE id = $1`, [sc.id]);
        if (del.rowCount !== 1) {
          throw new Error(`service_subcategories ${sc.id}: expected to delete 1 row, deleted ${del.rowCount}.`);
        }
      }
      for (const d of doomed) {
        await client.query(
          `INSERT INTO brief149_row_backup (track, source_table, source_id, slug, reason, row_json)
           VALUES ('A/B','service_category_pages',$1,$2,$3,$4)`,
          [d.id, d.slug, 'retired legacy source — the page now renders from sub_service_pages (Brief 149)', d.row_json]
        );
        const del = await client.query(`DELETE FROM service_category_pages WHERE id = $1`, [d.id]);
        if (del.rowCount !== 1) throw new Error(`${d.slug}: expected to delete 1 row, deleted ${del.rowCount}.`);
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    }

    // The six canonical category landing pages must be untouched — they are the
    // only rows this table is still for.
    const left = await client.query<{ slug: string }>(
      `SELECT slug FROM service_category_pages ORDER BY slug`
    );
    console.log(
      `\ndeleted ${doomed.length} row(s). service_category_pages now holds: ${left.rows
        .map((r) => r.slug)
        .join(', ')}`
    );
    for (const slug of SLUGS) {
      if (left.rows.some((r) => r.slug === slug)) throw new Error(`"${slug}" is still present after the delete.`);
    }

    const dir = join(process.cwd(), 'scripts', 'backups');
    mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const file = join(dir, `brief-149-retire-legacy-sources-${mode}-${stamp}.json`);
    writeFileSync(file, JSON.stringify({ mode, generated: stamp, deleted: doomed, deletedSubcategories: doomedSubcats }, null, 2));
    console.log(`log: ${file}`);
    verdict(SCRIPT, 'APPLIED', `${doomed.length} category row(s) + ${doomedSubcats.length} subcategory row(s) deleted`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  if (e instanceof StopAndReport) {
    console.log('\n' + '!'.repeat(72));
    console.log('BRIEF 149 RETIREMENT — STOPPED, NOTHING DELETED');
    console.log(e.message);
    console.log('This is a data condition that needs a human decision, not a deploy failure.');
    console.log('!'.repeat(72) + '\n');
    verdict(SCRIPT, 'NOT-APPLIED (guard tripped)', e.message.split('.')[0]);
    return;
  }
  console.error('FAILED:', e);
  process.exitCode = 1;
});
