import { sanitizeCmsHtml } from '@/lib/cms/sanitize';
import { OFFICE_MAP_MARKER } from '@/lib/cms/article-v2';

/**
 * Brief 190 (Track B) — turns an article's stored body into what Article V2
 * renders: the TOC, the `<section>` per H2, and where the office-map block goes.
 * Pure (no DB, no React) so it can be exercised on fixtures.
 *
 * Order matters and is the safe one:
 *   1. `sanitizeCmsHtml` — the shared Brief 73 allow-list, exactly as V1 renders.
 *      It strips every attribute but href/src/alt/…, so each heading reaches
 *      step 3 as a bare `<h2>`.
 *   2. `{{tokens}}` are resolved by the caller AFTER this, with escaping.
 *   3. Every `<h1>` in the body is demoted to `<h2>` (one H1 per page: the
 *      masthead's), then each `<h2>` gets an `id` built from its own text — the
 *      only attribute this module adds, and it is generated, never editor input.
 *   4. The body is cut at each H2 into sections, and the FIRST paragraph that
 *      holds only `[[office-map]]` is cut out as the block's slot (any extra
 *      marker paragraphs are dropped, never shown as text).
 */

export interface V2TocItem {
  id: string;
  label: string;
}

export type V2BodyPart =
  | { kind: 'html'; html: string }
  | { kind: 'office-map' }
  /** Brief 192: a [[component:<name>]] slot. The template renders it, or nothing. */
  | { kind: 'component'; name: string };

export interface V2BodySection {
  /** The section's H2 id, or null for the introduction before the first H2. */
  headingId: string | null;
  parts: V2BodyPart[];
}

export interface V2Body {
  toc: V2TocItem[];
  sections: V2BodySection[];
  /** True when the body carried the marker (else the block goes after the body). */
  hasMarker: boolean;
  /** Visible words, for "N min read". */
  wordCount: number;
}

/** Ids the template itself uses — a heading can never take one of them. */
const RESERVED_IDS = new Set(['content', 'toc', 'toc-label', 'kt', 'faq', 'related', 'callbar']);

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", '#x27': "'", nbsp: ' ' };

/** Tag-free, entity-decoded text of an HTML fragment. */
export function htmlToText(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(amp|lt|gt|quot|#39|#x27|nbsp);/g, (_, e: string) => ENTITIES[e] ?? '')
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/\s+/g, ' ')
    .trim();
}

export function countWords(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[“”"'’‘]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
}

/**
 * A marker paragraph: [[office-map]] or (Brief 192) [[component:<name>]], alone
 * on its line. Group 1 is "office-map" or "component:<name>".
 */
const MARKER_RE = new RegExp(
  `<p>(?:\\s|&nbsp;)*\\[\\[(${OFFICE_MAP_MARKER.slice(2, -2)}|component:[^\\]\\s<]*)\\]\\](?:\\s|&nbsp;)*</p>`,
  'gi'
);

/**
 * Brief 192: any marker text left over (mixed into a sentence, or a malformed
 * one) is removed, so the page never shows raw [[...]] text. The admin warns.
 */
const STRAY_MARKER_RE = /\[\[(?:office-map|component:[^\]<]*)\]\]/gi;

/**
 * @param rawBody the stored body HTML (unsanitized is fine — step 1 sanitizes)
 * @param resolveTokens applied to each HTML chunk after sanitizing (step 2)
 */
export function buildV2Body(rawBody: string, resolveTokens: (html: string) => string = (h) => h): V2Body {
  let html = sanitizeCmsHtml(rawBody);
  html = html.replace(/<h1>/gi, '<h2>').replace(/<\/h1>/gi, '</h2>');

  const toc: V2TocItem[] = [];
  const used = new Set<string>();
  html = html.replace(/<h2>([\s\S]*?)<\/h2>/gi, (_m, inner: string) => {
    const label = htmlToText(inner);
    let id = slugify(label) || 'section';
    if (RESERVED_IDS.has(id)) id = `${id}-section`;
    let n = 2;
    const base = id;
    while (used.has(id)) id = `${base}-${n++}`;
    used.add(id);
    if (label) toc.push({ id, label });
    return `<h2 id="${id}">${inner}</h2>`;
  });

  const wordCount = countWords(htmlToText(html.replace(MARKER_RE, ' ').replace(STRAY_MARKER_RE, ' ')));

  // Cut at every H2: chunk 0 is the introduction, each later chunk starts with its H2.
  const chunks = html.split(/(?=<h2 id=")/);
  let hasMarker = false;
  const placed = new Set<string>();
  const sections: V2BodySection[] = [];
  const htmlPart = (h: string) => {
    const clean = h.replace(STRAY_MARKER_RE, '');
    // a paragraph that held only a stray marker would leave an empty <p>
    const tidy = clean.replace(/<p>(?:\s|&nbsp;)*<\/p>/gi, '');
    return tidy.trim() ? ({ kind: 'html', html: resolveTokens(tidy) } as const) : null;
  };
  for (const chunk of chunks) {
    if (!chunk.trim()) continue;
    const idMatch = /^<h2 id="([^"]+)">/.exec(chunk);
    const parts: V2BodyPart[] = [];
    let last = 0;
    MARKER_RE.lastIndex = 0;
    for (let m = MARKER_RE.exec(chunk); m; m = MARKER_RE.exec(chunk)) {
      const before = htmlPart(chunk.slice(last, m.index));
      if (before) parts.push(before);
      const key = m[1].toLowerCase();
      if (key === 'office-map') {
        if (!hasMarker) {
          parts.push({ kind: 'office-map' });
          hasMarker = true;
        }
      } else if (!placed.has(key)) {
        // Each component renders once, at its FIRST marker; repeats show nothing.
        placed.add(key);
        parts.push({ kind: 'component', name: key.slice('component:'.length) });
      }
      last = m.index + m[0].length;
    }
    const rest = htmlPart(chunk.slice(last));
    if (rest) parts.push(rest);
    if (parts.length) sections.push({ headingId: idMatch ? idMatch[1] : null, parts });
  }

  return { toc, sections, hasMarker, wordCount };
}
