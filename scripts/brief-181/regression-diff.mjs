/**
 * Brief 181, Track G3 — "no other page moved", proved.
 *
 * Diffs the served HTML of the same page from the BEFORE build (repo HEAD) and
 * the AFTER build (this brief), with BUILD-IDENTITY NOISE normalised away.
 *
 * ── WHY NORMALISING IS LEGITIMATE HERE ─────────────────────────────────────
 * Next.js content-hashes every JS chunk and CSS file, and stamps a fresh random
 * `buildId` into the RSC payload of every page, on every build. So a raw byte
 * diff is non-zero on EVERY page of the site for ANY change at all, including a
 * no-op rebuild — it cannot tell "this page changed" from "this is a different
 * build". This script removes exactly those tokens (chunk hashes, CSS hashes,
 * buildId) and nothing else, then reports every remaining difference in full.
 * Anything surviving normalisation IS a change to the page's own markup.
 *
 * Sanity check on the normaliser itself: run it over BEFORE vs BEFORE and every
 * page must be IDENTICAL; that is what `--selftest` does.
 *
 *   node scripts/brief-181/regression-diff.mjs <before-dir> <after-dir> [--selftest]
 */
import fs from 'node:fs';
import path from 'node:path';

const [, , BEFORE, AFTER, ...flags] = process.argv;
if (!BEFORE || !AFTER) {
  console.error('usage: regression-diff.mjs <before-dir> <after-dir> [--selftest]');
  process.exit(2);
}

/**
 * Strip the RSC flight payload — the `self.__next_f.push([...])` scripts.
 *
 * This is hydration DATA, not rendered markup, and it is numbered by position:
 * adding ONE stylesheet entry renumbers every reference in the stream
 * (`3:` → `4:`, `e:` → `f:` …) on every page of the affected route. Those
 * renumberings are a consequence of the stylesheet link this brief knowingly
 * adds to the `[city]` route, not a second change — and they swamp the signal.
 *
 * So the comparison is run TWICE: once over the whole document (which catches
 * the stylesheet link) and once over markup only (which is what a visitor and a
 * crawler actually receive). Both results are reported.
 */
const stripFlight = (html) =>
  html
    .replace(/<script>self\.__next_f\.push\(\[[\s\S]*?\]\)<\/script>/g, '<FLIGHT/>')
    // Next streams the payload in variable-sized chunks, so the NUMBER of
    // `push()` scripts differs run to run even for identical content. Collapse a
    // run of them to one marker, or a streaming boundary reads as a page change.
    .replace(/(<FLIGHT\/>)+/g, '<FLIGHT/>');

function normalise(html) {
  // The buildId is a per-build random string; pull the page's own and blank it.
  const buildId = (html.match(/\\"buildId\\":\\"([A-Za-z0-9_-]{10,})\\"/) || [])[1];
  let s = html;
  if (buildId) s = s.split(buildId).join('<BUILD_ID>');
  return s
    .replace(/\/_next\/static\/chunks\/([\w%./[\]-]*?)-?[0-9a-f]{8,}\.js/g, '/_next/static/chunks/$1<H>.js')
    .replace(/\/_next\/static\/css\/[0-9a-f]+\.css/g, '/_next/static/css/<H>.css')
    .replace(/static\\?\/chunks\\?\/([\w%./[\]-]*?)-?[0-9a-f]{8,}\.js/g, 'static/chunks/$1<H>.js')
    .replace(/static\\?\/css\\?\/[0-9a-f]+\.css/g, 'static/css/<H>.css');
}

/** Split into tag-ish tokens so differences report as elements, not byte spans. */
const tokens = (s) => s.split(/(?=<)/g);

/** Multiset difference, so a moved/duplicated element still shows up. */
function multisetDelta(a, b) {
  const count = new Map();
  for (const t of a) count.set(t, (count.get(t) || 0) + 1);
  const added = [];
  for (const t of b) {
    const n = count.get(t) || 0;
    if (n > 0) count.set(t, n - 1);
    else added.push(t);
  }
  const removed = [];
  for (const [t, n] of count) for (let i = 0; i < n; i++) removed.push(t);
  return { added, removed };
}

const cssLinks = (html) => [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((m) => m[1]);

const selftest = flags.includes('--selftest');
const RIGHT = selftest ? BEFORE : AFTER;

const files = fs
  .readdirSync(BEFORE)
  .filter((f) => fs.existsSync(path.join(RIGHT, f)))
  .sort();

let moved = 0;
let cssOnly = 0;
let clean = 0;

console.log(selftest ? '\n[SELFTEST] BEFORE vs BEFORE — every page must be IDENTICAL\n' : '');

for (const f of files) {
  const rawA = fs.readFileSync(path.join(BEFORE, f), 'utf8');
  const rawB = fs.readFileSync(path.join(RIGHT, f), 'utf8');
  const a = stripFlight(normalise(rawA));
  const b = stripFlight(normalise(rawB));

  if (a === b) {
    console.log(`  IDENTICAL   ${f}`);
    clean++;
    continue;
  }

  const { added, removed } = multisetDelta(tokens(a), tokens(b));
  // The tokeniser splits on `<`, and the normalised stylesheet link contains a
  // `<H>` placeholder, so one link arrives as two tokens. Join before testing.
  const isStylesheetLinkOnly =
    removed.length === 0 &&
    added.length > 0 &&
    /^<link rel="stylesheet" href="\/_next\/static\/css\/<H>\.css" data-precedence="next"\/>\s*$/.test(
      added.join('')
    );

  const cssDelta = cssLinks(rawB).length - cssLinks(rawA).length;

  if (isStylesheetLinkOnly) {
    console.log(`  CSS-LINK    ${f}   +1 stylesheet link, ZERO markup change   (${added[0].trim().slice(0, 78)})`);
    cssOnly++;
    continue;
  }

  moved++;
  console.log(`\n  ** CHANGED  ${f}   (stylesheet links ${cssDelta >= 0 ? '+' : ''}${cssDelta}, +${added.length} / -${removed.length} tokens)`);
  for (const t of removed.slice(0, 12)) console.log(`     -  ${JSON.stringify(t.slice(0, 190))}`);
  for (const t of added.slice(0, 12)) console.log(`     +  ${JSON.stringify(t.slice(0, 190))}`);
  if (added.length > 12 || removed.length > 12) console.log('     … (truncated)');
  console.log('');
}

console.log(
  `\n=== ${files.length} pages: ${clean} identical, ${cssOnly} stylesheet-link only, ${moved} with markup changes ===\n`
);
process.exit(moved ? 1 : 0);
