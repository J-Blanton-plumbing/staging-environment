/**
 * Brief 212 (Track C1) — one City Hub MD (`## 1. HERO` … `## 12. FINAL CTA`) → `CityHubDraftContent`.
 *
 *   SEO      META title, the "| J. Blanton Plumbing" tail stripped (stored suffix-free), description.
 *   Hero     eyebrow, H1, sub; photo = the standard van photo; crop = standard.
 *   Trust    the 3 Trust Bar items.
 *   Services H2, intro, cards from "H3 Card: [Title](/city/slug) | desc". Card image + alt: the Batch 1
 *            hub image for the same slug; for a slug no Batch 1 hub features, the V2 service page's
 *            hero image + alt (Brief 212 A-3).
 *   Office   eyebrow, H2, body, H3 → areasH3, communities from the "H3 Body" links (the trailing
 *            "more" link → `more`); the address from the MD's Plumber schema block.
 *   Depth    H2, intro, 4 tiles.     Why Us   H2 → `whyH2`.
 *   Reviews  eyebrow from the MD. H2, intro and the 3 reviews from the MD when it carries real ones
 *            (Batch 3: "Review N Name / GBP URL / Text", quotes verbatim, outer "…" dropped; rating +
 *            ratingSub read off the intro "4.8 stars from 860+ Google reviews for our … office."),
 *            otherwise from the corrections file's `hubReviewOverrides` (Brief 212 decision 3 —
 *            never the MD while it holds placeholders).
 *   Schema   (Brief 216 A2) the MD's Plumber block: `sameAs` → `office.gbpUrl`; its name and
 *            `areaServed` become `office.schemaName` / `schemaArea` / `areas[].area` only where they
 *            differ from the defaults, and the Plumber node the view derives must equal the MD's
 *            (name, url, sameAs, hasMap, address, areaServed). The VideoObject / FAQPage blocks are
 *            not stored (the view derives both).
 *   Hero     (Brief 216 C3) `fullBleed` → layout 'full-bleed' with that video (Evanston).
 *   FAQ      Q/A; the short answer from `faqPreviewFromAnswer` (the editor's "Auto-fill from answer").
 *   NDC      the city sentence.        Final    eyebrow, H2, body.
 * Sections that must EQUAL the shared record (Mid CTA, Why Us items, Video, NDC box, the Services /
 * Local Knowledge / FAQ eyebrows) are asserted, never written per page.
 *
 * Copy convention (Brief 205, how every Batch 1 hub is stored): visible copy uses the typographic
 * apostrophe ’ where the MDs type a straight one. Review quotes are kept exactly as supplied.
 */
import { CITY_HUBS } from '../../../src/lib/content/city-hubs';
import {
  CITY_HUB_TEMPLATE,
  faqPreviewFromAnswer,
  GBP_URL_RE,
  hubPlumberJsonLd,
  type CityHubDraftContent,
  type CityHubShared,
  type HubCard,
  type HubHeroVideo,
} from '../../../src/lib/city-hub-cms/model';
import { schemaPhone } from '../../../src/lib/schema/city-pages';
import { placeholderIn } from '../../../src/lib/cms-v2/shared';
import { heroImageFor } from '../../../src/lib/city-service-v2-cms/code-defaults';
import type { HubReviewOverride } from './corrections';
import { field, fields, jsonBlocks, links, plain, sections, unbold } from './md';

export interface ParsedHub {
  draft: CityHubDraftContent;
  faqVisible: Array<{ q: string; a: string }>;
  faqSchema: Array<{ q: string; a: string }>;
  /** Shared-section asserts that FAILED (each a description). */
  sharedMismatches: string[];
  /** Cards whose image came from the A-3 rule. */
  a3Cards: string[];
  /** Where the reviews came from (Brief 216: the MD when it carries real ones). */
  reviewSource: 'md' | 'override';
  errors: string[];
}

/** "4.8 stars from 860+ Google reviews for our Evanston office." → rating + the proof card's line. */
export function ratingFromIntro(intro: string): { rating: string; ratingSub: string } | null {
  const m = intro.trim().match(/^([1-5]\.\d) stars from (.+?)\.?$/);
  return m ? { rating: m[1], ratingSub: m[2] } : null;
}

/** A quoted review cell: the outer straight "…" dropped, everything inside verbatim. */
const unquote = (t: string) => (/^"[\s\S]*"$/.test(t.trim()) ? t.trim().slice(1, -1) : t.trim());

/** ' → ’ in visible copy, never inside a link target. */
export function curly(s: string): string {
  return s.replace(/(\]\([^)]*\))|'/g, (m, link: string | undefined) => (link ? link : '’'));
}
const straight = (s: string) => s.replace(/’/g, "'");

/** Batch 1 hub card images by service slug (identical across the 5 hubs). */
function batch1CardImages(): Map<string, { src: string; alt: string }> {
  const out = new Map<string, { src: string; alt: string }>();
  for (const hub of Object.values(CITY_HUBS)) for (const c of hub.services.cards) out.set(c.href.split('/').pop() as string, { ...c.image });
  return out;
}

export function parseHub(
  md: string,
  slug: string,
  cityName: string,
  shared: CityHubShared,
  override: HubReviewOverride | undefined,
  opts: { fullBleed?: HubHeroVideo } = {}
): ParsedHub {
  const errors: string[] = [];
  const mism: string[] = [];
  const a3Cards: string[] = [];
  const secs = sections(md);
  const sec = (n: number) => secs.find((s) => s.num === String(n));
  const rows = (n: number) => fields(sec(n)?.body ?? '');
  const need = (r: Array<[string, string]>, label: string, where: string) => {
    const v = field(r, label);
    if (v === undefined) errors.push(`${where}: no "${label}" row`);
    return v ?? '';
  };
  const assertEq = (what: string, md: string, sharedVal: string) => {
    if (curly(md).trim() !== sharedVal.trim()) mism.push(`${what}: MD "${md}" ≠ shared "${sharedVal}"`);
  };

  const meta = fields(secs.find((s) => s.title === 'META DATA')?.body ?? '');
  const metaTitle = need(meta, 'Title tag', 'META').replace(/\s*\|\s*J\.?\s*Blanton(?:\s+Plumbing)?\s*$/i, '').trim();
  const metaDescription = need(meta, 'Meta description', 'META');

  const hero = rows(1);
  const trust = rows(2).filter(([k]) => /^\d+$/.test(k)).map(([, v]) => curly(v));

  const svc = rows(3);
  assertEq('Services eyebrow', need(svc, 'Eyebrow', '3. SERVICES'), shared.servicesEyebrow);
  const imgs = batch1CardImages();
  const cards: HubCard[] = svc
    .filter(([k]) => /^H3 Card:/.test(k))
    .map(([k, desc]) => {
      const l = links(k)[0];
      const s = l ? (l.href.split('/').pop() as string) : '';
      let image = imgs.get(s);
      if (!image) {
        image = heroImageFor(s);
        if (image) a3Cards.push(s);
      }
      if (!image) errors.push(`3. SERVICES: no image rule for card "${k}"`);
      return { title: curly(l?.label ?? ''), href: l?.href ?? '', desc: curly(desc), image: image ?? { src: '', alt: '' } };
    });

  const office = rows(4);
  const areaLinks = links(need(office, 'H3 Body', '4. OFFICE'));
  const more = areaLinks.length && areaLinks[areaLinks.length - 1].label.toLowerCase() === 'more' ? areaLinks.pop()!.href : '';
  if (!more) errors.push('4. OFFICE: the communities line does not end with a "more" link');
  const schemaSec = secs.find((s) => /^SCHEMA/i.test(s.title));
  const json = jsonBlocks(schemaSec?.body ?? '');
  const plumber = json.find((j) => j['@type'] === 'Plumber') as { name?: string; url?: string; sameAs?: string[]; hasMap?: string; address?: Record<string, string>; areaServed?: string[] } | undefined;
  const a = plumber?.address;
  const address = a ? `${a.streetAddress}, ${a.addressLocality}, ${a.addressRegion} ${a.postalCode}` : '';
  if (!address) errors.push('SCHEMA: no Plumber address to take the office address from');

  const depth = rows(5);
  assertEq('Local Knowledge eyebrow', need(depth, 'Eyebrow', '5. LOCAL DEPTH'), shared.depthEyebrow);
  const tiles = [1, 2, 3, 4, 5, 6]
    .filter((n) => field(depth, `H3 ${n}`) !== undefined)
    .map((n) => ({ title: curly(field(depth, `H3 ${n}`) as string), body: curly(field(depth, `H3 ${n} Body`) ?? '') }));

  const mid = rows(6);
  assertEq('Mid CTA H2', need(mid, 'H2', '6. MID CTA'), shared.fin.h2);
  assertEq('Mid CTA body', need(mid, 'Body', '6. MID CTA'), shared.fin.body);
  assertEq('Mid CTA disclaimer', need(mid, 'Disclaimer', '6. MID CTA'), shared.fin.disclaimer);
  assertEq('Mid CTA button', need(mid, 'CTA', '6. MID CTA').split(' · ')[0], shared.fin.cta);

  const why = rows(7);
  assertEq('Why Us eyebrow', need(why, 'Eyebrow', '7. WHY US'), shared.why.eyebrow);
  assertEq('Why Us intro', need(why, 'Intro', '7. WHY US'), shared.why.intro);
  shared.why.items.forEach((it, i) => {
    assertEq(`Why Us item ${i + 1} heading`, field(why, `H3 ${i + 1}`) ?? '', it.h3);
    const body = (field(why, `H3 ${i + 1} Body`) ?? '').split(`(/${slug}/video-camera-sewer-inspections)`).join('({camera})');
    assertEq(`Why Us item ${i + 1} text`, body, it.body);
  });
  if (field(why, 'H3 4') !== undefined) mism.push('Why Us: the MD has a 4th item');

  const video = rows(8);
  assertEq('Video eyebrow', need(video, 'Eyebrow', '8. VIDEO'), shared.video.eyebrow);
  assertEq('Video H2', need(video, 'H2', '8. VIDEO'), shared.video.h2);
  assertEq('Video intro', need(video, 'Intro', '8. VIDEO'), shared.video.intro);
  assertEq('Video title', need(video, 'Thumbnail title', '8. VIDEO'), shared.video.title);
  const vid = need(video, 'Video', '8. VIDEO');
  if (!vid.includes(shared.video.youtubeId)) mism.push(`Video: MD "${vid}" is not the shared video ${shared.video.youtubeId}`);

  const rev = rows(9);
  const reviewsEyebrow = curly(need(rev, 'Eyebrow', '9. REVIEWS'));
  // Brief 216: the MD's own reviews when it carries real ones (Batch 3), else the override (Batch 2).
  const mdItems = [1, 2, 3].map((n) => ({ name: field(rev, `Review ${n} Name`), url: field(rev, `Review ${n} GBP URL`), text: field(rev, `Review ${n} Text`) }));
  const mdH2 = field(rev, 'H2');
  const mdIntro = field(rev, 'Intro');
  const mdReal =
    mdItems.every((r) => r.name && r.text) &&
    !!mdH2 && !!mdIntro &&
    ![mdH2, mdIntro, ...mdItems.flatMap((r) => [r.name ?? '', r.url ?? '', r.text ?? ''])].some((x) => placeholderIn(x));
  let reviewsFromMd: CityHubDraftContent['hub']['reviews'] | null = null;
  if (mdReal) {
    const rr = ratingFromIntro(mdIntro as string);
    if (!rr) errors.push(`9. REVIEWS: the intro "${mdIntro}" is not "N.N stars from … ." — the rating card is read off it`);
    reviewsFromMd = {
      eyebrow: reviewsEyebrow,
      h2: curly(mdH2 as string),
      intro: curly(mdIntro as string),
      rating: rr?.rating ?? '',
      ratingSub: curly(rr?.ratingSub ?? ''),
      items: mdItems.map((r) => {
        const u = (r.url ?? '').trim();
        if (u && !/^\(none\)$/i.test(u) && !GBP_URL_RE.test(u)) errors.push(`9. REVIEWS: review link "${u}" is not a Google share link`);
        return { name: (r.name as string).trim(), url: !u || /^\(none\)$/i.test(u) ? null : u, text: unquote(r.text as string) };
      }) as CityHubDraftContent['hub']['reviews']['items'],
    };
  } else if (!override) errors.push(`9. REVIEWS: no hubReviewOverrides entry for "${cityName}" — the MD's reviews are placeholders and are never published`);
  else if (override.items.length !== 3) errors.push(`9. REVIEWS: the override for "${cityName}" has ${override.items.length} reviews; a City Hub shows exactly 3`);

  const faqRows = rows(10);
  assertEq('FAQ eyebrow', need(faqRows, 'Eyebrow', '10. FAQ'), shared.faqEyebrow);
  const faqItems: Array<{ q: string; preview: string; a: string }> = [];
  for (let n = 1; n <= 20; n++) {
    const q = field(faqRows, `Q${n}`);
    if (q === undefined) break;
    const ans = curly(field(faqRows, `A${n}`) ?? '');
    faqItems.push({ q: curly(unbold(q)), preview: faqPreviewFromAnswer(ans), a: ans });
  }

  const ndc = rows(11);
  assertEq('NDC eyebrow', need(ndc, 'Eyebrow', '11. NO DRIP CLUB'), shared.ndc.eyebrow);
  assertEq('NDC H2', need(ndc, 'H2', '11. NO DRIP CLUB'), shared.ndc.h2);
  shared.ndc.benefits.forEach((b, i) => assertEq(`NDC benefit ${i + 1}`, field(ndc, `Benefit ${i + 1}`) ?? '', b));
  if (field(ndc, `Benefit ${shared.ndc.benefits.length + 1}`) !== undefined) mism.push('NDC: the MD has more benefits than the shared record');
  const ctaLink = links(need(ndc, 'CTA', '11. NO DRIP CLUB'))[0];
  assertEq('NDC button', ctaLink?.label ?? '', shared.ndc.cta);
  // Brief 216: compared without a trailing slash — G1 dropped the MD's; the button itself renders from
  // the shared record (its own '/no-drip-club/' is the deferred Batch 1–2 follow-up, not this page's).
  if ((ctaLink?.href ?? '').replace(/\/$/, '') !== shared.ndc.href.replace(/\/$/, '')) mism.push(`NDC button link: MD "${ctaLink?.href}" ≠ shared "${shared.ndc.href}"`);

  const fin = rows(12);

  const faqLd = json.find((j) => j['@type'] === 'FAQPage') as { mainEntity?: Array<{ name: string; acceptedAnswer: { text: string } }> } | undefined;
  const faqSchema = (faqLd?.mainEntity ?? []).map((e) => ({ q: e.name, a: e.acceptedAnswer?.text ?? '' }));

  const draft: CityHubDraftContent = {
    template: CITY_HUB_TEMPLATE,
    metaTitle,
    metaDescription,
    hub: {
      schema: 1,
      hero: {
        eyebrow: curly(need(hero, 'Eyebrow', '1. HERO')),
        h1: curly(need(hero, 'H1', '1. HERO')),
        sub: curly(need(hero, 'Subtext', '1. HERO')),
        photo: 'standard',
        crop: 'standard',
        ...(opts.fullBleed ? { layout: 'full-bleed' as const, video: { ...opts.fullBleed } } : {}),
      },
      trust,
      services: { h2: curly(need(svc, 'H2', '3. SERVICES')), intro: curly(need(svc, 'Intro', '3. SERVICES')), cards },
      office: {
        eyebrow: curly(need(office, 'Eyebrow', '4. OFFICE')),
        h2: curly(need(office, 'H2', '4. OFFICE')),
        body: curly(need(office, 'Body', '4. OFFICE')),
        address,
        areasH3: curly(need(office, 'H3', '4. OFFICE')),
        areas: areaLinks.map((l) => ({ label: curly(l.label), href: l.href })),
        more,
      },
      depth: { h2: curly(need(depth, 'H2', '5. LOCAL DEPTH')), intro: curly(need(depth, 'Intro', '5. LOCAL DEPTH')), tiles },
      whyH2: curly(need(why, 'H2', '7. WHY US')),
      reviews: reviewsFromMd ?? {
        eyebrow: reviewsEyebrow,
        h2: override?.h2 ?? '',
        intro: override?.intro ?? '',
        rating: override?.rating ?? '',
        ratingSub: override?.ratingSub ?? '',
        items: (override?.items ?? []).slice(0, 3).map((r) => ({ name: r.name, url: r.url ?? null, text: r.text })) as CityHubDraftContent['hub']['reviews']['items'],
      },
      faq: { h2: curly(need(faqRows, 'H2', '10. FAQ')), items: faqItems },
      ndc: curly(need(ndc, 'Body', '11. NO DRIP CLUB')),
      final: { eyebrow: curly(need(fin, 'Eyebrow', '12. FINAL CTA')), h2: curly(need(fin, 'H2', '12. FINAL CTA')), body: curly(need(fin, 'Body', '12. FINAL CTA')) },
    },
  };
  // Brief 216 (A2): the office's GBP link and the schema names, from the MD's Plumber block — stored
  // only where they differ from what the view derives anyway — then the derived node must equal it.
  if (plumber && (plumber.sameAs?.length || plumber.hasMap)) {
    const gbp = plumber.sameAs?.[0] ?? '';
    if (!GBP_URL_RE.test(gbp)) errors.push(`SCHEMA: Plumber sameAs "${gbp}" is not a Google share link`);
    if (plumber.hasMap !== gbp) errors.push(`SCHEMA: Plumber hasMap "${plumber.hasMap}" ≠ sameAs "${gbp}"`);
    const o = draft.hub.office;
    o.gbpUrl = gbp;
    const st = a?.addressRegion ?? '';
    const name = (plumber.name ?? '').replace(/^J\. Blanton Plumbing - /, '');
    if (name && name !== cityName) o.schemaName = name;
    const served = plumber.areaServed ?? [];
    if (served.length !== o.areas.length + 1) errors.push(`SCHEMA: Plumber areaServed has ${served.length} entries; the page has the city + ${o.areas.length} communities`);
    if (served[0] && served[0] !== `${cityName}, ${st}`) o.schemaArea = served[0];
    o.areas = o.areas.map((x, i) => (served[i + 1] && served[i + 1] !== `${x.label.replace(/’/g, "'")}, ${st}` ? { ...x, area: served[i + 1] } : x));
    if (a?.streetAddress && !plain(o.body).includes(a.streetAddress)) errors.push(`4. OFFICE: the office sentence does not carry the schema's street "${a.streetAddress}"`);
    const derived = hubPlumberJsonLd({ slug, name: cityName, office: o }, '', schemaPhone);
    const want = { name: plumber.name, url: plumber.url, sameAs: plumber.sameAs, hasMap: plumber.hasMap, address: plumber.address, areaServed: plumber.areaServed };
    const got = derived && { name: derived.name, url: derived.url, sameAs: derived.sameAs, hasMap: derived.hasMap, address: derived.address, areaServed: derived.areaServed };
    if (JSON.stringify(got) !== JSON.stringify(want)) errors.push(`SCHEMA: the derived Plumber node ≠ the MD's — derived ${JSON.stringify(got)} vs MD ${JSON.stringify(want)}`);
  }

  return {
    reviewSource: reviewsFromMd ? 'md' : 'override',
    draft,
    faqVisible: faqItems.map((f) => ({ q: straight(f.q), a: straight(plain(f.a)) })),
    faqSchema,
    sharedMismatches: mism,
    a3Cards,
    errors,
  };
}
