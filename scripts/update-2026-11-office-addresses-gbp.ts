/**
 * Office addresses = each office's Google Business Profile (Marketing, JBP_Homepage_Copy_Fixes.md item 12,
 * 2026-11-03: "match each Google Profile"). The site wrote the same 19 offices three different ways —
 * Global Settings ("1204 E. Central Road, Suite 3"), the City Hubs and their service pages ("2390 Esplanade
 * Dr, Suite 200F") — and Google writes them a fourth. Every office address now reads the way its profile
 * shows it (read from each office's own Maps link on 2026-11-03), with three deliberate exceptions:
 *   • Algonquin `#200F` / Hinsdale `#216A` stay upper-case (items 10/11 of the same request; Google shows
 *     `#200f` / `#216a`);
 *   • Highland Park stays `1904 Green Bay Rd B` (Brief 217 C1). Google now displays "Apt B", which is its
 *     own label for an unlabelled unit, not something to print on a business address.
 *
 * Part A — `global_settings.offices` (footer on every page, homepage Local Offices list, store locator,
 * legacy city NAP blocks, the footer's all-offices schema graph). Matched by slug, never by index. A field
 * is changed only from a value listed in `gsFrom` (the formats this site has used); anything else was
 * edited in /admin since and is skipped and listed. Backed up first, written in one transaction, read back.
 *
 * Part B — each City Hub (`city_pages.hub_content`) and its City Service V2 pages (`v2_content`): the
 * exact old street string → the Google one, wherever it appears (the hub's office address — visible block
 * + its Plumber `#office` node, which its service pages also emit — the "Our X office is at …" sentences,
 * the stored fallback Service `provider`). Per page, like Brief 219's Northbrook script: run through the
 * editor's own checks, saved as a NEW VERSION and PUBLISHED, read back. A page that isn't a published
 * City Hub / V2 row is left alone; a page without the old string is ALREADY-APPLIED. Prose that names the
 * street without the number ("our headquarters on Techny Road") is not an address and is left alone; any
 * old address string elsewhere in the content tables is listed, never changed.
 *
 * `--changed-file <path>`: appends every city whose pages changed, so the CITY PAGES LIVE CHECK expects
 * their markup to change this deploy. Pre-swap is fine: both builds render these strings as stored.
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/update-2026-11-office-addresses-gbp.ts          # dry run
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/update-2026-11-office-addresses-gbp.ts commit   # apply
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

const SCRIPT = 'update-2026-11-office-addresses-gbp';
const argv = process.argv.slice(2);
const mode = resolveRunMode(SCRIPT, argv);
const changedFileIdx = argv.indexOf('--changed-file');
const changedFile = changedFileIdx >= 0 ? argv[changedFileIdx + 1] : null;
const LABEL = 'Office address as on Google (2026-11)';

/**
 * `street` / `zip` = the Google profile. `gsFrom` = Global Settings values it may replace; `pageFrom` = the
 * street as the City Hub + service pages store it (the hub slug is the office slug for all 19).
 */
type OfficeFix = { slug: string; street: string; zip?: string; gsFrom: string[]; zipFrom?: string[]; pageFrom?: string };
const OFFICES: OfficeFix[] = [
  { slug: 'northbrook', street: '1945 Techny Rd #11', gsFrom: ['1945 Techny Road, #11'], pageFrom: '1945 Techny Road, #11' },
  { slug: 'algonquin', street: '2390 Esplanade Dr #200F', gsFrom: [], pageFrom: '2390 Esplanade Dr, Suite 200F' },
  { slug: 'geneva', street: '115 Campbell St #201C', gsFrom: [], pageFrom: '115 Campbell St, Suite 201C' },
  { slug: 'arlington-heights', street: '1204 E Central Rd Suite 3', gsFrom: ['1204 E. Central Road, Suite 3'], pageFrom: '1204 E. Central Road, Suite 3' },
  { slug: 'chicago-lincoln-park', street: '800 W Diversey Pkwy', gsFrom: [] },
  { slug: 'chicago-ravenswood', street: '5126 N Ravenswood Ave', gsFrom: [] },
  { slug: 'elgin', street: '964 N McLean Blvd', zip: '60123', gsFrom: [], zipFrom: ['60123-2039'] },
  { slug: 'elmhurst', street: '116 S York St Ste 212', gsFrom: [], pageFrom: '116 S York St, Suite 212' },
  { slug: 'evanston', street: '1603 Orrington Ave #600-1085', gsFrom: [], pageFrom: '1603 Orrington Ave, #600-1085' },
  { slug: 'hinsdale', street: '15 Spinning Wheel Rd #216A', gsFrom: [], pageFrom: '15 Spinning Wheel Rd, Suite 216A' },
  { slug: 'mchenry', street: '3406 W Elm St', gsFrom: [] },
  { slug: 'naperville', street: '200 S Main St Ste 3', gsFrom: ['200 S Main Street, Suite 3'], pageFrom: '200 S Main Street, Suite 3' },
  { slug: 'skokie', street: '8001 Lincoln Ave #301', zip: '60077', gsFrom: ['8001 Lincoln Ave, Suite 301'], zipFrom: ['60077-3695'], pageFrom: '8001 Lincoln Ave, Suite 301' },
  { slug: 'joliet', street: '311 N Ottawa St Ste 2', gsFrom: [], pageFrom: '311 N Ottawa St, Suite 2' },
  { slug: 'tinley-park', street: '8200 185th St G28', gsFrom: [], pageFrom: '8200 185th St, Suite G28' },
  { slug: 'mokena', street: '19027 S Jodi Rd Unit H-1B', gsFrom: [], pageFrom: '19027 S Jodi Rd, Unit H-1B' },
  { slug: 'columbus', street: '1387 Goodale Blvd', gsFrom: ['1387 W. Goodale Blvd'], pageFrom: '1387 W. Goodale Blvd' },
  { slug: 'hanover-park', street: '1300 Greenbrook Blvd Ste B5', gsFrom: ['1300 Greenbrook Blvd, Suite B5'], pageFrom: '1300 Greenbrook Blvd, Suite B5' },
  { slug: 'highland-park', street: '1904 Green Bay Rd B', gsFrom: [] },
];

type State = 'change' | 'already' | 'skipped';
type Line = { where: string; state: State; detail: string };
type Outcome = 'loaded' | 'already' | 'would-load' | 'not-applied' | 'failed';
const normSlug = (s: unknown) => (typeof s === 'string' ? s.trim().replace(/^\//, '').toLowerCase() : '');

// ── Part A: Global Settings ─────────────────────────────────────────────────────────────────────────────

type Office = Record<string, unknown>;
function fixField(o: Office, slug: string, key: string, next: string, from: string[]): Line {
  const where = `${slug} ${key}`;
  if (o[key] === next) return { where, state: 'already', detail: 'already as on Google' };
  if (!from.includes(String(o[key]))) return { where, state: 'skipped', detail: `"${String(o[key])}" is not a known old format (edited in /admin since?) — left alone` };
  const old = String(o[key]);
  o[key] = next;
  return { where, state: 'change', detail: `"${old}" → "${next}"` };
}

async function partA(apply: boolean): Promise<{ lines: Line[]; failed: string | null }> {
  const row = (await pool.query<{ id: number; offices: unknown }>(`SELECT id, offices FROM global_settings WHERE id = 1`)).rows[0];
  if (!row || !Array.isArray(row.offices)) return { lines: [{ where: 'Global Settings offices', state: 'skipped', detail: 'no offices array — left alone' }], failed: null };
  const before = row.offices as Office[];
  const offices: Office[] = JSON.parse(JSON.stringify(before));
  const lines: Line[] = [];
  for (const f of OFFICES) {
    const o = offices.find((x) => normSlug(x.slug) === f.slug);
    if (!o) {
      lines.push({ where: `${f.slug} office`, state: 'skipped', detail: 'no office with that slug — left alone' });
      continue;
    }
    lines.push(fixField(o, f.slug, 'streetAddress', f.street, f.gsFrom));
    if (f.zip) lines.push(fixField(o, f.slug, 'zip', f.zip, f.zipFrom ?? []));
  }
  if (!lines.some((l) => l.state === 'change') || !apply) return { lines, failed: null };

  const client = await pool.connect();
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS copyfix_2026_11_row_backup (
      id SERIAL PRIMARY KEY, source_table TEXT NOT NULL, source_id INTEGER NOT NULL, reason TEXT NOT NULL,
      row_json JSONB NOT NULL, backed_up_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
    await client.query('BEGIN');
    await client.query(`INSERT INTO copyfix_2026_11_row_backup (source_table, source_id, reason, row_json) VALUES ('global_settings', $1, $2, $3)`, [
      row.id,
      'offices before the office addresses were matched to Google (item 12)',
      JSON.stringify(before),
    ]);
    const upd = await client.query(`UPDATE global_settings SET offices = $1::jsonb WHERE id = $2`, [JSON.stringify(offices), row.id]);
    if (upd.rowCount !== 1) throw new Error(`expected to update 1 row, updated ${upd.rowCount}`);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
  const after = ((await pool.query<{ offices: Office[] }>(`SELECT offices FROM global_settings WHERE id = $1`, [row.id])).rows[0]?.offices ?? []) as Office[];
  if (after.length !== before.length || after.map((o) => o.slug).join() !== before.map((o) => o.slug).join()) return { lines, failed: 'offices were reordered or lost' };
  const bad = lines
    .filter((l) => l.state === 'change')
    .filter((l) => {
      const [slug, key] = l.where.split(' ');
      const f = OFFICES.find((x) => x.slug === slug)!;
      return after.find((x) => normSlug(x.slug) === slug)?.[key] !== (key === 'zip' ? f.zip : f.street);
    });
  return { lines, failed: bad.length ? `${bad.map((b) => b.where).join(', ')} did not read back` : null };
}

// ── Part B: City Hubs + City Service V2 pages ───────────────────────────────────────────────────────────

const count = (v: unknown, s: string) => JSON.stringify(v ?? null).split(s).length - 1;
const swap = <T>(v: T, from: string, to: string): T => JSON.parse(JSON.stringify(v).split(from).join(to)) as T;

async function nextLabel(pageType: string, slug: string): Promise<string> {
  const n = Number((await pool.query<{ n: string }>(`SELECT count(*) AS n FROM page_drafts WHERE page_type = $1 AND page_slug = $2`, [pageType, slug])).rows[0].n) + 1;
  return `Version ${n} — ${LABEL}`;
}

async function hub(city: string, from: string, to: string, by: number, apply: boolean): Promise<{ outcome: Outcome; detail: string }> {
  const row = (
    await pool.query<{ status: string; template_type: string | null; hub: CityHubStored | null; mt: string | null; md: string | null }>(
      `SELECT status, template_type, hub_content AS hub, meta_title AS mt, meta_description AS md FROM city_pages WHERE city_slug = $1`,
      [city]
    )
  ).rows[0];
  if (!row || row.template_type !== CITY_HUB_TEMPLATE || !row.hub || row.status !== 'published') {
    return { outcome: 'not-applied', detail: `not a published City Hub row with hub content (${row ? `${row.status}, ${row.template_type}` : 'no row'}) — left alone` };
  }
  const n = count(row.hub, from);
  if (!n) return { outcome: 'already', detail: `no "${from}", no change` };
  const draft: CityHubDraftContent = { template: CITY_HUB_TEMPLATE, hub: swap(row.hub, from, to), metaTitle: row.mt ?? '', metaDescription: row.md ?? '' };
  const clean = conformCityHubContent(city, draft);
  if (!apply) return { outcome: 'would-load', detail: `would publish "${LABEL}" (${n} occurrence(s))` };
  const id = (await createDraft({ pageType: 'city', pageSlug: city, label: await nextLabel('city', city), content: clean, createdBy: by, templateType: CITY_HUB_TEMPLATE })).id;
  await publishDraft(id, by);
  const after = (await pool.query<{ hub: CityHubStored }>(`SELECT hub_content AS hub FROM city_pages WHERE city_slug = $1`, [city])).rows[0]?.hub;
  if (count(after, from) || !JSON.stringify(after).includes(to)) return { outcome: 'failed', detail: `published version #${id} but the live row still holds the old address or lacks the new one` };
  return { outcome: 'loaded', detail: `published version #${id} (${n} occurrence(s))` };
}

async function service(city: string, svc: string, from: string, to: string, by: number, apply: boolean): Promise<{ outcome: Outcome; detail: string }> {
  const slug = `${city}/${svc}`;
  const row = (
    await pool.query<{ status: string; v2: CityServiceV2DraftContent['page'] | null; mt: string | null; md: string | null }>(
      `SELECT status, v2_content AS v2, meta_title AS mt, meta_description AS md FROM city_service_pages WHERE city_slug = $1 AND service_slug = $2`,
      [city, svc]
    )
  ).rows[0];
  if (!row || !row.v2 || row.status !== 'published') return { outcome: 'not-applied', detail: `not a published City Service V2 row (${row ? row.status : 'no row'}) — left alone` };
  const n = count(row.v2, from);
  if (!n) return { outcome: 'already', detail: `no "${from}", no change` };
  const draft: CityServiceV2DraftContent = { template: CITY_SERVICE_V2_TEMPLATE, page: swap(row.v2, from, to), metaTitle: row.mt ?? '', metaDescription: row.md ?? '' };
  const clean = conformCityServiceV2Content(slug, draft, row.v2);
  if (!apply) return { outcome: 'would-load', detail: `would publish "${LABEL}" (${n} occurrence(s))` };
  const id = (await createDraft({ pageType: 'city-service', pageSlug: slug, label: await nextLabel('city-service', slug), content: clean, createdBy: by, templateType: CITY_SERVICE_V2_TEMPLATE })).id;
  await publishDraft(id, by);
  const after = (await pool.query<{ v2: unknown }>(`SELECT v2_content AS v2 FROM city_service_pages WHERE city_slug = $1 AND service_slug = $2`, [city, svc])).rows[0]?.v2;
  if (count(after, from) || !JSON.stringify(after).includes(to)) return { outcome: 'failed', detail: `published version #${id} but the live row still holds the old address or lacks the new one` };
  return { outcome: 'loaded', detail: `published version #${id} (${n} occurrence(s))` };
}

async function partB(apply: boolean): Promise<{ results: Array<{ path: string; outcome: Outcome; detail: string }>; changedCities: string[] }> {
  const by = await authorId();
  const results: Array<{ path: string; outcome: Outcome; detail: string }> = [];
  const changedCities: string[] = [];
  for (const f of OFFICES) {
    if (!f.pageFrom) continue;
    const mine: typeof results = [];
    mine.push({ path: `/${f.slug}`, ...(await hub(f.slug, f.pageFrom, f.street, by, apply)) });
    const services = (await pool.query<{ s: string }>(`SELECT service_slug AS s FROM city_service_pages WHERE city_slug = $1 AND v2_content IS NOT NULL ORDER BY service_slug`, [f.slug])).rows.map((r) => r.s);
    for (const s of services) mine.push({ path: `/${f.slug}/${s}`, ...(await service(f.slug, s, f.pageFrom, f.street, by, apply)) });
    if (mine.some((r) => r.outcome === 'loaded')) changedCities.push(f.slug);
    results.push(...mine);
  }
  return { results, changedCities };
}

/** Report-only: an old address string anywhere else in the content tables (not changed by this script). */
async function reportOthers(): Promise<void> {
  for (const f of OFFICES) {
    if (!f.pageFrom) continue;
    const other = await pool.query<{ t: string; k: string }>(
      `SELECT 'city_pages' AS t, city_slug AS k FROM city_pages c WHERE strpos(row_to_json(c)::text, $1) > 0 AND NOT (city_slug = $2 AND COALESCE(template_type, '') = 'city-hub')
       UNION ALL SELECT 'city_service_pages', city_slug || '/' || service_slug FROM city_service_pages c WHERE strpos(row_to_json(c)::text, $1) > 0 AND NOT (city_slug = $2 AND v2_content IS NOT NULL)
       UNION ALL SELECT 'main_pages', slug FROM main_pages c WHERE strpos(row_to_json(c)::text, $1) > 0
       UNION ALL SELECT 'sub_service_pages', slug FROM sub_service_pages c WHERE strpos(row_to_json(c)::text, $1) > 0`,
      [f.pageFrom, f.slug]
    );
    for (const o of other.rows) console.log(`  report-only: ${o.t} ${o.k} still holds "${f.pageFrom}"`);
  }
}

async function main() {
  announceMode(SCRIPT, mode);
  const apply = mode === 'commit';
  const a = await partA(apply);
  for (const l of a.lines) if (l.state !== 'already') console.log(`  ${l.state.padEnd(11)} Global Settings ${l.where} — ${l.detail}`);
  const b = await partB(apply);
  for (const r of b.results) if (r.outcome !== 'already') console.log(`  ${r.outcome.padEnd(11)} ${r.path} — ${r.detail}`);
  await reportOthers();

  if (b.changedCities.length && changedFile) appendFileSync(changedFile, b.changedCities.map((c) => `${c}\n`).join(''));
  const gsChanged = a.lines.filter((l) => l.state === 'change').length;
  const gsSkipped = a.lines.filter((l) => l.state === 'skipped');
  const pages = b.results.filter((r) => r.outcome === (apply ? 'loaded' : 'would-load')).length;
  const failed = [a.failed && `Global Settings: ${a.failed}`, ...b.results.filter((r) => r.outcome === 'failed').map((r) => r.path)].filter(Boolean);
  const tail = gsSkipped.length ? `; skipped (edited in /admin): ${gsSkipped.map((s) => s.where).join(', ')}` : '';
  const cities = new Set(b.results.filter((r) => r.outcome === 'loaded' || r.outcome === 'would-load').map((r) => r.path.split('/')[1])).size;
  const summary = `${gsChanged} Global Settings field(s), ${pages} page(s) in ${cities} cit(ies)${tail}`;
  if (failed.length) {
    console.error(`FAILED: ${failed.join(', ')}`);
    process.exitCode = 1;
    verdict(SCRIPT, 'NOT-APPLIED (guard tripped)', `${failed.length} write(s) did not land`);
    return;
  }
  if (!apply) {
    verdict(SCRIPT, 'NOT-APPLIED (dry run)', `would change ${summary}`);
    return;
  }
  verdict(SCRIPT, gsChanged || pages ? 'APPLIED' : 'ALREADY-APPLIED', `changed ${summary}`);
}

main()
  .catch((e) => {
    console.error('FAILED:', e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
