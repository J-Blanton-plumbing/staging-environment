import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import HeroNav from '@/components/HeroNav';
import ScheduleTrigger from '@/components/schedule/ScheduleTrigger';
import ArticleHero from '@/components/ArticleHero';
import Breadcrumbs from '@/components/Breadcrumbs';
import ArticleSchema from '@/components/ArticleSchema';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { sanitizeCmsHtml } from '@/lib/cms/sanitize';
import { canonicalUrlFor, normalizePath, pageTitle } from '@/lib/seo';
import { getCanonicalOverridesCached } from '@/lib/cms/canonical-overrides';
import { getArticleTermsDisplay, getRelatedArticles } from '@/lib/cms/kh-taxonomy';
import { articleCrumbs } from '@/lib/cms/kh-crumbs';
import ArticleTermChips, { hasArticleTerms } from '@/components/kh/ArticleTermChips';
import RelatedArticles from '@/components/kh/RelatedArticles';
import TopicServiceLink from '@/components/kh/TopicServiceLink';
import ArticleV2Template from '@/components/kh/ArticleV2Template';
import PreviewBanner from '@/components/PreviewBanner';
import { getArticlePreview } from '@/lib/cms/preview';
import { getGlobalSettingsCached, getRegionalPhonesCached } from '@/lib/cms/global-settings';
import { normalizeArticleTemplate } from '@/lib/cms/article-v2';
import { sanitizeArticleV2Content } from '@/lib/cms/article-v2-sanitize';
import './article.css';

export const dynamic = 'force-dynamic';

/**
 * Brief 159's baseline versions ("Version 1 — live") are stamped with the SEED
 * time, not with when anyone published anything, so they are excluded when the
 * schema derives a CMS-created article's publish dates (Brief 188 Track F2).
 */
const BASELINE_VERSION_LABEL = 'Version 1 — live';

async function getArticleFromDb(slug: string, allowDraft: boolean) {
  const client = await pool.connect();
  try {
    const res = await client.query(
      `SELECT a.id, a.slug, a.title, a.excerpt, a.image, a.body, a.meta_title, a.meta_description, a.status,
              a.wp_post_id, a.created_at,
              -- Brief 190: via to_jsonb so a database the migration has not
              -- reached yet renders every article as V1 instead of erroring.
              to_jsonb(a) -> 'template' AS template, to_jsonb(a) -> 'v2' AS v2,
              (SELECT min(d.published_at) FROM page_drafts d
                WHERE d.page_type = 'article' AND d.page_slug = a.slug
                  AND d.published_at IS NOT NULL AND d.label <> $2) AS first_published_at,
              (SELECT max(d.published_at) FROM page_drafts d
                WHERE d.page_type = 'article' AND d.page_slug = a.slug
                  AND d.published_at IS NOT NULL AND d.label <> $2) AS last_published_at
       FROM cms_articles a WHERE a.slug = $1 ${allowDraft ? '' : "AND a.status = 'published'"} LIMIT 1`,
      [slug, BASELINE_VERSION_LABEL]
    );
    if (!res.rows.length) return null;
    const row = res.rows[0];
    return {
      id: row.id as number,
      slug: row.slug as string,
      title: row.title as string,
      excerpt: (row.excerpt ?? '') as string,
      image: (row.image ?? '') as string,
      body: (row.body?.html ?? '') as string,
      metaTitle: (row.meta_title ?? '') as string,
      metaDescription: (row.meta_description ?? '') as string,
      status: row.status as string,
      wpPostId: (row.wp_post_id ?? null) as number | null,
      createdAt: row.created_at ? new Date(row.created_at) : null,
      firstPublishedAt: row.first_published_at ? new Date(row.first_published_at) : null,
      lastPublishedAt: row.last_published_at ? new Date(row.last_published_at) : null,
      /** Brief 190: raw stored values — normalized / sanitized where they are used. */
      template: (row.template ?? null) as unknown,
      v2: (row.v2 ?? null) as unknown,
    };
  } finally {
    client.release();
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleFromDb(slug, false);
  if (!article) return {};
  return {
    // The root layout's title template appends the brand — so neither the stored
    // meta title nor the fallback may carry it (the fallback used to hardcode
    // " - J. Blanton Plumbing", doubling it on all 812 articles).
    title: pageTitle(article.metaTitle) || article.title,
    description: article.metaDescription || article.excerpt,
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getSession();
  const allowDraft = !!session;
  const article = await getArticleFromDb(slug, allowDraft);
  if (!article) notFound();
  // Draft articles are only accessible to logged-in CMS users
  if (article.status === 'draft' && !session) notFound();
  const isDraftPreview = article.status === 'draft';

  // Brief 190: an editor's Preview shows THAT version's content (session-gated;
  // null for every public visitor, who always gets the live row). Only the keys
  // the version carries are overlaid — a pre-190 version keeps the live template.
  const preview = session ? await getArticlePreview(article.slug) : null;
  if (preview) {
    const c = preview.content;
    const str = (k: string) => (typeof c[k] === 'string' ? (c[k] as string) : undefined);
    article.title = str('title') ?? article.title;
    article.excerpt = str('excerpt') ?? article.excerpt;
    article.body = str('body') ?? article.body;
    article.image = str('image') ?? article.image;
    article.metaDescription = str('metaDescription') ?? article.metaDescription;
    if ('template' in c) article.template = c.template;
    if ('v2' in c) article.v2 = c.v2;
  }
  // Brief 187 (C2): the article's live Topic/Location tags. Never throws — a
  // failure (or a database without the taxonomy tables) renders no chips.
  // Brief 188 (B1): the related cards, one query; also never throws, and it
  // renders for a logged-in draft preview too, so editors see it.
  const [terms, related] = await Promise.all([
    getArticleTermsDisplay(article.id),
    getRelatedArticles(article.id),
  ]);

  // Brief 188 (Track D): Home › Knowledge Hub › {Primary Topic} › {Article}.
  const path = `/knowledge-hub/${article.slug}`;
  const crumbs = articleCrumbs(article, terms.primary);

  // Brief 188 (Track F1): the schema's url is the page's own canonical — the
  // same override-or-self rule the root layout uses for <link rel="canonical">.
  const overrides = await getCanonicalOverridesCached();
  const canonical = overrides.get(normalizePath(path)) ?? canonicalUrlFor(path);

  const previewBanner = preview ? (
    <PreviewBanner
      label={preview.meta.label}
      creatorName={preview.meta.creator_name}
      editorUrl={`/admin/articles/${article.slug}`}
      liveUrl={path}
      draftId={preview.meta.id}
      pageType="article"
      pageSlug={article.slug}
    />
  ) : null;

  // Brief 190 (Track B): the template dispatch. Only 'article-v2' renders V2 —
  // an absent, blank or unknown value renders V1 below, never a 500.
  if (normalizeArticleTemplate(article.template) === 'article-v2') {
    // Brief 192: the regional phones are read only here, for V2 — never by V1.
    const [settings, regionalPhones] = await Promise.all([getGlobalSettingsCached(), getRegionalPhonesCached()]);
    return (
      <>
        {previewBanner ?? (isDraftPreview && <DraftBanner slug={slug} />)}
        {/* ── SCHEMA (Brief 188 F1) — the same one BlogPosting as V1; no FAQPage (Brief 167) ── */}
        <ArticleSchema
          title={article.title}
          metaDescription={article.metaDescription}
          excerpt={article.excerpt}
          image={article.image}
          canonical={canonical}
          wpPostId={article.wpPostId}
          createdAt={article.createdAt}
          firstPublishedAt={article.firstPublishedAt}
          lastPublishedAt={article.lastPublishedAt}
        />
        <ArticleV2Template
          article={{ slug: article.slug, title: article.title, image: article.image, body: article.body }}
          v2={sanitizeArticleV2Content(article.v2)}
          terms={terms}
          related={related}
          crumbs={crumbs}
          settings={settings}
          regionalPhones={regionalPhones}
        />
      </>
    );
  }

  return (
    <div className="article-page">
      {/* Brief 190: the preview banner shares the draft banner's ONE slot, so a
          public render is exactly `false` here, as before (an extra sibling would
          add a node to the RSC payload — the Brief 187 lesson). */}
      {previewBanner ?? (isDraftPreview && (
        <div style={{
          background: '#0A1B2E', color: '#F9F3EC', padding: '0.6rem 1.5rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontFamily: 'Nunito, sans-serif', fontSize: '13px', fontWeight: 600, gap: '1rem',
          position: 'sticky', top: 0, zIndex: 100,
        }}>
          <span>⚠ Draft preview — this article is not published.</span>
          <a href={`/admin/articles/${slug}`} style={{ color: '#BC0E0E', textDecoration: 'none', fontWeight: 700 }}>
            ← Back to editor
          </a>
        </div>
      ))}
      {/* ── SCHEMA (Brief 188 F1) — one BlogPosting per article ── */}
      <ArticleSchema
        title={article.title}
        metaDescription={article.metaDescription}
        excerpt={article.excerpt}
        image={article.image}
        canonical={canonical}
        wpPostId={article.wpPostId}
        createdAt={article.createdAt}
        firstPublishedAt={article.firstPublishedAt}
        lastPublishedAt={article.lastPublishedAt}
      />

      {/* ── HERO ── */}
      <ArticleHero
        heading={article.title}
        image={article.image || undefined}
      />

      {/* ── HERO NAV ── */}
      <HeroNav />

      {/* ── BREADCRUMBS (Brief 188 D) — visible trail + the page's one BreadcrumbList ── */}
      <div className="article-crumbs">
        <Breadcrumbs items={crumbs} />
      </div>

      {/* ── TAGS (Brief 187 C2) — renders nothing when the article has none ── */}
      {hasArticleTerms(terms) && <ArticleTermChips terms={terms} />}

      {/* ── ARTICLE BODY ── */}
      <div className="article-page-content">
        {article.body ? (
          <div
            className="article-content"
            dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(article.body) }}
          />
        ) : null}
      </div>

      {/* ── RELATED ARTICLES (Brief 188 B1) ── */}
      <RelatedArticles articles={related} />

      {/* ── SERVICE LINK for the primary topic (Brief 188 E) ── */}
      <TopicServiceLink href={terms.primary?.serviceHref} text={terms.primary?.serviceCtaText} />

      {/* ── CLOSING CTA ── */}
      <div className="article-footer-cta">
        <h2>NEED AN EXPERT?</h2>
        <h3>MAKE A GOOD CALL.</h3>
        <p>We&rsquo;re here to help with all your plumbing needs</p>
        {/* Brief 169: first-party schedule popup. Styled by
            `.article-page .article-footer-cta .schedule-popup` in article.css. */}
        <ScheduleTrigger label={<p>SCHEDULE NOW</p>} />
      </div>
    </div>
  );
}

/**
 * Brief 190 — V1's inline draft banner, as a component for the V2 branch. V1
 * keeps its own inline copy untouched (hard rule 1: identical V1 output).
 */
function DraftBanner({ slug }: { slug: string }) {
  return (
    <div style={{
      background: '#0A1B2E', color: '#F9F3EC', padding: '0.6rem 1.5rem',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      fontFamily: 'Nunito, sans-serif', fontSize: '13px', fontWeight: 600, gap: '1rem',
      position: 'sticky', top: 0, zIndex: 100,
    }}>
      <span>⚠ Draft preview — this article is not published.</span>
      <a href={`/admin/articles/${slug}`} style={{ color: '#BC0E0E', textDecoration: 'none', fontWeight: 700 }}>
        ← Back to editor
      </a>
    </div>
  );
}
