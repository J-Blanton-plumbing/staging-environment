/**
 * Brief 209 CMS wiring — offline tests for the City v2 CMS model (no DB, no network).
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/test-brief-209-city-v2-model.ts
 *
 * Proves the round trip the wiring depends on: every one of the 145 service-page code modules and the
 * 5 hub code modules → conform (with the REAL server sanitisers) is IDENTICAL to the code module (so
 * the deploy seed stores exactly what renders today); and that the guards refuse what they must:
 * layout changes, literal phones, tel: links, bad links, old-shaped content on these pages, v2 content
 * anywhere else, a hub with other than three reviews. Exits 1 on any failure.
 */
import { CITY_V2_CITIES, CITY_V2_SERVICES } from '../src/lib/content/city-services-v2/registry';
import { codeHubStored, codeServiceStored } from '../src/lib/city-v2-cms/code-defaults';
import { conformCityHub, conformCityService } from '../src/lib/city-v2-cms/conform';
import { CITY_V2_TEMPLATE, isCityV2Target } from '../src/lib/city-v2-cms/model';
import { prepareCityV2VersionContent } from '../src/lib/cms/city-v2-write';
import { SEWER_V2_SANITIZERS as S } from '../src/lib/cms/sewer-v2-sanitize';
import type { SewerElement, SewerNode } from '../src/lib/content/sewer-v2/types';
import type { CityServiceStored } from '../src/lib/content/city-services-v2/types';

let failures = 0;
let passes = 0;
const ok = (cond: boolean, msg: string, quiet = false) => {
  if (cond) {
    passes++;
    if (!quiet) console.log(`  ok   ${msg}`);
  } else {
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
    return `${path}: key order ${J(Object.keys(a as object))} vs ${J(Object.keys(b as object))}`;
  }
  return `${path}: ${J(a)?.slice(0, 120)} ≠ ${J(b)?.slice(0, 120)}`;
}

console.log('\n1. The 145 service pages: code → conform(real sanitisers) is identical (quiet unless a page fails)');
for (const city of CITY_V2_CITIES) {
  for (const service of CITY_V2_SERVICES) {
    const code = codeServiceStored(city, service)!;
    const { value, errors } = conformCityService(clone(code), code, S);
    ok(errors.length === 0, `${city}/${service}: conform reports no issues${errors.length ? ` — ${J(errors.slice(0, 3))}` : ''}`, true);
    const d = firstDiff(value, code);
    ok(!d, `${city}/${service}: conformed value identical to the code module${d ? ` — first diff ${d}` : ''}`, true);
  }
}
console.log(`  ${passes} checks so far`);

console.log('\n2. The 5 hubs (+ hub template sections + shared service-page parts): code → conform is identical');
for (const city of CITY_V2_CITIES) {
  const code = codeHubStored(city)!;
  const { value, errors } = conformCityHub(clone(code), code, S);
  ok(errors.length === 0, `${city}: conform reports no issues${errors.length ? ` — ${J(errors.slice(0, 3))}` : ''}`);
  const d = firstDiff(value, code);
  ok(!d, `${city}: conformed value identical to the code module${d ? ` — first diff ${d}` : ''}`);
}

console.log('\n3. Guards');
const svc = codeServiceStored('northbrook', 'drain-cleaning')!;
const firstPanel = (v: CityServiceStored) => v.sections.find((s) => s.kind === 'panel') as Extract<CityServiceStored['sections'][number], { kind: 'panel' }>;
const firstEl = (nodes: SewerNode[]) => nodes.find((n): n is SewerElement => typeof n === 'object' && 'tag' in n)!;
{
  const v = clone(svc);
  firstEl(firstPanel(v).body).cls = 'ss-split rev';
  const { errors } = conformCityService(v, svc, S);
  ok(errors.some((e) => e.kind === 'structure'), 'a changed panel class is a layout error');
}
{
  const v = clone(svc);
  v.sections = v.sections.slice(1);
  ok(conformCityService(v, svc, S).errors.some((e) => e.kind === 'structure'), 'a removed section is a layout error');
}
{
  const v = clone(svc);
  v.hero.intro = 'Call 773-724-9272 today.';
  ok(conformCityService(v, svc, S).errors.some((e) => e.kind === 'phone'), 'a literal phone number is refused');
}
{
  const v = clone(svc);
  v.hero.heading = '<script>alert(1)</script>Drain Cleaning';
  const out = conformCityService(v, svc, S).value;
  ok(!out.hero.heading.includes('<script'), 'markup in a plain field is stripped');
}
{
  const hub = codeHubStored('joliet')!;
  const v = clone(hub);
  v.hub.reviews.items = v.hub.reviews.items.slice(0, 2);
  ok(conformCityHub(v, hub, S).errors.some((e) => e.kind === 'structure'), 'a hub with two reviews is a layout error');
  const w = clone(hub);
  w.hub.ndc = ['See the ', { tag: 'a', attrs: { href: 'tel:7737249272' }, kids: ['club'] }];
  ok(conformCityHub(w, hub, S).errors.some((e) => e.kind === 'phone'), 'a tel: link in rich text is refused');
  const x = clone(hub);
  x.hub.office.body = ['Visit ', { tag: 'a', attrs: { href: 'javascript:alert(1)' }, kids: ['us'] }];
  ok(conformCityHub(x, hub, S).errors.some((e) => e.kind === 'link'), 'a javascript: link is refused');
  const y = clone(hub);
  y.hub.office.body = ['Visit ', { tag: 'a', attrs: { href: '/joliet/sewer-repair' }, kids: ['sewer repair'] }, '.'];
  ok(conformCityHub(y, hub, S).errors.length === 0, 'a site-path link in a rich field is accepted');
  const z = clone(hub);
  z.hub.reviews.items[0].url = '';
  ok(conformCityHub(z, hub, S).errors.length === 0 && conformCityHub(z, hub, S).value.hub.reviews.items[0].url === '', "a review's Google link can be removed (left empty)");
  const sv = clone(hub);
  (sv.hubShared.videoJsonLd as Record<string, string>)['@type'] = 'Thing';
  ok(conformCityHub(sv, hub, S).errors.some((e) => e.kind === 'structure'), 'the VideoObject @type is locked');
}
{
  ok(isCityV2Target('city-service', 'columbus/drain-cleaning') && isCityV2Target('city', 'naperville'), 'targets: the 150 pages');
  ok(!isCityV2Target('city-service', 'evanston/drain-cleaning') && !isCityV2Target('city', 'evanston') && !isCityV2Target('city-service', 'columbus/clogged-drains'), 'targets: nothing else (incl. a folded URL)');
  let threw = '';
  try {
    prepareCityV2VersionContent('city-service', 'joliet/drain-cleaning', { serviceIntroHeading: 'x' });
  } catch (e) {
    threw = (e as Error).message;
  }
  ok(/old layout/.test(threw), 'old-shaped content is refused on a City v2 page');
  threw = '';
  try {
    prepareCityV2VersionContent('city-service', 'evanston/drain-cleaning', { template: CITY_V2_TEMPLATE, cityV2: {}, metaTitle: '', metaDescription: '' });
  } catch (e) {
    threw = (e as Error).message;
  }
  ok(/only be saved on the City v2 pages/.test(threw), 'v2 content is refused on any other page');
  const passthrough = { serviceIntroHeading: 'x' };
  ok(prepareCityV2VersionContent('city-service', 'evanston/drain-cleaning', passthrough) === passthrough, 'every other page passes through unchanged');
}

console.log(`\n${failures ? `FAILED: ${failures} check(s)` : 'all checks passed'} (${passes} passed)`);
process.exit(failures ? 1 : 0);
