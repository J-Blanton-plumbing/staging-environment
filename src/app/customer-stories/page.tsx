import Image from 'next/image';
import Link from 'next/link';
import HeroNav from '@/components/HeroNav';
import { CUSTOMER_STORIES } from '@/lib/content/customer-stories';
import type { Metadata } from 'next';
import './customer-stories.css';

export const metadata: Metadata = {
  title: 'Customer Stories | J. Blanton Plumbing',
  description:
    'Read real reviews and customer stories from Chicagoland homeowners who trust J. Blanton Plumbing for 5-star plumbing service.',
};

export default function CustomerStoriesPage() {
  const { hero, testimonials, behindTheReview, elfsightWidgetId, involveme, cta } = CUSTOMER_STORIES;

  return (
    <div className="customer-stories-page">
      {/* ================================================================
          HERO
          ================================================================ */}
      <div className="cs-hero">
        {/* hero-contents avoids Tailwind's .contents { display:contents } collision */}
        <div className="cs-hero-contents">
          <h1>{hero.heading}</h1>
          <p>{hero.subheading}</p>
        </div>
        <Image
          src={hero.patternImage}
          alt=""
          fill
          sizes="100vw"
          priority
          style={{ objectFit: 'cover', opacity: 0.08 }}
        />
      </div>

      {/* ================================================================
          HERO NAV
          ================================================================ */}
      <HeroNav />

      {/* ================================================================
          TESTIMONIALS GRID
          ================================================================ */}
      <section className="testimonials-grid">
        <div className="testimonials-container">
          {testimonials.map((t) => (
            <div key={t.name} className="testimonial-card">
              <Image
                src={t.image}
                alt={t.imageAlt}
                width={270}
                height={270}
              />
              <div className="testimonial-card-content">
                <p className="testimonial-name">{t.name}</p>
                <p className="testimonial-stars">
                  {'★'.repeat(t.stars)}
                </p>
                <p className="testimonial-text">{t.body}</p>
                <p style={{ color: '#0A1B2E', opacity: 0.6, fontSize: '0.9rem', marginTop: '8px' }}>
                  {t.location}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================================================================
          BEHIND THE REVIEW — YouTube embed
          ================================================================ */}
      <section className="behind-the-review-section">
        <div className="behind-the-review-container">
          <h2 className="behind-the-review-title">{behindTheReview.heading}</h2>
          <div className="video-container">
            <iframe
              src={behindTheReview.videoSrc}
              title={behindTheReview.videoTitle}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      </section>

      {/* ================================================================
          ELFSIGHT GOOGLE REVIEWS WIDGET
          ================================================================ */}
      <section className="google-reviews-section">
        <div className="google-reviews-container">
          <div className="google-reviews-header">
            <h2>WHAT OUR CUSTOMERS ARE SAYING</h2>
          </div>
          {/* Elfsight widget — shows "something went wrong" on localhost (origin-restricted) */}
          <div
            className="elfsight-app-266c99c1-530c-4f93-8046-bab90e4a05e5"
            data-elfsight-app-lazy
          />
          <Link
            href={cta.googleHref}
            className="google-reviews-button"
            target="_blank"
            rel="noopener noreferrer"
          >
            {cta.googleButtonLabel}
          </Link>
        </div>
      </section>

      {/* ================================================================
          CALL TO ACTION
          ================================================================ */}
      <section className="call-to-action-section">
        <div className="call-to-action-container">
          <h2>{cta.heading}</h2>
          <p>{cta.body}</p>
          <div
            className="involveme_popup call-to-action-button"
            role="button"
            tabIndex={0}
            data-project={involveme.project}
            data-embed-mode={involveme.embedMode}
            data-trigger-event={involveme.triggerEvent}
            data-popup-size={involveme.popupSize}
            data-organization-url={involveme.organizationUrl}
          >
            <span className="phone-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.77a16 16 0 0 0 5.32 5.32l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.04z" />
              </svg>
            </span>
            {cta.buttonLabel}
          </div>
        </div>
      </section>
    </div>
  );
}
