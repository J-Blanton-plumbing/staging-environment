/**
 * Brief 210 — the Columbus "Old House Plumbing" article: ONE sentence fixed, then PUBLISHED.
 *
 *   /knowledge-hub/old-house-plumbing-problems-grandview-worthington-german-village
 *
 * J. Blanton is not a City of Columbus licensed sewer installer (Marketing D1, 2026-10-14), so the
 * licensing clause in the Worthington subsection goes (Track A, verbatim):
 *   is the property owner's responsibility</a>, and only a sewer installer licensed with the City of
 *   Columbus, with a Worthington permit, may install or repair it.</p>
 *     → is the property owner's responsibility</a>.</p>
 * Every other byte of the newest version — including anything Marketing saved in /admin since Brief
 * 203, which is approved — is carried over as it is. Then the new version is PUBLISHED (D3).
 *
 * ── THE APP'S OWN PATHS, NOT HAND-WRITTEN SQL (hard rule 2) ─────────────────────────────────────
 *   • Version 3 is created by `createDraft` (src/lib/cms/drafts.ts) — what the editor's "Save as new
 *     version" calls through POST /api/cms/drafts. It stores the editor's payload shape and runs the
 *     V2 fields through sanitizeArticleV2Content; the body goes through sanitizeArticleBodyHtml here.
 *   • It is published by `publishDraft` (src/lib/cms/drafts.ts) — exactly what the admin's Status →
 *     Published calls through POST /api/cms/drafts/[id]/publish. That runs updateArticleCmsContent
 *     (body/V2 sanitized, tags + related written), moves the is_published pointer, sets
 *     cms_articles.status via setLiveStatusInTx, stamps published_at (→ BlogPosting datePublished)
 *     and writes the page_changelog row. Nothing here sets status / is_published / published_at.
 *
 * ── ONE TRANSACTION FOR BOTH STEPS ──────────────────────────────────────────────────────────────
 * createDraft and publishDraft take connections from the app pool (src/lib/db) and run their own
 * BEGIN/COMMIT. For the duration of the write, this script binds that pool to ONE client inside an
 * outer transaction and turns the app's BEGIN / COMMIT / ROLLBACK into SAVEPOINT / RELEASE / ROLLBACK
 * TO (bindAppPoolToTransaction below). The app code runs unchanged; its SQL simply lands inside our
 * transaction, so a publish failure (or a failed post-write check) rolls back Version 3 as well —
 * there is never a half-written state, even if the process dies. A dry run executes the real publish
 * and rolls it back.
 *
 * ── GUARDS (every one writes NOTHING) ───────────────────────────────────────────────────────────
 *   • version / V2 / tag columns missing                         → FAILED, exit 1 (schema fault);
 *   • no article under either slug (scripts/lib/older-homes-article.ts) → NOT-APPLIED (no article);
 *     both slugs present                                         → NOT-APPLIED (two articles);
 *   • published AND "Version 3 — final" exists                   → ALREADY-APPLIED (every later deploy);
 *   • "Version 3 — final" exists but the article is NOT published
 *     (taken down in /admin afterwards)                          → NOT-APPLIED (guard tripped) — never re-published;
 *   • published without Version 3 (Publish clicked in /admin)     → NOT-APPLIED (published in admin);
 *   • the "Current" string not exactly once in the newest
 *     version's body AND the live row's body                     → NOT-APPLIED (anchor missing), counts;
 *   • the newest version and the live row disagree on any field
 *     the editor's Save Article writes (body, title, excerpt,
 *     image, meta title, meta description)                       → NOT-APPLIED (live and newest version differ);
 *   • any other `licens` / `install or repair` / `permit` hit
 *     in the body, V2 fields or meta                             → NOT-APPLIED (license claim elsewhere), quoted;
 *   • no cms_users row                                           → NOT-APPLIED (no CMS user).
 * All exit 0 (Brief 186). A failure while writing → everything rolled back, FAILED (publish), exit 0.
 * Reported, never blocking: every field where the newest version differs from the Brief 203 payload.
 *
 * Every earlier version's content is hashed before and after (unchanged); each gets `version + 1`
 * so an editor tab opened before the deploy gets the normal conflict on Save instead of writing old
 * copy back into a version.
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/publish-brief-210-older-homes.ts commit
 */
import { existsSync, readFileSync } from 'fs';
import type { Pool, PoolClient } from 'pg';
import { resolveRunMode, verdict } from './lib/run-mode';
import { NEW_SLUG, OLD_SLUG, describeBoth, findOlderHomesArticle } from './lib/older-homes-article';

const SCRIPT = 'publish-brief-210-older-homes';
export const VERSION_LABEL = 'Version 3 — final';

// ── Track A, verbatim ──
export const CURRENT =
  "is the property owner's responsibility</a>, and only a sewer installer licensed with the City of Columbus, with a Worthington permit, may install or repair it.</p>";
export const REPLACEMENT = "is the property owner's responsibility</a>.</p>";
/** The Track A search. */
const CLAIM_RE = /licens|install or repair|permit/gi;

/** The fields the editor's bottom "Save Article" PUT writes straight to the live row. */
const SAVE_ARTICLE_FIELDS = ['body', 'title', 'excerpt', 'image', 'metaTitle', 'metaDescription'] as const;

// src/lib/db builds its Pool from process.env.DATABASE_URL when first imported, so the env must be
// set BEFORE any src module loads (they are imported dynamically in main()).
const env = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    (env.match(/^DATABASE_URL=(.*)$/m) || [])[1]?.trim() || 'postgresql://postgres:jbp@localhost:5432/jbp_cms';
}

type Content = Record<string, unknown>;

const canon = (x: unknown): string =>
  Array.isArray(x)
    ? `[${x.map(canon).join(',')}]`
    : x && typeof x === 'object'
      ? `{${Object.keys(x as object).sort().map((k) => `${JSON.stringify(k)}:${canon((x as Record<string, unknown>)[k])}`).join(',')}}`
      : JSON.stringify(x === undefined ? null : x);

const count = (s: string, sub: string) => (sub ? s.split(sub).length - 1 : 0);
const str = (x: unknown) => (typeof x === 'string' ? x : x == null ? '' : String(x));

/** Every string in a value, with its path (V2 fields: dek, takeaways, FAQs, captions, alts, components…). */
function strings(x: unknown, path: string, out: [string, string][] = []): [string, string][] {
  if (typeof x === 'string') out.push([path, x]);
  else if (Array.isArray(x)) x.forEach((v, i) => strings(v, `${path}[${i}]`, out));
  else if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) strings(v, `${path}.${k}`, out);
  return out;
}

/** Every Track A search hit in the fields that reach the page: body, V2, title/excerpt/meta. */
function claimHits(content: Content): { field: string; hit: string; context: string }[] {
  const fields: [string, string][] = [
    ['body', str(content.body)],
    ['title', str(content.title)],
    ['excerpt', str(content.excerpt)],
    ['metaTitle', str(content.metaTitle)],
    ['metaDescription', str(content.metaDescription)],
    ...strings(content.v2, 'v2'),
  ];
  const out: { field: string; hit: string; context: string }[] = [];
  for (const [field, s] of fields) {
    for (const m of Array.from(s.matchAll(CLAIM_RE))) {
      const i = m.index ?? 0;
      out.push({ field, hit: m[0], context: s.slice(Math.max(0, i - 90), i + m[0].length + 60).replace(/\s+/g, ' ') });
    }
  }
  return out;
}

/** Where two strings first differ, for a readable report line. */
function firstDiff(a: string, b: string): string {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  const cut = (s: string) => JSON.stringify(s.slice(Math.max(0, i - 40), i + 80));
  return `at char ${i}: now ${cut(a)} vs 203 ${cut(b)}`;
}

/**
 * Point the app pool (src/lib/db) at ONE client inside our transaction: the app's own BEGIN / COMMIT /
 * ROLLBACK become SAVEPOINT / RELEASE / ROLLBACK TO, release() is a no-op. Returns the undo.
 */
function bindAppPoolToTransaction(appPool: Pool, client: PoolClient): () => void {
  let depth = 0;
  const run = (text: unknown, values?: unknown) =>
    (client.query as (t: unknown, v?: unknown) => Promise<unknown>).call(client, text, values);
  const query = async (text: unknown, values?: unknown) => {
    const verb = typeof text === 'string' ? text.trim().toUpperCase() : '';
    if (verb === 'BEGIN') {
      depth++;
      return run(`SAVEPOINT b210_${depth}`);
    }
    if (verb === 'COMMIT') {
      if (depth < 1) throw new Error('COMMIT without BEGIN inside the bound transaction');
      return run(`RELEASE SAVEPOINT b210_${depth--}`);
    }
    if (verb === 'ROLLBACK') {
      if (depth < 1) return { rows: [], rowCount: 0 };
      await run(`ROLLBACK TO SAVEPOINT b210_${depth}`);
      return run(`RELEASE SAVEPOINT b210_${depth--}`);
    }
    return run(text, values);
  };
  const bound = { query, release: () => {} };
  const p = appPool as unknown as Record<string, unknown>;
  const had = { connect: Object.prototype.hasOwnProperty.call(p, 'connect'), query: Object.prototype.hasOwnProperty.call(p, 'query') };
  const orig = { connect: p.connect, query: p.query };
  p.connect = async () => bound;
  p.query = (text: unknown, values?: unknown) => run(text, values);
  return () => {
    if (had.connect) p.connect = orig.connect; else delete p.connect;
    if (had.query) p.query = orig.query; else delete p.query;
  };
}

function banner(lines: string[]) {
  console.log('\n' + '!'.repeat(72));
  for (const l of lines) console.log(`${SCRIPT}: ${l}`);
  console.log('!'.repeat(72) + '\n');
}

interface LiveRow {
  id: number;
  slug: string;
  status: string;
  template: string;
  title: string | null;
  excerpt: string | null;
  image: string | null;
  meta_title: string | null;
  meta_description: string | null;
  html: string | null;
  v2: unknown;
}
interface VersionRow {
  id: number;
  label: string;
  is_published: boolean;
  version: number;
  created_by: number;
  content: Content | null;
}

/** Exit code for main(): 0 for every content-state outcome, 1 only for a schema/code fault. */
async function main(): Promise<number> {
  const mode = resolveRunMode(SCRIPT);
  console.log(`MODE: ${mode === 'commit' ? 'COMMIT' : 'DRY RUN (the publish runs, then everything is rolled back)'}\n`);

  const appPool = (await import('../src/lib/db')).default as unknown as Pool;
  const { sanitizeArticleBodyHtml } = await import('../src/lib/cms/sanitize');
  const { sanitizeArticleV2Content } = await import('../src/lib/cms/article-v2-sanitize');
  const { createDraft, publishDraft } = await import('../src/lib/cms/drafts');

  const c = await appPool.connect();
  let unbind: (() => void) | null = null;
  try {
    // ── Schema (a code fault → exit 1) ──
    const cols = await c.query<{ t: string }>(
      `SELECT table_name || '.' || column_name AS t FROM information_schema.columns
        WHERE (table_name = 'cms_articles' AND column_name IN ('id', 'slug', 'status', 'template', 'v2', 'body', 'title', 'excerpt', 'image', 'meta_title', 'meta_description'))
           OR (table_name = 'page_drafts' AND column_name IN ('page_type', 'page_slug', 'label', 'content', 'is_published', 'published_at', 'version', 'created_by'))
           OR (table_name = 'page_changelog' AND column_name = 'page_slug')
           OR (table_name = 'cms_article_terms' AND column_name IN ('article_id', 'term_id', 'is_primary'))
           OR (table_name = 'cms_article_related' AND column_name = 'article_id')
           OR (table_name = 'kh_terms' AND column_name IN ('id', 'type', 'slug'))
           OR (table_name = 'cms_users' AND column_name = 'id')`
    );
    const need = [
      'cms_articles.id', 'cms_articles.slug', 'cms_articles.status', 'cms_articles.template', 'cms_articles.v2', 'cms_articles.body',
      'cms_articles.title', 'cms_articles.excerpt', 'cms_articles.image', 'cms_articles.meta_title', 'cms_articles.meta_description',
      'page_drafts.page_type', 'page_drafts.page_slug', 'page_drafts.label', 'page_drafts.content', 'page_drafts.is_published',
      'page_drafts.published_at', 'page_drafts.version', 'page_drafts.created_by', 'page_changelog.page_slug',
      'cms_article_terms.article_id', 'cms_article_terms.term_id', 'cms_article_terms.is_primary', 'cms_article_related.article_id',
      'kh_terms.id', 'kh_terms.type', 'kh_terms.slug', 'cms_users.id',
    ];
    const missingCols = need.filter((n) => !cols.rows.some((r) => r.t === n));
    if (missingCols.length) {
      verdict(SCRIPT, 'FAILED', `missing column(s): ${missingCols.join(', ')} — schema fault, nothing written`);
      return 1;
    }

    // ── The article, under either slug (Brief 203's shared lookup) ──
    const found = await findOlderHomesArticle(c);
    if (found.kind === 'none') {
      verdict(SCRIPT, 'NOT-APPLIED (no article)', `no article at /knowledge-hub/${NEW_SLUG} or /${OLD_SLUG} — nothing written`);
      return 0;
    }
    if (found.kind === 'both') {
      banner([`NOT APPLIED — ${describeBoth(found.rows)}.`]);
      verdict(SCRIPT, 'NOT-APPLIED (two articles)', describeBoth(found.rows));
      return 0;
    }
    const live = (await c.query<LiveRow>(
      `SELECT id, slug, status, template, title, excerpt, image, meta_title, meta_description, body->>'html' AS html, v2
         FROM cms_articles WHERE id = $1`, [found.id]
    )).rows[0];
    const versions = (await c.query<VersionRow>(
      `SELECT id, label, is_published, version, created_by, content FROM page_drafts
        WHERE page_type = 'article' AND page_slug = $1
        ORDER BY created_at DESC, id DESC`, [live.slug]
    )).rows;

    const mine = versions.find((v) => v.label === VERSION_LABEL);
    if (mine && live.status === 'published') {
      verdict(SCRIPT, 'ALREADY-APPLIED', `id ${live.id} /${live.slug} is published and has "${VERSION_LABEL}" (version id ${mine.id}${mine.is_published ? ', the live one' : `; live version: ${versions.find((v) => v.is_published)?.label ?? 'none'}`}) — nothing written`);
      return 0;
    }
    if (mine) {
      banner([
        `NOT APPLIED — "${VERSION_LABEL}" (version id ${mine.id}) exists but the article is ${live.status}: it was taken down in /admin after Brief 210 published it.`,
        'Nothing was written. This script never re-publishes over that decision.',
      ]);
      verdict(SCRIPT, 'NOT-APPLIED (guard tripped)', `"${VERSION_LABEL}" exists but id ${live.id} is ${live.status} (unpublished in /admin) — nothing written`);
      return 0;
    }
    const pubVersion = versions.find((v) => v.is_published);
    if (live.status === 'published' || pubVersion) {
      banner([
        `NOT APPLIED — the article was published in /admin without Brief 210 (status ${live.status}${pubVersion ? `, live version "${pubVersion.label}" id ${pubVersion.id}` : ''}).`,
        'Nothing was written. The licensing sentence may be LIVE — remove it in /admin (Brief 210 Track A).',
      ]);
      verdict(SCRIPT, 'NOT-APPLIED (published in admin)', `id ${live.id} status ${live.status}${pubVersion ? `, "${pubVersion.label}" published` : ''} — nothing written`);
      return 0;
    }

    const newest = versions[0];
    if (!newest || !newest.content || typeof newest.content !== 'object') {
      banner(['NOT APPLIED — the article has no version to build Version 3 from. Nothing was written.']);
      verdict(SCRIPT, 'NOT-APPLIED (guard tripped)', `id ${live.id} has no version row — nothing written`);
      return 0;
    }
    const nc = newest.content;
    const newestBody = str(nc.body);
    const liveBody = live.html ?? '';

    // ── Anchor: exactly once in the newest version AND the live row ──
    const nNewest = count(newestBody, CURRENT);
    const nLive = count(liveBody, CURRENT);
    if (nNewest !== 1 || nLive !== 1) {
      banner([`NOT APPLIED — the Track A "Current" string is not there exactly once (newest version "${newest.label}": ${nNewest}×, live row: ${nLive}×). Nothing was written.`]);
      verdict(SCRIPT, 'NOT-APPLIED (anchor missing)', `newest version "${newest.label}" ${nNewest}×, live row ${nLive}× — nothing written`);
      return 0;
    }

    // ── Live row and newest version must agree on what Save Article writes (no forked state) ──
    const liveFields: Record<(typeof SAVE_ARTICLE_FIELDS)[number], string> = {
      body: sanitizeArticleBodyHtml(liveBody),
      title: str(live.title),
      excerpt: str(live.excerpt),
      image: str(live.image),
      metaTitle: str(live.meta_title),
      metaDescription: str(live.meta_description),
    };
    const forked = SAVE_ARTICLE_FIELDS.filter((k) =>
      k === 'body' ? sanitizeArticleBodyHtml(newestBody) !== liveFields.body : str(nc[k]) !== liveFields[k]
    );
    if (forked.length) {
      banner([
        `NOT APPLIED — the live row and the newest version "${newest.label}" differ (an edit saved to one but not the other). Nothing was written.`,
        ...forked.map((k) => `  • ${k}${k === 'body' ? ` (${firstDiff(liveFields.body, sanitizeArticleBodyHtml(newestBody))})` : `: live ${JSON.stringify(liveFields[k])} vs version ${JSON.stringify(str(nc[k]))}`}`),
      ]);
      verdict(SCRIPT, 'NOT-APPLIED (live and newest version differ)', `differs: ${forked.join(', ')} — nothing written`);
      return 0;
    }

    // ── Track A search: report every hit; any outside the anchor sentence blocks ──
    const hits = claimHits(nc);
    console.log(`Track A search (licens / install or repair / permit) in "${newest.label}": ${hits.length} hit(s)`);
    for (const h of hits) console.log(`  • ${h.field}: "${h.hit}" … ${h.context}`);
    const rest = claimHits({ ...nc, body: newestBody.replace(CURRENT, REPLACEMENT) });
    if (rest.length) {
      banner([
        'NOT APPLIED — a licensing/permit wording remains outside the Track A sentence. Nothing was written; Marketing must review:',
        ...rest.map((h) => `  • ${h.field}: … ${h.context}`),
      ]);
      verdict(SCRIPT, 'NOT-APPLIED (license claim elsewhere)', rest.map((h) => `${h.field}: "${h.context}"`).join(' | '));
      return 0;
    }

    const author = (await c.query<{ id: number }>(`SELECT id FROM cms_users ORDER BY id LIMIT 1`)).rows[0];
    if (!author) {
      verdict(SCRIPT, 'NOT-APPLIED (no CMS user)', 'no cms_users row to attribute Version 3 / the publish to — nothing written');
      return 0;
    }

    // ── Report, don't block: Marketing's /admin edits since Brief 203 ──
    try {
      const since = await editsSince203(c, nc, sanitizeArticleBodyHtml, sanitizeArticleV2Content);
      console.log(since.length
        ? `Newest version vs the Brief 203 payload (Marketing's /admin edits — approved, shipped as they are):\n${since.map((d) => `  • ${d}`).join('\n')}`
        : 'Newest version vs the Brief 203 payload: identical (no /admin edits since Brief 203).');
    } catch (err) {
      console.log(`Newest version vs the Brief 203 payload: could not rebuild the payload (${err instanceof Error ? err.message : err}) — not blocking.`);
    }

    // ── Version 3 = the newest version's payload with the Track A change only ──
    const v3Body = sanitizeArticleBodyHtml(newestBody.replace(CURRENT, REPLACEMENT));
    const expectBody = sanitizeArticleBodyHtml(newestBody).replace(CURRENT, REPLACEMENT);
    if (v3Body !== expectBody || sanitizeArticleBodyHtml(v3Body) !== v3Body || v3Body.includes('licensed') || !v3Body.includes(REPLACEMENT)) {
      throw new Error('the Version 3 body is not exactly the newest body with the Track A change (sanitizer interaction)');
    }
    if (sanitizeArticleBodyHtml(newestBody) !== newestBody) {
      console.log('note: the newest version\'s stored body was not sanitizer-stable; Version 3 stores its sanitized form (what Publish would write anyway).');
    }
    const v3Content: Content = { ...nc, body: v3Body };
    if ('v2' in nc && nc.v2 && typeof nc.v2 === 'object') v3Content.v2 = sanitizeArticleV2Content(nc.v2);

    const hashOthers = async () =>
      (await c.query<{ h: string }>(
        `SELECT md5(coalesce(string_agg(id || ':' || md5(content::text) || ':' || label || ':' || page_slug, ',' ORDER BY id), '')) AS h
           FROM page_drafts WHERE page_type = 'article' AND page_slug = ANY($1::text[]) AND label <> $2`,
        [[OLD_SLUG, NEW_SLUG], VERSION_LABEL]
      )).rows[0].h;
    const before = await hashOthers();

    // ── Write: one outer transaction; the app's own createDraft + publishDraft run inside it ──
    await c.query('BEGIN');
    unbind = bindAppPoolToTransaction(appPool, c);
    let step = 'create Version 3';
    try {
      // An editor tab holding an older version must get the normal conflict on Save.
      const bumped = await c.query(
        `UPDATE page_drafts SET version = version + 1 WHERE page_type = 'article' AND page_slug = $1`, [live.slug]
      );
      const draft = await createDraft({
        pageType: 'article',
        pageSlug: live.slug,
        label: VERSION_LABEL,
        content: v3Content,
        createdBy: author.id,
      });
      step = 'publish Version 3';
      const { publishedDraftId } = await publishDraft(draft.id, author.id);
      step = 'verify';

      // ── Verify what this run wrote, before committing ──
      const after = await hashOthers();
      const arts = (await c.query<{ id: number; slug: string; status: string; html: string; v2: unknown; title: string }>(
        `SELECT id, slug, status, body->>'html' AS html, v2, title FROM cms_articles WHERE slug = ANY($1::text[])`, [[OLD_SLUG, NEW_SLUG]]
      )).rows;
      const vers = (await c.query<{ id: number; label: string; is_published: boolean; published_at: Date | null; content: Content }>(
        `SELECT id, label, is_published, published_at, content FROM page_drafts WHERE page_type = 'article' AND page_slug = $1 ORDER BY id`, [live.slug]
      )).rows;
      const v3 = vers.find((v) => v.id === draft.id);
      const tagsAfter = (await c.query<{ slug: string; is_primary: boolean }>(
        `SELECT t.slug, at.is_primary FROM cms_article_terms at JOIN kh_terms t ON t.id = at.term_id WHERE at.article_id = $1`, [live.id]
      )).rows;
      const terms = nc.terms as { primary?: string; secondary?: string[]; locations?: string[] } | undefined;
      const problems: string[] = [];
      if (after !== before) problems.push('an earlier version\'s content changed');
      if (bumped.rowCount !== versions.length) problems.push('not every earlier version was bumped');
      if (arts.length !== 1 || arts[0].slug !== live.slug || arts[0].status !== 'published') problems.push(`live row: ${JSON.stringify(arts.map((a) => [a.id, a.slug, a.status]))}`);
      if (arts[0] && arts[0].html !== v3Body) problems.push('live body ≠ Version 3 body');
      if (arts[0] && arts[0].title !== str(nc.title)) problems.push('live title ≠ newest version title');
      if (arts[0] && 'v2' in nc && canon(sanitizeArticleV2Content(arts[0].v2)) !== canon(v3Content.v2)) problems.push('live v2 ≠ Version 3 v2');
      if (publishedDraftId !== draft.id || !v3 || !v3.is_published || !v3.published_at) problems.push('Version 3 is not the published version');
      if (vers.filter((v) => v.is_published).length !== 1) problems.push(`${vers.filter((v) => v.is_published).length} published versions`);
      if (vers.length !== versions.length + 1) problems.push('version count');
      if (v3) {
        const want = { ...v3Content };
        const got = { ...v3.content };
        if (canon(got) !== canon(want)) problems.push('stored Version 3 content ≠ the newest version + the Track A change');
      }
      if (terms?.primary && !tagsAfter.some((t) => t.is_primary && t.slug === terms.primary)) problems.push('primary tag not written by publish');
      if (terms?.locations && canon([...terms.locations].sort()) !== canon(tagsAfter.filter((t) => !t.is_primary && (terms.locations ?? []).includes(t.slug)).map((t) => t.slug).sort())) {
        problems.push('location tags not written by publish');
      }
      if (problems.length) throw new Error(`post-write verification failed: ${problems.join('; ')}`);

      console.log(`  ~ ${bumped.rowCount} earlier version(s): version + 1 (content unchanged: hash ${before === after ? 'identical' : 'CHANGED'})`);
      console.log(`  + page_drafts "${VERSION_LABEL}" (id ${draft.id}) — newest "${newest.label}" + the Track A change, via createDraft`);
      console.log(`  ~ published via publishDraft(${draft.id}): cms_articles id ${live.id} /${live.slug} status published; "${VERSION_LABEL}" is_published, published_at ${v3?.published_at?.toISOString()}`);
      console.log(`  = tags now: ${tagsAfter.map((t) => t.slug + (t.is_primary ? '*' : '')).sort().join(', ')}`);

      unbind();
      unbind = null;
      if (mode !== 'commit') {
        await c.query('ROLLBACK');
        console.log('\n  (dry run — Version 3 and the publish rolled back)');
        verdict(SCRIPT, 'NOT-APPLIED (dry run)', `would add "${VERSION_LABEL}" to id ${live.id} and publish /knowledge-hub/${live.slug}`);
        return 0;
      }
      await c.query('COMMIT');
      verdict(SCRIPT, 'APPLIED', `"${VERSION_LABEL}" (id ${draft.id}) added and PUBLISHED — /knowledge-hub/${live.slug} is live (id ${live.id})`);
      return 0;
    } catch (err) {
      if (unbind) { unbind(); unbind = null; }
      await c.query('ROLLBACK').catch(() => {});
      const msg = err instanceof Error ? err.message : String(err);
      console.error(err);
      banner([`FAILED at "${step}" — everything this run wrote (Version 3, the version bumps, the publish) was rolled back.`, `error: ${msg}`]);
      // Content state never fails a deploy (Brief 186; brief Track B step 3): exit 0, name the error.
      verdict(SCRIPT, 'FAILED (publish)', `${step}: ${msg} — rolled back, nothing written`);
      return 0;
    }
  } finally {
    if (unbind) unbind();
    c.release();
  }
}

/** Fields of the newest version that differ from what Brief 203 + its review round 1 left. */
async function editsSince203(
  c: PoolClient,
  nc: Content,
  sanitizeBody: (s: string) => string,
  sanitizeV2: (x: unknown) => unknown,
): Promise<string[]> {
  const seed = await import('./seed-brief-199-columbus-older-homes');
  const b203 = await import('./update-brief-203-older-homes-worthington');
  const existing = new Set((await c.query<{ slug: string }>(
    `SELECT slug FROM kh_terms WHERE type = 'location' AND slug = ANY($1::text[])`, [seed.NEIGHBOURHOOD_CANDIDATES]
  )).rows.map((r) => r.slug));
  const locations = [seed.REGION, ...seed.NEIGHBOURHOOD_CANDIDATES.filter((s: string) => existing.has(s))];
  const { content, missing } = b203.buildVersion2(seed.buildSeedContent(seed.RELATED_WANTED, locations));
  if (missing.length) throw new Error(`Brief 203 anchors: ${missing.join('; ')}`);
  // Brief 203 review round 1 removed this paragraph.
  const expected = { ...content, body: content.body.replace('\n<p>Need a plumber in Worthington? Our Columbus team can help.</p>', '') } as unknown as Content;
  const out: string[] = [];
  for (const k of Array.from(new Set([...Object.keys(expected), ...Object.keys(nc)]))) {
    if (k === 'body') {
      const a = sanitizeBody(str(nc.body));
      const b = sanitizeBody(str(expected.body));
      if (a !== b) out.push(`body (${firstDiff(a, b)})`);
    } else if (k === 'v2') {
      const a = sanitizeV2(nc.v2) as Record<string, unknown>;
      const b = sanitizeV2(expected.v2) as Record<string, unknown>;
      for (const f of Array.from(new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})]))) {
        if (canon(a?.[f]) !== canon(b?.[f])) out.push(`v2.${f}`);
      }
    } else if (k === 'related') {
      // The seed drops picks that are not published, so compare as an in-order subset.
      const r = Array.isArray(nc.related) ? (nc.related as string[]) : [];
      let at = 0;
      const subset = r.every((s) => { const i = seed.RELATED_WANTED.indexOf(s, at); if (i < 0) return false; at = i + 1; return true; });
      if (!subset) out.push(`related (${JSON.stringify(nc.related)})`);
    } else if (k === 'terms') {
      const t = (x: unknown) => { const o = (x ?? {}) as Record<string, unknown>; return canon({ ...o, locations: Array.isArray(o.locations) ? [...o.locations].sort() : o.locations }); };
      if (t(nc.terms) !== t(expected.terms)) out.push(`terms (${JSON.stringify(nc.terms)})`);
    } else if (canon(nc[k]) !== canon(expected[k])) {
      out.push(`${k} (${JSON.stringify(nc[k])})`);
    }
  }
  return out;
}

if (require.main === module) {
  main()
    .then((code) => { process.exitCode = code; })
    .catch((err) => {
      console.error(err);
      verdict(SCRIPT, 'FAILED', err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    })
    .finally(async () => {
      const appPool = (await import('../src/lib/db')).default as unknown as { end?: () => Promise<void> };
      await appPool.end?.().catch(() => {});
    });
}
