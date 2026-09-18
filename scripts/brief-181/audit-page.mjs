/**
 * Brief 181 — served-HTML audit for /hanover-park (D1, D2, D6, D7, G5–G8).
 *
 *   node scripts/brief-181/audit-page.mjs <base-url> [path]
 *
 * Runs against ANY origin, so the same checks cover the local production build
 * and, after deploy, https://jblantonplumbing.com.
 */
const [, , BASE, PATHNAME = '/hanover-park'] = process.argv;
if (!BASE) {
  console.error('usage: audit-page.mjs <base-url> [path]');
  process.exit(2);
}

const strip = (s) =>
  s
    .replace(/<[^>]*>/g, '')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();

let pass = true;
const check = (ok, label, detail = '') => {
  if (!ok) pass = false;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
};

const res = await fetch(BASE + PATHNAME, { redirect: 'manual' });
const html = await res.text();
console.log(`\n=== ${BASE}${PATHNAME} — HTTP ${res.status} (${html.length} bytes) ===\n`);
check(res.status === 200, 'returns 200', `got ${res.status}`);

// -- D1 / G5: head ---------------------------------------------------------
console.log('\n-- D1 / G5 — indexation and head --');
const canonicals = [...html.matchAll(/<link rel="canonical" href="([^"]*)"/gi)].map((m) => m[1]);
check(canonicals.length === 1, 'exactly one canonical', JSON.stringify(canonicals));
check(
  canonicals[0] === `https://jblantonplumbing.com${PATHNAME}`,
  'canonical is absolute and self-referencing',
  canonicals[0]
);
const robots = [...html.matchAll(/<meta name="robots" content="([^"]*)"/gi)].map((m) => m[1]);
check(robots.length === 0, 'no robots meta at all (site default)', JSON.stringify(robots));
check(!/noindex/i.test(html.slice(0, html.indexOf('</head>'))), 'no "noindex" anywhere in <head>');

const title = strip((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '');
console.log(`  title: ${JSON.stringify(title)}`);
check(
  title === 'Hanover Park Plumbers, Available 24/7 | J. Blanton Plumbing',
  'title is the META DATA title with the brand ONCE',
  title
);
check((title.match(/J\. Blanton Plumbing/g) || []).length === 1, 'brand appears exactly once');

const APPROVED_DESC =
  'Our Hanover Park office serves the northwest suburbs, including Streamwood, Bartlett, and Schaumburg. Call 24/7 for a flat-rate quote before we start.';
const desc = (html.match(/<meta name="description" content="([^"]*)"/i) || [])[1] || '';
check(desc === APPROVED_DESC, 'meta description is the approved one', desc.slice(0, 70) + '...');

// -- D2 / G8: heading outline ----------------------------------------------
console.log('\n-- D2 / G8 — heading semantics --');
const heads = [...html.matchAll(/<(h[1-6])\b[^>]*>([\s\S]*?)<\/\1>/gi)].map((m) => ({
  level: Number(m[1][1]),
  tag: m[1].toLowerCase(),
  text: strip(m[2]),
  attrs: m[0].slice(0, m[0].indexOf('>')),
}));
const h1s = heads.filter((h) => h.level === 1);
check(h1s.length === 1, 'exactly one <h1>', JSON.stringify(h1s.map((h) => h.text)));

const skips = [];
for (let i = 1; i < heads.length; i++) {
  if (heads[i].level > heads[i - 1].level + 1) {
    skips.push(`${heads[i - 1].tag}->${heads[i].tag} at ${JSON.stringify(heads[i].text.slice(0, 40))}`);
  }
}
check(skips.length === 0, 'no skipped heading levels', skips.join('; '));

const FAQ_QUESTIONS = [
  'Does cold weather cause pipes to freeze and burst in Hanover Park homes?',
  'How quickly can you respond to a plumbing emergency in Hanover Park?',
  'Is basement flooding a common issue for Hanover Park homeowners?',
  'Do you give a quote before starting work?',
  'Are J. Blanton plumbers licensed and insured in Illinois?',
  'How much does a plumber cost in Hanover Park?',
];
const asH3 = FAQ_QUESTIONS.filter((q) => heads.some((h) => h.tag === 'h3' && h.text === q));
check(asH3.length === 6, 'all 6 FAQ questions render as <h3>', `${asH3.length}/6`);
const faqHeads = heads.filter((h) => FAQ_QUESTIONS.includes(h.text));
check(
  faqHeads.length > 0 && faqHeads.every((h) => /text-white/.test(h.attrs)),
  'FAQ H3 carries text-white ON THE ELEMENT (Brief 179 Defect 2)'
);

console.log('  outline:');
for (const h of heads) {
  console.log(`    ${' '.repeat((h.level - 1) * 2)}${h.tag.toUpperCase()} ${JSON.stringify(h.text.slice(0, 66))}`);
}

// -- D6 / G6: structured data ----------------------------------------------
console.log('\n-- D6 / G6 — structured data --');
const blocks = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)].map(
  (m) => {
    try {
      return JSON.parse(m[1]);
    } catch {
      return { PARSE_ERROR: m[1].slice(0, 120) };
    }
  }
);
const flat = blocks.flatMap((b) => (b['@graph'] ? b['@graph'] : [b]));
const types = flat.map((n) => n['@type']);
const crumbs = flat.filter((n) => n['@type'] === 'BreadcrumbList');
check(crumbs.length === 1, 'exactly one BreadcrumbList', String(crumbs.length));
if (crumbs[0]) {
  const items = crumbs[0].itemListElement || [];
  check(items.length === 2, 'two crumbs', JSON.stringify(items.map((i) => i.name)));
  check(items[0] && items[0].item === 'https://jblantonplumbing.com/', 'Home crumb URL', items[0] && items[0].item);
  check(
    items[1] && items[1].item === 'https://jblantonplumbing.com/hanover-park',
    'City crumb URL',
    items[1] && items[1].item
  );
}
check(!types.includes('FAQPage'), 'no FAQPage (Brief 164)');
check(!types.includes('AggregateRating') && !types.includes('Review'), 'no Review / AggregateRating');
check(
  !flat.some((n) => n['@type'] === 'LocalBusiness' || n['@type'] === 'Plumber'),
  'no page-level LocalBusiness / Plumber node'
);
/*
 * The footer's sitewide graph must be untouched and un-duplicated. Compared
 * against a SIBLING city page from the same origin rather than a hardcoded
 * count, so the check still means something when an office is added or removed.
 */
const pb = flat.filter((n) => n['@type'] === 'PlumbingBusiness');
const siblingHtml = await (await fetch(BASE + '/geneva')).text();
const siblingBlocks = [
  ...siblingHtml.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi),
].map((m) => {
  try {
    return JSON.parse(m[1]);
  } catch {
    return {};
  }
});
const siblingPb = siblingBlocks
  .flatMap((b) => (b['@graph'] ? b['@graph'] : [b]))
  .filter((n) => n['@type'] === 'PlumbingBusiness');
check(pb.length === siblingPb.length, 'footer PlumbingBusiness graph has the same node count as /geneva', `${pb.length} vs ${siblingPb.length}`);
check(
  JSON.stringify(pb) === JSON.stringify(siblingPb),
  'footer PlumbingBusiness graph is byte-identical to /geneva (untouched, not duplicated)'
);

// -- D7: on-page checklist -------------------------------------------------
console.log('\n-- D7 — on-page checklist --');
check(!/#000000/i.test(html) && !/#000\b/i.test(html), 'no #000000 / #000 in the served HTML');
const telHrefs = [...html.matchAll(/href="tel:([^"]*)"/gi)].map((m) => m[1]);
check(
  telHrefs.length > 0 && telHrefs.every((t) => t === '773-724-9272'),
  'every tel: link is the settings phone',
  [...new Set(telHrefs)].join(', ')
);
const imgs = [...html.matchAll(/<img\b([^>]*)>/gi)].map((m) => m[1]);
const noAlt = imgs.filter((a) => !/\salt=/.test(a));
check(noAlt.length === 0, 'every <img> has an alt attribute', `${noAlt.length} missing`);
const heroImg = imgs.find((a) => /hanover-park\/hero\.webp/.test(a));
check(
  Boolean(heroImg) && /width="1200"/.test(heroImg) && /height="896"/.test(heroImg),
  'hero reserves its space (explicit width/height, CLS 0)'
);

// -- G7: every link a direct 200 -------------------------------------------
console.log('\n-- G7 — link destinations --');

/*
 * ⚠ ONE KNOWN NON-200, and it is a LOCAL DATA artifact, not this brief's.
 *
 * The footer store locator builds each office link as `/${office.slug}`, and the
 * LOCAL dev DB stores the Hanover Park office's slug WITH a leading slash
 * ("/hanover-park") — the exact quirk `CityV3Content.officeCity` exists to avoid
 * depending on. So the local footer emits `href="//hanover-park"`, which Next's
 * repeated-slash collapse answers with a 308.
 *
 * It is on EVERY page of the local build (the homepage and /geneva too, in the
 * BEFORE snapshot taken at repo HEAD), and it is NOT on production — the live
 * footer emits `/hanover-park`. So it is a pre-existing local row, out of this
 * brief's scope, and it is allowed ONLY when auditing localhost. The production
 * run has no allowance and must come back clean.
 */
const LOCAL_ONLY_ALLOWANCES = BASE.includes('localhost') ? ['//hanover-park'] : [];

/* Static assets are not page links; a 200 on each is checked, not their shape. */
const isAsset = (h) => /^\/(_next|images)\//.test(h) || /\.(ico|webp|svg|png|jpg|css|js)$/.test(h);

const hrefs = [...new Set([...html.matchAll(/href="(\/[^"#]*)"/g)].map((m) => m[1]))].sort();
const bad = [];
const allowed = [];
for (const h of hrefs) {
  const r = await fetch(BASE + h, { redirect: 'manual' });
  const loc = r.headers.get('location') || '';
  const tag = isAsset(h) ? 'asset' : 'page ';
  console.log(`    ${String(r.status).padEnd(4)} ${tag} ${h}${loc ? '  -> ' + loc : ''}`);
  if (r.status === 200) continue;
  if (LOCAL_ONLY_ALLOWANCES.includes(h)) allowed.push(`${h} -> ${r.status}`);
  else bad.push(`${h} -> ${r.status} ${loc}`);
}
check(bad.length === 0, `all ${hrefs.length} links return a direct 200`, bad.join('; '));
if (allowed.length) {
  console.log(`  NOTE  ${allowed.length} local-DB artifact(s) allowed on localhost only: ${allowed.join('; ')}`);
}

console.log(`\n=== ${pass ? 'ALL CHECKS PASS' : 'FAILURES ABOVE'} ===\n`);
process.exit(pass ? 0 : 1);
