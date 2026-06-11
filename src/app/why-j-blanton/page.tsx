import Image from 'next/image';
import Link from 'next/link';
import HeroNav from '@/components/HeroNav';
import { WHY_JB } from '@/lib/content/why-j-blanton';
import type { Metadata } from 'next';
import './why-j-blanton.css';

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

export default function WhyJBlantonPage() {
  const { hero, aboutUs, whatToExpect, meetOurTeam, ourLocations, joinOurTeam } = WHY_JB;

  return (
    <div className="why-jb-page">
      {/* ================================================================
          HERO: YouTube embed (left) + heading/subhead/desc/CTA (right)
          ================================================================ */}
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
        {/* `hero-contents` avoids Tailwind's `.contents { display:contents }` collision */}
        <div className="hero-contents">
          <div className="w">
            <h1>{hero.heading}</h1>
            <p className="sub-label">{hero.subheading}</p>
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
              {hero.cta}
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
              <p className="red-text">{aboutUs.heading}</p>
              <p>{aboutUs.body}</p>
            </div>
            {/* Mobile heading (shown via CSS at ≤900px, hidden on desktop) */}
            <p className="red-text red-text-mobile">{aboutUs.heading}</p>
            <Image
              src={aboutUs.image}
              alt={aboutUs.imageAlt}
              width={470}
              height={320}
              sizes="(max-width: 900px) 90vw, 470px"
            />
            {/* Mobile body (shown via CSS at ≤900px, hidden on desktop) */}
            <div className="mobile-content">
              <p>{aboutUs.body}</p>
            </div>
          </div>
        </div>

        {/* ---- WHAT TO EXPECT: image left, text right ------------------ */}
        <div className="wte">
          <div className="w81">
            {/* Mobile heading */}
            <p className="red-text red-text-mobile">{whatToExpect.heading}</p>
            <Image
              src={whatToExpect.image}
              alt={whatToExpect.imageAlt}
              width={470}
              height={320}
              sizes="(max-width: 900px) 90vw, 470px"
            />
            {/* Desktop: heading + body in a div */}
            <div>
              <p className="red-text">{whatToExpect.heading}</p>
              <p>{whatToExpect.body}</p>
            </div>
          </div>
        </div>

        {/* ---- MEET OUR TEAM: text left (.l), image right (.r) --------- */}
        <div className="team">
          <div className="w81">
            <div className="l">
              <div>
                <p className="red-text">{meetOurTeam.heading}</p>
                <p>{meetOurTeam.body}</p>
              </div>
            </div>
            <div className="r">
              {/* Mobile heading lives in .r so it appears above the image on mobile
                  (flex-direction: column-reverse pushes .r to the top) */}
              <p className="red-text red-text-mobile">{meetOurTeam.heading}</p>
              <Image
                src={meetOurTeam.image}
                alt={meetOurTeam.imageAlt}
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
            <p className="red-text red-text-mobile">{ourLocations.heading}</p>
            <Image
              src={ourLocations.image}
              alt={ourLocations.imageAlt}
              width={470}
              height={320}
              sizes="(max-width: 900px) 90vw, 470px"
            />
            <div>
              <p className="red-text">{ourLocations.heading}</p>
              <p>{ourLocations.body}</p>
              <Link href={ourLocations.cta.href} className="link-button">
                {ourLocations.cta.label}
              </Link>
            </div>
          </div>
        </div>

        {/* ---- JOIN OUR TEAM: text left (.l), image right -------------- */}
        <div className="guarantee">
          <div className="w81">
            <div className="l">
              <div>
                <p className="red-text">{joinOurTeam.heading}</p>
                <p>{joinOurTeam.body}</p>
              </div>
              <Link href={joinOurTeam.cta.href} className="link-button">
                {joinOurTeam.cta.label}
              </Link>
            </div>
            {/* red-text-mobile: absent from the PHP template (theme bug — the CSS at
                `.w-aboutus .guarantee .w81 .red-text-mobile` anticipates this element
                to show the section heading on mobile above the image after column-reverse.
                We add it here so the heading renders correctly at ≤900px.) */}
            <p className="red-text red-text-mobile">{joinOurTeam.heading}</p>
            <Image
              src={joinOurTeam.image}
              alt={joinOurTeam.imageAlt}
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
