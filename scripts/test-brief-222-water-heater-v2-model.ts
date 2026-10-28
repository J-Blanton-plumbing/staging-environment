/**
 * Brief 222 — offline tests for the water heater CMS model (no DB, no network).
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/test-brief-222-water-heater-v2-model.ts
 *
 * Proves the round trip the brief depends on: every code module → stored shape → conform (with the REAL
 * server sanitisers) → render model is IDENTICAL to the code module, for all 6 pages and the shared
 * record; and that the guards refuse what they must — layout changes (a section added / removed /
 * reordered, a class, an anchor, the template version), literal phones, tel: links, rating literals, a
 * rating card without the company tokens, script tags (stripped) — while list edits, alt text, review
 * links, the financing toggle and the gallery stay editable. Exits 1 on any failure.
 */
import { WH_HUB } from '../src/lib/content/water-heater-v2/hub';
import { WH_SHARED_DEFAULT } from '../src/lib/content/water-heater-v2/shared-content';
import type { WhHubStored, WhSection, WhStored, WhTreeElement } from '../src/lib/content/water-heater-v2/types';
import { codeWhHubStored, WH_PAGES } from '../src/lib/water-heater-v2-cms/code-defaults';
import { pageToStored, storedToPage, isWhV2DraftContent, whTemplateOf, WH_V2_MARKER } from '../src/lib/water-heater-v2-cms/model';
import { conformWhHub, conformWhPage } from '../src/lib/water-heater-v2-cms/conform';
import { SEWER_V2_SANITIZERS as S } from '../src/lib/cms/sewer-v2-sanitize';
import { waterHeaterJsonLd, faqAnswerText } from '../src/lib/schema/water-heater';

let failures = 0;
const ok = (cond: boolean, msg: string) => {
  if (cond) console.log(`  ok   ${msg}`);
  else {
    failures++;
    console.log(`  FAIL ${msg}`);
  }
};
const J = (v: unknown) => JSON.stringify(v);
const clone = <T>(v: T): T => JSON.parse(J(v));

function firstDiff(a: unknown, b: unknown, path = ''): string | null {
  if (J(a) === J(b)) return null;
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const keys = [...new Set([...Object.keys(a as object), ...Object.keys(b as object)])];
    for (const k of keys) {
      const d = firstDiff((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], `${path}.${k}`);
      if (d) return d;
    }
    return `${path}: key order`;
  }
  return `${path}: ${J(a)?.slice(0, 120)} ≠ ${J(b)?.slice(0, 120)}`;
}

const repair = WH_PAGES['water-heater-repair'];
const tankless = WH_PAGES['tankless-water-heater'];
const commercial = WH_PAGES['commercial-water-heater'];
const panelOf = (s: WhStored, i: number) => (s.sections[i] as Extract<WhSection, { kind: 'panel' }>).el as WhTreeElement;
const firstPanel = (s: WhStored) => s.sections.findIndex((x) => x.kind === 'panel');
const idx = (s: WhStored, kind: WhSection['kind']) => s.sections.findIndex((x) => x.kind === kind);
const errs = (r: { errors: { message: string; path: string }[] }) => r.errors.map((e) => `${e.path}: ${e.message}`).join(' | ');

console.log('\n1. Every page: code → stored → conform(real sanitisers) → render model identical');
for (const [slug, page] of Object.entries(WH_PAGES)) {
  const stored = pageToStored(page);
  const r = conformWhPage(clone(stored), stored, S);
  ok(r.errors.length === 0, `${slug}: conform reports no issues${r.errors.length ? ` — ${errs(r).slice(0, 300)}` : ''}`);
  const d = firstDiff(r.value, stored);
  ok(!d, `${slug}: conformed value identical to the stored object${d ? ` — ${d}` : ''}`);
  const d2 = firstDiff(storedToPage(slug, r.value, page.meta), page);
  ok(!d2, `${slug}: render model identical to the code module${d2 ? ` — ${d2}` : ''}`);
}
{
  const stored = codeWhHubStored();
  const r = conformWhHub(clone(stored), stored, S);
  ok(r.errors.length === 0, `hub + shared: conform reports no issues${r.errors.length ? ` — ${errs(r).slice(0, 300)}` : ''}`);
  ok(!firstDiff(r.value, stored), `hub + shared: conformed value identical${firstDiff(r.value, stored) ? ` — ${firstDiff(r.value, stored)}` : ''}`);
  const { shared: _s, ...hubOnly } = r.value;
  void _s;
  ok(!firstDiff(storedToPage('water-heater', hubOnly as WhStored, WH_HUB.meta), WH_HUB), 'hub: render model identical to the code module');
}

console.log('\n2. Templates: Standard ×3, Index ×2, Hub; Index pages carry the TOC, Standard the financing card order');
ok(WH_HUB.template === 'wh-hub' && repair.template === 'wh-standard' && tankless.template === 'wh-index' && commercial.template === 'wh-index', 'template versions');
ok(!!tankless.rail?.toc && !!commercial.rail?.toc && !repair.rail?.toc && (repair.rail?.financingOrder ?? 0) > 0, 'rail shapes');
ok(idx(pageToStored(tankless), 'financing') >= 0 && idx(pageToStored(commercial), 'financing') < 0, 'financing panel: Tankless has it, Commercial has none');
ok(['wh-hub', 'wh-standard', 'wh-index'].includes(whTemplateOf({ template: WH_V2_MARKER, whV2: pageToStored(repair), metaTitle: '', metaDescription: '' })), 'whTemplateOf stamps the template version');
ok(!isWhV2DraftContent({ blocks: [] }) && isWhV2DraftContent({ template: WH_V2_MARKER, whV2: {}, metaTitle: '', metaDescription: '' }), 'old-shaped content is not water heater content');

console.log('\n3. Editable: words, list items, alt text, review links, financing toggle, gallery');
{
  const s = pageToStored(repair);
  const v = clone(s);
  const rev = v.sections[idx(v, 'reviews')] as Extract<WhSection, { kind: 'reviews' }>;
  rev.items[0].quote = '“Edited quote.”';
  rev.items[0].href = 'https://maps.app.goo.gl/abcdef';
  rev.items.push({ ...rev.items[1], name: 'New Reviewer' });
  rev.gallery = { label: 'Review with photos', photos: [{ src: '/images/a.webp', alt: 'A' }, { src: '/images/b.webp', alt: 'B' }] };
  const faq = v.sections[idx(v, 'faq')] as Extract<WhSection, { kind: 'faq' }>;
  faq.items[0].q = 'Edited question?';
  faq.items.pop();
  v.hero.words = ['Chicagoland', 'Columbus, OH', 'Naperville'];
  v.hero.image.alt = 'New alt text';
  const r = conformWhPage(v, s, S);
  ok(r.errors.length === 0, `allowed edits conform${r.errors.length ? ` — ${errs(r)}` : ''}`);
  const rr = r.value.sections[idx(v, 'reviews')] as Extract<WhSection, { kind: 'reviews' }>;
  ok(rr.items.length === 4 && rr.items[0].href === 'https://maps.app.goo.gl/abcdef' && rr.gallery?.photos.length === 2, 'review list grows, link + gallery kept');
  const t = pageToStored(tankless);
  const tv = clone(t);
  (tv.sections[idx(tv, 'financing')] as Extract<WhSection, { kind: 'financing' }>).enabled = false;
  const tr = conformWhPage(tv, t, S);
  ok(tr.errors.length === 0 && (tr.value.sections[idx(tv, 'financing')] as Extract<WhSection, { kind: 'financing' }>).enabled === false, 'Index financing panel can be switched off');
}

console.log('\n4. Locked: layout changes are refused (422)');
{
  const s = pageToStored(repair);
  const cases: [string, (v: WhStored) => void][] = [
    ['a section removed', (v) => v.sections.pop()],
    ['sections reordered', (v) => v.sections.reverse()],
    ['a panel class changed', (v) => { panelOf(v, firstPanel(v)).cls = 'ss-panel ss-tint'; }],
    ['a panel mobile order changed', (v) => { panelOf(v, firstPanel(v)).style = '--o:99'; }],
    ['the template version changed', (v) => { (v as { template: string }).template = 'wh-index'; }],
    ['the reviews section class changed', (v) => { (v.sections[idx(v, 'reviews')] as { cls: string }).cls = 'ss-panel ss-tint'; }],
    ['a rail added to nothing (financing order)', (v) => { v.rail!.financingOrder = 1; }],
  ];
  for (const [name, mutate] of cases) {
    const v = clone(s);
    mutate(v);
    const r = conformWhPage(v, s, S);
    ok(r.errors.some((e) => e.kind === 'structure'), `${name} → structure error`);
  }
  // A panel's anchor is a locked attribute: the tree rules put the template's value back (never stored changed).
  const av = clone(s);
  panelOf(av, firstPanel(av)).attrs = { id: 'other' };
  const ar = conformWhPage(av, s, S);
  ok(J(panelOf(ar.value, firstPanel(ar.value)).attrs) === J(panelOf(s, firstPanel(s)).attrs), 'a panel anchor (id) edit is reset to the locked id');
  const t = pageToStored(tankless);
  const tv = clone(t);
  tv.rail!.toc!.items[0].href = '#elsewhere';
  ok(conformWhPage(tv, t, S).errors.some((e) => e.kind === 'structure'), 'a TOC target changed → structure error');
  const cv = clone(t);
  cv.service.catalog!.items[0].url = '/elsewhere';
  ok(conformWhPage(cv, t, S).errors.some((e) => e.kind === 'structure'), 'a catalog anchor changed → structure error');
}

console.log('\n5. Field rules: phones, links, ratings, scripts');
{
  const s = pageToStored(repair);
  const v = clone(s);
  v.hero.intro = 'Call 773-724-9272 today.';
  ok(conformWhPage(v, s, S).errors.some((e) => e.kind === 'phone'), 'a literal phone number → refused');
  const v2 = clone(s);
  (v2.sections[idx(v2, 'reviews')] as Extract<WhSection, { kind: 'reviews' }>).items[0].href = 'tel:7737249272';
  ok(conformWhPage(v2, s, S).errors.length > 0, 'a tel: review link → refused');
  const v3 = clone(s);
  v3.hero.intro = 'Rated 4.7 by 5,669+ customers.';
  ok(conformWhPage(v3, s, S).errors.some((e) => e.kind === 'value'), 'a rating literal → refused');
  const v4 = clone(s);
  v4.hero.intro = 'Fine <script>alert(1)</script>words';
  const r4 = conformWhPage(v4, s, S);
  ok(!r4.value.hero.intro.includes('<script') && !r4.value.hero.intro.includes('alert'), 'script tags stripped from plain text');
  const hub = codeWhHubStored();
  const hv = clone(hub);
  hv.shared.proof.rating = '4.7';
  hv.shared.proof.sub = 'Average from 5,669+ Google reviews';
  const hr = conformWhHub(hv, hub, S);
  ok(hr.errors.filter((e) => e.path.startsWith('shared.proof')).length >= 2, 'the rating card refuses numbers instead of the company tokens');
  ok(J(WH_SHARED_DEFAULT.proof).includes('{{company_rating}}') && J(WH_SHARED_DEFAULT.proof).includes('{{company_review_count}}'), 'the shared default rating card carries the tokens');
  ok(!/4\.7|5,?669/.test(J([WH_HUB, ...Object.values(WH_PAGES), WH_SHARED_DEFAULT])), 'no package rating literal anywhere in the code modules');
  ok(!/7737249272|773-724-9272/.test(J([WH_HUB, ...Object.values(WH_PAGES), WH_SHARED_DEFAULT])), 'no literal phone anywhere in the code modules');
}

console.log('\n6. Schema: FAQPage = the visible full answers; one graph; no Plumber');
{
  const faq = repair.sections.find((s) => s.kind === 'faq') as Extract<WhSection, { kind: 'faq' }>;
  const g = waterHeaterJsonLd({
    path: '/water-heater-repair', hub: false, title: 'T | J. Blanton Plumbing', description: 'D', crumb: repair.hero.crumb, crumbParent: WH_SHARED_DEFAULT.crumbParent,
    service: repair.service, spokePaths: Object.keys(WH_PAGES).map((x) => `/${x}`), faqs: faq.items, phoneDisplay: '773-724-9272', aggregateRating: null,
  });
  const f = g['@graph'].find((n) => n['@type'] === 'FAQPage') as { mainEntity: { acceptedAnswer: { text: string } }[] };
  ok(f.mainEntity.length === 6, 'six questions');
  ok(f.mainEntity[5].acceptedAnswer.text.endsWith('give us a call at 773-724-9272.') , 'the {{phone}} answer renders the display number in the schema');
  ok(faqAnswerText(faq.items[0].full, 'x') === f.mainEntity[0].acceptedAnswer.text, 'answer text comes from the visible field');
  ok(!J(g).includes('"Plumber"') && !J(g).includes('aggregateRating'), 'no Plumber, no aggregateRating when the card shows none');
}

console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL PASSED');
process.exit(failures ? 1 : 0);
