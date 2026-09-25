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
