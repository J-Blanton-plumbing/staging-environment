/**
 * Brief 201 (Track C) — the hose bib fall checklist's REAL PHOTOS, as a new version of the
 * UNPUBLISHED draft /knowledge-hub/hose-bib-irrigation-fall-checklist that the Brief 198
 * create-once seed made (deploy #129). In article order:
 *   1. hero → hose-bib-fall-hero.webp, with the brief's hero alt + caption;
 *   2. "Your Hose Bib Shutoff Checklist": the 7-step <ol> + the indoor-shutoff placeholder
 *      figure → [[component:checklist]] (Image + text, image right, numbered list; the 7 steps
 *      verbatim: title = the bold lead-in, text = the rest of the step);
 *   3. "Do Frost-Free Hose Bibs…": paragraph 2 + the frost-free placeholder figure →
 *      [[component:frost-free]] (Image + text, image left, paragraphs; paragraph 2 verbatim);
 *      a new body figure (disconnecting the hose) after paragraph 4;
 *   4. "How Do You Winterize a Lawn Irrigation System?": a new body figure (lawn sprinkler)
 *      after paragraph 1; the blow-out placeholder figure is deleted;
 *   5. "Don't Skip the Backflow Device": the placeholder figure → the backflow photo, same place.
 * Everything else (the other copy, FAQ, takeaways, tags, related picks, meta) is unchanged.
 * The moved copy is DERIVED from the Brief 198 seed's own BODY (scripts/lib/
 * brief-198-hose-bib-content.ts), never retyped, so it stays verbatim by construction.
 *
 * ── ONE TIME, GUARDED, EDITOR STATE WINS (Brief 186) ────────────────────────────────────────
 * Checked in this order; every guard writes NOTHING:
 *   • Brief 190 / version columns missing                    → FAILED, exit 1 (schema fault);
 *   • no article with the slug                               → NOT-APPLIED (no article), exit 0;
 *   • a version labelled "Version 2 — real photos" exists    → ALREADY-APPLIED, exit 0
 *     (checked before the status, so a later Publish of Version 2 still reads as applied);
 *   • the article is not a draft                             → NOT-APPLIED (not a draft), exit 0;
 *   • the latest version OR the live row no longer equals the
 *     Brief 198 seed payload (compared after sanitizing,
 *     JSONB key order ignored) — i.e. edited in /admin        → NOT-APPLIED (edited in admin),
 *     naming every field that differs, exit 0.
 *   The related picks count as "as seeded" when they are an in-order subset of the seed's three
 *   (the seed drops unpublished ones); Version 2 carries them over unchanged either way.
 *
 * ── WHAT IT WRITES (one transaction) ───────────────────────────────────────────────────────
 *   • ONE new page_drafts row "Version 2 — real photos", is_published = FALSE, whose content is
 *     the payload the editor saves (the seed's shape). Version 1 is not touched.
 *   • The live row (still status 'draft'): body / image / v2 = Version 2's. The review route
 *     shows the NEWEST version (src/lib/cms/article-review.ts — what Brief 198 D8 proved), so
 *     the version alone would update the review link; the live row is updated too because the
 *     /admin editor fills its form from the LIVE row while it opens the newest version
 *     (useDraftVersions, Brief 159). Leaving the live row on Version 1 would let the next Save
 *     in /admin write the placeholder copy over Version 2.
 *   Body: sanitizeArticleBodyHtml (the publish writer's; identical to sanitizeCmsHtml for this
 *   body, asserted); v2: sanitizeArticleV2Content. Never touches global_settings.
 *
 * Needs an explicit mode (Brief 147): `commit` applies; `--dry-run` previews.
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/update-brief-201-hose-bib-images.ts commit
 */
import { existsSync, readFileSync } from 'fs';
import { Pool } from 'pg';
import { resolveRunMode, verdict } from './lib/run-mode';
import { sanitizeArticleBodyHtml, sanitizeCmsHtml } from '../src/lib/cms/sanitize';
import { sanitizeArticleV2Content } from '../src/lib/cms/article-v2-sanitize';
import type { ArticleV2Component } from '../src/lib/cms/article-v2';
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
  seedVersionContent,
} from './lib/brief-198-hose-bib-content';

const SCRIPT = 'update-brief-201-hose-bib-images';

const env = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
const get = (k: string) =>
  process.env[k] || (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim() || '';

export const VERSION_LABEL = 'Version 2 — real photos';

// ── The new media (Track B files, sizes as delivered) ─────────────────────────────────────────
const HERO = `${IMG}/hose-bib-fall-hero.webp`;
const HERO_ALT = "Brass outdoor faucet with a red handle on a home's siding, with work gloves and hose fittings set aside in the fall";
const HERO_CAPTION = 'Fall is the time to shut down outdoor faucets, before the first freeze.';

/** The Brief 198 in-article photo shape (figure > img + figcaption), at the real size. */
const figure = (file: string, alt: string, caption: string) =>
  `<figure><img src="${IMG}/${file}" alt="${alt}" width="1100" height="614" loading="lazy"><figcaption>${caption}</figcaption></figure>`;
const FIG_DISCONNECT = figure(
  'disconnecting-hose-from-outdoor-faucet.webp',
  'Gloved hand disconnecting a garden hose from an outdoor faucet on a brick wall',
  'Even with a frost-free faucet, take the hose off.'
);
const FIG_LAWN = figure(
  'lawn-sprinkler-watering.webp',
  'Lawn sprinkler spraying water across green grass',
  'Any water left in sprinkler lines can freeze and crack the pipe.'
);
// ⚑ Brief 201: the valve in this photo is not brass — never "brass" in its alt or caption.
const FIG_BACKFLOW = figure(
  'irrigation-backflow-preventer.webp',
  'Above-ground backflow preventer assembly for a lawn sprinkler system, surrounded by fall leaves',
  'The backflow device holds water too, so drain it for winter.'
);

// ── Anchors in the Brief 198 BODY (each must occur exactly once — else a code fault) ─────────
const placeholderFig = (file: string) => new RegExp(`<figure><img src="${IMG.replace(/\//g, '\\/')}\\/${file.replace(/\./g, '\\.')}"[^>]*><figcaption>[\\s\\S]*?<\\/figcaption><\\/figure>`, 'g');
function once(re: RegExp, what: string): string {
  const m = BODY.match(re) ?? [];
  if (m.length !== 1) throw new Error(`Brief 198 BODY: expected exactly one ${what}, found ${m.length}`);
  return m[0];
}
function replaceOnce(s: string, find: string, repl: string, what: string): string {
  const i = s.indexOf(find);
  if (i < 0 || s.indexOf(find, i + 1) >= 0) throw new Error(`expected exactly one ${what}`);
  return s.slice(0, i) + repl + s.slice(i + find.length);
}

const OL = once(/<ol>[\s\S]*?<\/ol>/g, '7-step <ol>');
const FIG_INDOOR_OLD = once(placeholderFig('placeholder-indoor-shutoff-valve.webp'), 'indoor-shutoff placeholder figure');
const FROST_P2 = once(/<p>A frost-free hose bib \(also called a frost-proof sillcock\)[\s\S]*?<\/p>/g, 'frost-free paragraph 2');
const FIG_FROST_OLD = once(placeholderFig('placeholder-frost-free-hose-bib.webp'), 'frost-free placeholder figure');
const FROST_P4 = once(/<p>So even with frost-free faucets, step one on the checklist stays the same\. Take the hose off\.<\/p>/g, 'frost-free paragraph 4');
const IRRIGATION_P1 = once(/<p>To winterize a lawn irrigation system,[\s\S]*?<\/p>/g, 'irrigation paragraph 1');
const FIG_BLOWOUT_OLD = once(placeholderFig('placeholder-irrigation-blowout.webp'), 'blow-out placeholder figure');
const FIG_BACKFLOW_OLD = once(placeholderFig('placeholder-backflow-preventer.webp'), 'backflow placeholder figure');

/** The 7 steps, verbatim: title = the bold lead-in, text = the rest of the step. */
const STEPS = Array.from(OL.matchAll(/<li><strong>([\s\S]*?)<\/strong> ([\s\S]*?)<\/li>/g), (m) => ({ title: m[1], text: m[2] }));
if (STEPS.length !== 7 || OL.split('<li>').length - 1 !== 7) throw new Error(`Brief 198 BODY: expected 7 checklist steps, parsed ${STEPS.length}`);
const FROST_P2_TEXT = FROST_P2.slice('<p>'.length, -'</p>'.length);

const item = (title: string, text: string) => ({ title, text, checklist: [], link_label: '', link_url: '' });
export const COMPONENTS: ArticleV2Component[] = [
  {
    name: 'checklist',
    type: 'media-text',
    items: STEPS.map((s) => item(s.title, s.text)),
    media: {
      image_url: `${IMG}/garden-hose-coiled-stored.webp`,
      image_width: 700,
      image_height: 1050,
      image_alt: 'Drained garden hose coiled and hung on a wall hook for winter storage',
      image_caption: 'Drain the hose, coil it and store it indoors.',
      image_side: 'right',
      text_style: 'numbered',
    },
  },
  {
    name: 'frost-free',
    type: 'media-text',
    items: [item('', FROST_P2_TEXT)],
    media: {
      image_url: `${IMG}/frost-free-hose-bib-diagram.webp`,
      image_width: 800,
      image_height: 800,
      image_alt: 'Diagram of a frost-free hose bib: supply pipe sloping downward, shut-off valve inside the pipe, anti-siphon valve, handle and spout',
      image_caption: 'The valve sits back inside the warm wall, so the faucet body has to drain through the spout.',
      image_side: 'left',
      text_style: 'paragraphs',
    },
  },
];

/** Version 2's body: the Brief 198 BODY with the Track C edits, in article order. */
export function buildBody(): string {
  let b = BODY;
  b = replaceOnce(b, `${OL}\n${FIG_INDOOR_OLD}`, '<p>[[component:checklist]]</p>', 'checklist <ol> + indoor placeholder');
  b = replaceOnce(b, `${FROST_P2}\n${FIG_FROST_OLD}`, '<p>[[component:frost-free]]</p>', 'frost-free paragraph 2 + placeholder');
  b = replaceOnce(b, FROST_P4, `${FROST_P4}\n${FIG_DISCONNECT}`, 'frost-free paragraph 4');
  b = replaceOnce(b, IRRIGATION_P1, `${IRRIGATION_P1}\n${FIG_LAWN}`, 'irrigation paragraph 1');
  b = replaceOnce(b, `\n${FIG_BLOWOUT_OLD}`, '', 'blow-out placeholder');
  b = replaceOnce(b, FIG_BACKFLOW_OLD, FIG_BACKFLOW, 'backflow placeholder');
  return b;
}

/** Version 2's content: the seed's payload shape with the new body, hero and V2 fields. */
export function buildVersion2(related: string[]) {
  const base = seedVersionContent(related);
  return {
    ...base,
    body: buildBody(),
    image: HERO,
    v2: sanitizeArticleV2Content({ ...base.v2, image_alt: HERO_ALT, image_caption: HERO_CAPTION, components: COMPONENTS }),
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
  const expected = seedVersionContent(relatedAsSeeded(c.related) ? c.related : RELATED_WANTED) as unknown as Record<string, unknown>;
  const out: string[] = [];
  const p = `version "${label}"`;
  for (const k of Array.from(new Set([...Object.keys(expected), ...Object.keys(c)]))) {
    if (k === 'body') {
      if (typeof c.body !== 'string' || sanitizeCmsHtml(c.body) !== sanitizeCmsHtml(BODY)) out.push(`${p}.body`);
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
           OR (table_name = 'page_drafts' AND column_name IN ('label', 'content', 'is_published', 'version'))`
    );
    const need = ['cms_articles.template', 'cms_articles.v2', 'page_drafts.label', 'page_drafts.content', 'page_drafts.is_published', 'page_drafts.version'];
    const missing = need.filter((n) => !cols.rows.some((r) => `${r.table_name}.${r.column_name}` === n));
    if (missing.length) throw new Error(`missing column(s): ${missing.join(', ')}`);

    // ── The article ──
    const live = (
      await c.query<LiveRow>(
        `SELECT id, status, template, title, excerpt, image, meta_title, meta_description, body->>'html' AS html, v2
           FROM cms_articles WHERE slug = $1`,
        [SLUG]
      )
    ).rows[0];
    if (!live) {
      verdict(SCRIPT, 'NOT-APPLIED (no article)', `no article /knowledge-hub/${SLUG} (the Brief 198 seed has not created it here) — nothing written`);
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
      banner([`NOT APPLIED — the article is ${live.status}, not a draft. Nothing was written; swap the photos in /admin (see the Brief 201 report).`]);
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
        'NOT APPLIED — the draft no longer matches the Brief 198 seed (edited in /admin). Nothing was written;',
        'make the Brief 201 Track C changes by hand in /admin (the Brief 201 report lists the steps). Differs:',
        ...diffs.map((d) => `  • ${d}`),
      ]);
      verdict(SCRIPT, 'NOT-APPLIED (edited in admin)', `differs: ${diffs.join(', ')}`);
      return;
    }

    // ── Build Version 2 (the seed's related picks carried over as stored) ──
    const related = (latest.content as { related: string[] }).related;
    const content = buildVersion2(related);
    const bodyHtml = sanitizeArticleBodyHtml(content.body);
    if (bodyHtml !== sanitizeCmsHtml(content.body)) throw new Error('the two body sanitizers disagree on the Version 2 body');
    if (/placeholder-|photo placeholder/i.test(bodyHtml + JSON.stringify(content.v2) + content.image)) {
      throw new Error('Version 2 still references a placeholder');
    }
    if (content.v2.components.length !== 2 || content.v2.components.some((k) => k.items.length === 0 || !k.media?.image_url)) {
      throw new Error('Version 2 components did not survive sanitizing');
    }

    const v1Before = versions.map((v) => `${v.id}:${canon(v.content)}:${v.is_published}`).join('|');

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
      [live.id, JSON.stringify({ html: bodyHtml }), content.image, JSON.stringify(content.v2)]
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
    const row = (await c.query<{ status: string; image: string; html: string; n: number }>(
      `SELECT status, image, body->>'html' AS html, jsonb_array_length(v2->'components') AS n FROM cms_articles WHERE id = $1`,
      [live.id]
    )).rows[0];
    if (
      after.length !== versions.length + 1 ||
      after[0].id !== ins.rows[0].id ||
      after[0].is_published ||
      others !== v1Before ||
      row.status !== 'draft' ||
      row.image !== HERO ||
      row.n !== 2 ||
      /placeholder-/.test(row.html)
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

// Run only as a script (the verification suite imports buildBody / buildVersion2).
if (require.main === module) {
  const pool = new Pool({ connectionString: get('DATABASE_URL') || 'postgresql://postgres:jbp@localhost:5432/jbp_cms' });
  main(pool)
    .catch((err) => {
      console.error(err);
      verdict(SCRIPT, 'FAILED', err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
