/**
 * Brief 204 — the structure lock and per-field sanitising for Sewer v2 content.
 *
 * `conformService` / `conformHub` take whatever arrived (an editor's save, a stored row) and the
 * page's CODE MODULE as the template, and return a value that:
 *   - has exactly the template's layout — section kinds and order, panel ids/tint/mobile order, every
 *     tag, class, inline style and attribute name, and every locked attribute value. The only
 *     variable parts are the leaves (text, links, image src/alt, YouTube ids, numbers) and the length
 *     and order of LISTS (a repeater's items must each match one of the template's items);
 *   - has every string through the injected sanitiser, PER FIELD, inside every array (the Brief 168
 *     unsanitised-array lesson): plain leaves through the plain-text rule, rich leaves through the
 *     rich-text gate (Brief 73's allow-list, used as a gate, never stored as its output);
 *   - carries the approved inline styles on inline elements, re-applied from the template, so an
 *     editor can neither drop the carmine links / Midnight lead-ins nor invent a new style.
 *
 * `errors` lists what an editor must fix (a literal phone number, a bad link, an emptied field, a
 * layout change). The write path refuses on any error (422); the read path renders a structurally
 * valid value and falls back to the code module when the structure itself is wrong.
 *
 * Pure: no DB, no DOM, no sanitize-html import — the server injects `sanitizeCmsPlainText` and the
 * `sanitizeCmsInlineHtml` gate (src/lib/cms/sewer-v2-sanitize.ts).
 */
import type {
  SewerElement,
  SewerNode,
  SewerSection,
  SewerServiceStored,
  SewerSharedContent,
} from '@/lib/content/sewer-v2/types';
import type { SewerHubStored } from './model';
import { isInlineOnly, nodesText, PHONE_TOKEN } from './rich';

export interface ConformIssue {
  path: string;
  kind: 'structure' | 'phone' | 'empty' | 'link' | 'image' | 'value';
  message: string;
}

export interface Sanitizers {
  /** Plain-text rule: no markup survives; entities decoded. */
  plain(s: string): string;
  /** Rich-text gate: returns inline nodes (no class/style) that passed the HTML allow-list. */
  richGate(nodes: SewerNode[]): SewerNode[];
}

/** Identity sanitisers — for the editor's client-side pre-check only; the server never uses these. */
export const NO_SANITIZE: Sanitizers = { plain: (s) => s, richGate: (n) => n };

export interface ConformResult<T> {
  value: T;
  errors: ConformIssue[];
}

// ── field rules ───────────────────────────────────────────────────────────────────

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

const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/;

/** Values that are layout, not content: they must equal the code module's. */
const LOCKED_KEYS = new Set(['kind', 'id', 'tint', 'order', 'variant', 'financingOrder', 'schema', 'color', 'highlight', 'ticks']);
const IMAGE_KEYS = new Set(['image', 'src', 'icon', 'seal', 'sinceIcon', 'thumbnailUrl']);
const LINK_KEYS = new Set(['href', 'iframeSrc']);
/** Arrays whose length is part of the layout (positional colours / fixed chart). */
const FIXED_ARRAYS = new Set(['sections', 'bars', 'ticks']);
/** Element attributes an editor may change; every other attribute value is locked. */
const EDITABLE_ATTRS = new Set(['alt', 'src', 'href', 'aria-label', 'data-label']);
/** Tags whose inline-only content is edited as one rich-text field. */
const RICH_TAGS = new Set(['p', 'li', 'td']);

// ── shared helpers ────────────────────────────────────────────────────────────────

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const isEl = (n: unknown): n is SewerElement => isObj(n) && typeof n.tag === 'string';
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export class Ctx {
  errors: ConformIssue[] = [];
  constructor(public s: Sanitizers) {}
  err(path: string, kind: ConformIssue['kind'], message: string) {
    this.errors.push({ path, kind, message });
  }
  text(v: unknown, t: string, path: string, opts: { optional?: boolean } = {}): string {
    if (typeof v !== 'string') {
      this.err(path, 'structure', 'Expected text.');
      return t;
    }
    const out = this.s.plain(v);
    if (hasLiteralPhone(out)) this.err(path, 'phone', PHONE_MESSAGE);
    if (!opts.optional && t.trim() !== '' && out.trim() === '') this.err(path, 'empty', 'This field can’t be empty.');
    return out;
  }
}

// ── trees (editorial panels, FAQ answers) ─────────────────────────────────────────

/** A list the editor may add to / remove from / reorder (cards, steps, bullets, table rows, rails). */
export function isRepeaterElement(t: SewerElement): boolean {
  const els = (t.kids ?? []).filter(isEl);
  if (['ul', 'ol', 'tbody'].includes(t.tag)) return true;
  if (['tr', 'thead', 'p', 'table'].includes(t.tag)) return false;
  if (/(^|\s)(ss-split|rail-head|rail-nav|cmp-photos)(\s|$)/.test(t.cls ?? '')) return false;
  if ((t.kids ?? []).some((k) => typeof k === 'string' && k.trim())) return false;
  return els.length >= 2 && els.length === (t.kids ?? []).length && els.every((e) => e.tag === els[0].tag && e.cls === els[0].cls);
}

/** A paragraph / bullet / cell whose content is the inline vocabulary only → one rich-text field. */
export function isRichElement(t: SewerElement): boolean {
  return RICH_TAGS.has(t.tag) && isInlineOnly(t.kids);
}

/** Does `v` have the template's locked shape? (Leaves, rich content and list lengths ignored.) */
export function compatible(v: unknown, t: SewerNode): boolean {
  if (typeof t === 'string') return typeof v === 'string';
  if (!isObj(v)) return false;
  if ('phoneNumber' in t) return 'phoneNumber' in v;
  if ('icon' in t) return v.icon === t.icon;
  if ('schedule' in t) return isObj(v.schedule) && v.schedule.cls === t.schedule.cls;
  if ('video' in t) return isObj(v.video) && v.video.kind === t.video.kind;
  if ('phone' in t) {
    if (!isObj(v.phone) || (v.phone.cls ?? null) !== (t.phone.cls ?? null)) return false;
    const vk = Array.isArray(v.phone.kids) ? v.phone.kids : [];
    const tk = t.phone.kids ?? [];
    return vk.length === tk.length && tk.every((k, i) => compatible(vk[i], k));
  }
  if (!isEl(v) || !('tag' in t)) return false;
  if (v.tag !== t.tag || (v.cls ?? null) !== (t.cls ?? null) || (v.style ?? null) !== (t.style ?? null)) return false;
  if (!same(Object.keys(v.attrs ?? {}).sort(), Object.keys(t.attrs ?? {}).sort())) return false;
  const vk = Array.isArray(v.kids) ? (v.kids as SewerNode[]) : [];
  const tk = t.kids ?? [];
  if (isRichElement(t)) return isInlineOnly(vk);
  if (isRepeaterElement(t)) return vk.length >= 1 && vk.every((k) => tk.some((x) => compatible(k, x)));
  return vk.length === tk.length && tk.every((k, i) => compatible(vk[i], k));
}

type Presets = Partial<Record<'a' | 'strong' | 'em', { cls?: string; style?: string }>>;

function collectPresets(nodes: readonly SewerNode[] | undefined, into: Presets = {}): Presets {
  for (const n of nodes ?? []) {
    if (!isEl(n)) continue;
    if ((n.tag === 'a' || n.tag === 'strong' || n.tag === 'em') && !into[n.tag] && (n.cls || n.style)) {
      into[n.tag] = { ...(n.cls ? { cls: n.cls } : {}), ...(n.style ? { style: n.style } : {}) };
    }
    collectPresets(n.kids, into);
  }
  return into;
}

/** Rebuild gated inline nodes with the template's inline presets (key order: tag, cls, style, attrs, kids). */
function applyPresets(nodes: SewerNode[], presets: Presets, ctx: Ctx, path: string): SewerNode[] {
  return nodes.map((n, i): SewerNode => {
    const p = `${path}[${i}]`;
    if (typeof n === 'string') {
      if (hasLiteralPhone(n)) ctx.err(p, 'phone', PHONE_MESSAGE);
      return n;
    }
    if ('phoneNumber' in n) return { phoneNumber: true };
    if ('phone' in n) return { phone: { kids: applyPresets(n.phone.kids ?? [], presets, ctx, `${p}.phone`) } };
    if (!isEl(n)) return '';
    if (n.tag === 'br') return { tag: 'br' };
    const tag = n.tag as 'a' | 'strong' | 'em';
    const pre = presets[tag] ?? {};
    const out: SewerElement = { tag };
    if (pre.cls) out.cls = pre.cls;
    if (pre.style) out.style = pre.style;
    if (tag === 'a') {
      const href = String(n.attrs?.href ?? '');
      const problem = linkProblem(href);
      if (problem) ctx.err(p, problem === PHONE_MESSAGE ? 'phone' : 'link', problem);
      out.attrs = { href };
    }
    out.kids = applyPresets(n.kids ?? [], presets, ctx, p);
    return out;
  });
}

export function conformRich(v: unknown, t: readonly SewerNode[], alts: readonly (readonly SewerNode[])[], ctx: Ctx, path: string): SewerNode[] {
  if (!Array.isArray(v) || !isInlineOnly(v as SewerNode[])) {
    ctx.err(path, 'structure', 'This text can only contain bold, italic, links and {{phone}}.');
    return t as SewerNode[];
  }
  const gated = ctx.s.richGate(v as SewerNode[]);
  const presets = collectPresets(t);
  for (const a of alts) collectPresets(a, presets);
  const out = applyPresets(gated, presets, ctx, path);
  if (nodesText(t).trim() !== '' && nodesText(out).replace(PHONE_TOKEN, 'x').trim() === '') ctx.err(path, 'empty', 'This field can’t be empty.');
  return out;
}

export function conformNodes(v: unknown, t: readonly SewerNode[], alts: readonly (readonly SewerNode[])[], ctx: Ctx, path: string, repeater: boolean): SewerNode[] {
  if (!Array.isArray(v)) {
    ctx.err(path, 'structure', 'Layout mismatch.');
    return t as SewerNode[];
  }
  if (repeater) {
    if (v.length === 0) {
      ctx.err(path, 'empty', 'A list needs at least one item.');
      return t as SewerNode[];
    }
    return v.map((item, i) => {
      const own = i < t.length && compatible(item, t[i]) ? t[i] : t.find((x) => compatible(item, x));
      if (!own) {
        ctx.err(`${path}[${i}]`, 'structure', 'This item does not match the list’s layout.');
        return t[Math.min(i, t.length - 1)];
      }
      const siblings = t.filter((x) => x !== own && compatible(item, x));
      return conformNode(item, own, siblings, ctx, `${path}[${i}]`);
    });
  }
  if (v.length !== t.length) {
    ctx.err(path, 'structure', 'Layout mismatch.');
    return t as SewerNode[];
  }
  return t.map((tn, i) => {
    const altNodes = alts.map((a) => a[i]).filter((x): x is SewerNode => x !== undefined && compatible(x, tn));
    return conformNode(v[i], tn, altNodes, ctx, `${path}[${i}]`);
  });
}

function conformNode(v: unknown, t: SewerNode, alts: readonly SewerNode[], ctx: Ctx, path: string): SewerNode {
  if (!compatible(v, t)) {
    ctx.err(path, 'structure', 'Layout mismatch.');
    return t;
  }
  if (typeof t === 'string') return ctx.text(v, t, path);
  const o = v as Record<string, unknown>;
  if ('phoneNumber' in t) return { phoneNumber: true };
  if ('icon' in t) return t;
  if ('schedule' in t) {
    const label = ctx.text((o.schedule as Record<string, unknown>).label, t.schedule.label, `${path}.label`);
    return { schedule: { cls: t.schedule.cls, label } };
  }
  if ('video' in t) {
    if (t.video.kind !== 'youtube') return t; // the MP4 renderer stays in code, unused (out of scope)
    const vv = o.video as Record<string, unknown>;
    let id = typeof vv.id === 'string' ? vv.id.trim() : '';
    if (!YOUTUBE_ID_RE.test(id)) {
      ctx.err(`${path}.id`, 'value', 'A YouTube video id is the 11 characters after "v=" in its link.');
      id = t.video.id;
    }
    return { video: { kind: 'youtube', id, title: ctx.text(vv.title, t.video.title, `${path}.title`) } };
  }
  if ('phone' in t) {
    const vp = o.phone as Record<string, unknown>;
    const kids = conformNodes(vp.kids ?? [], t.phone.kids ?? [], [], ctx, `${path}.phone`, false);
    const out: SewerNode = { phone: { ...(t.phone.cls ? { cls: t.phone.cls } : {}), ...(t.phone.ariaLabel ? { ariaLabel: t.phone.ariaLabel } : {}), kids } };
    return out;
  }
  const te = t as SewerElement;
  const ve = v as SewerElement;
  const out: SewerElement = { tag: te.tag };
  if (te.cls !== undefined) out.cls = te.cls;
  if (te.style !== undefined) out.style = te.style;
  if (te.attrs) {
    const attrs: Record<string, string | true> = {};
    for (const [k, tv] of Object.entries(te.attrs)) {
      const vv = ve.attrs?.[k];
      if (!EDITABLE_ATTRS.has(k) || typeof tv !== 'string') { attrs[k] = tv; continue; }
      if (typeof vv !== 'string') { ctx.err(`${path}@${k}`, 'structure', 'Missing value.'); attrs[k] = tv; continue; }
      if (k === 'src') {
        const p = imageProblem(vv);
        if (p) ctx.err(`${path}@src`, 'image', p);
        attrs[k] = vv.trim();
      } else if (k === 'href') {
        const p = linkProblem(vv);
        if (p) ctx.err(`${path}@href`, p === PHONE_MESSAGE ? 'phone' : 'link', p);
        attrs[k] = vv.trim();
      } else attrs[k] = ctx.text(vv, tv, `${path}@${k}`, { optional: k === 'data-label' });
    }
    out.attrs = attrs;
  }
  if (te.kids !== undefined) {
    const altKids = alts.filter(isEl).map((a) => a.kids ?? []);
    if (isRichElement(te)) out.kids = conformRich(ve.kids, te.kids, altKids, ctx, path);
    else out.kids = conformNodes(ve.kids, te.kids, altKids, ctx, path, isRepeaterElement(te));
  }
  if (te.tag === 'table') deriveDataLabels(out);
  return out;
}

/** Table cells' mobile labels follow the column heading (all 49 equal it in the approved pages). */
function deriveDataLabels(table: SewerElement) {
  const thead = (table.kids ?? []).find((k): k is SewerElement => isEl(k) && k.tag === 'thead');
  const tbody = (table.kids ?? []).find((k): k is SewerElement => isEl(k) && k.tag === 'tbody');
  const headRow = (thead?.kids ?? []).find(isEl);
  if (!headRow || !tbody) return;
  const heads = (headRow.kids ?? []).filter(isEl).map((c) => nodesText(c.kids));
  for (const tr of (tbody.kids ?? []).filter(isEl)) {
    (tr.kids ?? []).filter(isEl).forEach((cell, i) => {
      if (cell.attrs && 'data-label' in cell.attrs && heads[i] !== undefined) cell.attrs['data-label'] = heads[i];
    });
  }
}

/** A FAQ answer: plain string, or inline nodes when it carries a link / bold / the phone. */
function conformFaqAnswer(v: unknown, t: string | SewerNode[], ctx: Ctx, path: string): string | SewerNode[] {
  const tNodes: SewerNode[] = typeof t === 'string' ? [t] : t;
  const vNodes: unknown = typeof v === 'string' ? [v] : v;
  const out = conformRich(vNodes, tNodes, [], ctx, path);
  // A plain answer stays a string, exactly as the code modules hold it.
  return out.length === 1 && typeof out[0] === 'string' ? out[0] : out.length === 0 ? '' : out;
}

// ── structured objects (hero, reviews, FAQ, hub, shared) ──────────────────────────

function conformValue(v: unknown, t: unknown, ctx: Ctx, path: string, key: string): unknown {
  if (LOCKED_KEYS.has(key)) {
    if (v !== undefined && !same(v, t)) ctx.err(path, 'structure', 'This value is part of the layout and can’t change.');
    return t;
  }
  if (typeof t === 'string') {
    if (LINK_KEYS.has(key)) {
      if (typeof v !== 'string') { ctx.err(path, 'structure', 'Expected a link.'); return t; }
      const p = linkProblem(v);
      if (p) ctx.err(path, p === PHONE_MESSAGE ? 'phone' : 'link', p);
      return v.trim();
    }
    if (IMAGE_KEYS.has(key)) {
      if (typeof v !== 'string') { ctx.err(path, 'structure', 'Expected an image.'); return t; }
      const p = imageProblem(v);
      if (p) ctx.err(path, 'image', p);
      return v.trim();
    }
    return ctx.text(v, t, path);
  }
  if (typeof t === 'number') {
    if (typeof v !== 'number' || !Number.isFinite(v)) { ctx.err(path, 'value', 'Expected a number.'); return t; }
    return v;
  }
  if (typeof t === 'boolean') return t;
  if (Array.isArray(t)) {
    if (!Array.isArray(v)) { ctx.err(path, 'structure', 'Expected a list.'); return t; }
    if (FIXED_ARRAYS.has(key)) {
      if (v.length !== t.length) { ctx.err(path, 'structure', 'This list has a fixed number of items.'); return t; }
      return t.map((ti, i) => conformValue(v[i], ti, ctx, `${path}[${i}]`, String(i)));
    }
    if (v.length === 0) { ctx.err(path, 'empty', 'A list needs at least one item.'); return t; }
    return v.map((vi, i) => conformValue(vi, t[Math.min(i, t.length - 1)], ctx, `${path}[${i}]`, key));
  }
  if (isObj(t)) {
    if (!isObj(v)) { ctx.err(path, 'structure', 'Layout mismatch.'); return t; }
    const out: Record<string, unknown> = {};
    for (const [k, tk] of Object.entries(t)) out[k] = conformValue(v[k], tk, ctx, `${path}.${k}`, k);
    return out;
  }
  return t;
}

function conformSection(v: unknown, t: SewerSection, ctx: Ctx, path: string): SewerSection {
  if (!isObj(v) || v.kind !== t.kind) {
    ctx.err(path, 'structure', 'Sections can’t be added, removed or reordered.');
    return t;
  }
  switch (t.kind) {
    case 'panel': {
      if (v.id !== t.id || v.tint !== t.tint || v.order !== t.order) ctx.err(path, 'structure', 'Panel layout can’t change.');
      return { kind: 'panel', id: t.id, tint: t.tint, order: t.order, body: conformNodes(v.body, t.body, [], ctx, `${path}.body`, false) };
    }
    case 'reviews': {
      if (v.variant !== t.variant || v.order !== t.order) ctx.err(path, 'structure', 'Reviews layout can’t change.');
      return {
        kind: 'reviews',
        order: t.order,
        variant: t.variant,
        eyebrow: ctx.text(v.eyebrow, t.eyebrow, `${path}.eyebrow`),
        heading: ctx.text(v.heading, t.heading, `${path}.heading`),
        items: conformValue(v.items, t.items, ctx, `${path}.items`, 'items') as typeof t.items,
      };
    }
    case 'faq': {
      if (v.order !== t.order) ctx.err(path, 'structure', 'FAQ layout can’t change.');
      const items = Array.isArray(v.items) && v.items.length > 0 ? v.items : null;
      if (!items) ctx.err(`${path}.items`, 'empty', 'Add at least one question.');
      return {
        kind: 'faq',
        order: t.order,
        eyebrow: ctx.text(v.eyebrow, t.eyebrow, `${path}.eyebrow`),
        heading: ctx.text(v.heading, t.heading, `${path}.heading`),
        items: (items ?? t.items).map((it: unknown, i: number) => {
          const tt = t.items[Math.min(i, t.items.length - 1)];
          const o = isObj(it) ? it : {};
          return {
            q: ctx.text(o.q, tt.q, `${path}.items[${i}].q`),
            preview: conformFaqAnswer(o.preview, tt.preview, ctx, `${path}.items[${i}].preview`),
            full: conformFaqAnswer(o.full, tt.full, ctx, `${path}.items[${i}].full`),
          };
        }),
      };
    }
    case 'ndc': {
      if (v.order !== t.order) ctx.err(path, 'structure', 'Section layout can’t change.');
      const body = typeof v.body === 'string' ? ctx.text(v.body, '', `${path}.body`, { optional: true }).trim() : '';
      return body ? { kind: 'ndc', order: t.order, body } : { kind: 'ndc', order: t.order };
    }
    case 'services':
      if (v.order !== t.order) ctx.err(path, 'structure', 'Section layout can’t change.');
      return { kind: 'services', order: t.order };
    case 'final':
      if (v.order !== t.order) ctx.err(path, 'structure', 'Section layout can’t change.');
      return { kind: 'final', order: t.order, heading: ctx.text(v.heading, t.heading, `${path}.heading`), body: ctx.text(v.body, t.body, `${path}.body`) };
  }
}

// ── entry points ──────────────────────────────────────────────────────────────────

export function conformService(input: unknown, code: SewerServiceStored, s: Sanitizers): ConformResult<SewerServiceStored> {
  const ctx = new Ctx(s);
  const v = isObj(input) ? input : {};
  if (!isObj(input)) ctx.err('', 'structure', 'Missing page content.');
  const sectionsIn = Array.isArray(v.sections) ? v.sections : [];
  if (sectionsIn.length !== code.sections.length) ctx.err('sections', 'structure', 'Sections can’t be added, removed or reordered.');
  const out: SewerServiceStored = {
    schema: 1,
    hero: conformValue(v.hero, code.hero, ctx, 'hero', 'hero') as SewerServiceStored['hero'],
    sections: code.sections.map((t, i) => conformSection(sectionsIn[i], t, ctx, `sections[${i}]`)),
    rail: conformValue(v.rail, code.rail, ctx, 'rail', 'rail') as SewerServiceStored['rail'],
  };
  if (code.video) out.video = conformValue(v.video ?? code.video, code.video, ctx, 'video', 'video') as SewerServiceStored['video'];
  return { value: out, errors: ctx.errors };
}

export function conformHub(input: unknown, code: SewerHubStored, s: Sanitizers): ConformResult<SewerHubStored> {
  const ctx = new Ctx(s);
  const v = isObj(input) ? input : {};
  if (!isObj(input)) ctx.err('', 'structure', 'Missing page content.');
  const hub = conformValue(v.hub, code.hub, ctx, 'hub', 'hub') as SewerHubStored['hub'];
  const shared = conformShared(v.shared, code.shared, ctx);
  return { value: { schema: 1, hub, shared }, errors: ctx.errors };
}

function conformShared(v: unknown, t: SewerSharedContent, ctx: Ctx): SewerSharedContent {
  const out = conformValue(v, t, ctx, 'shared', 'shared') as SewerSharedContent;
  // A service's slug is its URL path: it decides which page leaves itself out of the rows and what
  // the hub order refers to. Derived on save, never typed.
  out.services = out.services.map((e, i) => {
    const slug = e.href.startsWith('/') ? e.href.slice(1).split(/[?#]/)[0] : t.services[Math.min(i, t.services.length - 1)].slug;
    return { slug, href: e.href, image: e.image, row: e.row, hub: e.hub };
  });
  const slugs = new Set(out.services.map((e) => e.slug));
  if (slugs.size !== out.services.length) ctx.err('shared.services', 'value', 'Two services link to the same page.');
  const order = Array.isArray((v as Record<string, unknown> | undefined)?.hubOrder) ? ((v as Record<string, unknown>).hubOrder as unknown[]) : t.hubOrder;
  out.hubOrder = order.filter((x): x is string => typeof x === 'string');
  if (out.hubOrder.length === 0) ctx.err('shared.hubOrder', 'empty', 'The hub grid needs at least one service.');
  for (const s of out.hubOrder) if (!slugs.has(s)) ctx.err('shared.hubOrder', 'value', `The hub grid names "${s}", which is not in the services list.`);
  if (new Set(out.hubOrder).size !== out.hubOrder.length) ctx.err('shared.hubOrder', 'value', 'A service appears twice in the hub grid.');
  out.hubFeatured = typeof (v as Record<string, unknown> | undefined)?.hubFeatured === 'string' ? ((v as Record<string, unknown>).hubFeatured as string) : t.hubFeatured;
  if (!slugs.has(out.hubFeatured)) ctx.err('shared.hubFeatured', 'value', 'The featured service must be one of the services in the list.');
  return out;
}

/** Meta fields (stored in the row's SEO columns). */
export function conformMeta(input: { metaTitle?: unknown; metaDescription?: unknown }, code: { title: string; description: string }, s: Sanitizers) {
  const ctx = new Ctx(s);
  const metaTitle = ctx.text(input.metaTitle, code.title, 'metaTitle');
  const metaDescription = ctx.text(input.metaDescription, code.description, 'metaDescription');
  return { value: { metaTitle, metaDescription }, errors: ctx.errors };
}

/** Errors as one human sentence list (the 422 body). */
export function describeIssues(errors: readonly ConformIssue[], max = 6): string {
  const lines = errors.slice(0, max).map((e) => `${e.message}${e.path ? ` (${e.path})` : ''}`);
  if (errors.length > max) lines.push(`…and ${errors.length - max} more.`);
  return lines.join(' ');
}
