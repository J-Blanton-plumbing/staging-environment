/**
 * Brief 212 (Track B) — the City Service V2 code modules (src/lib/content/city-services-v2/data/*.json)
 * as stored-shape objects, and the LAYOUT TEMPLATE every V2 service page is locked to.
 *
 *   - `codeServiceStored(city, service)` — the 5 Batch 1 cities' pages: the fallback when a row is
 *     missing, unreadable or has no usable `v2_content`, and the Batch 1 seed's source.
 *   - `serviceLayout(city, service)` — the TEMPLATE layout: its own code module when it has one,
 *     otherwise Northbrook's page for the same service with the city slug swapped into the section ids
 *     (the Brief 209 id rule: `northbrook-drains` → `geneva-drains`). Every Batch 2 MD matches
 *     Northbrook's block sequence (measured, Brief 212 C4).
 *   - `pageLayout(city, service, …)` (Brief 216) — the layout a page is LOCKED to: its own published
 *     structure; Batch 3 pages keep every section of their MD (Marketing decision 3), so 180 of them
 *     carry sections Northbrook doesn't have.
 *
 * Server-only (the JSON is ~1.9 MB): never import from a client component or middleware.
 */
import { CITY_SERVICES_V2, getCityServiceV2 } from '@/lib/content/city-services-v2';
import type { CityServiceV2Page, CsBlock } from '@/lib/content/city-services-v2/types';
import { clone } from '@/lib/cms-v2/shared';
import { pageToStored, stripTitleTail, type CityServiceStored } from './model';

export const LAYOUT_CITY = 'northbrook';

/** The 29 V2 service slugs (Northbrook's set — the same in every Batch 1 city). */
export const CITY_SERVICE_V2_SLUGS: readonly string[] = Object.keys(CITY_SERVICES_V2[LAYOUT_CITY]);

export function isV2ServiceSlug(service: string): boolean {
  return CITY_SERVICE_V2_SLUGS.includes(service);
}

export function hasCodeService(city: string, service: string): boolean {
  return !!getCityServiceV2(city, service);
}

export function codeServiceStored(city: string, service: string): CityServiceStored | undefined {
  const p = getCityServiceV2(city, service);
  return p ? pageToStored(p) : undefined;
}

/** The code module's meta, title tail stripped (what the row stores). */
export function codeServiceMeta(city: string, service: string): { title: string; description: string } | undefined {
  const p = getCityServiceV2(city, service);
  return p ? { title: stripTitleTail(p.meta.title), description: p.meta.description } : undefined;
}

/** A Batch 1 id with the layout city's slug swapped for `city` (no-op when the page is its own template). */
export function rewriteId(id: string, from: string, to: string): string {
  return from === to ? id : id.split(from).join(to);
}

/**
 * The TEMPLATE layout of `city`/`service`: its own code module, or Northbrook's page for the same
 * service with the city slug swapped into the ids. Undefined when `service` has no V2 template.
 * Since Brief 216 a page's LOCKED layout is `pageLayout()` (its own published content first); this
 * stays the source of `cls` / photos / ids for blocks the importer matches to it, and the lock for a
 * Batch 1–2 page before its first publish.
 */
export function serviceLayout(city: string, service: string): CsBlock[] | undefined {
  const own = getCityServiceV2(city, service);
  if (own) return clone(own.blocks);
  const tpl = getCityServiceV2(LAYOUT_CITY, service);
  if (!tpl) return undefined;
  return clone(tpl.blocks).map((b) => ({ ...b, id: rewriteId(b.id, LAYOUT_CITY, city) }));
}

// ── Brief 216 (Track C1): per-page layouts ────────────────────────────────────────────────────────

const BLOCK_TYPES: ReadonlySet<string> = new Set(['split', 'fold', 'tiles', 'steps', 'local', 'table', 'reviews', 'faq', 'ndc', 'services', 'final']);
/** Block types an imported page may add beyond its template (Marketing decision 3: only types the view renders). */
export const EXTRA_BLOCK_TYPES: ReadonlySet<CsBlock['type']> = new Set<CsBlock['type']>(['split', 'steps', 'tiles']);
/** The one section of a type that has to be on every page, exactly once. */
const ONCE: ReadonlyArray<CsBlock['type']> = ['reviews', 'faq', 'services', 'final'];

/** Every `cls` each block type carries in the Batch 1 code modules (the only classes the CSS knows). */
const ALLOWED_CLS: ReadonlyMap<string, ReadonlySet<string>> = (() => {
  const m = new Map<string, Set<string>>();
  for (const pages of Object.values(CITY_SERVICES_V2)) for (const p of Object.values(pages)) for (const b of p.blocks) {
    if (!m.has(b.type)) m.set(b.type, new Set());
    m.get(b.type)!.add(b.cls);
  }
  return m;
})();

/** The default `cls` of a block type with no template counterpart (the plain panel). */
export const DEFAULT_BLOCK_CLS = 'ss-panel';

/** The fold anchors of `service` (the 301 contract — the same on every city's page). */
export function foldIdsOf(service: string): string[] {
  return (getCityServiceV2(LAYOUT_CITY, service)?.blocks ?? []).filter((b) => b.type === 'fold').map((b) => b.id);
}

/** The attributes the lock compares, per block (photo = presence only). */
function shape(b: CsBlock): string {
  const x = b as CsBlock & { img?: unknown; minCol?: number; variant?: string; tiles?: Array<{ bullets?: unknown }> };
  return [b.type, b.id, b.cls, b.order, x.variant ?? '', x.minCol ?? '', b.type === 'tiles' ? (x.tiles?.[0]?.bullets ? 'bullets' : 'text') : '', 'img' in x ? (x.img ? 'photo' : 'no-photo') : ''].join('|');
}
export const sameLayout = (a: readonly CsBlock[], b: readonly CsBlock[]) => a.length === b.length && a.every((x, i) => shape(x) === shape(b[i]));

/**
 * Why `blocks` can't serve as a page's layout ([] = it can): known types only; a non-empty, unique
 * slug id each; a `cls` the CSS knows for that type; increasing `order` (the mobile flex order); one
 * each of reviews / FAQ / services / Final CTA, the Final CTA last; at most one No Drip Club; and the
 * page's fold anchors exactly the template's (the fold-map anchors — the 301 contract).
 */
export function layoutProblems(blocks: unknown, service: string): string[] {
  if (!Array.isArray(blocks) || blocks.length === 0) return ['no sections'];
  const out: string[] = [];
  const ids = new Set<string>();
  let prevOrder = -Infinity;
  blocks.forEach((raw, i) => {
    const b = raw as Record<string, unknown>;
    const at = `section ${i + 1}`;
    if (!b || typeof b !== 'object' || !BLOCK_TYPES.has(String(b.type))) return void out.push(`${at}: unknown type "${String(b?.type)}"`);
    if (typeof b.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(b.id)) out.push(`${at}: bad id "${String(b.id)}"`);
    else if (ids.has(b.id)) out.push(`${at}: duplicate id "${b.id}"`);
    else ids.add(b.id);
    if (typeof b.cls !== 'string' || !ALLOWED_CLS.get(String(b.type))?.has(b.cls)) out.push(`${at}: class "${String(b.cls)}" is not one the ${String(b.type)} layout uses`);
    if (typeof b.order !== 'number' || !(b.order > prevOrder)) out.push(`${at}: order ${String(b.order)} is not increasing`);
    else prevOrder = b.order;
    if (b.type === 'ndc' && b.variant !== 'general' && b.variant !== 'sewer') out.push(`${at}: No Drip Club variant "${String(b.variant)}"`);
    if (b.type === 'tiles' && b.minCol !== 260 && b.minCol !== 340) out.push(`${at}: tile width ${String(b.minCol)}`);
  });
  const types = blocks.map((b) => (b as { type?: string })?.type);
  for (const t of ONCE) if (types.filter((x) => x === t).length !== 1) out.push(`exactly one "${t}" section expected (found ${types.filter((x) => x === t).length})`);
  if (types.filter((x) => x === 'ndc').length > 1) out.push('more than one No Drip Club section');
  if (types[types.length - 1] !== 'final') out.push('the Final CTA must be the last section');
  const folds = blocks.filter((b) => (b as { type?: string })?.type === 'fold').map((b) => (b as { id: string }).id).sort();
  const want = foldIdsOf(service).sort();
  if (folds.join(',') !== want.join(',')) out.push(`fold anchors ${folds.join(', ') || '(none)'} ≠ the fold map's ${want.join(', ') || '(none)'}`);
  return out;
}

const blocksOf = (content: unknown): unknown => (content && typeof content === 'object' && !Array.isArray(content) ? (content as { blocks?: unknown }).blocks : undefined);

/**
 * The layout a page is LOCKED to (Brief 216, Marketing decision 3 — "each service page's layout is its
 * own", locked once it is live):
 *   1. the page's own PUBLISHED content (`city_service_pages.v2_content`), when it is a well-formed
 *      layout (`layoutProblems`) — from then on no section can be added, removed or reordered;
 *   2. nothing published yet: the template (`serviceLayout`) when the page has a code module, or when
 *      the draft has the template's structure (every Batch 1–2 page — their behaviour is unchanged);
 *   3. nothing published, no code module, and a draft with its OWN well-formed structure (a Batch 3
 *      page from its MD, whose block sequence the importer has already gated) → that structure;
 *   4. otherwise the template, so the conform reports exactly what differs.
 * Undefined when `service` has no V2 template.
 */
export function pageLayout(city: string, service: string, opts: { published?: unknown; draft?: unknown } = {}): CsBlock[] | undefined {
  const tpl = serviceLayout(city, service);
  if (!tpl) return undefined;
  const pub = blocksOf(opts.published);
  if (pub !== undefined && layoutProblems(pub, service).length === 0) return clone(pub as CsBlock[]);
  if (hasCodeService(city, service)) return tpl;
  const draft = blocksOf(opts.draft);
  if (draft === undefined || (Array.isArray(draft) && sameLayout(draft as CsBlock[], tpl))) return tpl;
  if (layoutProblems(draft, service).length === 0) return clone(draft as CsBlock[]);
  return tpl;
}

/** The layout city's whole page for a service (images, alts, ids the importer copies by position). */
export function layoutPage(service: string): CityServiceV2Page | undefined {
  const p = getCityServiceV2(LAYOUT_CITY, service);
  return p ? clone(p) : undefined;
}

/** The V2 hero image + alt of `service` (the rule service cards and new hub cards use, Brief 209 / 212 A-3). */
export function heroImageFor(service: string): { src: string; alt: string } | undefined {
  const p = getCityServiceV2(LAYOUT_CITY, service);
  return p ? { ...p.hero.img } : undefined;
}
