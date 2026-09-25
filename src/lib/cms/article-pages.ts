import pool from '@/lib/db';
import { sanitizeCmsHtml } from '@/lib/cms/sanitize';
import { NotFoundError } from '@/lib/cms/errors';
import { clearKhTaxonomyCache, writeArticleRelated, writeArticleTerms } from '@/lib/cms/kh-taxonomy';
import { normalizeRelatedSelection, normalizeTermSelection } from '@/lib/cms/kh-taxonomy-types';
import { isArticleV2Object, parseArticleTemplate } from '@/lib/cms/article-v2';
import { sanitizeArticleV2Content } from '@/lib/cms/article-v2-sanitize';

/**
 * Brief 159 — the publish writer for Knowledge Hub articles.
 *
 * WHY IT DID NOT EXIST BEFORE. `/admin/articles/[slug]` has used
 * `useDraftVersions('article', slug, …)` since Brief 85, so editors could create
 * article versions — but `publishDraft`'s writer map had no `article` key, so
 * pressing Publish on one threw `No writer for page_type "article"` and 500'd.
 * Nothing surfaced it because the Status row on that editor wrote
 * `cms_articles.status` through a separate PATCH, so publishing "worked" by a
 * different route entirely. Brief 159 collapses status onto the version model,
 * which makes this the route articles actually take — so it has to exist.
 *
 * WHAT IT DELIBERATELY DOES NOT WRITE: `status`. That column is the DERIVED
 * render gate (Track A2) with exactly one writer, `setLiveStatusInTx`, called
 * from the publish/unpublish transaction. A content writer that also set status
 * would be the second door this brief closed.
 *
 * `cms_articles` has no `version` column, so there is no optimistic-lock token to
 * check here and `getLivePageState` returns null for this page type — the DP-2
 * staleness guard stays skipped for articles exactly as it always has (noted as
 * an open item in the Brief 78 report).
 */
export interface ArticleCmsPayload {
  title?: string;
  excerpt?: string;
  body?: string;
  image?: string;
  /**
   * Legacy (pre-Brief 187) versions still carry this key. It is IGNORED:
   * Brief 187 stopped reading and writing `cms_articles.category`, which is left
   * in the schema untouched until Marketing decides its removal.
   */
  categories?: string[];
  /**
   * Brief 187 — the article's Topic + Location tags, as slugs. Stored in the
   * version's content like every other field, so tags follow draft → publish:
   * nothing reaches `cms_article_terms` until THIS writer runs on Publish.
   * ABSENT (a version saved before Brief 187) leaves the live tags alone; an
   * explicit empty selection clears them.
   */
  terms?: unknown;
  /**
   * Brief 188 (Track B2) — hand-picked related articles, as slugs in order (≤3).
   * Same contract as `terms`: travels in the VERSION content and is written to
   * `cms_article_related` only here, on Publish. ABSENT (every version saved
   * before Brief 188) leaves the live picks alone; an explicit [] clears them.
   */
  related?: unknown;
  /**
   * Brief 190 — which template renders ('article' = V1, 'article-v2' = V2). Same
   * contract as `terms`: travels in the VERSION content and reaches
   * `cms_articles.template` only here, on Publish. ABSENT (every version saved
   * before Brief 190) or unrecognised leaves the live template alone.
   */
  template?: unknown;
  /**
   * Brief 190 — the Article V2 fields (subtitle, byline, hero alt/caption, key
   * takeaways, office, service-area list, FAQ). Sanitized here by declared type
   * (article-v2-sanitize.ts) — a stored version is never trusted. ABSENT leaves
   * the live `cms_articles.v2` alone.
   */
  v2?: unknown;
  metaTitle?: string | null;
  metaDescription?: string | null;
}

export async function updateArticleCmsContent(
  slug: string,
  payload: ArticleCmsPayload,
  updatedBy: number
): Promise<void> {
  const terms = normalizeTermSelection(payload.terms);
  const related = normalizeRelatedSelection(payload.related, slug);
  const template = parseArticleTemplate(payload.template);
  const v2 = isArticleV2Object(payload.v2) ? sanitizeArticleV2Content(payload.v2) : null;
  if (payload.template !== undefined && !template) {
    // Content state never fails a publish (Brief 186): report and leave it.
    console.warn(`[article publish] ${slug}: ignored unknown template ${JSON.stringify(payload.template)}`);
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const res = await client.query<{ id: number }>(
      `UPDATE cms_articles SET
         title            = COALESCE($1, title),
         excerpt          = COALESCE($2, excerpt),
         body             = COALESCE($3, body),
         image            = COALESCE($4, image),
         meta_title       = $5,
         meta_description = $6,
         updated_by       = $7,
         updated_at       = NOW()
       WHERE slug = $8
       RETURNING id`,
      [
        payload.title ?? null,
        payload.excerpt ?? null,
        // Body is stored as `{ html }` JSON and sanitized on every write path — a
        // draft's stored body has not been through the sanitizer, so it goes
        // through it here rather than being trusted because it came from the CMS.
        payload.body != null ? JSON.stringify({ html: sanitizeCmsHtml(payload.body) }) : null,
        payload.image ?? null,
        payload.metaTitle ?? null,
        payload.metaDescription ?? null,
        updatedBy,
        slug,
      ]
    );
    if ((res.rowCount ?? 0) === 0) throw new NotFoundError(`Article "${slug}" not found`);
    if (template || v2) {
      // Same transaction as the body, so a publish can never land a V2 template
      // without its fields (or the other way round). COALESCE = "absent → keep".
      await client.query(
        `UPDATE cms_articles SET template = COALESCE($1, template), v2 = COALESCE($2::jsonb, v2) WHERE id = $3`,
        [template, v2 ? JSON.stringify(v2) : null, res.rows[0].id]
      );
    }
    if (terms) {
      // Same transaction as the content: a publish can never land the body
      // without its tags, or the tags without the body. Unknown slugs (a term
      // renamed or a location de-registered since the version was saved) are
      // dropped and logged — content state must not fail a publish.
      const { unknown } = await writeArticleTerms(client, res.rows[0].id, terms);
      if (unknown.length) console.warn(`[article publish] ${slug}: ignored unknown term(s) ${unknown.join(', ')}`);
    }
    if (related) {
      // Same transaction again. A pick that no longer exists is dropped and
      // logged — content state must not fail a publish.
      const { unknown } = await writeArticleRelated(client, res.rows[0].id, related);
      if (unknown.length) console.warn(`[article publish] ${slug}: ignored related article(s) ${unknown.join(', ')}`);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
  clearKhTaxonomyCache();
}
