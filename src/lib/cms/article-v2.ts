/**
 * Brief 190 — "Article V2", the second Knowledge Hub article template.
 *
 * Client-safe (no DB, no sanitizer import) so the admin editor, the publish
 * writer and the public page all share ONE definition of the template values
 * and of the V2 content shape.
 *
 * ── STORAGE (Brief 190 Track 0.1 / Track A) ─────────────────────────────────
 * Two columns on `cms_articles`, both additive with defaults:
 *   • `template TEXT NOT NULL DEFAULT 'article'` — which template renders.
 *   • `v2 JSONB NOT NULL DEFAULT '{}'`           — the V2-only fields below.
 * Both are MIRRORED in the version content (`page_drafts.content.template` /
 * `.v2`) and reach the live row only through the publish writer
 * (`updateArticleCmsContent`), exactly like Brief 187's `terms` — so a template
 * switch is DRAFTABLE (the No Drip Club `template_variant` pattern, Brief 141),
 * never a live flip, and the bottom "Save Article" button writes neither.
 *
 * Switching is non-destructive by construction: V1 reads none of the `v2`
 * keys, and V2 reads the same title / body / image / excerpt V1 does, so
 * flipping V2 → V1 → V2 loses nothing (the editor hides the V2 group while V1
 * is selected; it never clears it).
 *
 * ── BYLINE (Track C) ────────────────────────────────────────────────────────
 * `byline_name` is the display text. There is deliberately no author table or
 * `author_id` column yet: author profiles are knowledge-hub-roadmap Phase 3.
 * The next step is a nullable `cms_articles.author_id` that WINS over
 * `byline_name` when set, with `byline_name` staying the fallback — so no
 * article ever needs migrating. See the Brief 190 report §Track C.
 */

export const ARTICLE_TEMPLATES = ['article', 'article-v2'] as const;
export type ArticleTemplate = (typeof ARTICLE_TEMPLATES)[number];

/** What renders when the value is absent, blank or unrecognised — never a 500. */
export const DEFAULT_ARTICLE_TEMPLATE: ArticleTemplate = 'article';

export const ARTICLE_TEMPLATE_LABELS: Record<ArticleTemplate, string> = {
  article: 'Article',
  'article-v2': 'Article V2',
};

export const ARTICLE_TEMPLATE_OPTIONS = ARTICLE_TEMPLATES.map((value) => ({
  value,
  label: ARTICLE_TEMPLATE_LABELS[value],
}));

/** Coerce any stored value to a known template. Unknown → V1. */
export function normalizeArticleTemplate(raw: unknown): ArticleTemplate {
  return raw === 'article-v2' ? 'article-v2' : DEFAULT_ARTICLE_TEMPLATE;
}

/** Strict form for the write paths: a known value, or null (= "leave it alone"). */
export function parseArticleTemplate(raw: unknown): ArticleTemplate | null {
  return raw === 'article' || raw === 'article-v2' ? raw : null;
}

/** The byline every article gets unless an editor types another one. */
export const DEFAULT_BYLINE_NAME = 'J. Blanton Plumbing';
/** The approved design's badge for the default byline. */
export const DEFAULT_BYLINE_INITIALS = 'JB';

/**
 * The body marker that places the "office map + directions + service-area list"
 * block. A paragraph holding only this text; with no marker the block renders
 * after the body.
 */
export const OFFICE_MAP_MARKER = '[[office-map]]';

/** The two service-area lists (Brief 189's groups). '' = none. */
export const V2_SERVICE_AREAS = ['columbus', 'chicagoland'] as const;
export type V2ServiceArea = (typeof V2_SERVICE_AREAS)[number];

// ── Brief 192 (Track B): reusable content components ─────────────────────────
//
// Structured fields rendered by React in the approved prototype's exact markup
// (ul.promises / ul.svc / div.same) — NOT HTML in the body, so the sanitizer
// allow-list is untouched. Each is placed by a marker paragraph in the body:
// [[component:<name>]]. One item shape serves all three; the type decides which
// fields are used (see V2_COMPONENT_FIELDS).

export const V2_COMPONENT_TYPES = ['promises', 'services', 'cards', 'media-text'] as const;
export type V2ComponentType = (typeof V2_COMPONENT_TYPES)[number];

export const V2_COMPONENT_LABELS: Record<V2ComponentType, string> = {
  promises: 'Promise list',
  services: 'Service rows',
  cards: 'Feature cards',
  'media-text': 'Image + text',
};

/** Which item fields each type uses (the rest are ignored and not rendered). */
export const V2_COMPONENT_FIELDS: Record<V2ComponentType, { checklist: boolean; link: boolean; inlineText: boolean }> = {
  promises: { checklist: false, link: false, inlineText: false },
  services: { checklist: false, link: true, inlineText: false },
  cards: { checklist: true, link: true, inlineText: true },
  'media-text': { checklist: false, link: false, inlineText: true },
};

// ── Brief 201 (Track A): "Image + text" — an image beside a block of text ─────
//
// The one type with component-level fields: the image and how the items render.
// They live in `media`, present ONLY on 'media-text' components, so the stored
// shape of the three Brief 192 types is unchanged. Items are the shared shape
// (title = optional bold lead-in, text = inline rich text).

export const V2_MEDIA_SIDES = ['right', 'left'] as const;
export type V2MediaSide = (typeof V2_MEDIA_SIDES)[number];

export const V2_MEDIA_TEXT_STYLES = ['paragraphs', 'numbered', 'bulleted'] as const;
export type V2MediaTextStyle = (typeof V2_MEDIA_TEXT_STYLES)[number];

export const V2_MEDIA_SIDE_LABELS: Record<V2MediaSide, string> = { right: 'Right', left: 'Left' };
export const V2_MEDIA_TEXT_STYLE_LABELS: Record<V2MediaTextStyle, string> = {
  paragraphs: 'Paragraphs',
  numbered: 'Numbered list',
  bulleted: 'Bulleted list',
};

/** Largest width/height kept for the <img> attributes; anything else is 0 (= omitted). */
export const V2_MEDIA_MAX_DIMENSION = 10000;

export interface V2MediaText {
  /** http(s) URL or a site path ("/images/…"). Empty → the component renders nothing. */
  image_url: string;
  /** The image's natural size, for the width/height attributes. 0 = unknown (omitted). */
  image_width: number;
  image_height: number;
  /** Plain text. Required (the admin warns when empty). */
  image_alt: string;
  /** Plain text. Optional <figcaption>. */
  image_caption: string;
  image_side: V2MediaSide;
  text_style: V2MediaTextStyle;
}

export const EMPTY_V2_MEDIA_TEXT: V2MediaText = {
  image_url: '',
  image_width: 0,
  image_height: 0,
  image_alt: '',
  image_caption: '',
  image_side: 'right',
  text_style: 'paragraphs',
};

/** A width/height as stored: a whole number 1…V2_MEDIA_MAX_DIMENSION, else 0. */
export function mediaDimension(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' && /^\s*\d+\s*$/.test(raw) ? Number(raw) : NaN;
  return Number.isInteger(n) && n > 0 && n <= V2_MEDIA_MAX_DIMENSION ? n : 0;
}

/** Shape any stored value into a full V2MediaText (no sanitizing, no trimming). */
export function normalizeMediaText(raw: unknown): V2MediaText {
  const r = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  return {
    image_url: str(r.image_url),
    image_width: mediaDimension(r.image_width),
    image_height: mediaDimension(r.image_height),
    image_alt: str(r.image_alt),
    image_caption: str(r.image_caption),
    image_side: r.image_side === 'left' ? 'left' : 'right',
    text_style: r.text_style === 'numbered' || r.text_style === 'bulleted' ? r.text_style : 'paragraphs',
  };
}

export interface V2ComponentItem {
  /** Plain text. Promise/service: bold lead-in. Card: the <h3>. */
  title: string;
  /** Plain text (promises, services) or inline rich text (cards: bold/italic/link). */
  text: string;
  /** Cards only: plain-text check-list items. */
  checklist: string[];
  /** Services + cards: optional link. Both label and a valid URL, or nothing renders. */
  link_label: string;
  link_url: string;
}

export interface ArticleV2Component {
  /** Short name, unique in the article: its marker is [[component:<name>]]. */
  name: string;
  type: V2ComponentType;
  items: V2ComponentItem[];
  /** Brief 201: 'media-text' only (absent on every other type). */
  media?: V2MediaText;
}

export const V2_MAX_COMPONENTS = 20;
export const V2_MAX_COMPONENT_ITEMS = 40;
export const V2_MAX_CHECKLIST = 20;

export const EMPTY_V2_COMPONENT_ITEM: V2ComponentItem = { title: '', text: '', checklist: [], link_label: '', link_url: '' };

/** Lower-case letters, digits and single hyphens, ≤ 40 chars. */
export const COMPONENT_NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function componentMarker(name: string): string {
  return `[[component:${name}]]`;
}

/** Coerce typed text into a valid component name ('' if nothing usable). */
export function slugifyComponentName(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/g, '');
}

const COMPONENT_NAME_BASE: Record<V2ComponentType, string> = { promises: 'promises', services: 'services', cards: 'cards', 'media-text': 'image-text' };

/** A free name for a new component of this type: promises, promises-2, … */
export function suggestComponentName(type: V2ComponentType, taken: string[]): string {
  const base = COMPONENT_NAME_BASE[type];
  if (!taken.includes(base)) return base;
  let n = 2;
  while (taken.includes(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

/** A component link is http(s) or a site path ("/services/drain"); anything else is dropped. */
export function isSafeComponentUrl(url: string): boolean {
  const u = url.trim();
  return /^https?:\/\/[^\s<>"']+$/i.test(u) || /^\/(?!\/)[^\s<>"']*$/.test(u);
}

export function isExternalUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}

/**
 * Where the body mentions markers — for the admin warnings. `standalone` counts
 * markers on a paragraph of their own (the only place they render); `inline`
 * counts markers mixed into other text (those render nothing).
 */
export function scanComponentMarkers(body: string): { standalone: Map<string, number>; inline: Map<string, number> } {
  const standalone = new Map<string, number>();
  const inline = new Map<string, number>();
  const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
  const para = /<p[^>]*>(?:\s|&nbsp;)*\[\[component:([^\]\s]*)\]\](?:\s|&nbsp;)*<\/p>/gi;
  for (let m = para.exec(body); m; m = para.exec(body)) bump(standalone, m[1]);
  const rest = body.replace(para, '');
  const any = /\[\[component:([^\]\s]*)\]\]/gi;
  for (let m = any.exec(rest); m; m = any.exec(rest)) bump(inline, m[1]);
  return { standalone, inline };
}

export interface ArticleV2Faq {
  /** Plain text. */
  q: string;
  /** Limited rich text (inline: bold, italic, links; `{{phone}}` resolves). */
  a: string;
}

/**
 * The V2-only fields, in the order they appear on the page. Every string is
 * sanitized on every write path by `sanitizeArticleV2Content`
 * (article-v2-sanitize.ts) — plain-text fields lose all markup, the FAQ answer
 * keeps only the inline part of the shared Brief 73 allow-list.
 */
export interface ArticleV2Content {
  /** Subtitle under the H1. Plain text, optional. */
  dek: string;
  /** Byline display name. Blank renders DEFAULT_BYLINE_NAME. */
  byline_name: string;
  /** Hero image alt. Blank falls back to the title (V1's rule). */
  image_alt: string;
  /** Hero caption. Blank = no caption. */
  image_caption: string;
  /** Key takeaways, plain text. Empty items are dropped; none = no box. */
  takeaways: string[];
  /** A `global_settings.offices[].slug`, or '' for none. */
  office: string;
  /** A service-area list, or '' for none. */
  service_area: V2ServiceArea | '';
  /** The toggle's label. Blank = the derived default ("See all N communities…"). */
  service_area_label: string;
  faqs: ArticleV2Faq[];
  /** Brief 192: reusable content components, placed by [[component:<name>]] markers. */
  components: ArticleV2Component[];
}

export const EMPTY_ARTICLE_V2: ArticleV2Content = {
  dek: '',
  byline_name: DEFAULT_BYLINE_NAME,
  image_alt: '',
  image_caption: '',
  takeaways: [],
  office: '',
  service_area: '',
  service_area_label: '',
  faqs: [],
  components: [],
};

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const OFFICE_SLUG_RE = /^[a-z0-9-]{1,80}$/;

/**
 * Shape any stored value into a full `ArticleV2Content` (missing keys get their
 * empty value; wrong types are dropped). Does NOT sanitize — the write paths do
 * that — and does not trim, so the editor round-trips exactly what was typed.
 */
export function normalizeArticleV2(raw: unknown): ArticleV2Content {
  const r = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const area = r.service_area;
  const office = str(r.office);
  return {
    dek: str(r.dek),
    byline_name: typeof r.byline_name === 'string' ? r.byline_name : DEFAULT_BYLINE_NAME,
    image_alt: str(r.image_alt),
    image_caption: str(r.image_caption),
    takeaways: Array.isArray(r.takeaways) ? r.takeaways.filter((t): t is string => typeof t === 'string') : [],
    office: OFFICE_SLUG_RE.test(office) ? office : '',
    service_area: area === 'columbus' || area === 'chicagoland' ? area : '',
    service_area_label: str(r.service_area_label),
    faqs: Array.isArray(r.faqs)
      ? r.faqs
          .filter((f): f is Record<string, unknown> => !!f && typeof f === 'object')
          .map((f) => ({ q: str(f.q), a: str(f.a) }))
      : [],
    components: Array.isArray(r.components)
      ? r.components
          .filter((c): c is Record<string, unknown> => !!c && typeof c === 'object')
          .filter((c) => (V2_COMPONENT_TYPES as readonly unknown[]).includes(c.type))
          .map((c) => ({
            name: str(c.name),
            type: c.type as V2ComponentType,
            items: Array.isArray(c.items)
              ? c.items
                  .filter((i): i is Record<string, unknown> => !!i && typeof i === 'object')
                  .map((i) => ({
                    title: str(i.title),
                    text: str(i.text),
                    checklist: Array.isArray(i.checklist) ? i.checklist.filter((x): x is string => typeof x === 'string') : [],
                    link_label: str(i.link_label),
                    link_url: str(i.link_url),
                  }))
              : [],
            // Brief 201: only the Image + text type carries `media`.
            ...(c.type === 'media-text' ? { media: normalizeMediaText(c.media) } : {}),
          }))
      : [],
  };
}

/** True when the value has the object shape a version's `v2` key must have. */
export function isArticleV2Object(raw: unknown): boolean {
  return !!raw && typeof raw === 'object' && !Array.isArray(raw);
}

/**
 * The byline badge. The default byline is the brand mark "JB" (the approved
 * design); any other name uses the first letters of its first and last words
 * ("Aizik Zimerman" → "AZ"), so a person can be named later with no code change.
 */
export function bylineInitials(name: string): string {
  const n = name.trim();
  if (!n || n === DEFAULT_BYLINE_NAME) return DEFAULT_BYLINE_INITIALS;
  // Letters (incl. Latin accents) and digits only — "J." → "J", "O'Brien" → "OBrien".
  const words = n.split(/\s+/).map((w) => w.replace(/[^A-Za-z0-9\u00C0-\u024F]/g, '')).filter(Boolean);
  if (!words.length) return DEFAULT_BYLINE_INITIALS;
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : '';
  return (first + last).toUpperCase();
}

/** Reading speed behind "N min read" (words per minute). */
export const READ_WPM = 200;

/**
 * "N min read" = ceil(words / 200), at least 1, where words = the article's
 * visible text: body + key takeaways + FAQ questions and answers + the content
 * components placed in the body (Brief 192).
 */
export function readMinutes(wordCount: number): number {
  return Math.max(1, Math.ceil(wordCount / READ_WPM));
}
