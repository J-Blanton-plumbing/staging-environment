/**
 * Brief 181 copy-diff harness (re-implementation of Brief 180's `copy-diff.mjs`,
 * which was a scratch script and was never committed to the repo).
 *
 * Flattens every user-visible string out of the V3 content module and asserts
 * each one is present in a served HTML document. The point is to prove the
 * promotion moved the approved copy WITHOUT editing it: run it against the
 * approved page (`/hanover-park-test` on production) and the promoted page
 * (`/hanover-park`) and both must come back clean.
 *
 *   ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/brief-181/copy-diff.ts <html-file> [<html-file2> ...]
 */
import fs from 'node:fs';

/*
 * Keys that are not user-visible prose. `href`/`src`/`image` are attributes, not
 * copy; `alt` IS user-visible but lives in an attribute, so the text extractor
 * below cannot see it and it is checked separately (see ATTRIBUTE_FIELDS).
 * `flag` is an authoring note that renders as an HTML comment. `officeCity` and
 * `officeAddressFallback` are lookup keys.
 */
const NON_COPY_KEYS = new Set([
  'href', 'src', 'image', 'icon', 'slug', 'elfsightId', 'id', 'mapQuery', 'alt',
  'title', 'flag', 'gbpUrl', 'gbpName', 'backgroundImage', 'officeCity',
  'officeAddressFallback', 'placeholder',
]);

/* Rendered into an attribute, so asserted against the raw HTML, not its text. */
const ATTRIBUTE_FIELDS: Array<[string, (c: any) => string]> = [
  ['meta.description', (c) => c.meta.description],
  ['whyUs.map.title', (c) => c.whyUs.map.title],
  ['reviews.items[].gbpUrl', (c) => c.reviews.items.map((r: any) => r.gbpUrl).join('|')],
];

/*
 * D5 — the two alt strings Brief 181 DELIBERATELY rewrote.
 *
 * Reported separately because they are the one category of text this brief was
 * authorised to change, so running the harness against the pre-D5 approved page
 * MUST show them absent. Folding them in with the approved copy would make a
 * correct result look like a failure, and a regression look like D5.
 */
const D5_ALT_FIELDS: Array<[string, (c: any) => string]> = [
  ['hero.image.alt', (c) => c.hero.image.alt],
  ['featuredService.image.alt', (c) => c.featuredService.image.alt],
];

/* `meta.*` renders into <title>/<meta>, never into body text. */
const ATTRIBUTE_ONLY_PREFIXES = ['meta.'];

/*
 * NOT RENDERED, on purpose. `video.*` is the section Marketing suspended on
 * 2026-09-17 ("take it out completely FOR NOW") — its approved copy stays in the
 * module so restoring the section is a template change only. Reported
 * separately rather than absorbed into a pass, which is Brief 180's rule.
 */
const SUSPENDED_PREFIXES = ['video.'];

/* `{{phone}}` is a token resolved at render; the number itself is asserted. */
const TOKENS = new Set(['{{phone}}']);

function flatten(node: unknown, path: string, out: Array<{ path: string; value: string }>) {
  if (typeof node === 'string') {
    const v = node.trim();
    if (v) out.push({ path, value: v });
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((n, i) => flatten(n, `${path}[${i}]`, out));
    return;
  }
  if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (NON_COPY_KEYS.has(k)) continue;
      flatten(v, path ? `${path}.${k}` : k, out);
    }
  }
}

const norm = (s: string) =>
  s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();

function visibleText(html: string): string {
  return norm(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&#x27;|&#39;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
  );
}

async function main() {
  const files = process.argv.slice(2);
  if (!files.length) {
    console.error('usage: copy-diff.ts <html> [<html> ...]');
    process.exit(2);
  }

  const { HANOVER_PARK_V3 } = await import('@/lib/content/cities/v3/hanover-park');
  const all: Array<{ path: string; value: string }> = [];
  flatten(HANOVER_PARK_V3, '', all);

  const rendered = all.filter(
    (f) =>
      !SUSPENDED_PREFIXES.some((p) => f.path.startsWith(p)) &&
      !ATTRIBUTE_ONLY_PREFIXES.some((p) => f.path.startsWith(p)) &&
      !TOKENS.has(f.value)
  );
  const suspended = all.filter((f) => SUSPENDED_PREFIXES.some((p) => f.path.startsWith(p)));
  const tokens = all.filter((f) => TOKENS.has(f.value));

  console.log('Content module : src/lib/content/cities/v3/hanover-park.ts');
  console.log(`Copy fields    : ${all.length} total`);
  console.log(`  rendered     : ${rendered.length} (asserted in the page text)`);
  console.log(`  attributes   : ${ATTRIBUTE_FIELDS.length} (asserted in the raw HTML)`);
  console.log(`  tokens       : ${tokens.length} ({{phone}} — resolved at render)`);
  console.log(`  suspended    : ${suspended.length} (video.* — not rendered, by decision)\n`);

  let failed = false;
  for (const f of files) {
    const raw = fs.readFileSync(f, 'utf8');
    const text = visibleText(raw);
    const rawNorm = norm(raw);

    const textMisses = rendered.filter((x) => !text.includes(norm(x.value)));
    const attrMisses = ATTRIBUTE_FIELDS.filter(([, get]) => {
      try {
        return !get(HANOVER_PARK_V3).split('|').every((v: string) => rawNorm.includes(norm(v)));
      } catch {
        return true;
      }
    });
    const phoneOk = /773-724-9272/.test(raw);

    const d5Present = D5_ALT_FIELDS.filter(([, get]) => rawNorm.includes(norm(get(HANOVER_PARK_V3))));

    const ok = !textMisses.length && !attrMisses.length && phoneOk;
    if (!ok) failed = true;
    console.log(`=== ${f} — approved copy: ${ok ? 'PASS' : 'FAIL'} ===`);
    console.log(`  text fields   : ${rendered.length - textMisses.length}/${rendered.length}`);
    console.log(`  attr fields   : ${ATTRIBUTE_FIELDS.length - attrMisses.length}/${ATTRIBUTE_FIELDS.length}`);
    console.log(`  {{phone}} → 773-724-9272 present: ${phoneOk}`);
    for (const m of textMisses) console.log(`  MISS text ${m.path} = ${JSON.stringify(m.value.slice(0, 110))}`);
    for (const [p] of attrMisses) console.log(`  MISS attr ${p}`);
    console.log(
      `  D5 alt text   : ${d5Present.length}/${D5_ALT_FIELDS.length} present` +
        `  ${d5Present.length === D5_ALT_FIELDS.length ? '(this is the promoted page)' : '(expected on the pre-D5 approved page)'}`
    );
    console.log('');
  }
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
