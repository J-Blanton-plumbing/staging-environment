import Image from 'next/image';
import Link from 'next/link';
import HeroNav from '@/components/HeroNav';
import { KNOWLEDGE_HUB } from '@/lib/content/knowledge-hub';
import type { Metadata } from 'next';
import ArticlesSection from './ArticlesSection';
import FaqSection from './FaqSection';
import './knowledge-hub.css';

export const metadata: Metadata = {
  title: 'Knowledge Hub',
  description:
    "Plumbing tips, FAQs, and helpful articles from J. Blanton Plumbing's team of Chicagoland experts.",
};

export default function KnowledgeHubPage() {
  const { hero, intro, reviewsWidgetClass } = KNOWLEDGE_HUB;

  return (
    <div className="kh-page">
      {/* HERO */}
      <div className="hero">
        <div className="img-s">
          <Image
            src={hero.image}
            alt="Knowledge Hub hero"
            fill
            sizes="45vw"
            priority
            style={{ objectFit: 'cover' }}
          />
        </div>
        {/* hero-contents avoids the Tailwind .contents { display: contents } collision */}
        <div className="hero-contents">
          <div className="w">
            <h1>{hero.heading}</h1>
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
              <p>SCHEDULE A SERVICE</p>
            </div>
          </div>
        </div>
      </div>

      {/* HERO NAV */}
      <HeroNav />

      {/* CREAM BLOCK */}
      <div className="cream">
        <div className="kh">
          {/* Intro row: label / body / VIEW SERVICES */}
          <div className="align1">
            <p className="red-text">{intro.label}</p>
            <div>
              <p>{intro.body}</p>
              <Link className="link-button" href={intro.ctaHref}>
                {intro.cta}
              </Link>
            </div>
          </div>

          {/* Paginated articles grid */}
          <ArticlesSection />

          {/* FAQ accordion */}
          <FaqSection />

          {/* Elfsight Google Reviews widget */}
          <div className="kh-gr">
            <div className={reviewsWidgetClass} data-elfsight-app-lazy />
          </div>
        </div>
      </div>
    </div>
  );
}
