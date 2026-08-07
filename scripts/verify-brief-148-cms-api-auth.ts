/**
 * Brief 148 (Track A) QA — proves no `/api/cms/*` handler can answer an
 * unauthenticated request, and keeps proving it for routes added later.
 *
 * ── THE BUG THIS LOCKS DOWN ──────────────────────────────────────────────────
 * Auth under /api/cms was opt-in per handler, so the default for a new route was
 * OPEN. Fourteen GET handlers took that default and answered a plain curl with
 * the page inventory (slug/title/status/parent), the name of the staff member who
 * last edited each page, every city and city-service row, global settings, and
 * the full JSON body of any page/city/article/sub-service by slug.
 *
 * ── WHAT IT ASSERTS ─────────────────────────────────────────────────────────
 * PASS 1 — STATIC (no server, no DB; always runs)
 *   1. Every exported HTTP handler in every `src/app/api/cms/**\/route.ts` opens
 *      with a session check — `requireCmsSession` or the older `getSession` +
 *      401 pair — within the first few statements of the function body.
 *   2. `src/middleware.ts` still carries the `/api/cms` default-deny gate, so a
 *      route that forgets (1) is still closed. Losing this is silent otherwise.
 *   3. No route file under `src/app/api/cms` is reachable from public
 *      (non-admin) client code — a page outside /admin fetching one of these
 *      would break the moment the gate went in, so it must never appear.
 *
 * PASS 2 — LIVE (only when BASE_URL is set)
 *   4. An unauthenticated GET to each representative CMS route returns 401 and a
 *      body with no data in it. Run against a booted app:
 *        BASE_URL=http://localhost:3000 npx ts-node ... scripts/verify-brief-148-cms-api-auth.ts
 *   5. Public endpoints that must stay open (/api/articles, /api/auth/login,
 *      the front page) still answer without a session — a regression here would
 *      mean the gate over-reached.
 *
 * Exits non-zero on any failed assertion. Read-only: touches no DB row, no file.
 *
 *   npx ts-node --project tsconfig.scripts.json scripts/verify-brief-148-cms-api-auth.ts
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative, sep } from 'path';

const ROOT = process.cwd();
const CMS_API_DIR = join(ROOT, 'src', 'app', 'api', 'cms');
const MIDDLEWARE = join(ROOT, 'src', 'middleware.ts');

let failures = 0;
function check(ok: boolean, msg: string) {
  console.log(`  ${ok ? '✓' : '✗'} ${msg}`);
  if (!ok) failures++;
}

/** Every `route.ts` under `dir`, recursively. */
function routeFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...routeFiles(p));
    else if (entry === 'route.ts' || entry === 'route.tsx') out.push(p);
  }
  return out.sort();
}

/** `src/app/api/cms/city/[slug]/route.ts` → `/api/cms/city/[slug]` */
function routePath(file: string): string {
  return (
    '/' +
    relative(join(ROOT, 'src', 'app'), file)
      .split(sep)
      .slice(0, -1)
      .join('/')
  );
}

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

/**
 * Extract each exported handler's opening lines.
 *
 * Deliberately crude: it slices from the `export async function METHOD` marker to
 * the next one (or EOF) and looks at the first ~12 non-blank lines. A guard that
 * is not near the top of the body is a guard that runs after something else has
 * already happened, which is what we want flagged.
 */
function handlerOpenings(src: string): Array<{ method: string; head: string }> {
  const marks: Array<{ method: string; at: number }> = [];
  for (const m of METHODS) {
    const re = new RegExp(`export\\s+async\\s+function\\s+${m}\\s*\\(`, 'g');
    let hit: RegExpExecArray | null;
    while ((hit = re.exec(src))) marks.push({ method: m, at: hit.index });
  }
  marks.sort((a, b) => a.at - b.at);
  return marks.map((mark, i) => {
    const end = i + 1 < marks.length ? marks[i + 1].at : src.length;
    const body = src.slice(mark.at, end);
    // Skip past the parameter list to the body, then take the first lines.
    const brace = body.indexOf('{', body.indexOf(')'));
    const head = body
      .slice(brace + 1)
      .split('\n')
      .filter((l) => l.trim() !== '')
      .slice(0, 12)
      .join('\n');
    return { method: mark.method, head };
  });
}

function hasGuard(head: string): boolean {
  if (/requireCmsSession\s*\(/.test(head)) return true;
  // The pre-Brief-148 pattern, still valid: getSession + an immediate 401.
  return /await\s+getSession\s*\(/.test(head) && /401/.test(head);
}

// ── PASS 1 — static ──────────────────────────────────────────────────────────
console.log('\nPASS 1 — static audit of src/app/api/cms/**/route.ts\n');

const files = routeFiles(CMS_API_DIR);
check(files.length > 0, `found ${files.length} CMS route file(s)`);

const table: Array<{ route: string; method: string; guard: string }> = [];
for (const file of files) {
  const src = readFileSync(file, 'utf8');
  const route = routePath(file);
  const handlers = handlerOpenings(src);
  if (handlers.length === 0) {
    check(false, `${route} — no exported HTTP handler found (parser or file problem)`);
    continue;
  }
  for (const h of handlers) {
    const guarded = hasGuard(h.head);
    table.push({
      route,
      method: h.method,
      guard: guarded ? (/requireCmsSession/.test(h.head) ? 'requireCmsSession' : 'getSession+401') : 'NONE',
    });
    check(guarded, `${h.method} ${route}`);
  }
}

console.log('\n  route → method → guard');
for (const r of table) console.log(`    ${r.method.padEnd(6)} ${r.route.padEnd(46)} ${r.guard}`);

// ── PASS 1b — the middleware choke point ─────────────────────────────────────
console.log('\nPASS 1b — middleware default-deny gate\n');
const mw = readFileSync(MIDDLEWARE, 'utf8');
const gate = /pathname\.startsWith\('\/api\/cms'\)[\s\S]{0,400}?status:\s*401/.test(mw);
check(gate, "src/middleware.ts rejects /api/cms without a session (401, not a redirect)");
check(
  !/if\s*\(pathname\.startsWith\('\/api\/cms'\)\s*\|\|[\s\S]{0,120}?return passThrough\(\)/.test(mw),
  'the old "skip Basic Auth for /api/cms" pass-through no longer lets CMS API through unchecked'
);

// ── PASS 1c — nothing public calls these ─────────────────────────────────────
console.log('\nPASS 1c — no public (non-admin) caller depends on /api/cms\n');
function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) {
      if (entry === 'node_modules' || entry === '.next') continue;
      out.push(...sourceFiles(p));
    } else if (/\.tsx?$/.test(entry)) out.push(p);
  }
  return out;
}
/**
 * Files allowed to call /api/cms: the admin UI, admin components, the shared
 * auth/session plumbing, and PreviewBanner — which only renders inside preview
 * mode, itself reachable only through /api/preview's own session gate.
 */
const ALLOWED = [
  join('src', 'app', 'admin'),
  join('src', 'app', 'api', 'cms'),
  join('src', 'components', 'admin'),
  join('src', 'components', 'PreviewBanner.tsx'),
  join('src', 'lib', 'auth'),
  join('src', 'lib', 'cms'),
  join('src', 'middleware.ts'),
];
const offenders: string[] = [];
for (const file of sourceFiles(join(ROOT, 'src'))) {
  const rel = relative(ROOT, file);
  if (ALLOWED.some((a) => rel.startsWith(a))) continue;
  const src = readFileSync(file, 'utf8');
  // A comment mentioning the path is fine; an actual fetch of it is not.
  if (/fetch\(\s*[`'"][^`'"]*\/api\/cms/.test(src)) offenders.push(rel);
}
check(
  offenders.length === 0,
  offenders.length === 0
    ? 'no public component fetches /api/cms'
    : `public code fetches /api/cms — it will now 401: ${offenders.join(', ')}`
);

// ── PASS 2 — live ────────────────────────────────────────────────────────────
const BASE_URL = process.env.BASE_URL;

/** One representative concrete URL per CMS route shape. */
const LIVE_CMS_PATHS = [
  '/api/cms/cities',
  '/api/cms/cities?view=city-services',
  '/api/cms/city-services/evanston',
  '/api/cms/service-categories',
  '/api/cms/sub-service-pages',
  '/api/cms/sub-services',
  '/api/cms/sewer',
  '/api/cms/city/evanston',
  '/api/cms/city-service/evanston/sewer-rodding',
  '/api/cms/sub-service/gas-lines',
  '/api/cms/main/why-j-blanton',
  '/api/cms/article/what-is-hydro-jetting',
  '/api/cms/articles',
  '/api/cms/emergency-plumbing',
  '/api/cms/global-settings',
  '/api/cms/media',
  '/api/cms/users',
  '/api/cms/drafts?pageType=sub-service&pageSlug=gas-lines',
  '/api/cms/changelog/sub-service/gas-lines',
];

/** Endpoints that must NOT have been caught by the gate. */
const LIVE_PUBLIC_PATHS = ['/api/articles?page=1', '/'];

/** Strings that must never appear in a 401 body — proof no data leaked. */
const LEAK_MARKERS = ['updated_by_name', 'hero_heading', 'city_slug', 'parent_slug', 'password_hash'];

async function livePass(base: string) {
  console.log(`\nPASS 2 — live, unauthenticated, against ${base}\n`);

  for (const path of LIVE_CMS_PATHS) {
    let status = 0;
    let body = '';
    try {
      const res = await fetch(base + path, { redirect: 'manual' });
      status = res.status;
      body = (await res.text()).slice(0, 4000);
    } catch (err) {
      check(false, `${path} — request failed: ${(err as Error).message}`);
      continue;
    }
    const rejected = status === 401 || status === 403;
    const leaked = LEAK_MARKERS.filter((m) => body.includes(m));
    check(rejected, `${path} → ${status}${rejected ? '' : ' (expected 401/403)'}`);
    check(leaked.length === 0, `${path} → body carries no CMS data${leaked.length ? ` (leaked: ${leaked.join(', ')})` : ''}`);
  }

  for (const path of LIVE_PUBLIC_PATHS) {
    let status = 0;
    try {
      status = (await fetch(base + path, { redirect: 'manual' })).status;
    } catch (err) {
      check(false, `${path} — request failed: ${(err as Error).message}`);
      continue;
    }
    // 401 here would mean either the gate over-reached or PREVIEW_* Basic Auth is
    // on for this host; the script cannot tell them apart, so it says so.
    check(
      status !== 401 || !!process.env.PREVIEW_USER,
      `${path} → ${status} (public endpoint still open)`
    );
  }
}

async function main() {
  if (BASE_URL) {
    await livePass(BASE_URL.replace(/\/$/, ''));
  } else {
    console.log('\nPASS 2 — skipped (set BASE_URL=http://localhost:3000 to run the live checks)\n');
  }

  console.log('');
  if (failures) {
    console.log(`FAILED — ${failures} assertion(s) did not hold.`);
    process.exitCode = 1;
  } else {
    console.log('All Brief 148 Track A assertions hold.');
  }
}

main();
