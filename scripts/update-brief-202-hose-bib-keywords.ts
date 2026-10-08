/**
 * Brief 202 (Track B) — keyword tweaks on the UNPUBLISHED hose bib draft, as "Version 3 — keyword tweaks":
 *   1. title / H1   → "How to Winterize Outdoor Faucets and Spigots: A Fall Checklist for Chicagoland"
 *   2. meta title   → "How to Winterize Outdoor Faucets and Spigots"
 *   3. subtitle (v2.dek) AND excerpt → "Outdoor faucets (also called spigots or hose bibs) and lawn irrigation
 *      lines are the first pipes to freeze in Chicagoland."
 *   4. body H2 "Your Hose Bib Shutoff Checklist" → "How Do You Winterize an Outdoor Faucet or Spigot?"
 *   5. the checklist split: component `checklist` keeps steps 1–2; steps 3–7 move into the body, right after
 *      its marker, under a new <h3>Where Is the Shut-Off Valve for an Outdoor Spigot?</h3>, as <ol start="3">.
 *      They are built FROM THE COMPONENT'S OWN ITEMS 3–7 (<li><strong>title</strong> text</li>, the markup
 *      the component renders), so they are verbatim by construction;
 *   6. slug hose-bib-irrigation-fall-checklist → how-to-winterize-outdoor-faucets-spigots.
 * Everything else (meta description, takeaways, hero, every image / alt / caption, FAQ, tags, related, byline)
 * is unchanged.
 *
 * ── ONE TIME, GUARDED, EDITOR STATE WINS (Brief 186) ───────────────────────────────────────────
 * Checked in this order; every guard writes NOTHING:
 *   • version / V2 columns missing                                   → FAILED, exit 1 (schema fault);
 *   • no article under either slug                                   → NOT-APPLIED (no article), exit 0;
 *   • a version "Version 3 — keyword tweaks" exists                   → ALREADY-APPLIED, exit 0;
 *   • the article is not a draft                                     → NOT-APPLIED (not a draft), exit 0;
 *   • the latest version OR the live row no longer equals today's
 *     Version 2 payload (Brief 201's builder + review rounds 1 and 3,
 *     compared after sanitizing, JSONB key order ignored)             → NOT-APPLIED (edited in admin), naming fields;
 *   • the new slug is used by another article, or versions already
 *     sit under it                                                   → NOT-APPLIED (slug taken), exit 0.
 *
 * ── WHAT IT WRITES (one transaction) ────────────────────────────────────────────────────────────
 *   • ONE new page_drafts row "Version 3 — keyword tweaks", is_published = FALSE, the editor's payload shape.
 *   • The SLUG travels with the article: page_drafts.page_slug of its existing versions (content untouched —
 *     hashed before and after) and its page_changelog rows, if any, move to the new slug. Versions and history
 *     are keyed by slug; left behind, the editor and the review route would lose them. Tags and related picks
 *     are keyed by article id. The CMS creates no redirect rows (article slugs are fixed in /admin), so no
 *     public redirect to a draft can appear; the OLD REVIEW link 308s via middleware (Track A3).
 *   • The live row: slug, title, excerpt, meta title, body, v2 = Version 3. Status stays 'draft'.
 *   Body: sanitizeArticleBodyHtml (the publish writer's; it keeps <ol start> since Brief 202 A2);
 *   v2: sanitizeArticleV2Content.
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/update-brief-202-hose-bib-keywords.ts commit
 */
import { existsSync, readFileSync } from 'fs';
import { Pool } from 'pg';
import { resolveRunMode, verdict } from './lib/run-mode';
import { sanitizeArticleBodyHtml } from '../src/lib/cms/sanitize';
import { sanitizeArticleV2Content } from '../src/lib/cms/article-v2-sanitize';
import { RELATED_WANTED } from './lib/brief-198-hose-bib-content';
import { HOSE_BIB_SLUGS, NEW_SLUG, OLD_SLUG } from './lib/hose-bib-article';
import { buildVersion2 } from './update-brief-201-hose-bib-images';
import { applyRound3 } from './update-brief-201-review-3';

const SCRIPT = 'update-brief-202-hose-bib-keywords';
export const VERSION_LABEL = 'Version 3 — keyword tweaks';

export const NEW_TITLE = 'How to Winterize Outdoor Faucets and Spigots: A Fall Checklist for Chicagoland';
export const NEW_META_TITLE = 'How to Winterize Outdoor Faucets and Spigots';
export const NEW_DEK = 'Outdoor faucets (also called spigots or hose bibs) and lawn irrigation lines are the first pipes to freeze in Chicagoland.';
const OLD_H2 = '<h2>Your Hose Bib Shutoff Checklist</h2>';
const NEW_H2 = '<h2>How Do You Winterize an Outdoor Faucet or Spigot?</h2>';
// Verbatim from the brief: "Shut-Off" here, "shutoff" in step 3 — intentional, not harmonised.
const NEW_H3 = '<h3>Where Is the Shut-Off Valve for an Outdoor Spigot?</h3>';
const MARKER = '<p>[[component:checklist]]</p>';
const KEEP_IN_COMPONENT = 2;
/** Plain text → HTML text, encoded exactly as the sanitizer encodes text (& < > only). */
const escapeText = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const env = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
const get = (k: string) =>
  process.env[k] || (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim() || '';

function replaceOnce(s: string, find: string, repl: string, what: string): string {
  const i = s.indexOf(find);
  if (i < 0 || s.indexOf(find, i + 1) >= 0) throw new Error(`expected exactly one ${what}`);
  return s.slice(0, i) + repl + s.slice(i + find.length);
}

/** Today's Version 2: Brief 201's builder (round 1's empty caption included) + round 3's body edit. */
export function buildToday(related: string[]) {
  const v2 = buildVersion2(related);
  return { ...v2, body: applyRound3(v2.body) };
}

/** Version 3, from today's Version 2 payload. */
export function buildVersion3(related: string[]) {
  const base = buildToday(related);
  const comps = base.v2.components;
  const checklist = comps.find((c) => c.name === 'checklist');
  if (!checklist || checklist.type !== 'media-text' || checklist.items.length !== 7) throw new Error('Version 2 checklist component is not the 7-step Image + text');
  const moved = checklist.items.slice(KEEP_IN_COMPONENT);
  const ol = `<ol start="${KEEP_IN_COMPONENT + 1}">${moved.map((i) => `<li><strong>${escapeText(i.title)}</strong> ${i.text}</li>`).join('')}</ol>`;
  let body = replaceOnce(base.body, OLD_H2, NEW_H2, 'checklist H2');
  body = replaceOnce(body, MARKER, `${MARKER}\n${NEW_H3}\n${ol}`, 'checklist marker');
  const v2 = sanitizeArticleV2Content({
    ...base.v2,
    dek: NEW_DEK,
    components: comps.map((c) => (c.name === 'checklist' ? { ...c, items: c.items.slice(0, KEEP_IN_COMPONENT) } : c)),
  });
  return { ...base, title: NEW_TITLE, excerpt: NEW_DEK, body, v2, metaTitle: NEW_META_TITLE };
}

// ── Comparison against today's Version 2 (same rules as Brief 201) ───────────────────────────
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

/** An in-order subset of the seed's hand-picks (Brief 201 rule; carried over unchanged). */
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
  const expected = buildToday(relatedAsSeeded(c.related) ? c.related : RELATED_WANTED) as unknown as Record<string, unknown>;
  const out: string[] = [];
  const p = `version "${label}"`;
  for (const k of Array.from(new Set([...Object.keys(expected), ...Object.keys(c)]))) {
    if (k === 'body') {
      if (typeof c.body !== 'string' || sanitizeArticleBodyHtml(c.body) !== sanitizeArticleBodyHtml(expected.body as string)) out.push(`${p}.body`);
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

function liveDiff(r: LiveRow, expected: ReturnType<typeof buildToday>): string[] {
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
           OR (table_name = 'page_changelog' AND column_name = 'page_slug')`
    );
    const need = ['cms_articles.slug', 'cms_articles.template', 'cms_articles.v2', 'page_drafts.page_slug', 'page_drafts.label', 'page_drafts.content', 'page_drafts.is_published', 'page_drafts.version', 'page_changelog.page_slug'];
    const missing = need.filter((n) => !cols.rows.some((r) => `${r.table_name}.${r.column_name}` === n));
    if (missing.length) throw new Error(`missing column(s): ${missing.join(', ')}`);

    // ── The article, under either slug. If both exist, ours is the OLD-slug row (the other takes the new slug). ──
    const rows = (
      await c.query<LiveRow>(
        `SELECT id, slug, status, template, title, excerpt, image, meta_title, meta_description, body->>'html' AS html, v2
           FROM cms_articles WHERE slug = ANY($1::text[]) ORDER BY id`,
        [HOSE_BIB_SLUGS]
      )
    ).rows;
    if (!rows.length) {
      verdict(SCRIPT, 'NOT-APPLIED (no article)', `no article at /knowledge-hub/${OLD_SLUG} or /${NEW_SLUG} — nothing written`);
      return;
    }
    const live = rows.length === 1 ? rows[0] : rows.find((r) => r.slug === OLD_SLUG)!;
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
      banner([`NOT APPLIED — the article is ${live.status}, not a draft. Nothing was written; make the Brief 202 changes in /admin (see the Brief 202 report).`]);
      verdict(SCRIPT, 'NOT-APPLIED (not a draft)', `id ${live.id} is ${live.status} — nothing written`);
      return;
    }

    // ── Edited in /admin? The latest version (what the review route shows) AND the live row. ──
    const latest = versions[0];
    const related = latest && relatedAsSeeded((latest.content as { related?: unknown })?.related) ? (latest.content as { related: string[] }).related : RELATED_WANTED;
    const diffs = latest ? versionDiff(latest.content, latest.label) : ['no version row'];
    if (latest?.is_published) diffs.push(`version "${latest.label}" is published`);
    diffs.push(...liveDiff(live, buildToday(related)));
    if (diffs.length) {
      banner([
        'NOT APPLIED — the draft no longer matches Version 2 as Briefs 201 (+ review rounds) left it: edited in /admin.',
        'Nothing was written; make the Brief 202 changes by hand (the Brief 202 report lists the steps). Differs:',
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

    // ── Build Version 3 ──
    const content = buildVersion3(related);
    const bodyHtml = sanitizeArticleBodyHtml(content.body);
    // The raw editor HTML is never byte-stable (the sanitizer adds rel= to links); the stored live body is
    // the sanitized form, which must be idempotent and must keep <ol start="3"> (Brief 202 A2).
    if (sanitizeArticleBodyHtml(bodyHtml) !== bodyHtml) throw new Error('the sanitized Version 3 body is not idempotent');
    if (!bodyHtml.includes(`${NEW_H3}\n<ol start="3"><li><strong>Find the indoor shutoff valve.</strong>`)) throw new Error('Version 3 body lost the H3 / <ol start="3">');
    const ck = content.v2.components.find((k) => k.name === 'checklist');
    if (!ck || ck.items.length !== 2 || content.v2.dek !== NEW_DEK) throw new Error('Version 3 V2 fields did not survive sanitizing');

    const hashOthers = async () =>
      (await c.query<{ h: string }>(
        `SELECT md5(string_agg(id || ':' || md5(content::text) || ':' || is_published || ':' || version || ':' || label, ',' ORDER BY id)) AS h
           FROM page_drafts WHERE page_type = 'article' AND page_slug = ANY($1::text[]) AND label <> $2`,
        [HOSE_BIB_SLUGS, VERSION_LABEL]
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
      `UPDATE cms_articles SET slug = $2, title = $3, excerpt = $4, meta_title = $5, body = $6::jsonb, v2 = $7::jsonb, updated_at = NOW()
        WHERE id = $1 AND status = 'draft' AND slug = $8`,
      [live.id, NEW_SLUG, NEW_TITLE, NEW_DEK, NEW_META_TITLE, JSON.stringify({ html: bodyHtml }), JSON.stringify(content.v2), OLD_SLUG]
    );
    if (upd.rowCount !== 1) throw new Error('the live row was not updated');

    // ── Verify what this run wrote (and that nothing else moved) ──
    const after = await hashOthers();
    const arts = (await c.query<{ id: number; slug: string; status: string; title: string }>(
      `SELECT id, slug, status, title FROM cms_articles WHERE slug = ANY($1::text[])`, [HOSE_BIB_SLUGS]
    )).rows;
    const vers = (await c.query<{ id: number; page_slug: string; is_published: boolean }>(
      `SELECT id, page_slug, is_published FROM page_drafts WHERE page_type = 'article' AND page_slug = ANY($1::text[]) ORDER BY created_at DESC, id DESC`,
      [HOSE_BIB_SLUGS]
    )).rows;
    if (
      after !== before ||
      arts.length !== 1 || arts[0].slug !== NEW_SLUG || arts[0].status !== 'draft' || arts[0].title !== NEW_TITLE ||
      vers.length !== versions.length + 1 || vers.some((v) => v.page_slug !== NEW_SLUG || v.is_published) || vers[0].id !== ins.rows[0].id
    ) {
      throw new Error('post-write verification failed');
    }
    console.log(`  + page_drafts "${VERSION_LABEL}" (id ${ins.rows[0].id}), unpublished — the newest version`);
    console.log(`  ~ ${moved.rowCount} earlier version(s) and ${history.rowCount} history row(s) moved to /${NEW_SLUG} (content unchanged: ${before === after ? 'hash identical' : 'CHANGED'})`);
    console.log(`  ~ cms_articles id ${live.id}: slug /${NEW_SLUG}, title, excerpt, meta title, body, v2 = Version 3 (status still draft)`);

    if (mode !== 'commit') {
      await c.query('ROLLBACK');
      console.log('\n  (dry run — rolled back)');
      verdict(SCRIPT, 'NOT-APPLIED (dry run)', `would add "${VERSION_LABEL}" and rename id ${live.id} to /${NEW_SLUG}`);
      return;
    }
    await c.query('COMMIT');
    committed = true;
    verdict(SCRIPT, 'APPLIED', `"${VERSION_LABEL}" added; id ${live.id} renamed /${OLD_SLUG} → /${NEW_SLUG} (still a draft) — review at /review/knowledge-hub/${NEW_SLUG}`);
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
    .finally(() => pool.end());
}
