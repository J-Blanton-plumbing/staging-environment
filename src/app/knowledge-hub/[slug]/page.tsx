import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import HeroNav from '@/components/HeroNav';
import { getArticle, articles } from '@/lib/articles';
import './article.css';

export async function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.subtitle || article.title,
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  return (
    <div className="article-page">
      {/* ── HERO ── */}
      <div className="article-page-hero">
        {article.heroImage ? (
          <img
            className="article-page-image"
            src={article.heroImage}
            alt={article.title}
          />
        ) : (
          <div className="hero-placeholder" aria-hidden="true" />
        )}

        {/* hero-contents avoids the Tailwind .contents { display: contents } collision */}
        <div className="hero-contents">
          {/* Wrench pattern decoration */}
          <img
            className="pattern"
            src="/images/wrench_pattern.webp"
            alt=""
            aria-hidden="true"
          />
          <div className="w">
            <h1>{article.title}</h1>
            {article.subtitle && (
              <p className="tagline">{article.subtitle}</p>
            )}
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
      </div>

      {/* ── HERO NAV ── */}
      <HeroNav />

      {/* ── ARTICLE BODY ── */}
      <div className="article-page-content">
        <h1>{article.title}</h1>
        {article.body ? (
          <div
            className="article-content"
            dangerouslySetInnerHTML={{ __html: article.body }}
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
