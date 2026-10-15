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
 *   Reviews  eyebrow from the MD; everything else from the corrections file's `hubReviewOverrides`
 *            (Marketing decision 3 — never the MD while it holds placeholders).
 *   FAQ      Q/A; the short answer from `faqPreviewFromAnswer` (the editor's "Auto-fill from answer").
 *   NDC      the city sentence.        Final    eyebrow, H2, body.
 * Sections that must EQUAL the shared record (Mid CTA, Why Us items, Video, NDC box, the Services /
 * Local Knowledge / FAQ eyebrows) are asserted, never written per page.
 *
 * Copy convention (Brief 205, how every Batch 1 hub is stored): visible copy uses the typographic
 * apostrophe ’ where the MDs type a straight one. Review quotes are kept exactly as supplied.
 */
import { CITY_HUBS } from '../../../src/lib/content/city-hubs';
import { CITY_HUB_TEMPLATE, faqPreviewFromAnswer, type CityHubDraftContent, type CityHubShared, type HubCard } from '../../../src/lib/city-hub-cms/model';
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
  errors: string[];
}

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

export function parseHub(md: string, slug: string, cityName: string, shared: CityHubShared, override: HubReviewOverride | undefined): ParsedHub {
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
  const plumber = json.find((j) => j['@type'] === 'Plumber') as { address?: Record<string, string> } | undefined;
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
  if (!override) errors.push(`9. REVIEWS: no hubReviewOverrides entry for "${cityName}" — the MD's reviews are placeholders and are never published`);
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
  if (ctaLink?.href !== shared.ndc.href) mism.push(`NDC button link: MD "${ctaLink?.href}" ≠ shared "${shared.ndc.href}"`);

  const fin = rows(12);

  const faqLd = json.find((j) => j['@type'] === 'FAQPage') as { mainEntity?: Array<{ name: string; acceptedAnswer: { text: string } }> } | undefined;
  const faqSchema = (faqLd?.mainEntity ?? []).map((e) => ({ q: e.name, a: e.acceptedAnswer?.text ?? '' }));

  const draft: CityHubDraftContent = {
    template: CITY_HUB_TEMPLATE,
    metaTitle,
    metaDescription,
    hub: {
      schema: 1,
      hero: { eyebrow: curly(need(hero, 'Eyebrow', '1. HERO')), h1: curly(need(hero, 'H1', '1. HERO')), sub: curly(need(hero, 'Subtext', '1. HERO')), photo: 'standard', crop: 'standard' },
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
      reviews: {
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
  return {
    draft,
    faqVisible: faqItems.map((f) => ({ q: straight(f.q), a: straight(plain(f.a)) })),
    faqSchema,
    sharedMismatches: mism,
    a3Cards,
    errors,
  };
}
