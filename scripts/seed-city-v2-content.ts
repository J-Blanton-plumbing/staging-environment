/**
 * Brief 209 CMS wiring — load today's City v2 content into the CMS: the 5 City Hubs V2 (+ each city's
 * hub template sections and the parts its 29 service pages share) and the 145 City Service Pages V2,
 * archiving each existing row's pre-v2 content as a past version. The Brief 204 sewer seed, keyed by
 * city.
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/seed-city-v2-content.ts           # dry run
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/seed-city-v2-content.ts --apply   # write
 *   (deploy.sh passes `commit`; in the pipeline a missing choice exits non-zero — Brief 147.)
 *
 * Per page, in order:
 *   1. The row already holds v2 content → "already seeded, no change". NOTHING is written, so a
 *      Marketing edit is never overwritten (this runs on EVERY deploy — the Brief 202 trap).
 *   2. An existing row → its current content is saved, verbatim, as the unpublished version
 *      "Pre-v2 archive (2026-10)" (once; a re-run after a crash finds it and does not repeat).
 *   3. A missing city_service_pages row (Columbus and Tinley Park have none on the local dev DB) →
 *      created with only its keys, the next step publishes it. A missing HUB row is a fault (the five
 *      hubs are live pages with rows).
 *   4. The code module → a v2 version ("Version 1 — City v2") through `createDraft` (sanitised and
 *      layout-checked like any editor save), published through `publishDraft` — so `status` is set
 *      by its one writer and the version history is correct.
 *   5. Asserts: status 'published', v2 content present, exactly that version live.
 * Hubs go first: a hub publish carries the city's shared service-page parts.
 *
 * Exit codes (Brief 186): non-zero ONLY for a code/schema fault or a write this run attempted that did
 * not land. Editor-causable state (a page Marketing unpublished, edited copy) is reported, exit 0.
 */
import pool from '../src/lib/db';
import { createDraft, publishDraft } from '../src/lib/cms/drafts';
import { CITY_V2_CITIES, CITY_V2_SERVICES } from '../src/lib/content/city-services-v2/registry';
import { CITY_V2_TEMPLATE, PRE_V2_ARCHIVE_LABEL, type CityV2DraftContent } from '../src/lib/city-v2-cms/model';
import { codeHubMeta, codeHubStored, codeServiceMeta, codeServiceStored } from '../src/lib/city-v2-cms/code-defaults';
import { inPipeline, resolveRunMode, verdict } from './lib/run-mode';

const SCRIPT = 'seed-city-v2-content';
const argv = process.argv.slice(2);
const wantsCommit = argv.some((a) => ['commit', '--commit', 'apply', '--apply'].includes(a));
const wantsDry = argv.some((a) => ['dry', '--dry', 'dry-run', '--dry-run'].includes(a));
// The mode is the FIRST line this script prints (Brief 204 hard rule 8).
console.log(wantsCommit && !wantsDry ? 'APPLY — writing' : 'DRY RUN — nothing written');
const mode = resolveRunMode(SCRIPT, argv);

const V2_LABEL = 'Version 1 — City v2';

interface Page {
  pageType: 'city' | 'city-service';
  slug: string;
  city: string;
  service?: string;
  path: string;
}
const PAGES: Page[] = [
  ...CITY_V2_CITIES.map((city): Page => ({ pageType: 'city', slug: city, city, path: `/${city}` })),
  ...CITY_V2_CITIES.flatMap((city) =>
    CITY_V2_SERVICES.map((service): Page => ({ pageType: 'city-service', slug: `${city}/${service}`, city, service, path: `/${city}/${service}` }))
  ),
];

function v2ContentFor(p: Page): CityV2DraftContent {
  if (p.pageType === 'city') {
    const m = codeHubMeta(p.city)!;
    return { template: CITY_V2_TEMPLATE, cityV2: codeHubStored(p.city)!, metaTitle: m.title, metaDescription: m.description };
  }
  const m = codeServiceMeta(p.city, p.service!)!;
  return { template: CITY_V2_TEMPLATE, cityV2: codeServiceStored(p.city, p.service!)!, metaTitle: m.title, metaDescription: m.description };
}

const rowSql = (p: Page) =>
  p.pageType === 'city'
    ? { sql: 'FROM city_pages WHERE city_slug = $1', params: [p.city] }
    : { sql: 'FROM city_service_pages WHERE city_slug = $1 AND service_slug = $2', params: [p.city, p.service] };

/**
 * The row's pre-v2 content: every column verbatim under `_archive`, plus the meta fields in the old
 * editors' own key names, so nothing is lost even where an editor shape would be lossy.
 */
async function legacySnapshot(p: Page): Promise<Record<string, unknown>> {
  const { sql, params } = rowSql(p);
  const raw = (await pool.query(`SELECT * ${sql}`, params)).rows[0] as Record<string, unknown>;
  const { v2_content: _drop, ...columns } = raw;
  void _drop;
  return {
    metaTitle: raw.meta_title,
    metaDescription: raw.meta_description,
    _archive: {
      table: p.pageType === 'city' ? 'city_pages' : 'city_service_pages',
      rowId: raw.id,
      rowVersion: raw.version,
      capturedAt: new Date().toISOString(),
      brief: 209,
      columns,
    },
  };
}

type Outcome = 'already' | 'seeded' | 'would-seed' | 'unpublished' | 'failed';

async function seedPage(p: Page, authorId: number): Promise<{ outcome: Outcome; detail: string }> {
  const { sql, params } = rowSql(p);
  const row = (await pool.query<{ id: number; status: string; version: number; has_v2: boolean }>(
    `SELECT id, status, version, (v2_content IS NOT NULL) AS has_v2 ${sql}`,
    params
  )).rows[0];

  if (row?.has_v2) {
    if (row.status !== 'published') return { outcome: 'unpublished', detail: `already seeded, no change — row is '${row.status}' (an editor unpublished it; left alone)` };
    return { outcome: 'already', detail: 'already seeded, no change' };
  }

  const archiveExists = row
    ? (await pool.query(`SELECT 1 FROM page_drafts WHERE page_type = $1 AND page_slug = $2 AND label = $3`, [p.pageType, p.slug, PRE_V2_ARCHIVE_LABEL])).rowCount! > 0
    : false;
  const plan = [
    row ? (archiveExists ? `archive "${PRE_V2_ARCHIVE_LABEL}" already present` : `archive row ${row.id} as "${PRE_V2_ARCHIVE_LABEL}"`) : 'create the row',
    `create + publish "${V2_LABEL}"`,
  ].join('; ');
  if (mode === 'dry') return { outcome: 'would-seed', detail: `would ${plan}` };

  // 2. archive the pre-v2 content (verbatim, unpublished).
  if (row && !archiveExists) {
    const snapshot = await legacySnapshot(p);
    await pool.query(
      `INSERT INTO page_drafts (page_type, page_slug, label, content, created_by, base_version)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [p.pageType, p.slug, PRE_V2_ARCHIVE_LABEL, JSON.stringify(snapshot), authorId, row.version]
    );
  }
  // 3. create a missing service-page row (keys only; the legacy columns keep their defaults).
  if (!row) {
    if (p.pageType === 'city') throw new Error(`no city_pages row for "${p.city}" — the five city hubs are expected to exist`);
    const m = codeServiceMeta(p.city, p.service!)!;
    await pool.query(
      `INSERT INTO city_service_pages (city_slug, service_slug, meta_title, meta_description, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [p.city, p.service, m.title, m.description]
    );
  }
  // 4. the v2 version, through the same path an editor's save + publish takes.
  const draft = await createDraft({
    pageType: p.pageType, pageSlug: p.slug, label: V2_LABEL, content: v2ContentFor(p), createdBy: authorId, templateType: CITY_V2_TEMPLATE,
  });
  await publishDraft(draft.id, authorId);

  // 5. assert what this run wrote actually landed.
  const after = (await pool.query<{ status: string; has_v2: boolean }>(`SELECT status, (v2_content IS NOT NULL) AS has_v2 ${sql}`, params)).rows[0];
  const live = (await pool.query<{ id: number }>(`SELECT id FROM page_drafts WHERE page_type = $1 AND page_slug = $2 AND is_published`, [p.pageType, p.slug])).rows;
  if (!after || after.status !== 'published' || !after.has_v2 || live.length !== 1 || live[0].id !== draft.id) {
    return { outcome: 'failed', detail: `wrote but did not land: ${JSON.stringify({ ...after, live: live.map((l) => l.id) })} (expected published, v2 content, live version ${draft.id})` };
  }
  return { outcome: 'seeded', detail: `${plan} → live version #${draft.id}` };
}

async function main() {
  console.log(`${SCRIPT} — Brief 209 City v2 → CMS${inPipeline() ? ' [pipeline]' : ''}\n`);
  const authorId = (await pool.query<{ id: number }>(`SELECT id FROM cms_users ORDER BY id LIMIT 1`)).rows[0]?.id;
  if (!authorId) throw new Error('no cms_users row to author the versions');

  const results: [Page, { outcome: Outcome; detail: string }][] = [];
  for (const p of PAGES) {
    let r: { outcome: Outcome; detail: string };
    try {
      r = await seedPage(p, authorId);
    } catch (err) {
      r = { outcome: 'failed', detail: err instanceof Error ? err.message : String(err) };
    }
    results.push([p, r]);
    console.log(`  ${p.path.padEnd(52)} ${r.outcome.toUpperCase().padEnd(11)} ${r.detail}`);
  }

  const failed = results.filter(([, r]) => r.outcome === 'failed');
  const seeded = results.filter(([, r]) => r.outcome === 'seeded').length;
  const unpublished = results.filter(([, r]) => r.outcome === 'unpublished');
  if (unpublished.length) {
    console.log(`\n  i ${unpublished.length} page(s) hold v2 content but are unpublished — editor state, left alone (they 404 until published in /admin).`);
  }
  if (failed.length) {
    console.error(`\n!!!! ${SCRIPT}: ${failed.length} write(s) did not land:\n${failed.map(([p, r]) => `  ${p.path}: ${r.detail}`).join('\n')}`);
    verdict(SCRIPT, 'FAILED', `${failed.length} page(s) did not end up published with v2 content`);
    process.exitCode = 1;
  } else if (mode === 'dry') {
    verdict(SCRIPT, 'NOT-APPLIED (dry run)', `${results.filter(([, r]) => r.outcome === 'would-seed').length} page(s) would be seeded`);
  } else if (seeded === 0) {
    verdict(SCRIPT, 'ALREADY-APPLIED', `already seeded, no change (all ${PAGES.length} hold v2 content)`);
  } else {
    verdict(SCRIPT, 'APPLIED', `${seeded} page(s) seeded and published, ${results.length - seeded} already seeded`);
  }
}

main()
  .catch((err) => {
    console.error(`\n!!!! ${SCRIPT} crashed:`, err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
