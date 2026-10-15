/**
 * Brief 212 (Track C2) — one City Service MD → `CityServiceV2DraftContent`, using the Brief 209
 * mapping (its report §1 "Method"):
 *   - MD sections map onto the page LAYOUT's blocks by type and position (`serviceLayout`: the city's
 *     own code module, or Northbrook's for a city without one). The block-type sequence must match.
 *   - `cls`, `order`, non-fold ids (city slug swapped in) and every block image + alt come from the
 *     layout block in the same position; a fold's id is the MD's `(anchor #x)` and must equal it.
 *   - Hero image + alt come from the layout page (the MD's `assets/*.jpg` is ignored, Brief 209 §2.3).
 *   - Service cards: title/href/desc from the MD; image/alt = the target slug's V2 hero; Emergency
 *     Plumbing is the red call row (derived from the href by conform).
 *   - Local `proof`: null unless the MD supplies a "Proof quote".
 *   - Not rendered: `> Replaces …` notes, LOCAL DATA, the FAQPage / BreadcrumbList schema blocks.
 * Copy is taken verbatim (after the corrections file is applied to the raw text).
 */
import type { CsBlock, CsImage } from '../../../src/lib/content/city-services-v2/types';
import { CITY_SERVICE_V2_TEMPLATE, stripTitleTail, type CityServiceV2DraftContent } from '../../../src/lib/city-service-v2-cms/model';
import { heroImageFor, layoutPage, serviceLayout } from '../../../src/lib/city-service-v2-cms/code-defaults';
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

export function parseService(md: string, city: string, service: string, opts: { removeReviews?: string[] } = {}): ParsedService {
  const errors: string[] = [];
  const layout = serviceLayout(city, service);
  // The page's own code module when it has one (Batch 1 self-test), else the layout city's.
  const tpl = getCityServiceV2(city, service) ?? layoutPage(service);
  if (!layout || !tpl) {
    return { draft: null as unknown as CityServiceV2DraftContent, faqVisible: [], faqSchema: [], mdServiceSchema: null, ndcVariantMd: null, errors: [`no City Service V2 layout for "${service}"`] };
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
  const mdSeq = kinds.filter(Boolean).join(',');
  const tplSeq = layout.map((b) => b.type).join(',');
  if (mdSeq !== tplSeq) errors.push(`block sequence ${mdSeq} ≠ the template's ${tplSeq}`);

  let faqVisible: Array<{ q: string; a: string }> = [];
  let ndcVariantMd: string | null = null;
  const blocks: CsBlock[] = [];
  const mdBlocks = body.filter((_, i) => kinds[i] !== null);
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
        if (anchor !== L.id) errors.push(`${s.heading}: anchor #${anchor} ≠ the template's #${L.id}`);
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
          return { name: names.get(n) as string, url: !u || /^\(none\)$/i.test(u) ? null : u, text: texts.get(n) ?? '' };
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
  return { draft, faqVisible, faqSchema, mdServiceSchema: svc, ndcVariantMd, errors };
}
