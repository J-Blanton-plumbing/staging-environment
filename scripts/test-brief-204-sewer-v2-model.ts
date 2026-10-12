/**
 * Brief 204 — offline tests for the Sewer v2 CMS model (no DB, no network).
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/test-brief-204-sewer-v2-model.ts
 *
 * Proves the round trip the whole brief depends on: every code module → stored shape → conform
 * (with the REAL server sanitisers) → render model is IDENTICAL to the code module, including all 9
 * VideoObject blocks byte for byte; and that the guards refuse what they must (script tags stripped,
 * literal phones / tel: links / layout changes rejected). Exits 1 on any failure.
 */
import { SEWER_V2_PAGES } from '../src/lib/content/sewer-v2';
import { codeHubStored } from '../src/lib/sewer-v2-cms/code-defaults';

import { pageToStored, storedToPage, type SewerHubStored } from '../src/lib/sewer-v2-cms/model';
import { conformHub, conformService } from '../src/lib/sewer-v2-cms/conform';
import { htmlToInlineNodes, inlineNodesToHtml, isInlineOnly } from '../src/lib/sewer-v2-cms/rich';
import { SEWER_V2_SANITIZERS as S } from '../src/lib/cms/sewer-v2-sanitize';
import type { SewerNode } from '../src/lib/content/sewer-v2/types';

let failures = 0;
const ok = (cond: boolean, msg: string) => {
  if (cond) console.log(`  ok   ${msg}`);
  else { failures++; console.log(`  FAIL ${msg}`); }
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
    return `${path}: key order ${J(Object.keys(a as object))} vs ${J(Object.keys(b as object))}`;
  }
  return `${path}: ${J(a)?.slice(0, 120)} ≠ ${J(b)?.slice(0, 120)}`;
}

console.log('\n1. Service pages: code → stored → conform(real sanitisers) → page is identical');
for (const [slug, page] of Object.entries(SEWER_V2_PAGES)) {
  const stored = pageToStored(page);
  const { value, errors } = conformService(clone(stored), stored, S);
  ok(errors.length === 0, `${slug}: conform reports no issues${errors.length ? ` — ${J(errors.slice(0, 3))}` : ''}`);
  const d = firstDiff(value, stored);
  ok(!d, `${slug}: conformed value identical to the stored object${d ? ` — first diff ${d}` : ''}`);
  const back = storedToPage(slug, value, page.meta);
  const d2 = firstDiff(back, page);
  ok(!d2, `${slug}: render model identical to the code module${d2 ? ` — first diff ${d2}` : ''}`);
  ok(J(back.videoSchema) === J(page.videoSchema), `${slug}: VideoObject byte-identical`);
}

console.log('\n2. Hub + shared: code → stored → conform → identical');

const hubStored: SewerHubStored = codeHubStored();
{
  const { value, errors } = conformHub(clone(hubStored), hubStored, S);
  ok(errors.length === 0, `hub: conform reports no issues${errors.length ? ` — ${J(errors.slice(0, 3))}` : ''}`);
  const d = firstDiff(value, hubStored);
  ok(!d, `hub: conformed value identical${d ? ` — first diff ${d}` : ''}`);
}

console.log('\n3. Rich text converter round trip on every inline field of every page');
let richCount = 0;
const walk = (nodes: readonly SewerNode[] | undefined) => {
  for (const n of nodes ?? []) {
    if (typeof n !== 'object' || !('tag' in n)) continue;
    if (['p', 'li', 'td'].includes(n.tag) && isInlineOnly(n.kids) && (n.kids ?? []).some((k) => typeof k !== 'string')) {
      richCount++;
      const back = htmlToInlineNodes(inlineNodesToHtml(n.kids ?? []));
      const strip = (ns: SewerNode[]): unknown => ns.map((x) => (typeof x === 'object' && 'tag' in x ? { tag: x.tag, attrs: x.attrs, kids: strip(x.kids ?? []) } : x));
      ok(J(strip(back)) === J(strip(n.kids ?? [])), `rich field round-trips: "${inlineNodesToHtml(n.kids ?? []).slice(0, 60)}"`);
    }
    walk(n.kids);
  }
};
for (const page of Object.values(SEWER_V2_PAGES)) for (const s of page.sections) if (s.kind === 'panel') walk(s.body);
ok(richCount > 0, `${richCount} mixed inline fields checked`);

console.log('\n4. Guards');
const rodding = pageToStored(SEWER_V2_PAGES['sewer-rodding']);
{
  const v = clone(rodding);
  v.hero.heading = 'Sewer <script>alert(1)</script>Rodding';
  const faq = v.sections.find((s) => s.kind === 'faq') as Extract<(typeof v.sections)[number], { kind: 'faq' }>;
  faq.items[0].q = 'How much <script>x()</script>does it cost?';
  const { value, errors } = conformService(v, rodding, S);
  const f2 = value.sections.find((s) => s.kind === 'faq') as typeof faq;
  ok(value.hero.heading === 'Sewer Rodding' && !J(value).includes('<script'), '<script> in a top-level field is stripped');
  ok(f2.items[0].q === 'How much does it cost?', '<script> in a repeater item (FAQ question) is stripped');
  ok(errors.length === 0, 'stripping is not an error');
}
{
  const v = clone(rodding);
  v.hero.intro = 'Call 773-724-9272 today';
  const r = conformService(v, rodding, S);
  ok(r.errors.some((e) => e.kind === 'phone'), 'a literal phone number in a field is rejected');
}
{
  const v = clone(rodding);
  const rev = v.sections.find((s) => s.kind === 'reviews') as Extract<(typeof v.sections)[number], { kind: 'reviews' }>;
  rev.items[0].href = 'tel:7737249272';
  ok(conformService(v, rodding, S).errors.some((e) => e.kind === 'phone'), 'a tel: link is rejected');
}
{
  const v = clone(rodding);
  (v.sections[0] as { tint: boolean }).tint = true;
  ok(conformService(v, rodding, S).errors.some((e) => e.kind === 'structure'), 'changing a panel’s tint is a layout change → rejected');
  const w = clone(rodding);
  w.sections.reverse();
  ok(conformService(w, rodding, S).errors.some((e) => e.kind === 'structure'), 'reordering sections → rejected');
  const x = clone(rodding);
  const panel = x.sections[0] as { body: SewerNode[] };
  (panel.body[0] as { cls: string }).cls = 'ss-split rev';
  ok(conformService(x, rodding, S).errors.some((e) => e.kind === 'structure'), 'changing a class → rejected');
}
{
  // Add a card to a grid (repeater) and a FAQ; reorder FAQ; remove a card — all allowed.
  const v = clone(rodding);
  const panel = v.sections.find((s) => s.kind === 'panel' && s.id === 'when-you-need-sewer-rodding') as { body: SewerNode[] };
  const grid = panel.body[3] as { kids: SewerNode[] };
  grid.kids.push(clone(grid.kids[0]));
  grid.kids.splice(1, 1);
  const faq = v.sections.find((s) => s.kind === 'faq') as Extract<(typeof v.sections)[number], { kind: 'faq' }>;
  faq.items.push({ q: 'New question?', preview: 'Short.', full: ['Long, with a ', { tag: 'a', attrs: { href: '/financing' }, kids: ['link'] }, '.'] });
  faq.items.reverse();
  const r = conformService(v, rodding, S);
  ok(r.errors.length === 0, `list edits (add/remove/reorder items) are allowed${r.errors.length ? ` — ${J(r.errors.slice(0, 2))}` : ''}`);
}
{
  // A link added to a carmine-link paragraph takes the paragraph's approved style.
  const cam = pageToStored(SEWER_V2_PAGES['sewer-camera-inspection']);
  const v = clone(cam);
  const html = J(v);
  const marker = 'Routine checks';
  ok(html.includes(marker), 'camera page has the carmine-link tile');
  const r = conformService(JSON.parse(html.replace(/"style":"color:var\(--c-carmine\)",/g, '')), cam, S);
  ok(J(r.value) === J(cam), 'stripped inline styles are restored from the code module');
}
{
  const v = clone(hubStored);
  v.shared.hubFeatured = 'not-a-service';
  ok(conformHub(v, hubStored, S).errors.some((e) => e.path === 'shared.hubFeatured'), 'hub featured service must be in the list');
  const w = clone(hubStored);
  w.shared.services.reverse();
  ok(conformHub(w, hubStored, S).errors.length === 0, 'reordering the services list is allowed');
  const x = clone(hubStored);
  x.hub.whyUs.chart.bars[0].color = '#000000';
  ok(conformHub(x, hubStored, S).errors.some((e) => e.kind === 'structure'), 'chart bar colours are locked');
}

console.log(`\n${failures === 0 ? 'ALL PASSED' : `${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
