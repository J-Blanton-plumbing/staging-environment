/**
 * Brief 229 (Marketing review, 2026-11-19) — the Columbus office address in Knowledge Hub articles.
 *
 * Source of truth = the Columbus Google Business Profile: "1387 Goodale Blvd, Columbus, OH 43212" (read on
 * the listing itself, 2026-11-19; also the NAP sheet, Global Settings and every city page). Some published
 * articles still say "1387 W. Goodale Blvd" (`now-serving-columbus-central-ohio`, Brief 191, and the Brief
 * 190 test article). Every PUBLISHED article whose live content says "West Goodale" / "W. Goodale" gets
 * ONE new version — its published version's content with only "West/W. Goodale" → "Goodale" in every
 * string (body, V2 fields, title, excerpt, meta) — and that version is PUBLISHED. Nothing else changes.
 *
 * ── THE APP'S OWN PATHS (the Brief 210 pattern) ─────────────────────────────────────────────────────
 * The version is created by `createDraft` and published by `publishDraft` (src/lib/cms/drafts.ts) — what
 * /admin's "Save as new version" and Status → Published call — so the live row, the is_published pointer,
 * tags/related, the changelog and dateModified are written exactly as an editor's publish writes them.
 * Both run inside ONE outer transaction (bindAppPoolToTransaction): a failed publish or read-back rolls
 * the new version back too. A dry run executes the real publish and rolls it back.
 *
 * ── GUARDS (each writes NOTHING for that article; Brief 186: exit 0) ───────────────────────────────────
 *   • a newer UNPUBLISHED version exists (someone is editing in /admin)    → NOT-APPLIED, fix it there;
 *   • the live row and the published version disagree on what Save Article
 *     writes (body, title, excerpt, image, meta title, meta description)  → NOT-APPLIED (forked state);
 *   • no cms_users row                                                     → NOT-APPLIED.
 * An article that is not published is only REPORTED (it is not public; fix it in /admin before publishing).
 * Once no published article says West/W. Goodale every later deploy reports ALREADY-APPLIED.
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/update-brief-229-columbus-address-articles.ts          # dry run
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/update-brief-229-columbus-address-articles.ts commit   # apply
 */
import { existsSync, readFileSync } from 'fs';
import type { Pool, PoolClient } from 'pg';
import { resolveRunMode, verdict } from './lib/run-mode';

const SCRIPT = 'update-brief-229-columbus-address-articles';
const LABEL = 'Columbus address as on Google (Brief 229 review)';
const WRONG = /\b(?:West|W\.) Goodale\b/g;
const HAS_WRONG = /\b(?:West|W\.) Goodale\b/;
const RIGHT = '1387 Goodale Blvd';
const SAVE_ARTICLE_FIELDS = ['body', 'title', 'excerpt', 'image', 'metaTitle', 'metaDescription'] as const;

const env = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = (env.match(/^DATABASE_URL=(.*)$/m) || [])[1]?.trim() || 'postgresql://postgres:jbp@localhost:5432/jbp_cms';
}

type Content = Record<string, unknown>;
const str = (x: unknown) => (typeof x === 'string' ? x : x == null ? '' : String(x));
const fixAll = <T>(v: T): T => {
  const walk = (x: unknown): unknown =>
    typeof x === 'string'
      ? x.replace(WRONG, 'Goodale')
      : Array.isArray(x)
        ? x.map(walk)
        : x && typeof x === 'object'
          ? Object.fromEntries(Object.entries(x as Record<string, unknown>).map(([k, y]) => [k, walk(y)]))
          : x;
  return walk(v) as T;
};

/** The Brief 210 binding: the app pool's BEGIN/COMMIT/ROLLBACK become savepoints on OUR client. */
function bindAppPoolToTransaction(appPool: Pool, client: PoolClient): () => void {
  let depth = 0;
  const run = (text: unknown, values?: unknown) => (client.query as (t: unknown, v?: unknown) => Promise<unknown>).call(client, text, values);
  const query = async (text: unknown, values?: unknown) => {
    const verb = typeof text === 'string' ? text.trim().toUpperCase() : '';
    if (verb === 'BEGIN') return run(`SAVEPOINT b229a_${++depth}`);
    if (verb === 'COMMIT') {
      if (depth < 1) throw new Error('COMMIT without BEGIN inside the bound transaction');
      return run(`RELEASE SAVEPOINT b229a_${depth--}`);
    }
    if (verb === 'ROLLBACK') {
      if (depth < 1) return { rows: [], rowCount: 0 };
      await run(`ROLLBACK TO SAVEPOINT b229a_${depth}`);
      return run(`RELEASE SAVEPOINT b229a_${depth--}`);
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
    if (had.connect) p.connect = orig.connect;
    else delete p.connect;
    if (had.query) p.query = orig.query;
    else delete p.query;
  };
}

interface LiveRow {
  id: number;
  slug: string;
  status: string;
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
  content: Content | null;
}

async function main(): Promise<number> {
  const mode = resolveRunMode(SCRIPT);
  console.log(`${SCRIPT} — ${mode === 'commit' ? 'COMMIT' : 'DRY RUN (each publish runs, then is rolled back)'}\n`);
  const appPool = (await import('../src/lib/db')).default as unknown as Pool;
  const { sanitizeArticleBodyHtml } = await import('../src/lib/cms/sanitize');
  const { sanitizeArticleV2Content } = await import('../src/lib/cms/article-v2-sanitize');
  const { createDraft, publishDraft } = await import('../src/lib/cms/drafts');

  const c = await appPool.connect();
  let unbind: (() => void) | null = null;
  const lines: string[] = [];
  let applied = 0;
  let blocked = 0;
  try {
    const rows = (
      await c.query<LiveRow>(
        `SELECT id, slug, status, title, excerpt, image, meta_title, meta_description, body->>'html' AS html, v2
           FROM cms_articles
          WHERE concat_ws(' ', body::text, v2::text, title, excerpt, meta_title, meta_description) ~ '(West|W\\.) Goodale'
          ORDER BY slug`
      )
    ).rows;
    const pubVersions = (
      await c.query<{ page_slug: string }>(
        `SELECT page_slug FROM page_drafts WHERE page_type = 'article' AND is_published AND content::text ~ '(West|W\\.) Goodale'`
      )
    ).rows.map((r) => r.page_slug);
    const slugs = [...new Set([...rows.map((r) => r.slug), ...pubVersions])];
    if (slugs.length === 0) {
      verdict(SCRIPT, 'ALREADY-APPLIED', 'no article says West/W. Goodale — nothing written');
      return 0;
    }
    const author = (await c.query<{ id: number }>(`SELECT id FROM cms_users ORDER BY id LIMIT 1`)).rows[0];
    if (!author) {
      verdict(SCRIPT, 'NOT-APPLIED (no CMS user)', 'no cms_users row to attribute the versions to — nothing written');
      return 0;
    }

    for (const slug of slugs) {
      const live = (
        await c.query<LiveRow>(
          `SELECT id, slug, status, title, excerpt, image, meta_title, meta_description, body->>'html' AS html, v2 FROM cms_articles WHERE slug = $1`,
          [slug]
        )
      ).rows[0];
      if (!live) {
        lines.push(`/${slug}: a published version says West/W. Goodale but there is no cms_articles row — left alone`);
        blocked++;
        continue;
      }
      if (live.status !== 'published') {
        lines.push(`/knowledge-hub/${slug}: ${live.status}, not public — REPORTED only (fix it in /admin before publishing)`);
        continue;
      }
      const versions = (
        await c.query<VersionRow>(
          `SELECT id, label, is_published, content FROM page_drafts WHERE page_type = 'article' AND page_slug = $1 ORDER BY created_at DESC, id DESC`,
          [slug]
        )
      ).rows;
      const pub = versions.find((v) => v.is_published);
      const newest = versions[0];
      if (!pub || !pub.content) {
        lines.push(`/knowledge-hub/${slug}: published but has no published version to build from — NOT-APPLIED, fix in /admin`);
        blocked++;
        continue;
      }
      if (newest.id !== pub.id) {
        lines.push(`/knowledge-hub/${slug}: a newer unpublished version ("${newest.label}") exists — NOT-APPLIED, fix the address in /admin (someone is editing it)`);
        blocked++;
        continue;
      }
      const pc = pub.content;
      const liveFields: Record<(typeof SAVE_ARTICLE_FIELDS)[number], string> = {
        body: sanitizeArticleBodyHtml(live.html ?? ''),
        title: str(live.title),
        excerpt: str(live.excerpt),
        image: str(live.image),
        metaTitle: str(live.meta_title),
        metaDescription: str(live.meta_description),
      };
      const forked = SAVE_ARTICLE_FIELDS.filter((k) => (k === 'body' ? sanitizeArticleBodyHtml(str(pc.body)) !== liveFields.body : str(pc[k]) !== liveFields[k]));
      if (forked.length) {
        lines.push(`/knowledge-hub/${slug}: the live row and the published version "${pub.label}" differ in ${forked.join(', ')} — NOT-APPLIED, fix in /admin`);
        blocked++;
        continue;
      }
      const next: Content = fixAll(pc);
      next.body = sanitizeArticleBodyHtml(str(next.body));
      if (next.v2 && typeof next.v2 === 'object') next.v2 = sanitizeArticleV2Content(next.v2);
      const n = (JSON.stringify(pc).match(WRONG) ?? []).length;

      await c.query('BEGIN');
      unbind = bindAppPoolToTransaction(appPool, c);
      try {
        // An editor tab holding an older version gets the normal conflict on Save.
        await c.query(`UPDATE page_drafts SET version = version + 1 WHERE page_type = 'article' AND page_slug = $1`, [slug]);
        const draft = await createDraft({ pageType: 'article', pageSlug: slug, label: LABEL, content: next, createdBy: author.id });
        await publishDraft(draft.id, author.id);
        const after = (
          await c.query<{ status: string; all: string; pubv: string }>(
            `SELECT a.status, concat_ws(' ', a.body::text, a.v2::text, a.title, a.excerpt, a.meta_title, a.meta_description) AS all,
                    (SELECT content::text FROM page_drafts WHERE page_type = 'article' AND page_slug = a.slug AND is_published) AS pubv
               FROM cms_articles a WHERE a.slug = $1`,
            [slug]
          )
        ).rows[0];
        const probs = [
          after?.status !== 'published' && `status ${after?.status}`,
          HAS_WRONG.test(after?.all ?? '') && 'live row still says West/W. Goodale',
          HAS_WRONG.test(after?.pubv ?? '') && 'published version still says West/W. Goodale',
          JSON.stringify(pc).includes('1387') && !(after?.all ?? '').includes(RIGHT) && `live row lacks "${RIGHT}"`,
        ].filter(Boolean);
        if (probs.length) throw new Error(probs.join('; '));
        unbind();
        unbind = null;
        if (mode === 'commit') {
          await c.query('COMMIT');
          applied++;
          lines.push(`/knowledge-hub/${slug}: published "${LABEL}" #${draft.id} (${n} occurrence(s))`);
        } else {
          await c.query('ROLLBACK');
          lines.push(`/knowledge-hub/${slug}: WOULD publish "${LABEL}" (${n} occurrence(s)) — dry run rolled back`);
        }
      } catch (err) {
        if (unbind) {
          unbind();
          unbind = null;
        }
        await c.query('ROLLBACK');
        lines.push(`/knowledge-hub/${slug}: FAILED, rolled back — ${err instanceof Error ? err.message : err}`);
        for (const l of lines) console.log(`  ${l}`);
        verdict(SCRIPT, 'FAILED (publish)', `/knowledge-hub/${slug}: ${err instanceof Error ? err.message : err}`);
        return 0;
      }
    }
    for (const l of lines) console.log(`  ${l}`);
    if (mode !== 'commit') verdict(SCRIPT, 'NOT-APPLIED (dry run)', `${slugs.length} article(s) checked`);
    else if (applied) verdict(SCRIPT, 'APPLIED', `${applied} article(s) republished, ${blocked} left for /admin`);
    else if (blocked) verdict(SCRIPT, 'NOT-APPLIED (guard tripped)', `${blocked} article(s) left for /admin`);
    else verdict(SCRIPT, 'ALREADY-APPLIED', 'no published article says West/W. Goodale');
    return 0;
  } finally {
    if (unbind) unbind();
    c.release();
  }
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((err) => {
    console.error(`\n!!!! ${SCRIPT} crashed:`, err);
    verdict(SCRIPT, 'FAILED', err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  })
  .finally(async () => {
    const appPool = (await import('../src/lib/db')).default as unknown as Pool;
    await appPool.end();
  });
