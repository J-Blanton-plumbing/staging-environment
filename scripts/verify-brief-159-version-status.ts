/**
 * Brief 159 (Track F) — the assertion suite for the version-status model.
 *
 * Follows the Brief 147 probe pattern: build a THROWAWAY page that has no public
 * route and cannot reach a sitemap, exercise the real code paths against it, and
 * delete it on EVERY exit path. Nothing here touches a page a visitor can see.
 *
 * The probe row is a `sub_service_pages` row on a slug that is not in
 * `SUB_SERVICE_ROUTES`, so:
 *   • no `src/app/{slug}/page.tsx` exists → no public route,
 *   • `pagesSitemapPaths()` is derived from SUB_SERVICE_ROUTES → cannot be listed,
 *   • it carries the same `status` column the render gate reads, so the derived
 *     invariant is exercised for real rather than simulated.
 *
 * The assertions that are about the BROWSER (4 and 5's UI half) are covered by
 * their data-layer equivalents here plus the manual QA pass recorded in the
 * report — a headless browser is not available in this pipeline.
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/verify-brief-159-version-status.ts
 */
import { existsSync, readFileSync } from 'fs';
import { Pool } from 'pg';

const env = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
const get = (k: string) =>
  process.env[k] || (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim() || '';

const CONNECTION = get('DATABASE_URL') || 'postgresql://postgres:jbp@localhost:5432/jbp_cms';
// This suite imports the REAL `src/lib/cms/*` modules — that is the whole point,
// it exercises the shipped code paths rather than a re-implementation — and those
// modules build their pool from `process.env.DATABASE_URL` at import time. Next
// loads `.env.local` for them; a bare ts-node process does not, so put it there
// before the first dynamic import below.
process.env.DATABASE_URL = CONNECTION;

const pool = new Pool({ connectionString: CONNECTION });

const PROBE_SLUG = 'brief-159-probe-page-do-not-publish';
const PAGE_TYPE = 'sub-service';

let passed = 0;
let failed = 0;
const results: Array<{ n: string; ok: boolean; detail: string }> = [];

function assert(n: string, ok: boolean, detail = '') {
  results.push({ n, ok, detail });
  if (ok) passed++; else failed++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${n}${detail ? ` — ${detail}` : ''}`);
}

/* ── The code under test, imported lazily so a schema problem reports as an
      assertion failure rather than a module-load crash. ────────────────────── */
type Drafts = typeof import('../src/lib/cms/drafts');
type PageStatus = typeof import('../src/lib/cms/page-status');

async function main() {
  const drafts: Drafts = await import('../src/lib/cms/drafts');
  const pageStatus: PageStatus = await import('../src/lib/cms/page-status');

  const userId = (await pool.query<{ id: number }>('SELECT id FROM cms_users ORDER BY id LIMIT 1')).rows[0]?.id;
  if (!userId) throw new Error('no cms_users row to author probe versions with');

  // ── Build the throwaway page ────────────────────────────────────────────
  await pool.query(
    `INSERT INTO sub_service_pages (slug, title, status) VALUES ($1, 'Brief 159 probe', 'published')
     ON CONFLICT (slug) DO UPDATE SET status = 'published'`,
    [PROBE_SLUG]
  );

  console.log('\n── Track F assertions ─────────────────────────────────────────');

  // 1 — a newly created version is a Draft the moment it exists.
  const a = await drafts.createDraft({
    pageType: PAGE_TYPE, pageSlug: PROBE_SLUG, label: 'Probe A',
    content: { title: 'Brief 159 probe', metaTitle: 'A', metaDescription: '', blocks: [] },
    createdBy: userId,
  });
  assert('1. createDraft produces a DRAFT', a.is_published === false, `is_published=${a.is_published}`);

  // Publish A first, THEN create B. Order matters and is the realistic editor
  // flow: publishing bumps the live row's `version`, so a version created before
  // that publish is genuinely stale and Brief 75's DP-2 guard blocks it — as it
  // should. Creating B afterwards gives it a current baseline, exactly as the
  // editor does when it saves a new version off the live page.
  await drafts.publishDraft(a.id, userId);

  const b = await drafts.createDraft({
    pageType: PAGE_TYPE, pageSlug: PROBE_SLUG, label: 'Probe B',
    content: { title: 'Brief 159 probe', metaTitle: 'B', metaDescription: '', blocks: [] },
    createdBy: userId,
  });
  assert('1b. a version created while another is live is still a DRAFT', b.is_published === false, `is_published=${b.is_published}`);

  // 2 — publishing B clears the flag on A, in one transaction.
  const pubB = await drafts.publishDraft(b.id, userId);
  const [rowA, rowB] = await Promise.all([drafts.getDraft(a.id), drafts.getDraft(b.id)]);
  assert(
    '2. publishing B demotes A, exactly one Published remains',
    rowA?.is_published === false && rowB?.is_published === true,
    `A=${rowA?.is_published} B=${rowB?.is_published}`
  );
  assert(
    '2b. publish returns publishedDraftId (Track B)',
    pubB.publishedDraftId === b.id,
    `publishedDraftId=${pubB.publishedDraftId}`
  );

  // 3 — the database, not the application, forbids two Published versions.
  let indexBlocked = false;
  let indexErr = '';
  try {
    await pool.query('UPDATE page_drafts SET is_published = TRUE WHERE id = $1', [a.id]);
  } catch (e) {
    indexBlocked = true;
    indexErr = (e as { code?: string }).code ?? '';
  }
  assert(
    '3. a direct UPDATE setting a second version Published FAILS on the partial unique index',
    indexBlocked && indexErr === '23505',
    indexBlocked ? `postgres ${indexErr}` : 'the UPDATE SUCCEEDED — the index is missing'
  );

  // 4/5 (data half) — switching + saving writes to the selected version only and
  // leaves the other byte-identical. The UI half (the form re-seeds, the Status
  // row repaints) is the manual QA pass in the report; this is the invariant the
  // UI depends on.
  const beforeA = JSON.stringify((await drafts.getDraft(a.id))!.content);
  await drafts.updateDraftContent(b.id, { title: 'Brief 159 probe', metaTitle: 'B-EDITED', metaDescription: '', blocks: [] }, (await drafts.getDraft(b.id))!.version);
  const afterA = JSON.stringify((await drafts.getDraft(a.id))!.content);
  const afterB = (await drafts.getDraft(b.id))!.content as { metaTitle?: string };
  assert(
    '5. saving the active version writes to it and leaves the other byte-identical',
    afterA === beforeA && afterB.metaTitle === 'B-EDITED',
    `A unchanged=${afterA === beforeA}, B.metaTitle=${afterB.metaTitle}`
  );

  // 6 — deleting the Published version is refused server-side.
  let deleteRefused = false;
  let deleteMsg = '';
  try {
    await drafts.deleteDraft(b.id, userId);
  } catch (e) {
    deleteRefused = true;
    deleteMsg = e instanceof Error ? e.message : String(e);
  }
  assert(
    '6. deleteDraft refuses to delete the live version',
    deleteRefused && /currently live/i.test(deleteMsg),
    deleteRefused ? deleteMsg : 'the DELETE SUCCEEDED'
  );

  // 9 — setting a NON-live version to Draft is inert.
  const snapshotBefore = await pool.query(
    `SELECT id, is_published FROM page_drafts WHERE page_slug = $1 ORDER BY id`, [PROBE_SLUG]
  );
  const statusBefore = await pageStatus.getLivePageStatus(PAGE_TYPE, PROBE_SLUG);
  let inertRefused = false;
  try {
    await drafts.unpublishDraft(a.id, userId);
  } catch {
    inertRefused = true;
  }
  const snapshotAfter = await pool.query(
    `SELECT id, is_published FROM page_drafts WHERE page_slug = $1 ORDER BY id`, [PROBE_SLUG]
  );
  const statusAfter = await pageStatus.getLivePageStatus(PAGE_TYPE, PROBE_SLUG);
  assert(
    '9. unpublishing a version that is NOT live is inert — nothing changes anywhere',
    inertRefused &&
      JSON.stringify(snapshotBefore.rows) === JSON.stringify(snapshotAfter.rows) &&
      statusBefore === statusAfter && statusAfter === 'published',
    `refused=${inertRefused} status ${statusBefore}→${statusAfter}`
  );

  // 7 (data half) — unpublishing the live version takes the page dark: the
  // derived column reads 'draft' and the render gate says not live. The HTTP
  // half (route 404s, absent from both sitemaps) is asserted by the live
  // canary/validator on deploy and by the manual QA pass.
  await drafts.unpublishDraft(b.id, userId);
  const darkStatus = await pageStatus.getLivePageStatus(PAGE_TYPE, PROBE_SLUG);
  const darkLive = await pageStatus.isPageLive(PAGE_TYPE, PROBE_SLUG);
  const darkRows = await pool.query<{ n: string }>(
    `SELECT count(*)::text AS n FROM page_drafts WHERE page_slug = $1 AND is_published`, [PROBE_SLUG]
  );
  assert(
    '7. unpublishing the live version → derived status = draft, render gate closed, zero Published versions',
    darkStatus === 'draft' && darkLive === false && darkRows.rows[0].n === '0',
    `status=${darkStatus} isPageLive=${darkLive} published_versions=${darkRows.rows[0].n}`
  );
  const darkPages = await pageStatus.listUnpublishedPages();
  assert(
    '7b. the unpublished page appears in the deploy dark-page report (E2 item 5)',
    darkPages.some((p) => p.pageSlug === PROBE_SLUG),
    `${darkPages.length} page(s) reported dark`
  );

  // 8 — re-publishing brings it straight back, byte-identical.
  //
  // B is republished, i.e. the exact mis-click undo E3 is about. That works with
  // no extra step because `unpublishDraft` deliberately does NOT bump the live
  // row's `version` (a status flip changes no content), so B's `base_version`
  // still matches and Brief 75's staleness guard has nothing to complain about.
  // Publishing a DIFFERENT, older version of a dark page still trips that guard —
  // correctly: that version genuinely predates live edits, and the guard's own
  // "review the differences" message is the right answer there.
  const contentBeforeRoundTrip = JSON.stringify((await drafts.getDraft(b.id))!.content);
  await drafts.publishDraft(b.id, userId);
  const backStatus = await pageStatus.getLivePageStatus(PAGE_TYPE, PROBE_SLUG);
  const backLive = await pageStatus.isPageLive(PAGE_TYPE, PROBE_SLUG);
  const contentAfterRoundTrip = JSON.stringify((await drafts.getDraft(b.id))!.content);
  assert(
    '8. re-publishing restores the page, content byte-identical across the round trip',
    backStatus === 'published' && backLive === true && contentBeforeRoundTrip === contentAfterRoundTrip,
    `status=${backStatus} identical=${contentBeforeRoundTrip === contentAfterRoundTrip}`
  );

  // 10 — server-side refusals on the pages that must never go dark.
  const guardHome = pageStatus.checkUnpublishAllowed('main', 'home');
  const guardCategory = pageStatus.checkUnpublishAllowed('service', 'plumbing');
  assert('10a. unpublish refused on the home page', !guardHome.allowed, guardHome.reason ?? '');
  assert('10b. unpublish refused on a top-level service category', !guardCategory.allowed, guardCategory.reason ?? '');

  // A real redirect target, taken from the live redirect map rather than guessed.
  const targets = Array.from(pageStatus.redirectTargets());
  const cityTarget = targets.find((t) => /^\/[a-z0-9-]+$/.test(t) && !pageStatus.NEVER_UNPUBLISHABLE_PATHS.includes(t));
  if (cityTarget) {
    const guardRedirect = pageStatus.checkUnpublishAllowed('city', cityTarget.slice(1));
    assert(
      '10c. unpublish refused on a live 301 target',
      !guardRedirect.allowed && /redirect/i.test(guardRedirect.reason ?? ''),
      `${cityTarget}: ${guardRedirect.reason ?? 'ALLOWED'}`
    );
  } else {
    assert('10c. unpublish refused on a live 301 target', false, 'no single-segment redirect target found in the map');
  }

  // 13 — no content row anywhere is 'draft' except the probe we deliberately
  // toggled (which is republished by now).
  const stray: string[] = [];
  for (const table of pageStatus.STATUS_CONTENT_TABLES) {
    const r = await pool.query<{ n: string }>(`SELECT count(*)::text AS n FROM ${table} WHERE status <> 'published'`);
    if (r.rows[0].n !== '0') stray.push(`${table}=${r.rows[0].n}`);
  }
  assert('13. zero content rows are not `published`', stray.length === 0, stray.join(', ') || 'all clean');

  // 14 — the derived invariant holds everywhere.
  let drift = 0;
  for (const [pt, tbl, slugExpr] of [
    ['city', 'city_pages', 'city_slug'],
    ['service', 'service_category_pages', 'slug'],
    ['sub-service', 'sub_service_pages', 'slug'],
    ['city-service', 'city_service_pages', `city_slug || '/' || service_slug`],
    ['emergency-plumbing', 'emergency_plumbing_page', `'emergency-plumbing'`],
    ['main', 'main_pages', 'slug'],
    ['article', 'cms_articles', 'slug'],
  ] as const) {
    const r = await pool.query<{ n: string }>(
      `SELECT count(*)::text AS n FROM (
         SELECT c.status, COALESCE(d.n, 0) AS pub FROM (SELECT ${slugExpr} AS slug, status FROM ${tbl}) c
         LEFT JOIN (SELECT page_slug, count(*) AS n FROM page_drafts
                     WHERE is_published AND cms_canonical_page_type(page_type) = $1
                     GROUP BY page_slug) d ON d.page_slug = c.slug
       ) x WHERE (x.status = 'published') <> (x.pub = 1)`,
      [pt]
    );
    drift += parseInt(r.rows[0].n, 10);
  }
  assert('14. derived invariant holds: status = published IFF exactly one Published version', drift === 0, `${drift} row(s) drifted`);
}

async function cleanup() {
  // Every exit path. The probe row and its versions must never survive a run —
  // a stray `is_published` row would corrupt assertion 14 on the next one.
  try {
    await pool.query('UPDATE page_drafts SET is_published = FALSE WHERE page_slug = $1', [PROBE_SLUG]);
    await pool.query('DELETE FROM page_drafts WHERE page_slug = $1', [PROBE_SLUG]);
    await pool.query('DELETE FROM page_changelog WHERE page_slug = $1', [PROBE_SLUG]);
    await pool.query('DELETE FROM sub_service_pages WHERE slug = $1', [PROBE_SLUG]);
    console.log(`\ncleanup: probe page "${PROBE_SLUG}" and its versions removed.`);
  } catch (e) {
    console.error(`\nCLEANUP FAILED — remove "${PROBE_SLUG}" by hand:`, e instanceof Error ? e.message : e);
  }
}

main()
  .catch((e) => {
    console.error('\nSUITE ERROR:', e instanceof Error ? e.stack : e);
    failed++;
  })
  .finally(async () => {
    await cleanup();
    console.log(`\n── Result: ${passed} passed, ${failed} failed ─────────────────────`);
    if (failed > 0) process.exitCode = 1;
    await pool.end();
  });
