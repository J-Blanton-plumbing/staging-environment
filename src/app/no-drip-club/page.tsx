import Image from 'next/image';
import HeroNav from '@/components/HeroNav';
import BenefitsCard from '@/components/BenefitsCard';
import { NDC, type InvolveMeConfig } from '@/lib/content/ndc';
import { getMainPageContent } from '@/lib/cms/main-pages';
import { getGlobalSettingsCached } from '@/lib/cms/global-settings';
import { renderCmsInline } from '@/lib/cms/sanitize';
import { resolveTokens } from '@/lib/cms/tokens';
import { getMainPagePreview } from '@/lib/cms/preview';
import {
  normalizeBenefitsCardInstance,
  staticNdcBenefitsCardData,
  NDC_BENEFITS_CARD_CONTENT_KEY,
} from '@/lib/cms/benefits-card';
import PreviewBanner from '@/components/PreviewBanner';
import type { Metadata } from 'next';
import './ndc.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'No Drip Club',
  description:
    'Join the No Drip Club for serious savings, VIP priority scheduling, and complimentary annual home maintenance from J. Blanton Plumbing.',
};

/**
 * involve.me popup trigger. The global <InvolveMeScript /> (mounted in layout)
 * binds every `.involveme_popup` element on click; this stays a plain element
 * so the page can remain a server component.
 */
function InvolveMePopup({
  label,
  className = '',
  cfg,
}: {
  label: string;
  className?: string;
  cfg: InvolveMeConfig;
}) {
  return (
    <div
      className={`involveme_popup${className ? ` ${className}` : ''}`}
      role="button"
      tabIndex={0}
      data-project={cfg.project}
      data-embed-mode={cfg.embedMode}
      data-trigger-event={cfg.triggerEvent}
      data-popup-size={cfg.popupSize}
      data-organization-url={cfg.organizationUrl}
    >
      {label}
    </div>
  );
}

export default async function NoDripClubPage() {
  const preview = await getMainPagePreview('no-drip-club');
  const db = preview?.content ?? await getMainPageContent('no-drip-club').catch(() => null);
  const d = db ?? {};
  const m = (dbVal: unknown, fb: string) => (typeof dbVal === 'string' && dbVal) ? dbVal : fb;
  // NDC price is managed in Global Settings (single source of truth); it also
  // backs the variable-token resolver (Brief 77) applied to every text field.
  const settings = await getGlobalSettingsCached();
  // Headings/CTAs: resolve {{tokens}} to plain text (React escapes on render).
  const rt = (dbVal: unknown, fb: string) => resolveTokens(m(dbVal, fb), settings);
  const { hero: _hero, how, wait, involveMe } = NDC;
  const hero = {
    ..._hero,
    heading: rt(d.hero_heading, _hero.heading),
    subheading: resolveTokens(_hero.subheading ?? '', settings),
    // Body: kept raw here; rendered as inline HTML via renderCmsInline below.
    description: m(d.hero_description, _hero.description),
    cta: rt(d.hero_cta, _hero.cta),
  };
  const howH = rt(d.how_heading, how.heading);
  const waitS = {
    ...wait,
    heading: rt(d.wait_heading, wait.heading),
    body: m(d.wait_body, wait.body),
    cta: rt(d.wait_cta, wait.cta),
  };
  // Brief 121 — the "MEMBERS GET:" card renders from the page's stored
  // `benefitsCard` block instance (content.benefits_card, seeded by
  // scripts/seed-brief-121-ndc-benefits-card.ts and editable in the admin).
  // Until the seed has run, the SAME component renders the SAME data mapped
  // from the static `ndc.ts` card — one markup path, no visual difference.
  // The price line inside the card is the {{ndc_price}} token, resolved from
  // Global Settings exactly like the previous `settings.ndcPrice` render.
  const benefitsCard =
    normalizeBenefitsCardInstance(d[NDC_BENEFITS_CARD_CONTENT_KEY])?.data ??
    staticNdcBenefitsCardData();

  return (
    <div className="ndc-page">
      {preview && <PreviewBanner label={preview.meta.label} creatorName={preview.meta.creator_name} editorUrl="/admin/no-drip-club" liveUrl="/no-drip-club" draftId={preview.meta.id} pageType="main" pageSlug="no-drip-club" />}
      {/* ============== HERO: YouTube embed + heading/desc/CTA ============== */}
      <div className="hero">
        <div className="img-s">
          <iframe
            src={hero.videoSrc}
            title={hero.videoTitle}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ width: '100%', height: '100%', display: 'block' }}
          />
        </div>
        <div className="hero-contents">
          <div className="w">
            <h1>{hero.heading}</h1>
            {hero.subheading && <p className="sub-label">{hero.subheading}</p>}
            <p className="hero-desc" dangerouslySetInnerHTML={{ __html: renderCmsInline(hero.description, settings) }} />
            <InvolveMePopup label={hero.cta} cfg={involveMe} />
          </div>
        </div>
      </div>

      {/* ============== HERO-NAV (shared, default props) ============== */}
      <HeroNav />

      {/* ============== CREAM block: benefits card + CTAs + how + reviews + wait ============== */}
      <div className="cream">
        <div className="w81">
          {/* NDC benefits card — Brief 121 `benefitsCard` block */}
          <BenefitsCard data={benefitsCard} settings={settings} />

          {/* SIGN UP — Cerulean pill, involve.me popup */}
          <InvolveMePopup label={NDC.signUpCta} className="ndc-blue-button link-button" cfg={involveMe} />

          {/* HOW IT WORKS */}
          <p className="red-text ndc-red-text-center">{howH}</p>
          <div className="ndc-how-it-works">
            {how.steps.map((step) => (
              <div key={step.label}>
                <p className="label">{step.label}</p>
                <p className="text">{step.text}</p>
              </div>
            ))}
          </div>

          {/* Elfsight reviews widget (script loaded globally) */}
          <div className="ndc-gr">
            <div className={NDC.reviewsWidgetClass} data-elfsight-app-lazy />
          </div>

          {/* WHAT ARE YOU WAITING FOR? */}
          <div className="ndc-wait">
            <div>
              <p className="red-text">{waitS.heading}</p>
              {/* mobile-only image (hidden on desktop via CSS) */}
              <Image src={waitS.image} alt={waitS.imageAlt} width={470} height={320} />
              <p dangerouslySetInnerHTML={{ __html: renderCmsInline(waitS.body, settings) }} />
              <InvolveMePopup label={waitS.cta} className="link-button" cfg={involveMe} />
            </div>
            {/* desktop image */}
            <Image src={waitS.image} alt={waitS.imageAlt} width={470} height={320} />
          </div>
        </div>
      </div>
    </div>
  );
}
