import Image from 'next/image';
import HeroNav from '@/components/HeroNav';
import { NDC, type InvolveMeConfig } from '@/lib/content/ndc';
import { getMainPageContent } from '@/lib/cms/main-pages';
import { getMainPagePreview } from '@/lib/cms/preview';
import PreviewBanner from '@/components/PreviewBanner';
import type { Metadata } from 'next';
import './ndc.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'No Drip Club',
  description:
    'Join the No Drip Club for serious savings, VIP priority scheduling, and complimentary annual home maintenance from J. Blanton Plumbing.',
};

/** Inline checkmark icon (matches the theme SVG used on every benefit line). */
function Check() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="m5 13l4 4L19 7"
      />
    </svg>
  );
}

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

/** A sub-heading followed by its checkmark benefit lines. */
function BenefitGroup({
  heading,
  items,
  headingClassName,
}: {
  heading: string;
  items: string[];
  headingClassName: string;
}) {
  return (
    <>
      <p className={headingClassName}>{heading}</p>
      {items.map((item) => (
        <div className="item" key={item}>
          <div>
            <Check />
          </div>
          <p>{item}</p>
        </div>
      ))}
    </>
  );
}

export default async function NoDripClubPage() {
  const preview = await getMainPagePreview('no-drip-club');
  const db = preview?.content ?? await getMainPageContent('no-drip-club').catch(() => null);
  const d = db ?? {};
  const m = (dbVal: unknown, fb: string) => (typeof dbVal === 'string' && dbVal) ? dbVal : fb;
  const { hero: _hero, card, how, wait, involveMe } = NDC;
  const hero = { ..._hero, heading: m(d.hero_heading, _hero.heading), description: m(d.hero_description, _hero.description), cta: m(d.hero_cta, _hero.cta) };
  const howH = m(d.how_heading, how.heading);
  const waitS = { ...wait, heading: m(d.wait_heading, wait.heading), body: m(d.wait_body, wait.body), cta: m(d.wait_cta, wait.cta) };
  const pricing = m(d.pricing, card.pricing);

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
            <p className="hero-desc">{hero.description}</p>
            <InvolveMePopup label={hero.cta} cfg={involveMe} />
          </div>
        </div>
      </div>

      {/* ============== HERO-NAV (shared, default props) ============== */}
      <HeroNav />

      {/* ============== CREAM block: benefits card + CTAs + how + reviews + wait ============== */}
      <div className="cream">
        <div className="w81">
          {/* NDC benefits card */}
          <div className="ndc-card">
            <Image src={card.overlayImage} alt={card.overlayAlt} fill sizes="81vw" />
            <div className="i">
              <p className="label">{card.label}</p>
              <div className="f">
                <div className="l">
                  {card.leftColumn.map((group, i) => (
                    <BenefitGroup
                      key={group.heading}
                      heading={group.heading}
                      items={group.items}
                      headingClassName={i === 0 ? 'sub-label' : 'sub-label mt'}
                    />
                  ))}
                </div>
                <div className="r">
                  <div>
                    {card.rightColumn.map((group) => (
                      <BenefitGroup
                        key={group.heading}
                        heading={group.heading}
                        items={group.items}
                        headingClassName="sub-label"
                      />
                    ))}
                    <p className="sub-label mt">{pricing}</p>
                    {card.footnotes.map((note) => (
                      <p key={note}>{note}</p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

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
              <p>{waitS.body}</p>
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
