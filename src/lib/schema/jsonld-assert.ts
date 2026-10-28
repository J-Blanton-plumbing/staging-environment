/**
 * Brief 188 (Track F5) — the JSON-LD validity assertion. Pure; used by
 * `scripts/validate-jsonld.ts` (prebuild, fixtures) and mirrored in
 * `scripts/validate-seo-routing.mjs` (post-deploy, real rendered pages).
 * Brief 167 is to reuse this module for the sitewide blocks.
 *
 * For every `<script type="application/ld+json">` block:
 *   1. it parses as JSON;
 *   2. it has `@context` (schema.org) and a `@type` — or an `@graph` whose every
 *      node has a `@type`;
 *   3. no two top-level nodes on the page share a `@type` AND the same entity
 *      (entity = `@id`, else `url`, else `name`, else "the page") — i.e. one
 *      BreadcrumbList per page, one BlogPosting per article;
 *   4. no FORBIDDEN type appears anywhere, however deeply nested.
 */
export const FORBIDDEN_TYPES = ['AggregateRating', 'Review', 'FAQPage', 'Question', 'Answer', 'SearchAction'] as const;

/**
 * Brief 216 (Marketing 2026-10-21, decision 1): the City Hub and City Service V2 templates — and ONLY
 * those two — emit one FAQPage derived from their visible FAQ. Everywhere else FORBIDDEN_TYPES applies.
 */
export const CITY_PAGE_FORBIDDEN_TYPES = FORBIDDEN_TYPES.filter((t) => t !== 'FAQPage' && t !== 'Question' && t !== 'Answer' && t !== 'AggregateRating');

/**
 * Brief 221 (Track C, Marketing 2026-10-28): `AggregateRating` is allowed in exactly two places — the
 * `aggregateRating` of a City Hub / City Service V2 page's office node (Plumber), and of the homepage
 * Organization. Never a Product, never Review nodes. `aggregateRatingProblems` checks where it sits.
 */
export const HOMEPAGE_FORBIDDEN_TYPES = FORBIDDEN_TYPES.filter((t) => t !== 'AggregateRating');

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

/** Every JSON-LD script body in an HTML document, in order. */
export function extractJsonLd(html: string): string[] {
  const out: string[] = [];
  const re = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) out.push(m[1]);
  return out;
}

const typesOf = (node: { [k: string]: Json }): string[] => {
  const t = node['@type'];
  return Array.isArray(t) ? t.filter((x): x is string => typeof x === 'string') : typeof t === 'string' ? [t] : [];
};

function collectTypes(v: Json, into: Set<string>): void {
  if (Array.isArray(v)) {
    v.forEach((x) => collectTypes(x, into));
    return;
  }
  if (v && typeof v === 'object') {
    for (const t of typesOf(v)) into.add(t);
    for (const x of Object.values(v)) collectTypes(x, into);
  }
}

export interface JsonLdReport {
  errors: string[];
  /** Top-level `@type` tally across the page, e.g. { BreadcrumbList: 1, BlogPosting: 1 }. */
  tally: Record<string, number>;
  /** Every type found anywhere (nested included). */
  allTypes: string[];
}

export function checkJsonLd(blocks: string[], forbidden: readonly string[] = FORBIDDEN_TYPES): JsonLdReport {
  const errors: string[] = [];
  const tally: Record<string, number> = {};
  const all = new Set<string>();
  const seen = new Set<string>();

  blocks.forEach((raw, i) => {
    let doc: Json;
    try {
      doc = JSON.parse(raw) as Json;
    } catch (e) {
      errors.push(`block ${i + 1}: does not parse as JSON (${(e as Error).message})`);
      return;
    }
    if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
      errors.push(`block ${i + 1}: is not a JSON object`);
      return;
    }
    const ctx = doc['@context'];
    if (typeof ctx !== 'string' || !/schema\.org/.test(ctx)) errors.push(`block ${i + 1}: missing or non-schema.org @context`);
    const graph = doc['@graph'];
    const nodes: Json[] = Array.isArray(graph) ? graph : [doc];
    if (!Array.isArray(graph) && typesOf(doc).length === 0) errors.push(`block ${i + 1}: missing @type`);
    nodes.forEach((n, j) => {
      if (!n || typeof n !== 'object' || Array.isArray(n)) {
        errors.push(`block ${i + 1} node ${j + 1}: not an object`);
        return;
      }
      const types = typesOf(n);
      if (types.length === 0) {
        errors.push(`block ${i + 1} node ${j + 1}: missing @type`);
        return;
      }
      const entity = String(n['@id'] ?? n.url ?? n.name ?? '(page)');
      for (const t of types) {
        tally[t] = (tally[t] ?? 0) + 1;
        const key = `${t}|${entity}`;
        if (seen.has(key)) errors.push(`duplicate ${t} for the same entity (${entity})`);
        seen.add(key);
      }
    });
    collectTypes(doc, all);
  });

  for (const t of forbidden) if (all.has(t)) errors.push(`forbidden type present: ${t}`);
  return { errors, tally, allTypes: Array.from(all).sort() };
}

/**
 * Brief 221: every AggregateRating must be the `aggregateRating` of a top-level node of `ownerTypes`,
 * in the Brief 221 shape (ratingValue "N.N" within 1–5, reviewCount a whole number > 0, best/worst
 * "5"/"1"). Returns the problems (none = OK).
 */
export function aggregateRatingProblems(blocks: string[], ownerTypes: readonly string[]): string[] {
  const out: string[] = [];
  let owned = 0;
  let total = 0;
  const count = (v: Json): void => {
    if (Array.isArray(v)) {
      v.forEach(count);
      return;
    }
    if (v && typeof v === 'object') {
      if (typesOf(v).includes('AggregateRating')) total++;
      Object.values(v).forEach(count);
    }
  };
  for (const raw of blocks) {
    let doc: Json;
    try {
      doc = JSON.parse(raw) as Json;
    } catch {
      continue;
    }
    count(doc);
    if (!doc || typeof doc !== 'object' || Array.isArray(doc)) continue;
    const graph = doc['@graph'];
    const nodes: Json[] = Array.isArray(graph) ? graph : [doc];
    for (const n of nodes) {
      if (!n || typeof n !== 'object' || Array.isArray(n)) continue;
      const r = n.aggregateRating;
      if (r === undefined) continue;
      if (!typesOf(n).some((t) => ownerTypes.includes(t))) out.push(`aggregateRating on a ${typesOf(n).join('/')} node (allowed only on ${ownerTypes.join('/')})`);
      if (!r || typeof r !== 'object' || Array.isArray(r) || r['@type'] !== 'AggregateRating') {
        out.push('aggregateRating is not an AggregateRating object');
        continue;
      }
      owned++;
      if (typeof r.ratingValue !== 'string' || !/^[1-5]\.\d$/.test(r.ratingValue) || Number(r.ratingValue) > 5) out.push(`aggregateRating ratingValue "${String(r.ratingValue)}" is not "N.N" within 1–5`);
      if (typeof r.reviewCount !== 'string' || !/^[1-9]\d*$/.test(r.reviewCount)) out.push(`aggregateRating reviewCount "${String(r.reviewCount)}" is not a whole number above 0`);
      if (r.bestRating !== '5' || r.worstRating !== '1') out.push('aggregateRating bestRating / worstRating are not "5" / "1"');
    }
  }
  if (total !== owned) out.push(`${total - owned} AggregateRating node(s) outside an allowed aggregateRating property`);
  return out;
}
