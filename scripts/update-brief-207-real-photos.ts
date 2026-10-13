/**
 * Brief 207 follow-up — the Deerfield "Orphans of the Storm" article's REAL IMAGES, as a new
 * version of the UNPUBLISHED draft /knowledge-hub/deerfield-animal-shelter-donation-orphans-of-the-storm
 * that the Brief 207 create-once seed made (deploy #146). Marketing supplied the photos and the
 * Unclogs for Dogs logo on 2026-10-13 and chose where each goes. All four placeholders go:
 *   1. hero → team-food-donation-hero.webp (two team members, a shelter dog, the loaded truck);
 *   2. "What Did J. Blanton Plumbing Donate…": the donation-handoff placeholder figure →
 *      dog-food-donation-truck.webp (the truck bed full of food), same place;
 *   3. "Who Is Orphans of the Storm?": the shelter-campus placeholder figure →
 *      orphans-of-the-storm-sign.webp (the shelter's sign), same place;
 *   4. "What Is Unclogs for Dogs?": the Unclogs for Dogs placeholder figure →
 *      unclogs-for-dogs-logo.webp (the campaign logo, transparent, centred), same place, no caption.
 * Everything else (copy, [DRAFT QUOTE], FAQ, takeaways, tags, related pick, meta) is unchanged.
 * The body is DERIVED from the seed's own BODY (each placeholder figure swapped in place), never
 * retyped, so the copy stays verbatim by construction.
 *
 * ── ONE TIME, GUARDED, EDITOR STATE WINS (Brief 186 / the Brief 201 contract) ─────────────────
 * Checked in this order; every guard writes NOTHING:
 *   • Brief 190 / version columns missing                    → FAILED, exit 1 (schema fault);
 *   • no article with the slug                               → NOT-APPLIED (no article), exit 0;
 *   • a version labelled "Version 2 — real photos" exists    → ALREADY-APPLIED, exit 0
 *     (checked before the status, so a later Publish of Version 2 still reads as applied);
 *   • the article is not a draft                             → NOT-APPLIED (not a draft), exit 0;
 *   • the latest version OR the live row no longer equals the
 *     Brief 207 seed payload (compared after sanitizing, JSONB
 *     key order ignored) — i.e. edited in /admin              → NOT-APPLIED (edited in admin),
 *     naming every field that differs, exit 0. Marketing then swaps the photos by hand.
 *   The related pick counts as "as seeded" when it is an in-order subset of the seed's list (the
 *   seed drops an unpublished one); Version 2 carries it over unchanged either way.
 * ⚑ A later RENAME of this article must make this script (and the seed) look it up under BOTH
 *   slugs via scripts/lib/renamed-article.ts, in the same deploy (CLAUDE.md gotcha 27).
 *
 * ── WHAT IT WRITES (one transaction) ───────────────────────────────────────────────────────
 *   • ONE new page_drafts row "Version 2 — real photos", is_published = FALSE, whose content is
 *     the payload the editor saves (the seed's shape). Version 1 is not touched.
 *   • The live row (still status 'draft'): body / image / v2 = Version 2's — the /admin editor
 *     fills its form from the LIVE row, so leaving it on Version 1 would let the next Save write
 *     the placeholders back (the Brief 201 reason).
 *   Body: sanitizeArticleBodyHtml (the publish writer's); v2: sanitizeArticleV2Content.
 *   Never touches global_settings.
 *
 * Needs an explicit mode (Brief 147): `commit` applies; `--dry-run` previews.
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/update-brief-207-real-photos.ts commit
 */
import { existsSync, readFileSync } from 'fs';
import { Pool } from 'pg';
import { resolveRunMode, verdict } from './lib/run-mode';
import { sanitizeArticleBodyHtml } from '../src/lib/cms/sanitize';
import { sanitizeArticleV2Content } from '../src/lib/cms/article-v2-sanitize';
import {
  BODY,
  DEK,
  IMG,
  META_DESCRIPTION,
  META_TITLE,
  RELATED_WANTED,
  SLUG,
  TITLE,
  V2,
  buildSeedContent,
} from './seed-brief-207-deerfield-orphans-of-the-storm';

const SCRIPT = 'update-brief-207-real-photos';

const env = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
const get = (k: string) =>
  process.env[k] || (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim() || '';

export const VERSION_LABEL = 'Version 2 — real photos';

// ── The new media (files in public/images/knowledge-hub/deerfield-orphans-of-the-storm/) ───────
const HERO = `${IMG}/team-food-donation-hero.webp`; // 1200 × 800 (3:2, the V2 hero frame's ratio)
const HERO_ALT = 'Two J. Blanton Plumbing team members with a shelter dog on a pickup tailgate loaded with bags of donated dog food';
const HERO_CAPTION = 'The J. Blanton team with the food donation at Orphans of the Storm.';

/** The Brief 207 in-article shape (figure > img [+ figcaption]), at each file's real size. */
const figure = (file: string, w: number, h: number, alt: string, caption: string) =>
  `<figure><img src="${IMG}/${file}" alt="${alt}" width="${w}" height="${h}" loading="lazy">${caption ? `<figcaption>${caption}</figcaption>` : ''}</figure>`;
const FIG_TRUCK = figure(
  'dog-food-donation-truck.webp', 1100, 733,
  'Pickup truck bed filled with bags of donated dog food',
  'The food donation, loaded up for Orphans of the Storm.'
);
const FIG_SIGN = figure(
  'orphans-of-the-storm-sign.webp', 960, 600,
  'Orphans of the Storm animal shelter sign reading Adopt a Friend for Life',
  'Orphans of the Storm, on Riverwoods Road.'
);
// The logo carries its own words, so no caption (Brief 201 review round 1: no caption that repeats the image).
const FIG_LOGO = figure(
  'unclogs-for-dogs-logo.webp', 1100, 560,
  'Unclogs for Dogs logo: 8,000 pounds of dog food donated, helping local animal shelters and dogs in need',
  ''
);

// ── Anchors in the seed BODY (each must occur exactly once — else a code fault) ──────────────
const placeholderFig = (file: string) =>
  new RegExp(`<figure><img src="${IMG.replace(/\//g, '\\/')}\\/${file.replace(/\./g, '\\.')}"[^>]*><figcaption>[\\s\\S]*?<\\/figcaption><\\/figure>`, 'g');
function once(re: RegExp, what: string): string {
  const m = BODY.match(re) ?? [];
  if (m.length !== 1) throw new Error(`Brief 207 BODY: expected exactly one ${what}, found ${m.length}`);
  return m[0];
}
function replaceOnce(s: string, find: string, repl: string, what: string): string {
  const i = s.indexOf(find);
  if (i < 0 || s.indexOf(find, i + 1) >= 0) throw new Error(`expected exactly one ${what}`);
  return s.slice(0, i) + repl + s.slice(i + find.length);
}
const FIG_HANDOFF_OLD = once(placeholderFig('placeholder-donation-handoff.webp'), 'donation-handoff placeholder figure');
const FIG_CAMPUS_OLD = once(placeholderFig('placeholder-shelter-campus.webp'), 'shelter-campus placeholder figure');
const FIG_UNCLOGS_OLD = once(placeholderFig('placeholder-unclogs-for-dogs.webp'), 'Unclogs for Dogs placeholder figure');

/** Version 2's body: the seed BODY with each placeholder figure swapped in place. */
export function buildBody(): string {
  let b = BODY;
  b = replaceOnce(b, FIG_HANDOFF_OLD, FIG_TRUCK, 'donation-handoff placeholder');
  b = replaceOnce(b, FIG_CAMPUS_OLD, FIG_SIGN, 'shelter-campus placeholder');
  b = replaceOnce(b, FIG_UNCLOGS_OLD, FIG_LOGO, 'Unclogs for Dogs placeholder');
  return b;
}

/** Version 2's content: the seed's payload shape with the new body, hero and hero alt/caption. */
export function buildVersion2(related: string[]) {
  const base = buildSeedContent(related);
  return {
    ...base,
    body: sanitizeArticleBodyHtml(buildBody()),
    image: HERO,
    v2: sanitizeArticleV2Content({ ...base.v2, image_alt: HERO_ALT, image_caption: HERO_CAPTION }),
  };
}

// ── Comparison against the seed payload ────────────────────────────────────────────────────
/** JSON with sorted object keys: Postgres JSONB does not keep key order. */
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

/** An in-order subset of the seed's hand-picks: what its published-only filter can produce. */
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

function versionDiff(content: unknown, label: string): string[] {
  const c = content && typeof content === 'object' && !Array.isArray(content) ? (content as Record<string, unknown>) : {};
  const expected = buildSeedContent(relatedAsSeeded(c.related) ? c.related : RELATED_WANTED) as unknown as Record<string, unknown>;
  const out: string[] = [];
  const p = `version "${label}"`;
  for (const k of Array.from(new Set([...Object.keys(expected), ...Object.keys(c)]))) {
    if (k === 'body') {
      if (typeof c.body !== 'string' || sanitizeArticleBodyHtml(c.body) !== sanitizeArticleBodyHtml(BODY)) out.push(`${p}.body`);
    } else if (k === 'v2') {
      out.push(...v2Diff(p, c.v2, expected.v2));
    } else if (k === 'related') {
      if (!relatedAsSeeded(c.related)) out.push(`${p}.related`);
    } else if (canon(c[k]) !== canon(expected[k])) {
      out.push(`${p}.${k}`);
    }
  }
  return out;
}

interface LiveRow {
  id: number;
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

function liveDiff(r: LiveRow): string[] {
  const out: string[] = [];
  const want: [string, unknown, unknown][] = [
    ['title', r.title, TITLE],
    ['excerpt', r.excerpt, DEK],
    ['image', r.image, `${IMG}/placeholder-hero.webp`],
    ['meta_title', r.meta_title, META_TITLE],
    ['meta_description', r.meta_description, META_DESCRIPTION],
    ['template', r.template, 'article-v2'],
  ];
  for (const [k, a, b] of want) if (a !== b) out.push(`live.${k}`);
  if (sanitizeArticleBodyHtml(r.html ?? '') !== sanitizeArticleBodyHtml(BODY)) out.push('live.body');
  out.push(...v2Diff('live', r.v2, V2));
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
        WHERE (table_name = 'cms_articles' AND column_name IN ('template', 'v2'))
           OR (table_name = 'page_drafts' AND column_name IN ('label', 'content', 'is_published'))`
    );
    const need = ['cms_articles.template', 'cms_articles.v2', 'page_drafts.label', 'page_drafts.content', 'page_drafts.is_published'];
    const missing = need.filter((n) => !cols.rows.some((r) => `${r.table_name}.${r.column_name}` === n));
    if (missing.length) throw new Error(`missing column(s): ${missing.join(', ')}`);

    const live = (
      await c.query<LiveRow>(
        `SELECT id, status, template, title, excerpt, image, meta_title, meta_description, body->>'html' AS html, v2
           FROM cms_articles WHERE slug = $1`,
        [SLUG]
      )
    ).rows[0];
    if (!live) {
      verdict(SCRIPT, 'NOT-APPLIED (no article)', `no article /knowledge-hub/${SLUG} (the Brief 207 seed has not created it here) — nothing written`);
      return;
    }
    const versions = (
      await c.query<{ id: number; label: string; is_published: boolean; created_by: number; content: unknown }>(
        `SELECT id, label, is_published, created_by, content FROM page_drafts
          WHERE page_type = 'article' AND page_slug = $1
          ORDER BY created_at DESC, id DESC`,
        [SLUG]
      )
    ).rows;
    const mine = versions.find((v) => v.label === VERSION_LABEL);
    if (mine) {
      verdict(SCRIPT, 'ALREADY-APPLIED', `id ${live.id} (${live.status}) already has "${VERSION_LABEL}" (version id ${mine.id}) — nothing written`);
      return;
    }
    if (live.status !== 'draft') {
      banner([`NOT APPLIED — the article is ${live.status}, not a draft. Nothing was written; swap the photos in /admin.`]);
      verdict(SCRIPT, 'NOT-APPLIED (not a draft)', `id ${live.id} is ${live.status} — nothing written`);
      return;
    }

    // ── Edited in /admin? The latest version (what the review route shows) AND the live row. ──
    const latest = versions[0];
    const diffs = latest ? versionDiff(latest.content, latest.label) : ['no version row (the seed writes "Version 1 — for review")'];
    if (latest?.is_published) diffs.push(`version "${latest.label}" is published`);
    diffs.push(...liveDiff(live));
    if (diffs.length) {
      banner([
        'NOT APPLIED — the draft no longer matches the Brief 207 seed (edited in /admin). Nothing was written;',
        'swap the four images by hand in /admin (files in /images/knowledge-hub/deerfield-orphans-of-the-storm/). Differs:',
        ...diffs.map((d) => `  • ${d}`),
      ]);
      verdict(SCRIPT, 'NOT-APPLIED (edited in admin)', `differs: ${diffs.join(', ')}`);
      return;
    }

    // ── Build Version 2 (the seed's related pick carried over as stored) ──
    const related = (latest.content as { related: string[] }).related;
    const content = buildVersion2(related);
    if (/placeholder|photo placeholder/i.test(content.body + JSON.stringify(content.v2) + content.image)) {
      throw new Error('Version 2 still references a placeholder');
    }
    if ((content.body.match(/<figure>/g) ?? []).length !== 3 || !content.body.includes('unclogs-for-dogs-logo.webp')) {
      throw new Error('Version 2 body does not hold the 3 new figures');
    }

    const before = versions.map((v) => `${v.id}:${canon(v.content)}:${v.is_published}`).join('|');

    await c.query('BEGIN');
    const ins = await c.query<{ id: number }>(
      `INSERT INTO page_drafts (page_type, page_slug, label, content, created_by, is_published, published_at)
       VALUES ('article', $1, $2, $3, $4, FALSE, NULL)
       RETURNING id`,
      [SLUG, VERSION_LABEL, JSON.stringify(content), latest.created_by]
    );
    const upd = await c.query(
      `UPDATE cms_articles SET body = $2::jsonb, image = $3, v2 = $4::jsonb, updated_at = NOW()
        WHERE id = $1 AND status = 'draft'`,
      [live.id, JSON.stringify({ html: content.body }), content.image, JSON.stringify(content.v2)]
    );
    if (upd.rowCount !== 1) throw new Error('the live row was not updated');

    // ── Verify what this run wrote (and that nothing else moved) ──
    const after = (
      await c.query<{ id: number; label: string; is_published: boolean; content: unknown }>(
        `SELECT id, label, is_published, content FROM page_drafts
          WHERE page_type = 'article' AND page_slug = $1 ORDER BY created_at DESC, id DESC`,
        [SLUG]
      )
    ).rows;
    const others = after.filter((v) => v.id !== ins.rows[0].id).map((v) => `${v.id}:${canon(v.content)}:${v.is_published}`).join('|');
    const row = (await c.query<{ status: string; image: string; html: string; alt: string }>(
      `SELECT status, image, body->>'html' AS html, v2->>'image_alt' AS alt FROM cms_articles WHERE id = $1`,
      [live.id]
    )).rows[0];
    if (
      after.length !== versions.length + 1 ||
      after[0].id !== ins.rows[0].id ||
      after[0].is_published ||
      others !== before ||
      row.status !== 'draft' ||
      row.image !== HERO ||
      row.alt !== HERO_ALT ||
      /placeholder/i.test(row.html)
    ) {
      throw new Error('post-write verification failed');
    }
    console.log(`  + page_drafts "${VERSION_LABEL}" (id ${ins.rows[0].id}), unpublished — the newest version, so the review link shows it`);
    console.log(`  ~ cms_articles id ${live.id}: body / hero / v2 = Version 2 (status still draft)`);
    console.log(`  = ${versions.length} earlier version(s) unchanged`);

    if (mode !== 'commit') {
      await c.query('ROLLBACK');
      console.log('\n  (dry run — rolled back)');
      verdict(SCRIPT, 'NOT-APPLIED (dry run)', `would add "${VERSION_LABEL}" to id ${live.id}`);
      return;
    }
    await c.query('COMMIT');
    committed = true;
    verdict(SCRIPT, 'APPLIED', `"${VERSION_LABEL}" added to /knowledge-hub/${SLUG} (id ${live.id}, still a draft) — review at /review/knowledge-hub/${SLUG}`);
  } catch (err) {
    if (!committed) await c.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    c.release();
  }
}

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
      // The seed module imports kh-taxonomy, which opens the app's own pool (src/lib/db); close it too.
      const appPool = (await import('../src/lib/db')).default as unknown as { end?: () => Promise<void> };
      await appPool.end?.().catch(() => {});
    });
}
