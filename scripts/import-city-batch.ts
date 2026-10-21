/**
 * Brief 212 (Track C) — the reusable City Pages batch importer: copy MDs + a corrections file → City
 * Hub and City Service V2 content in the CMS. Works for any future batch in this MD format.
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/import-city-batch.ts \
 *     --source "<…/New Pages/City Pages Batch N/_source>" --corrections <corrections.json> \
 *     [--city <slug>] [--apply] [--publish] [--create-missing] [--out <dir>] [--compare-code]
 *
 * Modes (Briefs 146/147: the mode is the first line printed, and a PIPELINE VERDICT line closes):
 *   (default)   DRY RUN — parse, correct, validate, write the JSON it WOULD store to --out
 *               (default .scripts-out/import-city-batch/<batch dir>/{city}/{hub|service}.json) plus
 *               summary.md. Nothing touches the database.
 *   --apply     also writes UNPUBLISHED versions: per page the pre-template archive (every column
 *               verbatim), the City Hub switch (hubs) and "Version 1 — City Hub" /
 *               "Version 1 — City Service V2". Review them in /admin (Preview), then:
 *   --publish   publishes those versions (implies --apply). Re-runs never duplicate a row or a version
 *               and never overwrite a page that already holds new-template content (Brief 202).
 *   --create-missing  create a missing city_service_pages row (otherwise it is REPORTED and the city
 *               is skipped — a missing row is never created silently).
 *   --compare-code    self-test (Brief 212 C5): diff each service page against its Batch 1 code
 *               module (src/lib/content/city-services-v2/data/{city}.json).
 *   --full-bleed-hero=<slug>[,<slug>]  (Brief 216 C3) these hubs get the 'full-bleed' hero with the
 *               video their live Local Office page plays today (the row's hero_video_url / hero_image,
 *               over the city's Local Office code module).
 *
 * Source layout: `<source>/{City}_CityPage_Copy_Rewrite.md` or `<source>/city-hubs/…` (hubs, optional)
 * and `<source>/services/{City}/md/{City}_{service}.md`, `<source>/city-service-pages/{City}/md/…` or
 * `<source>/{City}/md/…` (service pages), with the city's `{City}_CityService_FoldMap.md` beside `md/`.
 * Brief 216 additions, every batch: G1 (`/no-drip-club/` → `/no-drip-club` in every link), G2 (scraped
 * Google UI text stripped from service review quotes — every change listed in g2-changes.md), each
 * service page's layout is its own MD's block sequence (src/lib/city-service-v2-cms/code-defaults.ts
 * `pageLayout`), and three more gates: the FAQPage the page will emit = the MD's, no G2 text left, and
 * every fold anchor = the city's fold map.
 * Any validation failure (template mismatch, placeholder, literal phone, banned wording, unresolved
 * link, FAQ ≠ its schema, a shared section that differs) means NOTHING is written for the whole run.
 */
import fs from 'fs';
import path from 'path';
import pool from '../src/lib/db';
import { CITY_REGISTRY, getLocalOfficeContent } from '../src/lib/content/cities';
import { conformCityHubContent, assertCityHubPublishable } from '../src/lib/cms/city-hubs-write';
import { conformCityServiceV2Content, assertCityServiceV2Publishable } from '../src/lib/cms/city-services-v2-write';
import { HUB_V1_LABEL, type CityHubDraftContent, type HubHeroVideo } from '../src/lib/city-hub-cms/model';
import { codeSharedDefault } from '../src/lib/city-hub-cms/code-defaults';
import { SERVICE_V1_LABEL, type CityServiceV2DraftContent } from '../src/lib/city-service-v2-cms/model';
import { CITY_SERVICE_V2_SLUGS, codeServiceMeta, codeServiceStored, pageLayout, serviceLayout } from '../src/lib/city-service-v2-cms/code-defaults';
import type { CsBlock } from '../src/lib/content/city-services-v2/types';
import { applyCorrections, applyG1, loadCorrections } from './lib/city-batch-md/corrections';
import { parseHub } from './lib/city-batch-md/hub';
import { parseService } from './lib/city-batch-md/service';
import { allLinks, emittedFaqGate, faqGate, g2Gate, linkProblem, textGates } from './lib/city-batch-md/validate';
import { authorId, loadHub, loadService, type PageResult } from './lib/city-pages-seed';
import { inPipeline, resolveRunMode, verdict } from './lib/run-mode';

const SCRIPT = 'import-city-batch';
const argv = process.argv.slice(2);
const arg = (name: string) => {
  const i = argv.findIndex((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (i < 0) return undefined;
  return argv[i].includes('=') ? argv[i].slice(argv[i].indexOf('=') + 1) : argv[i + 1];
};
const flag = (name: string) => argv.includes(`--${name}`);
const publish = flag('publish');
const wantsApply = publish || argv.some((a) => ['--apply', 'apply', 'commit', '--commit'].includes(a));
console.log(wantsApply ? (publish ? 'APPLY + PUBLISH — writing' : 'APPLY — writing unpublished versions') : 'DRY RUN — nothing written');
const mode = resolveRunMode(SCRIPT, wantsApply ? [...argv, '--apply'] : argv);
const SOURCE = arg('source');
const CORR = arg('corrections');
const ONLY = arg('city');
const createMissing = flag('create-missing');
const compareCode = flag('compare-code');
const FROM_JSON = arg('from-json');
const FULL_BLEED = new Set((arg('full-bleed-hero') ?? '').split(',').filter(Boolean));

const norm = (x: string) => x.replace(/[^a-z]/gi, '').toLowerCase();
const slugOfName = new Map(CITY_REGISTRY.map((c) => [norm(c.name), c] as const));
const slugOfSlug = new Map(CITY_REGISTRY.map((c) => [norm(c.slug), c] as const));
/** MD prefixes that are neither a registry name nor a slug (Brief 216's mapping table). */
const FOLDER_ALIASES: Record<string, string> = { lincolnpark: 'chicago-lincoln-park', ravenswood: 'chicago-ravenswood' };
const cityByFolder = (folder: string) =>
  slugOfName.get(norm(folder)) ?? slugOfSlug.get(norm(folder)) ?? CITY_REGISTRY.find((c) => c.slug === FOLDER_ALIASES[norm(folder)]);

interface CityFiles {
  slug: string;
  name: string;
  hub?: string;
  services: Map<string, string>;
  /** The city's `{City}_CityService_FoldMap.md` (relative to the source), when the batch has one. */
  foldMap?: string;
}

/** A fold map's table: old URL → page it folds into + its anchor (from the menu-link column). */
function parseFoldMap(text: string): Array<{ from: string; to: string; anchor: string }> {
  const out: Array<{ from: string; to: string; anchor: string }> = [];
  for (const line of text.replace(/\r\n/g, '\n').split('\n')) {
    const m = line.match(/^\|\s*(\/[a-z0-9-]+\/[a-z0-9-]+)\s*\|\s*(\/[a-z0-9-]+\/[a-z0-9-]+)\s*\|.*→\s*\/[a-z0-9-]+\/[a-z0-9-]+#([a-z0-9-]+)\s*\|\s*$/);
    if (m) out.push({ from: m[1], to: m[2], anchor: m[3] });
  }
  return out;
}

/** Brief 216 C3: the video a hub's live Local Office page plays today (row over code module). */
async function liveHeroVideo(slug: string): Promise<HubHeroVideo | null> {
  const code = getLocalOfficeContent(slug)?.hero.video;
  let row: { v: string | null; p: string | null } | undefined;
  try {
    row = (await pool.query<{ v: string | null; p: string | null }>('SELECT hero_video_url AS v, hero_image AS p FROM city_pages WHERE city_slug = $1', [slug])).rows[0];
  } catch {
    row = undefined;
  }
  const src = row?.v?.trim() || code?.src || '';
  const poster = row?.p?.trim() || code?.poster || '';
  return src && poster ? { src, poster } : null;
}

function discover(source: string): Map<string, CityFiles> {
  const out = new Map<string, CityFiles>();
  const ensure = (folder: string): CityFiles | null => {
    const c = cityByFolder(folder);
    if (!c) return null;
    if (!out.has(c.slug)) out.set(c.slug, { slug: c.slug, name: c.name, services: new Map() });
    return out.get(c.slug)!;
  };
  for (const dir of [source, path.join(source, 'city-hubs')].filter((d) => fs.existsSync(d))) {
    for (const f of fs.readdirSync(dir)) {
      const m = f.match(/^(.+)_CityPage_Copy_Rewrite\.md$/);
      if (m) {
        const c = ensure(m[1]);
        if (c) c.hub = path.relative(source, path.join(dir, f)).replace(/\\/g, '/');
      }
    }
  }
  const roots = [path.join(source, 'services'), path.join(source, 'city-service-pages'), source].filter((r) => fs.existsSync(r));
  for (const root of roots) {
    for (const folder of fs.readdirSync(root)) {
      const md = path.join(root, folder, 'md');
      if (!fs.existsSync(md) || !fs.statSync(md).isDirectory()) continue;
      const c = ensure(folder);
      if (!c) continue;
      for (const f of fs.readdirSync(md)) {
        const m = f.match(/^[^_]+_(.+)\.md$/);
        if (m) c.services.set(m[1], path.relative(source, path.join(md, f)).replace(/\\/g, '/'));
      }
      const fm = fs.readdirSync(path.join(root, folder)).find((f) => /_CityService_FoldMap\.md$/.test(f));
      if (fm) c.foldMap = path.relative(source, path.join(root, folder, fm)).replace(/\\/g, '/');
    }
  }
  return out;
}

function leafDiff(a: unknown, b: unknown, p = '', out: string[] = []): string[] {
  if (typeof a !== typeof b || Array.isArray(a) !== Array.isArray(b) || a === null || b === null || typeof a !== 'object') {
    if (JSON.stringify(a) !== JSON.stringify(b)) out.push(`${p || '(root)'}: code ${JSON.stringify(a)?.slice(0, 160)} → import ${JSON.stringify(b)?.slice(0, 160)}`);
    return out;
  }
  const keys = new Set([...Object.keys(a as object), ...Object.keys(b as object)]);
  for (const k of keys) leafDiff((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], Array.isArray(a) ? `${p}[${k}]` : p ? `${p}.${k}` : k, out);
  return out;
}

const gate = (fn: () => unknown): string[] => {
  try {
    fn();
    return [];
  } catch (e) {
    return [(e as Error).message];
  }
};
const gateAsync = async (fn: () => Promise<unknown>): Promise<string[]> => {
  try {
    await fn();
    return [];
  } catch (e) {
    return [(e as Error).message];
  }
};

interface PageReport {
  path: string;
  kind: 'hub' | 'service';
  blocks: number;
  corrections: string[];
  errors: string[];
  notes: string[];
  draft: CityHubDraftContent | CityServiceV2DraftContent | null;
}

async function main() {
  console.log(`${SCRIPT} — Brief 212 City Pages batch importer${inPipeline() ? ' [pipeline]' : ''}\n`);
  if (FROM_JSON) return fromJsonRun(FROM_JSON);
  if (!SOURCE || !fs.existsSync(SOURCE)) throw new Error(`--source "${SOURCE}" does not exist`);
  const corr = loadCorrections(CORR);
  const cities = discover(SOURCE);
  const allFiles = [...cities.values()].flatMap((c) => [...(c.hub ? [c.hub] : []), ...c.services.values()]);
  const { texts, applied, errors: corrErrors } = applyCorrections(SOURCE, allFiles, corr);
  const g1 = applyG1(texts); // Brief 216 G1, after the corrections, before parsing
  const outDir = arg('out') ?? path.join('.scripts-out', 'import-city-batch', path.basename(path.dirname(path.resolve(SOURCE))).replace(/[^a-z0-9]+/gi, '-').toLowerCase());
  fs.mkdirSync(outDir, { recursive: true });
  const shared = codeSharedDefault();
  const reports: PageReport[] = [];
  const corrByFile = new Map<string, string[]>();
  for (const a of applied) corrByFile.set(a.file, [...(corrByFile.get(a.file) ?? []), `${a.id}×${a.count}`]);
  const removals = new Map<string, string[]>();
  for (const r of corr.reviewRemovals ?? []) for (const f of r.files) removals.set(f.replace(/\\/g, '/'), [...(removals.get(f.replace(/\\/g, '/')) ?? []), r.removeReviewByName]);
  const selftest: string[] = [];
  const g2All: Array<{ page: string; before: string; after: string }> = [];
  const extrasAll: Array<{ page: string; extras: string[]; dropped: string[]; sequence: string }> = [];
  const foldsAll: Array<{ from: string; to: string; anchor: string }> = [];

  for (const c of cities.values()) {
    if (ONLY && c.slug !== ONLY) continue;
    fs.mkdirSync(path.join(outDir, c.slug), { recursive: true });
    // Pass 1 (Brief 216): every service page's MD-built layout first, so a link to another page's
    // #anchor is checked against THAT page's own sections.
    const parsed = new Map<string, ReturnType<typeof parseService>>();
    for (const svc of CITY_SERVICE_V2_SLUGS) {
      const file = c.services.get(svc);
      if (file) parsed.set(svc, parseService(texts.get(file) as string, c.slug, svc, { removeReviews: removals.get(file) }));
    }
    const layoutOf = (city: string, service: string): readonly CsBlock[] | undefined =>
      city === c.slug && parsed.get(service)?.layout.length ? parsed.get(service)!.layout : serviceLayout(city, service);
    // The city's fold map: every anchor must be the anchor of a fold section on its target page.
    const foldMap = c.foldMap ? parseFoldMap(fs.readFileSync(path.join(SOURCE, c.foldMap), 'utf8')) : [];
    foldsAll.push(...foldMap);
    const foldErrors = new Map<string, string[]>();
    if (c.services.size && c.foldMap) {
      const byTarget = new Map<string, string[]>();
      for (const f of foldMap) byTarget.set(f.to.split('/')[2], [...(byTarget.get(f.to.split('/')[2]) ?? []), f.anchor]);
      for (const svc of CITY_SERVICE_V2_SLUGS) {
        const have = (parsed.get(svc)?.layout ?? []).filter((b) => b.type === 'fold').map((b) => b.id).sort().join(',');
        const want = (byTarget.get(svc) ?? []).sort().join(',');
        if (parsed.has(svc) && have !== want) foldErrors.set(svc, [`fold anchors ${have || '(none)'} ≠ the fold map's ${want || '(none)'}`]);
      }
      if (foldMap.length !== 11) foldErrors.set('_city', [`the fold map lists ${foldMap.length} folds, expected 11`]);
    }
    if (c.hub) {
      const video = FULL_BLEED.has(c.slug) ? await liveHeroVideo(c.slug) : null;
      const p = parseHub(texts.get(c.hub) as string, c.slug, c.name, shared, corr.hubReviewOverrides?.[c.name], video ? { fullBleed: video } : {});
      if (FULL_BLEED.has(c.slug) && !video) p.errors.push('--full-bleed-hero: this city has no live hero video to inherit');
      const errors = [...p.errors, ...p.sharedMismatches.map((m) => `shared-record assert: ${m}`)];
      let draft: CityHubDraftContent | null = null;
      errors.push(...gate(() => (draft = conformCityHubContent(c.slug, p.draft))));
      errors.push(...(await gateAsync(() => assertCityHubPublishable('city', c.slug, p.draft))));
      errors.push(...textGates(p.draft.hub), ...textGates({ metaTitle: p.draft.metaTitle, metaDescription: p.draft.metaDescription }));
      for (const l of allLinks(p.draft.hub)) {
        const r = linkProblem(l.href, c.slug, new Set(), layoutOf);
        if (!r.ok) errors.push(`${l.path}: ${r.why}`);
      }
      errors.push(...faqGate(p.faqVisible, p.faqSchema));
      errors.push(...emittedFaqGate(((draft as CityHubDraftContent | null) ?? p.draft).hub.faq.items, p.faqSchema));
      errors.push(...(foldErrors.get('_city') ?? []));
      const notes = p.a3Cards.length ? [`A-3 card images (V2 hero): ${p.a3Cards.join(', ')}`] : [];
      notes.push(`reviews from the ${p.reviewSource === 'md' ? 'MD' : 'corrections override'}`);
      if (p.draft.hub.hero.layout === 'full-bleed') notes.push(`full-bleed hero: video ${p.draft.hub.hero.video?.src}, poster ${p.draft.hub.hero.video?.poster}`);
      if (g1.get(c.hub)) notes.push(`G1 ×${g1.get(c.hub)}`);
      reports.push({ path: `/${c.slug}`, kind: 'hub', blocks: 12, corrections: corrByFile.get(c.hub) ?? [], errors, notes, draft });
      fs.writeFileSync(path.join(outDir, c.slug, 'hub.json'), JSON.stringify(draft ?? p.draft, null, 1));
    }
    for (const svc of CITY_SERVICE_V2_SLUGS) {
      const file = c.services.get(svc);
      if (!file) {
        if (c.services.size) reports.push({ path: `/${c.slug}/${svc}`, kind: 'service', blocks: 0, corrections: [], errors: ['no MD for this service'], notes: [], draft: null });
        continue;
      }
      const p = parsed.get(svc) as ReturnType<typeof parseService>;
      const slug = `${c.slug}/${svc}`;
      const errors = [...p.errors, ...(foldErrors.get(svc) ?? [])];
      let draft: CityServiceV2DraftContent | null = null;
      errors.push(...gate(() => (draft = conformCityServiceV2Content(slug, p.draft))));
      errors.push(...(await gateAsync(() => assertCityServiceV2Publishable('city-service', slug, p.draft))));
      errors.push(...textGates(p.draft.page), ...textGates({ metaTitle: p.draft.metaTitle, metaDescription: p.draft.metaDescription }));
      const ids = new Set(p.layout.map((b) => b.id));
      for (const l of allLinks(p.draft.page)) {
        const r = linkProblem(l.href, c.slug, ids, layoutOf);
        if (!r.ok) errors.push(`${l.path}: ${r.why}`);
      }
      errors.push(...faqGate(p.faqVisible, p.faqSchema));
      const stored = ((draft as CityServiceV2DraftContent | null) ?? p.draft).page;
      const faqBlock = stored.blocks.find((b): b is Extract<CsBlock, { type: 'faq' }> => b.type === 'faq');
      errors.push(...emittedFaqGate((faqBlock?.items ?? []).map((f) => ({ q: f.q, a: f.answer })), p.faqSchema));
      errors.push(...g2Gate(stored));
      const notes: string[] = [];
      if (removals.get(file)) notes.push(`review removed: ${removals.get(file)!.join(', ')}`);
      if (p.extras.length) notes.push(`${p.extras.length} extra section(s)`);
      if (p.dropped.length) notes.push(`template sections not in the MD: ${p.dropped.join(', ')}`);
      if (g1.get(file)) notes.push(`G1 ×${g1.get(file)}`);
      if (p.g2.length) notes.push(`G2 ×${p.g2.length}`);
      for (const x of p.g2) g2All.push({ page: `/${slug}`, ...x });
      extrasAll.push({ page: `/${slug}`, extras: p.extras, dropped: p.dropped, sequence: p.layout.map((b) => (b.type === 'fold' ? `fold#${b.id}` : b.type)).join(' ') });
      reports.push({ path: `/${slug}`, kind: 'service', blocks: p.draft?.page?.blocks?.length ?? 0, corrections: corrByFile.get(file) ?? [], errors, notes, draft });
      fs.writeFileSync(path.join(outDir, c.slug, `${svc}.json`), JSON.stringify(draft ?? p.draft, null, 1));
      if (compareCode) {
        const code = codeServiceStored(c.slug, svc);
        const meta = codeServiceMeta(c.slug, svc);
        const mine = draft as CityServiceV2DraftContent | null;
        if (code && meta && mine) {
          const d = leafDiff({ meta, page: code }, { meta: { title: mine.metaTitle, description: mine.metaDescription }, page: mine.page });
          if (d.length) selftest.push(`### /${slug}\n${d.map((x) => `- ${x}`).join('\n')}`);
        }
      }
    }
  }

  // ── summary ─────────────────────────────────────────────────────────────────
  const failed = reports.filter((r) => r.errors.length);
  const lines: string[] = [`# ${SCRIPT} — dry-run summary`, '', `Source: ${SOURCE}`, `Corrections: ${CORR ?? '(none)'} — ${applied.length} applications of ${new Set(applied.map((a) => a.id)).size} corrections`, ''];
  if (corrErrors.length) lines.push('## Correction errors (run fails)', ...corrErrors.map((e) => `- ${e}`), '');
  lines.push('| City | Pages | Blocks | Corrections applied | Gates |', '|---|---|---|---|---|');
  for (const c of cities.values()) {
    if (ONLY && c.slug !== ONLY) continue;
    const rs = reports.filter((r) => r.path === `/${c.slug}` || r.path.startsWith(`/${c.slug}/`));
    const ids = rs.flatMap((r) => r.corrections.map((x) => x.split('×')[0]));
    const bad = rs.filter((r) => r.errors.length).length;
    lines.push(`| ${c.name} | ${rs.length} | ${rs.reduce((n, r) => n + r.blocks, 0)} | ${[...new Set(ids)].sort().join(', ') || '—'} | ${bad ? `**${bad} failed**` : 'all passed'} |`);
  }
  lines.push('', '## Per page', '');
  for (const r of reports) {
    lines.push(`- ${r.path} — ${r.errors.length ? `**FAILED** (${r.errors.length})` : 'passed'}${r.corrections.length ? ` — corrections ${r.corrections.join(', ')}` : ''}${r.notes.length ? ` — ${r.notes.join('; ')}` : ''}`);
    for (const e of r.errors) lines.push(`  - ${e}`);
  }
  if (compareCode) lines.push('', `## Self-test: differences vs the code modules (${selftest.length} pages)`, '', ...selftest);
  const g1Total = [...g1.values()].reduce((n, x) => n + x, 0);
  lines.splice(4, 0, `G1 (/no-drip-club/ → /no-drip-club): ${g1Total} link(s) in ${g1.size} file(s). G2 (Google UI text stripped from review quotes): ${g2All.length} quote(s), ${new Set(g2All.map((x) => x.before)).size} distinct. Extra sections: ${extrasAll.reduce((n, x) => n + x.extras.length, 0)} on ${extrasAll.filter((x) => x.extras.length).length} page(s).`, '');
  fs.writeFileSync(path.join(outDir, 'summary.md'), lines.join('\n'));
  fs.writeFileSync(path.join(outDir, 'corrections-applied.json'), JSON.stringify(applied, null, 1));
  // Brief 216 evidence beside the summary (no MD text beyond the review quotes, which publish anyway).
  const distinct = new Map<string, { after: string; pages: string[] }>();
  for (const x of g2All) distinct.set(x.before, { after: x.after, pages: [...(distinct.get(x.before)?.pages ?? []), x.page] });
  fs.writeFileSync(
    path.join(outDir, 'g2-changes.md'),
    [`# G2 — review quotes changed (${distinct.size} distinct, ${g2All.length} occurrences)`, '', '| # | Before | After | Pages |', '|---|---|---|---|',
      ...[...distinct].map(([b, v], i) => `| ${i + 1} | ${b.replace(/\|/g, '\\|')} | ${v.after.replace(/\|/g, '\\|')} | ${v.pages.join(', ')} |`)].join('\n')
  );
  fs.writeFileSync(path.join(outDir, 'layouts.json'), JSON.stringify(extrasAll, null, 1));
  if (foldsAll.length) fs.writeFileSync(path.join(outDir, 'folds.json'), JSON.stringify(foldsAll, null, 1));
  console.log(`  ${reports.length} pages parsed (${reports.filter((r) => r.kind === 'hub').length} hubs), ${failed.length} failed validation; ${applied.length} correction applications; output → ${outDir}`);
  for (const e of corrErrors) console.log(`  ! ${e}`);
  for (const r of failed.slice(0, 15)) console.log(`  ! ${r.path}: ${r.errors.slice(0, 3).join(' | ')}`);

  if (corrErrors.length || failed.length) {
    verdict(SCRIPT, 'NOT-APPLIED (validation failed)', `${failed.length} page(s) failed validation, ${corrErrors.length} correction error(s) — nothing written`);
    return;
  }
  if (mode === 'dry') {
    verdict(SCRIPT, 'NOT-APPLIED (dry run)', `${reports.length} page(s) validated; output in ${outDir}`);
    return;
  }

  await applyRun(cities, reports);
}

/**
 * --from-json <dir>: load a batch from the importer's own validated dry-run output
 * (`<dir>/{city}/hub.json` + `<dir>/{city}/{service}.json`) instead of the MDs — how the deploy
 * pipeline publishes a batch (the MDs carry research notes and Search Console data that do not
 * belong in this PUBLIC repo; the JSON is exactly the page content that goes live). Every gate that
 * does not need the MD runs again: the CMS's own conform + publish checks, placeholders, phones,
 * banned wording and link resolution. (The FAQ ↔ schema and shared-record asserts ran on the MDs
 * when the JSON was generated.)
 */
async function fromJsonRun(dir: string) {
  if (!fs.existsSync(dir)) throw new Error(`--from-json "${dir}" does not exist`);
  const cities = new Map<string, CityFiles>();
  const reports: PageReport[] = [];
  for (const slug of fs.readdirSync(dir).filter((d) => fs.statSync(path.join(dir, d)).isDirectory())) {
    const entry = CITY_REGISTRY.find((c) => c.slug === slug);
    if (!entry || (ONLY && slug !== ONLY)) continue;
    const c: CityFiles = { slug, name: entry.name, services: new Map() };
    cities.set(slug, c);
    const files = fs.readdirSync(path.join(dir, slug)).filter((x) => x.endsWith('.json'));
    const pages = new Map(files.map((f) => [f.replace(/\.json$/, ''), JSON.parse(fs.readFileSync(path.join(dir, slug, f), 'utf8'))] as const));
    // Brief 216: each page's layout is its own (`pageLayout` over the JSON), for cross-page #anchors too.
    const layoutOf = (city: string, service: string): readonly CsBlock[] | undefined =>
      city === slug && pages.get(service)?.page ? pageLayout(city, service, { draft: pages.get(service).page }) : serviceLayout(city, service);
    for (const f of files) {
      const name = f.replace(/\.json$/, '');
      const raw = pages.get(name);
      const errors: string[] = [];
      if (name === 'hub') {
        c.hub = f;
        let draft: CityHubDraftContent | null = null;
        errors.push(...gate(() => (draft = conformCityHubContent(slug, raw))));
        errors.push(...(await gateAsync(() => assertCityHubPublishable('city', slug, raw))));
        errors.push(...textGates(raw.hub), ...textGates({ metaTitle: raw.metaTitle, metaDescription: raw.metaDescription }));
        for (const l of allLinks(raw.hub)) {
          const r = linkProblem(l.href, slug, new Set(), layoutOf);
          if (!r.ok) errors.push(`${l.path}: ${r.why}`);
        }
        reports.push({ path: `/${slug}`, kind: 'hub', blocks: 12, corrections: [], errors, notes: [], draft });
      } else if (CITY_SERVICE_V2_SLUGS.includes(name)) {
        c.services.set(name, f);
        let draft: CityServiceV2DraftContent | null = null;
        const ps = `${slug}/${name}`;
        errors.push(...gate(() => (draft = conformCityServiceV2Content(ps, raw))));
        errors.push(...(await gateAsync(() => assertCityServiceV2Publishable('city-service', ps, raw))));
        errors.push(...textGates(raw.page), ...textGates({ metaTitle: raw.metaTitle, metaDescription: raw.metaDescription }));
        const ids = new Set((layoutOf(slug, name) ?? []).map((b) => b.id));
        for (const l of allLinks(raw.page)) {
          const r = linkProblem(l.href, slug, ids, layoutOf);
          if (!r.ok) errors.push(`${l.path}: ${r.why}`);
        }
        errors.push(...g2Gate(raw.page));
        reports.push({ path: `/${ps}`, kind: 'service', blocks: raw.page?.blocks?.length ?? 0, corrections: [], errors, notes: [], draft });
      }
    }
  }
  const failed = reports.filter((r) => r.errors.length);
  console.log(`  ${reports.length} pages read from ${dir} (${reports.filter((r) => r.kind === 'hub').length} hubs), ${failed.length} failed validation`);
  for (const r of failed.slice(0, 15)) console.log(`  ! ${r.path}: ${r.errors.slice(0, 3).join(' | ')}`);
  if (failed.length) {
    verdict(SCRIPT, 'NOT-APPLIED (validation failed)', `${failed.length} page(s) failed validation — nothing written`);
    return;
  }
  if (mode === 'dry') {
    verdict(SCRIPT, 'NOT-APPLIED (dry run)', `${reports.length} page(s) validated`);
    return;
  }
  await applyRun(cities, reports);
}

async function applyRun(cities: Map<string, CityFiles>, reports: PageReport[]) {
  // ── apply / publish (Track D2 order, per city: confirm rows → hub → services) ──
  const by = await authorId();
  const results: PageResult[] = [];
  for (const c of cities.values()) {
    if (ONLY && c.slug !== ONLY) continue;
    const rs = reports.filter((r) => r.path === `/${c.slug}` || r.path.startsWith(`/${c.slug}/`));
    const hubRow = (await pool.query(`SELECT 1 FROM city_pages WHERE city_slug = $1`, [c.slug])).rowCount;
    const svcRows = new Set((await pool.query<{ s: string }>(`SELECT service_slug AS s FROM city_service_pages WHERE city_slug = $1`, [c.slug])).rows.map((r) => r.s));
    const missingSvc = rs.filter((r) => r.kind === 'service').map((r) => r.path.split('/')[2]).filter((s) => !svcRows.has(s));
    if (!hubRow || (missingSvc.length && !createMissing)) {
      results.push({ path: `/${c.slug}`, outcome: 'missing', detail: `${!hubRow ? 'no city_pages row; ' : ''}${missingSvc.length} city_service_pages row(s) missing (${missingSvc.slice(0, 5).join(', ')}${missingSvc.length > 5 ? ', …' : ''}) — city skipped, nothing written (pass --create-missing to create them)` });
      continue;
    }
    for (const r of rs) {
      if (!r.draft) continue;
      const o = { by, apply: true, publish, label: r.kind === 'hub' ? HUB_V1_LABEL : SERVICE_V1_LABEL, createMissing, brief: Number(arg('brief') ?? 212) };
      const res = r.kind === 'hub' ? await loadHub(c.slug, r.draft as CityHubDraftContent, o) : await loadService(c.slug, r.path.split('/')[2], r.draft as CityServiceV2DraftContent, o);
      results.push(res);
    }
  }
  const changedFile = arg('changed-file');
  if (changedFile) {
    const changed = [...new Set(results.filter((r) => r.outcome === 'loaded').map((r) => r.path.split('/')[1]))];
    if (changed.length) fs.appendFileSync(changedFile, changed.join('\n') + '\n');
  }
  for (const r of results) if (r.outcome !== 'already') console.log(`  ${r.path.padEnd(52)} ${r.outcome.toUpperCase().padEnd(11)} ${r.detail}`);
  const n = (o: string) => results.filter((r) => r.outcome === o).length;
  console.log(`\n  loaded ${n('loaded')}, staged ${n('staged')}, already ${n('already')}, missing ${n('missing')}, unpublished ${n('unpublished')}, failed ${n('failed')}`);
  if (n('failed')) {
    verdict(SCRIPT, 'FAILED', `${n('failed')} page(s) did not land`);
    process.exitCode = 1;
  } else if (n('loaded') + n('staged') === 0) {
    verdict(SCRIPT, n('missing') ? 'NOT-APPLIED (rows missing)' : 'ALREADY-APPLIED', n('missing') ? `${n('missing')} city/cities skipped for missing rows` : 'already loaded, no change');
  } else {
    verdict(SCRIPT, 'APPLIED', `${publish ? 'published' : 'staged (unpublished)'} ${n('loaded') + n('staged')}, already ${n('already')}, missing ${n('missing')}`);
  }
}

main()
  .catch((err) => {
    console.error(`\n!!!! ${SCRIPT} crashed:`, err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
