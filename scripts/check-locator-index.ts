/**
 * Brief 171, Track C2 — the drift guard for
 * `src/lib/content/locator-index.generated.ts`.
 *
 * ─── What it protects ──────────────────────────────────────────────────────
 * The store locator's search index is a GENERATED file checked into the repo.
 * That is the right trade (it keeps `CITY_REGISTRY` and every city copy file out
 * of the browser bundle — see `build-locator-index.ts`), but it means the file
 * silently goes stale the day someone registers city 387 or moves a city between
 * dispatch offices. A stale index does not error: it just quietly stops finding
 * the new town, on the highest-traffic page on the site.
 *
 * So this regenerates the content in memory from the live registry and compares
 * it byte-for-byte with what is committed. Different → print the diff and exit
 * non-zero. It imports `renderIndex()` from the generator rather than
 * re-implementing the format, so the two can never disagree about quoting,
 * sorting or the header comment.
 *
 * Same discipline as `scripts/check-ohio-slug-collisions.ts` and
 * `scripts/check-brief-159-status-invariant.ts`.
 *
 * ─── Where it runs ─────────────────────────────────────────────────────────
 * `npm run check:locator-index`. No DB, no network — safe anywhere.
 *
 * In CI it runs in `deploy.yml`'s "Deploy via SSH" step, immediately before
 * `npm run build`. That step has `script_stop: true`, so drift aborts the deploy
 * before anything is built. It is deliberately NOT chained onto `prebuild`: that
 * slot runs `validate-sitemap.ts`, and one failure must not be mistaken for the
 * other.
 *
 * Run:  npm run check:locator-index
 */
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { OUT_PATH, renderIndex } from './build-locator-index';

const REL = path.relative(process.cwd(), OUT_PATH);

function main(): void {
  const expected = renderIndex();

  if (!existsSync(OUT_PATH)) {
    console.error(`FAIL  ${REL} does not exist. Run: npm run build:locator-index`);
    process.exit(1);
  }

  // Normalize line endings only. Git may check the file out with CRLF on
  // Windows; that is not drift, and failing a deploy over it would be noise.
  const actual = readFileSync(OUT_PATH, 'utf8').replace(/\r\n/g, '\n');
  const want = expected.replace(/\r\n/g, '\n');

  if (actual === want) {
    const entries = want.split('\n').filter((l) => l.startsWith('  [')).length;
    console.log(`OK    ${REL} matches the registry (${entries} entries).`);
    return;
  }

  const a = actual.split('\n');
  const b = want.split('\n');
  const diffs: string[] = [];
  for (let i = 0; i < Math.max(a.length, b.length) && diffs.length < 40; i++) {
    if (a[i] === b[i]) continue;
    diffs.push(`  line ${i + 1}:`);
    diffs.push(`    committed: ${a[i] === undefined ? '(missing)' : a[i]}`);
    diffs.push(`    registry:  ${b[i] === undefined ? '(missing)' : b[i]}`);
  }

  console.error(`FAIL  ${REL} has drifted from CITY_REGISTRY.`);
  console.error(`      committed: ${a.length} lines / registry: ${b.length} lines`);
  console.error(diffs.join('\n'));
  if (diffs.length >= 40) console.error('  … more differences not shown.');
  console.error('\nFix: npm run build:locator-index   (then commit the regenerated file)');
  process.exit(1);
}

main();
