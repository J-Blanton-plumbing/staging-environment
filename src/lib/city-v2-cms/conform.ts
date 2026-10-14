/**
 * City V2 CMS — the structure lock and per-field sanitising for the 145 city service pages and the 5
 * city hubs, against their CODE MODULES (./code-defaults.ts). The same contract as Brief 204's
 * src/lib/sewer-v2-cms/conform.ts, whose tree, rich-text, link, image and phone rules it reuses:
 *
 *   - the layout is the template's: section kinds/ids/classes/order, every panel tag, class, inline
 *     style and attribute name, the hub's fixed three reviews; only leaves (text, links, image
 *     src/alt) and list LENGTHS (cards, steps, bullets, rows, FAQs…) change;
 *   - every string goes through the injected sanitiser, per field; rich fields through the gate;
 *   - phone numbers only as {{phone}}; links are site paths, #anchors or https; images are site
 *     images, uploads or https.
 *
 * `errors` is what an editor must fix (the write path refuses with 422). The read path renders a
 * structurally valid value and falls back to the code module when the STRUCTURE no longer fits.
 * Pure: no DB, no DOM.
 */
import type { SewerNode, SewerRich } from '@/lib/content/sewer-v2/types';
import type { CityServiceSection, CityServiceShared, CityServiceStored } from '@/lib/content/city-services-v2/types';
import type { CityHubStored } from '@/lib/content/city-hubs/stored';
import {
  conformNodes,
  conformRich,
  Ctx,
  imageProblem,
  linkProblem,
  PHONE_MESSAGE,
  type ConformResult,
  type Sanitizers,
} from '@/lib/sewer-v2-cms/conform';

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Values that are layout, not content: they must equal the code module's. */
const LOCKED_KEYS = new Set(['kind', 'id', 'cls', 'order', 'variant', 'schema']);
const IMAGE_KEYS = new Set(['image', 'src', 'thumbnailUrl']);
/** Link fields. `url` may be left empty where the template's is (a review without a Google link). */
const LINK_KEYS = new Set(['href', 'more', 'embed', 'url', 'contentUrl', 'embedUrl']);
/** Rich-text fields (plain string, or the inline tree when they carry a link). */
const RICH_KEYS = new Set(['body', 'a', 'ndc']);

interface Opts {
  /** Dotted paths of lists with a fixed number of items. */
  fixed?: ReadonlySet<string>;
}

function conformRichField(v: unknown, t: SewerRich, ctx: Ctx, path: string): SewerRich {
  const tNodes: SewerNode[] = typeof t === 'string' ? [t] : t;
  const vNodes: unknown = typeof v === 'string' ? [v] : v;
  const out = conformRich(vNodes, tNodes, [], ctx, path);
  return out.length === 1 && typeof out[0] === 'string' ? out[0] : out.length === 0 ? '' : out;
}

/** A review's Google link may always be left empty (the hub then shows no "Read on Google" line). */
const optionalLink = (path: string, t: string) => t === '' || /\.reviews\.items\[\d+\]\.url$/.test(path);

function conformLink(v: unknown, t: string, ctx: Ctx, path: string): string {
  if (typeof v !== 'string') {
    ctx.err(path, 'structure', 'Expected a link.');
    return t;
  }
  if (v.trim() === '' && optionalLink(path, t)) return '';
  const p = linkProblem(v);
  if (p) ctx.err(path, p === PHONE_MESSAGE ? 'phone' : 'link', p);
  return v.trim();
}

/** Structured values (hero, schema, shared sections, hub copy): the template decides the shape. */
function conformValue(v: unknown, t: unknown, ctx: Ctx, path: string, key: string, opts: Opts): unknown {
  if (LOCKED_KEYS.has(key) || key.startsWith('@')) {
    if (v !== undefined && !same(v, t)) ctx.err(path, 'structure', 'This value is part of the layout and can’t change.');
    return t;
  }
  if (RICH_KEYS.has(key) && (typeof t === 'string' || Array.isArray(t))) return conformRichField(v, t as SewerRich, ctx, path);
  if (typeof t === 'string') {
    if (LINK_KEYS.has(key)) return conformLink(v, t, ctx, path);
    if (IMAGE_KEYS.has(key)) {
      if (typeof v !== 'string') {
        ctx.err(path, 'structure', 'Expected an image.');
        return t;
      }
      const p = imageProblem(v);
      if (p) ctx.err(path, 'image', p);
      return v.trim();
    }
    return ctx.text(v, t, path);
  }
  if (typeof t === 'number') {
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      ctx.err(path, 'value', 'Expected a number.');
      return t;
    }
    return v;
  }
  if (typeof t === 'boolean' || t === null) return t;
  if (Array.isArray(t)) {
    if (!Array.isArray(v)) {
      ctx.err(path, 'structure', 'Expected a list.');
      return t;
    }
    if (opts.fixed?.has(path)) {
      if (v.length !== t.length) {
        ctx.err(path, 'structure', 'This list has a fixed number of items.');
        return t;
      }
      return t.map((ti, i) => conformValue(v[i], ti, ctx, `${path}[${i}]`, key, opts));
    }
    if (v.length === 0) {
      ctx.err(path, 'empty', 'A list needs at least one item.');
      return t;
    }
    return v.map((vi, i) => conformValue(vi, t[Math.min(i, t.length - 1)], ctx, `${path}[${i}]`, key, opts));
  }
  if (isObj(t)) {
    if (!isObj(v)) {
      ctx.err(path, 'structure', 'Layout mismatch.');
      return t;
    }
    const out: Record<string, unknown> = {};
    for (const [k, tk] of Object.entries(t)) out[k] = conformValue(v[k], tk, ctx, `${path}.${k}`, k, opts);
    return out;
  }
  return t;
}

function conformSection(v: unknown, t: CityServiceSection, ctx: Ctx, path: string): CityServiceSection {
  if (!isObj(v) || v.kind !== t.kind) {
    ctx.err(path, 'structure', 'Sections can’t be added, removed or reordered.');
    return t;
  }
  if (v.id !== t.id || v.cls !== t.cls || v.order !== t.order) ctx.err(path, 'structure', 'Section layout can’t change.');
  if (t.kind === 'ndc') {
    if (v.variant !== t.variant) ctx.err(path, 'structure', 'Section layout can’t change.');
    return { ...t };
  }
  return { kind: 'panel', id: t.id, cls: t.cls, order: t.order, body: conformNodes(v.body, t.body, [], ctx, `${path}.body`, false) };
}

export function conformCityService(input: unknown, code: CityServiceStored, s: Sanitizers): ConformResult<CityServiceStored> {
  const ctx = new Ctx(s);
  const v = isObj(input) ? input : {};
  if (!isObj(input)) ctx.err('', 'structure', 'Missing page content.');
  const sectionsIn = Array.isArray(v.sections) ? v.sections : [];
  if (sectionsIn.length !== code.sections.length) ctx.err('sections', 'structure', 'Sections can’t be added, removed or reordered.');
  const value: CityServiceStored = {
    schema: 1,
    hero: conformValue(v.hero, code.hero, ctx, 'hero', 'hero', {}) as CityServiceStored['hero'],
    sections: code.sections.map((t, i) => conformSection(sectionsIn[i], t, ctx, `sections[${i}]`)),
    serviceSchema: conformValue(v.serviceSchema, code.serviceSchema, ctx, 'serviceSchema', 'serviceSchema', {}) as CityServiceStored['serviceSchema'],
  };
  return { value, errors: ctx.errors };
}

function conformShared(v: unknown, t: CityServiceShared, ctx: Ctx): CityServiceShared {
  return conformValue(v, t, ctx, 'shared', 'shared', {}) as CityServiceShared;
}

const HUB_FIXED = new Set(['hub.reviews.items']);

export function conformCityHub(input: unknown, code: CityHubStored, s: Sanitizers): ConformResult<CityHubStored> {
  const ctx = new Ctx(s);
  const v = isObj(input) ? input : {};
  if (!isObj(input)) ctx.err('', 'structure', 'Missing page content.');
  const value: CityHubStored = {
    schema: 1,
    hub: conformValue(v.hub, code.hub, ctx, 'hub', 'hub', { fixed: HUB_FIXED }) as CityHubStored['hub'],
    hubShared: conformValue(v.hubShared, code.hubShared, ctx, 'hubShared', 'hubShared', {}) as CityHubStored['hubShared'],
    shared: conformShared(v.shared, code.shared, ctx),
  };
  return { value, errors: ctx.errors };
}

export { conformMeta, describeIssues } from '@/lib/sewer-v2-cms/conform';
