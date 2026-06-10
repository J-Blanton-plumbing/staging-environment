import Image from 'next/image';
import HeroNav from '@/components/HeroNav';
import { NDC, type InvolveMeConfig } from '@/lib/content/ndc';
import type { Metadata } from 'next';
import './ndc.css';

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

export default function NoDripClubPage() {
  const { hero, card, how, wait, involveMe } = NDC;

  return (
    <div className="ndc-page">
      {/* ============== HERO: YouTube embed + heading/desc/CTA ============== */}
      <div className="hero">
        <iframe
          className="img-s"
          src={hero.videoSrc}
          title={hero.videoTitle}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
        <div className="contents">
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
                    <p className="sub-label mt">{card.pricing}</p>
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
          <p className="red-text ndc-red-text-center">{how.heading}</p>
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
              <p className="red-text">{wait.heading}</p>
              {/* mobile-only image (hidden on desktop via CSS) */}
              <Image src={wait.image} alt={wait.imageAlt} width={470} height={320} />
              <p>{wait.body}</p>
              <InvolveMePopup label={wait.cta} className="link-button" cfg={involveMe} />
            </div>
            {/* desktop image */}
            <Image src={wait.image} alt={wait.imageAlt} width={470} height={320} />
          </div>
        </div>
      </div>
    </div>
  );
}
