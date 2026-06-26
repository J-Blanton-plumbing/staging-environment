import Image from 'next/image';
import Link from 'next/link';
import HeroNav from '@/components/HeroNav';
import { WHY_JB } from '@/lib/content/why-j-blanton';
import { getMainPageContent } from '@/lib/cms/main-pages';
import { getMainPagePreview } from '@/lib/cms/preview';
import PreviewBanner from '@/components/PreviewBanner';
import type { Metadata } from 'next';
import './why-j-blanton.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Why J. Blanton | J. Blanton Plumbing',
  description:
    "For over 30 years J. Blanton Plumbing has served Chicagoland with 5-star plumbing service. Learn about our team, what to expect, and why we’re the right choice.",
};

const INVOLVE_ME = {
  project: 'schedule-service-new',
  embedMode: 'popup',
  triggerEvent: 'button',
  popupSize: 'medium',
  organizationUrl: 'https://jblantonplumbing.involve.me',
};

export default async function WhyJBlantonPage() {
  const preview = await getMainPagePreview('why-j-blanton');
  const db = preview?.content ?? await getMainPageContent('why-j-blanton').catch(() => null);
  const d = db ?? {};
  const merge = (dbVal: unknown, fallback: string) => (typeof dbVal === 'string' && dbVal) ? dbVal : fallback;

  const { hero, aboutUs, whatToExpect, meetOurTeam, ourLocations, joinOurTeam } = WHY_JB;
  const h = { ...hero, heading: merge(d.hero_heading, hero.heading), subheading: merge(d.hero_subheading, hero.subheading), description: merge(d.hero_description, hero.description), cta: merge(d.hero_cta, hero.cta) };
  const au = { ...aboutUs, heading: merge(d.about_us_heading, aboutUs.heading), body: merge(d.about_us_body, aboutUs.body) };
  const wte = { ...whatToExpect, heading: merge(d.what_to_expect_heading, whatToExpect.heading), body: merge(d.what_to_expect_body, whatToExpect.body) };
  const mot = { ...meetOurTeam, heading: merge(d.meet_our_team_heading, meetOurTeam.heading), body: merge(d.meet_our_team_body, meetOurTeam.body) };
  const ol = { ...ourLocations, heading: merge(d.our_locations_heading, ourLocations.heading), body: merge(d.our_locations_body, ourLocations.body) };
  const jot = { ...joinOurTeam, heading: merge(d.join_our_team_heading, joinOurTeam.heading), body: merge(d.join_our_team_body, joinOurTeam.body) };

  return (
    <div className="why-jb-page">
      {preview && <PreviewBanner label={preview.meta.label} creatorName={preview.meta.creator_name} editorUrl="/admin/why-j-blanton" liveUrl="/why-j-blanton" draftId={preview.meta.id} pageType="main" pageSlug="why-j-blanton" />}
      {/* ================================================================
          HERO: YouTube embed (left) + heading/subhead/desc/CTA (right)
          ================================================================ */}
      <div className="hero">
        <div className="img-s">
          <iframe
            src={h.videoSrc}
            title={h.videoTitle}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ width: '100%', height: '100%', display: 'block' }}
          />
        </div>
        {/* `hero-contents` avoids Tailwind's `.contents { display:contents }` collision */}
        <div className="hero-contents">
          <div className="w">
            <h1>{h.heading}</h1>
            <p className="sub-label">{h.subheading}</p>
            <p className="hero-desc">{h.description}</p>
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
              {h.cta}
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================
          HERO-NAV (shared 4-link strip)
          ================================================================ */}
      <HeroNav />

      {/* ================================================================
          .w-aboutus: five content sections
          ================================================================ */}
      <div className="w-aboutus">

        {/* ---- ABOUT US: text left, image right ------------------------ */}
        <div className="pv">
          <div className="w81">
            {/* Desktop: heading + body in a div */}
            <div>
              <p className="red-text">{au.heading}</p>
              <p>{au.body}</p>
            </div>
            {/* Mobile heading (shown via CSS at ≤900px, hidden on desktop) */}
            <p className="red-text red-text-mobile">{au.heading}</p>
            <Image
              src={au.image}
              alt={au.imageAlt}
              width={470}
              height={320}
              sizes="(max-width: 900px) 90vw, 470px"
            />
            {/* Mobile body (shown via CSS at ≤900px, hidden on desktop) */}
            <div className="mobile-content">
              <p>{au.body}</p>
            </div>
          </div>
        </div>

        {/* ---- WHAT TO EXPECT: image left, text right ------------------ */}
        <div className="wte">
          <div className="w81">
            {/* Mobile heading */}
            <p className="red-text red-text-mobile">{wte.heading}</p>
            <Image
              src={wte.image}
              alt={wte.imageAlt}
              width={470}
              height={320}
              sizes="(max-width: 900px) 90vw, 470px"
            />
            {/* Desktop: heading + body in a div */}
            <div>
              <p className="red-text">{wte.heading}</p>
              <p>{wte.body}</p>
            </div>
          </div>
        </div>

        {/* ---- MEET OUR TEAM: text left (.l), image right (.r) --------- */}
        <div className="team">
          <div className="w81">
            <div className="l">
              <div>
                <p className="red-text">{mot.heading}</p>
                <p>{mot.body}</p>
              </div>
            </div>
            <div className="r">
              {/* Mobile heading lives in .r so it appears above the image on mobile
                  (flex-direction: column-reverse pushes .r to the top) */}
              <p className="red-text red-text-mobile">{mot.heading}</p>
              <Image
                src={mot.image}
                alt={mot.imageAlt}
                width={470}
                height={320}
                sizes="(max-width: 900px) 90vw, 470px"
              />
            </div>
          </div>
        </div>

        {/* ---- OUR LOCATIONS: image left, text right + CTA ------------- */}
        <div className="wte lws">
          <div className="w81">
            {/* Mobile heading */}
            <p className="red-text red-text-mobile">{ol.heading}</p>
            <Image
              src={ol.image}
              alt={ol.imageAlt}
              width={470}
              height={320}
              sizes="(max-width: 900px) 90vw, 470px"
            />
            <div>
              <p className="red-text">{ol.heading}</p>
              <p>{ol.body}</p>
              <Link href={ol.cta.href} className="link-button">
                {ol.cta.label}
              </Link>
            </div>
          </div>
        </div>

        {/* ---- JOIN OUR TEAM: text left (.l), image right -------------- */}
        <div className="guarantee">
          <div className="w81">
            <div className="l">
              <div>
                <p className="red-text">{jot.heading}</p>
                <p>{jot.body}</p>
              </div>
              <Link href={jot.cta.href} className="link-button">
                {jot.cta.label}
              </Link>
            </div>
            {/* red-text-mobile: absent from the PHP template (theme bug — the CSS at
                `.w-aboutus .guarantee .w81 .red-text-mobile` anticipates this element
                to show the section heading on mobile above the image after column-reverse.
                We add it here so the heading renders correctly at ≤900px.) */}
            <p className="red-text red-text-mobile">{jot.heading}</p>
            <Image
              src={jot.image}
              alt={jot.imageAlt}
              width={470}
              height={320}
              sizes="(max-width: 900px) 90vw, 470px"
            />
          </div>
        </div>

      </div>
    </div>
  );
}
