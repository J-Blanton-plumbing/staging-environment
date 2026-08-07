import Image from 'next/image';
import HeroNav from '@/components/HeroNav';
import { CUSTOMER_STORIES } from '@/lib/content/customer-stories';
import { getMainPageContent } from '@/lib/cms/main-pages';
import { getGlobalSettingsCached } from '@/lib/cms/global-settings';
import { renderCmsInline } from '@/lib/cms/sanitize';
import { getMainPagePreview } from '@/lib/cms/preview';
import PreviewBanner from '@/components/PreviewBanner';
import GoogleReviews from '@/components/GoogleReviews';
import type { Metadata } from 'next';
import './customer-stories.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Customer Stories',
  description:
    'Read real reviews and customer stories from Chicagoland homeowners who trust J. Blanton Plumbing for 5-star plumbing service.',
};

export default async function CustomerStoriesPage() {
  const preview = await getMainPagePreview('customer-stories');
  const db = preview?.content ?? await getMainPageContent('customer-stories').catch(() => null);
  const d = db ?? {};
  const settings = await getGlobalSettingsCached();
  const html = (v: string) => ({ __html: renderCmsInline(v, settings) });
  const m = (dbVal: unknown, fb: string) => (typeof dbVal === 'string' && dbVal) ? dbVal : fb;
  const { hero: _hero, testimonials, reviewUrl, behindTheReview: _btr, involveme, cta: _cta } = CUSTOMER_STORIES;
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
            <div
              className="involveme_popup"
              data-params="source=,campaignname=,utm_campaign=,utm_adgroup=,keyword=,network=,device=,medium=,gclid=,msclkid="
              data-project={involveme.project}
              data-embed-mode={involveme.embedMode}
              data-trigger-event={involveme.triggerEvent}
              data-popup-size={involveme.popupSize}
              data-organization-url={involveme.organizationUrl}
            >
              <p>SCHEDULE A SERVICE</p>
            </div>
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
