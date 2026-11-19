/**
 * Brief 229 — City Pruning Phase 1 Pilot: the CMS side.
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/city-pruning/apply-phase1-pilot.ts            # dry run
 *   npx ts-node … scripts/city-pruning/apply-phase1-pilot.ts commit [--changed-file <path>] [--snapshot-dir <dir>]
 *
 * NEW rows next to the legacy ones — never a rename (the Brief 202 old-slug seed trap: the Batch 1–3
 * seeds and the 2026-11 update scripts key on the legacy slugs and run on every deploy; with the legacy
 * rows left exactly as they are they keep reporting ALREADY-*, and none can recreate a "missing" legacy
 * page). Rollback = drop the redirects: the legacy rows, versions and code modules are untouched.
 *
 *   A. 3 Tier 1 hubs  /mokena-il /tinley-park-il /skokie-il — a new city_pages row each, its first version
 *      built from the legacy hub's PUBLISHED content on the Tier 1 template v7 (README §1): featured tile =
 *      the first card (intro = its description), the other 6 as rows; the office paragraph minus the
 *      sentence that repeats the full street address; the license line; the service-areas panel from
 *      service_areas_pilot_hubs.csv (A–Z, Tier 3 towns linked, search at 12+); breadcrumb Locations >
 *      Illinois > {City}; the Plumber node's telephone from the NAP sheet (schema only). Every internal
 *      link to a pilot redirect source → its final target. Tinley Park also gets its Nov 2026 copy
 *      (Track E). Title/meta: Mokena + Skokie keep theirs; Tinley Park's from its MD, no brand suffix.
 *   B. 29 City Service V2 pages per hub → /{hub}-il/{service}: the legacy page's published v2_content,
 *      links relinked (the Service url / provider url follow on save — they are derived).
 *   C. The 4 legacy-template service pages per hub (bathroom-plumbing, drain-camera-inspection,
 *      flood-control-maintenance, gas-lines): where the legacy page has a row, a copy row + a version
 *      made from its live version (relinked); without a row the page renders from code, as today.
 *   D. Joliet + Columbus (Track E): one new published version each on the CURRENT row and URL.
 *   E. The 7 Tier 3 town pages: their city_pages rows (template 'tier3-town', published) — the publish
 *      gate and the sitemap lastmod; the copy itself is code data (src/lib/city-pruning/towns.ts).
 *   F. Marketing's 2026-11-19 review: "West/W. Goodale" → "Goodale" on every Columbus City Service V2
 *      page (one published version each), as D does on the Columbus hub.
 *
 * Guards (Brief 186: editor state is reported, exit 0): a legacy page that is not a published row with
 * content → NOT-APPLIED for it; a new page that already has content → ALREADY-APPLIED; Joliet/Columbus
 * whose H1 is neither the pre-brief nor the new one (edited in /admin since) → NOT-APPLIED.
 */
import fs from 'fs';
import path from 'path';
import pool from '../../src/lib/db';
import { createDraft, publishDraft } from '../../src/lib/cms/drafts';
import { conformCityHubContent } from '../../src/lib/cms/city-hubs-write';
import { conformCityServiceV2Content } from '../../src/lib/cms/city-services-v2-write';
import {
  CITY_HUB_TEMPLATE,
  CITY_PAGE_TYPES,
  addressParts,
  faqPreviewFromAnswer,
  splitSentences,
  type CityHubDraftContent,
  type CityHubStored,
} from '../../src/lib/city-hub-cms/model';
import { CITY_SERVICE_V2_TEMPLATE, type CityServiceStored, type CityServiceV2DraftContent } from '../../src/lib/city-service-v2-cms/model';
import { PILOT_HUBS, PILOT_TOWNS, PRUNING_PHASE1_REDIRECTS, pruneHref } from '../../src/lib/city-pruning/phase1';
import { townMeta } from '../../src/lib/city-pruning/towns';
import pilotData from '../../src/lib/city-pruning/phase1-data.json';
import { getCity } from '../../src/lib/content/cities';
import { authorId, loadHub, loadService, type PageResult } from '../lib/city-pages-seed';
import { inPipeline, resolveRunMode, verdict } from '../lib/run-mode';

const SCRIPT = 'apply-phase1-pilot';
const argv = process.argv.slice(2);
const mode = resolveRunMode(SCRIPT, argv);
const apply = mode === 'commit';
const arg = (name: string) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};

const COPY = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'data', 'city-pruning', 'phase1-pilot', 'hub-copy-updates.json'), 'utf8')) as Record<
  string,
  {
    title: string;
    metaDescription: string;
    hero: { eyebrow: string; h1: string; sub: string };
    servicesIntro: string;
    whyCard2H3: string;
    whyCard3Body: string;
    faq: Array<{ q: string; a: string }>;
    finalBody: string;
    schemaTelephone?: string;
  }
>;

const LICENSE_IL = 'Illinois plumbing license EH0211882';
const CLOSING = 'Don’t see your town listed? We may still serve it. Call us 24/7 and we’ll let you know.';
const LEGACY_TEMPLATE_SERVICES = ['bathroom-plumbing', 'drain-camera-inspection', 'flood-control-maintenance', 'gas-lines'];
/** Joliet / Columbus before this brief (the guard: an H1 edited in /admin since is never overwritten). */
const PRE_BRIEF_H1: Record<string, string> = { joliet: 'Plumbers in Joliet, IL', columbus: 'Plumbers in Columbus, OH' };

// ── Relinking: every internal link to a pilot redirect source → its final target ──────────────────
const SITE_PATH = /^(?:https?:\/\/(?:www\.)?jblantonplumbing\.com)?\/[^\s"<>()]*$/i;
function relinkStr(s: string): string {
  if (SITE_PATH.test(s)) return pruneHref(s);
  return s
    .replace(/\]\(([^)\s]+)\)/g, (_m, h: string) => `](${pruneHref(h)})`)
    .replace(/href="([^"]+)"/g, (_m, h: string) => `href="${pruneHref(h)}"`)
    .replace(/https:\/\/jblantonplumbing\.com\/[a-z0-9\-/]+/g, (u) => pruneHref(u));
}
function relink<T>(v: T): T {
  if (typeof v === 'string') return relinkStr(v) as unknown as T;
  if (Array.isArray(v)) return v.map((x) => relink(x)) as unknown as T;
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, relink(x)])) as T;
  return v;
}
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const telOf = (display: string) => {
  const d = display.replace(/\D/g, '');
  return `+1-${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6, 10)}`;
};

type Outcome = PageResult['outcome'] | 'not-applied';
interface Row {
  path: string;
  outcome: Outcome;
  detail: string;
}
const results: Row[] = [];
const snapshot: Record<string, unknown> = {};

// ── A. The 3 hubs ─────────────────────────────────────────────────────────────────────────────────
function buildV7(legacy: CityHubStored, newSlug: string, cityName: string, by: { whyItems: Array<{ h3: string; body: string }> }): CityHubStored {
  const h = relink(clone(legacy));
  const [first, ...rest] = h.services.cards;
  h.tier1 = 'v7';
  h.breadcrumb = {
    trail: [
      { label: 'Locations', href: '/locations' },
      { label: 'Illinois', href: '/locations/illinois' },
    ],
    current: cityName,
  };
  h.services.featured = {
    eyebrow: 'Same-Day Service Available',
    title: `${first.title} in ${cityName}`,
    href: first.href,
    intro: first.desc,
    cta: `Learn more about ${first.title.toLowerCase()}`,
    image: first.image,
  };
  h.services.list = rest.slice(0, 6).map((c) => ({ title: c.title, href: c.href, desc: c.desc, image: c.image }));
  // The office paragraph minus any sentence that repeats the full street address (README §1).
  const street = addressParts(h.office.address)?.streetAddress ?? h.office.address;
  h.office.body = splitSentences(h.office.body)
    .filter((x) => !x.includes(street))
    .join(' ');
  h.office.license = LICENSE_IL;
  const towns = ((pilotData.serviceAreas as Record<string, Array<{ town: string; link: string | null }>>)[cityName] ?? []).map((t) => ({
    label: t.town,
    ...(t.link ? { href: t.link } : {}),
  }));
  if (towns.length === 0) throw new Error(`${newSlug}: no service areas for "${cityName}" in service_areas_pilot_hubs.csv`);
  const search = towns.length >= 12;
  h.office.serviceAreas = {
    h3: search ? 'Do We Serve Your Town?' : `Communities We Serve Near ${cityName}`,
    ...(search ? { intro: `${towns.length} communities near ${cityName}. Start typing to check yours.` } : {}),
    towns,
    closing: CLOSING,
    stateUrl: '/locations/illinois',
    stateName: 'Illinois',
  };
  // The "Which communities do you serve from {City}?" FAQ names exactly the panel's towns, A to Z — the
  // live answers named towns the panel no longer lists (Mokena: New Lenox, Tinley Park, Orland Park,
  // Homer Glen, Lockport; Skokie: Evanston, Wilmette, Glenview). Marketing 2026-11-19: "we need to be
  // coherent". Same sentence frame as the live answer; "and more" is dropped because the list is now
  // the whole panel and the panel's own closing line covers unlisted towns. A hub whose FAQ is replaced
  // by its Nov 2026 copy (Tinley Park, Track E) is overwritten again by applyCopy.
  const commQ = new RegExp(`^Which communities do you serve from ${cityName}\\?$`);
  h.faq = {
    ...h.faq,
    items: h.faq.items.map((f) => {
      if (!commQ.test(f.q)) return f;
      const names = towns.map((t) => t.label);
      const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0];
      const a = `Along with ${cityName}, our office serves ${list}. Our phone line is open 24/7 for all of them.`;
      return { ...f, preview: faqPreviewFromAnswer(a), a };
    }),
  };
  const nap = (pilotData.offices as Array<{ office: string; phone: string }>).find((o) => o.office === cityName);
  if (!nap) throw new Error(`${newSlug}: "${cityName}" is not in the NAP sheet`);
  h.office.schemaTelephone = telOf(nap.phone);
  void by;
  return h;
}

/** Track E: one hub's Nov 2026 copy over its content (only the fields the MD names). */
function applyCopy(h: CityHubStored, slug: string, sharedWhy: Array<{ h3: string; body: string }>): CityHubStored {
  const c = COPY[slug];
  if (!c) throw new Error(`no copy update for ${slug}`);
  const out = clone(h);
  out.hero = { ...out.hero, eyebrow: c.hero.eyebrow, h1: c.hero.h1, sub: c.hero.sub };
  out.services = { ...out.services, intro: c.servicesIntro };
  out.whyItems = sharedWhy.map((w, i) => (i === 1 ? { h3: c.whyCard2H3, body: w.body } : i === 2 ? { h3: w.h3, body: c.whyCard3Body } : { ...w }));
  out.faq = { ...out.faq, items: c.faq.map((f) => ({ q: f.q, preview: faqPreviewFromAnswer(f.a), a: f.a })) };
  out.final = { ...out.final, body: c.finalBody };
  out.seo = { titleSuffix: false };
  if (c.schemaTelephone) out.office = { ...out.office, schemaTelephone: c.schemaTelephone };
  return fixStreetNames(out, slug);
}

/**
 * Marketing 2026-11-19: "take the West out" — the Columbus office is 1387 Goodale Blvd (NAP sheet + its
 * Google listing). The Nov 2026 MD copy is corrected at extraction (extract-phase1-copy.mjs); this also
 * corrects the two older mentions on the same hub (the office eyebrow "On West Goodale Boulevard" and the
 * trust item "Local office on W. Goodale Blvd") so the page never names the street two ways.
 */
const STREET_FIXES: Record<string, Array<[RegExp, string]>> = {
  columbus: [
    [/\bWest Goodale\b/g, 'Goodale'],
    [/\bW\. Goodale\b/g, 'Goodale'],
  ],
};
function fixStreetNames<T>(v: T, slug: string): T {
  const fixes = STREET_FIXES[slug];
  if (!fixes) return v;
  const walk = (x: unknown): unknown =>
    typeof x === 'string'
      ? fixes.reduce((s, [re, to]) => s.replace(re, to), x)
      : Array.isArray(x)
        ? x.map(walk)
        : x && typeof x === 'object'
          ? Object.fromEntries(Object.entries(x as Record<string, unknown>).map(([k, y]) => [k, walk(y)]))
          : x;
  return walk(v) as T;
}

async function liveHub(slug: string) {
  return (
    await pool.query<{ status: string; template_type: string | null; hub: CityHubStored | null; mt: string | null; md: string | null }>(
      `SELECT status, template_type, hub_content AS hub, meta_title AS mt, meta_description AS md FROM city_pages WHERE city_slug = $1`,
      [slug]
    )
  ).rows[0];
}

async function hubs(by: number, sharedWhy: Array<{ h3: string; body: string }>) {
  for (const [newSlug, legacy] of Object.entries(PILOT_HUBS)) {
    const cityName = getCity(newSlug)?.name ?? legacy;
    const row = await liveHub(legacy);
    if (!row || row.template_type !== CITY_HUB_TEMPLATE || !row.hub || row.status !== 'published') {
      results.push({ path: `/${newSlug}`, outcome: 'not-applied', detail: `the legacy /${legacy} is not a published City Hub row with content — nothing to copy` });
      continue;
    }
    snapshot[`city_pages/${legacy}`] = row;
    let hub = buildV7(row.hub, newSlug, cityName, { whyItems: sharedWhy });
    let metaTitle = row.mt ?? '';
    let metaDescription = row.md ?? '';
    if (COPY[newSlug]) {
      hub = applyCopy(hub, newSlug, sharedWhy);
      metaTitle = COPY[newSlug].title;
      metaDescription = COPY[newSlug].metaDescription;
    }
    const draft: CityHubDraftContent = { template: CITY_HUB_TEMPLATE, hub, metaTitle, metaDescription };
    const r = await loadHub(newSlug, draft, { by, apply, publish: true, label: `Version 1 — Tier 1 hub v7 at /${newSlug} (Brief 229)`, createHubRow: true, brief: 229 });
    results.push(r);
  }
}

// ── B + C. The service pages ──────────────────────────────────────────────────────────────────────
async function services(by: number) {
  for (const [newSlug, legacy] of Object.entries(PILOT_HUBS)) {
    const rows = (
      await pool.query<{ service_slug: string; status: string; v2: CityServiceStored | null; mt: string | null; md: string | null }>(
        `SELECT service_slug, status, v2_content AS v2, meta_title AS mt, meta_description AS md FROM city_service_pages WHERE city_slug = $1 ORDER BY service_slug`,
        [legacy]
      )
    ).rows;
    // The service slugs the redirect file moves for this hub (`/{legacy}/{s}` → `/{hub}-il/{s}`).
    const wanted = new Set(
      Object.entries(PRUNING_PHASE1_REDIRECTS)
        .filter(([from, to]) => from.startsWith(`/${legacy}/`) && to.startsWith(`/${newSlug}/`) && from.slice(legacy.length + 2) === to.slice(newSlug.length + 2))
        .map(([from]) => from.slice(legacy.length + 2))
    );
    for (const r of rows.filter((x) => x.v2)) {
      if (!wanted.has(r.service_slug)) continue;
      const p = `/${newSlug}/${r.service_slug}`;
      if (r.status !== 'published') {
        results.push({ path: p, outcome: 'not-applied', detail: `/${legacy}/${r.service_slug} is '${r.status}' — not copied` });
        continue;
      }
      snapshot[`city_service_pages/${legacy}/${r.service_slug}`] = { v2_content: r.v2, meta_title: r.mt, meta_description: r.md };
      const page = relink(clone(r.v2 as CityServiceStored));
      const draft: CityServiceV2DraftContent = { template: CITY_SERVICE_V2_TEMPLATE, page, metaTitle: r.mt ?? '', metaDescription: r.md ?? '' };
      results.push(
        await loadService(newSlug, r.service_slug, draft, {
          by,
          apply,
          publish: true,
          createMissing: true,
          label: `Version 1 — moved to /${newSlug}/${r.service_slug} (Brief 229)`,
          brief: 229,
        })
      );
    }
    for (const svc of LEGACY_TEMPLATE_SERVICES) {
      const p = `/${newSlug}/${svc}`;
      const old = rows.find((x) => x.service_slug === svc);
      if (!old) {
        results.push({ path: p, outcome: 'already', detail: `no /${legacy}/${svc} row — the page renders from code under the new URL, as the legacy one does` });
        continue;
      }
      results.push(await copyLegacyServiceRow(legacy, newSlug, svc, by));
    }
  }
}

/** C. A legacy-template service row → a copy at the new slug (+ a version from its live version). */
async function copyLegacyServiceRow(legacy: string, newSlug: string, svc: string, by: number): Promise<Row> {
  const p = `/${newSlug}/${svc}`;
  const exists = await pool.query(`SELECT 1 FROM city_service_pages WHERE city_slug = $1 AND service_slug = $2`, [newSlug, svc]);
  if (exists.rowCount) return { path: p, outcome: 'already', detail: 'row already copied, no change' };
  const src = (await pool.query(`SELECT * FROM city_service_pages WHERE city_slug = $1 AND service_slug = $2`, [legacy, svc])).rows[0];
  if (src.status !== 'published') return { path: p, outcome: 'not-applied', detail: `/${legacy}/${svc} is '${src.status}' — not copied` };
  const live = (
    await pool.query<{ id: number; content: unknown; label: string; template_type: string | null }>(
      `SELECT id, content, label, template_type FROM page_drafts WHERE page_type = 'city-service' AND page_slug = $1 AND is_published`,
      [`${legacy}/${svc}`]
    )
  ).rows[0];
  snapshot[`city_service_pages/${legacy}/${svc}`] = src;
  if (!apply) return { path: p, outcome: 'would-load', detail: `would copy the /${legacy}/${svc} row${live ? ` and its live version #${live.id}` : ''} (relinked)` };
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const ins = await client.query<{ version: number }>(
      `INSERT INTO city_service_pages (city_slug, service_slug, service_intro_heading, service_intro_paragraphs, service_intro_image,
         secondary_heading, secondary_paragraphs, secondary_image, faqs, updated_at, created_by, created_at, meta_title, meta_description,
         parent_slug, version, canonical_url, status, v2_content)
       VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7::jsonb,$8,$9::jsonb,NOW(),'brief-229-pilot',NOW(),$10,$11,$12,1,NULL,'published',NULL) RETURNING version`,
      [
        newSlug,
        svc,
        relink(src.service_intro_heading),
        JSON.stringify(relink(src.service_intro_paragraphs)),
        src.service_intro_image,
        relink(src.secondary_heading),
        JSON.stringify(relink(src.secondary_paragraphs)),
        src.secondary_image,
        JSON.stringify(relink(src.faqs)),
        src.meta_title,
        src.meta_description,
        src.parent_slug,
      ]
    );
    if (live) {
      await client.query(
        `INSERT INTO page_drafts (page_type, page_slug, label, content, created_by, created_at, published_at, template_type, version, base_version, is_published)
         VALUES ('city-service', $1, $2, $3::jsonb, $4, NOW(), NOW(), $5, 0, $6, true)`,
        [`${newSlug}/${svc}`, `Version 1 — moved to /${newSlug}/${svc} (Brief 229)`, JSON.stringify(relink(live.content)), by, live.template_type, ins.rows[0].version]
      );
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
  return { path: p, outcome: 'loaded', detail: `copied the /${legacy}/${svc} row${live ? ` + its live version as "Version 1 — moved …"` : ''}` };
}

// ── D. Joliet + Columbus ──────────────────────────────────────────────────────────────────────────
async function copyUpdates(by: number, sharedWhy: Array<{ h3: string; body: string }>) {
  for (const slug of ['joliet', 'columbus']) {
    const c = COPY[slug];
    const row = await liveHub(slug);
    if (!row || row.template_type !== CITY_HUB_TEMPLATE || !row.hub || row.status !== 'published') {
      results.push({ path: `/${slug}`, outcome: 'not-applied', detail: 'not a published City Hub row with content — left alone' });
      continue;
    }
    snapshot[`city_pages/${slug}`] = row;
    const want = applyCopy(row.hub, slug, sharedWhy);
    const canon = (v: unknown) => JSON.stringify(v, (_k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => (a < b ? -1 : 1))) : x));
    if (canon(want) === canon(row.hub) && row.mt === c.title && row.md === c.metaDescription) {
      results.push({ path: `/${slug}`, outcome: 'already', detail: 'already carries the Nov 2026 copy, no change' });
      continue;
    }
    if (row.hub.hero.h1 !== PRE_BRIEF_H1[slug] && row.hub.hero.h1 !== c.hero.h1) {
      results.push({ path: `/${slug}`, outcome: 'not-applied', detail: `the H1 was edited in /admin since ("${row.hub.hero.h1}") — left alone` });
      continue;
    }
    const draft: CityHubDraftContent = { template: CITY_HUB_TEMPLATE, hub: want, metaTitle: c.title, metaDescription: c.metaDescription };
    const clean = conformCityHubContent(slug, draft);
    const label = 'Nov 2026 hub optimization (Brief 229)';
    if (!apply) {
      results.push({ path: `/${slug}`, outcome: 'would-load', detail: `would publish "${label}" (hero, services intro, Why Us cards 2–3, 7 FAQ, final CTA, title/meta${c.schemaTelephone ? ', schema telephone' : ''})` });
      continue;
    }
    const same = await pool.query<{ id: number }>(
      `SELECT id FROM page_drafts WHERE page_type = ANY($1) AND page_slug = $2 AND template_type = $3 AND content = $4::jsonb ORDER BY id DESC LIMIT 1`,
      [[...CITY_PAGE_TYPES], slug, CITY_HUB_TEMPLATE, JSON.stringify(clean)]
    );
    const id = same.rows[0]?.id ?? (await createDraft({ pageType: 'city', pageSlug: slug, label, content: draft, createdBy: by, templateType: CITY_HUB_TEMPLATE })).id;
    await publishDraft(id, by);
    const after = await liveHub(slug);
    const bad = [after?.hub?.hero.h1 !== c.hero.h1 && 'H1', after?.mt !== c.title && 'title', after?.hub?.faq.items.length !== 7 && 'FAQ'].filter(Boolean);
    results.push(bad.length ? { path: `/${slug}`, outcome: 'failed', detail: `published #${id} but the live row differs in: ${bad.join(', ')}` } : { path: `/${slug}`, outcome: 'loaded', detail: `published "${label}" #${id}` });
  }
}

// ── F. Columbus service pages: Goodale without "West" ────────────────────────────────────────────────
/**
 * Marketing 2026-11-19 (review of this brief's report): the Columbus office is on Goodale Blvd — "West" /
 * "W." comes out of every Columbus City Service V2 page too, not only the hub (D). The street ADDRESS
 * ("1387 W. Goodale Blvd") was already rewritten by update-2026-11-office-addresses-gbp.ts, which runs
 * earlier in deploy.sh; what is left is prose ("from our office on West Goodale Boulevard", the trust item
 * "Local office on W. Goodale Blvd") and one meta description. Same contract as that script: per page,
 * through the editor's own checks, a NEW VERSION that is PUBLISHED and read back; a page that isn't a
 * published V2 row is left alone; a page with nothing to change is ALREADY-APPLIED.
 */
const STREET_RE = /\b(?:West|W\.) Goodale\b/;
async function columbusServices(by: number) {
  const rows = (
    await pool.query<{ service_slug: string; status: string; v2: CityServiceStored | null; mt: string | null; md: string | null }>(
      `SELECT service_slug, status, v2_content AS v2, meta_title AS mt, meta_description AS md FROM city_service_pages WHERE city_slug = 'columbus' AND v2_content IS NOT NULL ORDER BY service_slug`
    )
  ).rows;
  for (const r of rows) {
    const slug = `columbus/${r.service_slug}`;
    const p = `/${slug}`;
    if (r.status !== 'published' || !r.v2) {
      results.push({ path: p, outcome: 'not-applied', detail: `'${r.status}' — left alone` });
      continue;
    }
    const before = JSON.stringify([r.v2, r.mt, r.md]);
    if (!STREET_RE.test(before)) {
      results.push({ path: p, outcome: 'already', detail: 'no "West/W. Goodale", no change' });
      continue;
    }
    snapshot[`city_service_pages/${slug}`] = { v2_content: r.v2, meta_title: r.mt, meta_description: r.md };
    const draft: CityServiceV2DraftContent = {
      template: CITY_SERVICE_V2_TEMPLATE,
      page: fixStreetNames(r.v2, 'columbus'),
      metaTitle: fixStreetNames(r.mt ?? '', 'columbus'),
      metaDescription: fixStreetNames(r.md ?? '', 'columbus'),
    };
    const clean = conformCityServiceV2Content(slug, draft, r.v2);
    const label = 'Goodale Blvd without “West” (Brief 229 review)';
    if (!apply) {
      results.push({ path: p, outcome: 'would-load', detail: `would publish "${label}"` });
      continue;
    }
    const id = (await createDraft({ pageType: 'city-service', pageSlug: slug, label, content: clean, createdBy: by, templateType: CITY_SERVICE_V2_TEMPLATE })).id;
    await publishDraft(id, by);
    const after = (
      await pool.query<{ v2: unknown; mt: string | null; md: string | null }>(
        `SELECT v2_content AS v2, meta_title AS mt, meta_description AS md FROM city_service_pages WHERE city_slug = 'columbus' AND service_slug = $1`,
        [r.service_slug]
      )
    ).rows[0];
    results.push(
      STREET_RE.test(JSON.stringify([after?.v2, after?.mt, after?.md]))
        ? { path: p, outcome: 'failed', detail: `published #${id} but the live row still says West/W. Goodale` }
        : { path: p, outcome: 'loaded', detail: `published "${label}" #${id}` }
    );
  }
}

// ── E. The 7 town rows ────────────────────────────────────────────────────────────────────────────
async function towns() {
  for (const slug of Object.keys(PILOT_TOWNS)) {
    const p = `/${slug}`;
    const meta = townMeta(slug);
    const r = (await pool.query<{ status: string }>(`SELECT status FROM city_pages WHERE city_slug = $1`, [slug])).rows[0];
    if (r) {
      results.push({ path: p, outcome: r.status === 'published' ? 'already' : 'unpublished', detail: `row exists (${r.status}) — no change` });
      continue;
    }
    if (!apply) {
      results.push({ path: p, outcome: 'would-load', detail: "would create the city_pages row (template 'tier3-town', published)" });
      continue;
    }
    const ins = await pool.query<{ status: string }>(
      `INSERT INTO city_pages (city_slug, city_type, template_type, hero_heading_line1, meta_title, meta_description, created_by, created_at, updated_at, status)
       VALUES ($1, 'coverage-area', 'tier3-town', '', $2, $3, 'brief-229-pilot', NOW(), NOW(), 'published') RETURNING status`,
      [slug, meta?.title ?? null, meta?.description ?? null]
    );
    results.push({ path: p, outcome: ins.rows[0]?.status === 'published' ? 'loaded' : 'failed', detail: "created the city_pages row (template 'tier3-town')" });
  }
}

async function main() {
  console.log(`${SCRIPT} — Brief 229${inPipeline() ? ' [pipeline]' : ''} — ${apply ? 'APPLY' : 'DRY RUN'}\n`);
  const by = await authorId();
  // The shared City Hub record as published (src/lib/cms/city-hubs.ts reads the same row; it uses React
  // `cache`, which only exists inside a server render, so the script reads the row itself).
  const sharedRow = (await pool.query<{ status: string; content: { why?: { items?: Array<{ h3: string; body: string }> } } | null }>(`SELECT status, content FROM main_pages WHERE slug = 'city-hubs'`)).rows[0];
  const sharedWhy = (sharedRow?.status === 'published' ? sharedRow.content?.why?.items : null) ?? [];
  if (sharedWhy.length !== 3) throw new Error(`the shared City Hub record has ${sharedWhy.length} Why Us cards (expected 3) — the Track E card edits can't be placed`);
  await hubs(by, sharedWhy);
  await services(by);
  await copyUpdates(by, sharedWhy);
  await columbusServices(by);
  await towns();
  for (const r of results) console.log(`  ${r.path.padEnd(44)} ${r.outcome.toUpperCase().padEnd(12)} ${r.detail}`);
  const snapDir = arg('--snapshot-dir');
  if (snapDir && Object.keys(snapshot).length) {
    fs.mkdirSync(snapDir, { recursive: true });
    const f = path.join(snapDir, `cms-before-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(f, JSON.stringify(snapshot, null, 1));
    console.log(`\n  snapshot of every legacy row read: ${f}`);
  }
  const changedFile = arg('--changed-file');
  // The CITY PAGES LIVE CHECK expects these to change this deploy: Joliet/Columbus (new copy) and the 3 new
  // hubs + their service pages (new URLs — the snapshot from the previous build has nothing to match).
  // F's Columbus service pages count as "columbus" (the live check keys on the city).
  const visible = [
    ...new Set(
      results
        .filter((r) => r.outcome === 'loaded' && (r.path === '/joliet' || r.path === '/columbus' || r.path.startsWith('/columbus/') || Object.prototype.hasOwnProperty.call(PILOT_HUBS, r.path.slice(1))))
        .map((r) => (r.path.startsWith('/columbus/') ? 'columbus' : r.path.slice(1)))
    ),
  ];
  if (changedFile && visible.length) fs.appendFileSync(changedFile, visible.join('\n') + '\n');
  const n = (o: Outcome) => results.filter((r) => r.outcome === o).length;
  if (n('failed')) {
    verdict(SCRIPT, 'FAILED', `${n('failed')} page(s) did not land`);
    process.exitCode = 1;
  } else if (mode === 'dry') verdict(SCRIPT, 'NOT-APPLIED (dry run)', `${n('would-load')} would load, ${n('already')} already, ${n('not-applied')} left alone`);
  else if (n('loaded') === 0) verdict(SCRIPT, n('not-applied') ? 'NOT-APPLIED (guard tripped)' : 'ALREADY-APPLIED', `${n('already')} already, ${n('not-applied')} left alone`);
  else verdict(SCRIPT, 'APPLIED', `loaded ${n('loaded')}, already ${n('already')}, left alone ${n('not-applied')}`);
}

main()
  .catch((err) => {
    console.error(`\n!!!! ${SCRIPT} crashed:`, err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
