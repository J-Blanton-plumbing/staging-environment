/**
 * Brief 216 (Track A) — the Batch 1–2 City Hub update: each office's Google Business Profile link
 * (the hub's new Plumber JSON-LD), plus, on the 5 Batch 2 hubs, the office's own reviews in place of the
 * interim company-wide set, and Naperville's new rating line. One new version per hub,
 * "Version 2 — Office reviews + GBP schema (2026-10)", published; Version 1 stays in history untouched.
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/update-brief-216-hub-reviews-gbp.ts           # dry run
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/update-brief-216-hub-reviews-gbp.ts --apply   # write
 *   (deploy.sh passes `commit`; in the pipeline a missing choice exits non-zero — Brief 147.)
 *
 * Source: data/city-batches/batch-1-2-updates.json, extracted byte-for-byte from Marketing's
 * CityHub_Live_Updates_Batch1-2_Oct2026.md (review text verbatim: curly apostrophes, double spaces and
 * typos are the customer's own).
 *
 * Per hub it PATCHES the live published hub content — only the named fields:
 *   all 10       office.gbpUrl
 *   Batch 2 (5)  reviews.h2, reviews.intro, the rating card (rating + ratingSub, read off the new intro —
 *                the Batch 1 convention, so the card never contradicts the line above it), the 3 items
 *                (name, Google link, text) in the listed order
 *   Naperville   reviews.intro and the rating card's ratingSub (the same figure); H2 + reviews unchanged
 * Everything else (eyebrow, CTAs, the company-wide trust bar line) is left as it is live.
 *
 * Guards (Brief 186: editor state is reported, exit 0):
 *   - the hub must be a published City Hub row with hub content, else NOT-APPLIED for it;
 *   - a field this script replaces must still hold its pre-brief value (Batch 2: the interim
 *     "Real J. Blanton Reviews" set; Naperville: the 560+ line), else NOT-APPLIED for that hub — an edit
 *     made in /admin since is never overwritten;
 *   - already carries the GBP link (and, where due, the new reviews) → ALREADY-APPLIED;
 *   - after publishing, every saved quote is read back and must equal the source string exactly.
 *
 * `--changed-file <path>`: appends the hubs whose VISIBLE content it published (the 5 Batch 2 hubs,
 * Naperville) so the CITY PAGES LIVE CHECK expects them to change; a hub that only gained its GBP link
 * changes in JSON-LD alone, which the check allows as the Brief 216 addition.
 */
import fs from 'fs';
import path from 'path';
import pool from '../src/lib/db';
import { createDraft, publishDraft } from '../src/lib/cms/drafts';
import { conformCityHubContent } from '../src/lib/cms/city-hubs-write';
import { CITY_HUB_TEMPLATE, CITY_PAGE_TYPES, HUB_V2_REVIEWS_GBP_LABEL, type CityHubDraftContent, type CityHubStored } from '../src/lib/city-hub-cms/model';
import { CITY_PAGE_BATCHES } from '../src/lib/city-batches';
import { ratingFromIntro } from './lib/city-batch-md/hub';
import { authorId } from './lib/city-pages-seed';
import { inPipeline, resolveRunMode, verdict } from './lib/run-mode';

const SCRIPT = 'update-brief-216-hub-reviews-gbp';
const argv = process.argv.slice(2);
const wantsCommit = argv.some((a) => ['commit', '--commit', 'apply', '--apply'].includes(a));
const wantsDry = argv.some((a) => ['dry', '--dry', 'dry-run', '--dry-run'].includes(a));
console.log(wantsCommit && !wantsDry ? 'APPLY — writing' : 'DRY RUN — nothing written');
const mode = resolveRunMode(SCRIPT, argv);

interface Update {
  slug: string;
  gbpUrl: string | null;
  h2?: string;
  intro?: string;
  items?: Array<{ name: string; url: string; text: string }>;
}
const DATA = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'city-batches', 'batch-1-2-updates.json'), 'utf8')) as { hubs: Record<string, Update> };

/** What each update replaces must still be the pre-brief value (never overwrite an /admin edit). */
const INTERIM_H2 = 'Real J. Blanton Reviews';
const NAPERVILLE_BEFORE = '4.7 stars from 560+ Google reviews for our Naperville office.';

type Outcome = 'loaded' | 'already' | 'would-load' | 'not-applied' | 'failed';

/** JSON with object keys sorted — a JSONB read comes back key-sorted, so compare in that form. */
const canon = (v: unknown) => JSON.stringify(v, (_k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) : x));

function patched(hub: CityHubStored, u: Update): CityHubStored {
  const out: CityHubStored = JSON.parse(JSON.stringify(hub));
  if (u.gbpUrl) out.office.gbpUrl = u.gbpUrl;
  if (u.intro) {
    const r = ratingFromIntro(u.intro);
    if (!r) throw new Error(`${u.slug}: the new intro "${u.intro}" is not "N.N stars from … ."`);
    out.reviews.intro = u.intro;
    out.reviews.ratingSub = r.ratingSub;
    if (u.items) out.reviews.rating = r.rating; // Naperville's rating (4.7) is unchanged
  }
  if (u.h2) out.reviews.h2 = u.h2;
  if (u.items) out.reviews.items = u.items.map((x) => ({ name: x.name, url: x.url, text: x.text })) as CityHubStored['reviews']['items'];
  return out;
}

async function one(slug: string, u: Update, by: number, apply: boolean): Promise<{ outcome: Outcome; detail: string }> {
  if (!u.gbpUrl) return { outcome: 'not-applied', detail: 'no Google Business Profile in the update (Highland Park) — nothing to do' };
  const row = (
    await pool.query<{ status: string; template_type: string | null; hub: CityHubStored | null; mt: string | null; md: string | null }>(
      `SELECT status, template_type, hub_content AS hub, meta_title AS mt, meta_description AS md FROM city_pages WHERE city_slug = $1`,
      [slug]
    )
  ).rows[0];
  if (!row || row.template_type !== CITY_HUB_TEMPLATE || !row.hub || row.status !== 'published') {
    return { outcome: 'not-applied', detail: `not a published City Hub row with hub content (${row ? `${row.status}, ${row.template_type}` : 'no row'}) — left alone` };
  }
  const live = row.hub;
  const want = patched(live, u);
  if (canon(want) === canon(live)) return { outcome: 'already', detail: 'already carries the update, no change' };
  if (live.office.gbpUrl && live.office.gbpUrl !== u.gbpUrl) return { outcome: 'not-applied', detail: `office.gbpUrl was set to "${live.office.gbpUrl}" in /admin — left alone` };
  if (u.items && live.reviews.h2 !== INTERIM_H2 && live.reviews.h2 !== u.h2) return { outcome: 'not-applied', detail: `reviews were edited in /admin since ("${live.reviews.h2}") — left alone` };
  if (slug === 'naperville' && u.intro && live.reviews.intro !== NAPERVILLE_BEFORE && live.reviews.intro !== u.intro) {
    return { outcome: 'not-applied', detail: `the reviews intro was edited in /admin since ("${live.reviews.intro}") — left alone` };
  }
  const draft: CityHubDraftContent = { template: CITY_HUB_TEMPLATE, hub: want, metaTitle: row.mt ?? '', metaDescription: row.md ?? '' };
  const clean = conformCityHubContent(slug, draft); // the editor's own checks (GBP link, review links …)
  const changed = [u.gbpUrl && 'GBP link', u.h2 && 'H2', u.intro && 'intro + rating card', u.items && '3 office reviews'].filter(Boolean).join(', ');
  if (!apply) return { outcome: 'would-load', detail: `would publish "${HUB_V2_REVIEWS_GBP_LABEL}" (${changed})` };
  const same = await pool.query<{ id: number }>(
    `SELECT id FROM page_drafts WHERE page_type = ANY($1) AND page_slug = $2 AND template_type = $3 AND content = $4::jsonb ORDER BY id DESC LIMIT 1`,
    [[...CITY_PAGE_TYPES], slug, CITY_HUB_TEMPLATE, JSON.stringify(clean)]
  );
  const id = same.rows[0]?.id ?? (await createDraft({ pageType: 'city', pageSlug: slug, label: HUB_V2_REVIEWS_GBP_LABEL, content: draft, createdBy: by, templateType: CITY_HUB_TEMPLATE })).id;
  await publishDraft(id, by);
  // The gate: every saved quote equals the source string exactly; the GBP link landed.
  const after = (await pool.query<{ hub: CityHubStored }>(`SELECT hub_content AS hub FROM city_pages WHERE city_slug = $1`, [slug])).rows[0]?.hub;
  const bad: string[] = [];
  if (after?.office.gbpUrl !== u.gbpUrl) bad.push('gbpUrl');
  (u.items ?? []).forEach((x, i) => {
    const s = after?.reviews.items[i];
    if (!s || s.name !== x.name || s.url !== x.url || s.text !== x.text) bad.push(`review ${i + 1}`);
  });
  if (u.intro && after?.reviews.intro !== u.intro) bad.push('intro');
  if (bad.length) return { outcome: 'failed', detail: `published version #${id} but the live row differs from the source in: ${bad.join(', ')}` };
  return { outcome: 'loaded', detail: `published "${HUB_V2_REVIEWS_GBP_LABEL}" #${id} (${changed})` };
}

async function main() {
  console.log(`${SCRIPT} — Brief 216 Track A${inPipeline() ? ' [pipeline]' : ''}\n`);
  const by = await authorId();
  const apply = mode === 'commit';
  const slugs = [...CITY_PAGE_BATCHES[0].cities, ...CITY_PAGE_BATCHES[1].cities];
  const results: Array<{ slug: string; outcome: Outcome; detail: string }> = [];
  for (const slug of slugs) {
    const u = DATA.hubs[slug];
    if (!u) throw new Error(`no update entry for "${slug}"`);
    try {
      results.push({ slug, ...(await one(slug, u, by, apply)) });
    } catch (e) {
      const code = (e as { code?: string })?.code;
      if (code === '422' || code === '409' || code === '404') results.push({ slug, outcome: 'failed', detail: `refused (${code}): ${(e as Error).message}` });
      else throw e;
    }
  }
  for (const r of results) console.log(`  /${r.slug.padEnd(20)} ${r.outcome.toUpperCase().padEnd(12)} ${r.detail}`);
  const ci = argv.indexOf('--changed-file');
  const changedFile = ci >= 0 ? argv[ci + 1] : undefined;
  const visible = results.filter((r) => r.outcome === 'loaded' && (DATA.hubs[r.slug].intro || DATA.hubs[r.slug].items)).map((r) => r.slug);
  if (changedFile && visible.length) fs.appendFileSync(changedFile, visible.join('\n') + '\n');
  const n = (o: Outcome) => results.filter((r) => r.outcome === o).length;
  if (n('failed')) {
    verdict(SCRIPT, 'FAILED', `${n('failed')} hub(s) did not land`);
    process.exitCode = 1;
  } else if (mode === 'dry') verdict(SCRIPT, 'NOT-APPLIED (dry run)', `${n('would-load')} would be published, ${n('already')} already, ${n('not-applied')} left alone`);
  else if (n('loaded') === 0) verdict(SCRIPT, n('not-applied') ? 'NOT-APPLIED (guard tripped)' : 'ALREADY-APPLIED', `${n('already')} already, ${n('not-applied')} left alone`);
  else verdict(SCRIPT, 'APPLIED', `published ${n('loaded')}, already ${n('already')}, left alone ${n('not-applied')}`);
}

main()
  .catch((err) => {
    console.error(`\n!!!! ${SCRIPT} crashed:`, err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
