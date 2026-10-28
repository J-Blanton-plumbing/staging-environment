/**
 * Brief 188 (Track F5) — prebuild JSON-LD check (no DB, no network, no server).
 *
 * Builds the Knowledge Hub structured data from the SAME pure builders the pages
 * call — `buildBlogPosting` (ArticleSchema), `breadcrumbListJsonLd`
 * (Breadcrumbs) and the `kh-crumbs` trails — for fixtures covering every branch,
 * then runs `checkJsonLd` over each page's blocks. Exits 1 on a code defect only;
 * there is no editor content in here to be "wrong".
 *
 * Fixtures:
 *   • an imported article WITH a hero image and a topic
 *   • an imported article WITHOUT an image or a topic
 *   • a CMS-created article (wpPostId null) — none exists yet, so this is the
 *     fixture the brief asks for — with a first and a later publish
 *   • an imported article whose title is over 110 characters
 *   • a topic page, a city area page, a region area page
 * Its live counterpart is the JSON-LD phase of scripts/validate-seo-routing.mjs,
 * which runs the same checks on real rendered pages after each deploy.
 */
import { buildBlogPosting, HEADLINE_MAX, type BlogPostingInput } from '../src/lib/schema/blog-posting';
import { breadcrumbListJsonLd } from '../src/lib/schema/breadcrumb-list';
import { aggregateRatingProblems, checkJsonLd, CITY_PAGE_FORBIDDEN_TYPES, HOMEPAGE_FORBIDDEN_TYPES } from '../src/lib/schema/jsonld-assert';
import { aggregateRatingJsonLd } from '../src/lib/schema/aggregate-rating';
import { renderRatingField, ratingShownIn } from '../src/lib/cms/tokens';
import { faqPageJsonLd, schemaPhone } from '../src/lib/schema/city-pages';
import { applyHubRatings, blankCityHub, hubPlumberJsonLd, type CityHubStored } from '../src/lib/city-hub-cms/model';
import { articleCrumbs, termCrumbs } from '../src/lib/cms/kh-crumbs';
import { ORG_ID, ORG_LOGO_URL, organizationNode } from '../src/lib/schema/organization-ref';
import { homepageJsonLd, HOME_PACKAGE_DEPARTMENT_IDS } from '../src/lib/schema/homepage';
import { canonicalUrlFor } from '../src/lib/seo';
import { SITE } from '../src/lib/site';

const fail: string[] = [];
const expect = (ok: boolean, msg: string) => {
  if (!ok) fail.push(msg);
};

const imported = (over: Partial<BlogPostingInput>): BlogPostingInput => ({
  title: 'Why Your Sewer Line Backs Up in Spring',
  metaDescription: '',
  excerpt: 'Spring thaw and heavy rain overload old sewer lines.',
  image: 'https://d1rplazj5a80fb.cloudfront.net/images/example.webp',
  canonical: canonicalUrlFor('/knowledge-hub/example'),
  wpPostId: 45000,
  createdAt: new Date('2026-02-18T12:20:54Z'),
  firstPublishedAt: null,
  lastPublishedAt: null,
  ...over,
});

const pages: Array<{ name: string; blocks: string[] }> = [];
const page = (name: string, ...objs: unknown[]) => pages.push({ name, blocks: objs.map((o) => JSON.stringify(o)) });

// 1. imported, with image + topic
const a1 = buildBlogPosting(imported({}));
page(
  'article (imported, image, topic)',
  a1,
  breadcrumbListJsonLd(articleCrumbs({ slug: 'example', title: 'Why Your Sewer Line Backs Up in Spring' }, { slug: 'sewers', name: 'Sewers' }), SITE.baseUrl)
);
expect(!('datePublished' in a1) && !('dateModified' in a1), 'imported article must carry NO dates');
expect(Array.isArray(a1.image) && a1.image[0].startsWith('https://'), 'imported article with a hero must carry an absolute image');
expect(a1.author['@id'] === ORG_ID && a1.publisher['@id'] === ORG_ID, 'author/publisher must reference the Organization id');
expect(a1.url === a1.mainEntityOfPage['@id'], 'url and mainEntityOfPage must agree');

// 2. imported, no image, no topic; meta description preferred over the excerpt
const a2 = buildBlogPosting(imported({ image: '', metaDescription: 'Meta wins.' }));
page('article (imported, no image, no topic)', a2, breadcrumbListJsonLd(articleCrumbs({ slug: 'example-2', title: 'No image here' }, null), SITE.baseUrl));
expect(!('image' in a2), 'an article with no hero must OMIT image (no placeholder)');
expect(a2.description === 'Meta wins.', 'meta description must win over the excerpt');
const a2b = buildBlogPosting(imported({ metaDescription: '', excerpt: '' }));
expect(!('description' in a2b), 'description must be omitted when meta and excerpt are both empty');

// 3. CMS-created (fixture)
const a3 = buildBlogPosting(
  imported({
    wpPostId: null,
    image: '/images/local-hero.webp',
    createdAt: new Date('2026-10-01T09:00:00Z'),
    firstPublishedAt: new Date('2026-10-02T15:00:00Z'),
    lastPublishedAt: new Date('2026-10-20T10:30:00Z'),
  })
);
page('article (CMS-created fixture)', a3);
expect(a3.datePublished === '2026-10-02T15:00:00.000Z', 'CMS article datePublished = first editorial publish');
expect(a3.dateModified === '2026-10-20T10:30:00.000Z', 'CMS article dateModified = latest publish when later');
expect(!!a3.image && a3.image[0].startsWith(canonicalUrlFor('/')), 'a site-relative hero becomes absolute on the canonical origin');
const a3b = buildBlogPosting(imported({ wpPostId: null, createdAt: new Date('2026-10-01T09:00:00Z') }));
expect(a3b.datePublished === '2026-10-01T09:00:00.000Z' && !('dateModified' in a3b), 'no editorial publish → created_at, and no dateModified');

// 4. long title
const long = 'A'.repeat(20) + ' ' + 'word '.repeat(30);
const a4 = buildBlogPosting(imported({ title: long }));
expect(a4.headline.length <= HEADLINE_MAX, `headline must be ≤ ${HEADLINE_MAX} chars (got ${a4.headline.length})`);
expect(!a4.headline.endsWith(' '), 'headline must be cut at a word boundary');

// 5. topic, city area, region area
page('topic page', breadcrumbListJsonLd(termCrumbs({ type: 'topic', slug: 'sewers', name: 'Sewers', parentSlug: null, parentName: null }), SITE.baseUrl));
const cityTrail = termCrumbs({ type: 'location', slug: 'evanston', name: 'Evanston', parentSlug: 'chicagoland', parentName: 'Chicagoland' });
expect(cityTrail.map((c) => c.label).join(' › ') === 'Home › Knowledge Hub › Chicagoland › Evanston', 'city area trail');
page('area page (city)', breadcrumbListJsonLd(cityTrail, SITE.baseUrl));
page(
  'area page (region)',
  breadcrumbListJsonLd(termCrumbs({ type: 'location', slug: 'chicagoland', name: 'Chicagoland', parentSlug: null, parentName: null }), SITE.baseUrl)
);

// A negative control, so the checker itself is proven to catch what it claims to.
const neg = checkJsonLd(['{not json', JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage' }),
  JSON.stringify({ '@context': 'https://schema.org', '@type': 'BreadcrumbList' }), JSON.stringify({ '@context': 'https://schema.org', '@type': 'BreadcrumbList' })]);
expect(neg.errors.some((e) => e.includes('does not parse')), 'checker must reject unparseable JSON');
expect(neg.errors.some((e) => e.includes('forbidden type present: FAQPage')), 'checker must reject forbidden types');
expect(neg.errors.some((e) => e.includes('duplicate BreadcrumbList')), 'checker must reject a duplicate BreadcrumbList');

// Canonical agreement (F4): the breadcrumb item base and the canonical base.
expect(
  SITE.baseUrl === canonicalUrlFor('/'),
  `SITE.baseUrl (${SITE.baseUrl}) must equal CANONICAL_BASE (${canonicalUrlFor('/')}) or BreadcrumbList items disagree with canonicals`
);

for (const p of pages) {
  const r = checkJsonLd(p.blocks);
  for (const e of r.errors) fail.push(`${p.name}: ${e}`);
}

// Brief 216 — the City Hub / City Service V2 blocks, from the SAME builders the views call: the hub's
// Plumber node (fixed key order, GBP link) and one FAQPage from a visible FAQ, checked with the city
// templates' allowance (FAQPage permitted there only). A Plumber without a GBP link is not emitted.
const hubFixture = {
  slug: 'evanston',
  name: 'Evanston',
  office: {
    eyebrow: '', h2: '', body: '', areasH3: '', more: '/locations/chicagoland',
    address: '1603 Orrington Ave, #600-1085, Evanston, IL 60201',
    areas: [{ label: 'Wilmette', href: '/wilmette' }, { label: 'Rogers Park', href: '/chicago-rogers-park', area: 'Rogers Park, Chicago, IL' }],
    gbpUrl: 'https://maps.app.goo.gl/QepapnaFhikLrpAe8',
  },
};
const plumber = hubPlumberJsonLd(hubFixture, '773-724-9272', schemaPhone);
expect(!!plumber, 'a hub with a GBP link emits a Plumber node');
expect(
  Object.keys(plumber ?? {}).join(',') === '@context,@type,@id,name,parentOrganization,url,sameAs,hasMap,telephone,address,openingHoursSpecification,areaServed',
  'the Plumber node keeps the Brief 216 key order (+ Brief 218 parentOrganization after name)'
);
expect(plumber?.telephone === '+1-773-724-9272' && plumber.hasMap === plumber.sameAs[0], 'Plumber telephone is E.164-style and hasMap = sameAs');
expect(JSON.stringify(plumber?.areaServed) === '["Evanston, IL","Wilmette, IL","Rogers Park, Chicago, IL"]', 'areaServed = city + communities, area override honoured');
expect(hubPlumberJsonLd({ ...hubFixture, office: { ...hubFixture.office, gbpUrl: undefined } }, '773-724-9272', schemaPhone) === null, 'no GBP link → no Plumber node');
const faq = faqPageJsonLd([{ q: 'Who is responsible?', a: 'The owner. See [sewer repair](/evanston/sewer-repair) **now**.' }]);
expect(faq.mainEntity[0].acceptedAnswer.text === 'The owner. See sewer repair now.', 'FAQPage answer text = the full answer, links reduced to labels, ** removed');
const city = checkJsonLd([JSON.stringify(plumber), JSON.stringify(faq)], CITY_PAGE_FORBIDDEN_TYPES);
for (const e of city.errors) fail.push(`city hub fixture: ${e}`);
expect(checkJsonLd([JSON.stringify(faq)]).errors.some((e) => e.includes('forbidden type present: FAQPage')), 'FAQPage stays forbidden on every other page type');

// Brief 217 (Track C) — one location per city page. The Highland Park node, from data exactly as
// Marketing specified it (Brief 217 §C4): no geo, telephone from Global Settings (the 773 number).
const HP_AREAS = ['Highwood', 'Fort Sheridan', 'Deerfield', 'Bannockburn', 'Riverwoods', 'Lake Forest', 'Lake Bluff', 'Glencoe'];
const hpNode = hubPlumberJsonLd(
  {
    slug: 'highland-park',
    name: 'Highland Park',
    office: {
      eyebrow: '', h2: '', body: '', areasH3: '', more: '/locations/chicagoland',
      address: '1904 Green Bay Rd B, Highland Park, IL 60035',
      areas: HP_AREAS.map((label) => ({ label, href: `/${label.toLowerCase().replace(/ /g, '-')}` })),
      gbpUrl: 'https://maps.app.goo.gl/2TwjsZRjsfZmukRr6',
    },
  },
  '773-724-9272',
  schemaPhone
);
const HP_EXPECTED = {
  '@context': 'https://schema.org',
  '@type': 'Plumber',
  '@id': 'https://jblantonplumbing.com/highland-park#office',
  name: 'J. Blanton Plumbing - Highland Park',
  parentOrganization: { '@id': 'https://jblantonplumbing.com/#organization' },
  url: 'https://jblantonplumbing.com/highland-park',
  sameAs: ['https://maps.app.goo.gl/2TwjsZRjsfZmukRr6'],
  hasMap: 'https://maps.app.goo.gl/2TwjsZRjsfZmukRr6',
  telephone: '+1-773-724-9272',
  address: { '@type': 'PostalAddress', streetAddress: '1904 Green Bay Rd B', addressLocality: 'Highland Park', addressRegion: 'IL', postalCode: '60035', addressCountry: 'US' },
  openingHoursSpecification: { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], opens: '00:00', closes: '23:59' },
  areaServed: ['Highland Park, IL', 'Highwood, IL', 'Fort Sheridan, IL', 'Deerfield, IL', 'Bannockburn, IL', 'Riverwoods, IL', 'Lake Forest, IL', 'Lake Bluff, IL', 'Glencoe, IL'],
};
expect(JSON.stringify(hpNode) === JSON.stringify(HP_EXPECTED), 'the Highland Park office node is exactly Brief 217 §C4 + Brief 218 parentOrganization (byte for byte, key order included)');
// A City Service V2 page: Service (provider = a reference to the office node) + BreadcrumbList + FAQPage
// + the hub's office node — exactly one office node, no duplicate, nothing forbidden.
const officeTypes = ['Plumber', 'PlumbingBusiness', 'LocalBusiness'];
const svcBlocks = [
  { '@context': 'https://schema.org', '@type': 'Service', name: 'Drain Cleaning in Highland Park, IL', provider: { '@id': hpNode?.['@id'] } },
  { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [] },
  faq,
  hpNode,
].map((b) => JSON.stringify(b));
const svcReport = checkJsonLd(svcBlocks, CITY_PAGE_FORBIDDEN_TYPES);
for (const e of svcReport.errors) fail.push(`city service fixture: ${e}`);
expect(officeTypes.reduce((n, t) => n + (svcReport.tally[t] ?? 0), 0) === 1, 'a City Service V2 page carries exactly one office node');

// Brief 218 (Track B) — the homepage graph: Organization (the Brief 188 ORG_ID with the Primary Logo,
// so the articles' publisher and this node are one entity with one logo) + WebSite + WebPage, the
// package's department list, and nothing forbidden (no AggregateRating / Review / FAQPage / Product).
const HOME_TITLE = 'Plumbers in Chicagoland & Columbus, OH | J. Blanton Plumbing';
const HOME_DESC = "Need a plumber near you? For 30+ years, we've helped homeowners with water heaters, clogged drains, sewer lines and more. Available 24/7, with upfront pricing.";
const home = homepageJsonLd({ pageName: HOME_TITLE, pageDescription: HOME_DESC, departmentIds: HOME_PACKAGE_DEPARTMENT_IDS });
const homeReport = checkJsonLd([JSON.stringify(home)]);
for (const e of homeReport.errors) fail.push(`homepage: ${e}`);
const [hOrg, hSite, hPage] = home['@graph'];
expect(home['@graph'].map((n) => n['@type']).join(',') === 'Organization,WebSite,WebPage', 'homepage graph = Organization, WebSite, WebPage');
expect(hOrg['@id'] === ORG_ID && 'logo' in hOrg && JSON.stringify(hOrg.logo) === JSON.stringify(organizationNode().logo), 'homepage Organization reuses ORG_ID and the Primary Logo object (no second logo)');
expect('image' in hOrg && hOrg.image === ORG_LOGO_URL, 'homepage Organization image = the Primary Logo URL');
expect(!JSON.stringify(home).includes('logo-text.webp') && !JSON.stringify(home).includes('#logo'), 'the package logo-text.webp / #logo is not emitted');
const hDept = (hOrg as { department?: { '@id': string }[] }).department ?? [];
expect(hDept.length === 19 && hDept.every((d, i) => d['@id'] === HOME_PACKAGE_DEPARTMENT_IDS[i]), 'homepage department = the package 19 office ids');
expect(hPage['@type'] === 'WebPage' && hPage.name === HOME_TITLE && hPage.description === HOME_DESC, 'WebPage name / description = the rendered title / description');
expect(hSite['@type'] === 'WebSite' && JSON.stringify(hSite.publisher) === JSON.stringify({ '@id': ORG_ID }), 'WebSite publisher = ORG_ID');
expect(!/aggregateRating|"review"|"Product"|FAQPage/.test(JSON.stringify(home)), 'homepage graph without a rating carries no aggregateRating / review / Product / FAQPage');
expect(!homeReport.allTypes.some((t) => ['Plumber', 'PlumbingBusiness', 'LocalBusiness'].includes(t)), 'homepage graph carries no office node');
expect(JSON.stringify(plumber?.parentOrganization) === JSON.stringify({ '@id': ORG_ID }), 'the hub office node points parentOrganization at ORG_ID');

// Brief 221 (Track C) — aggregateRating ONLY in the existing business nodes, appended last, as strings.
const rating = aggregateRatingJsonLd({ ratingValue: 4.8, reviewCount: 3529 });
expect(
  JSON.stringify(rating) === '{"@type":"AggregateRating","ratingValue":"4.8","reviewCount":"3529","bestRating":"5","worstRating":"1"}',
  'aggregateRating = the spec template (strings, key order)'
);
const ratedPlumber = hubPlumberJsonLd(hubFixture, '773-724-9272', schemaPhone, rating);
expect(!!ratedPlumber && Object.keys(ratedPlumber).pop() === 'aggregateRating', 'the office node appends aggregateRating LAST');
expect(JSON.stringify({ ...ratedPlumber, aggregateRating: undefined }) === JSON.stringify(plumber), 'nothing else in the office node changes');
const ratedCity = checkJsonLd([JSON.stringify(ratedPlumber), JSON.stringify(faq)], CITY_PAGE_FORBIDDEN_TYPES);
for (const e of [...ratedCity.errors, ...aggregateRatingProblems([JSON.stringify(ratedPlumber)], ['Plumber'])]) fail.push(`rated city fixture: ${e}`);
const ratedHome = homepageJsonLd({
  pageName: HOME_TITLE,
  pageDescription: HOME_DESC,
  departmentIds: HOME_PACKAGE_DEPARTMENT_IDS,
  aggregateRating: aggregateRatingJsonLd({ ratingValue: 4.72, reviewCount: 10916 }),
});
const ratedHomeOrg = ratedHome['@graph'][0] as Record<string, unknown>;
expect(
  Object.keys(ratedHomeOrg).pop() === 'aggregateRating' && (ratedHomeOrg.aggregateRating as { ratingValue: string }).ratingValue === '4.7',
  'homepage Organization appends the company aggregateRating last, rounded to 4.7'
);
for (const e of [...checkJsonLd([JSON.stringify(ratedHome)], HOMEPAGE_FORBIDDEN_TYPES).errors, ...aggregateRatingProblems([JSON.stringify(ratedHome)], ['Organization'])]) {
  fail.push(`rated homepage: ${e}`);
}
expect(!/"review"|"Product"|FAQPage/.test(JSON.stringify(ratedHome)), 'rated homepage graph carries no review / Product / FAQPage');
expect(
  aggregateRatingProblems([JSON.stringify({ '@context': 'https://schema.org', '@type': 'Product', aggregateRating: rating })], ['Plumber']).length > 0,
  'the checker rejects aggregateRating on any other node type'
);
expect(checkJsonLd([JSON.stringify(ratedPlumber)]).errors.some((e) => e.includes('AggregateRating')), 'AggregateRating stays forbidden on every other page type');
// The tokens: visible copy = schema numbers; no row → the pre-token text, never a raw token or "0".
const rctx = { office: { ratingValue: 4.8, reviewCount: 3529 }, company: { ratingValue: 4.7, reviewCount: 10916 } };
const none = { office: null, company: null };
expect(renderRatingField('{{office_rating}} stars from {{office_review_count}} Google reviews', rctx) === '4.8 stars from 3,529 Google reviews', 'office tokens: rating + comma count');
expect(renderRatingField('{{company_rating}} · {{company_review_count}}', rctx) === '4.7 · 10,916', 'company tokens');
expect(renderRatingField('{{office_rating}} x', none, { '{{office_rating}} x': '4.6 x' }) === '4.6 x', 'no row → the stored pre-token fallback');
expect(renderRatingField('{{office_rating}} x', none) === '', 'no row and no fallback → empty, never a raw token');
expect(renderRatingField('4.7 stars', none) === '4.7 stars', 'text without tokens is returned as is');
expect(!ratingShownIn(['3,529 Google reviews'], rctx.office) && ratingShownIn(['4.8 · 3,529'], rctx.office), 'the visible check needs the rating AND the count');
expect(!ratingShownIn(['4.8 · 13,529'], rctx.office), 'the visible check matches whole numbers only');
// A hub on the tokens gets the office rating; the same hub with stale literal copy ("860+") does not.
const baseHub = blankCityHub('Evanston');
const tokenHub: CityHubStored = {
  ...baseHub,
  trust: ['{{company_rating}} stars · {{company_review_count}} Google reviews across all locations'],
  reviews: { ...baseHub.reviews, intro: '{{office_rating}} stars from {{office_review_count}} Google reviews for our Evanston office.', rating: '{{office_rating}}', ratingSub: '{{office_review_count}} Google reviews for our Evanston office' },
};
const appliedHub = applyHubRatings(tokenHub, rctx);
expect(appliedHub.aggregateRating?.reviewCount === '3529' && appliedHub.hub.reviews.ratingSub === '3,529 Google reviews for our Evanston office', 'a tokenised hub renders the office numbers and carries them in aggregateRating');
expect(appliedHub.hub.trust[0] === '4.7 stars · 10,916 Google reviews across all locations', 'the trust bar renders the company numbers');
const literalHub: CityHubStored = { ...baseHub, reviews: { ...baseHub.reviews, rating: '4.8', ratingSub: '860+ Google reviews for our Evanston office' } };
expect(applyHubRatings(literalHub, rctx).aggregateRating === null && applyHubRatings(literalHub, rctx).hub === literalHub, 'stale literal copy → no aggregateRating, the hub object untouched');
expect(applyHubRatings(tokenHub, none).aggregateRating === null, 'no row → no aggregateRating');

// Brief 222 — the 6 water heater pages: one @graph each (company Organization [+ aggregateRating only when
// shown], WebPage, [WebSite on the hub], BreadcrumbList, Service, FAQPage), checked with the water heater
// allowance; FAQPage = the visible FAQ; every hasOfferCatalog anchor is a section id of the page; no rating
// literal from the package (4.7 / 5,669) anywhere unless it is the synced figure.
{
  const { WH_HUB } = require('../src/lib/content/water-heater-v2/hub') as typeof import('../src/lib/content/water-heater-v2/hub');
  const { WH_PAGES } = require('../src/lib/water-heater-v2-cms/code-defaults') as typeof import('../src/lib/water-heater-v2-cms/code-defaults');
  const { WH_SHARED_DEFAULT } = require('../src/lib/content/water-heater-v2/shared-content') as typeof import('../src/lib/content/water-heater-v2/shared-content');
  const { waterHeaterJsonLd } = require('../src/lib/schema/water-heater') as typeof import('../src/lib/schema/water-heater');
  const { WATER_HEATER_FORBIDDEN_TYPES } = require('../src/lib/schema/jsonld-assert') as typeof import('../src/lib/schema/jsonld-assert');
  const pagesWh = [WH_HUB, ...Object.values(WH_PAGES)];
  const spokePaths = Object.keys(WH_PAGES).map((s) => `/${s}`);
  const idsIn = (n: unknown, out = new Set<string>()): Set<string> => {
    if (Array.isArray(n)) n.forEach((x) => idsIn(x, out));
    else if (n && typeof n === 'object') {
      const o = n as Record<string, unknown>;
      const attrs = o.attrs as Record<string, unknown> | undefined;
      if (typeof attrs?.id === 'string') out.add(attrs.id);
      Object.values(o).forEach((x) => idsIn(x, out));
    }
    return out;
  };
  for (const pg of pagesWh) {
    const hub = pg.template === 'wh-hub';
    const path = hub ? '/services/water-heater' : `/${pg.slug}`;
    const faq = pg.sections.find((s) => s.kind === 'faq');
    const faqs = faq && faq.kind === 'faq' ? faq.items : [];
    for (const rating of [null, aggregateRatingJsonLd({ ratingValue: 4.73, reviewCount: 10931 })]) {
      const g = waterHeaterJsonLd({
        path, hub, title: `${pg.meta.title} | J. Blanton Plumbing`, description: pg.meta.description, crumb: pg.hero.crumb,
        crumbParent: WH_SHARED_DEFAULT.crumbParent, service: pg.service, spokePaths, faqs, phoneDisplay: '773-724-9272', aggregateRating: rating,
      });
      const raw = JSON.stringify(g);
      const r = checkJsonLd([raw], WATER_HEATER_FORBIDDEN_TYPES);
      for (const e of r.errors) fail.push(`water heater ${path}: ${e}`);
      for (const e of aggregateRatingProblems([raw], ['Organization'])) fail.push(`water heater ${path}: ${e}`);
      const types = g['@graph'].map((n) => n['@type']).join(',');
      const want = `Organization,WebPage,${hub ? 'WebSite,' : ''}BreadcrumbList,Service,FAQPage`;
      expect(types === want, `water heater ${path}: node list ${types} ≠ ${want}`);
      const faqNode = g['@graph'].find((n) => n['@type'] === 'FAQPage') as { mainEntity: unknown[] };
      expect(faqNode.mainEntity.length === faqs.length && faqs.length === 6, `water heater ${path}: FAQPage has ${faqNode.mainEntity.length} questions, the page shows ${faqs.length} (6 expected)`);
      expect(!rating ? !/aggregateRating|"4\.7"|5,?669/.test(raw) : !/5,?669/.test(raw), `water heater ${path}: a rating literal or an unshown aggregateRating in the graph`);
      expect(!/"Plumber"|"Review"|"price"/.test(raw), `water heater ${path}: Plumber / Review / price must not be emitted`);
    }
    const ids = idsIn(pg.sections);
    for (const it of pg.service.catalog?.items ?? []) {
      const hash = it.url.split('#')[1];
      if (hash) expect(ids.has(hash), `water heater ${path}: catalog anchor #${hash} is not a section id on the page`);
    }
  }
  expect(checkJsonLd([JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage' })], WATER_HEATER_FORBIDDEN_TYPES).errors.length === 0, 'the water heater allowance permits FAQPage');
  expect(checkJsonLd([JSON.stringify({ '@context': 'https://schema.org', '@type': 'Review' })], WATER_HEATER_FORBIDDEN_TYPES).errors.length > 0, 'the water heater allowance still forbids Review');
}

if (fail.length) {
  console.error(`\n[validate-jsonld] FAILED — ${fail.length} problem(s):\n  - ${fail.join('\n  - ')}\n`);
  process.exit(1);
}
console.log(`[validate-jsonld] OK — ${pages.length} fixture pages; every block parses, is typed, no duplicates, no forbidden types.`);
