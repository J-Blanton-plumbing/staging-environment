/**
 * Brief 225 — offline tests for the Emergency Hub CMS model (no DB, no network).
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/test-brief-225-emergency-v2-model.ts
 *
 * Proves: the code module → stored shape → conform (with the REAL server sanitisers, and again after a JSONB
 * round trip that sorts every key) → render model is IDENTICAL to the code module; the page is wired as the
 * third template of the water heater model without touching the water heater answers; and the guards refuse
 * what they must — layout changes, a link in the emergency checklist or the "While You Wait" steps, an edit
 * of the fixed financing band, literal phones, tel: links, rating literals, water heater content on this page
 * (and the reverse) — while words, alt text, reviews, FAQs and office links stay editable. Exits 1 on failure.
 */
import { EM_HUB, EM_SHARED_DEFAULT } from '../src/lib/content/emergency-v2/hub';
import type { WhHubStored, WhSection, WhTreeElement, WhTreeNode } from '../src/lib/content/water-heater-v2/types';
import { codeEmHubStored, codeWhHubStored } from '../src/lib/water-heater-v2-cms/code-defaults';
import {
  EM_V2_MARKER,
  isWhFamilySlug,
  isWhSlug,
  isWhTarget,
  isWhV2DraftContent,
  storedToPage,
  whArchiveLabelFor,
  whMarkerFor,
  whPageType,
  whPathFor,
  whTemplateOf,
  whTemplatesFor,
  WH_V2_MARKER,
} from '../src/lib/water-heater-v2-cms/model';
import { conformWhHub } from '../src/lib/water-heater-v2-cms/conform';
import { conformWhContent } from '../src/lib/cms/water-heater-v2-write';
import { SEWER_V2_SANITIZERS as S } from '../src/lib/cms/sewer-v2-sanitize';
import { emergencyJsonLd } from '../src/lib/schema/emergency';

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
/** What Postgres JSONB hands back: every object's keys sorted (Brief 212). */
const jsonb = <T>(v: T): T => {
  const sort = (x: unknown): unknown =>
    Array.isArray(x) ? x.map(sort) : x && typeof x === 'object' ? Object.fromEntries(Object.keys(x as object).sort().map((k) => [k, sort((x as Record<string, unknown>)[k])])) : x;
  return sort(clone(v)) as T;
};
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
const errs = (r: { errors: { message: string; path: string }[] }) => r.errors.map((e) => `${e.path}: ${e.message}`).join(' | ');
const idx = (s: WhHubStored, kind: WhSection['kind']) => s.sections.findIndex((x) => x.kind === kind);
const panelById = (s: WhHubStored, id: string) => s.sections.findIndex((x) => x.kind === 'panel' && (x.el as WhTreeElement).attrs?.id === id);
const panelByCls = (s: WhHubStored, cls: string) => s.sections.findIndex((x) => x.kind === 'panel' && (x.el as WhTreeElement).cls === cls);
const el = (s: WhHubStored, i: number) => (s.sections[i] as Extract<WhSection, { kind: 'panel' }>).el as WhTreeElement;
/** The first element matching `pred` in a tree. */
function find(n: WhTreeNode, pred: (e: WhTreeElement) => boolean): WhTreeElement | null {
  if (typeof n !== 'object' || !('tag' in n)) return null;
  if (pred(n)) return n;
  for (const k of n.kids ?? []) {
    const f = find(k, pred);
    if (f) return f;
  }
  return null;
}

console.log('\n1. Code → stored → conform(real sanitisers) → render model identical (also after a JSONB round trip)');
{
  const stored = codeEmHubStored();
  for (const [name, input] of [['as saved', clone(stored)], ['read back from JSONB', jsonb(stored)]] as const) {
    const r = conformWhHub(input, stored, S);
    ok(r.errors.length === 0, `${name}: conform reports no issues${r.errors.length ? ` — ${errs(r).slice(0, 400)}` : ''}`);
    const d = firstDiff(r.value, stored);
    ok(!d, `${name}: conformed value identical to the stored object${d ? ` — ${d}` : ''}`);
  }
  const { shared: _s, ...only } = conformWhHub(clone(stored), stored, S).value;
  void _s;
  const d2 = firstDiff(storedToPage('emergency-plumbing', only, EM_HUB.meta), EM_HUB);
  ok(!d2, `render model identical to the code module${d2 ? ` — ${d2}` : ''}`);
  // The write path (what createDraft / publishDraft run), with the em marker, from a JSONB-shaped version.
  const content = { template: EM_V2_MARKER, whV2: jsonb(stored), metaTitle: EM_HUB.meta.title, metaDescription: EM_HUB.meta.description } as const;
  let threw = '';
  try {
    conformWhContent('emergency-plumbing', 'emergency-plumbing', content as never);
  } catch (e) {
    threw = (e as Error).message;
  }
  ok(!threw, `the publish writer's re-check accepts a stored version${threw ? ` — ${threw}` : ''}`);
}

console.log('\n2. Wiring: the third template of the water heater model, water heater answers unchanged');
ok(EM_HUB.template === 'em-hub' && whPageType('emergency-plumbing') === 'emergency-plumbing' && whPathFor('emergency-plumbing') === '/emergency-plumbing', 'template, page type, path');
ok(isWhFamilySlug('emergency-plumbing') && !isWhSlug('emergency-plumbing') && isWhTarget('emergency-plumbing', 'emergency-plumbing'), 'family slug, not a water heater slug');
ok(J(whTemplatesFor('emergency-plumbing')) === J(['em-hub']) && J(whTemplatesFor('water-heater-repair')) === J(['wh-hub', 'wh-standard', 'wh-index']), 'template lists per page');
ok(whMarkerFor('emergency-plumbing') === EM_V2_MARKER && whMarkerFor('water-heater') === WH_V2_MARKER, 'markers per page');
ok(whArchiveLabelFor('emergency-plumbing') === 'Pre-v2 archive (2026-11)' && whArchiveLabelFor('water-heater') === 'Pre-v2 archive (2026-10)', 'archive labels');
ok(whPageType('water-heater') === 'service' && whPageType('tankless-water-heater') === 'sub-service' && whPathFor('water-heater') === '/services/water-heater', 'water heater answers unchanged');
ok(whTemplateOf({ template: EM_V2_MARKER, whV2: codeEmHubStored(), metaTitle: '', metaDescription: '' }) === 'em-hub', 'whTemplateOf stamps em-hub');
ok(isWhV2DraftContent({ template: EM_V2_MARKER, whV2: {}, metaTitle: '', metaDescription: '' }) && !isWhV2DraftContent({ heroHeading: 'x' }), 'the pre-v2 editor shape is old-shaped');
{
  const wrong = [
    ['water heater content on the emergency hub', 'emergency-plumbing', 'emergency-plumbing', { template: WH_V2_MARKER, whV2: codeWhHubStored(), metaTitle: 'x', metaDescription: 'y' }],
    ['emergency content on the water heater hub', 'service', 'water-heater', { template: EM_V2_MARKER, whV2: codeEmHubStored(), metaTitle: 'x', metaDescription: 'y' }],
    ['emergency content under the wrong page type', 'service', 'emergency-plumbing', { template: EM_V2_MARKER, whV2: codeEmHubStored(), metaTitle: 'x', metaDescription: 'y' }],
  ] as const;
  for (const [name, type, slug, c] of wrong) {
    let threw = false;
    try {
      conformWhContent(type, slug, c as never);
    } catch {
      threw = true;
    }
    ok(threw, `${name} → refused (422)`);
  }
}

console.log('\n3. Section order + copy decisions');
{
  const s = codeEmHubStored();
  const order = s.sections.map((x) => (x.kind === 'panel' ? `panel:${(x.el as WhTreeElement).attrs?.id ?? (x.el as WhTreeElement).cls}` : x.kind));
  ok(J(order) === J(['panel:trust-stripe', 'reviews', 'panel:services', 'panel:wait', 'panel:why-us', 'panel:hub-fin', 'locations', 'panel:business', 'panel:no-drip-club', 'faq', 'panel:sec final-cta']), `locked order: ${order.join(' → ')}`);
  const final = el(s, s.sections.length - 1);
  ok(!final.attrs?.id && !J(final).includes('Schedule a Service') && J(final).includes('"phone"'), 'final CTA: phone button only, no #book id (decision 0.4)');
  const loc = s.sections[idx(s, 'locations')] as Extract<WhSection, { kind: 'locations' }>;
  ok(loc.states.length === 2 && loc.states[0].offices.length === 18 && loc.states[1].offices.length === 1 && loc.states.flatMap((x) => x.offices).every((o) => /^\/[a-z-]+\/emergency-plumbing$/.test(o.href)), 'locations: 18 Illinois + 1 Ohio office, all /{office}/emergency-plumbing');
  ok(loc.map.src.startsWith('https://maps.google.com/maps?hl=en&q=J.%20Blanton%20Plumbing%2C%20Sewer%20%26%20Drain'), 'map embed = the live sewer hub’s (§1 #10)');
  ok(J(EM_SHARED_DEFAULT.quickLinks.links.map((l) => l.href)) === J(['#wait', '#locations', '/financing', '#faq']), 'hero pills');
  ok(EM_HUB.meta.title === '24/7 Emergency Plumbers in Illinois & Ohio', 'title without the brand (the layout adds “| J. Blanton Plumbing”)');
  ok(EM_HUB.hero.h1 === '24/7 Emergency Plumbing Services' && EM_HUB.hero.words.length === 0, 'visible H1, no rotator');
  ok(J(el(s, panelById(s, 'services'))).match(/"tag":"a"/g) === null && J(el(s, panelById(s, 'wait'))).match(/"tag":"a"/g) === null, 'checklist and steps carry no links');
  const rev = s.sections[idx(s, 'reviews')] as Extract<WhSection, { kind: 'reviews' }>;
  // Marketing 2026-11-03: each name links to its Google review (was unlinked at launch).
  ok(rev.items.length === 3 && rev.items.every((r) => /^https:\/\/maps\.app\.goo\.gl\/\w+$/.test(r.href)) && rev.items[0].quote.includes('😭'), 'three reviews, names linked to their Google reviews, the emoji kept verbatim');
  ok(!/7737249272|773-724-9272/.test(J([EM_HUB, EM_SHARED_DEFAULT])), 'no literal phone anywhere in the code module');
  ok(!/(?<![\d.])4\.7(?!\d)/.test(J([EM_HUB, EM_SHARED_DEFAULT])), 'no literal 4.7 anywhere in the code module');
  ok(J(EM_SHARED_DEFAULT.proof).includes('{{company_rating}}') && J(EM_SHARED_DEFAULT.proof).includes('{{company_review_count}}'), 'the rating card carries the Brief 221 tokens');
}

console.log('\n4. Editable: words, alt text, reviews, FAQ, offices');
{
  const s = codeEmHubStored();
  const v = clone(s);
  v.hero.intro = 'Edited intro.';
  v.hero.image.alt = 'New alt text';
  const rev = v.sections[idx(v, 'reviews')] as Extract<WhSection, { kind: 'reviews' }>;
  rev.items[0].href = 'https://maps.app.goo.gl/abcdef';
  rev.items[1].quote = '“Edited.”';
  rev.intro = 'Edited intro line.';
  const faq = v.sections[idx(v, 'faq')] as Extract<WhSection, { kind: 'faq' }>;
  faq.items[0].q = 'Edited question?';
  const loc = v.sections[idx(v, 'locations')] as Extract<WhSection, { kind: 'locations' }>;
  loc.states[0].offices[0].href = '';
  loc.states[0].offices.push({ label: 'Oak Park', href: '/oak-park/emergency-plumbing' });
  loc.states[1].offices.reverse();
  const why = el(v, panelById(v, 'why-us'));
  const img = find(why, (e) => e.tag === 'img')!;
  img.attrs = { ...img.attrs, alt: 'Edited van alt' };
  const r = conformWhHub(v, s, S);
  ok(r.errors.length === 0, `allowed edits conform${r.errors.length ? ` — ${errs(r)}` : ''}`);
  const rl = r.value.sections[idx(v, 'locations')] as Extract<WhSection, { kind: 'locations' }>;
  ok(rl.states[0].offices[0].href === '' && rl.states[0].offices.length === 19, 'an office can be unlinked (plain text) and offices added');
  ok((r.value.sections[idx(v, 'reviews')] as Extract<WhSection, { kind: 'reviews' }>).items[0].href === 'https://maps.app.goo.gl/abcdef', 'a Google review link can be added');
  ok(J(find(el(r.value, panelById(r.value, 'why-us')), (e) => e.tag === 'img')!.attrs) .includes('Edited van alt'), 'a panel image alt is editable');
}

console.log('\n5. Locked: layout changes and the brief’s hard rules are refused (422)');
{
  const s = codeEmHubStored();
  const cases: [string, (v: WhHubStored) => void, string][] = [
    ['a section removed', (v) => { v.sections.pop(); }, 'structure'],
    ['sections reordered', (v) => { v.sections.reverse(); }, 'structure'],
    ['the template version changed', (v) => { (v as { template: string }).template = 'wh-hub'; }, 'structure'],
    ['the rotating headline turned on', (v) => { v.hero.words = ['Chicagoland']; }, 'structure'],
    ['the map embed changed', (v) => { (v.sections[idx(v, 'locations')] as Extract<WhSection, { kind: 'locations' }>).map.src = 'https://www.google.com/maps?q=x&output=embed'; }, 'structure'],
    ['the reviews intro removed', (v) => { delete (v.sections[idx(v, 'reviews')] as { intro?: string }).intro; }, 'structure'],
    ['the financing band edited', (v) => { const f = find(el(v, panelByCls(v, 'hub-fin')), (e) => e.tag === 'h2')!; f.kids = ['Financing from ACME Bank']; }, 'value'],
    ['the fixed financing copy edited', (v) => { v.shared.financing.body = 'Financing by ACME Bank.'; }, 'structure'],
    ['a link added to the emergency checklist', (v) => { const p = find(el(v, panelById(v, 'services')), (e) => e.tag === 'p' && (e.cls ?? '').includes('t-body-sm'))!; p.kids = ['See ', { tag: 'a', attrs: { href: '/sewer-repair' }, kids: ['sewer repair'] }]; }, 'link'],
    ['a link added to the While You Wait steps', (v) => { const p = find(el(v, panelById(v, 'wait')), (e) => e.tag === 'p' && (e.cls ?? '').includes('t-body-sm') && !(e.style ?? '').includes('18px'))!; p.kids = [{ tag: 'a', attrs: { href: '/gas-lines' }, kids: ['gas'] }]; }, 'link'],
    ['a literal phone in the hero', (v) => { v.hero.intro = 'Call 773-724-9272 now.'; }, 'phone'],
    ['a tel: office link', (v) => { (v.sections[idx(v, 'locations')] as Extract<WhSection, { kind: 'locations' }>).states[0].offices[0].href = 'tel:7737249272'; }, 'phone'],
    ['a typed rating in a review', (v) => { (v.sections[idx(v, 'reviews')] as Extract<WhSection, { kind: 'reviews' }>).items[0].quote = 'Rated 4.7 stars!'; }, 'value'],
    ['a typed rating on the card', (v) => { v.shared.proof.rating = '4.7'; }, 'value'],
  ];
  for (const [name, mutate, kind] of cases) {
    const v = clone(s);
    mutate(v);
    const r = conformWhHub(v, s, S);
    ok(r.errors.some((e) => e.kind === kind), `${name} → ${kind} error${r.errors.some((e) => e.kind === kind) ? '' : ` (got: ${errs(r).slice(0, 200) || 'none'})`}`);
  }
  // Read path: a STRUCTURE error makes the page render the code module; a value error is only for saves.
  const broken = clone(s);
  broken.sections.splice(2, 1);
  ok(conformWhHub(broken, s, S).errors.some((e) => e.kind === 'structure'), 'a stored row missing a section is a structure error (→ the code module renders)');
}

console.log('\n6. Schema: one graph, FAQPage = the visible FAQ, aggregateRating only when shown, no phone');
{
  const faq = EM_HUB.sections.find((x) => x.kind === 'faq') as Extract<WhSection, { kind: 'faq' }>;
  const g = emergencyJsonLd({ path: '/emergency-plumbing', title: 'T | J. Blanton Plumbing', description: 'D', crumbLabel: 'Emergency Plumbing', service: EM_HUB.service, faqs: faq.items, phoneDisplay: '312-555-0100', aggregateRating: null });
  ok(g['@graph'].map((n) => n['@type']).join(',') === 'Organization,WebPage,BreadcrumbList,Service,FAQPage', 'node list');
  const f = g['@graph'].find((n) => n['@type'] === 'FAQPage') as { mainEntity: { name: string; acceptedAnswer: { text: string } }[] };
  ok(f.mainEntity.length === 8 && f.mainEntity[7].acceptedAnswer.text === 'Yes. We serve homeowners in Columbus and the surrounding area. See our Columbus emergency plumbing page or call us to get started.', 'FAQ #8 = the copy doc’s schema text');
  ok(!J(g).includes('aggregateRating') && !J(g).includes('"Plumber"') && !J(g).includes('servicePhone'), 'no aggregateRating without the card, no Plumber, no phone');
  const crumbs = (g['@graph'].find((n) => n['@type'] === 'BreadcrumbList') as { itemListElement: { name: string }[] }).itemListElement.map((x) => x.name);
  ok(J(crumbs) === J(['Home', 'Services', 'Emergency Plumbing']), `breadcrumb ${crumbs.join(' › ')}`);
}

console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL PASSED');
process.exit(failures ? 1 : 0);
