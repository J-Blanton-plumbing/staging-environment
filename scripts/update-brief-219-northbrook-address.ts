/**
 * Brief 219 (Track B) — the Northbrook office address reads `1945 Techny Road, #11` everywhere it is an
 * office address (Marketing decision 2, 2026-10-26), matching Global Settings, the footer and the
 * homepage Organization. Before this, the Northbrook City Hub and its 29 City Service V2 pages said
 * "Suite 11":
 *   • the hub's office address (visible block + its Plumber `#office` node, which all 29 service pages
 *     also emit) and the office sentence above it;
 *   • each service page's closing-panel sentence ("Our Northbrook office is at …") and its stored
 *     fallback Service `provider` address (rendered only for a hub without a GBP link).
 *
 * The exact string `1945 Techny Road, Suite 11` is replaced by `1945 Techny Road, #11`, nothing else.
 * Prose that names Techny Road without the suite ("our headquarters on Techny Road") is not an
 * address and is left alone; any other "Suite 11" in the database is listed, never changed.
 *
 * Per page, like Brief 216: the live content is patched, run through the editor's own checks
 * (`conformCityHubContent` / `conformCityServiceV2Content`), saved as a NEW VERSION and PUBLISHED
 * (version bump; older versions stay in history). Guards (Brief 186 — editor state is reported, exit
 * 0): a page that isn't a published City Hub / V2 row is left alone; a page without the old string
 * is ALREADY-APPLIED; every page is read back after publishing.
 *
 * `--changed-file <path>`: appends `northbrook` when a page changed, so the CITY PAGES LIVE CHECK
 * expects the Northbrook pages' markup to change this deploy.
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/update-brief-219-northbrook-address.ts          # dry run
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/update-brief-219-northbrook-address.ts commit   # apply
 */
import { appendFileSync, existsSync, readFileSync } from 'fs';

if (!process.env.DATABASE_URL && existsSync('.env.local')) {
  const m = readFileSync('.env.local', 'utf8').match(/^DATABASE_URL=(.*)$/m);
  if (m) process.env.DATABASE_URL = m[1].trim();
}

/* eslint-disable import/first */
import pool from '../src/lib/db';
import { createDraft, publishDraft } from '../src/lib/cms/drafts';
import { conformCityHubContent } from '../src/lib/cms/city-hubs-write';
import { conformCityServiceV2Content } from '../src/lib/cms/city-services-v2-write';
import { CITY_HUB_TEMPLATE, type CityHubDraftContent, type CityHubStored } from '../src/lib/city-hub-cms/model';
import { CITY_SERVICE_V2_TEMPLATE, type CityServiceV2DraftContent } from '../src/lib/city-service-v2-cms/model';
import { authorId } from './lib/city-pages-seed';
import { resolveRunMode, announceMode, verdict } from './lib/run-mode';

const SCRIPT = 'update-brief-219-northbrook-address';
const argv = process.argv.slice(2);
const mode = resolveRunMode(SCRIPT, argv);
const changedFileIdx = argv.indexOf('--changed-file');
const changedFile = changedFileIdx >= 0 ? argv[changedFileIdx + 1] : null;

const CITY = 'northbrook';
const OLD = '1945 Techny Road, Suite 11';
const NEW = '1945 Techny Road, #11';
const LABEL = 'Northbrook address #11 (Brief 219, 2026-10)';

type Outcome = 'loaded' | 'already' | 'would-load' | 'not-applied' | 'failed';
const swap = <T>(v: T): T => JSON.parse(JSON.stringify(v).split(OLD).join(NEW)) as T;
const count = (v: unknown) => JSON.stringify(v ?? null).split(OLD).length - 1;

async function nextLabel(pageType: string, slug: string): Promise<string> {
  const n = Number((await pool.query<{ n: string }>(`SELECT count(*) AS n FROM page_drafts WHERE page_type = $1 AND page_slug = $2`, [pageType, slug])).rows[0].n) + 1;
  return `Version ${n} — ${LABEL}`;
}

async function hub(by: number, apply: boolean): Promise<{ outcome: Outcome; detail: string }> {
  const row = (
    await pool.query<{ status: string; template_type: string | null; hub: CityHubStored | null; mt: string | null; md: string | null }>(
      `SELECT status, template_type, hub_content AS hub, meta_title AS mt, meta_description AS md FROM city_pages WHERE city_slug = $1`,
      [CITY]
    )
  ).rows[0];
  if (!row || row.template_type !== CITY_HUB_TEMPLATE || !row.hub || row.status !== 'published') {
    return { outcome: 'not-applied', detail: `not a published City Hub row with hub content (${row ? `${row.status}, ${row.template_type}` : 'no row'}) — left alone` };
  }
  const n = count(row.hub);
  if (!n) return { outcome: 'already', detail: 'no "Suite 11" address, no change' };
  const draft: CityHubDraftContent = { template: CITY_HUB_TEMPLATE, hub: swap(row.hub), metaTitle: row.mt ?? '', metaDescription: row.md ?? '' };
  const clean = conformCityHubContent(CITY, draft);
  if (!apply) return { outcome: 'would-load', detail: `would publish "${LABEL}" (${n} occurrence(s))` };
  const id = (await createDraft({ pageType: 'city', pageSlug: CITY, label: await nextLabel('city', CITY), content: clean, createdBy: by, templateType: CITY_HUB_TEMPLATE })).id;
  await publishDraft(id, by);
  const after = (await pool.query<{ hub: CityHubStored }>(`SELECT hub_content AS hub FROM city_pages WHERE city_slug = $1`, [CITY])).rows[0]?.hub;
  if (count(after) || !JSON.stringify(after).includes(NEW)) return { outcome: 'failed', detail: `published version #${id} but the live row still holds "Suite 11" or lacks "#11"` };
  return { outcome: 'loaded', detail: `published version #${id} (${n} occurrence(s))` };
}

async function service(service: string, by: number, apply: boolean): Promise<{ outcome: Outcome; detail: string }> {
  const slug = `${CITY}/${service}`;
  const row = (
    await pool.query<{ status: string; v2: CityServiceV2DraftContent['page'] | null; mt: string | null; md: string | null }>(
      `SELECT status, v2_content AS v2, meta_title AS mt, meta_description AS md FROM city_service_pages WHERE city_slug = $1 AND service_slug = $2`,
      [CITY, service]
    )
  ).rows[0];
  if (!row || !row.v2 || row.status !== 'published') return { outcome: 'not-applied', detail: `not a published City Service V2 row (${row ? row.status : 'no row'}) — left alone` };
  const n = count(row.v2);
  if (!n) return { outcome: 'already', detail: 'no "Suite 11" address, no change' };
  const draft: CityServiceV2DraftContent = { template: CITY_SERVICE_V2_TEMPLATE, page: swap(row.v2), metaTitle: row.mt ?? '', metaDescription: row.md ?? '' };
  const clean = conformCityServiceV2Content(slug, draft, row.v2);
  if (!apply) return { outcome: 'would-load', detail: `would publish "${LABEL}" (${n} occurrence(s))` };
  const id = (await createDraft({ pageType: 'city-service', pageSlug: slug, label: await nextLabel('city-service', slug), content: clean, createdBy: by, templateType: CITY_SERVICE_V2_TEMPLATE })).id;
  await publishDraft(id, by);
  const after = (await pool.query<{ v2: unknown }>(`SELECT v2_content AS v2 FROM city_service_pages WHERE city_slug = $1 AND service_slug = $2`, [CITY, service])).rows[0]?.v2;
  if (count(after) || !JSON.stringify(after).includes(NEW)) return { outcome: 'failed', detail: `published version #${id} but the live row still holds "Suite 11" or lacks "#11"` };
  return { outcome: 'loaded', detail: `published version #${id} (${n} occurrence(s))` };
}

async function main() {
  announceMode(SCRIPT, mode);
  const apply = mode === 'commit';
  const by = await authorId();
  const results: Array<{ path: string; outcome: Outcome; detail: string }> = [];
  results.push({ path: `/${CITY}`, ...(await hub(by, apply)) });
  const services = (await pool.query<{ s: string }>(`SELECT service_slug AS s FROM city_service_pages WHERE city_slug = $1 AND v2_content IS NOT NULL ORDER BY service_slug`, [CITY])).rows.map((r) => r.s);
  for (const s of services) results.push({ path: `/${CITY}/${s}`, ...(await service(s, by, apply)) });
  for (const r of results) console.log(`  ${r.outcome.padEnd(11)} ${r.path} — ${r.detail}`);

  // Report-only: every other "Suite 11" in a content table (not changed by this script).
  const other = await pool.query<{ t: string; k: string; s: string }>(
    `SELECT 'city_pages' AS t, city_slug AS k, substring(row_to_json(c)::text from '.{0,60}Suite 11.{0,40}') AS s FROM city_pages c WHERE city_slug <> $1 AND row_to_json(c)::text ~ 'Suite 11'
     UNION ALL SELECT 'city_service_pages', city_slug || '/' || service_slug, substring(row_to_json(c)::text from '.{0,60}Suite 11.{0,40}') FROM city_service_pages c WHERE city_slug <> $1 AND row_to_json(c)::text ~ 'Suite 11'
     UNION ALL SELECT 'global_settings', id::text, substring(offices::text from '.{0,60}Suite 11.{0,40}') FROM global_settings WHERE offices::text ~ 'Suite 11'`,
    [CITY]
  );
  for (const o of other.rows) console.log(`  report-only: ${o.t} ${o.k}: …${o.s}…`);

  const loaded = results.filter((r) => r.outcome === 'loaded').length;
  const failed = results.filter((r) => r.outcome === 'failed');
  if (loaded && changedFile) appendFileSync(changedFile, `${CITY}\n`);
  if (failed.length) {
    console.error(`FAILED: ${failed.map((f) => f.path).join(', ')}`);
    process.exitCode = 1;
    verdict(SCRIPT, 'NOT-APPLIED (guard tripped)', `${failed.length} page(s) did not land`);
    return;
  }
  if (!apply) {
    const would = results.filter((r) => r.outcome === 'would-load').length;
    verdict(SCRIPT, 'NOT-APPLIED (dry run)', `${would} page(s) would change`);
    return;
  }
  verdict(SCRIPT, loaded ? 'APPLIED' : 'ALREADY-APPLIED', `${loaded} page(s) published with "#11"`);
}

main()
  .catch((e) => {
    console.error('FAILED:', e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
