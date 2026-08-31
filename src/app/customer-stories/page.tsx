import { notFound } from 'next/navigation';
import Image from 'next/image';
import HeroNav from '@/components/HeroNav';
import ScheduleTrigger from '@/components/schedule/ScheduleTrigger';
import { CUSTOMER_STORIES } from '@/lib/content/customer-stories';
import { getMainPageContent } from '@/lib/cms/main-pages';
import { getGlobalSettingsCached } from '@/lib/cms/global-settings';
import { renderCmsInline } from '@/lib/cms/sanitize';
import { getMainPagePreview } from '@/lib/cms/preview';
import { isPageLive } from '@/lib/cms/page-status';
import PreviewBanner from '@/components/PreviewBanner';
import GoogleReviews from '@/components/GoogleReviews';
import type { Metadata } from 'next';
import { getMainPageMeta } from '@/lib/cms/page-meta';
import './customer-stories.css';

export const dynamic = 'force-dynamic';

/**
 * Brief 149 (Track C) — the `main_pages.meta_title` / `meta_description`
 * fields were editable in the admin and read by nothing: this page's <title>
 * came from the literal below. They now drive the page, with the literal kept
 * as the fallback for a blank field. `getMainPageMeta` normalizes the brand
 * suffix so the root layout's title template appends it exactly once, whatever
 * an editor types.
 */
const STATIC_META = {
  title: 'Customer Stories',
  description:
    'Read real reviews and customer stories from Chicagoland homeowners who trust J. Blanton Plumbing for 5-star plumbing service.',
};

export async function generateMetadata(): Promise<Metadata> {
  const meta = await getMainPageMeta('customer-stories', STATIC_META);
  return { title: meta.title, description: meta.description };
}

export default async function CustomerStoriesPage() {
  const preview = await getMainPagePreview('customer-stories');

  /*
   * Brief 159 (Track D / E1) — the render gate.
   *
   * A page is live if and only if one of its versions is Published; the live
   * row's derived `status` column mirrors that, so this is ONE indexed column
   * read and never a join to `page_drafts`. `notFound()` rather than a 200 with
   * `noindex`: a 200 keeps the URL in the crawl set and contradicts the sitemap
   * removal that accompanies it. The session-gated preview cookie wins, so an
   * editor can still see an unpublished page; `isPageLive` fails OPEN on a
   * database error.
   */
  if (!preview && !(await isPageLive('main', 'customer-stories'))) notFound();
  const db = preview?.content ?? await getMainPageContent('customer-stories').catch(() => null);
  const d = db ?? {};
  const settings = await getGlobalSettingsCached();
  const html = (v: string) => ({ __html: renderCmsInline(v, settings) });
  const m = (dbVal: unknown, fb: string) => (typeof dbVal === 'string' && dbVal) ? dbVal : fb;
  const { hero: _hero, testimonials, reviewUrl, behindTheReview: _btr, cta: _cta } = CUSTOMER_STORIES;
  const hero = { ..._hero, heading: m(d.hero_heading, _hero.heading), description: m(d.hero_description, _hero.description) };
  const behindTheReview = { ..._btr, heading: m(d.behind_review_heading, _btr.heading) };
  const cta = { ..._cta, heading: m(d.cta_heading, _cta.heading), body: m(d.cta_body, _cta.body) };

  return (
    <div className="customer-stories-page">
      {preview && <PreviewBanner label={preview.meta.label} creatorName={preview.meta.creator_name} editorUrl="/admin/customer-stories" liveUrl="/customer-stories" draftId={preview.meta.id} pageType="main" pageSlug="customer-stories" />}
      {/* ================================================================
          HERO — standard .hero pattern (image left, text right)
          ================================================================ */}
      <div className="hero">
        <div className="img-s">
          <Image
            src={hero.heroImage}
            alt="Customer Stories Hero"
            fill
            sizes="45vw"
            priority
            style={{ objectFit: 'cover' }}
          />
        </div>
        {/* hero-contents avoids Tailwind's .contents { display:contents } collision */}
        <div className="hero-contents">
          <div className="w">
            <h1>{hero.heading}</h1>
            <p className="sub-label"></p>
            <p className="hero-desc" dangerouslySetInnerHTML={html(hero.description)} />
            {/* Brief 169: first-party schedule popup. Styled by
                `.customer-stories-page … .schedule-popup` in customer-stories.css. */}
            <ScheduleTrigger label={<p>SCHEDULE A SERVICE</p>} />
          </div>
        </div>
      </div>

      {/* ================================================================
          HERO NAV
          ================================================================ */}
      <HeroNav />

      {/* ================================================================
          TESTIMONIALS GRID
          ================================================================ */}
      <div className="testimonials-grid">
        <div className="testimonials-container">
          {testimonials.map((t) => (
            <a
              key={t.name}
              href={reviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="testimonial-card"
            >
              <Image
                src={t.image}
                alt="Customer"
                width={270}
                height={270}
              />
              <div className="testimonial-card-content">
                <p className="testimonial-name">{t.name}</p>
                <p className="testimonial-stars">★★★★★</p>
                <p className="testimonial-text">{t.body}</p>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* ================================================================
          BEHIND THE REVIEW — YouTube embed
          ================================================================ */}
      <div className="behind-the-review-section">
        <div className="behind-the-review-container">
          <h2 className="behind-the-review-title">{behindTheReview.heading}</h2>
          <div className="video-container">
            <iframe
              src={behindTheReview.videoSrc}
              title={behindTheReview.videoTitle}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </div>
      </div>

      {/* ================================================================
          ELFSIGHT GOOGLE REVIEWS WIDGET
          ================================================================ */}
      <div className="google-reviews-section">
        <div className="google-reviews-container">
          {/* Elfsight widget — shows "something went wrong" on localhost (origin-restricted) */}
          <GoogleReviews widgetId="266c99c1-530c-4f93-8046-bab90e4a05e5" />
          <div className="google-reviews-header">
            <a
              href={cta.googleHref}
              className="google-reviews-button"
              target="_blank"
              rel="noopener noreferrer"
            >
              {cta.googleButtonLabel}
            </a>
          </div>
        </div>
      </div>

      {/* ================================================================
          CALL TO ACTION
          ================================================================ */}
      <div className="call-to-action-section">
        <div className="call-to-action-container">
          <h2>{cta.heading}</h2>
          <p dangerouslySetInnerHTML={html(cta.body)} />
          {/* Brief 95 (B.1): Global Settings is the single source for the phone
              number — do not re-hard-code it here. */}
          <a href={settings.phoneHref} className="call-to-action-button">
            <span className="phone-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                <path fill="currentColor" d="M20 15.5c-1.2 0-2.5-.2-3.6-.6h-.3c-.3 0-.5.1-.7.3l-2.2 2.2c-2.8-1.5-5.2-3.8-6.6-6.6l2.2-2.2c.3-.3.4-.7.2-1c-.3-1.1-.5-2.4-.5-3.6c0-.5-.5-1-1-1H4c-.5 0-1 .5-1 1c0 9.4 7.6 17 17 17c.5 0 1-.5 1-1v-3.5c0-.5-.5-1-1-1" />
              </svg>
            </span>
            <span>Call Now: {settings.phoneDisplay}</span>
          </a>
        </div>
      </div>
    </div>
  );
}
