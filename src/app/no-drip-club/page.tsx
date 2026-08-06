import Image from 'next/image';
import HeroNav from '@/components/HeroNav';
import InvolveMePopup from '@/components/InvolveMePopup';
import NoDripClubClassic from '@/components/NoDripClubClassic';
import NoDripClubComparison from '@/components/NoDripClubComparison';
import { NDC } from '@/lib/content/ndc';
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
import {
  normalizeMembershipComparisonInstance,
  staticNdcMembershipComparisonData,
  NDC_MEMBERSHIP_COMPARISON_CONTENT_KEY,
} from '@/lib/cms/membership-comparison';
import {
  normalizeNdcTemplateVariant,
  NDC_TEMPLATE_VARIANT_CONTENT_KEY,
} from '@/lib/cms/ndc-template-variant';
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
 * Brief 141 (Track B) — this page is a thin SHELL over two permanent template
 * variants:
 *
 *   page.tsx
 *   ├─ shared: hero (YouTube embed + H1 + description + Join Today), hero-nav strip
 *   ├─ variant === 'comparison' ? <NoDripClubComparison/> : <NoDripClubClassic/>
 *   ├─ shared: Elfsight reviews mount, "WHAT ARE YOU WAITING FOR?" closer
 *   └─ shared: header/footer (from the root layout)
 *
 * Everything identical in both variants stays HERE, outside the variant branch —
 * both templates are supported indefinitely, so shared markup must live in
 * exactly one place. The `.cream > .w81` wrapper is shared too: `classic`
 * renders its body inside it (which is what keeps that variant's HTML
 * byte-identical to the pre-brief page), while `comparison` renders its own
 * full-bleed sections above it and uses it only for the closer.
 *
 * Content isolation: `classic` reads ONLY `content.benefits_card`, `comparison`
 * reads ONLY `content.membership_comparison`. Neither path touches the other's
 * key, so switching variants — in either direction, any number of times — can
 * never migrate, clear or overwrite content. There is no archive and nothing to
 * restore; that is the whole point of the design.
 */
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
  // Brief 141 — which template variant renders. Absent or unrecognised → 'classic',
  // so an environment that hasn't run the seed keeps rendering today's page.
  const variant = normalizeNdcTemplateVariant(d[NDC_TEMPLATE_VARIANT_CONTENT_KEY]);
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
  // Brief 141 — same dual-path pattern for the comparison table: the stored
  // instance when there is a valid one, else the static mapper. No code path can
  // produce an empty section.
  const membershipComparison =
    normalizeMembershipComparisonInstance(d[NDC_MEMBERSHIP_COMPARISON_CONTENT_KEY])?.data ??
    staticNdcMembershipComparisonData();

  return (
    <div className={variant === 'comparison' ? 'ndc-page ndc-variant-comparison' : 'ndc-page'}>
      {preview && <PreviewBanner label={preview.meta.label} creatorName={preview.meta.creator_name} editorUrl="/admin/no-drip-club" liveUrl="/no-drip-club" draftId={preview.meta.id} pageType="main" pageSlug="no-drip-club" />}
      {/* ============== HERO: YouTube embed + heading/desc/CTA (shared) ============== */}
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

      {/* ============== VARIANT BODY: comparison sections are full-bleed and sit
           ABOVE the shared cream closer block; classic renders inside it. ====== */}
      {variant === 'comparison' && (
        <NoDripClubComparison
          data={membershipComparison}
          settings={settings}
          involveMe={involveMe}
          howHeading={howH}
          howSteps={how.steps}
          callout={NDC.comparison.callout}
        />
      )}

      {/* ============== CREAM block: variant body (classic) + reviews + wait ============== */}
      <div className="cream">
        <div className="w81">
          {variant !== 'comparison' && (
            <NoDripClubClassic
              benefitsCard={benefitsCard}
              settings={settings}
              involveMe={involveMe}
              howHeading={howH}
              howSteps={how.steps}
            />
          )}

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
