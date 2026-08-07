import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import HeroNav from '@/components/HeroNav';
import ArticleHero from '@/components/ArticleHero';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { sanitizeCmsHtml } from '@/lib/cms/sanitize';
import { pageTitle } from '@/lib/seo';
import './article.css';

export const dynamic = 'force-dynamic';

async function getArticleFromDb(slug: string, allowDraft: boolean) {
  const client = await pool.connect();
  try {
    const res = await client.query(
      `SELECT slug, title, excerpt, image, body, meta_title, meta_description, status
       FROM cms_articles WHERE slug = $1 ${allowDraft ? '' : "AND status = 'published'"} LIMIT 1`,
      [slug]
    );
    if (!res.rows.length) return null;
    const row = res.rows[0];
    return {
      slug: row.slug as string,
      title: row.title as string,
      excerpt: (row.excerpt ?? '') as string,
      image: (row.image ?? '') as string,
      body: (row.body?.html ?? '') as string,
      metaTitle: (row.meta_title ?? '') as string,
      metaDescription: (row.meta_description ?? '') as string,
      status: row.status as string,
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

  return (
    <div className="article-page">
      {isDraftPreview && (
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
      )}
      {/* ── HERO ── */}
      <ArticleHero
        heading={article.title}
        image={article.image || undefined}
      />

      {/* ── HERO NAV ── */}
      <HeroNav />

      {/* ── ARTICLE BODY ── */}
      <div className="article-page-content">
        {article.body ? (
          <div
            className="article-content"
            dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(article.body) }}
          />
        ) : null}
      </div>

      {/* ── CLOSING CTA ── */}
      <div className="article-footer-cta">
        <h2>NEED AN EXPERT?</h2>
        <h3>MAKE A GOOD CALL.</h3>
        <p>We&rsquo;re here to help with all your plumbing needs</p>
        <div
          className="involveme_popup"
          role="button"
          tabIndex={0}
          data-project="schedule-service-new"
          data-embed-mode="popup"
          data-trigger-event="button"
          data-popup-size="medium"
          data-organization-url="https://jblantonplumbing.involve.me"
        >
          <p>SCHEDULE NOW</p>
        </div>
      </div>
    </div>
  );
}
