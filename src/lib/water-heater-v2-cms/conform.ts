/**
 * Brief 222 — the layout lock and per-field sanitising for water heater content (the Brief 204 rules).
 *
 * `conformWhPage` / `conformWhHub` take whatever arrived (an editor's save, a stored row) and the
 * page's CODE MODULE as the template, and return a value that has exactly the template's layout:
 * template version, section kinds and order, every section's class / id / mobile order, every tag,
 * class, inline style and locked attribute inside the panel trees (the sewer tree rules, reused
 * unchanged), the rail shape, the "On this page" targets and the catalog URLs. What varies: words,
 * links, images + alt, list items (reviews, FAQs, service rows, gallery photos, rotating market names,
 * table rows, bullets, trust items …), the Index pages' financing toggle and the optional review gallery.
 *
 * Every string goes through the injected sanitiser. A literal phone number is refused (use {{phone}}),
 * and so is a rating that is not Brief 221's company token (decision 0.1). `errors` → 422 on save; on
 * read, a STRUCTURE error renders the code module instead.
 */
import type { SewerFaq, SewerNode } from '@/lib/content/sewer-v2/types';
import type { WhGallery, WhHubStored, WhReview, WhSection, WhSharedContent, WhStored, WhTreeNode } from '@/lib/content/water-heater-v2/types';
import { hasLiteralPhone, imageProblem, linkProblem, PHONE_MESSAGE, type ConformIssue } from '@/lib/cms-v2/shared';
import { conformRichAnswer, conformTreeNode, type ConformResult, type Sanitizers } from '@/lib/sewer-v2-cms/conform';

export { describeIssues } from '@/lib/cms-v2/shared';

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Literal rating figures the package hard-coded (handoff §4) — only the Brief 221 tokens may say them. */
const RATING_LITERAL_RE = /(?<![\d.])(?:4\.7|5,?669)(?![\d])/;

class Ctx {
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
    if (RATING_LITERAL_RE.test(out)) this.err(path, 'value', 'Ratings come from Google automatically — use {{company_rating}} / {{company_review_count}}.');
    if (!opts.optional && t.trim() !== '' && out.trim() === '') this.err(path, 'empty', 'This field can’t be empty.');
    return out;
  }
  link(v: unknown, t: string, path: string, opts: { optional?: boolean } = {}): string {
    if (typeof v !== 'string') {
      this.err(path, 'structure', 'Expected a link.');
      return t;
    }
    const h = v.trim();
    if (opts.optional && h === '') return '';
    const p = linkProblem(h);
    if (p) this.err(path, p === PHONE_MESSAGE ? 'phone' : 'link', p);
    return h;
  }
  image(v: unknown, t: string, path: string): string {
    if (typeof v !== 'string') {
      this.err(path, 'structure', 'Expected an image.');
      return t;
    }
    const p = imageProblem(v);
    if (p) this.err(path, 'image', p);
    return v.trim();
  }
  locked<T>(v: unknown, t: T, path: string): T {
    if (v !== undefined && !same(v, t)) this.err(path, 'structure', 'This value is part of the layout and can’t change.');
    return t;
  }
  list<T>(v: unknown, path: string, each: (item: unknown, i: number) => T, opts: { min?: number; max?: number } = {}): T[] | null {
    if (!Array.isArray(v)) {
      this.err(path, 'structure', 'Expected a list.');
      return null;
    }
    const min = opts.min ?? 1;
    if (v.length < min) {
      this.err(path, 'empty', min === 1 ? 'A list needs at least one item.' : `This list needs at least ${min} items.`);
      return null;
    }
    if (opts.max !== undefined && v.length > opts.max) {
      this.err(path, 'value', `This list can hold at most ${opts.max} items.`);
      return null;
    }
    return v.map(each);
  }
  tree(v: unknown, t: WhTreeNode, path: string): WhTreeNode {
    // The sewer tree rules compare icons by name only, so a water heater icon name passes through as is.
    const r = conformTreeNode(v, t as unknown as SewerNode, this.s, path);
    this.errors.push(...r.errors);
    // The tree rules check phones, links and images; the rating rule is this template's own.
    const walk = (n: unknown, p: string): void => {
      if (typeof n === 'string') {
        if (RATING_LITERAL_RE.test(n)) this.err(p, 'value', 'Ratings come from Google automatically — use {{company_rating}} / {{company_review_count}}.');
      } else if (Array.isArray(n)) n.forEach((x, i) => walk(x, `${p}[${i}]`));
      else if (isObj(n)) for (const [k, x] of Object.entries(n)) walk(x, `${p}.${k}`);
    };
    walk(r.value, path);
    return r.value as unknown as WhTreeNode;
  }
  rich(v: unknown, t: string | SewerNode[], path: string): string | SewerNode[] {
    const r = conformRichAnswer(v, t, this.s, path);
    this.errors.push(...r.errors);
    return r.value;
  }
}

// ── sections ──────────────────────────────────────────────────────────────────────

function review(ctx: Ctx, v: unknown, t: WhReview, path: string): WhReview {
  const o = isObj(v) ? v : {};
  const href = ctx.link(o.href ?? '', '', `${path}.href`, { optional: true });
  if (href && !/^https:\/\//.test(href)) ctx.err(`${path}.href`, 'link', 'A reviewer link must be the full https:// address of the Google review (or blank).');
  return {
    quote: ctx.text(o.quote, t.quote, `${path}.quote`),
    name: ctx.text(o.name, t.name, `${path}.name`),
    location: ctx.text(o.location ?? '', t.location, `${path}.location`, { optional: true }),
    href,
  };
}

function faqItem(ctx: Ctx, v: unknown, t: SewerFaq, path: string): SewerFaq {
  const o = isObj(v) ? v : {};
  return { q: ctx.text(o.q, t.q, `${path}.q`), preview: ctx.rich(o.preview, t.preview, `${path}.preview`), full: ctx.rich(o.full, t.full, `${path}.full`) };
}

function section(ctx: Ctx, v: unknown, t: WhSection, path: string): WhSection {
  if (!isObj(v) || v.kind !== t.kind) {
    ctx.err(path, 'structure', 'Sections can’t be added, removed or reordered.');
    return t;
  }
  switch (t.kind) {
    case 'panel':
      return { kind: 'panel', el: ctx.tree(v.el, t.el, `${path}.el`) };
    case 'reviews': {
      ctx.locked(v.layout, t.layout, `${path}.layout`);
      ctx.locked(v.cls, t.cls, `${path}.cls`);
      ctx.locked(v.style, t.style, `${path}.style`);
      const items = ctx.list(v.items, `${path}.items`, (it, i) => review(ctx, it, t.items[Math.min(i, t.items.length - 1)], `${path}.items[${i}]`)) ?? t.items;
      let gallery: WhGallery | null = null;
      if (v.gallery !== null && v.gallery !== undefined) {
        if (t.layout === 'hub') ctx.err(`${path}.gallery`, 'structure', 'The hub reviews have no photo gallery.');
        else if (!isObj(v.gallery)) ctx.err(`${path}.gallery`, 'structure', 'Layout mismatch.');
        else {
          const tg = t.gallery ?? { label: '', photos: [{ src: '', alt: '' }] };
          const photos =
            ctx.list(v.gallery.photos, `${path}.gallery.photos`, (p, i) => {
              const po = isObj(p) ? p : {};
              return { src: ctx.image(po.src, '', `${path}.gallery.photos[${i}].src`), alt: ctx.text(po.alt, 'x', `${path}.gallery.photos[${i}].alt`) };
            }, { min: 2, max: 12 }) ?? tg.photos;
          gallery = { label: ctx.text(v.gallery.label, 'x', `${path}.gallery.label`), photos };
        }
      }
      return { kind: 'reviews', layout: t.layout, cls: t.cls, style: t.style, eyebrow: ctx.text(v.eyebrow, t.eyebrow, `${path}.eyebrow`), heading: ctx.text(v.heading, t.heading, `${path}.heading`), items, gallery };
    }
    case 'faq': {
      ctx.locked(v.layout, t.layout, `${path}.layout`);
      ctx.locked(v.cls, t.cls, `${path}.cls`);
      ctx.locked(v.style, t.style, `${path}.style`);
      const items = ctx.list(v.items, `${path}.items`, (it, i) => faqItem(ctx, it, t.items[Math.min(i, t.items.length - 1)], `${path}.items[${i}]`)) ?? t.items;
      return { kind: 'faq', layout: t.layout, cls: t.cls, style: t.style, eyebrow: ctx.text(v.eyebrow, t.eyebrow, `${path}.eyebrow`), heading: ctx.text(v.heading, t.heading, `${path}.heading`), items };
    }
    case 'services': {
      ctx.locked(v.cls, t.cls, `${path}.cls`);
      ctx.locked(v.style, t.style, `${path}.style`);
      const items =
        ctx.list(v.items, `${path}.items`, (it, i) => {
          const o = isObj(it) ? it : {};
          const tt = t.items[Math.min(i, t.items.length - 1)];
          const p = `${path}.items[${i}]`;
          return { title: ctx.text(o.title, tt.title, `${p}.title`), desc: ctx.text(o.desc, tt.desc, `${p}.desc`), image: ctx.image(o.image, tt.image, `${p}.image`), alt: ctx.text(o.alt, tt.alt, `${p}.alt`), href: ctx.link(o.href, tt.href, `${p}.href`) };
        }) ?? t.items;
      const e = isObj(v.emergency) ? v.emergency : {};
      const te = t.emergency;
      const p = `${path}.emergency`;
      return {
        kind: 'services',
        cls: t.cls,
        style: t.style,
        eyebrow: ctx.text(v.eyebrow, t.eyebrow, `${path}.eyebrow`),
        heading: ctx.text(v.heading, t.heading, `${path}.heading`),
        items,
        emergency: { title: ctx.text(e.title, te.title, `${p}.title`), desc: ctx.text(e.desc, te.desc, `${p}.desc`), image: ctx.image(e.image, te.image, `${p}.image`), alt: ctx.text(e.alt, te.alt, `${p}.alt`), cta: ctx.text(e.cta, te.cta, `${p}.cta`) },
      };
    }
    case 'financing':
      ctx.locked(v.style, t.style, `${path}.style`);
      if (typeof v.enabled !== 'boolean') ctx.err(`${path}.enabled`, 'structure', 'Expected on or off.');
      return { kind: 'financing', style: t.style, enabled: typeof v.enabled === 'boolean' ? v.enabled : t.enabled };
  }
}

// ── page ──────────────────────────────────────────────────────────────────────────

function page(ctx: Ctx, input: unknown, code: WhStored): WhStored {
  const v = isObj(input) ? input : {};
  if (!isObj(input)) ctx.err('', 'structure', 'Missing page content.');
  ctx.locked(v.template, code.template, 'template');
  const h = isObj(v.hero) ? v.hero : {};
  const th = code.hero;
  const hi = isObj(h.image) ? h.image : {};
  const words = ctx.list(h.words, 'hero.words', (w, i) => ctx.text(w, 'x', `hero.words[${i}]`), { min: 1, max: 4 }) ?? th.words;
  const hero = {
    crumb: code.template === 'wh-hub' ? '' : ctx.text(h.crumb, th.crumb, 'hero.crumb'),
    eyebrow: ctx.text(h.eyebrow, th.eyebrow, 'hero.eyebrow'),
    h1: ctx.text(h.h1, th.h1, 'hero.h1'),
    lead: ctx.text(h.lead, th.lead, 'hero.lead'),
    words,
    intro: ctx.text(h.intro, th.intro, 'hero.intro'),
    image: { src: ctx.image(hi.src, th.image.src, 'hero.image.src'), alt: ctx.text(hi.alt, th.image.alt, 'hero.image.alt') },
  };
  const sectionsIn = Array.isArray(v.sections) ? v.sections : [];
  if (sectionsIn.length !== code.sections.length) ctx.err('sections', 'structure', 'Sections can’t be added, removed or reordered.');
  const sections = code.sections.map((t, i) => section(ctx, sectionsIn[i], t, `sections[${i}]`));

  let rail: WhStored['rail'] = null;
  if (code.rail) {
    const r = isObj(v.rail) ? v.rail : {};
    ctx.locked(r.financingOrder, code.rail.financingOrder, 'rail.financingOrder');
    let toc = code.rail.toc;
    if (code.rail.toc) {
      const tt = code.rail.toc;
      const ti = isObj(r.toc) ? r.toc : {};
      const items = Array.isArray(ti.items) ? ti.items : [];
      if (items.length !== tt.items.length) ctx.err('rail.toc.items', 'structure', 'The “On this page” links follow the page’s sections and can’t be added or removed.');
      toc = {
        label: ctx.text(ti.label, tt.label, 'rail.toc.label'),
        items: tt.items.map((it, i) => {
          const o = isObj(items[i]) ? items[i] : {};
          ctx.locked((o as Record<string, unknown>).href, it.href, `rail.toc.items[${i}].href`);
          return { href: it.href, label: ctx.text((o as Record<string, unknown>).label, it.label, `rail.toc.items[${i}].label`) };
        }),
      };
    } else if (r.toc !== null && r.toc !== undefined) ctx.err('rail.toc', 'structure', 'This page has no “On this page” index.');
    rail = { trust: ctx.tree(r.trust, code.rail.trust, 'rail.trust'), financingOrder: code.rail.financingOrder, toc };
  } else if (v.rail !== null && v.rail !== undefined) ctx.err('rail', 'structure', 'This page has no rail.');

  const sv = isObj(v.service) ? v.service : {};
  const ts = code.service;
  let catalog = ts.catalog;
  if (ts.catalog) {
    const tc = ts.catalog;
    const ci = isObj(sv.catalog) ? sv.catalog : {};
    const items = Array.isArray(ci.items) ? ci.items : [];
    if (items.length !== tc.items.length) ctx.err('service.catalog.items', 'structure', 'The catalog lists the page’s own services and can’t be added to or shortened.');
    catalog = {
      name: ctx.text(ci.name, tc.name, 'service.catalog.name'),
      items: tc.items.map((it, i) => {
        const o = isObj(items[i]) ? (items[i] as Record<string, unknown>) : {};
        ctx.locked(o.url, it.url, `service.catalog.items[${i}].url`);
        return { name: ctx.text(o.name, it.name, `service.catalog.items[${i}].name`), url: it.url };
      }),
    };
  }
  const service = {
    name: ctx.text(sv.name, ts.name, 'service.name'),
    serviceType: ctx.text(sv.serviceType, ts.serviceType, 'service.serviceType'),
    description: ctx.text(sv.description, ts.description, 'service.description'),
    audienceType: ctx.text(sv.audienceType, ts.audienceType, 'service.audienceType'),
    catalog,
  };
  return { schema: 1, template: code.template, hero, sections, rail, service };
}

const COMPANY_RATING = '{{company_rating}}';
const COMPANY_COUNT = '{{company_review_count}}';

function shared(ctx: Ctx, input: unknown, t: WhSharedContent): WhSharedContent {
  const v = isObj(input) ? input : {};
  const o = (k: string) => (isObj(v[k]) ? (v[k] as Record<string, unknown>) : {});
  const q = o('quickLinks');
  const links =
    ctx.list(q.links, 'shared.quickLinks.links', (l, i) => {
      const lo = isObj(l) ? l : {};
      const tl = t.quickLinks.links[Math.min(i, t.quickLinks.links.length - 1)];
      return { href: ctx.link(lo.href, tl.href, `shared.quickLinks.links[${i}].href`), label: ctx.text(lo.label, tl.label, `shared.quickLinks.links[${i}].label`) };
    }) ?? t.quickLinks.links;
  const cp = o('crumbParent');
  const call = o('call');
  const fin = o('financing');
  const st = o('sticky');
  const pr = o('proof');
  const bbb = isObj(pr.bbb) ? pr.bbb : {};
  const rv = o('review');
  // Decision 0.1: the rating card shows the synced company figures and nothing else.
  const proofText = (val: unknown, tv: string, path: string, token: string) => {
    const out = ctx.s.plain(typeof val === 'string' ? val : tv);
    if (!out.includes(token)) ctx.err(path, 'value', `This must contain ${token} — the rating comes from Google automatically.`);
    if (/\{\{\s*office_/.test(out)) ctx.err(path, 'value', 'These pages show the company rating: use {{company_rating}} / {{company_review_count}}.');
    // "out of 5 stars" is fine; a decimal or a multi-digit number is a typed rating / count.
    if (/\d[.,]\d|\d{2,}/.test(out.split(COMPANY_RATING).join('').split(COMPANY_COUNT).join(''))) ctx.err(path, 'value', 'Type the rating as a token, never as a number.');
    return out;
  };
  return {
    badge24Label: ctx.text(v.badge24Label, t.badge24Label, 'shared.badge24Label'),
    quickLinks: { ariaLabel: ctx.text(q.ariaLabel, t.quickLinks.ariaLabel, 'shared.quickLinks.ariaLabel'), links },
    crumbParent: { label: ctx.text(cp.label, t.crumbParent.label, 'shared.crumbParent.label'), href: ctx.locked(cp.href, t.crumbParent.href, 'shared.crumbParent.href') },
    call: { heading: ctx.text(call.heading, t.call.heading, 'shared.call.heading'), body: ctx.text(call.body, t.call.body, 'shared.call.body'), cta: ctx.text(call.cta, t.call.cta, 'shared.call.cta') },
    financing: {
      eyebrow: ctx.text(fin.eyebrow, t.financing.eyebrow, 'shared.financing.eyebrow'),
      heading: ctx.text(fin.heading, t.financing.heading, 'shared.financing.heading'),
      body: ctx.text(fin.body, t.financing.body, 'shared.financing.body'),
      note: ctx.text(fin.note, t.financing.note, 'shared.financing.note'),
      cta: ctx.text(fin.cta, t.financing.cta, 'shared.financing.cta'),
      image: ctx.image(fin.image, t.financing.image, 'shared.financing.image'),
      alt: ctx.text(fin.alt, t.financing.alt, 'shared.financing.alt'),
    },
    sticky: { title: ctx.text(st.title, t.sticky.title, 'shared.sticky.title'), sub: ctx.text(st.sub, t.sticky.sub, 'shared.sticky.sub'), cta: ctx.text(st.cta, t.sticky.cta, 'shared.sticky.cta'), ariaLabel: ctx.text(st.ariaLabel, t.sticky.ariaLabel, 'shared.sticky.ariaLabel') },
    proof: {
      ariaLabel: ctx.text(pr.ariaLabel, t.proof.ariaLabel, 'shared.proof.ariaLabel'),
      rating: (() => {
        const r = ctx.s.plain(typeof pr.rating === 'string' ? pr.rating : t.proof.rating).trim();
        if (r !== COMPANY_RATING) ctx.err('shared.proof.rating', 'value', `The big number is always ${COMPANY_RATING}.`);
        return COMPANY_RATING;
      })(),
      starsLabel: proofText(pr.starsLabel, t.proof.starsLabel, 'shared.proof.starsLabel', COMPANY_RATING),
      sub: proofText(pr.sub, t.proof.sub, 'shared.proof.sub', COMPANY_COUNT),
      bbb: { href: ctx.link(bbb.href, t.proof.bbb.href, 'shared.proof.bbb.href'), seal: ctx.image(bbb.seal, t.proof.bbb.seal, 'shared.proof.bbb.seal'), sealAlt: ctx.text(bbb.sealAlt, t.proof.bbb.sealAlt, 'shared.proof.bbb.sealAlt'), label: ctx.text(bbb.label, t.proof.bbb.label, 'shared.proof.bbb.label') },
    },
    review: { stars: ctx.text(rv.stars, t.review.stars, 'shared.review.stars'), starsLabel: ctx.text(rv.starsLabel, t.review.starsLabel, 'shared.review.starsLabel'), caption: ctx.text(rv.caption, t.review.caption, 'shared.review.caption') },
  };
}

// ── entry points ──────────────────────────────────────────────────────────────────

export function conformWhPage(input: unknown, code: WhStored, s: Sanitizers): ConformResult<WhStored> {
  const ctx = new Ctx(s);
  const value = page(ctx, input, code);
  return { value, errors: ctx.errors };
}

export function conformWhHub(input: unknown, code: WhHubStored, s: Sanitizers): ConformResult<WhHubStored> {
  const ctx = new Ctx(s);
  const body = page(ctx, input, code);
  const sh = shared(ctx, isObj(input) ? input.shared : undefined, code.shared);
  return { value: { ...body, shared: sh }, errors: ctx.errors };
}

export function conformWhMeta(input: { metaTitle?: unknown; metaDescription?: unknown }, code: { title: string; description: string }, s: Sanitizers) {
  const ctx = new Ctx(s);
  return { value: { metaTitle: ctx.text(input.metaTitle, code.title, 'metaTitle'), metaDescription: ctx.text(input.metaDescription, code.description, 'metaDescription') }, errors: ctx.errors };
}
