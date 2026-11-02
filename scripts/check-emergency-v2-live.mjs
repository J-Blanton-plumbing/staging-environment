#!/usr/bin/env node
/**
 * Brief 225 (Tracks F3 / F5 / G2) — `/emergency-plumbing` serves the Emergency Hub from its CMS row, correctly.
 * Plain Node (no dependencies), so it runs on the box from the deploy health check.
 *
 *   node scripts/check-emergency-v2-live.mjs --base=http://localhost:3000 [--no-links] [--control=/services/water-heater]
 *
 *   1. 200, and /api/water-heater-v2/source says the content comes from its CMS row ("row");
 *   2. listed in /sitemap-pages.xml exactly once, with a <lastmod>;
 *   3. exactly ONE <h1>; a title ending in the brand once; a self-referencing canonical; no noindex; a meta
 *      description; Open Graph + Twitter image tags;
 *   4. exactly one JSON-LD @graph in the page body, which parses and carries Organization, WebPage,
 *      BreadcrumbList, Service, FAQPage — no Plumber / Review / price / phone; WebPage name/description =
 *      title/meta; the company aggregateRating (when present) equals the visible rating card, and is absent
 *      when the card shows no rating; no literal 4.7 unless it is the synced figure;
 *   5. every tel: link in the page body is the one site number, and every phone number SHOWN is that number;
 *   6. the FAQPage text equals the visible full answers;
 *   7. the emergency checklist (#services) and the "While You Wait" steps (#wait) contain no link;
 *   8. the header (B3): "Call Now" dials the site number and there is no header phone text link and no
 *      "Schedule a Service" header button on this page — and a control page still has both;
 *   9. every internal link in the page body answers 200 directly (no redirect hop) — skip with --no-links.
 * Content is never pinned (deploy gates never assert CMS copy). Editor state is NOT a failure (Brief 186):
 * a page Marketing unpublished answers 404, reads "not-found" and is out of the sitemap — reported, exit 0.
 * Exit 1 for anything else above.
 */
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, ...v] = a.replace(/^--/, '').split('='); return [k, v.length ? v.join('=') : true]; }));
const BASE = String(args.base ?? 'http://localhost:3000').replace(/\/$/, '');
const SITE = 'https://jblantonplumbing.com';
const PAGE = '/emergency-plumbing';
const CONTROL = String(args.control ?? '/services/water-heater');

const failures = [];
const notes = [];
const fail = (m) => failures.push(m);

async function get(p) {
  const r = await fetch(BASE + p, { redirect: 'manual', headers: { 'User-Agent': 'jbp-emergency-v2-check', Accept: 'text/html' } });
  return { status: r.status, location: r.headers.get('location'), text: await r.text() };
}
const decode = (s) => s.replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&');
const strip = (s) => decode(s.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
function body(html) {
  const start = html.indexOf('<div id="sewer-v2"');
  const end = html.indexOf('</main>', start);
  return start >= 0 ? html.slice(start, end > start ? end : undefined) : '';
}
/** The <section …id="X"…> … </section> of a page body (sections do not nest on this page). */
function section(region, id) {
  const m = region.match(new RegExp(`<section[^>]*\\bid="${id}"[^>]*>[\\s\\S]*?</section>`));
  return m ? m[0] : '';
}
const header = (html) => (html.match(/<header[\s\S]*?<\/header>/) || [''])[0];
const digits = (s) => s.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');

async function main() {
  console.log(`check-emergency-v2-live — Brief 225 (${BASE})`);
  const sources = await fetch(`${BASE}/api/water-heater-v2/source`).then((r) => r.json()).catch(() => ({}));
  const sm = await fetch(`${BASE}/sitemap-pages.xml`).then((r) => r.text()).catch(() => '');
  const entries = [...sm.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => m[1]).filter((u) => (u.match(/<loc>([^<]*)<\/loc>/) || [])[1]?.replace(SITE, '').replace(BASE, '') === PAGE);

  const r = await get(PAGE);
  const src = sources[PAGE]?.source;
  if (r.status === 404 && src === 'not-found') {
    notes.push(`${PAGE}: unpublished in /admin (404, out of the sitemap) — editor state`);
    if (entries.length) fail(`${PAGE}: unpublished but still in /sitemap-pages.xml`);
  } else if (r.status !== 200) fail(`${PAGE}: answered ${r.status}`);
  else {
    if (src !== 'row') fail(`${PAGE}: content source is "${src}", expected "row"`);
    if (entries.length !== 1) fail(`${PAGE}: listed ${entries.length}× in /sitemap-pages.xml (expected 1)`);
    else if (!/<lastmod>\d{4}-\d\d-\d\dT[^<]+<\/lastmod>/.test(entries[0])) fail(`${PAGE}: sitemap entry has no <lastmod>`);
    const html = r.text;
    const head = html.slice(0, html.indexOf('</head>'));
    const h1s = (html.match(/<h1[\s>]/g) || []).length;
    if (h1s !== 1) fail(`${PAGE}: ${h1s} <h1> elements`);
    const title = decode((head.match(/<title>([\s\S]*?)<\/title>/) || [])[1] ?? '');
    if (!/ \| J\. Blanton Plumbing$/.test(title) || /J\. Blanton(?: Plumbing)? \| J\. Blanton/.test(title)) fail(`${PAGE}: title "${title}"`);
    const canon = (head.match(/<link rel="canonical" href="([^"]*)"/) || [])[1];
    if (canon !== SITE + PAGE) fail(`${PAGE}: canonical ${canon}`);
    if (/<meta name="robots" content="[^"]*noindex/i.test(head)) fail(`${PAGE}: noindex`);
    const desc = decode((head.match(/<meta name="description" content="([^"]*)"/) || [])[1] ?? '');
    if (!desc) fail(`${PAGE}: no meta description`);
    if (!/<meta property="og:image" content="[^"]+"/.test(head) || !/<meta name="twitter:image" content="[^"]+"/.test(head)) fail(`${PAGE}: Open Graph / Twitter image missing`);

    const region = body(html);
    if (!region) fail(`${PAGE}: no #sewer-v2 root`);
    else {
      // 4. JSON-LD
      const blocks = [...region.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
      let nodes = [];
      if (blocks.length !== 1) fail(`${PAGE}: ${blocks.length} JSON-LD blocks in the page body (expected 1)`);
      else {
        try {
          nodes = JSON.parse(blocks[0])['@graph'] ?? [];
        } catch (e) {
          fail(`${PAGE}: JSON-LD does not parse (${e.message})`);
        }
        const types = nodes.map((n) => n['@type']).join(',');
        if (types !== 'Organization,WebPage,BreadcrumbList,Service,FAQPage') fail(`${PAGE}: JSON-LD nodes ${types}`);
        if (/"Plumber"|"Review"|"price"|servicePhone|"telephone"/.test(blocks[0])) fail(`${PAGE}: JSON-LD carries Plumber / Review / price / a phone`);
        const webPage = nodes.find((n) => n['@type'] === 'WebPage');
        if (webPage && (decode(webPage.name) !== title || webPage.description !== desc)) fail(`${PAGE}: WebPage name/description ≠ title/meta`);
        const crumbs = nodes.find((n) => n['@type'] === 'BreadcrumbList')?.itemListElement ?? [];
        if (crumbs[crumbs.length - 1]?.item !== canon) fail(`${PAGE}: BreadcrumbList does not end at the canonical`);
      }
      const shown = region.match(/<div class="hub-proof-score"><strong>([^<]*)<\/strong>[\s\S]*?<span class="hub-proof-sub">([^<]*)<\/span>/);
      const rating = nodes.find((n) => n['@type'] === 'Organization')?.aggregateRating;
      if (shown) {
        const count = (decode(shown[2]).match(/[\d,]+(?= Google reviews)/) || [])[0]?.replace(/,/g, '');
        if (!rating) fail(`${PAGE}: the rating card shows ${shown[1]} · ${shown[2]} but the graph has no aggregateRating`);
        else if (rating.ratingValue !== shown[1] || rating.reviewCount !== count) fail(`${PAGE}: aggregateRating ${rating.ratingValue}/${rating.reviewCount} ≠ card ${shown[1]}/${count}`);
        if (/\{\{/.test(shown[0])) fail(`${PAGE}: raw token in the rating card`);
      } else {
        if (rating) fail(`${PAGE}: aggregateRating without a visible rating card`);
        notes.push(`${PAGE}: no company rating row yet — the rating card shows only the BBB link (by design)`);
      }
      const text = strip(region.replace(/<script[\s\S]*?<\/script>/g, ''));
      const fours = (text.match(/(?<![\d.])4\.7(?!\d)/g) || []).length;
      if (fours && (!rating || rating.ratingValue !== '4.7')) fail(`${PAGE}: literal 4.7 in the page while the synced rating is ${rating?.ratingValue ?? 'absent'}`);
      if (/\{\{[a-z_]+\}\}/.test(text)) fail(`${PAGE}: a raw {{token}} in the page`);

      // 5. phones
      const tels = new Set([...region.matchAll(/href="(tel:[^"]*)"/g)].map((m) => m[1]));
      if (tels.size !== 1) fail(`${PAGE}: ${tels.size} different tel: targets in the page body (${[...tels].join(', ')})`);
      const site = tels.size === 1 ? digits([...tels][0]) : '';
      const shownNumbers = new Set((text.match(/\(?\b\d{3}\)?[\s.-]?\d{3}[\s.-]\d{4}\b/g) || []).map(digits));
      for (const n of shownNumbers) if (n !== site) fail(`${PAGE}: a phone number other than the site number is shown (${n})`);
      if (!shownNumbers.size) fail(`${PAGE}: no phone number shown`);

      // 6. FAQ schema = visible
      const faqNode = nodes.find((n) => n['@type'] === 'FAQPage');
      const visible = [...region.matchAll(/<p class="faq-full">([\s\S]*?)<\/p>/g)].map((m) => strip(m[1]));
      const schema = (faqNode?.mainEntity ?? []).map((q) => q.acceptedAnswer?.text);
      if (!visible.length || visible.length !== schema.length || visible.some((v, i) => v !== schema[i])) fail(`${PAGE}: FAQPage text ≠ the visible answers`);

      // 7. no links in the checklist / steps: the 8 signs, the 5 steps and the gas callout carry zero <a>; the
      //    only anchors elsewhere in those two sections are their call buttons (tel:).
      const parts = [
        ['the emergency checklist', /<ul class="em-signs">[\s\S]*?<\/ul>/],
        ['the While You Wait steps', /<ol class="em-steps">[\s\S]*?<\/ol>/],
        ['the gas callout', /<aside class="em-gas"[\s\S]*?<\/aside>/],
      ];
      for (const [name, re] of parts) {
        const m = region.match(re);
        if (!m) fail(`${PAGE}: ${name} not found`);
        else if (/<a\s/.test(m[0])) fail(`${PAGE}: ${name} contains a link (none on purpose — the page exists to get the call)`);
      }
      for (const id of ['services', 'wait']) {
        const sec = section(region, id);
        if (!sec) fail(`${PAGE}: no #${id} section`);
        else if ([...sec.matchAll(/<a\s[^>]*href="([^"]*)"/g)].some((m) => !m[1].startsWith('tel:'))) fail(`${PAGE}: #${id} links somewhere other than the phone`);
      }

      // 9. internal links: 200, no hop
      if (!args['no-links']) {
        const hrefs = new Set([...region.matchAll(/href="(\/[^"#?]*)/g)].map((m) => m[1]).filter((h) => !h.startsWith('/api/') && !h.startsWith('/_next/')));
        for (const h of hrefs) {
          const st = await get(h).then((x) => x.status).catch(() => 0);
          if (st !== 200) fail(`${PAGE}: internal link ${h} answered ${st}`);
        }
        notes.push(`${PAGE}: ${hrefs.size} internal links checked`);
      }

      // 8. header variant (this page only)
      const hd = header(html);
      const callNow = [...hd.matchAll(/<a[^>]*href="(tel:[^"]*)"[^>]*>(?:(?!<\/a>)[\s\S])*?Call Now[\s\S]*?<\/a>/g)];
      if (callNow.length !== 1) fail(`${PAGE}: header has ${callNow.length} "Call Now" tel: links (expected 1)`);
      else if (site && digits(callNow[0][1]) !== site) fail(`${PAGE}: header "Call Now" dials ${callNow[0][1]}, not the site number`);
      if (/SCHEDULE A SERVICE/.test(hd)) fail(`${PAGE}: the header still shows the "Schedule a Service" button`);
      if (site && strip(hd).replace(/\D/g, '').includes(site)) fail(`${PAGE}: the header still shows the phone number as a text link`);
    }
  }

  // 8. the control page keeps the normal header
  const c = await get(CONTROL);
  if (c.status === 200) {
    const hd = header(c.text);
    if (!/SCHEDULE A SERVICE/.test(hd)) fail(`${CONTROL}: the header lost its "Schedule a Service" button (the variant leaked)`);
    if (/>\s*Call Now\s*</.test(hd.replace(/<span>/g, '>').replace(/<\/span>/g, '<'))) fail(`${CONTROL}: the header shows "Call Now" (the variant leaked)`);
    if (!/href="tel:[^"]+"[^>]*>(?:<svg[\s\S]*?<\/svg>)?[^<]*\d{3}-\d{3}-\d{4}/.test(hd)) fail(`${CONTROL}: the header lost its phone text link (the variant leaked)`);
  } else notes.push(`${CONTROL}: answered ${c.status} — header control skipped`);

  for (const n of notes) console.log(`  i ${n}`);
  if (failures.length) {
    console.error(`\nEMERGENCY V2 LIVE CHECK: ${failures.length} problem(s)\n  - ${failures.join('\n  - ')}`);
    process.exit(1);
  }
  console.log(`EMERGENCY V2 LIVE CHECK: OK — ${PAGE} (+ header control ${CONTROL})`);
}

main().catch((e) => {
  console.error('check-emergency-v2-live crashed:', e);
  process.exit(2);
});
