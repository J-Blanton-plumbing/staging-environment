/**
 * Shared HTML sanitizer for all CMS rich-text content (Brief 73, SEC-2).
 *
 * This is the SINGLE source of truth for what HTML the CMS is allowed to store
 * and render. Both the write path (API routes, before persisting) and the
 * render path (server components, defensively before `dangerouslySetInnerHTML`)
 * MUST route rich text through `sanitizeCmsHtml`.
 *
 * Brief 77's HTML-toggle fields rely on this exact allow-list — do not fork it.
 * Widen the allow-list here, in one place, if a new tag/attribute is genuinely
 * needed for marketing copy.
 *
 * The allow-list is intentionally tight: headings, paragraphs, lists, links,
 * bold/italic/underline, line breaks and images — the vocabulary of marketing
 * body copy. It admits NO `<script>`, NO inline event handlers (`onerror`,
 * `onclick`, …) and NO `javascript:` URLs.
 */

import sanitizeHtml from 'sanitize-html';
import type { GlobalSettings } from '@/lib/cms/global-settings';
import { resolveTokens, escapeHtml } from '@/lib/cms/tokens';
import { MAIN_PAGE_RICH_TEXT_FIELDS } from '@/lib/cms/rich-text-fields';

/** Tags permitted in CMS rich text. */
export const CMS_ALLOWED_TAGS: string[] = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'br', 'hr',
  'ul', 'ol', 'li',
  'strong', 'b', 'em', 'i', 'u',
  'blockquote',
  'a', 'span', 'div',
  'img', 'figure', 'figcaption',
];

/** Attributes permitted per tag. Anything else (incl. `on*` handlers) is dropped. */
export const CMS_ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  a: ['href', 'title', 'target', 'rel'],
  img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
};

/**
 * URL schemes permitted in `href`/`src`. `javascript:` is deliberately absent,
 * so `<a href="javascript:alert(1)">` is neutralized.
 */
export const CMS_ALLOWED_SCHEMES: string[] = ['http', 'https', 'mailto', 'tel'];

export const CMS_SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: CMS_ALLOWED_TAGS,
  allowedAttributes: CMS_ALLOWED_ATTRIBUTES,
  allowedSchemes: CMS_ALLOWED_SCHEMES,
  // Drop the tag AND its contents for these — a stripped `<script>alert(1)</script>`
  // must not leave the naked text `alert(1)` behind.
  nonTextTags: ['script', 'style', 'textarea', 'noscript', 'iframe', 'object', 'embed'],
  // Force external links to be safe against reverse-tabnabbing.
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }),
  },
  // Never allow data: URIs (they can smuggle scripts in some contexts).
  allowProtocolRelative: false,
};

/**
 * Sanitize a CMS rich-text/HTML string against the shared allow-list.
 * Safe to call on both the write path and the render path. Nullish input
 * returns an empty string.
 */
export function sanitizeCmsHtml(dirty: string | null | undefined): string {
  if (dirty == null) return '';
  return sanitizeHtml(dirty, CMS_SANITIZE_OPTIONS);
}

// ── Brief 77 ─────────────────────────────────────────────────────────────────
// Rich-text render + write helpers for the large-field editors (Feature A) and
// the variable-token system (Feature B). All sanitization here routes through
// `sanitizeCmsHtml` above — the single Brief 73 allow-list, never a fork.

/** True when the string appears to contain HTML markup (a tag or entity). */
function looksLikeHtml(value: string): boolean {
  return /<[a-z!/]/i.test(value);
}

/**
 * Collapse block-level HTML to inline markup so rich text can be injected into an
 * existing inline context (e.g. a page's hand-styled `<p className="hero-desc">`)
 * without nesting block elements inside it and breaking the faithful-clone CSS,
 * which relies on positional `p:nth-child(...)` selectors.
 *
 * Closing block tags become a line break; opening block tags are dropped. The
 * essential marketing formatting — line breaks, bold, italic, underline, links —
 * is all inline and survives. Runs of breaks are collapsed and edges trimmed.
 * This is a purely structural transform; the actual allow-list enforcement is
 * still done by `sanitizeCmsHtml`.
 */
function flattenToInline(html: string): string {
  return html
    .replace(/<\/(p|div|h[1-6]|li|blockquote|figure|figcaption)>/gi, '<br>')
    .replace(/<(p|div|h[1-6]|ul|ol|li|blockquote|hr|figure|figcaption)\b[^>]*>/gi, '')
    .replace(/(?:<br\s*\/?>\s*){3,}/gi, '<br><br>')
    .replace(/^(?:\s*<br\s*\/?>\s*)+/i, '')
    .replace(/(?:\s*<br\s*\/?>\s*)+$/i, '')
    .trim();
}

/**
 * Render a CMS rich-text value for injection into an INLINE context via
 * `dangerouslySetInnerHTML`. Handles three concerns in the safe order:
 *   1. Legacy plain text (no markup) → escape it and turn newlines into `<br>`,
 *      so line breaks that editors already entered still show. HTML content is
 *      flattened to inline markup instead (see `flattenToInline`).
 *   2. Sanitize through the shared Brief 73 allow-list.
 *   3. Resolve `{{tokens}}` LAST, with escaping, so a Global Settings value that
 *      happens to contain markup can never become active HTML.
 */
export function renderCmsInline(
  value: string | null | undefined,
  settings: GlobalSettings
): string {
  if (value == null || value === '') return '';
  const inline = looksLikeHtml(value)
    ? flattenToInline(value)
    : escapeHtml(value).replace(/\r?\n/g, '<br>');
  const clean = sanitizeCmsHtml(inline);
  return resolveTokens(clean, settings, { escape: true });
}

/**
 * Render a CMS rich-text value for injection into a BLOCK context via
 * `dangerouslySetInnerHTML` — i.e. a standalone container that WANTS the block
 * structure (multiple `<p>` clauses, `<h2>` sub-headings, lists). Unlike
 * `renderCmsInline`, this does NOT flatten block tags to `<br>`, so a long-form
 * document (e.g. the Terms of Use & Privacy Policy legal body, Brief 110) keeps
 * its paragraphs and headings. Same safe order otherwise:
 *   1. Legacy plain text (no markup) → escape it and turn newlines into `<br>`.
 *   2. Sanitize through the shared Brief 73 allow-list (block tags are allowed).
 *   3. Resolve `{{tokens}}` LAST, with escaping.
 * The consuming page is responsible for styling the block children in CSS
 * (Tailwind cannot reach tags produced by `dangerouslySetInnerHTML`).
 */
export function renderCmsBlock(
  value: string | null | undefined,
  settings: GlobalSettings
): string {
  if (value == null || value === '') return '';
  const html = looksLikeHtml(value)
    ? value
    : escapeHtml(value).replace(/\r?\n/g, '<br>');
  const clean = sanitizeCmsHtml(html);
  return resolveTokens(clean, settings, { escape: true });
}

/**
 * Sanitize the rich-text fields of a `main_pages` content payload before it is
 * persisted (Brief 77, Feature A — write-path hardening). Only the keys
 * registered as rich text for `slug` are sanitized; every other field passes
 * through untouched (headings, CTAs, meta, etc. stay plain). Non-string values
 * are left alone. Returns a shallow copy — the input is not mutated.
 */
export function sanitizeMainPageContent(
  slug: string,
  content: Record<string, unknown>
): Record<string, unknown> {
  const keys = MAIN_PAGE_RICH_TEXT_FIELDS[slug];
  if (!keys || keys.length === 0) return content;
  const out = { ...content };
  for (const key of keys) {
    if (typeof out[key] === 'string') {
      out[key] = sanitizeCmsHtml(out[key] as string);
    }
  }
  return out;
}
