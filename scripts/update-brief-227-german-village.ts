/**
 * Brief 227 — the two content steps around the German Village office page, on an EXISTING database
 * (the live box). Idempotent; runs on every deploy.
 *
 * 1. ARCHIVE (hard rule "don't overwrite"): the legacy `/columbus-german-village` coverage-area row gets
 *    its unpublished "Pre-office archive (2026-11)" version — EVERY column verbatim, the Brief 212
 *    recipe (src/lib/cms/restore-archive.ts). The row itself is never written: the page is replaced by a
 *    NEW slug (`/columbus-german-village-oh`) and 301s there (src/lib/redirects/office-pages.ts).
 *    Restore = `scripts/restore-city-archive.ts --slug columbus-german-village --apply` + reverting the
 *    redirect. Created once; ALREADY from then on.
 *
 * 2. COLUMBUS HUB (Track D): one new published version of `/columbus` (the previous one stays in its
 *    history) with exactly two changes:
 *      - the review card "Stacy N" (it moves to the German Village page) → "Brady Bendau" (verbatim,
 *        Marketing's MD DEV NOTE), same position; the other two reviews and their order unchanged;
 *      - the German Village community link `/columbus-german-village` → `/columbus-german-village-oh`
 *        (label, order and the rest of the list unchanged; the Columbus schema doesn't use the href).
 *    Each change is made only where the live row still holds the exact OLD value; a value edited in
 *    /admin since is left alone and listed (NOT-APPLIED for that change). Both done → ALREADY-APPLIED.
 *    Read back after publishing.
 *
 * Pre-swap in deploy.sh, BEFORE the City Pages snapshot: the still-live build renders the Columbus row
 * exactly as the new build does, so the CITY PAGES LIVE CHECK stays byte-identical for /columbus.
 * Exit 1 only when a write did not land (Brief 186). Dry run unless `commit`.
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/update-brief-227-german-village.ts [commit]
 */
import { existsSync, readFileSync } from 'fs';

if (!process.env.DATABASE_URL && existsSync('.env.local')) {
  const m = readFileSync('.env.local', 'utf8').match(/^DATABASE_URL=(.*)$/m);
  if (m) process.env.DATABASE_URL = m[1].trim();
}

/* eslint-disable import/first */
import pool from '../src/lib/db';
import { createDraft, publishDraft } from '../src/lib/cms/drafts';
import { conformCityHubContent } from '../src/lib/cms/city-hubs-write';
import { createPreTemplateArchive } from '../src/lib/cms/restore-archive';
import { CITY_HUB_TEMPLATE, PRE_OFFICE_ARCHIVE_LABEL, type CityHubDraftContent, type CityHubStored, type HubReview } from '../src/lib/city-hub-cms/model';
import { authorId } from './lib/city-pages-seed';
import { resolveRunMode, announceMode, verdict } from './lib/run-mode';

const SCRIPT = 'update-brief-227-german-village';
const mode = resolveRunMode(SCRIPT, process.argv.slice(2));

const LEGACY = 'columbus-german-village';
const OFFICE_PAGE = 'columbus-german-village-oh';
const COLUMBUS = 'columbus';
const LABEL = 'German Village office page (Brief 227, 2026-11)';

const OLD_REVIEW_NAME = 'Stacy N';
const OLD_REVIEW_URL = 'https://maps.app.goo.gl/ep5gUrCMepDFdYqDA';
/** Brief 227 Track D1, verbatim. */
export const BRADY_BENDAU: HubReview = {
  name: 'Brady Bendau',
  url: 'https://maps.app.goo.gl/RxkqxbL2EHVXcNwR6',
  text: 'Called them out on a Tuesday morning after our water heater finally gave out here in Grandview Heights, and I honestly expected to wait days for someone to help. J Blanton Plumbing had a tech out same day and the replacement was done before dinner, no mess left behind either. Fast, professional, and reasonably priced too so we\'re definitely calling them again if anything else pops up.',
};

type Outcome = 'loaded' | 'already' | 'would-load' | 'not-applied' | 'failed';

async function archiveLegacy(by: number, apply: boolean): Promise<{ outcome: Outcome; detail: string }> {
  const row = (await pool.query(`SELECT 1 FROM city_pages WHERE city_slug = $1`, [LEGACY])).rowCount;
  if (!row) return { outcome: 'not-applied', detail: `no city_pages row for "${LEGACY}" — nothing to archive` };
  const have = (await pool.query<{ id: number }>(`SELECT id FROM page_drafts WHERE page_slug = $1 AND label = $2 ORDER BY id LIMIT 1`, [LEGACY, PRE_OFFICE_ARCHIVE_LABEL])).rows[0];
  if (have) return { outcome: 'already', detail: `"${PRE_OFFICE_ARCHIVE_LABEL}" is version #${have.id}` };
  if (!apply) return { outcome: 'would-load', detail: `would save "${PRE_OFFICE_ARCHIVE_LABEL}" (every column verbatim, unpublished)` };
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const r = await createPreTemplateArchive(client, 'hub', LEGACY, by, 227, false, PRE_OFFICE_ARCHIVE_LABEL);
    await client.query('COMMIT');
    return { outcome: r.created ? 'loaded' : 'already', detail: `"${PRE_OFFICE_ARCHIVE_LABEL}" = version #${r.draftId} (unpublished; the row itself is untouched)` };
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

async function columbusHub(by: number, apply: boolean): Promise<{ outcome: Outcome; detail: string; notes: string[] }> {
  const notes: string[] = [];
  const row = (
    await pool.query<{ status: string; template_type: string | null; hub: CityHubStored | null; mt: string | null; md: string | null }>(
      `SELECT status, template_type, hub_content AS hub, meta_title AS mt, meta_description AS md FROM city_pages WHERE city_slug = $1`,
      [COLUMBUS]
    )
  ).rows[0];
  if (!row || row.template_type !== CITY_HUB_TEMPLATE || !row.hub || row.status !== 'published') {
    return { outcome: 'not-applied', detail: `not a published City Hub row with hub content (${row ? `${row.status}, ${row.template_type}` : 'no row'}) — left alone`, notes };
  }
  const hub: CityHubStored = JSON.parse(JSON.stringify(row.hub));
  const changes: string[] = [];

  // D1 — the review swap, in place.
  const items = hub.reviews.items;
  const iOld = items.findIndex((r) => r.name === OLD_REVIEW_NAME && r.url === OLD_REVIEW_URL);
  const hasNew = items.some((r) => r.name === BRADY_BENDAU.name);
  if (iOld >= 0 && !hasNew) {
    items[iOld] = { ...BRADY_BENDAU };
    changes.push(`review ${iOld + 1}: Stacy N → Brady Bendau`);
  } else if (iOld < 0 && !hasNew) {
    notes.push(`review swap NOT applied: no "${OLD_REVIEW_NAME}" card (edited in /admin since?) — left alone`);
  }

  // D2 — the German Village community link, in place.
  const area = hub.office.areas.find((a) => a.href === `/${LEGACY}`);
  const done = hub.office.areas.some((a) => a.href === `/${OFFICE_PAGE}`);
  if (area && !done) {
    area.href = `/${OFFICE_PAGE}`;
    changes.push(`community "${area.label}": /${LEGACY} → /${OFFICE_PAGE}`);
  } else if (!area && !done) {
    notes.push(`community link NOT repointed: no /${LEGACY} link in the list (edited in /admin since?) — left alone`);
  }

  if (!changes.length) return { outcome: notes.length ? 'not-applied' : 'already', detail: notes.length ? 'nothing to change' : 'already carries the Brady Bendau review and the new German Village link', notes };
  const draft: CityHubDraftContent = { template: CITY_HUB_TEMPLATE, hub, metaTitle: row.mt ?? '', metaDescription: row.md ?? '' };
  const clean = conformCityHubContent(COLUMBUS, draft);
  if (!apply) return { outcome: 'would-load', detail: `would publish "${LABEL}": ${changes.join('; ')}`, notes };
  const n = Number((await pool.query<{ n: string }>(`SELECT count(*) AS n FROM page_drafts WHERE page_type = 'city' AND page_slug = $1`, [COLUMBUS])).rows[0].n) + 1;
  const id = (await createDraft({ pageType: 'city', pageSlug: COLUMBUS, label: `Version ${n} — ${LABEL}`, content: clean, createdBy: by, templateType: CITY_HUB_TEMPLATE })).id;
  await publishDraft(id, by);

  // Read back: only the two intended fields differ from the version that was live.
  const after = (await pool.query<{ hub: CityHubStored }>(`SELECT hub_content AS hub FROM city_pages WHERE city_slug = $1`, [COLUMBUS])).rows[0]?.hub;
  // JSONB sorts object keys, so every comparison is on a key-sorted copy (the Brief 225 trap).
  const canon = (v: unknown): string =>
    JSON.stringify(v, (_k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b))) : x));
  const bad: string[] = [];
  if (!after) bad.push('no hub content after publish');
  else {
    if (iOld >= 0 && !hasNew && canon(after.reviews.items[iOld]) !== canon(BRADY_BENDAU)) bad.push('review not as written');
    if (after.reviews.items.some((r) => r.name === OLD_REVIEW_NAME)) bad.push('Stacy N still on the page');
    const strip = (h: CityHubStored) => canon({ ...h, reviews: { ...h.reviews, items: h.reviews.items.map((r, i) => (i === iOld ? null : r)) }, office: { ...h.office, areas: h.office.areas.map((a) => ({ ...a, href: a.href === `/${LEGACY}` ? `/${OFFICE_PAGE}` : a.href })) } });
    if (strip(after) !== strip(row.hub)) bad.push('something other than the two intended fields changed');
  }
  if (bad.length) return { outcome: 'failed', detail: `published version #${id} but: ${bad.join('; ')}`, notes };
  return { outcome: 'loaded', detail: `published version #${id}: ${changes.join('; ')}`, notes };
}

async function main() {
  announceMode(SCRIPT, mode);
  const apply = mode === 'commit';
  const by = await authorId();
  const results = [
    { path: `/${LEGACY} (archive)`, ...(await archiveLegacy(by, apply)), notes: [] as string[] },
    { path: `/${COLUMBUS}`, ...(await columbusHub(by, apply)) },
  ];
  for (const r of results) {
    console.log(`  ${r.outcome.padEnd(11)} ${r.path} — ${r.detail}`);
    for (const n of r.notes) console.log(`              ${n}`);
  }
  const failed = results.filter((r) => r.outcome === 'failed');
  if (failed.length) {
    console.error(`FAILED: ${failed.map((f) => f.path).join(', ')}`);
    process.exitCode = 1;
    verdict(SCRIPT, 'NOT-APPLIED (guard tripped)', `${failed.length} step(s) did not land`);
    return;
  }
  const loaded = results.filter((r) => r.outcome === 'loaded').length;
  const skipped = results.filter((r) => r.outcome === 'not-applied' || r.notes.length).length;
  if (!apply) verdict(SCRIPT, 'NOT-APPLIED (dry run)', `${results.filter((r) => r.outcome === 'would-load').length} step(s) would run`);
  else if (loaded) verdict(SCRIPT, 'APPLIED', `${loaded} step(s) written${skipped ? `, ${skipped} left alone (listed above)` : ''}`);
  else verdict(SCRIPT, skipped ? 'NOT-APPLIED (guard tripped)' : 'ALREADY-APPLIED', skipped ? 'edited in /admin since — listed above' : 'archive saved, Columbus hub already updated');
}

main()
  .catch((e) => {
    console.error('FAILED:', e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
