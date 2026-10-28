/**
 * CMS variable tokens (Brief 77, Feature B).
 *
 * A single registry mapping a friendly token — e.g. `{{phone}}` or
 * `{{ndc_price}}` — to the Global Settings field it pulls from. Editors drop a
 * token into any headline or body field (via the "Insert variable" menu) and at
 * render time it is replaced with the CURRENT Global Settings value, so changing
 * a number once updates every page that uses the token (single source of truth).
 *
 * This module is intentionally dependency-light (only a type-only import of
 * GlobalSettings, which erases at compile time) so it is safe to import into
 * client components — the editor's insert menu reads `CMS_TOKENS` for its list of
 * friendly names. The render-side composition that mixes tokens with HTML
 * sanitization lives in `@/lib/cms/sanitize` (server-only), which imports
 * `resolveTokens` from here.
 *
 * To add a token: append one entry to `CMS_TOKENS`. Nothing else needs to change
 * — the editor menu, the resolver, and the render paths all read this list.
 */

import type { GlobalSettings } from '@/lib/cms/global-settings';

export interface CmsToken {
  /** Token name without braces, e.g. `phone` → inserted as `{{phone}}`. */
  token: string;
  /** Human-friendly name shown in the editor's Insert-variable menu. */
  label: string;
  /** Short hint shown under the label so editors know what they'll get. */
  hint: string;
  /** Pull the current value out of Global Settings. */
  resolve: (settings: GlobalSettings) => string;
}

/**
 * The token registry. Start small (phone + NDC price); adding more is a one-line
 * append. Good future candidates are documented in the Brief 77 report
 * (headerPhone, ctaPrimaryLabel, hoursLabel, taglineTurning).
 */
export const CMS_TOKENS: CmsToken[] = [
  {
    token: 'phone',
    label: 'Phone number',
    hint: 'Main business phone (from Global Settings)',
    resolve: (s) => s.phoneDisplay,
  },
  {
    token: 'ndc_price',
    label: 'No Drip Club price — monthly (classic template)',
    hint: 'Monthly membership price, e.g. $29.97 (from Global Settings)',
    resolve: (s) => s.ndcPrice,
  },
  // Brief 141 (Track A) — the annual offer. Three prices coexist permanently:
  // {{ndc_price}} drives the `classic` No Drip Club template, these two drive the
  // `comparison` template's 1-year / 2-year cards. Labels name the template so
  // the "Insert variable" menu makes the distinction obvious at the point of use.
  {
    token: 'ndc_price_1yr',
    label: 'No Drip Club price — 1 year (comparison template)',
    hint: '1-year membership price, e.g. $149 (from Global Settings)',
    resolve: (s) => s.ndcPrice1yr,
  },
  {
    token: 'ndc_price_2yr',
    label: 'No Drip Club price — 2 years (comparison template)',
    hint: '2-year membership price, e.g. $229 (from Global Settings)',
    resolve: (s) => s.ndcPrice2yr,
  },
];

const TOKEN_MAP = new Map<string, CmsToken>(CMS_TOKENS.map((t) => [t.token, t]));

/**
 * Matches `{{token}}` with optional inner whitespace. Token names are limited to
 * lowercase letters, digits and underscores, so stray `{{` in copy that isn't a
 * real token is left untouched.
 */
const TOKEN_RE = /\{\{\s*([a-z0-9_]+)\s*\}\}/gi;

/** The exact syntax editors insert for a token, e.g. `{{phone}}`. */
export function tokenSyntax(token: string): string {
  return `{{${token}}}`;
}

/** Minimal HTML-entity escape, used when a token value is spliced into HTML. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Replace every recognized `{{token}}` in `text` with its current Global Settings
 * value.
 *
 * - Unknown tokens are left as-is (the literal `{{whatever}}` renders) — an unset
 *   token never errors the page and is visible to the editor as "not wired yet".
 * - `escape: true` HTML-escapes the substituted value. Use this whenever the
 *   result is injected as HTML (`dangerouslySetInnerHTML`) so a Global Settings
 *   value containing markup renders as inert text, never active HTML.
 * - `escape: false` (default) returns the raw value, correct when the result is
 *   rendered as a React text node (React escapes it) — e.g. a plain headline.
 */
export function resolveTokens(
  text: string | null | undefined,
  settings: GlobalSettings,
  opts: { escape?: boolean } = {}
): string {
  if (text == null || text === '') return '';
  return text.replace(TOKEN_RE, (match, name: string) => {
    const t = TOKEN_MAP.get(name.toLowerCase());
    if (!t) return match; // unknown token → leave literal (documented behavior)
    const value = t.resolve(settings) ?? '';
    return opts.escape ? escapeHtml(value) : value;
  });
}

// ── Brief 221 (Track D1): live review numbers ─────────────────────────────────────────────────────
//
// Four tokens whose value is PER PAGE, not a Global Setting: a City Hub / City Service V2 page fills
// the `office_*` pair from ITS hub office's row in `office_ratings`, and the `company_*` pair from the
// company total (the homepage uses only that pair). The rows are written by the daily Mainline sync
// (scripts/sync-gbp-ratings.ts). They are deliberately NOT in `CMS_TOKENS`: the Insert-variable menu
// there serves pages that have no office, where these could never resolve.
//
// A field that carries none of them renders exactly as stored (the same string — byte-identical).

/** One office's (or the company's) Google numbers: rating rounded to 1 decimal, whole count. */
export interface RatingFigures {
  ratingValue: number;
  reviewCount: number;
}

/** What a page can fill: its own hub office's numbers and the company total (null = no row). */
export interface RatingTokenContext {
  office: RatingFigures | null;
  company: RatingFigures | null;
}

export const NO_RATINGS: RatingTokenContext = { office: null, company: null };

export const RATING_TOKENS = [
  { token: 'office_rating', label: 'Office Google rating', hint: 'This page’s office, e.g. 4.8' },
  { token: 'office_review_count', label: 'Office Google review count', hint: 'This page’s office, e.g. 3,529' },
  { token: 'company_rating', label: 'Company Google rating', hint: 'All locations, e.g. 4.7' },
  { token: 'company_review_count', label: 'Company Google review count', hint: 'All locations, e.g. 10,916' },
] as const;

/** The help note shown next to every field that takes these tokens. */
export const RATING_TOKEN_HELP = 'Use {{office_rating}} / {{office_review_count}}. Updated daily from Mainline.';
export const COMPANY_RATING_TOKEN_HELP = 'Use {{company_rating}} / {{company_review_count}}. Updated daily from Mainline.';

const RATING_TOKEN_RE = /\{\{\s*(office_rating|office_review_count|company_rating|company_review_count)\s*\}\}/gi;

/** 4.72 → "4.7". */
export const formatRatingValue = (n: number): string => n.toFixed(1);
/** 3529 → "3,529" (no locale lookup, so server and editor agree). */
export const formatReviewCount = (n: number): string => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

export function hasRatingTokens(text: string | null | undefined): boolean {
  RATING_TOKEN_RE.lastIndex = 0;
  return !!text && RATING_TOKEN_RE.test(text);
}

/** Every rating token filled in, or null when any of them has no row behind it. */
export function resolveRatingTokens(text: string, ctx: RatingTokenContext): string | null {
  let missing = false;
  const out = text.replace(RATING_TOKEN_RE, (_m, name: string) => {
    const key = name.toLowerCase();
    const f = key.startsWith('office') ? ctx.office : ctx.company;
    if (!f) {
      missing = true;
      return '';
    }
    return key.endsWith('rating') ? formatRatingValue(f.ratingValue) : formatReviewCount(f.reviewCount);
  });
  return missing ? null : out;
}

/**
 * What a rating-bearing field renders. No tokens → the stored string itself. Tokens that can't resolve
 * (no row yet) → the text the field held before it was migrated to tokens (`fallbacks`, keyed by the
 * token text, kept on the content by the Brief 221 migration); with none, '' — never a raw `{{…}}`,
 * never "0 stars".
 */
export function renderRatingField(text: string, ctx: RatingTokenContext, fallbacks?: Readonly<Record<string, string>>): string {
  if (!hasRatingTokens(text)) return text;
  const resolved = resolveRatingTokens(text, ctx);
  if (resolved !== null) return resolved;
  const fb = fallbacks?.[text];
  return fb && !hasRatingTokens(fb) ? fb : '';
}

/** True when `figures` is what these rendered texts show: its rating AND its count, as whole numbers. */
export function ratingShownIn(texts: readonly string[], figures: RatingFigures): boolean {
  const all = texts.join('\n');
  const shows = (n: string) => new RegExp('(?<![\\d.,])' + n.replace(/[.,]/g, (c) => '\\' + c) + '(?![\\d]|[.,]\\d)').test(all);
  return shows(formatRatingValue(figures.ratingValue)) && shows(formatReviewCount(figures.reviewCount));
}

/**
 * The write/read path's rule for a content record's `ratingFallbacks` (Brief 221): keep an entry only
 * while its token text is still one of the record's fields, and only as plain text without tokens.
 * `clean` is the record's own per-field sanitiser. Undefined when nothing is left (key absent).
 */
export function keepRatingFallbacks(raw: unknown, fieldsInUse: readonly string[], clean: (v: string, key: string) => string): Record<string, string> | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const used = new Set(fieldsInUse.filter((t) => hasRatingTokens(t)));
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!used.has(k) || typeof v !== 'string' || !v.trim() || hasRatingTokens(v)) continue;
    out[k] = clean(v, k);
  }
  return Object.keys(out).length ? out : undefined;
}

/** A rating field that is exactly one rating token (the hub rating card's big number). */
export const RATING_TOKEN_ONLY_RE = /^\{\{\s*(?:office_rating|company_rating)\s*\}\}$/;
