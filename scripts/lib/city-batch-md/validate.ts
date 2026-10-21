/**
 * Brief 212 (Track C4) — the importer's validation gates. Any failure means NO WRITE for that page.
 *   - placeholders ([PENDING, [NEEDED, [RATING], [COUNT], [Phone Number], [PHONE], [VIDEO, [THUMBNAIL, [YYYY)
 *     and literal phone numbers anywhere in the stored content;
 *   - no em/en dash, no "$" price, no "In Illinois" / "Illinois requires" / "Required in Illinois"
 *     claim, no "Lake Geneva";
 *   - every internal link resolves: a built V2 city-service page of this city (with an existing
 *     anchor when it has one), a same-page #anchor, a registered town page, /{city}/flood-control-maintenance,
 *     /locations/chicagoland (or /central-ohio), /no-drip-club(/);
 *   - the visible FAQ equals the MD's own FAQPage schema text (catches a correction applied to one side);
 *   - (Brief 216) the FAQPage the page will EMIT (derived from its stored FAQ) equals the MD's own
 *     FAQPage block, apostrophes normalised; no scraped Google UI text left in any string (G2);
 *     every fold anchor is the city's fold map's.
 * The block-sequence and shared-record gates live in the parsers.
 */
import { getCity } from '../../../src/lib/content/cities';
import { hasLiteralPhone, PLACEHOLDER_TOKENS, stringLeaves } from '../../../src/lib/cms-v2/shared';
import { isV2ServiceSlug, serviceLayout } from '../../../src/lib/city-service-v2-cms/code-defaults';
import { faqPageJsonLd } from '../../../src/lib/schema/city-pages';
import type { CsBlock } from '../../../src/lib/content/city-services-v2/types';
import { links } from './md';

const BANNED: Array<[RegExp, string]> = [
  [/—/, 'em dash'],
  [/–/, 'en dash'],
  [/\$\s?\d/, '"$" price'],
  [/In Illinois/, '"In Illinois" claim'],
  [/Illinois requires/, '"Illinois requires" claim'],
  [/Required in Illinois/, '"Required in Illinois" claim'],
  [/Lake Geneva/, '"Lake Geneva"'],
];
const STATIC_OK = new Set(['/locations/chicagoland', '/locations/central-ohio', '/no-drip-club/', '/no-drip-club']);

/** Text gates over every stored string. */
export function textGates(content: unknown): string[] {
  const out: string[] = [];
  for (const [p, s] of stringLeaves(content)) {
    if (/(^|\.)(src|href|url)$/.test(p) || /provider\./.test(p) || /serviceSchema\.(url|@context|@type)/.test(p)) continue;
    for (const t of PLACEHOLDER_TOKENS) if (s.includes(t)) out.push(`${p}: placeholder "${t}"`);
    if (hasLiteralPhone(s)) out.push(`${p}: literal phone number`);
    for (const [re, what] of BANNED) if (re.test(s)) out.push(`${p}: ${what} — "${s.slice(Math.max(0, s.search(re) - 30), s.search(re) + 30)}"`);
  }
  return out;
}

export interface LinkCheck {
  href: string;
  kind: 'city-service' | 'anchor' | 'town' | 'static' | 'flood-control';
}

/**
 * Check one internal link from a page of `city` (own section ids = `pageIds`, for #anchors).
 * `layoutOf` (Brief 216): the layout of another page of the same city — this batch's own MD-built
 * layouts for the pages being imported; the template otherwise.
 */
export function linkProblem(
  href: string,
  city: string,
  pageIds: Set<string>,
  layoutOf: (city: string, service: string) => readonly CsBlock[] | undefined = serviceLayout
): { ok: true; kind: LinkCheck['kind'] } | { ok: false; why: string } {
  if (STATIC_OK.has(href)) return { ok: true, kind: 'static' };
  if (href.startsWith('#')) return pageIds.has(href.slice(1)) ? { ok: true, kind: 'anchor' } : { ok: false, why: `anchor ${href} is not a section on this page` };
  const m = href.match(/^\/([a-z0-9-]+)\/([a-z0-9-]+)(?:#([a-z0-9-]+))?$/);
  if (m) {
    if (m[1] !== city) return { ok: false, why: `links to another city's page (${href})` };
    if (m[2] === 'flood-control-maintenance' && !m[3]) return { ok: true, kind: 'flood-control' };
    if (!isV2ServiceSlug(m[2])) return { ok: false, why: `"${m[2]}" is not a built City Service V2 page (folded or unknown)` };
    if (m[3]) {
      const ids = new Set((layoutOf(city, m[2]) ?? []).map((b) => b.id));
      if (!ids.has(m[3])) return { ok: false, why: `${href}: no #${m[3]} section on that page` };
    }
    return { ok: true, kind: 'city-service' };
  }
  const t = href.match(/^\/([a-z0-9-]+)$/);
  if (t && getCity(t[1])) return { ok: true, kind: 'town' };
  return { ok: false, why: `"${href}" is not a page this batch may link to` };
}

/** Every link in stored content: `[label](href)` in text, plus card/area/more hrefs. */
export function allLinks(content: unknown): Array<{ path: string; href: string }> {
  const out: Array<{ path: string; href: string }> = [];
  for (const [p, s] of stringLeaves(content)) {
    if (/(^|\.)(href|more)$/.test(p)) {
      if (s.startsWith('/') || s.startsWith('#')) out.push({ path: p, href: s });
      continue;
    }
    if (/(^|\.)(src|url)$/.test(p) || /serviceSchema/.test(p)) continue;
    for (const l of links(s)) out.push({ path: p, href: l.href });
  }
  return out;
}

const normWs = (s: string) => s.replace(/\s+/g, ' ').trim();

/** Visible FAQ vs the MD's FAQPage schema: same count, same questions, same answers (links stripped). */
export function faqGate(visible: Array<{ q: string; a: string }>, schema: Array<{ q: string; a: string }>): string[] {
  const out: string[] = [];
  if (!schema.length) return ['FAQ: the MD has no FAQPage schema to compare with'];
  if (visible.length !== schema.length) out.push(`FAQ: ${visible.length} visible vs ${schema.length} in the schema`);
  for (let i = 0; i < Math.min(visible.length, schema.length); i++) {
    const v = visible[i];
    const s = schema[i];
    const plainA = v.a.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '$1');
    if (normWs(v.q) !== normWs(s.q)) out.push(`FAQ Q${i + 1}: question "${v.q}" ≠ schema "${s.q}"`);
    if (normWs(plainA) !== normWs(s.a)) out.push(`FAQ Q${i + 1}: answer differs from the schema`);
  }
  return out;
}

const normQ = (x: string) => x.replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();

/**
 * Brief 216 (Track B gate): the FAQPage the page will emit — `faqPageJsonLd` over its STORED FAQ, the
 * same function the view runs — must equal the MD's own FAQPage block (questions and answers, in
 * order), apostrophes and whitespace normalised.
 */
export function emittedFaqGate(stored: Array<{ q: string; a: string }>, schema: Array<{ q: string; a: string }>): string[] {
  if (!schema.length) return ['FAQPage: the MD has no FAQPage block to compare with'];
  const ld = faqPageJsonLd(stored).mainEntity;
  const out: string[] = [];
  if (ld.length !== schema.length) out.push(`FAQPage: the page would emit ${ld.length} questions, the MD's block has ${schema.length}`);
  for (let i = 0; i < Math.min(ld.length, schema.length); i++) {
    if (normQ(ld[i].name) !== normQ(schema[i].q)) out.push(`FAQPage Q${i + 1}: emitted "${ld[i].name}" ≠ MD "${schema[i].q}"`);
    if (normQ(ld[i].acceptedAnswer.text) !== normQ(schema[i].a)) out.push(`FAQPage Q${i + 1}: the emitted answer ≠ the MD's — "${ld[i].acceptedAnswer.text.slice(0, 90)}" vs "${schema[i].a.slice(0, 90)}"`);
  }
  return out;
}

/** Brief 216 G2 gate: no scraped Google UI text anywhere in the stored content. */
export function g2Gate(content: unknown): string[] {
  const out: string[] = [];
  for (const [p, s] of stringLeaves(content)) for (const t of ['Show business response', '📸', 'Positive Responsiveness']) if (s.includes(t)) out.push(`${p}: still holds "${t}" (G2)`);
  return out;
}
