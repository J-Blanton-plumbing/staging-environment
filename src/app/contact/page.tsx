import Link from 'next/link';
import HeroNav from '@/components/HeroNav';
import { CONTACT } from '@/lib/content/contact';
import { getGlobalSettingsCached } from '@/lib/cms/global-settings';
import { formatOfficeAddress } from '@/lib/cms/offices';
import type { Metadata } from 'next';
import { pageTitle } from '@/lib/seo';
import './contact.css';

export const metadata: Metadata = {
  title: pageTitle(CONTACT.meta.title),
  description: CONTACT.meta.description,
};

const INVOLVE_ME = {
  project: 'schedule-service-new',
  embedMode: 'popup',
  triggerEvent: 'button',
  popupSize: 'medium',
  organizationUrl: 'https://jblantonplumbing.involve.me',
};

/**
 * Brief 102 (Track C): the 5 offices this page has always shown, in the same
 * order — filtered from the single CMS offices list (global_settings.offices)
 * so the addresses stay in sync with the footer/locations page instead of a
 * second hard-coded copy.
 */
const CONTACT_OFFICE_SLUGS = ['northbrook', 'algonquin', 'chicago-ravenswood', 'arlington-heights', 'evanston'];

export default async function ContactPage() {
  const { hero, getInTouch } = CONTACT;
  const settings = await getGlobalSettingsCached();
  const offices = CONTACT_OFFICE_SLUGS
    .map((slug) => settings.offices.find((o) => o.slug === slug))
    .filter((o): o is NonNullable<typeof o> => o != null);

  return (
    <div className="contact-page">
      {/* ================================================================
          HERO: image (left) + heading/desc/phone CTA (right)
          ================================================================ */}
      <div className="hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="img-s" src={hero.imageSrc} alt={hero.imageAlt} />
        {/* `hero-contents` avoids Tailwind's `.contents { display:contents }` collision */}
        <div className="hero-contents">
          <div className="w">
            <h1>{hero.heading}</h1>
            <p className="hero-desc">{hero.description}</p>
            <a className="hero-link-button" href={getInTouch.phoneHref}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor" d="M20 15.5c-1.2 0-2.5-.2-3.6-.6h-.3c-.3 0-.5.1-.7.3l-2.2 2.2c-2.8-1.5-5.2-3.8-6.6-6.6l2.2-2.2c.3-.3.4-.7.2-1c-.3-1.1-.5-2.4-.5-3.6c0-.5-.5-1-1-1H4c-.5 0-1 .5-1 1c0 9.4 7.6 17 17 17c.5 0 1-.5 1-1v-3.5c0-.5-.5-1-1-1" />
              </svg>
              773-724-9272
            </a>
          </div>
        </div>
      </div>

      {/* ================================================================
          HERO-NAV (shared 4-link strip)
          ================================================================ */}
      <HeroNav />

      {/* ================================================================
          CREAM CONTENT BLOCK
          ================================================================ */}
      <div className="cream">
        <div className="w81" style={{ padding: '60px 0' }}>
          <div className="contact-columns">
            {/* LEFT — Get in Touch + Schedule */}
            <div>
              <p className="red-text">GET IN TOUCH</p>
              <p>
                <strong>Phone:</strong>{' '}
                <a href={getInTouch.phoneHref}>{getInTouch.phone}</a>
              </p>
              <p style={{ marginTop: '20px' }}>{getInTouch.availability}</p>
              <div style={{ marginTop: '30px' }}>
                <p className="red-text">SCHEDULE A SERVICE</p>
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
                  SCHEDULE NOW
                </div>
              </div>
            </div>

            {/* RIGHT — Our Locations */}
            <div>
              <p className="red-text">OUR LOCATIONS</p>
              {offices.map((office) => (
                <div key={office.slug} className="office-block">
                  <strong>{office.name}</strong>
                  <span>{formatOfficeAddress(office)}</span>
                </div>
              ))}
              <Link href="/locations" className="locations-link">
                View all locations →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
