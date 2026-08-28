/**
 * Brief 159 (Track D + E2 item 5) — the derived-status drift check and the
 * unpublished-page report. Read-only. Runs on every deploy.
 *
 * ─── The invariant ─────────────────────────────────────────────────────────
 * `page_drafts.is_published` is the source of truth for "is this page live".
 * Each live content row carries a `status` column that MIRRORS it, so the public
 * render path can gate on one indexed column instead of joining `page_drafts` on
 * every request. Being derived, it can drift. The invariant is:
 *
 *     content_row.status = 'published'  ⟺  the page has an is_published version
 *
 * This script REPORTS drift; it does not repair it. An auto-fix would decide, on
 * its own and in a deploy log nobody reads, whether a page should be live —
 * which is the decision this brief just spent a whole track handing to a human.
 *
 * ─── The dark-page report ──────────────────────────────────────────────────
 * It also lists every page currently in `draft`. Silence is how a page stays
 * accidentally dark for a month; the deploy summary should always say the number
 * out loud, even when it is zero.
 *
 * Exit codes: 0 = invariant holds · 1 = drift found (or the query failed).
 * `--warn-only` reports drift without failing, for a deploy step that must not
 * block on it. Not the default: a silent invariant is not an invariant.
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/check-brief-159-status-invariant.ts
 */
import { existsSync, readFileSync } from 'fs';
import { Pool } from 'pg';

const WARN_ONLY = process.argv.includes('--warn-only');

const env = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
const get = (k: string) =>
  process.env[k] || (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim() || '';
const pool = new Pool({
  connectionString: get('DATABASE_URL') || 'postgresql://postgres:jbp@localhost:5432/jbp_cms',
});

/**
 * Each live content table with the SQL for its (canonical page type, page slug)
 * key. Mirrors LIVE_TABLES in src/lib/cms/page-status.ts.
 */
const TABLES: Array<{ pageType: string; table: string; slugExpr: string }> = [
  { pageType: 'city', table: 'city_pages', slugExpr: 'city_slug' },
  { pageType: 'service', table: 'service_category_pages', slugExpr: 'slug' },
  { pageType: 'sub-service', table: 'sub_service_pages', slugExpr: 'slug' },
  { pageType: 'city-service', table: 'city_service_pages', slugExpr: `city_slug || '/' || service_slug` },
  { pageType: 'emergency-plumbing', table: 'emergency_plumbing_page', slugExpr: `'emergency-plumbing'` },
  { pageType: 'main', table: 'main_pages', slugExpr: 'slug' },
  { pageType: 'article', table: 'cms_articles', slugExpr: 'slug' },
];

interface Drift { pageType: string; slug: string; status: string; publishedVersions: number; kind: string }

async function main() {
  const drift: Drift[] = [];
  const dark: Array<{ pageType: string; slug: string }> = [];
  let checked = 0;

  for (const t of TABLES) {
    // One join per table, in the database, rather than 10k round trips.
    // `cms_canonical_page_type` collapses the legacy page_type aliases so a
    // 'city-local' version counts as a version of the city page it addresses.
    const rows = (await pool.query<{ slug: string; status: string; published_versions: string }>(
      `SELECT c.slug, c.status, COALESCE(d.n, 0)::text AS published_versions
         FROM (SELECT ${t.slugExpr} AS slug, status FROM ${t.table}) c
         LEFT JOIN (
              SELECT page_slug, count(*) AS n
                FROM page_drafts
               WHERE is_published AND cms_canonical_page_type(page_type) = $1
               GROUP BY page_slug
         ) d ON d.page_slug = c.slug`,
      [t.pageType]
    )).rows;

    for (const r of rows) {
      checked++;
      const n = parseInt(r.published_versions, 10);
      const live = r.status === 'published';
      if (r.status === 'draft') dark.push({ pageType: t.pageType, slug: r.slug });
      if (live && n !== 1) {
        drift.push({
          pageType: t.pageType, slug: r.slug, status: r.status, publishedVersions: n,
          kind: n === 0 ? 'live row with NO published version' : `live row with ${n} published versions`,
        });
      } else if (!live && n > 0) {
        drift.push({
          pageType: t.pageType, slug: r.slug, status: r.status, publishedVersions: n,
          kind: 'draft row that DOES have a published version',
        });
      }
    }
  }

  console.log(`\nBrief 159 — derived status invariant`);
  console.log(`  pages checked: ${checked}`);
  console.log(`  drift found  : ${drift.length}`);
  if (drift.length) {
    console.log('\n' + '!'.repeat(72));
    console.log('STATUS INVARIANT DRIFT — content_row.status disagrees with page_drafts.is_published.');
    console.log('This is NOT auto-repaired: whether a page should be live is an editorial');
    console.log('decision. Fix it in the CMS (publish or unpublish the intended version).');
    for (const d of drift.slice(0, 50)) {
      console.log(`  ✗ ${d.pageType}/${d.slug} — status='${d.status}', ${d.kind}`);
    }
    if (drift.length > 50) console.log(`  … and ${drift.length - 50} more`);
    console.log('!'.repeat(72));
  }

  console.log(`\nBrief 159 — UNPUBLISHED PAGES: ${dark.length}`);
  for (const d of dark) console.log(`  · ${d.pageType}/${d.slug}`);
  if (dark.length === 0) console.log('  (none — every page is live)');

  if (drift.length > 0 && !WARN_ONLY) {
    process.exitCode = 1;
  }
}

main()
  .catch((e) => {
    console.error(`check-brief-159-status-invariant FAILED: ${e instanceof Error ? e.message : String(e)}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
