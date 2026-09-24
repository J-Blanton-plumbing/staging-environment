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
import { checkJsonLd } from '../src/lib/schema/jsonld-assert';
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

if (fail.length) {
  console.error(`\n[validate-jsonld] FAILED — ${fail.length} problem(s):\n  - ${fail.join('\n  - ')}\n`);
  process.exit(1);
}
console.log(`[validate-jsonld] OK — ${pages.length} fixture pages; every block parses, is typed, no duplicates, no forbidden types.`);
