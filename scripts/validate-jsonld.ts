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
import { checkJsonLd, CITY_PAGE_FORBIDDEN_TYPES } from '../src/lib/schema/jsonld-assert';
import { faqPageJsonLd, schemaPhone } from '../src/lib/schema/city-pages';
import { hubPlumberJsonLd } from '../src/lib/city-hub-cms/model';
import { articleCrumbs, termCrumbs } from '../src/lib/cms/kh-crumbs';
import { ORG_ID } from '../src/lib/schema/organization-ref';
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
  Object.keys(plumber ?? {}).join(',') === '@context,@type,@id,name,url,sameAs,hasMap,telephone,address,openingHoursSpecification,areaServed',
  'the Plumber node keeps the Brief 216 key order'
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
  url: 'https://jblantonplumbing.com/highland-park',
  sameAs: ['https://maps.app.goo.gl/2TwjsZRjsfZmukRr6'],
  hasMap: 'https://maps.app.goo.gl/2TwjsZRjsfZmukRr6',
  telephone: '+1-773-724-9272',
  address: { '@type': 'PostalAddress', streetAddress: '1904 Green Bay Rd B', addressLocality: 'Highland Park', addressRegion: 'IL', postalCode: '60035', addressCountry: 'US' },
  openingHoursSpecification: { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], opens: '00:00', closes: '23:59' },
  areaServed: ['Highland Park, IL', 'Highwood, IL', 'Fort Sheridan, IL', 'Deerfield, IL', 'Bannockburn, IL', 'Riverwoods, IL', 'Lake Forest, IL', 'Lake Bluff, IL', 'Glencoe, IL'],
};
expect(JSON.stringify(hpNode) === JSON.stringify(HP_EXPECTED), 'the Highland Park office node is exactly Brief 217 §C4 (byte for byte, key order included)');
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

if (fail.length) {
  console.error(`\n[validate-jsonld] FAILED — ${fail.length} problem(s):\n  - ${fail.join('\n  - ')}\n`);
  process.exit(1);
}
console.log(`[validate-jsonld] OK — ${pages.length} fixture pages; every block parses, is typed, no duplicates, no forbidden types.`);
