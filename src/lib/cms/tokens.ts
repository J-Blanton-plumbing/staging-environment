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
    label: 'No Drip Club price',
    hint: 'Membership price line (from Global Settings)',
    resolve: (s) => s.ndcPrice,
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
