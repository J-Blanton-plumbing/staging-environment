/**
 * Brief 212 — the rules every "V2" CMS template shares (Sewer v2, City Hub, City Service V2).
 *
 * Extracted from the Brief 204 sewer modules (`sewer-v2-cms/model.ts`, `sewer-v2-cms/conform.ts`),
 * which now re-export these unchanged, so the sewer pages and editors behave exactly as before.
 * Pure and client-safe: no DB, no DOM, no sanitize-html import.
 */

// ── row over code, key by key (the Brief 157 / City V2 merge shape) ──────────────

/**
 * The row wins wherever it has content; the code module fills anything missing. Strings: a
 * non-blank row value wins. Numbers/booleans: a row value of the same type wins. Arrays: a non-empty
 * row array wins WHOLESALE (list items are a unit — item-level merging would splice code items into
 * a list an editor shortened). Objects: key by key over the CODE object's keys, so a key the code
 * does not know is dropped. Optional keys the code lacks but the row carries (a section's NDC
 * sentence override, a page's video fields) arrive with their array/object parent.
 */
export function mergeOver<T>(row: unknown, code: T): T {
  if (typeof code === 'string') return (typeof row === 'string' && row.trim() !== '' ? row : code) as T;
  if (typeof code === 'number') return (typeof row === 'number' && Number.isFinite(row) ? row : code) as T;
  if (typeof code === 'boolean') return (typeof row === 'boolean' ? row : code) as T;
  if (Array.isArray(code)) return (Array.isArray(row) && row.length > 0 ? row : code) as T;
  if (code && typeof code === 'object') {
    const r = row && typeof row === 'object' && !Array.isArray(row) ? (row as Record<string, unknown>) : {};
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(code as Record<string, unknown>)) out[k] = mergeOver(r[k], v);
    // Optional keys the code object omits (e.g. `video` on a page whose code module has none).
    for (const [k, v] of Object.entries(r)) if (!(k in out) && v !== undefined && v !== null) out[k] = v;
    return out as T;
  }
  return code;
}

// ── field rules ───────────────────────────────────────────────────────────────────

export interface ConformIssue {
  path: string;
  kind: 'structure' | 'phone' | 'empty' | 'link' | 'image' | 'value';
  message: string;
}

export function describeIssues(errors: readonly ConformIssue[], max = 6): string {
  const lines = errors.slice(0, max).map((e) => `${e.message}${e.path ? ` (${e.path})` : ''}`);
  if (errors.length > max) lines.push(`…and ${errors.length - max} more.`);
  return lines.join(' ');
}

/**
 * A phone number typed as digits. Every phone on these pages must be the `{{phone}}` token so it
 * renders the Global Settings number and WhatConverts can swap it (Brief 200 Track D, Brief 185 §4.1).
 */
const PHONE_RE = /(?:\+?1[\s.-]?)?\(?\b\d{3}\)?[\s.-]?\d{3}[\s.-]\d{4}\b/;
export const PHONE_MESSAGE =
  'Type {{phone}} instead of a phone number. It shows the current number and lets call tracking swap it.';

export function hasLiteralPhone(s: string): boolean {
  return PHONE_RE.test(s);
}

/** Link targets an editor may use. `tel:` is refused (use {{phone}}); so is anything script-like. */
export function linkProblem(href: string): string | null {
  const h = href.trim();
  if (!h) return 'A link needs a destination.';
  if (/^tel:/i.test(h)) return PHONE_MESSAGE;
  if (h.startsWith('/') && !h.startsWith('//')) return null;
  if (h.startsWith('#')) return null;
  if (/^https?:\/\/[^\s"<>]+$/i.test(h)) return null;
  if (/^mailto:[^\s"<>]+$/i.test(h)) return null;
  return `"${h}" is not a link this page can use. Use a site path (/financing) or a full https:// address.`;
}

/** Image sources: the site's own images, CMS uploads, or an https CDN URL. */
export function imageProblem(src: string): string | null {
  const s = src.trim();
  if (!s) return 'Choose an image.';
  if (/^\/(images|uploads)\/[^\s"<>]+$/.test(s)) return null;
  if (/^https:\/\/[^\s"<>]+$/i.test(s)) return null;
  return `"${s}" is not an image address this page can use.`;
}

// ── `[label](/href)` inline links (City Hub + City Service V2 copy) ──────────────

/** The only markup City Hub / City Service V2 copy carries (what `CityHubView` / `CityServiceV2View` render). */
export const MD_LINK_RE = /\[([^\]]+)\]\(([^)\s]+)\)/g;

/** Every link in a `[label](/href)` string. */
export function mdLinks(text: string): Array<{ label: string; href: string }> {
  const out: Array<{ label: string; href: string }> = [];
  const re = new RegExp(MD_LINK_RE.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) out.push({ label: m[1], href: m[2] });
  return out;
}

/** The text with every `[label](href)` reduced to its label. */
export function mdPlain(text: string): string {
  return text.replace(new RegExp(MD_LINK_RE.source, 'g'), '$1');
}

/**
 * A malformed link: a `[` or `](` left over once every well-formed link is removed. Typed text that
 * merely contains a square bracket (none of today's copy does) is refused rather than guessed at.
 */
export function mdSyntaxProblem(text: string): string | null {
  const rest = text.replace(new RegExp(MD_LINK_RE.source, 'g'), '');
  if (/\]\(|\[[^\]]*\]\(/.test(rest) || /\[[^\]]*\]\([^)]*$/.test(rest)) return 'A link in this text is not complete. Use the Link button to add links.';
  if (/[[\]]/.test(rest)) return 'Square brackets are reserved for links. Use the Link button to add a link.';
  return null;
}

// ── placeholders (Brief 212 hard rule 7) ─────────────────────────────────────────

/** Strings that mark unfinished copy. A version holding any of them can be saved but never published. */
export const PLACEHOLDER_TOKENS = ['[PENDING', '[NEEDED', '[RATING]', '[COUNT]', '[Phone Number]', '[PHONE]', '[VIDEO', '[THUMBNAIL', '[YYYY'] as const;

export function placeholderIn(s: string): string | null {
  for (const t of PLACEHOLDER_TOKENS) if (s.includes(t)) return t;
  return null;
}

/** Every string leaf of a value, with its path (for placeholder / phone sweeps). */
export function stringLeaves(v: unknown, path = '', out: Array<[string, string]> = []): Array<[string, string]> {
  if (typeof v === 'string') out.push([path, v]);
  else if (Array.isArray(v)) v.forEach((x, i) => stringLeaves(x, `${path}[${i}]`, out));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) stringLeaves(x, path ? `${path}.${k}` : k, out);
  return out;
}

/** Placeholder issues anywhere in a value (publish gate). */
export function placeholderIssues(v: unknown, root = ''): ConformIssue[] {
  const out: ConformIssue[] = [];
  for (const [p, s] of stringLeaves(v, root)) {
    const t = placeholderIn(s);
    if (t) out.push({ path: p, kind: 'value', message: `Still holds the placeholder "${t}…". Replace it before publishing.` });
  }
  return out;
}

export const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
export const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
