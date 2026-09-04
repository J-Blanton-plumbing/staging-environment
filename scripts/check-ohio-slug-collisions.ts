/**
 * Columbus Integration Brief 02 (Track A2/A3) — the slug collision gate.
 *
 * Every Ohio area page is a ROOT-level slug (`/dublin`, `/columbus-short-north`),
 * which is the most crowded namespace on the site: it is shared with the Illinois
 * city registry, every literal route directory under src/app, the sub-service
 * routes, and ~5,000 redirect sources. A collision does not error — it silently
 * reassigns or shadows an existing page. Brief 02 A2 is explicit that the answer
 * is to STOP and report, not to guess.
 *
 * So this runs the check mechanically and prints a verdict. It is safe to re-run
 * at any time and is the thing to run first after editing
 * `src/lib/content/cities/ohio-areas.ts`.
 *
 * What it checks each Ohio slug against:
 *   1. DUPLICATE   — another entry in the Ohio list itself.
 *   2. IL REGISTRY — an existing CITY_REGISTRY slug. This is the dangerous one:
 *                    two registry rows with one slug means the Ohio entry wins or
 *                    loses arbitrarily and an Illinois page changes state/office.
 *   3. ROUTE DIR   — a literal directory under src/app (`/financing`,
 *                    `/locations`, …). A literal segment beats `[city]`, so the
 *                    Ohio page would never render.
 *   4. SUB-SERVICE — a SUB_SERVICE_ROUTES slug, same shadowing problem.
 *   5. REDIRECT    — a redirect source in next.config.mjs, the generated legacy
 *                    map, the alias map, or the city-scoped rule. The redirect
 *                    runs in middleware, before the page, so the Ohio page would
 *                    301 away and the build validator would fail the sitemap.
 *
 * Run:
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/check-ohio-slug-collisions.ts
 *
 * Exit 0 = clear to register. Exit 1 = at least one collision; do not register.
 */
import { execFileSync } from 'child_process';
import { readdirSync, statSync } from 'fs';
import path from 'path';

import { CITY_REGISTRY } from '@/lib/content/cities';
import { OHIO_AREAS } from '@/lib/content/cities/ohio-areas';
import { SUB_SERVICE_ROUTES } from '@/lib/content/service-taxonomy';
import { allRedirectSources } from '@/lib/redirects/lookup';
import { lookupCityScopedRedirect } from '@/lib/redirects/city-scoped';

const REPO = path.resolve(__dirname, '..');
const APP_DIR = path.join(REPO, 'src', 'app');

interface Collision {
  slug: string;
  name: string;
  kind: string;
  detail: string;
}

function nextConfigRedirectSources(): Set<string> {
  const dumper = path.join(REPO, 'scripts', 'lib', 'dump-next-config.mjs');
  const raw = execFileSync(process.execPath, [dumper], { encoding: 'utf8', cwd: REPO });
  const cfg = JSON.parse(raw) as { redirects: Array<{ source: string }> };
  return new Set(cfg.redirects.map((r) => r.source));
}

function main() {
  /**
   * The Illinois baseline is every registry row whose `state` is NOT Ohio.
   *
   * It must be defined by `state`, NOT by "slug is absent from OHIO_AREAS". This
   * script has to give the same answer before and after the Ohio slugs are
   * registered, and the slug-based form silently defeated itself: with the
   * Woodstock override removed, `woodstock` appears in OHIO_AREAS, so the
   * slug-based filter dropped the Illinois Woodstock from the baseline and the
   * gate reported "no collisions" on the one collision in the list. Filtering by
   * `state` is stable across registration and cannot hide a row that way.
   *
   * `columbus` falls out of this baseline on its own — Brief 154 already set its
   * state to Ohio — which is correct: `ohio-areas.ts` lists it so the coverage
   * list stays a faithful copy, and `index.ts` folds it into that existing entry
   * rather than adding a second row.
   */
  const existingIllinois = new Map(
    CITY_REGISTRY.filter((c) => c.state !== 'Ohio').map((c) => [c.slug, c.name])
  );

  const routeDirs = new Set(
    readdirSync(APP_DIR)
      .filter((n) => statSync(path.join(APP_DIR, n)).isDirectory())
      .filter((n) => !n.startsWith('[') && !n.startsWith('(') && !n.startsWith('_'))
  );
  const subServices = new Set<string>(SUB_SERVICE_ROUTES);
  const mapSources = new Set(allRedirectSources());
  const configSources = nextConfigRedirectSources();

  const collisions: Collision[] = [];
  const seen = new Map<string, string>();

  for (const area of OHIO_AREAS) {
    const { slug, name } = area;
    const p = `/${slug}`;

    const dup = seen.get(slug);
    if (dup) {
      collisions.push({ slug, name, kind: 'DUPLICATE', detail: `also supplied as "${dup}"` });
    }
    seen.set(slug, name);

    // See the baseline comment above for why `columbus` needs no special case here.
    if (existingIllinois.has(slug)) {
      collisions.push({
        slug,
        name,
        kind: 'IL REGISTRY',
        detail: `CITY_REGISTRY already serves /${slug} as "${existingIllinois.get(slug)}" (Illinois)`,
      });
    }
    if (routeDirs.has(slug)) {
      collisions.push({
        slug, name, kind: 'ROUTE DIR',
        detail: `src/app/${slug}/ is a literal route — it beats [city] and the Ohio page never renders`,
      });
    }
    if (subServices.has(slug)) {
      collisions.push({ slug, name, kind: 'SUB-SERVICE', detail: `SUB_SERVICE_ROUTES already claims /${slug}` });
    }
    if (configSources.has(p) || configSources.has(`${p}/`)) {
      collisions.push({ slug, name, kind: 'REDIRECT', detail: `next.config.mjs redirects ${p}` });
    }
    if (mapSources.has(p)) {
      collisions.push({ slug, name, kind: 'REDIRECT', detail: `${p} is a source in the legacy/alias redirect map` });
    }
    const cityScoped = lookupCityScopedRedirect(p);
    if (cityScoped) {
      collisions.push({ slug, name, kind: 'REDIRECT', detail: `city-scoped rule redirects ${p} → ${cityScoped}` });
    }
  }

  const byKind = new Map<string, number>();
  for (const c of collisions) byKind.set(c.kind, (byKind.get(c.kind) ?? 0) + 1);

  console.log(
    `[ohio-slugs] checked ${OHIO_AREAS.length} Ohio slugs ` +
      `(${OHIO_AREAS.filter((a) => a.kind === 'municipality').length} municipalities, ` +
      `${OHIO_AREAS.filter((a) => a.kind === 'neighborhood').length} Columbus neighborhoods) ` +
      `against ${existingIllinois.size} Illinois registry slugs, ${routeDirs.size} literal route dirs, ` +
      `${subServices.size} sub-service routes, ${mapSources.size} mapped + ${configSources.size} config redirect sources.`
  );

  if (collisions.length === 0) {
    console.log('[ohio-slugs] OK — no collisions. Clear to register.');
    return;
  }

  console.error(`\n${'!'.repeat(72)}\n[ohio-slugs] ${collisions.length} COLLISION(S) — DO NOT REGISTER:\n`);
  for (const c of collisions) {
    console.error(`  ✗ [${c.kind}] "${c.name}" → /${c.slug}\n      ${c.detail}`);
  }
  console.error(
    `\nBy kind: ${[...byKind].map(([k, n]) => `${k}=${n}`).join(', ')}\n` +
      'Resolve each in src/lib/content/cities/ohio-areas.ts (SLUG_OVERRIDES) — never by\n' +
      `renaming an Illinois page, whose URL is live and ranked.\n${'!'.repeat(72)}\n`
  );
  process.exit(1);
}

main();
