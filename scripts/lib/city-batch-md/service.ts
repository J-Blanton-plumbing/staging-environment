/**
 * Brief 212 (Track C2) — one City Service MD → `CityServiceV2DraftContent`, using the Brief 209
 * mapping (its report §1 "Method"), with Brief 216's per-page layouts (Marketing decision 3: "Batch 3
 * keeps every section"):
 *   - the page's LAYOUT is the MD's own block sequence (`buildLayout`). Each MD section is matched to
 *     the TEMPLATE (`serviceLayout`: the city's code module, or Northbrook's): a fold by its
 *     `(anchor #x)`, wherever it sits; the other blocks by type, in order (longest common
 *     subsequence). A matched block takes the template block's `cls`, photo + alt, tiles grid and
 *     NDC variant and its id (city slug swapped in). An EXTRA block (no template counterpart) must be a
 *     split, steps or tiles section; it gets the plain panel class, no photo and an id from its MD
 *     heading. `order` is the position (10, 20, …). For every Batch 1–2 MD this reproduces the
 *     template exactly (their sequences equal it);
 *   - Hero image + alt come from the layout page (the MD's `assets/*.jpg` is ignored, Brief 209 §2.3).
 *   - Service cards: title/href/desc from the MD; image/alt = the target slug's V2 hero; Emergency
 *     Plumbing is the red call row (derived from the href by conform).
 *   - Local `proof`: null unless the MD supplies a "Proof quote".
 *   - Not rendered: `> Replaces …` notes, LOCAL DATA, the FAQPage / BreadcrumbList schema blocks.
 * Copy is taken verbatim (after the corrections file is applied to the raw text).
 */
import type { CsBlock, CsImage } from '../../../src/lib/content/city-services-v2/types';
import { CITY_SERVICE_V2_TEMPLATE, stripTitleTail, type CityServiceV2DraftContent } from '../../../src/lib/city-service-v2-cms/model';
import { DEFAULT_BLOCK_CLS, EXTRA_BLOCK_TYPES, heroImageFor, layoutPage, layoutProblems, serviceLayout } from '../../../src/lib/city-service-v2-cms/code-defaults';
import { clone } from '../../../src/lib/cms-v2/shared';
import { getCityServiceV2 } from '../../../src/lib/content/city-services-v2';
import { field, fields, jsonBlocks, links, sections, stripCount, tables, unbold, type Section } from './md';

export interface ParsedService {
  draft: CityServiceV2DraftContent;
  /** Visible FAQ (q, plain answer) and the MD's own FAQPage schema text, for the C4 equality gate. */
  faqVisible: Array<{ q: string; a: string }>;
  faqSchema: Array<{ q: string; a: string }>;
  /** The MD's Service schema (for the report: what the derived one replaces). */
  mdServiceSchema: Record<string, unknown> | null;
  ndcVariantMd: string | null;
  /** Brief 216 C1: the page's layout as built from the MD (what the CMS locks it to once live). */
  layout: CsBlock[];
  /** Brief 216 C1: MD sections with no template counterpart (headings), and template sections the MD lacks. */
  extras: string[];
  dropped: string[];
  /** Brief 216 G2: every review quote the cleaner changed (before → after). */
  g2: Array<{ before: string; after: string }>;
  errors: string[];
}

type Kind = CsBlock['type'];

export function kindOf(title: string): Kind | null {
  if (/\(split\)\s*$/i.test(title)) return 'split';
  if (/^FOLDED SECTION/i.test(title)) return 'fold';
  if (/^LOCAL KNOWLEDGE/i.test(title)) return 'local';
  if (/\(steps\)\s*$/i.test(title)) return 'steps';
  if (/\(tiles\)\s*$/i.test(title)) return 'tiles';
  if (/\(table\)\s*$/i.test(title)) return 'table';
  if (/^REVIEWS\b/i.test(title)) return 'reviews';
  if (/^FAQ\b/i.test(title)) return 'faq';
  if (/^NO DRIP CLUB\b/i.test(title)) return 'ndc';
  if (/^SERVICES\b/i.test(title)) return 'services';
  if (/^FINAL CTA\b/i.test(title)) return 'final';
  return null;
}

/** "H3 1" → 1; rows like "H3 2 Body" / "Tile 3 H3" / "Review 1 Name" / "Body 2". */
function numbered(rows: Array<[string, string]>, re: RegExp): Map<number, string> {
  const out = new Map<number, string>();
  for (const [k, v] of rows) {
    const m = k.match(re);
    if (m) out.set(Number(m[1]), v);
  }
  return out;
}
const ordered = (m: Map<number, string>) => [...m.keys()].sort((a, b) => a - b).map((k) => m.get(k) as string);

const proofRe = /^"([\s\S]+)"\s*\(([^)]+)\)\s*$/;

const G2_ATTR = '(?:Responsiveness|Punctuality|Quality|Professionalism|Value)';
/**
 * Brief 216 G2 — the scraped Google UI text at the end of a review quote (none of it is customer
 * text), stripped in this order: a trailing "📸 N photo(s)"; a trailing "Show business response"; then,
 * only if that removed something, a trailing "Services <list>" tag; and the "Positive …" attribute
 * string. Whitespace trimmed, nothing else changed — typos and spacing stay the customer's own.
 */
export function cleanReviewText(text: string): string {
  let t = text.replace(/\s*📸 \d+ photos?\s*$/u, '');
  const beforeSbr = t;
  t = t.replace(/\s*Show business response\s*$/, '');
  if (t !== beforeSbr) t = t.replace(/\s+Services [^.!?]*$/, '');
  t = t.replace(new RegExp(`\\s*Positive ${G2_ATTR}(?:, ${G2_ATTR})*`, 'g'), '');
  return t.trim();
}

/** "WHEN TO CALL AN EVANSTON DRAIN PLUMBER (split)" → "when-to-call-an-evanston-drain-plumber". */
const headingId = (title: string) =>
  title.replace(/\([^)]*\)\s*$/, '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** An extra tiles section's grid: the template's usual one (24 of Northbrook's 27 tile grids are 340). */
const EXTRA_TILES_MIN_COL = 340;

/** Longest common subsequence of two type lists → matched index pairs, in order. */
function lcsPairs(a: string[], b: string[]): Array<[number, number]> {
  const n = a.length, m = b.length;
  const L = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out: Array<[number, number]> = [];
  for (let i = 0, j = 0; i < n && j < m; ) {
    if (a[i] === b[j]) {
      out.push([i, j]);
      i++;
      j++;
    } else if (L[i + 1][j] >= L[i][j + 1]) i++;
    else j++;
  }
  return out;
}

/**
 * Brief 216 C1 — the page's layout from its MD sections (see the header). `mdKinds[i]` is the block
 * type of `mdSecs[i]`. Never silent: an unmatched fold anchor, an extra block of a type the view can't
 * add, duplicate ids or a layout `layoutProblems` rejects is an error.
 */
export function buildLayout(
  mdSecs: Section[],
  mdKinds: Array<CsBlock['type']>,
  tpl: CsBlock[],
  service: string
): { layout: CsBlock[]; extras: string[]; dropped: string[]; errors: string[] } {
  const errors: string[] = [];
  const match = new Array<number>(mdSecs.length).fill(-1);
  // Folds: by anchor, wherever they sit (Evanston and Hanover Park drain-cleaning reorder them).
  mdSecs.forEach((s, i) => {
    if (mdKinds[i] !== 'fold') return;
    const anchor = (s.title.match(/\(anchor #([a-z0-9-]+)\)/) ?? [])[1];
    const j = tpl.findIndex((b) => b.type === 'fold' && b.id === anchor);
    if (j < 0) errors.push(`${s.heading}: anchor #${anchor} is not one of this service's fold anchors (${tpl.filter((b) => b.type === 'fold').map((b) => '#' + b.id).join(', ') || 'none'})`);
    else match[i] = j;
  });
  // Everything else: by type, in order.
  const mi = mdKinds.map((k, i) => (k === 'fold' ? -1 : i)).filter((i) => i >= 0);
  const ti = tpl.map((b, j) => (b.type === 'fold' ? -1 : j)).filter((j) => j >= 0);
  for (const [a, b] of lcsPairs(mi.map((i) => mdKinds[i]), ti.map((j) => tpl[j].type))) match[mi[a]] = ti[b];
  const taken = new Set(match.filter((j) => j >= 0).map((j) => tpl[j].id));
  const extras: string[] = [];
  const layout = mdSecs.map((s, i): CsBlock => {
    const order = (i + 1) * 10;
    if (match[i] >= 0) return { ...clone(tpl[match[i]]), order } as CsBlock;
    const type = mdKinds[i];
    extras.push(s.heading);
    if (!EXTRA_BLOCK_TYPES.has(type)) errors.push(`${s.heading}: an extra "${type}" section has no template counterpart and can't be rendered with the existing markup (only split, steps and tiles can be added)`);
    let id = headingId(s.title) || `section-${i + 1}`;
    while (taken.has(id)) id = `${id}-${i + 1}`;
    taken.add(id);
    const base = { id, cls: DEFAULT_BLOCK_CLS, order };
    if (type === 'tiles') {
      const bullets = fields(s.body).some(([k, v]) => /^Tile \d+ Body$/.test(k) && /(^|\s)•\s|\s\/\s/.test(v));
      return { type: 'tiles', ...base, eyebrow: '', h2: '', intro: '', minCol: EXTRA_TILES_MIN_COL, tiles: [bullets ? { h3: '', bullets: [''] } : { h3: '', body: '' }], note: null };
    }
    if (type === 'steps') return { type: 'steps', ...base, eyebrow: '', h2: '', intro: '', steps: [], img: null };
    return { type: 'split', ...base, eyebrow: '', h2: '', body: '', img: null };
  });
  const dropped = tpl.filter((_, j) => !match.includes(j)).map((b) => `${b.type}#${b.id}`);
  for (const p of layoutProblems(layout, service)) errors.push(`layout: ${p}`);
  return { layout, extras, dropped, errors };
}

export function parseService(md: string, city: string, service: string, opts: { removeReviews?: string[] } = {}): ParsedService {
  const errors: string[] = [];
  const template = serviceLayout(city, service);
  // The page's own code module when it has one (Batch 1 self-test), else the layout city's.
  const tpl = getCityServiceV2(city, service) ?? layoutPage(service);
  if (!template || !tpl) {
    return { draft: null as unknown as CityServiceV2DraftContent, faqVisible: [], faqSchema: [], mdServiceSchema: null, ndcVariantMd: null, layout: [], extras: [], dropped: [], g2: [], errors: [`no City Service V2 layout for "${service}"`] };
  }
  const secs = sections(md);
  const byTitle = (t: RegExp) => secs.find((s) => t.test(s.title));
  const meta = fields(byTitle(/^META DATA$/)?.body ?? '');
  const metaTitle = stripTitleTail(stripCount(field(meta, 'Title tag') ?? ''));
  const metaDescription = stripCount(field(meta, 'Meta description') ?? '');
  if (!metaTitle) errors.push('META: no Title tag');
  if (!metaDescription) errors.push('META: no Meta description');

  const hero = fields(byTitle(/^HERO$/)?.body ?? '');
  const crumbRaw = field(hero, 'Breadcrumb') ?? '';
  const crumb = crumbRaw.includes(' / ') ? crumbRaw.slice(crumbRaw.lastIndexOf(' / ') + 3).trim() : crumbRaw.trim();
  const trustRows = fields(byTitle(/^TRUST RAIL$/)?.body ?? '');
  const trust = trustRows.filter(([k]) => /^\d+$/.test(k)).map(([, v]) => v);

  const body = secs.filter((s) => s.num && Number(s.num) >= 3);
  const kinds = body.map((s) => kindOf(s.title));
  const unknown = body.filter((_, i) => kinds[i] === null).map((s) => s.heading);
  if (unknown.length) errors.push(`sections the template has no block for: ${unknown.join(' · ')}`);
  let faqVisible: Array<{ q: string; a: string }> = [];
  let ndcVariantMd: string | null = null;
  const blocks: CsBlock[] = [];
  const g2: Array<{ before: string; after: string }> = [];
  const mdBlocks = body.filter((_, i) => kinds[i] !== null);
  const built = buildLayout(mdBlocks, kinds.filter(Boolean) as Array<CsBlock['type']>, template, service);
  errors.push(...built.errors);
  const layout = built.layout;
  layout.forEach((L, i) => {
    const s: Section | undefined = mdBlocks[i];
    if (!s || kindOf(s.title) !== L.type) return;
    const f = fields(s.body);
    const get = (label: string) => {
      const v = field(f, label);
      if (v === undefined) errors.push(`${s.heading}: no "${label}" row`);
      return v ?? '';
    };
    const base = { id: L.id, cls: L.cls, order: L.order };
    switch (L.type) {
      case 'split':
        blocks.push({ type: 'split', ...base, eyebrow: get('Eyebrow'), h2: get('H2'), body: get('Body'), img: L.img ? { ...L.img } : null });
        break;
      case 'fold': {
        const anchor = (s.title.match(/\(anchor #([a-z0-9-]+)\)/) ?? [])[1];
        if (anchor !== L.id) errors.push(`${s.heading}: anchor #${anchor} ≠ the layout's #${L.id}`);
        blocks.push({ type: 'fold', ...base, eyebrow: get('Eyebrow'), h2: get('H2'), bodies: ordered(numbered(f, /^Body (\d+)$/)), img: L.img ? { ...L.img } : null });
        break;
      }
      case 'tiles': {
        const h3 = numbered(f, /^Tile (\d+) H3$/);
        const bd = numbered(f, /^Tile (\d+) Body$/);
        const bullets = !!L.tiles[0]?.bullets;
        const tiles = [...h3.keys()].sort((a, b) => a - b).map((n) => {
          const t = bd.get(n) ?? '';
          return bullets ? { h3: h3.get(n) as string, bullets: t.split(/\s+\/\s+/).map((x) => x.replace(/^•\s*/, '').trim()).filter(Boolean) } : { h3: h3.get(n) as string, body: t };
        });
        const note = field(f, 'Note');
        blocks.push({ type: 'tiles', ...base, eyebrow: get('Eyebrow'), h2: get('H2'), intro: get('Intro'), minCol: L.minCol, tiles, note: note ? note : null });
        break;
      }
      case 'steps': {
        const h3 = numbered(f, /^H3 (\d+)$/);
        const bd = numbered(f, /^H3 (\d+) Body$/);
        blocks.push({
          type: 'steps', ...base, eyebrow: get('Eyebrow'), h2: get('H2'), intro: get('Intro'),
          steps: [...h3.keys()].sort((a, b) => a - b).map((n) => ({ h3: h3.get(n) as string, body: bd.get(n) ?? '' })),
          img: L.img ? { ...L.img } : null,
        });
        break;
      }
      case 'local': {
        const h3 = numbered(f, /^H3 (\d+)$/);
        const bd = numbered(f, /^H3 (\d+) Body$/);
        const pq = field(f, 'Proof quote');
        let proof: { quote: string; name: string } | null = null;
        if (pq) {
          const m = pq.match(proofRe);
          if (m) proof = { quote: m[1], name: m[2] };
          else errors.push(`${s.heading}: Proof quote is not "quote" (Name)`);
        }
        blocks.push({
          type: 'local', ...base, eyebrow: get('Eyebrow'), h2: get('H2'), intro: get('Intro'),
          items: [...h3.keys()].sort((a, b) => a - b).map((n) => ({ h3: h3.get(n) as string, body: bd.get(n) ?? '' })),
          proof,
        });
        break;
      }
      case 'table': {
        const data = tables(s.body).find((t) => !(t.head.length === 2 && /^field$/i.test(t.head[0])));
        if (!data) errors.push(`${s.heading}: no data table`);
        const noteLine = s.body.split('\n').find((l) => /^\*Note:\*/.test(l.trim()));
        blocks.push({
          type: 'table', ...base, eyebrow: get('Eyebrow'), h2: get('H2'), intro: get('Intro'),
          head: data?.head ?? [], rows: data?.rows ?? [],
          note: noteLine ? noteLine.trim().replace(/^\*Note:\*\s*/, '') : null,
        });
        break;
      }
      case 'reviews': {
        const names = numbered(f, /^Review (\d+) Name$/);
        const urls = numbered(f, /^Review (\d+) GBP URL$/);
        const texts = numbered(f, /^Review (\d+) Text$/);
        let reviews = [...names.keys()].sort((a, b) => a - b).map((n) => {
          const u = (urls.get(n) ?? '').trim();
          const raw = texts.get(n) ?? '';
          const text = cleanReviewText(raw); // Brief 216 G2
          if (text !== raw) g2.push({ before: raw, after: text });
          return { name: names.get(n) as string, url: !u || /^\(none\)$/i.test(u) ? null : u, text };
        });
        for (const rm of opts.removeReviews ?? []) {
          if (!reviews.some((r) => r.name === rm)) errors.push(`review removal: "${rm}" is not on this page`);
          reviews = reviews.filter((r) => r.name !== rm);
        }
        blocks.push({ type: 'reviews', ...base, eyebrow: get('Eyebrow'), h2: get('H2'), rating: get('Rating line'), reviews });
        break;
      }
      case 'faq': {
        const t = tables(s.body).find((x) => x.head.length >= 4 && /question/i.test(x.head[1]));
        if (!t) errors.push(`${s.heading}: no Question/Preview/Answer table`);
        const items = (t?.rows ?? []).map((r) => ({ q: unbold(r[1] ?? ''), preview: r[2] ?? '', answer: r[3] ?? '' }));
        faqVisible = items.map((x) => ({ q: x.q, a: x.answer }));
        blocks.push({ type: 'faq', ...base, eyebrow: get('Eyebrow'), h2: get('H2'), items });
        break;
      }
      case 'ndc': {
        ndcVariantMd = (s.body.match(/`(general|sewer)` variant/) ?? [])[1] ?? null;
        if (ndcVariantMd && ndcVariantMd !== L.variant) errors.push(`${s.heading}: the MD asks for the "${ndcVariantMd}" No Drip Club, the template has "${L.variant}"`);
        blocks.push({ type: 'ndc', ...base, variant: L.variant });
        break;
      }
      case 'services': {
        const t = tables(s.body).find((x) => /^card$/i.test(x.head[0]));
        const cards = (t?.rows ?? []).map((r) => {
          const l = links(r[0] ?? '')[0];
          const slug = l ? l.href.split('/').pop() ?? '' : '';
          const img: CsImage = heroImageFor(slug) ?? { src: '', alt: '' };
          if (!heroImageFor(slug)) errors.push(`${s.heading}: card "${r[0]}" links to "${l?.href}", which has no V2 page to take its image from`);
          return { title: l?.label ?? r[0], href: l?.href ?? '', desc: r[1] ?? '', img, emergency: slug === 'emergency-plumbing' };
        });
        blocks.push({ type: 'services', ...base, eyebrow: get('Eyebrow'), h2: get('H2'), cards });
        break;
      }
      case 'final':
        blocks.push({ type: 'final', ...base, eyebrow: get('Eyebrow'), h2: get('H2'), body: get('Body'), communities: get('Communities') });
        break;
    }
  });

  const schemaSec = secs.find((s) => /^SCHEMA/i.test(s.title));
  const json = jsonBlocks(schemaSec?.body ?? '');
  const svc = json.find((j) => j['@type'] === 'Service') ?? null;
  const faqLd = json.find((j) => j['@type'] === 'FAQPage') as { mainEntity?: Array<{ name: string; acceptedAnswer: { text: string } }> } | undefined;
  const faqSchema = (faqLd?.mainEntity ?? []).map((e) => ({ q: e.name, a: e.acceptedAnswer?.text ?? '' }));
  if (!svc) errors.push('SCHEMA: no Service block');
  const provider = svc && typeof svc.provider === 'object' ? { ...(svc.provider as Record<string, unknown>), telephone: '' } : {};

  const draft: CityServiceV2DraftContent = {
    template: CITY_SERVICE_V2_TEMPLATE,
    page: {
      schema: 1,
      hero: { crumb, eyebrow: field(hero, 'Eyebrow') ?? '', h1: field(hero, 'H1') ?? '', sub: field(hero, 'Subtext') ?? '', img: { ...tpl.hero.img } },
      trust,
      blocks,
      serviceSchema: { ...(svc ?? {}), provider } as CityServiceV2DraftContent['page']['serviceSchema'],
    },
    metaTitle,
    metaDescription,
  };
  return { draft, faqVisible, faqSchema, mdServiceSchema: svc, ndcVariantMd, layout, extras: built.extras, dropped: built.dropped, g2, errors };
}
