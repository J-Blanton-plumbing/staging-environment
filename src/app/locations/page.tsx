import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import HeroNav from '@/components/HeroNav';
import ScheduleTrigger from '@/components/schedule/ScheduleTrigger';
import { MOST_REQUESTED, REGIONS } from '@/lib/content/locations-regions';
import { getMainPageContent } from '@/lib/cms/main-pages';
import { getGlobalSettingsCached } from '@/lib/cms/global-settings';
import { renderCmsInline } from '@/lib/cms/sanitize';
import { getMainPagePreview } from '@/lib/cms/preview';
import { isPageLive } from '@/lib/cms/page-status';
import PreviewBanner from '@/components/PreviewBanner';
import type { Metadata } from 'next';
import { getMainPageMeta } from '@/lib/cms/page-meta';
import './locations.css';

export const dynamic = 'force-dynamic';

/**
 * Brief 149 (Track C) — the `main_pages.meta_title` / `meta_description`
 * fields were editable in the admin and read by nothing: this page's <title>
 * came from the literal below. They now drive the page, with the literal kept
 * as the fallback for a blank field. `getMainPageMeta` normalizes the brand
 * suffix so the root layout's title template appends it exactly once, whatever
 * an editor types.
 */
const STATIC_META = {
  title: 'Locations',
  description:
    'J. Blanton Plumbing serves Chicagoland and Central Ohio. Find your nearest service center, or browse every city and neighborhood we cover in each region.',
};

export async function generateMetadata(): Promise<Metadata> {
  const meta = await getMainPageMeta('locations', STATIC_META);
  return { title: meta.title, description: meta.description };
}

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
    // Brief 154 — Columbus, OH: the first out-of-state service center. Added
    // here (column 1 was the shortest at 4, columns 2/3 already had 5) to keep
    // the 3-column grid balanced at 5/5/5.
    { label: 'Columbus, OH', href: '/columbus' },
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

  /*
   * Brief 159 (Track D / E1) — the render gate.
   *
   * A page is live if and only if one of its versions is Published; the live
   * row's derived `status` column mirrors that, so this is ONE indexed column
   * read and never a join to `page_drafts`. `notFound()` rather than a 200 with
   * `noindex`: a 200 keeps the URL in the crawl set and contradicts the sitemap
   * removal that accompanies it. The session-gated preview cookie wins, so an
   * editor can still see an unpublished page; `isPageLive` fails OPEN on a
   * database error.
   */
  if (!preview && !(await isPageLive('main', 'locations'))) notFound();
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
            {/* Brief 169: first-party schedule popup. Styled by
                `.locations-page … .schedule-popup` in locations.css. */}
            <ScheduleTrigger label={<p>{heroCta}</p>} />
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

        {/* ---- Region cards ----------------------------------------------
            Columbus Integration Brief 03, Track A.

            This block REPLACES the full `CITY_REGISTRY` column grid that used
            to sit here. That grid rendered the whole registry, so once Brief 02
            registered 138 Ohio areas it was emitting 386 links — Illinois and
            Ohio interleaved A→Z with nothing saying which state anything was
            in. The complete lists moved to the two region pages; this page
            routes to them.

            The "Most requested" list inside each card is the internal-linking
            mitigation: the hub used to link every city directly, and those
            links now live one level down. Ten direct links per region keep the
            highest-value city pages receiving equity straight from a page that
            ranks. Both lists exclude the cities already linked from the
            SERVICE CENTERS grid above — see `MOST_REQUESTED`.
            ---------------------------------------------------------------- */}
        <div className="w81">
          <div className="city-labels">
            <h2>Proudly Serving Chicagoland and Central Ohio</h2>
            <p>Choose your region to see every city and neighborhood we cover.</p>
          </div>

          <div className="region-cards">
            {REGIONS.map((region) => (
              <div key={region.key} className="region-card">
                <p className="region-tenure">{region.tenure}</p>
                <h3>
                  <Link href={region.href}>{region.label}</Link>
                </h3>
                <p className="region-count">
                  {region.cities.length} cities &amp; neighborhoods
                </p>
                <p className="region-counties">{region.counties}</p>

                <p className="region-most-label">Most requested</p>
                <ul className="region-most">
                  {MOST_REQUESTED[region.key].map((city) => (
                    <li key={city.slug}>
                      <MapPin />
                      <Link href={`/${city.slug}`}>{city.name}</Link>
                    </li>
                  ))}
                </ul>

                <Link className="region-all" href={region.href}>
                  See all {region.cities.length} {region.label} areas →
                </Link>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
