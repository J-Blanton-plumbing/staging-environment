/**
 * Brief 131 Track D — re-verify every legacy-redirect target against a CMS DB.
 *
 * The map generator needs the 146 MB WordPress export, which only exists on the
 * marketing workstation, so it cannot be re-run on the server. But the thing
 * Track D actually needs to prove is narrower and portable: **every `to` in the
 * checked-in map still resolves to a published 200 in THIS environment.**
 *
 * Publish status is the only per-environment input — the static routes, the city
 * registry, and the service registry all ship in the same commit. So this script
 * reads `src/lib/redirects/legacy-redirect-map.json` and re-runs the generator's
 * own `isServed()` against whatever `DATABASE_URL` points at. Same predicate, no
 * export required.
 *
 * Usage (on the box, after a deploy — reads the env file the app uses):
 *   set -a; . ./.env.local; set +a
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/verify-redirect-targets.ts
 *
 * Exits non-zero if the DB is unreachable or any target fails, so it is safe to
 * wire into deploy.yml as a gate.
 */
import * as fs from 'fs';
import * as path from 'path';
import { isServed, loadServedRoutes } from './build-legacy-redirect-map';

const MAP_PATH = path.resolve(__dirname, '..', 'src', 'lib', 'redirects', 'legacy-redirect-map.json');

interface RedirectRow {
  from: string;
  to: string;
  status: number;
  bucket: string;
}

async function main() {
  const entries = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8')) as RedirectRow[];
  const routes = await loadServedRoutes();

  if (!routes.dbAvailable) {
    // Never report "verified" off an unreachable DB — that is the exact failure
    // mode Track D exists to prevent.
    throw new Error(
      'CMS DB unreachable — targets cannot be publish-verified. Set DATABASE_URL and re-run.'
    );
  }

  console.log(`map    : ${entries.length} entries from ${path.relative(process.cwd(), MAP_PATH)}`);
  console.log(
    `routes : ${routes.staticPaths.size} static · ${routes.cities.size} cities · ` +
      `${routes.services.size} services · ${routes.publishedSubServices.size} published sub-services · ` +
      `${routes.publishedArticles.size} published articles`
  );

  const targets = [...new Set(entries.map((e) => e.to))].sort();
  const failures: Array<{ to: string; sources: number }> = [];
  for (const to of targets) {
    if (!isServed(to, routes)) {
      failures.push({ to, sources: entries.filter((e) => e.to === to).length });
    }
  }

  // A source that the build now serves as a 200 would be silently 301'd away by
  // middleware — the same shadowing guard the generator applies at build time,
  // re-checked here because publish status can turn a 404 source into a 200 one.
  const shadowed = entries.filter((e) => isServed(e.from, routes));

  console.log(`\ndistinct targets : ${targets.length}`);
  console.log(`unserved targets : ${failures.length}`);
  console.log(`shadowed sources : ${shadowed.length}`);

  for (const f of failures) {
    console.log(`  ✗ ${f.to}  (target of ${f.sources} redirect${f.sources === 1 ? '' : 's'})`);
  }
  for (const s of shadowed.slice(0, 20)) {
    console.log(`  ✗ ${s.from} is served as a 200 but the map 301s it to ${s.to}`);
  }

  if (failures.length || shadowed.length) {
    throw new Error(
      `${failures.length} unserved target(s) and ${shadowed.length} shadowed source(s) — ` +
        'fix the CMS publish state or regenerate the map before cutover.'
    );
  }
  console.log('\n✔ every redirect target resolves to a published 200 in this environment');
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
