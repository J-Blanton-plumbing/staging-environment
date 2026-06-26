import Image from 'next/image';
import Link from 'next/link';
import HeroNav from '@/components/HeroNav';
import { KNOWLEDGE_HUB } from '@/lib/content/knowledge-hub';
import { getMainPageContent } from '@/lib/cms/main-pages';
import { getMainPagePreview } from '@/lib/cms/preview';
import PreviewBanner from '@/components/PreviewBanner';
import type { Metadata } from 'next';
import ArticlesSection from './ArticlesSection';
import FaqSection from './FaqSection';
import './knowledge-hub.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Knowledge Hub',
  description:
    "Plumbing tips, FAQs, and helpful articles from J. Blanton Plumbing's team of Chicagoland experts.",
};

export default async function KnowledgeHubPage() {
  const preview = await getMainPagePreview('knowledge-hub');
  const db = preview?.content ?? await getMainPageContent('knowledge-hub').catch(() => null);
  const d = db ?? {};
  const m = (dbVal: unknown, fb: string) => (typeof dbVal === 'string' && dbVal) ? dbVal : fb;
  const { hero: _hero, intro: _intro, reviewsWidgetClass } = KNOWLEDGE_HUB;
  const hero = { ..._hero, heading: m(d.hero_heading, _hero.heading) };
  const intro = { ..._intro, label: m(d.intro_label, _intro.label), body: m(d.intro_body, _intro.body), cta: m(d.intro_cta, _intro.cta) };

  return (
    <div className="kh-page">
      {preview && <PreviewBanner label={preview.meta.label} creatorName={preview.meta.creator_name} editorUrl="/admin/knowledge-hub" liveUrl="/knowledge-hub" draftId={preview.meta.id} pageType="main" pageSlug="knowledge-hub" />}
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
