/**
 * Brief 152 (Fix 3) — LIVE SEO/routing validator. Runs against a serving app, so
 * it can assert the things the build-time validator provably cannot: that a
 * CMS-driven URL is actually published, and that the page's RENDERED canonical
 * equals the sitemap URL exactly.
 *
 * Wired into deploy.yml's post-deploy health-check step (against
 * http://localhost:3000, i.e. the app itself rather than nginx) so a violation
 * turns the deploy red. `scripts/validate-sitemap.ts` is its build-time
 * counterpart and runs as `prebuild`.
 *
 * Phases:
 *   1. SITEMAP     — every <loc> returns 200 and declares a canonical equal to
 *                    itself. This is the check that would have caught
 *                    /hoa-line-piping (404, advertised in sitemap.xml for weeks).
 *   2. ROBOTS      — robots.txt carries no `Disallow` line and does advertise the
 *                    sitemap (Brief 152 Fix 4).
 *   3. NOINDEX     — /admin and /api answer `X-Robots-Tag: noindex`, while
 *                    /robots.txt and /sitemap.xml do NOT.
 *   4. REDIRECTS   — a trailing-slash URL, an alias slug and a slashed alias each
 *                    reach a 200 in exactly ONE hop, with a permanent status.
 *
 * Usage:
 *   node scripts/validate-seo-routing.mjs [--base=http://localhost:3000]
 *                                         [--articles-sample=60] [--concurrency=6]
 *
 * `--articles-sample` bounds the /knowledge-hub/* portion only (812 URLs, the
 * bulk of the sitemap); EVERY non-article URL is checked in full on every run.
 * The script prints exactly how many articles it checked and how many it did not,
 * so a bounded run can never read as full coverage.
 */

const args = new Map(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, '').split('=');
    return [k, v.join('=') || 'true'];
  })
);
const BASE = (args.get('base') || 'http://localhost:3000').replace(/\/+$/, '');
const ARTICLES_SAMPLE = Number(args.get('articles-sample') ?? 60);
const CONCURRENCY = Number(args.get('concurrency') ?? 6);
/**
 * The sitemap always emits the PRODUCTION origin (CANONICAL_BASE), by design —
 * staging must never advertise its own hostname. So when probing a non-production
 * base, each <loc> is re-pointed at BASE and the canonical is compared against
 * the sitemap's own origin.
 */
const failures = [];
const warnings = [];
const fail = (msg) => failures.push(msg);

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    })
  );
  return out;
}

async function readHead(res) {
  if (!res.body) return await res.text();
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  try {
    while (buf.length < 96 * 1024) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      if (buf.includes('</head>')) break;
    }
  } finally {
    reader.cancel().catch(() => {});
  }
  return buf;
}

const strip = (u) => u.replace(/\/+$/, '');

// ── Phase 1: sitemap ────────────────────────────────────────────────────────
async function checkSitemap() {
  const res = await fetch(`${BASE}/sitemap.xml`);
  if (!res.ok) {
    fail(`sitemap.xml returned ${res.status} — nothing else in phase 1 can be checked.`);
    return;
  }
  const xml = await res.text();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  if (locs.length === 0) {
    fail('sitemap.xml contained no <loc> entries.');
    return;
  }

  const articles = locs.filter((u) => u.includes('/knowledge-hub/'));
  const others = locs.filter((u) => !u.includes('/knowledge-hub/'));
  let articleSlice = articles;
  if (ARTICLES_SAMPLE > 0 && articles.length > ARTICLES_SAMPLE) {
    const step = articles.length / ARTICLES_SAMPLE;
    articleSlice = Array.from({ length: ARTICLES_SAMPLE }, (_, i) => articles[Math.floor(i * step)]);
  }
  const targets = [...others, ...articleSlice];

  console.log(
    `[seo-validate] sitemap: ${locs.length} URLs. Checking ${others.length}/${others.length} ` +
      `non-article URLs and ${articleSlice.length}/${articles.length} articles ` +
      `(${articles.length - articleSlice.length} article URLs NOT checked this run).`
  );

  const results = await mapLimit(targets, CONCURRENCY, async (loc) => {
    const declared = new URL(loc);
    const probe = `${BASE}${declared.pathname === '/' ? '/' : declared.pathname}`;
    try {
      const r = await fetch(probe, { redirect: 'manual', headers: { 'user-agent': 'jbp-seo-validate' } });
      if (r.status !== 200) {
        await r.arrayBuffer().catch(() => {});
        return { loc, status: r.status, canonical: '', location: r.headers.get('location') || '' };
      }
      const head = await readHead(r);
      const tag = head.match(/<link[^>]+rel=["']canonical["'][^>]*>/i);
      const canonical = tag ? (tag[0].match(/href=["']([^"']+)["']/i) || ['', ''])[1] : '';
      return { loc, status: 200, canonical, location: '' };
    } catch (err) {
      return { loc, status: 0, canonical: '', location: '', error: String(err) };
    }
  });

  for (const r of results) {
    if (r.status !== 200) {
      fail(
        `SITEMAP URL DOES NOT SERVE: ${r.loc} → ${r.status}${r.location ? ` (Location: ${r.location})` : ''}` +
          `${r.error ? ` (${r.error})` : ''}. Remove it from the sitemap or fix the route.`
      );
      continue;
    }
    if (!r.canonical) {
      fail(`SITEMAP URL HAS NO CANONICAL: ${r.loc} returns 200 but declares no <link rel="canonical">.`);
      continue;
    }
    if (strip(r.canonical) !== strip(r.loc)) {
      fail(
        `CANONICAL MISMATCH: sitemap lists ${r.loc} but the page declares ${r.canonical}. ` +
          'A sitemap must list only self-canonical URLs — the non-self URL should 301 instead.'
      );
    }
  }
}

// ── Phase 2: robots.txt ─────────────────────────────────────────────────────
async function checkRobots() {
  const res = await fetch(`${BASE}/robots.txt`);
  if (!res.ok) return fail(`robots.txt returned ${res.status}.`);
  const body = await res.text();
  const disallows = body.split('\n').filter((l) => /^\s*Disallow\s*:\s*\S/i.test(l));
  if (/Disallow:\s*\/\s*$/im.test(body)) {
    // A whole-site Disallow means this host is deliberately opted out
    // (ROBOTS_DISALLOW=1 / off-brand host) — not a Brief 152 violation.
    warnings.push('robots.txt serves a site-wide `Disallow: /` — this host is opted out of crawling.');
    return;
  }
  for (const line of disallows) {
    fail(
      `robots.txt still carries "${line.trim()}". Brief 152 Fix 4 removed every Disallow: ` +
        'blocking the crawl makes the X-Robots-Tag noindex unreadable, which is what left 25 ' +
        'URLs permanently stuck in the index.'
    );
  }
  if (!/^Sitemap:\s*https?:\/\/\S+\/sitemap\.xml/im.test(body)) {
    fail('robots.txt no longer advertises the sitemap.');
  }
}

// ── Phase 3: X-Robots-Tag ───────────────────────────────────────────────────
async function checkNoindexHeaders() {
  for (const p of ['/admin', '/admin/login', '/api/cms/pages']) {
    const r = await fetch(`${BASE}${p}`, { redirect: 'manual' });
    await r.arrayBuffer().catch(() => {});
    const tag = r.headers.get('x-robots-tag') || '';
    if (!/noindex/i.test(tag)) {
      fail(`${p} answered ${r.status} with X-Robots-Tag "${tag || '(absent)'}" — expected noindex, nofollow.`);
    }
  }
  for (const p of ['/robots.txt', '/sitemap.xml', '/']) {
    const r = await fetch(`${BASE}${p}`, { redirect: 'manual' });
    await r.arrayBuffer().catch(() => {});
    const tag = r.headers.get('x-robots-tag');
    if (tag) fail(`${p} must NOT carry an X-Robots-Tag header, but sent "${tag}".`);
  }
}

// ── Phase 4: redirects reach a 200 in one hop ───────────────────────────────
const PERMANENT = [301, 308];

async function hops(startPath, max = 6) {
  const chain = [];
  let url = new URL(startPath, BASE).toString();
  for (let i = 0; i < max; i++) {
    const r = await fetch(url, { redirect: 'manual' });
    const loc = r.headers.get('location');
    chain.push({ url, status: r.status, location: loc || '' });
    await r.arrayBuffer().catch(() => {});
    if (!loc || r.status < 300 || r.status >= 400) return chain;
    url = new URL(loc, url).toString();
  }
  return chain;
}

async function checkRedirects() {
  const cases = [
    { path: '/evanston/', label: 'trailing slash on a live page' },
    { path: '/bathroom-plumbing', label: 'alias slug (WordPress Redirection id 1)' },
    { path: '/bathroom-plumbing/', label: 'slashed alias — must NOT chain through /bathroom-plumbing' },
    { path: '/why-us/', label: 'slashed config redirect source' },
    { path: '/hoa-line-piping', label: 'corrected HOA slug (Brief 152 Fix 2.4)' },
    { path: '/clogged-drains', label: 'derived hub alias' },
  ];
  for (const c of cases) {
    const chain = await hops(c.path);
    const redirects = chain.filter((h) => h.status >= 300 && h.status < 400);
    const last = chain[chain.length - 1];
    if (redirects.length === 0) {
      fail(`${c.path} (${c.label}) did not redirect at all — got ${last.status}.`);
      continue;
    }
    if (redirects.length > 1) {
      fail(
        `REDIRECT CHAIN: ${c.path} (${c.label}) took ${redirects.length} hops — ` +
          chain.map((h) => `${h.status} ${new URL(h.url).pathname}`).join(' → ')
      );
    }
    for (const h of redirects) {
      if (!PERMANENT.includes(h.status)) {
        fail(`${c.path}: hop ${new URL(h.url).pathname} used ${h.status}, not a permanent redirect.`);
      }
    }
    if (last.status !== 200) {
      fail(`${c.path} (${c.label}) ended on ${last.status} at ${last.url}, not a 200.`);
    }
  }

  // The root must never redirect.
  const root = await hops('/');
  if (root.length !== 1 || root[0].status !== 200) {
    fail(`"/" must serve 200 with no redirect — got ${root.map((h) => h.status).join(' → ')}.`);
  }
}

const main = async () => {
  console.log(`[seo-validate] base = ${BASE}`);
  await checkSitemap();
  await checkRobots();
  await checkNoindexHeaders();
  await checkRedirects();

  for (const w of warnings) console.log(`[seo-validate] NOTE: ${w}`);
  if (failures.length > 0) {
    console.error(`\n${'!'.repeat(72)}\n[seo-validate] FAILED — ${failures.length} violation(s):\n`);
    for (const f of failures) console.error(`  ✗ ${f}`);
    console.error(`${'!'.repeat(72)}\n`);
    process.exit(1);
  }
  console.log('[seo-validate] OK — sitemap self-canonical and serving, robots clean, noindex headers set, no redirect chains.');
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
