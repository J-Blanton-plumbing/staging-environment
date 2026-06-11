import Image from 'next/image';
import HeroNav from '@/components/HeroNav';
import { HELP_SUPPORT } from '@/lib/content/help-and-support';
import type { Metadata } from 'next';
import './help-and-support.css';

export const metadata: Metadata = {
  title: 'Help & Support | J. Blanton Plumbing',
  description:
    'Find answers, support, and solutions for all your plumbing needs – right when you need them. Contact J. Blanton Plumbing today.',
};

const INVOLVE_ME = {
  project: 'contact-us',
  embedMode: 'popup',
  triggerEvent: 'button',
  popupSize: 'medium',
  organizationUrl: 'https://jblantonplumbing.involve.me',
};

export default function HelpSupportPage() {
  const { hero, customerService, billingQuestions, plumbingIssue } = HELP_SUPPORT;

  return (
    <div className="help-support-page">

      {/* ================================================================
          HERO
          ================================================================ */}
      <div className="hero">
        <div className="img-s">
          <Image
            src={hero.image}
            alt={hero.imageAlt}
            fill
            sizes="45vw"
            priority
            style={{ objectFit: 'contain' }}
          />
        </div>
        {/* hero-contents avoids Tailwind .contents { display:contents } collision */}
        <div className="hero-contents">
          <div className="w">
            <h1>{hero.heading}</h1>
            {hero.subLabel && <p className="sub-label">{hero.subLabel}</p>}
            <p className="hero-desc">{hero.description}</p>
            <div
              className="involveme_popup"
              role="button"
              tabIndex={0}
              data-project={INVOLVE_ME.project}
              data-embed-mode={INVOLVE_ME.embedMode}
              data-trigger-event={INVOLVE_ME.triggerEvent}
              data-popup-size={INVOLVE_ME.popupSize}
              data-organization-url={INVOLVE_ME.organizationUrl}
            >
              {hero.ctaLabel}
            </div>
          </div>
          <Image
            src={hero.patternImage}
            alt=""
            fill
            sizes="55vw"
          />
        </div>
      </div>

      {/* ================================================================
          HERO-NAV
          ================================================================ */}
      <HeroNav />

      {/* ================================================================
          .w-aboutus — three alternating content sections
          ================================================================ */}
      <div className="w-aboutus">

        {/* ==============================================================
            3a. CUSTOMER SERVICE — .pv (text left, image right)
            ============================================================== */}
        <div className="pv">
          <div className="w81">
            {/* Desktop: label + body */}
            <div>
              <p className="red-text">{customerService.label}</p>
              <p>{customerService.body}</p>
            </div>
            {/* Mobile heading */}
            <p className="red-text red-text-mobile">{customerService.label}</p>
            <Image
              src={customerService.image}
              alt={customerService.imageAlt}
              width={470}
              height={320}
              sizes="(max-width: 900px) 90vw, 470px"
            />
            {/* Mobile body */}
            <div className="mobile-content">
              <p>{customerService.body}</p>
            </div>
          </div>
        </div>

        {/* ==============================================================
            3b. BILLING QUESTIONS — .wte .lws (image left, text right)
            ============================================================== */}
        <div className="wte lws">
          <div className="w81">
            {/* Mobile heading */}
            <p className="red-text red-text-mobile">{billingQuestions.label}</p>
            <Image
              src={billingQuestions.image}
              alt={billingQuestions.imageAlt}
              width={470}
              height={320}
              sizes="(max-width: 900px) 90vw, 470px"
            />
            {/* Desktop: label + body */}
            <div>
              <p className="red-text">{billingQuestions.label}</p>
              <p>{billingQuestions.body}</p>
            </div>
          </div>
        </div>

        {/* ==============================================================
            3c. HAVE A PLUMBING ISSUE? — .pv (text left, image right)
            ============================================================== */}
        <div className="pv">
          <div className="w81">
            {/* Desktop: label + body */}
            <div>
              <p className="red-text">{plumbingIssue.label}</p>
              <p>{plumbingIssue.body}</p>
            </div>
            {/* Mobile heading */}
            <p className="red-text red-text-mobile">{plumbingIssue.label}</p>
            <Image
              src={plumbingIssue.image}
              alt={plumbingIssue.imageAlt}
              width={470}
              height={320}
              sizes="(max-width: 900px) 90vw, 470px"
            />
            {/* Mobile body */}
            <div className="mobile-content">
              <p>{plumbingIssue.body}</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
