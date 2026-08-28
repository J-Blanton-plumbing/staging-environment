import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import HeroNav from '@/components/HeroNav';
import { KNOWLEDGE_HUB } from '@/lib/content/knowledge-hub';
import { getMainPageContent } from '@/lib/cms/main-pages';
import { getGlobalSettingsCached } from '@/lib/cms/global-settings';
import { renderCmsInline } from '@/lib/cms/sanitize';
import { getMainPagePreview } from '@/lib/cms/preview';
import { isPageLive } from '@/lib/cms/page-status';
import PreviewBanner from '@/components/PreviewBanner';
import GoogleReviews from '@/components/GoogleReviews';
import type { Metadata } from 'next';
import { getMainPageMeta } from '@/lib/cms/page-meta';
import ArticlesSection from './ArticlesSection';
import FaqSection from './FaqSection';
import './knowledge-hub.css';

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
  title: 'Knowledge Hub',
  description:
    "Plumbing tips, FAQs, and helpful articles from J. Blanton Plumbing's team of Chicagoland experts.",
};

export async function generateMetadata(): Promise<Metadata> {
  const meta = await getMainPageMeta('knowledge-hub', STATIC_META);
  return { title: meta.title, description: meta.description };
}

export default async function KnowledgeHubPage() {
  const preview = await getMainPagePreview('knowledge-hub');

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
  if (!preview && !(await isPageLive('main', 'knowledge-hub'))) notFound();
  const db = preview?.content ?? await getMainPageContent('knowledge-hub').catch(() => null);
  const d = db ?? {};
  const settings = await getGlobalSettingsCached();
  const html = (v: string) => ({ __html: renderCmsInline(v, settings) });
  const m = (dbVal: unknown, fb: string) => (typeof dbVal === 'string' && dbVal) ? dbVal : fb;
  const { hero: _hero, intro: _intro, faqs: _faqs, reviewsWidgetId } = KNOWLEDGE_HUB;
  const hero = { ..._hero, heading: m(d.hero_heading, _hero.heading) };
  const intro = { ..._intro, label: m(d.intro_label, _intro.label), body: m(d.intro_body, _intro.body), cta: m(d.intro_cta, _intro.cta) };
  // Brief 95 (A.1): faqs_label/faqs_body were saved but never rendered — wire
  // them, plus the new `faqs` JSONB repeater, falling back to the static file.
  const rawFaqItems = (d as unknown as Record<string, unknown>).faqs;
  const faqItems = Array.isArray(rawFaqItems)
    ? rawFaqItems.filter(
        (it): it is { question: string; answer: string } =>
          typeof it === 'object' && it !== null &&
          typeof (it as Record<string, unknown>).question === 'string' &&
          typeof (it as Record<string, unknown>).answer === 'string'
      )
    : [];
  const faqs = {
    label: m(d.faqs_label, _faqs.label),
    body: m(d.faqs_body, _faqs.body),
    items: faqItems.length > 0 ? faqItems : _faqs.items,
  };

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
              <p dangerouslySetInnerHTML={html(intro.body)} />
              <Link className="link-button" href={intro.ctaHref}>
                {intro.cta}
              </Link>
            </div>
          </div>

          {/* Paginated articles grid */}
          <ArticlesSection />

          {/* FAQ accordion */}
          <FaqSection label={faqs.label} body={faqs.body} items={faqs.items} />

          {/* Elfsight Google Reviews widget */}
          <div className="kh-gr">
            <GoogleReviews widgetId={reviewsWidgetId} />
          </div>
        </div>
      </div>
    </div>
  );
}
