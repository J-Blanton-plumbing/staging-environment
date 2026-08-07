import Link from 'next/link';
import Image from 'next/image';
import HeroNav from '@/components/HeroNav';
import { CITY_REGISTRY } from '@/lib/content/cities/index';
import { getMainPageContent } from '@/lib/cms/main-pages';
import { getGlobalSettingsCached } from '@/lib/cms/global-settings';
import { renderCmsInline } from '@/lib/cms/sanitize';
import { getMainPagePreview } from '@/lib/cms/preview';
import PreviewBanner from '@/components/PreviewBanner';
import type { Metadata } from 'next';
import './locations.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Locations',
  description:
    'J. Blanton Plumbing serves Chicago and the surrounding suburbs. Find your nearest service center or browse all Chicagoland areas we cover.',
};

function MapPin() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M12 11.5A2.5 2.5 0 0 1 9.5 9A2.5 2.5 0 0 1 12 6.5A2.5 2.5 0 0 1 14.5 9a2.5 2.5 0 0 1-2.5 2.5M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7" />
    </svg>
  );
}

const SERVICE_CENTERS = [
  [
    { label: 'Northbrook, IL', href: '/northbrook' },
    { label: 'Algonquin, IL', href: '/algonquin' },
    { label: 'Arlington Heights, IL', href: '/arlington-heights' },
    { label: 'Chicago - Lincoln Park', href: '/chicago-lincoln-park' },
  ],
  [
    { label: 'Chicago - Ravenswood', href: '/chicago-ravenswood' },
    { label: 'Elgin, IL', href: '/elgin' },
    { label: 'Evanston, IL', href: '/evanston' },
    { label: 'Geneva, IL', href: '/geneva' },
    { label: 'Joliet, IL', href: '/joliet' },
  ],
  [
    { label: 'Hinsdale, IL', href: '/hinsdale' },
    { label: 'McHenry, IL', href: '/mchenry' },
    { label: 'Naperville, IL', href: '/naperville' },
    { label: 'Skokie', href: '/skokie' },
    { label: 'Elmhurst, IL', href: '/elmhurst' },
  ],
];

export default async function LocationsPage() {
  const preview = await getMainPagePreview('locations');
  const db = preview?.content ?? await getMainPageContent('locations').catch(() => null);
  const d = db ?? {};
  const settings = await getGlobalSettingsCached();
  const html = (v: string) => ({ __html: renderCmsInline(v, settings) });
  const m = (dbVal: unknown, fb: string) => (typeof dbVal === 'string' && dbVal) ? dbVal : fb;
  const heroHeading = m(d.hero_heading, 'CHICAGO & SUBURBS TOP-RATED PLUMBING COMPANY');
  const heroDescription = m(d.hero_description, "For over 30 years, J. Blanton Plumbing has been the trusted choice for plumbing services in Chicago and the surrounding suburbs. From burst pipes to kitchen floods, no matter where you are, our team is ready 24/7 to restore your home's comfort.");
  const heroCta = m(d.hero_cta, 'SCHEDULE A SERVICE');
  const introLabel = m(d.intro_label, 'Your Trusted Plumbing Experts Serving Chicago and Suburbs');
  const introBody = m(d.intro_body, "At J. Blanton Plumbing, we've proudly serving Chicago and its surrounding suburbs for over 30 years. Our team of experienced and certified plumbers is committed to delivering high-quality service that our customers can rely on-day or night. From residential repairs to large-scale plumbing projects, we handle it all with professionalism, efficiency, and a dedication to customer satisfaction.");
  const cityCount = CITY_REGISTRY.length;
  const chunkSize = Math.ceil(cityCount / 5);
  const cityColumns: (typeof CITY_REGISTRY)[] = [];
  for (let i = 0; i < cityCount; i += chunkSize) {
    cityColumns.push(CITY_REGISTRY.slice(i, i + chunkSize));
  }

  return (
    <div className="locations-page">
      {preview && <PreviewBanner label={preview.meta.label} creatorName={preview.meta.creator_name} editorUrl="/admin/locations" liveUrl="/locations" draftId={preview.meta.id} pageType="main" pageSlug="locations" />}
      {/* ================================================================
          HERO — map widget left, text right
          ================================================================ */}
      <div className="hero">
        <div className="hero-map">
          <iframe
            className="w-full h-full min-h-[500px]"
            loading="lazy"
            src="https://maps.google.com/maps?hl=en&q=J.+Blanton+Plumbing,+Illinois&t=&z=10&ie=UTF8&iwloc=B&output=embed"
            title="J. Blanton Plumbing service area"
          />
        </div>
        {/* hero-contents avoids Tailwind .contents { display:contents } collision */}
        <div className="hero-contents">
          <div className="w">
            <h1>{heroHeading}</h1>
            <p className="sub-label"></p>
            <p className="hero-desc" dangerouslySetInnerHTML={html(heroDescription)} />
            <div
              className="involveme_popup"
              data-params="source=,campaignname=,utm_campaign=,utm_adgroup=,keyword=,network=,device=,medium=,gclid=,msclkid="
              data-project="schedule-service-new"
              data-embed-mode="popup"
              data-trigger-event="button"
              data-popup-size="medium"
              data-organization-url="https://jblantonplumbing.involve.me"
            >
              <p>{heroCta}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================
          HERO NAV
          ================================================================ */}
      <HeroNav />

      {/* ================================================================
          CREAM SECTIONS
          ================================================================ */}
      <div className="ls-cream">

        {/* ---- Section 2: Intro text + image ----------------------------- */}
        <div className="ls-pv">
          <div className="w81">
            <div className="ls-pv-text">
              <p className="red-text">{introLabel}</p>
              <p dangerouslySetInnerHTML={html(introBody)} />
              <p>
                Whether you&apos;re in the heart of the city or in suburbs like Northbrook,
                Arlington Heights, or Evanston, we&apos;re here to address all your plumbing needs.
                Our services include everything from emergency repairs and water heater installations
                to drain cleaning and sump pump maintenance. No matter the job, you can count on our
                expertise and fast response times to your home or business back to normal.
              </p>
              <p>
                When plumbing problems arise, don&apos;t settle for less-Make a Good Call with J.
                Blanton Plumbing. We&apos;re proud to be a part of the communities we serve and are
                dedicated to maintanining your trust through honest communication, transparent
                pricing, and guaranteed work.
              </p>
            </div>
            <Image
              src="https://d1rplazj5a80fb.cloudfront.net/images/preventative.webp"
              alt="Preventative"
              width={470}
              height={320}
              unoptimized
            />
            <p className="red-text red-text-mobile">MAKING GOOD CALLS ACROSS CHICAGOLAND</p>
          </div>
        </div>

        {/* ---- Section 3: Service Centers grid --------------------------- */}
        <div className="map">
          <div className="map-cities">
            <p className="red-text">OUR SERVICE CENTERS</p>
            <div className="r">
              {SERVICE_CENTERS.map((col, ci) => (
                <div key={ci}>
                  {col.map((city) => (
                    <Link key={city.href} href={city.href}>{city.label}</Link>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ---- Section 4: Serving Chicagoland (ls-man) ------------------- */}
        <div className="ls-man">
          <div className="w81">
            <p className="red-text red-text-mobile">
              Serving Chicagoland with Trusted Plumbing Solutions
            </p>
            <Image
              src="https://d1rplazj5a80fb.cloudfront.net/images/Flood+Control+copy.webp"
              alt="Flood Control"
              width={470}
              height={320}
              unoptimized
            />
            <div className="ls-man-text">
              <p className="red-text">Serving Chicagoland with Trusted Plumbing Solutions</p>
              <p>
                For over 30 years, J. Blanton Plumbing has proudly served Chicago and its
                surrounding suburbs, including Northbrook, Arlington Heights, Naperville, Elgin, and
                more. With convenient locations throughout the region, we&apos;re ready to provide
                fast, reliable plumbing services whenever you need us. Wherever you are, Make a Good
                Call with J. Blanton Plumbing and experience the difference.
              </p>
            </div>
          </div>
        </div>

        {/* ---- City directory -------------------------------------------- */}
        <div className="w81">
          <div className="city-labels">
            <p>Proudly Serving the Greater Chicagoland Area for 30+ Years</p>
            <p>Some areas we serve, but are not limited to, include:</p>
          </div>
          <div className="l-cities">
            {cityColumns.map((col, ci) => (
              <div key={ci}>
                {col.map((city) => (
                  <div key={city.slug}>
                    <MapPin />
                    <Link href={`/${city.slug}`}>{city.name}</Link>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
