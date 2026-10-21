/**
 * Brief 212 (Track A = Brief 206 Tracks B–E) — the City Hub CMS content model. Pure and client-safe
 * (the admin editor imports it too).
 *
 * Storage (Brief 206 §4, approved by Marketing 2026-10-15):
 *   - `city_pages.hub_content`      → `CityHubStored` (one per city on the "City Hub" template)
 *   - `city_pages.pre_hub_template` → the template the city was on before it was switched to City Hub
 *   - `city_pages.template_type`    → 'city-hub'
 *   - meta title/description        → the row's existing `meta_title` / `meta_description`, suffix-free,
 *                                     read ONLY when the row is a City Hub with hub content
 *   - the sections every hub shares → `main_pages` row `city-hubs` (`page_type 'city-hub-shared'`),
 *                                     content `CityHubShared`, edited at /admin/city-hubs
 * A version (`page_drafts.content`) of a hub is `CityHubDraftContent` (`template: 'city-hub'`), of the
 * shared record `CityHubSharedDraftContent` (`template: 'city-hub-shared'`). A city version WITHOUT the
 * marker is "old-shaped" (the pre-hub layout): opened read-only, never published onto a City Hub row.
 *
 * Strings are stored exactly as they render (typographic ’, `[label](/href)` for an inline link — the
 * only markup `CityHubView` understands). Phone numbers are never stored: every phone position renders
 * from Global Settings, and the phone REGION is derived from the city's state (never a field).
 */
import { clone } from '@/lib/cms-v2/shared';

export const CITY_HUB_TEMPLATE = 'city-hub';
export const CITY_HUB_SHARED_TEMPLATE = 'city-hub-shared';
/** The `main_pages` row (and `page_drafts.page_slug`) of the shared record. */
export const CITY_HUB_SHARED_SLUG = 'city-hubs';
/** `page_drafts.page_type` of the shared record (an alias of canonical `main`). */
export const CITY_HUB_SHARED_PAGE_TYPE = 'city-hub-shared';

export const PRE_HUB_ARCHIVE_LABEL = 'Pre-hub archive (2026-10)';
/** Brief 216 (Track A) — the Batch 1–2 hub update. */
export const HUB_V2_REVIEWS_GBP_LABEL = 'Version 2 — Office reviews + GBP schema (2026-10)';
export const HUB_V1_LABEL = 'Version 1 — City Hub';
export const SHARED_V1_LABEL = 'Version 1 — Shared across all City Hubs';
export const OLD_HUB_SHAPE_MESSAGE = "This version uses the old pre-hub layout and can't be edited or published here.";

export interface HubImage {
  src: string;
  alt: string;
}

/** A hero photo set: desktop 2000w (+1100w srcset), the ≤900px `<source>`, alt and intrinsic size. */
export interface HubPhoto {
  src: string;
  src1100: string;
  mobile: string;
  alt: string;
  width: number;
  height: number;
}

export interface HubCard {
  title: string;
  href: string;
  desc: string;
  image: HubImage;
}

export interface HubReview {
  name: string;
  /** Google Business Profile review link; null → no "Read on Google" line. */
  url: string | null;
  text: string;
}

/** Hero crop modifiers that exist in city-hubs.css. Locked per page (Brief 206 decision 5). */
export type HubCrop = 'standard' | 'columbus';

/**
 * Brief 216 (Track C3) — the hero layout. 'split' (the default, and every hub before Brief 216): the
 * photo in the right of the hero beside a solid Midnight text column. 'full-bleed': the Sewer hub hero
 * treatment — a full-width background (the video, else the photo) under a soft Midnight overlay.
 * Stored only as 'full-bleed' (absent = 'split'), so every existing hub's stored content is unchanged.
 */
export type HubHeroLayout = 'split' | 'full-bleed';
export const HUB_HERO_LAYOUTS: readonly HubHeroLayout[] = ['split', 'full-bleed'];

/** Brief 216 — a full-bleed hero's background video (https, on the project's CloudFront / S3 hosts). */
export interface HubHeroVideo {
  src: string;
  poster: string;
  /** Optional portrait / mobile cut, played below 781px. */
  srcMobile?: string;
}

/** One city's hub content (`city_pages.hub_content`). */
export interface CityHubStored {
  schema: 1;
  hero: {
    eyebrow: string;
    h1: string;
    sub: string;
    /** 'standard' = the shared van photo (edited on the shared record); otherwise this page's own photo. */
    photo: 'standard' | HubPhoto;
    crop: HubCrop;
    /** Brief 216: present only as 'full-bleed' (absent = 'split'). */
    layout?: HubHeroLayout;
    /** Brief 216: the full-bleed hero's video (kept only with layout 'full-bleed'). */
    video?: HubHeroVideo;
  };
  trust: string[];
  services: { h2: string; intro: string; cards: HubCard[] };
  office: {
    eyebrow: string;
    h2: string;
    body: string;
    address: string;
    areasH3: string;
    /** `area` (Brief 216, optional): the community's `areaServed` name in the Plumber JSON-LD when it
     *  isn't "{label}, {ST}" (e.g. "Rogers Park, Chicago, IL"). */
    areas: Array<{ label: string; href: string; area?: string }>;
    more: string;
    /** Brief 216 (Track A2, optional): the office's Google Business Profile share link. When set, the
     *  hub emits its page-scoped Plumber JSON-LD (`sameAs` + `hasMap`). */
    gbpUrl?: string;
    /** The office name in that schema ("J. Blanton Plumbing - {schemaName}"); default = the city name. */
    schemaName?: string;
    /** The hub city's own `areaServed` entry; default = "{City}, {ST}". */
    schemaArea?: string;
  };
  depth: { h2: string; intro: string; tiles: Array<{ title: string; body: string }> };
  /** The Why Us H2 (visible heading, per page — Brief 206 decision 3). */
  whyH2: string;
  reviews: {
    eyebrow: string;
    h2: string;
    intro: string;
    rating: string;
    ratingSub: string;
    items: [HubReview, HubReview, HubReview];
  };
  faq: { h2: string; items: Array<{ q: string; preview: string; a: string }> };
  ndc: string;
  final: { eyebrow: string; h2: string; body: string };
}

/** What `CityHubView` renders: the stored content + the two derived identity fields. */
export interface CityHubRender extends CityHubStored {
  slug: string;
  /** The city registry name (never stored). */
  name: string;
}

/** The sections every City Hub shares (`main_pages` row `city-hubs`). */
export interface CityHubShared {
  schema: 1;
  heroPillsLabel: string;
  heroPills: Array<{ label: string; href: string }>;
  badge24Label: string;
  trustLabel: string;
  servicesEyebrow: string;
  officeSchedule: string;
  depthEyebrow: string;
  fin: { eyebrow: string; h2: string; body: string; disclaimer: string; cta: string };
  why: { eyebrow: string; intro: string; items: Array<{ h3: string; body: string }>; image: HubImage };
  video: { eyebrow: string; h2: string; intro: string; title: string; youtubeId: string };
  /** The VideoObject fields; contentUrl / embedUrl are derived from `video.youtubeId`. */
  videoSchema: { name: string; description: string; thumbnailUrl: string; uploadDate: string; duration: string };
  reviewsProofLabel: string;
  verified: string;
  readOnGoogle: string;
  bbb: { href: string; alt: string; src: string; label: string };
  faqEyebrow: string;
  ndc: { eyebrow: string; h2: string; benefits: string[]; cta: string; href: string; mascot: HubImage };
  finalSchedule: string;
  stripeTitle: string;
  /** "Explore all our plumbing services": groups of city-service slugs (the href is `/{city}/{slug}`). */
  stripe: Array<{ group: string; items: Array<{ label: string; slug: string }> }>;
  /** The "Standard van photo" every hub without its own photo uses. */
  vanPhoto: HubPhoto;
  /** Small labels the view used to hard-code (Brief 206 §2.3). */
  labels: { learnMore: string; callNow: string; callNowPrefix: string; reviewStars: string; and: string; more: string };
  /** Patterns with `{city}` (and `{card}` / `{n}`), filled per page. */
  patterns: { cardAria: string; directoryAria: string; mapTitle: string; addressName: string; stripeCount: string };
}

export interface CityHubDraftContent {
  template: typeof CITY_HUB_TEMPLATE;
  hub: CityHubStored;
  metaTitle: string;
  metaDescription: string;
}

export interface CityHubSharedDraftContent {
  template: typeof CITY_HUB_SHARED_TEMPLATE;
  shared: CityHubShared;
}

const isRecord = (c: unknown): c is Record<string, unknown> => !!c && typeof c === 'object' && !Array.isArray(c);

export function isCityHubDraftContent(c: unknown): c is CityHubDraftContent {
  return isRecord(c) && c.template === CITY_HUB_TEMPLATE && isRecord(c.hub);
}

export function isCityHubSharedDraftContent(c: unknown): c is CityHubSharedDraftContent {
  return isRecord(c) && c.template === CITY_HUB_SHARED_TEMPLATE && isRecord(c.shared);
}

/** The page types a city version can carry (Brief 159 aliases of canonical 'city'). */
export const CITY_PAGE_TYPES = ['city', 'city-coverage', 'city-local', 'local-office-v2'] as const;
export const isCityPageType = (t: string) => (CITY_PAGE_TYPES as readonly string[]).includes(t);

/** `{city}` / `{card}` / `{n}` → values. */
export function fillPattern(pattern: string, vars: Record<string, string | number>): string {
  return pattern.replace(/\{(city|card|n)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

/**
 * FAQ "short answer" auto-fill (Brief 206 decision 7): the first sentence of the answer; if that is
 * three words or fewer, the next sentence too. Links are reduced to their text.
 */
export function faqPreviewFromAnswer(answer: string): string {
  const text = answer.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '$1').trim();
  const sentences = splitSentences(text);
  if (sentences.length === 0) return text;
  const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
  if (words(sentences[0]) <= 3 && sentences.length > 1) return `${sentences[0]} ${sentences[1]}`;
  return sentences[0];
}

/** Abbreviations whose full stop never ends a sentence ("J. Blanton", "St. Charles", "Mt. Prospect"). */
const NOT_A_SENTENCE_END = /(?:^|\s)(?:[A-Z]|St|Mt|Ft|Dr|Mr|Mrs|Ms|No|vs|etc)\.$/;

/** Split into sentences at . ! ? followed by a space, never after an abbreviation. */
export function splitSentences(text: string): string[] {
  const out: string[] = [];
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch !== '.' && ch !== '!' && ch !== '?') continue;
    let j = i;
    while (j + 1 < text.length && /[.!?”"’)]/.test(text[j + 1])) j++;
    if (j + 1 < text.length && !/\s/.test(text[j + 1])) continue;
    const candidate = text.slice(start, j + 1).trim();
    if (ch === '.' && NOT_A_SENTENCE_END.test(text.slice(start, i + 1))) continue;
    if (candidate) out.push(candidate);
    start = j + 1;
    i = j;
  }
  const tail = text.slice(start).trim();
  if (tail) out.push(tail);
  return out;
}

/** Stored + identity → what the view renders. */
export function toRender(stored: CityHubStored, slug: string, name: string): CityHubRender {
  return { ...clone(stored), slug, name };
}

// ── Brief 216 (Track A2): the page-scoped Plumber JSON-LD ─────────────────────────────────────────

/** A Google Business Profile share link: maps.app.goo.gl or google.com/maps only. */
export const GBP_URL_RE = /^https:\/\/(?:maps\.app\.goo\.gl\/[A-Za-z0-9_-]+|www\.google\.com\/maps\/[^\s"<>]+)$/;
export const GBP_URL_MESSAGE = 'Use the office’s Google share link (https://maps.app.goo.gl/… or https://www.google.com/maps/…).';

/** "1603 Orrington Ave, #600-1085, Evanston, IL 60201" → its schema parts, or null when it isn't that shape. */
export function addressParts(address: string): { streetAddress: string; addressLocality: string; addressRegion: string; postalCode: string } | null {
  const m = address.trim().match(/^(.+),\s*([^,]+),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/);
  return m ? { streetAddress: m[1].trim(), addressLocality: m[2].trim(), addressRegion: m[3], postalCode: m[4] } : null;
}

const SITE = 'https://jblantonplumbing.com';

/**
 * The hub's Plumber node (Marketing 2026-10-21, decision 2), built from data in a FIXED key order — in
 * code, never round-tripped through JSONB. Null when the hub has no GBP link (Highland Park, every
 * hub before its Version 2) or its office address can't be split into schema parts.
 */
export function hubPlumberJsonLd(hub: Pick<CityHubRender, 'slug' | 'name' | 'office'>, phoneDisplay: string, schemaPhone: (d: string) => string) {
  const gbp = hub.office.gbpUrl;
  const a = addressParts(hub.office.address);
  if (!gbp || !a) return null;
  const st = a.addressRegion;
  return {
    '@context': 'https://schema.org',
    '@type': 'Plumber',
    '@id': `${SITE}/${hub.slug}#office`,
    name: `J. Blanton Plumbing - ${hub.office.schemaName || hub.name}`,
    url: `${SITE}/${hub.slug}`,
    sameAs: [gbp],
    hasMap: gbp,
    telephone: schemaPhone(phoneDisplay),
    address: { '@type': 'PostalAddress', ...a, addressCountry: 'US' },
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      opens: '00:00',
      closes: '23:59',
    },
    areaServed: [hub.office.schemaArea || `${hub.name}, ${st}`, ...hub.office.areas.map((x) => x.area || `${x.label}, ${st}`)],
  };
}

// ── Brief 216 (Track C3): the full-bleed hero's media ─────────────────────────────────────────────

/** Hero video / poster URLs: https on the project's CloudFront or S3 hosts only. */
export const HUB_MEDIA_URL_RE = /^https:\/\/(?:[a-z0-9-]+\.cloudfront\.net|[a-z0-9.-]+\.s3[.-][a-z0-9.-]*amazonaws\.com)\/[^\s"<>]+$/i;
export const HUB_MEDIA_MESSAGE = 'Use an https address on the site’s CloudFront or S3 storage (e.g. https://d1rplazj5a80fb.cloudfront.net/videos/…).';

/**
 * Per-city fields a City Hub can't go live without (Brief 206 decision 4): every text, image, link and
 * list item except a review's Google link (null = no "Read on Google" line). Returns their paths.
 */
export function requiredEmptyFields(hub: CityHubStored, metaTitle: string, metaDescription: string): string[] {
  const out: string[] = [];
  const need = (path: string, v: unknown) => {
    if (typeof v !== 'string' || v.trim() === '') out.push(path);
  };
  need('metaTitle', metaTitle);
  need('metaDescription', metaDescription);
  need('hero.eyebrow', hub.hero?.eyebrow);
  need('hero.h1', hub.hero?.h1);
  need('hero.sub', hub.hero?.sub);
  if (hub.hero?.photo !== 'standard') {
    const p = hub.hero?.photo as HubPhoto | undefined;
    need('hero.photo.src', p?.src);
    need('hero.photo.mobile', p?.mobile);
    need('hero.photo.alt', p?.alt);
  }
  const list = (path: string, items: unknown) => {
    if (!Array.isArray(items) || items.length === 0) out.push(path);
    return Array.isArray(items) ? items : [];
  };
  list('trust', hub.trust).forEach((t, i) => need(`trust[${i}]`, t));
  need('services.h2', hub.services?.h2);
  need('services.intro', hub.services?.intro);
  list('services.cards', hub.services?.cards).forEach((c: HubCard, i) => {
    need(`services.cards[${i}].title`, c?.title);
    need(`services.cards[${i}].href`, c?.href);
    need(`services.cards[${i}].desc`, c?.desc);
    need(`services.cards[${i}].image.src`, c?.image?.src);
    need(`services.cards[${i}].image.alt`, c?.image?.alt);
  });
  for (const k of ['eyebrow', 'h2', 'body', 'address', 'areasH3', 'more'] as const) need(`office.${k}`, hub.office?.[k]);
  if (hub.hero?.layout === 'full-bleed' && hub.hero.video) {
    need('hero.video.src', hub.hero.video.src);
    need('hero.video.poster', hub.hero.video.poster);
  }
  list('office.areas', hub.office?.areas).forEach((a: { label: string; href: string }, i) => {
    need(`office.areas[${i}].label`, a?.label);
    need(`office.areas[${i}].href`, a?.href);
  });
  need('depth.h2', hub.depth?.h2);
  need('depth.intro', hub.depth?.intro);
  list('depth.tiles', hub.depth?.tiles).forEach((t: { title: string; body: string }, i) => {
    need(`depth.tiles[${i}].title`, t?.title);
    need(`depth.tiles[${i}].body`, t?.body);
  });
  need('whyH2', hub.whyH2);
  for (const k of ['eyebrow', 'h2', 'intro', 'rating', 'ratingSub'] as const) need(`reviews.${k}`, hub.reviews?.[k]);
  (hub.reviews?.items ?? []).forEach((r: HubReview, i: number) => {
    need(`reviews.items[${i}].name`, r?.name);
    need(`reviews.items[${i}].text`, r?.text);
  });
  if ((hub.reviews?.items ?? []).length !== 3) out.push('reviews.items (exactly 3)');
  need('faq.h2', hub.faq?.h2);
  list('faq.items', hub.faq?.items).forEach((f: { q: string; preview: string; a: string }, i) => {
    need(`faq.items[${i}].q`, f?.q);
    need(`faq.items[${i}].preview`, f?.preview);
    need(`faq.items[${i}].a`, f?.a);
  });
  need('ndc', hub.ndc);
  for (const k of ['eyebrow', 'h2', 'body'] as const) need(`final.${k}`, hub.final?.[k]);
  return out;
}

/**
 * The editor's starting point for a city switched to City Hub with nothing published yet (Brief 206
 * decision 4): per-city fields empty, the values common to every live hub pre-filled (§2.4).
 */
export function blankCityHub(name: string): CityHubStored {
  return {
    schema: 1,
    hero: { eyebrow: '24/7 Local Plumbers', h1: '', sub: '', photo: 'standard', crop: 'standard' },
    trust: ['Serving Chicagoland since 1993', 'Licensed & bonded in Illinois', '4.7 stars · 5,669+ Google reviews across all locations'],
    services: { h2: `Plumbing Services in ${name}`, intro: '', cards: [{ title: '', href: '', desc: '', image: { src: '', alt: '' } }] },
    office: { eyebrow: '', h2: `Our ${name} Office`, body: '', address: '', areasH3: `Communities We Serve Near ${name}`, areas: [{ label: '', href: '' }], more: '/locations/chicagoland' },
    depth: { h2: `What ${name} Homes Need From a Plumber`, intro: '', tiles: [{ title: '', body: '' }] },
    whyH2: `Why ${name} Homeowners Choose J. Blanton`,
    reviews: {
      eyebrow: 'What Our Customers Say',
      h2: `Real ${name} Reviews`,
      intro: '',
      rating: '',
      ratingSub: '',
      items: [{ name: '', url: null, text: '' }, { name: '', url: null, text: '' }, { name: '', url: null, text: '' }],
    },
    faq: { h2: `Plumbing Questions From ${name} Homeowners`, items: [{ q: '', preview: '', a: '' }] },
    ndc: '',
    final: {
      eyebrow: 'Ready When You Are',
      h2: `Your ${name} Plumber, Day or Night`,
      body: 'Small leaks and slow drains don’t fix themselves. Call us early, and we’ll keep a small problem from turning into a big one.',
    },
  };
}
