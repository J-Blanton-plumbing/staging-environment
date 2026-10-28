#!/usr/bin/env node
/**
 * Brief 222 (Track F) — the 6 water heater pages serve their CMS rows, correctly, and the 2 retired URLs
 * redirect in one hop. Plain Node (no dependencies), so it runs on the box from the deploy health check.
 *
 *   node scripts/check-water-heater-v2-live.mjs --base=http://localhost:3000 [--no-links]
 *
 * For each of /services/water-heater + the 5 service pages:
 *   1. 200, and /api/water-heater-v2/source says the content comes from its CMS row ("row");
 *   2. listed in /sitemap-pages.xml exactly once;
 *   3. exactly ONE <h1>; a title ending in the brand; a self-referencing canonical; no noindex;
 *   4. exactly one JSON-LD @graph in the page body, which parses, carries the expected node list and no
 *      Plumber / Review / price; the company aggregateRating (when present) equals the visible rating
 *      card, and is absent when the card shows no rating;
 *   5. no package rating literal (5,669 / 5669; 4.7 only as the synced figure);
 *   6. every tel: link in the page body is the one site number (the {{phone}} field);
 *   7. every hasOfferCatalog anchor exists on the page; the FAQPage text equals the visible full answers;
 *   8. every internal link in the page body answers 200 directly (no redirect hop) — skip with --no-links.
 * Then: /residential-water-heater and /restaurant-water-heater answer ONE 301 to the hub / Commercial,
 * and a /{city}/residential-water-heater sample still answers 200.
 *
 * Editor state is NOT a failure (Brief 186): a page Marketing unpublished answers 404, reads "not-found"
 * and is out of the sitemap — reported, exit 0. Exit 1 for anything else above.
 */
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, ...v] = a.replace(/^--/, '').split('='); return [k, v.length ? v.join('=') : true]; }));
const BASE = String(args.base ?? 'http://localhost:3000').replace(/\/$/, '');
const SITE = 'https://jblantonplumbing.com';
const PAGES = ['/services/water-heater', '/water-heater-repair', '/water-heater-installation', '/water-heater-maintenance', '/tankless-water-heater', '/commercial-water-heater'];
const REDIRECTS = [
  ['/residential-water-heater', '/services/water-heater'],
  ['/restaurant-water-heater', '/commercial-water-heater'],
  ['/residential-water-heater/', '/services/water-heater'],
  ['/restaurant-water-heater/', '/commercial-water-heater'],
];
const CITY_SAMPLE = String(args['city-sample'] ?? '/park-ridge/residential-water-heater');

const failures = [];
const notes = [];
const fail = (m) => failures.push(m);

async function get(p, method = 'GET') {
  const r = await fetch(BASE + p, { method, redirect: 'manual', headers: { 'User-Agent': 'jbp-water-heater-v2-check', Accept: 'text/html' } });
  return { status: r.status, location: r.headers.get('location'), text: method === 'GET' ? await r.text() : '' };
}

const decode = (s) => s.replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&');
const strip = (s) => decode(s.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();

function body(html) {
  const start = html.indexOf('<div id="sewer-v2"');
  const end = html.indexOf('</main>', start);
  return start >= 0 ? html.slice(start, end > start ? end : undefined) : '';
}

async function checkPage(p, sources, sitemapCount, linkCache) {
  const r = await get(p);
  const src = sources[p]?.source;
  if (r.status === 404 && src === 'not-found') { notes.push(`${p}: unpublished in /admin (404, out of the sitemap) — editor state`); return; }
  if (r.status !== 200) return fail(`${p}: answered ${r.status}`);
  if (src !== 'row') fail(`${p}: content source is "${src}", expected "row"`);
  if (sitemapCount(p) !== 1) fail(`${p}: listed ${sitemapCount(p)}× in /sitemap-pages.xml (expected 1)`);
  const html = r.text;
  const head = html.slice(0, html.indexOf('</head>'));
  const h1s = (html.match(/<h1[\s>]/g) || []).length;
  if (h1s !== 1) fail(`${p}: ${h1s} <h1> elements`);
  const title = decode((head.match(/<title>([\s\S]*?)<\/title>/) || [])[1] ?? '');
  if (!/ \| J\. Blanton Plumbing$/.test(title) || /J\. Blanton(?: Plumbing)? \| J\. Blanton/.test(title)) fail(`${p}: title "${title}"`);
  const canon = (head.match(/<link rel="canonical" href="([^"]*)"/) || [])[1];
  if (canon !== SITE + p) fail(`${p}: canonical ${canon}`);
  if (/<meta name="robots" content="[^"]*noindex/i.test(head)) fail(`${p}: noindex`);
  const desc = decode((head.match(/<meta name="description" content="([^"]*)"/) || [])[1] ?? '');
  if (!desc) fail(`${p}: no meta description`);

  const region = body(html);
  if (!region) return fail(`${p}: no #sewer-v2 root`);
  const blocks = [...region.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  if (blocks.length !== 1) return fail(`${p}: ${blocks.length} JSON-LD blocks in the page body (expected 1)`);
  let g;
  try { g = JSON.parse(blocks[0]); } catch (e) { return fail(`${p}: JSON-LD does not parse (${e.message})`); }
  const nodes = g['@graph'] ?? [];
  const types = nodes.map((n) => n['@type']).join(',');
  const want = `Organization,WebPage,${p === '/services/water-heater' ? 'WebSite,' : ''}BreadcrumbList,Service,FAQPage`;
  if (types !== want) fail(`${p}: JSON-LD nodes ${types} (expected ${want})`);
  if (/"Plumber"|"Review"|"price"/.test(blocks[0])) fail(`${p}: JSON-LD carries Plumber / Review / price`);
  const webPage = nodes.find((n) => n['@type'] === 'WebPage');
  if (webPage && (decode(webPage.name) !== title || webPage.description !== desc)) fail(`${p}: WebPage name/description ≠ title/meta`);

  // rating card = company aggregateRating = the synced row
  const shown = region.match(/<div class="hub-proof-score"><strong>([^<]*)<\/strong>[\s\S]*?<span class="hub-proof-sub">([^<]*)<\/span>/);
  const org = nodes.find((n) => n['@type'] === 'Organization');
  const rating = org?.aggregateRating;
  if (shown) {
    const count = (decode(shown[2]).match(/[\d,]+(?= Google reviews)/) || [])[0]?.replace(/,/g, '');
    if (!rating) fail(`${p}: the rating card shows ${shown[1]} · ${shown[2]} but the graph has no aggregateRating`);
    else if (rating.ratingValue !== shown[1] || rating.reviewCount !== count) fail(`${p}: aggregateRating ${rating.ratingValue}/${rating.reviewCount} ≠ card ${shown[1]}/${count}`);
    if (/\{\{/.test(shown[0])) fail(`${p}: raw token in the rating card`);
  } else if (rating) fail(`${p}: aggregateRating without a visible rating card`);
  if (/5,669|5669/.test(region)) fail(`${p}: package review count 5,669 in the page`);
  const fours = (strip(region.replace(/<script[\s\S]*?<\/script>/g, '')).match(/(?<![\d.])4\.7(?!\d)/g) || []).length;
  if (fours && (!rating || rating.ratingValue !== '4.7')) fail(`${p}: literal 4.7 in the page while the synced rating is ${rating?.ratingValue ?? 'absent'}`);

  // phones
  const tels = new Set([...region.matchAll(/href="(tel:[^"]*)"/g)].map((m) => m[1]));
  if (tels.size !== 1) fail(`${p}: ${tels.size} different tel: targets in the page body (${[...tels].join(', ')})`);

  // catalog anchors + FAQ schema = visible
  const svc = nodes.find((n) => n['@type'] === 'Service');
  for (const it of svc?.hasOfferCatalog?.itemListElement ?? []) {
    const hash = (it.itemOffered?.url ?? '').split('#')[1];
    if (hash && !region.includes(`id="${hash}"`)) fail(`${p}: catalog anchor #${hash} is not on the page`);
  }
  const faqNode = nodes.find((n) => n['@type'] === 'FAQPage');
  const visible = [...region.matchAll(/<p class="faq-full">([\s\S]*?)<\/p>/g)].map((m) => strip(m[1]));
  const schema = (faqNode?.mainEntity ?? []).map((q) => q.acceptedAnswer?.text);
  if (visible.length !== schema.length || visible.some((v, i) => v !== schema[i])) fail(`${p}: FAQPage text ≠ the visible answers`);

  // internal links: 200, no hop
  if (!args['no-links']) {
    const hrefs = new Set([...region.matchAll(/href="(\/[^"#?]*)/g)].map((m) => m[1]).filter((h) => !h.startsWith('/api/') && !h.startsWith('/_next/')));
    for (const h of hrefs) {
      if (!linkCache.has(h)) linkCache.set(h, await get(h, 'GET').then((x) => x.status).catch(() => 0));
      const st = linkCache.get(h);
      if (st !== 200) fail(`${p}: internal link ${h} answered ${st}`);
    }
  }
}

async function main() {
  console.log(`check-water-heater-v2-live — Brief 222 (${BASE})`);
  const sources = await fetch(`${BASE}/api/water-heater-v2/source`).then((r) => r.json()).catch(() => ({}));
  const sm = await fetch(`${BASE}/sitemap-pages.xml`).then((r) => r.text()).catch(() => '');
  const locs = [...sm.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1].replace(SITE, '').replace(BASE, ''));
  const sitemapCount = (p) => locs.filter((l) => l === p).length;
  const linkCache = new Map();
  for (const p of PAGES) await checkPage(p, sources, sitemapCount, linkCache);
  for (const [from, to] of REDIRECTS) {
    const r = await get(from);
    const loc = r.location ? r.location.replace(/^https?:\/\/[^/]+/, '') : '';
    if (r.status !== 301 || loc !== to) fail(`${from}: ${r.status} → ${loc || '(none)'} (expected one 301 to ${to})`);
    else {
      const next = await get(to);
      if (next.status !== 200) fail(`${from}: target ${to} answered ${next.status}`);
    }
  }
  for (const gone of ['/residential-water-heater', '/restaurant-water-heater']) if (locs.includes(gone)) fail(`${gone}: still in /sitemap-pages.xml`);
  const city = await get(CITY_SAMPLE);
  if (city.status !== 200) fail(`${CITY_SAMPLE}: answered ${city.status} (city pages are out of scope and must keep serving)`);

  for (const n of notes) console.log(`  i ${n}`);
  if (failures.length) {
    console.error(`\nWATER HEATER V2 LIVE CHECK: ${failures.length} problem(s)\n  - ${failures.join('\n  - ')}`);
    process.exit(1);
  }
  console.log(`WATER HEATER V2 LIVE CHECK: OK — ${PAGES.length} pages, ${REDIRECTS.length} redirects, ${linkCache.size} internal links`);
}

main().catch((e) => {
  console.error('check-water-heater-v2-live crashed:', e);
  process.exit(2);
});
