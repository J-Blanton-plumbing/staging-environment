import Image from 'next/image';
import HeroNav from '@/components/HeroNav';
import { HELP_SUPPORT } from '@/lib/content/help-and-support';
import { getMainPageContent } from '@/lib/cms/main-pages';
import { getGlobalSettingsCached } from '@/lib/cms/global-settings';
import { renderCmsInline } from '@/lib/cms/sanitize';
import { getMainPagePreview } from '@/lib/cms/preview';
import PreviewBanner from '@/components/PreviewBanner';
import type { Metadata } from 'next';
import './help-and-support.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Help & Support',
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

export default async function HelpSupportPage() {
  const preview = await getMainPagePreview('help-and-support');
  const db = preview?.content ?? await getMainPageContent('help-and-support').catch(() => null);
  const d = db ?? {};
  const settings = await getGlobalSettingsCached();
  const html = (v: string) => ({ __html: renderCmsInline(v, settings) });
  const m = (dbVal: unknown, fb: string) => (typeof dbVal === 'string' && dbVal) ? dbVal : fb;
  const { hero: _hero, customerService: _cs, billingQuestions: _bq, plumbingIssue: _pi } = HELP_SUPPORT;
  const hero = { ..._hero, heading: m(d.hero_heading, _hero.heading), description: m(d.hero_description, _hero.description) };
  const customerService = { ..._cs, label: m(d.customer_service_label, _cs.label), body: m(d.customer_service_body, _cs.body) };
  const billingQuestions = { ..._bq, label: m(d.billing_questions_label, _bq.label), body: m(d.billing_questions_body, _bq.body) };
  const plumbingIssue = { ..._pi, label: m(d.plumbing_issue_label, _pi.label), body: m(d.plumbing_issue_body, _pi.body) };

  return (
    <div className="help-support-page">
      {preview && <PreviewBanner label={preview.meta.label} creatorName={preview.meta.creator_name} editorUrl="/admin/help-and-support" liveUrl="/help-and-support" draftId={preview.meta.id} pageType="main" pageSlug="help-and-support" />}

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
            style={{ objectFit: 'cover' }}
          />
        </div>
        {/* hero-contents avoids Tailwind .contents { display:contents } collision */}
        <div className="hero-contents">
          <div className="w">
            <h1>{hero.heading}</h1>
            {hero.subLabel && <p className="sub-label">{hero.subLabel}</p>}
            <p className="hero-desc" dangerouslySetInnerHTML={html(hero.description)} />
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
              <p dangerouslySetInnerHTML={html(customerService.body)} />
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
              <p dangerouslySetInnerHTML={html(customerService.body)} />
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
              <p dangerouslySetInnerHTML={html(billingQuestions.body)} />
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
              <p dangerouslySetInnerHTML={html(plumbingIssue.body)} />
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
              <p dangerouslySetInnerHTML={html(plumbingIssue.body)} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
