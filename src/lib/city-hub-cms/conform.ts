/**
 * Brief 212 (Track A) — the layout lock and per-field sanitising for City Hub content.
 *
 * `conformHub` / `conformShared` take whatever arrived (an editor's save, a stored row, an importer
 * payload) and return a value of exactly the City Hub shape, with:
 *   - every string through the injected plain-text sanitiser, PER FIELD, inside every array (the Brief
 *     168 lesson). City Hub copy has no markup but `[label](/href)` links, which survive the plain-text
 *     rule untouched (Brief 206 §0: all 761 live strings pass it unchanged), so the sanitiser's output
 *     IS the stored form here — unlike sewer trees, nothing is lost;
 *   - no literal phone number anywhere (`{{phone}}` rule, Brief 204's message), no `tel:` link;
 *   - well-formed `[label](/href)` links whose targets pass `linkProblem`;
 *   - service cards and stripe entries that resolve to a real `/{city}/{service}` page, community
 *     links that resolve to a registered city (injected resolvers — the registry is server-side);
 *   - the layout values locked: the hero crop is the page's own (Brief 206 decision 5) and reviews are
 *     exactly 3 (decision 1);
 *   - (Brief 216) the optional fields kept only when set, so a hub saved before them keeps its exact
 *     stored shape: `hero.layout` ('full-bleed' only — 'split' is the absent default) + `hero.video`
 *     (CloudFront / S3 https only, kept only with 'full-bleed'), `office.gbpUrl` (a Google share link;
 *     the address must then split into schema parts), `office.schemaName` / `schemaArea` and
 *     `office.areas[].area` (the Plumber JSON-LD's names, when they differ from the defaults);
 *     (Brief 217) `office.mapQuery` / `office.mapCid` / `office.mapTitle` (what the office map pins,
 *     and its title).
 *
 * `errors` lists what an editor must fix; the write path refuses on any error (422), the read path
 * renders the conformed value and falls back to the code module only when the STRUCTURE is wrong.
 * Emptied fields are not errors here — publishing checks them (`requiredEmptyFields`), so a draft can
 * be saved half-done but never go live that way.
 */
import {
  hasLiteralPhone,
  imageProblem,
  isObj,
  linkProblem,
  mdLinks,
  mdSyntaxProblem,
  PHONE_MESSAGE,
  type ConformIssue,
} from '@/lib/cms-v2/shared';
import {
  addressParts,
  GBP_URL_MESSAGE,
  GBP_URL_RE,
  HUB_MEDIA_MESSAGE,
  HUB_MEDIA_URL_RE,
  type CityHubShared,
  type CityHubStored,
  type HubCard,
  type HubCrop,
  type HubHeroLayout,
  type HubHeroVideo,
  type HubPhoto,
  type HubReview,
} from './model';
import { keepRatingFallbacks, RATING_TOKEN_ONLY_RE } from '@/lib/cms/tokens';

export interface HubChecks {
  /** Plain-text rule (server: sanitizeCmsPlainText; editor pre-check: identity). */
  plain(s: string): string;
  /** A registered city slug. */
  cityExists(slug: string): boolean;
  /** A city-service slug with a page template (any city). */
  cityServiceExists(service: string): boolean;
}

/** Client-side pre-check: no sanitising, every link target accepted (the server re-checks). */
export const HUB_CLIENT_CHECKS: HubChecks = { plain: (s) => s, cityExists: () => true, cityServiceExists: () => true };

export interface ConformResult<T> {
  value: T;
  errors: ConformIssue[];
}

const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/;
const RATING_RE = /^[1-5](?:\.\d)?$/;

class Ctx {
  errors: ConformIssue[] = [];
  constructor(public c: HubChecks) {}
  err(path: string, kind: ConformIssue['kind'], message: string) {
    this.errors.push({ path, kind, message });
  }
  obj(v: unknown, path: string): Record<string, unknown> {
    if (isObj(v)) return v;
    this.err(path, 'structure', 'Expected a group of fields.');
    return {};
  }
  list(v: unknown, path: string): unknown[] {
    if (Array.isArray(v)) return v;
    this.err(path, 'structure', 'Expected a list.');
    return [];
  }
  /** A plain or rich (`[label](/href)`) text field. */
  text(v: unknown, path: string, opts: { rich?: boolean } = {}): string {
    if (typeof v !== 'string') {
      this.err(path, 'structure', 'Expected text.');
      return '';
    }
    const out = this.c.plain(v);
    if (hasLiteralPhone(out)) this.err(path, 'phone', PHONE_MESSAGE);
    if (opts.rich) {
      const bad = mdSyntaxProblem(out);
      if (bad) this.err(path, 'link', bad);
      for (const l of mdLinks(out)) {
        const p = linkProblem(l.href);
        if (p) this.err(path, 'link', p);
      }
    } else if (/\[[^\]]*\]\([^)]*\)/.test(out)) {
      this.err(path, 'link', 'Links are not allowed in this field.');
    }
    return out;
  }
  href(v: unknown, path: string): string {
    const h = this.text(v, path);
    if (h) {
      const p = linkProblem(h);
      if (p) this.err(path, 'link', p);
    }
    return h;
  }
  image(v: unknown, path: string): { src: string; alt: string } {
    const o = this.obj(v, path);
    const src = this.text(o.src, `${path}.src`);
    if (src) {
      const p = imageProblem(src);
      if (p) this.err(`${path}.src`, 'image', p);
    }
    return { src, alt: this.text(o.alt, `${path}.alt`) };
  }
  num(v: unknown, path: string): number {
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) return Math.round(v);
    this.err(path, 'structure', 'Expected a positive number.');
    return 0;
  }
}

/** An optional plain-text field: absent / null / blank → '' (the caller then omits the key). */
function optText(ctx: Ctx, v: unknown, path: string): string {
  if (v === undefined || v === null) return '';
  return ctx.text(v, path).trim();
}

function photo(ctx: Ctx, v: unknown, path: string): 'standard' | HubPhoto {
  if (v === 'standard') return 'standard';
  const o = ctx.obj(v, path);
  const out: HubPhoto = {
    src: ctx.text(o.src, `${path}.src`),
    src1100: typeof o.src1100 === 'string' ? ctx.text(o.src1100, `${path}.src1100`) : '',
    mobile: ctx.text(o.mobile, `${path}.mobile`),
    alt: ctx.text(o.alt, `${path}.alt`),
    width: ctx.num(o.width, `${path}.width`),
    height: ctx.num(o.height, `${path}.height`),
  };
  for (const k of ['src', 'src1100', 'mobile'] as const) {
    if (out[k]) {
      const p = imageProblem(out[k]);
      if (p) ctx.err(`${path}.${k}`, 'image', p);
    }
  }
  return out;
}

/**
 * One city's hub content. `slug` is the city the content is for (its own service links must point at
 * `/{slug}/…`); `crop` is the page's locked hero crop.
 */
export function conformHub(raw: unknown, slug: string, crop: HubCrop, checks: HubChecks): ConformResult<CityHubStored> {
  const ctx = new Ctx(checks);
  const r = ctx.obj(raw, '');
  const hero = ctx.obj(r.hero, 'hero');
  if (hero.crop !== undefined && hero.crop !== crop) {
    ctx.err('hero.crop', 'value', 'The hero crop is part of the page layout and can’t be changed here.');
  }
  const services = ctx.obj(r.services, 'services');
  const office = ctx.obj(r.office, 'office');
  const depth = ctx.obj(r.depth, 'depth');
  const reviews = ctx.obj(r.reviews, 'reviews');
  const faq = ctx.obj(r.faq, 'faq');
  const final = ctx.obj(r.final, 'final');

  const cards: HubCard[] = ctx.list(services.cards, 'services.cards').map((c, i) => {
    const p = `services.cards[${i}]`;
    const o = ctx.obj(c, p);
    const href = ctx.href(o.href, `${p}.href`);
    const m = href.match(/^\/([a-z0-9-]+)\/([a-z0-9-]+)$/);
    if (href && (!m || m[1] !== slug || !checks.cityServiceExists(m[2]))) {
      ctx.err(`${p}.href`, 'link', `A service card must link to one of this city’s service pages (/${slug}/…).`);
    }
    return { title: ctx.text(o.title, `${p}.title`), href, desc: ctx.text(o.desc, `${p}.desc`), image: ctx.image(o.image, `${p}.image`) };
  });

  const areas = ctx.list(office.areas, 'office.areas').map((a, i) => {
    const p = `office.areas[${i}]`;
    const o = ctx.obj(a, p);
    const href = ctx.href(o.href, `${p}.href`);
    const m = href.match(/^\/([a-z0-9-]+)$/);
    if (href && (!m || !checks.cityExists(m[1]))) ctx.err(`${p}.href`, 'link', 'A community link must point at a city page (e.g. /glenview).');
    // Brief 216: the optional schema name is kept only when it says something (absent = "{label}, {ST}").
    const area = optText(ctx, o.area, `${p}.area`);
    return { label: ctx.text(o.label, `${p}.label`), href, ...(area ? { area } : {}) };
  });

  const items = ctx.list(reviews.items, 'reviews.items');
  if (items.length !== 3) ctx.err('reviews.items', 'structure', 'A City Hub shows exactly 3 reviews (1 main + 2 side).');
  const reviewItems = items.slice(0, 3).map((x, i): HubReview => {
    const p = `reviews.items[${i}]`;
    const o = ctx.obj(x, p);
    let url: string | null = null;
    if (o.url !== null && o.url !== undefined && o.url !== '') {
      url = ctx.text(o.url, `${p}.url`);
      if (url && !/^https:\/\/[^\s"<>]+$/i.test(url)) ctx.err(`${p}.url`, 'link', 'A Google review link must be a full https:// address.');
    }
    return { name: ctx.text(o.name, `${p}.name`), url, text: ctx.text(o.text, `${p}.text`) };
  }) as CityHubStored['reviews']['items'];
  const rating = ctx.text(reviews.rating, 'reviews.rating');
  if (rating && !RATING_RE.test(rating) && !RATING_TOKEN_ONLY_RE.test(rating)) {
    ctx.err('reviews.rating', 'value', 'The rating is a number from 1 to 5 with at most one decimal (e.g. 4.7), or {{office_rating}}.');
  }

  // Brief 216 (Track C3): the hero layout and its video. 'split' is stored as absent, and a video is
  // kept only with 'full-bleed', so every hub saved before Brief 216 keeps exactly its stored shape.
  let layout: HubHeroLayout | undefined;
  if (hero.layout !== undefined && hero.layout !== null && hero.layout !== '' && hero.layout !== 'split') {
    if (hero.layout === 'full-bleed') layout = 'full-bleed';
    else ctx.err('hero.layout', 'value', `The hero layout is "split" or "full-bleed" (got "${String(hero.layout)}").`);
  }
  let video: HubHeroVideo | undefined;
  if (layout === 'full-bleed' && hero.video !== undefined && hero.video !== null) {
    const v = ctx.obj(hero.video, 'hero.video');
    const media = (x: unknown, path: string, required: boolean) => {
      const u = optText(ctx, x, path);
      if (u && !HUB_MEDIA_URL_RE.test(u)) ctx.err(path, 'image', HUB_MEDIA_MESSAGE);
      if (!u && required) ctx.err(path, 'empty', 'A full-bleed hero video needs this address.');
      return u;
    };
    const src = media(v.src, 'hero.video.src', true);
    const poster = media(v.poster, 'hero.video.poster', true);
    const srcMobile = media(v.srcMobile, 'hero.video.srcMobile', false);
    video = { src, poster, ...(srcMobile ? { srcMobile } : {}) };
  }

  // Brief 216 (Track A2): the Google Business Profile link and the two optional schema names.
  const gbpUrl = optText(ctx, office.gbpUrl, 'office.gbpUrl');
  if (gbpUrl && !GBP_URL_RE.test(gbpUrl)) ctx.err('office.gbpUrl', 'link', GBP_URL_MESSAGE);
  const schemaName = optText(ctx, office.schemaName, 'office.schemaName');
  const schemaArea = optText(ctx, office.schemaArea, 'office.schemaArea');
  // Brief 217 (C3): what the office map pins and its title — kept only when set (absent = the address
  // and the shared title pattern), so every hub saved before them keeps its exact stored shape.
  const mapQuery = optText(ctx, office.mapQuery, 'office.mapQuery');
  const mapTitle = optText(ctx, office.mapTitle, 'office.mapTitle');
  const mapCid = optText(ctx, office.mapCid, 'office.mapCid');
  if (mapCid && !/^\d{5,25}$/.test(mapCid)) ctx.err('office.mapCid', 'value', 'The listing id (CID) is digits only, e.g. 14905587217898728371.');
  const address = ctx.text(office.address, 'office.address');
  if (gbpUrl && address && !addressParts(address)) {
    ctx.err('office.address', 'value', 'With a Google Business Profile link the address must read “street, city, ST 12345” (it is split into the Google schema).');
  }

  const value: CityHubStored = {
    schema: 1,
    hero: {
      eyebrow: ctx.text(hero.eyebrow, 'hero.eyebrow'),
      h1: ctx.text(hero.h1, 'hero.h1'),
      sub: ctx.text(hero.sub, 'hero.sub'),
      photo: photo(ctx, hero.photo, 'hero.photo'),
      crop,
      ...(layout ? { layout } : {}),
      ...(video ? { video } : {}),
    },
    trust: ctx.list(r.trust, 'trust').map((t, i) => ctx.text(t, `trust[${i}]`)),
    services: { h2: ctx.text(services.h2, 'services.h2'), intro: ctx.text(services.intro, 'services.intro'), cards },
    office: {
      eyebrow: ctx.text(office.eyebrow, 'office.eyebrow'),
      h2: ctx.text(office.h2, 'office.h2'),
      body: ctx.text(office.body, 'office.body'),
      address,
      areasH3: ctx.text(office.areasH3, 'office.areasH3'),
      areas,
      more: ctx.href(office.more, 'office.more'),
      ...(gbpUrl ? { gbpUrl } : {}),
      ...(schemaName ? { schemaName } : {}),
      ...(schemaArea ? { schemaArea } : {}),
      ...(mapQuery ? { mapQuery } : {}),
      ...(mapTitle ? { mapTitle } : {}),
      ...(mapCid ? { mapCid } : {}),
    },
    depth: {
      h2: ctx.text(depth.h2, 'depth.h2'),
      intro: ctx.text(depth.intro, 'depth.intro'),
      tiles: ctx.list(depth.tiles, 'depth.tiles').map((t, i) => {
        const o = ctx.obj(t, `depth.tiles[${i}]`);
        return { title: ctx.text(o.title, `depth.tiles[${i}].title`), body: ctx.text(o.body, `depth.tiles[${i}].body`, { rich: true }) };
      }),
    },
    whyH2: ctx.text(r.whyH2, 'whyH2'),
    reviews: {
      eyebrow: ctx.text(reviews.eyebrow, 'reviews.eyebrow'),
      h2: ctx.text(reviews.h2, 'reviews.h2'),
      intro: ctx.text(reviews.intro, 'reviews.intro'),
      rating,
      ratingSub: ctx.text(reviews.ratingSub, 'reviews.ratingSub'),
      items: reviewItems,
    },
    faq: {
      h2: ctx.text(faq.h2, 'faq.h2'),
      items: ctx.list(faq.items, 'faq.items').map((f, i) => {
        const p = `faq.items[${i}]`;
        const o = ctx.obj(f, p);
        return { q: ctx.text(o.q, `${p}.q`), preview: ctx.text(o.preview, `${p}.preview`), a: ctx.text(o.a, `${p}.a`, { rich: true }) };
      }),
    },
    ndc: ctx.text(r.ndc, 'ndc', { rich: true }),
    final: { eyebrow: ctx.text(final.eyebrow, 'final.eyebrow'), h2: ctx.text(final.h2, 'final.h2'), body: ctx.text(final.body, 'final.body') },
  };
  // Brief 221: the pre-token fallbacks of the rating-bearing fields, kept only while those fields still
  // carry that token text (absent otherwise — a hub without tokens keeps its exact stored shape).
  const ratingFallbacks = keepRatingFallbacks(
    r.ratingFallbacks,
    [...value.trust, value.reviews.intro, value.reviews.rating, value.reviews.ratingSub],
    (v, k) => ctx.text(v, `ratingFallbacks[${k}]`)
  );
  if (ratingFallbacks) value.ratingFallbacks = ratingFallbacks;
  return { value, errors: ctx.errors };
}

export function conformHubMeta(input: { metaTitle?: unknown; metaDescription?: unknown }, checks: HubChecks) {
  const ctx = new Ctx(checks);
  const metaTitle = ctx.text(input.metaTitle ?? '', 'metaTitle');
  const metaDescription = ctx.text(input.metaDescription ?? '', 'metaDescription');
  if (/\|\s*(?:J\.?\s*Blanton(?:\s+Plumbing)?|JBP)\s*$/i.test(metaTitle)) {
    ctx.err('metaTitle', 'value', 'Leave “| J. Blanton Plumbing” off the SEO title — the site adds it once, automatically.');
  }
  return { value: { metaTitle, metaDescription }, errors: ctx.errors };
}

/** The shared record. Every field is required (it renders on every hub). */
export function conformShared(raw: unknown, checks: HubChecks): ConformResult<CityHubShared> {
  const ctx = new Ctx(checks);
  const r = ctx.obj(raw, '');
  const req = (v: string, path: string) => {
    if (!v.trim()) ctx.err(path, 'empty', 'This field can’t be empty — it shows on every City Hub.');
    return v;
  };
  const t = (v: unknown, path: string, rich = false) => req(ctx.text(v, path, { rich }), path);
  const linkList = (v: unknown, path: string) =>
    ctx.list(v, path).map((x, i) => {
      const o = ctx.obj(x, `${path}[${i}]`);
      return { label: t(o.label, `${path}[${i}].label`), href: req(ctx.href(o.href, `${path}[${i}].href`), `${path}[${i}].href`) };
    });
  const img = (v: unknown, path: string) => {
    const i = ctx.image(v, path);
    req(i.src, `${path}.src`);
    req(i.alt, `${path}.alt`);
    return i;
  };
  const fin = ctx.obj(r.fin, 'fin');
  const why = ctx.obj(r.why, 'why');
  const video = ctx.obj(r.video, 'video');
  const vs = ctx.obj(r.videoSchema, 'videoSchema');
  const bbb = ctx.obj(r.bbb, 'bbb');
  const ndc = ctx.obj(r.ndc, 'ndc');
  const labels = ctx.obj(r.labels, 'labels');
  const patterns = ctx.obj(r.patterns, 'patterns');
  const youtubeId = t(video.youtubeId, 'video.youtubeId');
  if (youtubeId && !YOUTUBE_ID_RE.test(youtubeId)) ctx.err('video.youtubeId', 'value', 'A YouTube video id is 11 letters, digits, - or _ (the part after watch?v=).');
  const van = photo(ctx, r.vanPhoto, 'vanPhoto');
  if (van === 'standard') ctx.err('vanPhoto', 'structure', 'The standard van photo needs its own images.');

  const rawText = (v: unknown, path: string) => (typeof v === 'string' ? v : (ctx.err(path, 'structure', 'Expected text.'), ''));
  const value: CityHubShared = {
    schema: 1,
    heroPillsLabel: t(r.heroPillsLabel, 'heroPillsLabel'),
    heroPills: linkList(r.heroPills, 'heroPills'),
    badge24Label: t(r.badge24Label, 'badge24Label'),
    trustLabel: t(r.trustLabel, 'trustLabel'),
    servicesEyebrow: t(r.servicesEyebrow, 'servicesEyebrow'),
    officeSchedule: t(r.officeSchedule, 'officeSchedule'),
    depthEyebrow: t(r.depthEyebrow, 'depthEyebrow'),
    fin: { eyebrow: t(fin.eyebrow, 'fin.eyebrow'), h2: t(fin.h2, 'fin.h2'), body: t(fin.body, 'fin.body'), disclaimer: t(fin.disclaimer, 'fin.disclaimer'), cta: t(fin.cta, 'fin.cta') },
    why: {
      eyebrow: t(why.eyebrow, 'why.eyebrow'),
      intro: t(why.intro, 'why.intro'),
      items: ctx.list(why.items, 'why.items').map((x, i) => {
        const o = ctx.obj(x, `why.items[${i}]`);
        // `{camera}` is the one token in shared copy: it becomes /{city}/video-camera-sewer-inspections.
        const body = t(typeof o.body === 'string' ? o.body.replace(/\{camera\}/g, '/camera-token') : o.body, `why.items[${i}].body`, true);
        return { h3: t(o.h3, `why.items[${i}].h3`), body: body.replace(/\/camera-token/g, '{camera}') };
      }),
      image: img(why.image, 'why.image'),
    },
    video: { eyebrow: t(video.eyebrow, 'video.eyebrow'), h2: t(video.h2, 'video.h2'), intro: t(video.intro, 'video.intro'), title: t(video.title, 'video.title'), youtubeId },
    videoSchema: {
      name: t(vs.name, 'videoSchema.name'),
      description: t(vs.description, 'videoSchema.description'),
      thumbnailUrl: t(vs.thumbnailUrl, 'videoSchema.thumbnailUrl'),
      uploadDate: t(vs.uploadDate, 'videoSchema.uploadDate'),
      duration: t(vs.duration, 'videoSchema.duration'),
    },
    reviewsProofLabel: t(r.reviewsProofLabel, 'reviewsProofLabel'),
    verified: t(r.verified, 'verified'),
    readOnGoogle: t(r.readOnGoogle, 'readOnGoogle'),
    bbb: (() => {
      const seal = img({ src: bbb.src, alt: bbb.alt }, 'bbb');
      return { href: req(ctx.href(bbb.href, 'bbb.href'), 'bbb.href'), alt: seal.alt, src: seal.src, label: t(bbb.label, 'bbb.label') };
    })(),
    faqEyebrow: t(r.faqEyebrow, 'faqEyebrow'),
    ndc: {
      eyebrow: t(ndc.eyebrow, 'ndc.eyebrow'),
      h2: t(ndc.h2, 'ndc.h2'),
      benefits: ctx.list(ndc.benefits, 'ndc.benefits').map((b, i) => t(b, `ndc.benefits[${i}]`)),
      cta: t(ndc.cta, 'ndc.cta'),
      href: req(ctx.href(ndc.href, 'ndc.href'), 'ndc.href'),
      mascot: img(ndc.mascot, 'ndc.mascot'),
    },
    finalSchedule: t(r.finalSchedule, 'finalSchedule'),
    stripeTitle: t(r.stripeTitle, 'stripeTitle'),
    stripe: ctx.list(r.stripe, 'stripe').map((g, gi) => {
      const o = ctx.obj(g, `stripe[${gi}]`);
      return {
        group: t(o.group, `stripe[${gi}].group`),
        items: ctx.list(o.items, `stripe[${gi}].items`).map((x, i) => {
          const it = ctx.obj(x, `stripe[${gi}].items[${i}]`);
          const slug = t(it.slug, `stripe[${gi}].items[${i}].slug`);
          if (slug && !checks.cityServiceExists(slug)) ctx.err(`stripe[${gi}].items[${i}].slug`, 'link', `"${slug}" is not a city service page.`);
          return { label: t(it.label, `stripe[${gi}].items[${i}].label`), slug };
        }),
      };
    }),
    vanPhoto: van === 'standard' ? { src: '', src1100: '', mobile: '', alt: '', width: 0, height: 0 } : van,
    labels: {
      learnMore: t(labels.learnMore, 'labels.learnMore'),
      callNow: t(labels.callNow, 'labels.callNow'),
      // Leading/trailing spaces are part of these two (they sit between other words).
      callNowPrefix: req(rawText(labels.callNowPrefix, 'labels.callNowPrefix'), 'labels.callNowPrefix'),
      reviewStars: t(labels.reviewStars, 'labels.reviewStars'),
      and: req(rawText(labels.and, 'labels.and'), 'labels.and'),
      more: t(labels.more, 'labels.more'),
    },
    patterns: {
      cardAria: t(patterns.cardAria, 'patterns.cardAria'),
      directoryAria: t(patterns.directoryAria, 'patterns.directoryAria'),
      mapTitle: t(patterns.mapTitle, 'patterns.mapTitle'),
      addressName: t(patterns.addressName, 'patterns.addressName'),
      stripeCount: t(patterns.stripeCount, 'patterns.stripeCount'),
    },
  };
  for (const k of ['callNowPrefix', 'and'] as const) {
    const v = value.labels[k];
    if (/<|>/.test(v) || hasLiteralPhone(v)) ctx.err(`labels.${k}`, 'value', 'Plain words only.');
  }
  return { value, errors: ctx.errors };
}

export const structureBroken = (errors: readonly ConformIssue[]) => errors.some((e) => e.kind === 'structure');
