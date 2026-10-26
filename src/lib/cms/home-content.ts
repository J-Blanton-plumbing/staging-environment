/**
 * Brief 219 — the homepage's CMS content model: every piece of copy and every image on `/`, stored
 * as flat keys in `main_pages.content` for the row `home` (the Brief 121/168 pattern: snake_case
 * scalars, one array per repeatable set, stable item ids, array position = order).
 *
 * The ONE list of fields. The /admin/home editor, the write-path sanitizer (`sanitizeHomeContent` in
 * `@/lib/cms/sanitize`), the seed (`scripts/seed-brief-219-home-content.ts`) and the page all read it,
 * so a field can't exist in one place and be missing in another.
 *
 * Client-safe on purpose: no DB, no sanitize-html. The page runs `sanitizeHomeContent` (server) and
 * then `resolveHomeContent` (here), so a preview renders exactly what a publish would store.
 *
 * Layout is locked: this model has no way to add, remove or reorder SECTIONS. Only the items inside a
 * set (rotating words, featured articles) can be added, removed and moved.
 */
import { HOME } from '@/lib/content/home';
import { LOCATOR_COPY, type LocatorCopy } from '@/lib/content/locator-copy';

export type HomeFieldKind =
  | 'text' // one line, plain text
  | 'textarea' // plain text, may wrap
  | 'paragraphs' // plain text, paragraphs separated by a blank line
  | 'rich' // HTML through the Brief 73 allow-list (sanitizeCmsHtml)
  | 'image' // rendered through next/image: a site path or an allowed https host
  | 'media' // a <video> source or poster: a site path or any https URL
  | 'youtube'; // a YouTube video id (a pasted watch / embed / youtu.be URL is reduced to the id)

export interface HomeListItem {
  id: string;
  text: string;
}
export interface HomeFeaturedItem {
  id: string;
  slug: string;
}

/** camelCase locator key → `locator_snake_case` content key. */
const locatorKey = (k: string) => `locator_${k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)}`;
const LOCATOR_KEYS = Object.keys(LOCATOR_COPY) as Array<keyof typeof LOCATOR_COPY>;

/**
 * Every scalar field: its kind and its default (= what the live homepage showed on 2026-10-26).
 * Key order is section order, top to bottom.
 */
export const HOME_SCALAR_FIELDS: Record<string, { kind: HomeFieldKind; def: string }> = {
  hero_tagline: { kind: 'text', def: HOME.hero.eyebrow },
  hero_line_lead: { kind: 'text', def: HOME.hero.lineLead },
  hero_intro: { kind: 'textarea', def: HOME.hero.intro },
  hero_cta: { kind: 'text', def: HOME.hero.ctaLabel },
  hero_badge_image: { kind: 'image', def: HOME.hero.badgeImage },
  hero_poster: { kind: 'media', def: HOME.hero.poster },
  hero_video_desktop: { kind: 'media', def: HOME.hero.videoDesktop },
  hero_video_mobile: { kind: 'media', def: HOME.hero.videoMobile },

  services_heading: { kind: 'text', def: HOME.services.heading },
  services_intro: { kind: 'textarea', def: HOME.services.intro },
  services_cta_label: { kind: 'text', def: HOME.services.ctaLabel },

  regions_heading: { kind: 'text', def: HOME.regions.heading },
  regions_intro: { kind: 'textarea', def: HOME.regions.intro },
  regions_support_template: { kind: 'text', def: HOME.regions.supportTemplate },
  regions_cta_chicagoland: { kind: 'text', def: HOME.regions.ctaLabels.chicagoland },
  regions_image_chicagoland: { kind: 'image', def: HOME.regions.images.chicagoland.src },
  regions_image_alt_chicagoland: { kind: 'text', def: HOME.regions.images.chicagoland.alt },
  regions_cta_columbus: { kind: 'text', def: HOME.regions.ctaLabels.columbus },
  regions_image_columbus: { kind: 'image', def: HOME.regions.images.columbus.src },
  regions_image_alt_columbus: { kind: 'text', def: HOME.regions.images.columbus.alt },

  tiktok_headline: { kind: 'text', def: HOME.tiktok.headline },

  why_heading: { kind: 'text', def: HOME.why.heading },
  why_body: { kind: 'paragraphs', def: HOME.why.body.join('\n\n') },
  why_video_id: { kind: 'youtube', def: HOME.why.videoId },
  why_video_title: { kind: 'text', def: HOME.why.videoTitle },
  why_cta_label: { kind: 'text', def: HOME.why.ctaLabel },

  ndc_body: { kind: 'rich', def: HOME.noDripClub.body },
  ndc_label: { kind: 'text', def: HOME.noDripClub.label },
  ndc_image: { kind: 'image', def: HOME.noDripClub.image },
  ndc_image_alt: { kind: 'text', def: HOME.noDripClub.imageAlt },
  ndc_cta_label: { kind: 'text', def: HOME.noDripClub.ctaLabel },

  knowledge_hub_heading: { kind: 'text', def: HOME.knowledgeHub.heading },
  knowledge_hub_intro: { kind: 'textarea', def: HOME.knowledgeHub.intro },
  knowledge_hub_cta_label: { kind: 'text', def: HOME.knowledgeHub.ctaLabel },

  find_us_heading: { kind: 'text', def: HOME.findUs.heading },
  find_us_body: { kind: 'paragraphs', def: HOME.findUs.body.join('\n\n') },

  ...Object.fromEntries(LOCATOR_KEYS.map((k) => [locatorKey(k), { kind: 'text' as const, def: HOME.locator[k] }])),
};

/** The repeatable sets: limits and defaults. */
export const HOME_ROTATOR_MAX = 4;
export const HOME_FEATURED_MAX = 6;
export const HOME_LIST_DEFAULTS = {
  hero_rotator_words: HOME.hero.rotatorWords.map((text, i): HomeListItem => ({ id: `word-${i + 1}`, text })),
  knowledge_hub_featured: HOME.knowledgeHub.featuredSlugs.map((slug, i): HomeFeaturedItem => ({ id: `article-${i + 1}`, slug })),
};
export type HomeListKey = keyof typeof HOME_LIST_DEFAULTS;
export const HOME_LIST_KEYS = Object.keys(HOME_LIST_DEFAULTS) as HomeListKey[];

/** The flat key of a locator string, exported for the editor. */
export const HOME_LOCATOR_FIELDS: Array<{ key: string; name: keyof typeof LOCATOR_COPY }> = LOCATOR_KEYS.map((name) => ({ key: locatorKey(name), name }));

/** Every content key this model owns, scalars then lists. */
export const HOME_CONTENT_KEYS: string[] = [...Object.keys(HOME_SCALAR_FIELDS), ...HOME_LIST_KEYS];

/** The full default content — what the seed writes into an empty row and the editor shows for a blank one. */
export function homeContentDefaults(): Record<string, unknown> {
  return {
    ...Object.fromEntries(Object.entries(HOME_SCALAR_FIELDS).map(([k, f]) => [k, f.def])),
    hero_rotator_words: HOME_LIST_DEFAULTS.hero_rotator_words.map((x) => ({ ...x })),
    knowledge_hub_featured: HOME_LIST_DEFAULTS.knowledge_hub_featured.map((x) => ({ ...x })),
  };
}

// ── Validation (shared by the page and the editor's warnings) ────────────────────────────────────

const VIDEO_EXT = /\.(mp4|mov|m4v|webm|ogv)(\?|#|$)/i;
const isSitePath = (v: string) => v.startsWith('/') && !v.startsWith('//') && !/\s/.test(v);
const httpsHost = (v: string): string | null => {
  try {
    const u = new URL(v);
    return u.protocol === 'https:' ? u.hostname : null;
  } catch {
    return null;
  }
};

/** An image for next/image: a site path, or https on a host next.config allows (else next/image throws). */
export function isUsableImage(v: string, imageHosts: readonly string[]): boolean {
  if (!v || VIDEO_EXT.test(v)) return false;
  if (isSitePath(v)) return true;
  const host = httpsHost(v);
  return !!host && imageHosts.includes(host);
}

/** A <video> source or poster: a site path or any https URL. */
export const isUsableMedia = (v: string) => !!v && (isSitePath(v) || !!httpsHost(v));

/** A YouTube id from an id or a watch / embed / youtu.be / shorts URL, or null. */
export function youtubeId(v: string): string | null {
  const s = v.trim();
  if (/^[A-Za-z0-9_-]{6,20}$/.test(s)) return s;
  const m = s.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/))([A-Za-z0-9_-]{6,20})/);
  return m ? m[1] : null;
}

export const isArticleSlug = (v: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v);

/**
 * The page's ONE <h1>, built from the visible line: "Plumbers in Chicagoland and Columbus, OH".
 * 1 word → "lead word"; 2 → "A and B"; 3+ → "A, B and C".
 */
export function heroH1(lead: string, words: readonly string[]): string {
  const w = words.filter((x) => x.trim());
  const list = w.length <= 1 ? (w[0] ?? '') : `${w.slice(0, -1).join(', ')} and ${w[w.length - 1]}`;
  return [lead.trim(), list].filter(Boolean).join(' ');
}

// ── Resolution: stored content → what the page renders ───────────────────────────────────────────

export interface HomeResolved {
  hero: {
    eyebrow: string;
    lineLead: string;
    words: string[];
    h1: string;
    intro: string;
    ctaLabel: string;
    badgeImage: string;
    poster: string;
    videoDesktop: string;
    videoMobile: string;
  };
  services: { heading: string; intro: string; ctaLabel: string };
  regions: {
    heading: string;
    intro: string;
    supportTemplate: string;
    ctaLabels: { chicagoland: string; columbus: string };
    images: { chicagoland: { src: string; alt: string }; columbus: { src: string; alt: string } };
  };
  tiktokHeadline: string;
  why: { heading: string; body: string[]; videoId: string; videoTitle: string; ctaLabel: string };
  ndc: { body: string; label: string; image: string; imageAlt: string; ctaLabel: string };
  knowledgeHub: { heading: string; intro: string; ctaLabel: string; featuredSlugs: string[] };
  findUs: { heading: string; body: string[] };
  locator: LocatorCopy;
}

const str = (v: unknown) => (typeof v === 'string' ? v : '');

/**
 * Stored content → render values. Never throws and never returns undefined: a blank, missing or
 * unusable value falls back to its default (`HOME`), so a half-filled row, a malformed array or a bad
 * URL can't break the page. `imageHosts` = the https hosts next.config allows for next/image.
 */
export function resolveHomeContent(raw: unknown, imageHosts: readonly string[] = []): HomeResolved {
  const d = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const v = (key: string): string => {
    const f = HOME_SCALAR_FIELDS[key];
    const s = str(d[key]);
    if (!s.trim()) return f.def;
    if (f.kind === 'image') return isUsableImage(s.trim(), imageHosts) ? s.trim() : f.def;
    if (f.kind === 'media') return isUsableMedia(s.trim()) ? s.trim() : f.def;
    if (f.kind === 'youtube') return youtubeId(s) ?? f.def;
    return s;
  };
  const paragraphs = (key: string): string[] => {
    const parts = v(key).split('\n\n').map((p) => p.trim()).filter(Boolean);
    return parts.length ? parts : HOME_SCALAR_FIELDS[key].def.split('\n\n');
  };

  const words = (Array.isArray(d.hero_rotator_words) ? d.hero_rotator_words : [])
    .map((x) => str((x as HomeListItem | null)?.text).trim())
    .filter(Boolean)
    .slice(0, HOME_ROTATOR_MAX);
  const heroWords = words.length ? words : HOME.hero.rotatorWords;

  const slugs = (Array.isArray(d.knowledge_hub_featured) ? d.knowledge_hub_featured : [])
    .map((x) => str((x as HomeFeaturedItem | null)?.slug).trim().toLowerCase())
    .filter((s, i, all) => isArticleSlug(s) && all.indexOf(s) === i)
    .slice(0, HOME_FEATURED_MAX);

  const lineLead = v('hero_line_lead');
  return {
    hero: {
      eyebrow: v('hero_tagline'),
      lineLead,
      words: heroWords,
      h1: heroH1(lineLead, heroWords),
      intro: v('hero_intro'),
      ctaLabel: v('hero_cta'),
      badgeImage: v('hero_badge_image'),
      poster: v('hero_poster'),
      videoDesktop: v('hero_video_desktop'),
      videoMobile: v('hero_video_mobile'),
    },
    services: { heading: v('services_heading'), intro: v('services_intro'), ctaLabel: v('services_cta_label') },
    regions: {
      heading: v('regions_heading'),
      intro: v('regions_intro'),
      supportTemplate: v('regions_support_template'),
      ctaLabels: { chicagoland: v('regions_cta_chicagoland'), columbus: v('regions_cta_columbus') },
      images: {
        chicagoland: { src: v('regions_image_chicagoland'), alt: v('regions_image_alt_chicagoland') },
        columbus: { src: v('regions_image_columbus'), alt: v('regions_image_alt_columbus') },
      },
    },
    tiktokHeadline: v('tiktok_headline'),
    why: {
      heading: v('why_heading'),
      body: paragraphs('why_body'),
      videoId: v('why_video_id'),
      videoTitle: v('why_video_title'),
      ctaLabel: v('why_cta_label'),
    },
    ndc: {
      body: v('ndc_body'),
      label: v('ndc_label'),
      image: v('ndc_image'),
      imageAlt: v('ndc_image_alt'),
      ctaLabel: v('ndc_cta_label'),
    },
    knowledgeHub: {
      heading: v('knowledge_hub_heading'),
      intro: v('knowledge_hub_intro'),
      ctaLabel: v('knowledge_hub_cta_label'),
      featuredSlugs: slugs.length ? slugs : HOME.knowledgeHub.featuredSlugs,
    },
    findUs: { heading: v('find_us_heading'), body: paragraphs('find_us_body') },
    // Built in LOCATOR_COPY's own key order, so the object the client panel receives is shaped
    // exactly as before.
    locator: Object.fromEntries(HOME_LOCATOR_FIELDS.map(({ key, name }) => [name, v(key)])) as LocatorCopy,
  };
}
