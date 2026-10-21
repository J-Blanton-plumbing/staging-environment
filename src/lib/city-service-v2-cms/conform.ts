/**
 * Brief 212 (Track B) — the layout lock and per-field sanitising for City Service V2 content.
 *
 * `conformService` takes whatever arrived (an editor's save, a stored row, an importer payload) and the
 * page's LAYOUT (`pageLayout()` — since Brief 216 the page's own published structure; before its first
 * publish its code module / Northbrook's template, or, for a page with no code module, the content's
 * own well-formed structure — see code-defaults.ts) and returns a value that:
 *   - has exactly the layout's blocks: same count and order, and per block the same `type`, `id`
 *     (incl. every fold anchor — the 301 contract), `cls`, `order`, NDC `variant`, tiles `minCol`, the
 *     tiles' bullet-or-paragraph style, the table's column count, and whether a split / fold / steps
 *     block has a photo. The variable parts are the words, links, photos + alts, and the LENGTH and
 *     ORDER of lists (tiles, bullets, steps, local items, table rows, FAQs, reviews 1–3, service cards);
 *   - has every string through the injected plain-text sanitiser, per field, inside every array. The
 *     copy's only markup is `[label](/href)`, which survives that rule untouched, so the output is the
 *     stored form;
 *   - carries no literal phone number (`{{phone}}` rule), no `tel:` link, no malformed link;
 *   - marks a service card `emergency` exactly when it links to the city's Emergency Plumbing page
 *     (it renders last, as the red call row) — derived, never typed.
 * `errors` lists what an editor must fix; the write path refuses on any error (422), the read path
 * falls back to the code module (or the legacy template) when the STRUCTURE no longer fits.
 */
import type { CsBlock, CsImage } from '@/lib/content/city-services-v2/types';
import {
  hasLiteralPhone,
  imageProblem,
  isObj,
  linkProblem,
  mdLinks,
  mdSyntaxProblem,
  PHONE_MESSAGE,
  type ConformIssue,
} from '@/lib/cms-v2/shared';
import type { CityServiceStored } from './model';

export interface ServiceChecks {
  plain(s: string): string;
  /** A city-service slug with a page (any city). */
  cityServiceExists(service: string): boolean;
}

export const SERVICE_CLIENT_CHECKS: ServiceChecks = { plain: (s) => s, cityServiceExists: () => true };

export interface ConformResult<T> {
  value: T;
  errors: ConformIssue[];
}

class Ctx {
  errors: ConformIssue[] = [];
  constructor(public c: ServiceChecks) {}
  err(path: string, kind: ConformIssue['kind'], message: string) {
    this.errors.push({ path, kind, message });
  }
  obj(v: unknown, path: string): Record<string, unknown> {
    if (isObj(v)) return v;
    this.err(path, 'structure', 'Expected a group of fields.');
    return {};
  }
  list(v: unknown, path: string, min = 0): unknown[] {
    if (!Array.isArray(v)) {
      this.err(path, 'structure', 'Expected a list.');
      return [];
    }
    if (v.length < min) this.err(path, 'structure', `This list needs at least ${min} item${min === 1 ? '' : 's'}.`);
    return v;
  }
  text(v: unknown, path: string, rich = false): string {
    if (typeof v !== 'string') {
      this.err(path, 'structure', 'Expected text.');
      return '';
    }
    const out = this.c.plain(v);
    if (hasLiteralPhone(out)) this.err(path, 'phone', PHONE_MESSAGE);
    if (rich) {
      const bad = mdSyntaxProblem(out);
      if (bad) this.err(path, 'link', bad);
      for (const l of mdLinks(out)) {
        const p = linkProblem(l.href);
        if (p) this.err(path, 'link', p);
      }
    } else if (/\[[^\]]*\]\([^)]*\)/.test(out)) {
      this.err(path, 'link', 'Links are not allowed in this field.');
    }
    return out;
  }
  rich(v: unknown, path: string) {
    return this.text(v, path, true);
  }
  image(v: unknown, path: string): CsImage {
    const o = this.obj(v, path);
    const src = this.text(o.src, `${path}.src`);
    if (src) {
      const p = imageProblem(src);
      if (p) this.err(`${path}.src`, 'image', p);
    }
    return { src, alt: this.text(o.alt, `${path}.alt`) };
  }
  /** An optional photo whose presence is part of the layout. */
  optImage(v: unknown, layout: CsImage | null, path: string): CsImage | null {
    if (layout === null) {
      if (v !== null && v !== undefined) this.err(path, 'structure', 'This section has no photo in its layout.');
      return null;
    }
    if (v === null || v === undefined) {
      this.err(path, 'structure', 'This section’s layout has a photo; choose one.');
      return { ...layout };
    }
    return this.image(v, path);
  }
}

const LOCKED_BLOCK_KEYS = ['type', 'id', 'cls', 'order'] as const;

function block(ctx: Ctx, raw: unknown, L: CsBlock, path: string, city: string): CsBlock {
  const o = ctx.obj(raw, path);
  for (const k of LOCKED_BLOCK_KEYS) {
    if (o[k] !== (L as unknown as Record<string, unknown>)[k]) {
      ctx.err(`${path}.${k}`, 'structure', `The section’s ${k} is part of the page layout and can’t change (expected "${(L as unknown as Record<string, unknown>)[k]}").`);
    }
  }
  const base = { id: L.id, cls: L.cls, order: L.order };
  const eb = () => ctx.text(o.eyebrow, `${path}.eyebrow`);
  const h2 = () => ctx.text(o.h2, `${path}.h2`);
  switch (L.type) {
    case 'split':
      return { type: 'split', ...base, eyebrow: eb(), h2: h2(), body: ctx.rich(o.body, `${path}.body`), img: ctx.optImage(o.img, L.img, `${path}.img`) };
    case 'fold':
      return {
        type: 'fold',
        ...base,
        eyebrow: eb(),
        h2: h2(),
        bodies: ctx.list(o.bodies, `${path}.bodies`, 1).map((t, i) => ctx.rich(t, `${path}.bodies[${i}]`)),
        img: ctx.optImage(o.img, L.img, `${path}.img`),
      };
    case 'tiles': {
      if (o.minCol !== L.minCol) ctx.err(`${path}.minCol`, 'structure', 'The tile grid is part of the page layout.');
      const bullets = !!L.tiles[0]?.bullets;
      return {
        type: 'tiles',
        ...base,
        eyebrow: eb(),
        h2: h2(),
        intro: ctx.rich(o.intro, `${path}.intro`),
        minCol: L.minCol,
        tiles: ctx.list(o.tiles, `${path}.tiles`, 1).map((t, i) => {
          const p = `${path}.tiles[${i}]`;
          const to = ctx.obj(t, p);
          const h3 = ctx.text(to.h3, `${p}.h3`);
          if (bullets) {
            if (!Array.isArray(to.bullets)) ctx.err(`${p}.bullets`, 'structure', 'These tiles are bullet lists.');
            return { h3, bullets: ctx.list(to.bullets, `${p}.bullets`, 1).map((x, j) => ctx.rich(x, `${p}.bullets[${j}]`)) };
          }
          if (Array.isArray(to.bullets)) ctx.err(`${p}.bullets`, 'structure', 'These tiles are paragraphs, not bullet lists.');
          return { h3, body: ctx.rich(to.body, `${p}.body`) };
        }),
        note: o.note === null || o.note === undefined || o.note === '' ? null : ctx.rich(o.note, `${path}.note`),
      };
    }
    case 'steps':
      return {
        type: 'steps',
        ...base,
        eyebrow: eb(),
        h2: h2(),
        intro: ctx.rich(o.intro, `${path}.intro`),
        steps: ctx.list(o.steps, `${path}.steps`, 1).map((s, i) => {
          const so = ctx.obj(s, `${path}.steps[${i}]`);
          return { h3: ctx.text(so.h3, `${path}.steps[${i}].h3`), body: ctx.rich(so.body, `${path}.steps[${i}].body`) };
        }),
        img: ctx.optImage(o.img, L.img, `${path}.img`),
      };
    case 'local': {
      let proof: { quote: string; name: string } | null = null;
      if (o.proof !== null && o.proof !== undefined) {
        const po = ctx.obj(o.proof, `${path}.proof`);
        proof = { quote: ctx.text(po.quote, `${path}.proof.quote`), name: ctx.text(po.name, `${path}.proof.name`) };
        if (!proof.quote.trim() && !proof.name.trim()) proof = null;
      }
      return {
        type: 'local',
        ...base,
        eyebrow: eb(),
        h2: h2(),
        intro: ctx.rich(o.intro, `${path}.intro`),
        items: ctx.list(o.items, `${path}.items`, 1).map((x, i) => {
          const xo = ctx.obj(x, `${path}.items[${i}]`);
          return { h3: ctx.text(xo.h3, `${path}.items[${i}].h3`), body: ctx.rich(xo.body, `${path}.items[${i}].body`) };
        }),
        proof,
      };
    }
    case 'table': {
      // The column count is content, not layout: Batch 1 already varies it per city for the same
      // service (e.g. tankless-water-heater has 3 columns in Northbrook, 4 in Naperville), and the view
      // renders any count with the same markup. Every row must match its own header.
      const head = ctx.list(o.head, `${path}.head`).map((h, i) => ctx.rich(h, `${path}.head[${i}]`));
      if (head.length < 2) ctx.err(`${path}.head`, 'structure', 'A table needs at least 2 columns.');
      return {
        type: 'table',
        ...base,
        eyebrow: eb(),
        h2: h2(),
        intro: ctx.rich(o.intro, `${path}.intro`),
        head,
        rows: ctx.list(o.rows, `${path}.rows`, 1).map((r, ri) => {
          const cells = ctx.list(r, `${path}.rows[${ri}]`).map((c, ci) => ctx.rich(c, `${path}.rows[${ri}][${ci}]`));
          if (cells.length !== head.length) ctx.err(`${path}.rows[${ri}]`, 'structure', `Each row needs ${head.length} cells, one per column.`);
          return cells;
        }),
        note: o.note === null || o.note === undefined || o.note === '' ? null : ctx.rich(o.note, `${path}.note`),
      };
    }
    case 'reviews': {
      const reviews = ctx.list(o.reviews, `${path}.reviews`, 1);
      if (reviews.length > 3) ctx.err(`${path}.reviews`, 'structure', 'This section shows at most 3 reviews.');
      return {
        type: 'reviews',
        ...base,
        eyebrow: eb(),
        h2: h2(),
        rating: ctx.text(o.rating, `${path}.rating`),
        reviews: reviews.slice(0, 3).map((r, i) => {
          const p = `${path}.reviews[${i}]`;
          const ro = ctx.obj(r, p);
          let url: string | null = null;
          if (ro.url !== null && ro.url !== undefined && ro.url !== '') {
            url = ctx.text(ro.url, `${p}.url`);
            if (url && !/^https:\/\/[^\s"<>]+$/i.test(url)) ctx.err(`${p}.url`, 'link', 'A review link must be a full https:// address.');
          }
          return { name: ctx.text(ro.name, `${p}.name`), url, text: ctx.text(ro.text, `${p}.text`) };
        }),
      };
    }
    case 'faq':
      return {
        type: 'faq',
        ...base,
        eyebrow: eb(),
        h2: h2(),
        items: ctx.list(o.items, `${path}.items`, 1).map((f, i) => {
          const p = `${path}.items[${i}]`;
          const fo = ctx.obj(f, p);
          return { q: ctx.text(fo.q, `${p}.q`), preview: ctx.rich(fo.preview, `${p}.preview`), answer: ctx.rich(fo.answer, `${p}.answer`) };
        }),
      };
    case 'ndc':
      if (o.variant !== L.variant) ctx.err(`${path}.variant`, 'structure', 'The No Drip Club variant is part of the page layout.');
      return { type: 'ndc', ...base, variant: L.variant };
    case 'services':
      return {
        type: 'services',
        ...base,
        eyebrow: eb(),
        h2: h2(),
        cards: ctx.list(o.cards, `${path}.cards`, 1).map((c, i) => {
          const p = `${path}.cards[${i}]`;
          const co = ctx.obj(c, p);
          const href = ctx.text(co.href, `${p}.href`);
          const m = href.match(/^\/([a-z0-9-]+)\/([a-z0-9-]+)$/);
          if (!m || m[1] !== city || !ctx.c.cityServiceExists(m[2])) {
            ctx.err(`${p}.href`, 'link', `A service card must link to one of this city’s service pages (/${city}/…).`);
          }
          return {
            title: ctx.text(co.title, `${p}.title`),
            href,
            desc: ctx.rich(co.desc, `${p}.desc`),
            img: ctx.image(co.img, `${p}.img`),
            emergency: !!m && m[2] === 'emergency-plumbing',
          };
        }),
      };
    case 'final':
      return { type: 'final', ...base, eyebrow: eb(), h2: h2(), body: ctx.rich(o.body, `${path}.body`), communities: ctx.rich(o.communities, `${path}.communities`) };
  }
}

/** `keys` first, in that order, then any other key in its existing order. */
function ordered(o: Record<string, unknown>, keys: readonly string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of keys) if (k in o) out[k] = o[k];
  for (const [k, v] of Object.entries(o)) if (!(k in out)) out[k] = v;
  return out;
}

/**
 * The Service JSON-LD in the key order production has always emitted. Postgres JSONB does not keep
 * object key order (it sorts keys), and the view serialises this object as-is, so a row read back
 * from the database would otherwise reorder the schema's keys. Fixed here, in the stored shape.
 */
export function canonicalServiceSchema(s: Record<string, unknown>): CityServiceStored['serviceSchema'] {
  const provider = isObj(s.provider) ? s.provider : {};
  const address = isObj(provider.address) ? provider.address : undefined;
  const p = ordered({ ...provider, ...(address ? { address: ordered(address, ['@type', 'streetAddress', 'addressLocality', 'addressRegion', 'postalCode', 'addressCountry']) } : {}) }, ['@type', 'name', 'telephone', 'url', 'address']);
  return ordered({ ...s, provider: p }, ['@context', '@type', 'name', 'serviceType', 'url', 'description', 'provider', 'areaServed']) as CityServiceStored['serviceSchema'];
}

/** One page's V2 content, locked to `layout` (see `pageLayout`). */
export function conformService(raw: unknown, layout: readonly CsBlock[], city: string, checks: ServiceChecks): ConformResult<CityServiceStored> {
  const ctx = new Ctx(checks);
  const r = ctx.obj(raw, '');
  const hero = ctx.obj(r.hero, 'hero');
  const trust = ctx.list(r.trust, 'trust').map((t, i) => ctx.text(t, `trust[${i}]`));
  if (trust.length !== 3) ctx.err('trust', 'structure', 'The trust rail has exactly 3 items.');
  const blocks = ctx.list(r.blocks, 'blocks');
  if (blocks.length !== layout.length) {
    ctx.err('blocks', 'structure', `This page’s layout has ${layout.length} sections (found ${blocks.length}).`);
  }
  const schema = ctx.obj(r.serviceSchema, 'serviceSchema');
  const provider = ctx.obj(schema.provider, 'serviceSchema.provider');
  const value: CityServiceStored = {
    schema: 1,
    hero: {
      crumb: ctx.text(hero.crumb, 'hero.crumb'),
      eyebrow: ctx.text(hero.eyebrow, 'hero.eyebrow'),
      h1: ctx.text(hero.h1, 'hero.h1'),
      sub: ctx.rich(hero.sub, 'hero.sub'),
      img: ctx.image(hero.img, 'hero.img'),
    },
    trust,
    blocks: layout.map((L, i) => block(ctx, blocks[i], L, `blocks[${i}]`, city)),
    serviceSchema: canonicalServiceSchema({ ...(schema as Record<string, unknown>), provider: { ...provider, telephone: '' } }),
  };
  for (const [k, v] of Object.entries(provider)) {
    if (typeof v === 'string' && hasLiteralPhone(v)) ctx.err(`serviceSchema.provider.${k}`, 'phone', PHONE_MESSAGE);
  }
  return { value, errors: ctx.errors };
}

export function conformServiceMeta(input: { metaTitle?: unknown; metaDescription?: unknown }, checks: ServiceChecks) {
  const ctx = new Ctx(checks);
  const metaTitle = ctx.text(input.metaTitle ?? '', 'metaTitle');
  const metaDescription = ctx.text(input.metaDescription ?? '', 'metaDescription');
  if (/\|\s*(?:J\.?\s*Blanton(?:\s+Plumbing)?|JBP)\s*$/i.test(metaTitle)) {
    ctx.err('metaTitle', 'value', 'Leave “| J. Blanton Plumbing” off the SEO title — the site adds it once, automatically.');
  }
  return { value: { metaTitle, metaDescription }, errors: ctx.errors };
}

export const structureBroken = (errors: readonly ConformIssue[]) => errors.some((e) => e.kind === 'structure');
