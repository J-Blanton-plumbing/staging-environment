/**
 * Brief 203 (Track B) — the Columbus "older homes" draft becomes "Version 2 — Worthington revision":
 * Worthington replaces Clintonville, the primary keyword moves to "old house plumbing problems", and the
 * article is renamed
 *   older-homes-plumbing-problems-grandview-clintonville-german-village
 *     → old-house-plumbing-problems-grandview-worthington-german-village.
 * The 25 changes (R1–R25) are the brief's table, VERBATIM; every other string stays byte-identical. The
 * `columbus-clintonville` location tag is removed. The article STAYS A DRAFT.
 *
 * ── ONE TIME, GUARDED, EDITOR STATE WINS (Brief 186) ───────────────────────────────────────────
 * Checked in the brief's order; every guard writes NOTHING:
 *   • version / V2 / tag columns missing                       → FAILED, exit 1 (schema fault);
 *   • no article under either slug                             → NOT-APPLIED (no article), exit 0;
 *   • a version "Version 2 — Worthington revision" exists       → ALREADY-APPLIED, exit 0;
 *   • the article is not a draft                               → NOT-APPLIED (not a draft), exit 0;
 *   • the latest version OR the live row (incl. its tags) no
 *     longer equals today's payload — the revised Brief 199
 *     seed's own builder (rounds 1–3 included), compared after
 *     sanitizing, JSONB key order ignored                       → NOT-APPLIED (edited in admin), naming fields;
 *   • the new slug is used by another article, or versions
 *     already sit under it                                     → NOT-APPLIED (slug taken), exit 0;
 *   • a "Current" string of R2–R25 is not found exactly once   → NOT-APPLIED (anchor missing), naming it.
 *
 * ── WHAT IT WRITES (one transaction) ────────────────────────────────────────────────────────────
 *   • ONE new page_drafts row "Version 2 — Worthington revision", is_published = FALSE, the editor's payload.
 *   • The slug travels with the article (Brief 202 decision 3): page_drafts.page_slug of Version 1 (content
 *     untouched — hashed before and after) and any page_changelog rows move to the new slug. Tags and related
 *     picks are keyed by article id. The CMS creates no redirect rows; the OLD REVIEW link 308s via
 *     REVIEW_RENAMES in src/middleware.ts (Track A2).
 *   • The live row: slug, title, excerpt, meta title, meta description, body, v2 = Version 2. Status stays 'draft'.
 *   • Tags: `columbus-clintonville` removed (the version's `terms` mirror it); sewers (primary), central-ohio,
 *     columbus-grandview-heights, columbus-german-village kept.
 *   Body: sanitizeArticleBodyHtml (the publish writer's); v2: sanitizeArticleV2Content.
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/update-brief-203-older-homes-worthington.ts commit
 */
import { existsSync, readFileSync } from 'fs';
import { Pool, type PoolClient } from 'pg';
import { resolveRunMode, verdict } from './lib/run-mode';
import { sanitizeArticleBodyHtml } from '../src/lib/cms/sanitize';
import { sanitizeArticleV2Content } from '../src/lib/cms/article-v2-sanitize';
import { NEW_SLUG, OLD_SLUG, OLDER_HOMES_SLUGS } from './lib/older-homes-article';
import { NEIGHBOURHOOD_CANDIDATES, PRIMARY_TOPIC, REGION, RELATED_WANTED, buildSeedContent } from './seed-brief-199-columbus-older-homes';

const SCRIPT = 'update-brief-203-older-homes-worthington';
export const VERSION_LABEL = 'Version 2 — Worthington revision';
const DROPPED_LOCATION = 'columbus-clintonville';

// ── R2–R5: fields ──
export const NEW_TITLE = 'Old House Plumbing Problems in Grandview, Worthington and German Village: What to Expect';
export const NEW_META_TITLE = 'Old House Plumbing Problems: Grandview, Worthington, German Village';
export const NEW_META_DESCRIPTION =
  'Clay sewer pipe, tree roots, cast iron drains: the old house plumbing problems to expect in Grandview Heights, Worthington and German Village.';
export const NEW_DEK = 'Many homes in Grandview Heights, Worthington and German Village were built between the mid-1800s and the 1960s.';

const env = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
const get = (k: string) =>
  process.env[k] || (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim() || '';

type Content = ReturnType<typeof buildSeedContent>;

/** Collects anchors that are not found exactly once (→ NOT-APPLIED (anchor missing)). */
class Edits {
  missing: string[] = [];
  /** Replace `find` (must occur exactly once in `s`) with `repl`. */
  once(s: string, find: string, repl: string, what: string): string {
    const i = s.indexOf(find);
    if (i < 0 || s.indexOf(find, i + 1) >= 0) {
      this.missing.push(`${what} (found ${s.split(find).length - 1}×)`);
      return s;
    }
    return s.slice(0, i) + repl + s.slice(i + find.length);
  }
  /** The single regex match in `s`, or null (and recorded) if there isn't exactly one. */
  match(s: string, re: RegExp, what: string): string | null {
    const m = s.match(new RegExp(re.source, 'g')) ?? [];
    if (m.length !== 1) {
      this.missing.push(`${what} (found ${m.length}×)`);
      return null;
    }
    return m[0];
  }
}

/** Version 2 from today's payload, plus any anchors that could not be placed. */
export function buildVersion2(today: Content): { content: Content; missing: string[] } {
  const e = new Edits();
  let b = today.body;

  // R7, R8 — intro and "How Old Are the Homes…"
  b = e.once(b, 'Many homes in Grandview Heights, Clintonville and German Village still have their original pipes.',
    'Many homes in Grandview Heights, Worthington and German Village still have their original pipes.', 'R7 intro sentence');
  b = e.once(b, 'Many homes in Grandview Heights, Clintonville and German Village were built between the mid-1800s and the 1940s, which makes them roughly 80 to more than 150 years old.',
    'Many homes in Grandview Heights, Worthington and German Village were built between the mid-1800s and the 1960s, which makes them roughly 60 to more than 150 years old.', 'R8 "How Old" sentence');

  // R9 — table: drop the Clintonville row (with its OSU link), add Worthington after Grandview Heights
  const clintonRow = e.match(b, /<tr><th scope="row">Clintonville<\/th>[\s\S]*?<\/tr>/, 'R9 Clintonville table row');
  if (clintonRow) b = e.once(b, clintonRow, '', 'R9 Clintonville table row');
  const worthingtonRow =
    '<tr><th scope="row">Worthington</th>' +
    '<td>Founded in <a href="https://remarkableohio.org/marker/39-25-the-founding-of-worthington-worthington-a-planned-community/">1803</a>. Most homes are mid-century: <a href="https://data.census.gov/table/ACSDT5Y2024.B25034?g=160XX00US3986604">3,411 of 6,406 housing units (about 53%) were built between 1950 and 1969</a></td>' +
    '<td>Historic homes near the village green, plus mid-century ranches and split-levels on mature, tree-lined streets</td></tr>';
  const gvRowEnd = '<td>Pre-war homes on tree-lined streets</td></tr>';
  b = e.once(b, gvRowEnd, gvRowEnd + worthingtonRow, 'R9 Grandview Heights table row end');

  // R10–R13 — pipes section
  b = e.once(b, 'Clay was laid in short sections, and every joint between them is a spot where roots can slip in.',
    'Clay sewer pipe was laid in short sections, and every joint between them is a spot where roots can slip in.', 'R10 clay sentence');
  b = e.once(b, 'In older homes, we often find cast iron that has rusted from the inside.',
    'With cast iron pipes in old houses, we often find rust building up from the inside.', 'R11 cast iron sentence');
  b = e.once(b, '<h2>What Kind of Pipes Are Under an Older Columbus Home?</h2>',
    '<h2>What Kind of Pipes Are Under an Older Central Ohio Home?</h2>', 'R12 pipes H2');
  b = e.once(b, 'Older Columbus homes commonly have a clay sewer lateral, cast iron drains inside the house and galvanized steel or copper water pipes. Some homes built before 1964 may still have a lead water service line.',
    'Older Central Ohio homes commonly have a clay sewer lateral, cast iron drains inside the house and galvanized steel or copper water pipes. In Columbus, some homes built before 1964 may still have a lead water service line.', 'R13 pipes intro');

  // R14, R15 — neighborhood section. The "wasn't designed to carry rainwater" link is lifted from the deleted
  // Clintonville paragraph for R19 (href and attributes copied, not retyped).
  b = e.once(b, '<h2>Neighborhood by Neighborhood: What to Watch For</h2>', '<h2>What Should You Watch for in Each Neighborhood?</h2>', 'R14 neighborhood H2');
  const clintonSection = e.match(b, /\n<h3>Clintonville<\/h3>[\s\S]*?(?=\n<h3>German Village<\/h3>)/, 'R15 Clintonville subsection (before German Village)');
  const rainLink = clintonSection ? e.match(clintonSection, /<a href="[^"]*"[^>]*>wasn't designed to carry rainwater<\/a>/, 'R19 "wasn\'t designed to carry rainwater" link') : null;
  if (rainLink && !rainLink.startsWith('<a href="https://www.columbus.gov/files/sharedassets/city/v/1/utilities/sustainability/blueprint/lateral-lining_brochure_fnl_ajg.pdf"')) {
    e.missing.push('R19 rainwater link points somewhere other than the City lateral brochure');
  }
  if (clintonSection) {
    b = e.once(b, clintonSection, [
      '',
      '<h3>Worthington</h3>',
      '<p>Worthington has two kinds of older homes. The historic houses around the village green are part of the <a href="https://npgallery.nps.gov/AssetDetail/NRIS/10000190">Worthington Historic District</a>, listed on the National Register of Historic Places. Most of the city\'s homes came later: more than half were built between 1950 and 1969, so many are now over 55 years old and may still have their original sewer lateral. Mature trees along those streets make root problems more likely.</p>',
      '<p>Like Grandview Heights, Worthington is its own city, separate from Columbus. The City of Worthington says <a href="https://www.worthington.org/317/Sewer">the sewer lateral, including the wye where it connects to the city\'s main, is the property owner\'s responsibility</a>, and only a sewer installer licensed with the City of Columbus, with a Worthington permit, may install or repair it.</p>',
      // Hard rule 6: no Worthington page exists, so this ships as plain text.
      '<p>Need a plumber in Worthington? Our Columbus team can help.</p>',
    ].join('\n'), 'R15 Clintonville subsection');
  }

  // R16, R17 — camera section
  b = e.once(b, "<li><strong>Before you buy an older home.</strong> You can't see a sewer line during a walkthrough.</li>",
    "<li><strong>Before you buy a house</strong>, especially an older one. You can't see a sewer line during a walkthrough.</li>", 'R16 first camera bullet');
  b = e.once(b, 'while the City takes care of its own part of the system.',
    "while the City takes care of its own part of the system. Worthington's rule is the same.", 'R17 "This matters because…" sentence');

  // R18, R19 — warning signs
  b = e.once(b, "<h2>Warning Signs Your Older Home's Plumbing Needs Attention</h2>",
    '<h2>What Are the Warning Signs of Old House Plumbing Problems?</h2>', 'R18 warning-signs H2');
  if (rainLink) {
    b = e.once(b, '\n<p>Any one of these is worth a closer look.',
      `\n<p>Heavy rain makes backups more likely. A cracked lateral lets rainwater into the sanitary sewer, and the City of Columbus explains that system ${rainLink}, so the extra water can push sewage back into basements.</p>\n<p>Any one of these is worth a closer look.`,
      'R19 "Any one of these…" paragraph');
  }

  // R20–R23 — programs and closing
  b = e.once(b, 'lined sewer mains and laterals in parts of Clintonville</a>', 'lined sewer mains and laterals in some Columbus neighborhoods</a>', 'R20 Blueprint link anchor');
  b = e.once(b, 'These programs are run by the City of Columbus. If you live in Grandview Heights, ask Grandview Heights what applies to you.',
    'These programs are run by the City of Columbus. If you live in Grandview Heights or Worthington, check with your city about what applies to you.', 'R21 programs closing');
  b = e.once(b, '<h2>Old Home, Smart Plan</h2>', '<h2>How Do You Plan Ahead for an Older Home?</h2>', 'R22 closing H2');
  b = e.once(b, "You don't have to give up an older home's charm to avoid plumbing surprises.",
    "You don't have to give up an older home's charm to avoid old house plumbing problems.", 'R23 closing sentence');
  b = e.once(b, '<li>In Columbus, the sewer line to the street is your responsibility.</li>',
    "<li>In Columbus and Worthington, the sewer line from your house to the city's pipe is your responsibility.</li>", 'R23 closing bullet');

  // R5, R6, R24, R25 — V2 fields
  const v2 = today.v2;
  const takeaways = [...v2.takeaways];
  if (takeaways[1] === "In Columbus, the sewer line from your house to the city's pipe is yours to maintain.") {
    takeaways[1] = "In Columbus and Worthington, the sewer line from your house to the city's pipe is yours to maintain.";
  } else e.missing.push('R6 key takeaway 2');
  const faqs = v2.faqs.map((f) => ({ ...f }));
  if (faqs[0]) {
    faqs[0].a = e.once(faqs[0].a,
      'The City maintains its own part of the system. Grandview Heights is a separate city, so check its rules if you live there.',
      "The City maintains its own part of the system. In Worthington, the City says laterals, including the wye at the main, are the property owner's responsibility. Grandview Heights is a separate city, so check its rules if you live there.",
      'R24 FAQ 1 answer');
  } else e.missing.push('R24 FAQ 1');
  if (faqs[2]?.q === 'Should I get a sewer camera inspection before buying an older home?' &&
      faqs[2].a === "Yes, it's a smart step. You can't see a sewer line during a walkthrough, and older homes in Grandview Heights, Clintonville and German Village may still have their original clay lateral. A camera inspection shows roots, cracks or sagging pipe before you close.") {
    faqs[2] = {
      q: 'Should I get a sewer inspection before buying a house?',
      a: "Yes, especially if the house is older. You can't see a sewer line during a walkthrough, and many homes in Grandview Heights, Worthington and German Village may still have their original sewer lateral. A camera inspection shows roots, cracks or sagging pipe before you close.",
    };
  } else e.missing.push('R25 FAQ 3 question + answer');

  // Fields R2–R4 must still read as Brief 199 left them (the edited-in-admin guard checks them too).
  const body = sanitizeArticleBodyHtml(b);
  const content: Content = {
    ...today,
    title: NEW_TITLE,
    excerpt: NEW_DEK,
    body,
    terms: { ...today.terms, locations: today.terms.locations.filter((l) => l !== DROPPED_LOCATION) },
    v2: sanitizeArticleV2Content({ ...v2, dek: NEW_DEK, takeaways, faqs }),
    metaTitle: NEW_META_TITLE,
    metaDescription: NEW_META_DESCRIPTION,
  };
  return { content, missing: e.missing };
}

// ── Comparison against today's payload (the Brief 201/202 rules) ───────────────────────────────
const canon = (x: unknown): string =>
  Array.isArray(x)
    ? `[${x.map(canon).join(',')}]`
    : x && typeof x === 'object'
      ? `{${Object.keys(x as object).sort().map((k) => `${JSON.stringify(k)}:${canon((x as Record<string, unknown>)[k])}`).join(',')}}`
      : JSON.stringify(x === undefined ? null : x);

function v2Diff(prefix: string, stored: unknown, expected: unknown): string[] {
  const a = sanitizeArticleV2Content(stored) as unknown as Record<string, unknown>;
  const b = sanitizeArticleV2Content(expected) as unknown as Record<string, unknown>;
  return Object.keys(b).filter((k) => canon(a[k]) !== canon(b[k])).map((k) => `${prefix}.v2.${k}`);
}

/** An in-order subset of the seed's hand-picks (the seed skips unpublished ones). */
function relatedAsSeeded(r: unknown): r is string[] {
  if (!Array.isArray(r) || !r.every((s) => typeof s === 'string')) return false;
  let at = 0;
  for (const s of r) {
    const i = RELATED_WANTED.indexOf(s, at);
    if (i < 0) return false;
    at = i + 1;
  }
  return true;
}

function versionDiff(content: unknown, label: string, expected: Content): string[] {
  const c = content && typeof content === 'object' && !Array.isArray(content) ? (content as Record<string, unknown>) : {};
  const exp = expected as unknown as Record<string, unknown>;
  const out: string[] = [];
  const p = `version "${label}"`;
  for (const k of Array.from(new Set([...Object.keys(exp), ...Object.keys(c)]))) {
    if (k === 'body') {
      if (typeof c.body !== 'string' || sanitizeArticleBodyHtml(c.body) !== sanitizeArticleBodyHtml(exp.body as string)) out.push(`${p}.body`);
    } else if (k === 'v2') {
      out.push(...v2Diff(p, c.v2, exp.v2));
    } else if (k === 'related') {
      if (!relatedAsSeeded(c.related)) out.push(`${p}.related`);
    } else if (canon(c[k]) !== canon(exp[k])) {
      out.push(`${p}.${k}`);
    }
  }
  return out;
}

interface LiveRow {
  id: number;
  slug: string;
  status: string;
  template: string;
  title: string;
  excerpt: string | null;
  image: string | null;
  meta_title: string | null;
  meta_description: string | null;
  html: string | null;
  v2: unknown;
}

async function liveDiff(c: PoolClient, r: LiveRow, expected: Content): Promise<string[]> {
  const out: string[] = [];
  const want: [string, unknown, unknown][] = [
    ['slug', r.slug, OLD_SLUG],
    ['title', r.title, expected.title],
    ['excerpt', r.excerpt, expected.excerpt],
    ['image', r.image, expected.image],
    ['meta_title', r.meta_title, expected.metaTitle],
    ['meta_description', r.meta_description, expected.metaDescription],
    ['template', r.template, 'article-v2'],
  ];
  for (const [k, a, b] of want) if (a !== b) out.push(`live.${k}`);
  if (sanitizeArticleBodyHtml(r.html ?? '') !== sanitizeArticleBodyHtml(expected.body)) out.push('live.body');
  out.push(...v2Diff('live', r.v2, expected.v2));
  // The live tags (cms_article_terms) must still be the seeded set.
  const tags = (await c.query<{ type: string; slug: string; is_primary: boolean }>(
    `SELECT t.type, t.slug, at.is_primary FROM cms_article_terms at JOIN kh_terms t ON t.id = at.term_id WHERE at.article_id = $1`, [r.id]
  )).rows;
  const primary = tags.filter((t) => t.is_primary).map((t) => t.slug);
  const topics = tags.filter((t) => t.type === 'topic' && !t.is_primary).map((t) => t.slug).sort();
  const locations = tags.filter((t) => t.type === 'location').map((t) => t.slug).sort();
  if (primary.length !== 1 || primary[0] !== expected.terms.primary || topics.length || canon(locations) !== canon([...expected.terms.locations].sort())) {
    out.push('live.tags');
  }
  return out;
}

function banner(lines: string[]) {
  console.log('\n' + '!'.repeat(72));
  for (const l of lines) console.log(`${SCRIPT}: ${l}`);
  console.log('!'.repeat(72) + '\n');
}

async function main(pool: Pool) {
  const mode = resolveRunMode(SCRIPT);
  console.log(`MODE: ${mode === 'commit' ? 'COMMIT' : 'DRY RUN (nothing is written)'}\n`);
  const c = await pool.connect();
  let committed = false;
  try {
    // ── Schema (a code fault → exit 1) ──
    const cols = await c.query<{ table_name: string; column_name: string }>(
      `SELECT table_name, column_name FROM information_schema.columns
        WHERE (table_name = 'cms_articles' AND column_name IN ('slug', 'template', 'v2'))
           OR (table_name = 'page_drafts' AND column_name IN ('page_slug', 'label', 'content', 'is_published', 'version'))
           OR (table_name = 'page_changelog' AND column_name = 'page_slug')
           OR (table_name = 'cms_article_terms' AND column_name IN ('article_id', 'term_id', 'is_primary'))
           OR (table_name = 'kh_terms' AND column_name IN ('id', 'type', 'slug'))`
    );
    const need = [
      'cms_articles.slug', 'cms_articles.template', 'cms_articles.v2',
      'page_drafts.page_slug', 'page_drafts.label', 'page_drafts.content', 'page_drafts.is_published', 'page_drafts.version',
      'page_changelog.page_slug', 'cms_article_terms.article_id', 'cms_article_terms.term_id', 'cms_article_terms.is_primary',
      'kh_terms.id', 'kh_terms.type', 'kh_terms.slug',
    ];
    const missingCols = need.filter((n) => !cols.rows.some((r) => `${r.table_name}.${r.column_name}` === n));
    if (missingCols.length) throw new Error(`missing column(s): ${missingCols.join(', ')}`);

    // ── The article, under either slug. If both exist, ours is the OLD-slug row (the other takes the new slug). ──
    const rows = (
      await c.query<LiveRow>(
        `SELECT id, slug, status, template, title, excerpt, image, meta_title, meta_description, body->>'html' AS html, v2
           FROM cms_articles WHERE slug = ANY($1::text[]) ORDER BY id`,
        [OLDER_HOMES_SLUGS]
      )
    ).rows;
    if (!rows.length) {
      verdict(SCRIPT, 'NOT-APPLIED (no article)', `no article at /knowledge-hub/${OLD_SLUG} or /${NEW_SLUG} — nothing written`);
      return;
    }
    const live = rows.length === 1 ? rows[0] : rows.find((r) => r.slug === OLD_SLUG) ?? rows[0];
    const other = rows.find((r) => r.id !== live.id);

    const versions = (
      await c.query<{ id: number; label: string; is_published: boolean; created_by: number; content: unknown }>(
        `SELECT id, label, is_published, created_by, content FROM page_drafts
          WHERE page_type = 'article' AND page_slug = $1
          ORDER BY created_at DESC, id DESC`,
        [live.slug]
      )
    ).rows;
    const mine = versions.find((v) => v.label === VERSION_LABEL);
    if (mine) {
      verdict(SCRIPT, 'ALREADY-APPLIED', `id ${live.id} /${live.slug} (${live.status}) already has "${VERSION_LABEL}" (version id ${mine.id}) — nothing written`);
      return;
    }
    if (live.status !== 'draft') {
      banner([`NOT APPLIED — the article is ${live.status}, not a draft. Nothing was written; make the Brief 203 changes in /admin (see the Brief 203 report).`]);
      verdict(SCRIPT, 'NOT-APPLIED (not a draft)', `id ${live.id} is ${live.status} — nothing written`);
      return;
    }

    // ── Today's payload: the revised Brief 199 seed's own builder, with the locations its rule picks here ──
    const existingLocs = new Set((await c.query<{ slug: string }>(
      `SELECT slug FROM kh_terms WHERE type = 'location' AND slug = ANY($1::text[])`, [NEIGHBOURHOOD_CANDIDATES]
    )).rows.map((r) => r.slug));
    const locations = [REGION, ...NEIGHBOURHOOD_CANDIDATES.filter((s) => existingLocs.has(s))];
    const latest = versions[0];
    const related = latest && relatedAsSeeded((latest.content as { related?: unknown })?.related) ? (latest.content as { related: string[] }).related : RELATED_WANTED;
    const today = buildSeedContent(related, locations);
    if (today.terms.primary !== PRIMARY_TOPIC) throw new Error('seed builder primary topic changed');

    // ── Edited in /admin? The latest version (what the review route shows) AND the live row + tags. ──
    const diffs = latest ? versionDiff(latest.content, latest.label, today) : ['no version row'];
    if (latest?.is_published) diffs.push(`version "${latest.label}" is published`);
    diffs.push(...(await liveDiff(c, live, today)));
    if (diffs.length) {
      banner([
        'NOT APPLIED — the draft no longer matches Version 1 as Brief 199 (+ review rounds 1–3) left it: edited in /admin.',
        'Nothing was written; make the Brief 203 changes by hand (the Brief 203 report lists the steps). Differs:',
        ...diffs.map((d) => `  • ${d}`),
      ]);
      verdict(SCRIPT, 'NOT-APPLIED (edited in admin)', `differs: ${diffs.join(', ')}`);
      return;
    }

    // ── The new slug must be free: no other article, no versions already filed under it ──
    const strayVersions = (await c.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM page_drafts WHERE page_type = 'article' AND page_slug = $1`, [NEW_SLUG]
    )).rows[0].n;
    if (other || strayVersions) {
      const why = [other ? `article id ${other.id} (${other.status}) already has /${NEW_SLUG}` : '', strayVersions ? `${strayVersions} version row(s) already filed under ${NEW_SLUG}` : ''].filter(Boolean).join('; ');
      banner([`NOT APPLIED — the new slug is taken: ${why}. Nothing was written.`]);
      verdict(SCRIPT, 'NOT-APPLIED (slug taken)', `${why} — nothing written`);
      return;
    }

    // ── Build Version 2; every "Current" string must be there exactly once ──
    const { content, missing } = buildVersion2(today);
    if (missing.length) {
      banner(['NOT APPLIED — anchor(s) not found exactly once. Nothing was written:', ...missing.map((m) => `  • ${m}`)]);
      verdict(SCRIPT, 'NOT-APPLIED (anchor missing)', missing.join('; '));
      return;
    }
    const bodyHtml = content.body;
    if (sanitizeArticleBodyHtml(bodyHtml) !== bodyHtml) throw new Error('the sanitized Version 2 body is not idempotent');
    if (bodyHtml.replace(/Blueprint-Clintonville-Area-Projects/g, '').includes('Clintonville')) throw new Error('"Clintonville" left in the body outside the Blueprint URL');
    if (!bodyHtml.includes('<th scope="row">Worthington</th>') || !bodyHtml.includes('<h3>Worthington</h3>') || !bodyHtml.includes('<p>[[office-map]]</p>')) {
      throw new Error('Version 2 body lost the Worthington row / H3 or the office-map marker');
    }
    if (content.v2.dek !== NEW_DEK || content.v2.faqs.length !== today.v2.faqs.length || content.v2.takeaways.length !== today.v2.takeaways.length) {
      throw new Error('Version 2 V2 fields did not survive sanitizing');
    }

    const hashOthers = async () =>
      (await c.query<{ h: string }>(
        `SELECT md5(string_agg(id || ':' || md5(content::text) || ':' || is_published || ':' || version || ':' || label, ',' ORDER BY id)) AS h
           FROM page_drafts WHERE page_type = 'article' AND page_slug = ANY($1::text[]) AND label <> $2`,
        [OLDER_HOMES_SLUGS, VERSION_LABEL]
      )).rows[0].h;
    const before = await hashOthers();

    await c.query('BEGIN');
    const moved = await c.query(`UPDATE page_drafts SET page_slug = $2 WHERE page_type = 'article' AND page_slug = $1`, [OLD_SLUG, NEW_SLUG]);
    const history = await c.query(`UPDATE page_changelog SET page_slug = $2 WHERE page_type = 'article' AND page_slug = $1`, [OLD_SLUG, NEW_SLUG]);
    const ins = await c.query<{ id: number }>(
      `INSERT INTO page_drafts (page_type, page_slug, label, content, created_by, is_published, published_at)
       VALUES ('article', $1, $2, $3, $4, FALSE, NULL)
       RETURNING id`,
      [NEW_SLUG, VERSION_LABEL, JSON.stringify(content), latest.created_by]
    );
    const upd = await c.query(
      `UPDATE cms_articles
          SET slug = $2, title = $3, excerpt = $4, meta_title = $5, meta_description = $6, body = $7::jsonb, v2 = $8::jsonb, updated_at = NOW()
        WHERE id = $1 AND status = 'draft' AND slug = $9`,
      [live.id, NEW_SLUG, NEW_TITLE, NEW_DEK, NEW_META_TITLE, NEW_META_DESCRIPTION, JSON.stringify({ html: bodyHtml }), JSON.stringify(content.v2), OLD_SLUG]
    );
    if (upd.rowCount !== 1) throw new Error('the live row was not updated');
    const untag = await c.query(
      `DELETE FROM cms_article_terms WHERE article_id = $1
          AND term_id IN (SELECT id FROM kh_terms WHERE type = 'location' AND slug = $2)`,
      [live.id, DROPPED_LOCATION]
    );

    // ── Verify what this run wrote (and that nothing else moved) ──
    const after = await hashOthers();
    const arts = (await c.query<{ id: number; slug: string; status: string; title: string }>(
      `SELECT id, slug, status, title FROM cms_articles WHERE slug = ANY($1::text[])`, [OLDER_HOMES_SLUGS]
    )).rows;
    const vers = (await c.query<{ id: number; page_slug: string; is_published: boolean }>(
      `SELECT id, page_slug, is_published FROM page_drafts WHERE page_type = 'article' AND page_slug = ANY($1::text[]) ORDER BY created_at DESC, id DESC`,
      [OLDER_HOMES_SLUGS]
    )).rows;
    const tagsAfter = (await c.query<{ slug: string }>(
      `SELECT t.slug FROM cms_article_terms at JOIN kh_terms t ON t.id = at.term_id WHERE at.article_id = $1 ORDER BY t.slug`, [live.id]
    )).rows.map((r) => r.slug);
    const wantTags = [content.terms.primary, ...content.terms.locations].sort();
    if (
      after !== before ||
      arts.length !== 1 || arts[0].slug !== NEW_SLUG || arts[0].status !== 'draft' || arts[0].title !== NEW_TITLE ||
      vers.length !== versions.length + 1 || vers.some((v) => v.page_slug !== NEW_SLUG || v.is_published) || vers[0].id !== ins.rows[0].id ||
      canon(tagsAfter) !== canon(wantTags)
    ) {
      throw new Error('post-write verification failed');
    }
    console.log(`  + page_drafts "${VERSION_LABEL}" (id ${ins.rows[0].id}), unpublished — the newest version`);
    console.log(`  ~ ${moved.rowCount} earlier version(s) and ${history.rowCount} history row(s) moved to /${NEW_SLUG} (content unchanged: ${before === after ? 'hash identical' : 'CHANGED'})`);
    console.log(`  ~ cms_articles id ${live.id}: slug /${NEW_SLUG}, title, excerpt, meta title + description, body, v2 = Version 2 (status still draft)`);
    console.log(`  - tag ${DROPPED_LOCATION} removed (${untag.rowCount} row); tags now: ${tagsAfter.join(', ')}`);

    if (mode !== 'commit') {
      await c.query('ROLLBACK');
      console.log('\n  (dry run — rolled back)');
      verdict(SCRIPT, 'NOT-APPLIED (dry run)', `would add "${VERSION_LABEL}" and rename id ${live.id} to /${NEW_SLUG}`);
      return;
    }
    await c.query('COMMIT');
    committed = true;
    verdict(SCRIPT, 'APPLIED', `"${VERSION_LABEL}" added; id ${live.id} renamed /${OLD_SLUG} → /${NEW_SLUG} (still a draft); tag ${DROPPED_LOCATION} removed — review at /review/knowledge-hub/${NEW_SLUG}`);
  } catch (err) {
    if (!committed) await c.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    c.release();
  }
}

// Run only as a script (the verification suite imports the builders).
if (require.main === module) {
  const pool = new Pool({ connectionString: get('DATABASE_URL') || 'postgresql://postgres:jbp@localhost:5432/jbp_cms' });
  main(pool)
    .catch((err) => {
      console.error(err);
      verdict(SCRIPT, 'FAILED', err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    })
    .finally(async () => {
      await pool.end();
      // The seed module imports kh-taxonomy (the app's pool, src/lib/db); close it so the process exits.
      const appPool = (await import('../src/lib/db')).default as unknown as { end?: () => Promise<void> };
      await appPool.end?.().catch(() => {});
    });
}
