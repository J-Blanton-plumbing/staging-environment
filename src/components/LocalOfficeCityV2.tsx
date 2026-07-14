import HeroNav from '@/components/HeroNav';
import FaqAccordion from '@/components/FaqAccordion';
import NoDripClubSection from '@/components/NoDripClubSection';
import ServiceCard from '@/components/ServiceCard';
import ServicesAccordion from '@/components/ServicesAccordion';
import { SERVICES } from '@/lib/services';
import type { CityCmsContent } from '@/lib/cms/city-pages';
import type { GlobalSettings } from '@/lib/cms/global-settings';

/**
 * Local Office City V2 template (Brief 67, QA fixes Brief 68).
 *
 * A DB-driven server component: DB (`city_pages`) values win when non-empty and
 * static registry data is the fallback. Renders sections in a fixed order.
 * Every section degrades gracefully when its V2 content is missing (empty string
 * / empty array) so the page never crashes on partially-filled cities.
 *
 * The V1 `LocalOfficeCity` component is intentionally left untouched — this is a
 * parallel template selected by `template_type = 'local-office-v2'`.
 *
 * Video section shows a "coming soon" placeholder — the `video_script` field is
 * production-only and is never rendered on the public page (Brief 68 Fix 6).
 */

/** Static registry data + fallbacks for a V2 city. */
export interface LocalOfficeCityV2Static {
  name: string;
  slug: string;
  /** Static hero image URL; empty → Cream placeholder. */
  heroImage?: string;
  /** Dispatch office address, shown in the trust bar. */
  officeAddress?: string;
  /** Elfsight reviews widget id — fallback when the reviews array is empty. */
  reviewsElfsightId?: string;
  /** V1 Why block, used only when `why_points` is empty. */
  whyFallback?: { heading: string; body: string } | null;
}

interface Props {
  city: LocalOfficeCityV2Static;
  db: CityCmsContent;
  settings: GlobalSettings;
}

/** Inner content container — matches the V1 city width. */
const CONTAINER = 'mx-auto w-[90%] lg:w-[81%] max-w-[1200px]';

/** Generic No Drip Club copy — used when a city has no custom `ndc_intro`. */
const NDC_DEFAULT_BODY =
  "There are Good Calls—and then there's the No Drip Club. Members enjoy significant annual savings on home checkups, emergency repairs, and unlock exclusive perks, including VIP treatment whenever they call for service.";

/** Five static gold stars (brief spec: #eab308). */
function Stars() {
  return (
    <span aria-hidden className="text-[#eab308] text-[18px] leading-none tracking-[2px]">
      ★★★★★
    </span>
  );
}

/** Reviewer icon — head + shoulders silhouette in Carmine (Brief 68 Fix 7). */
function ReviewerIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-8 w-8 flex-shrink-0 text-brand-600"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="12" cy="7" r="4" />
      <path d="M12 13c-4.42 0-8 2.46-8 5.5V21h16v-2.5c0-3.04-3.58-5.5-8-5.5Z" />
    </svg>
  );
}

/** Phone CTA button — Cerulean, hover Carmine. */
function PhoneCta({
  href,
  label,
  className = '',
}: {
  href: string;
  label: string;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={`inline-block rounded-[6px] bg-accent-500 px-7 py-3 font-display text-[16px] font-bold uppercase tracking-wide text-white transition-colors hover:bg-brand-600 ${className}`}
    >
      {label}
    </a>
  );
}

export default function LocalOfficeCityV2({ city, db, settings }: Props) {
  const { name } = city;
  const phoneLabel = `Call ${settings.phoneDisplay}`;

  const heroHeading = db.heroHeadingLine1 || `${name} Plumbers`;
  const heroImage = db.heroImage || city.heroImage || '';

  const hasTrustStats = !!(db.trustBarStars && db.trustBarReviewCount);
  const mostRequested = db.mostRequestedServices ?? [];
  const whyPoints = db.whyPoints ?? [];
  const reviews = db.reviews ?? [];
  const faqs = db.faqs ?? [];

  return (
    <>
      {/* ============== 1. HERO ============== */}
      {/* Uses the shared .hero / .hero-contents / .w structure so globals.css
          navbar-clearance padding (90px ≤900px, 80px ≤640px) applies. H1 sizes
          reduced for the longer V2 heading strings (Brief 68 Fix 1). */}
      <section className="hero flex flex-col min-[901px]:flex-row">
        {/* Left — hero image (Cream placeholder when empty) */}
        <div className="relative min-h-[300px] min-[901px]:min-h-[500px] min-[901px]:w-1/2 bg-cream-100">
          {heroImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={heroImage} alt={`${name} plumbing`} className="absolute inset-0 h-full w-full object-cover" />
          )}
        </div>
        {/* Right — Carmine + wrench pattern (shared .hero .hero-contents rule) */}
        <div className="hero-contents min-[901px]:w-1/2">
          <div className="w flex h-full flex-col justify-center px-[7%] py-[60px] text-white">
            <h1 className="font-display text-[28px] font-bold uppercase leading-[1.1] md:text-[36px] lg:text-[48px]">
              {heroHeading}
            </h1>
            {db.heroDescription && (
              <p className="mt-5 max-w-[560px] text-[16px] leading-relaxed text-white/90">
                {db.heroDescription}
              </p>
            )}
            <div className="mt-7">
              <PhoneCta href={settings.phoneHref} label={phoneLabel} />
            </div>
          </div>
        </div>
      </section>

      {/* ============== 2. HERO NAV (shared 4-link strip, directly below hero) ============== */}
      {/* Brief 68 Fix 2 / Fix 9 — HeroNav restored to its correct position, second
          element after the hero, ahead of the trust bar and all other content. */}
      <HeroNav />

      {/* ============== 3. TRUST BAR (cream body strip) ============== */}
      {/* Brief 68 Fix 2 — moved out of the hero area into the page body: a
          full-width centered cream strip with Midnight text below HeroNav. */}
      <section className="bg-cream-100">
        <div className={`${CONTAINER} flex flex-wrap items-center justify-center gap-x-4 gap-y-2 py-4 text-center text-[14px] font-semibold text-navy-800 md:text-[15px]`}>
          {city.officeAddress && <span>{city.officeAddress}</span>}
          {city.officeAddress && <span aria-hidden className="opacity-40">|</span>}
          {hasTrustStats && (
            <>
              <span>
                <span className="text-[#eab308]">★</span> {db.trustBarStars} stars · {db.trustBarReviewCount} reviews
              </span>
              <span aria-hidden className="opacity-40">|</span>
            </>
          )}
          <span>Chicagoland-owned and operated</span>
          <span aria-hidden className="opacity-40">|</span>
          <span>Licensed, bonded &amp; insured in Illinois</span>
        </div>
      </section>

      {/* ============== 4. SERVICES GRID (shared homepage component) ============== */}
      {/* Brief 68 Fix 3 — same ServiceCard grid + ServicesAccordion the homepage
          uses; `services_intro` from the DB is the section intro above the grid. */}
      <section className="bg-white py-[70px]">
        <div className={CONTAINER}>
          <h2 className="font-display text-[28px] font-bold uppercase leading-tight text-brand-600 md:text-[32px]">
            Plumbing Services in {name}, IL
          </h2>
          <p className="mt-4 max-w-[820px] leading-relaxed text-navy-800">
            {db.servicesIntro ||
              `From routine repairs to major installations, our licensed technicians handle every plumbing job in ${name} — diagnosed first, with a flat rate before work begins.`}
          </p>

          <div className="services mt-10">
            {/* Mobile (≤900px): red collapsible accordion */}
            <ServicesAccordion />

            {/* Desktop (≥900px): centered, wrapping flex row of 350px cards */}
            <div className="services-contents hidden min-[900px]:flex flex-wrap justify-center gap-[30px]">
              {SERVICES.map((service) => (
                <ServiceCard key={service.slug} service={service} className="w-[350px]" />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============== 5. MOST REQUESTED SERVICES (asymmetric cards) ============== */}
      {/* Brief 68 Fix 4 — left = 1 tall card with image placeholder, right = 2
          stacked cards. Collapses to a single column ≤900px. */}
      {mostRequested.length > 0 && (
        <section className="bg-cream-100 py-[70px]">
          <div className={CONTAINER}>
            <h2 className="font-display text-[28px] font-bold uppercase leading-tight text-brand-600 md:text-[32px]">
              Most Requested Services in {name}
            </h2>
            <div className="mt-8 grid grid-cols-1 gap-8 min-[901px]:grid-cols-2">
              {/* Left — tall card with image placeholder */}
              <div className="flex h-full flex-col rounded-[8px] bg-white p-6 shadow-soft">
                <div className="flex aspect-video w-full items-center justify-center rounded-[6px] bg-cream-100 text-[12px] font-bold uppercase tracking-[0.15em] text-navy-800/50">
                  Image Placeholder
                </div>
                <h3 className="mt-5 font-display text-[20px] font-bold text-brand-600">
                  {mostRequested[0].title}
                </h3>
                <p className="mt-3 leading-relaxed text-navy-800">{mostRequested[0].body}</p>
              </div>

              {/* Right — remaining cards stacked with a gap */}
              {mostRequested.length > 1 && (
                <div className="flex flex-col gap-8">
                  {mostRequested.slice(1).map((item, i) => (
                    <div key={i} className="rounded-[8px] bg-white p-6 shadow-soft">
                      <h3 className="font-display text-[20px] font-bold text-brand-600">{item.title}</h3>
                      <p className="mt-3 leading-relaxed text-navy-800">{item.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ============== 6. MID CTA ============== */}
      {db.midCtaText && (
        <section className="bg-navy-800 py-10">
          <div className={`${CONTAINER} flex flex-col items-center gap-5 text-center md:flex-row md:justify-between md:text-left`}>
            <p className="max-w-[720px] text-[18px] font-semibold text-cream-100">{db.midCtaText}</p>
            <PhoneCta href={settings.phoneHref} label={phoneLabel} className="flex-shrink-0" />
          </div>
        </section>
      )}

      {/* ============== 7. WHY [CITY] HOMEOWNERS CALL US FIRST ============== */}
      {(whyPoints.length > 0 || city.whyFallback) && (
        <section className="bg-white py-[70px]">
          <div className={CONTAINER}>
            <h2 className="font-display text-[28px] font-bold uppercase leading-tight text-brand-600 md:text-[32px]">
              Why {name} Homeowners Call Us First
            </h2>
            {whyPoints.length > 0 ? (
              <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-3">
                {whyPoints.map((pt, i) => (
                  <div key={i}>
                    <h3 className="font-display text-[19px] font-bold text-brand-600">{pt.heading}</h3>
                    <p className="mt-3 leading-relaxed text-navy-800">{pt.body}</p>
                  </div>
                ))}
              </div>
            ) : (
              city.whyFallback && (
                <div className="mt-6 max-w-[820px]">
                  {city.whyFallback.heading && (
                    <h3 className="font-display text-[20px] font-bold text-brand-600">
                      {city.whyFallback.heading}
                    </h3>
                  )}
                  <p className="mt-3 leading-relaxed text-navy-800">{city.whyFallback.body}</p>
                </div>
              )
            )}
          </div>
        </section>
      )}

      {/* ============== 8. VIDEO SECTION (placeholder — no script) ============== */}
      {/* Brief 68 Fix 6 — public heading + intro stay; the production `video_script`
          is never rendered. A "coming soon" placeholder stands in for the embed. */}
      {db.videoHeading && (
        <section className="bg-cream-100 py-[70px]">
          <div className={CONTAINER}>
            <h2 className="font-display text-[26px] font-bold uppercase leading-tight text-brand-600 md:text-[30px]">
              {db.videoHeading}
            </h2>
            {db.videoIntro && (
              <p className="mt-4 max-w-[820px] leading-relaxed text-navy-800">{db.videoIntro}</p>
            )}
            <div className="mt-6 flex aspect-video w-full max-w-[820px] flex-col items-center justify-center gap-4 rounded-[8px] bg-cream-50">
              <svg
                viewBox="0 0 64 64"
                className="h-16 w-16 text-brand-600"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                aria-hidden="true"
              >
                <circle cx="32" cy="32" r="30" />
                <path d="M26 20 L46 32 L26 44 Z" fill="currentColor" stroke="none" />
              </svg>
              <p className="font-display text-[14px] font-medium uppercase tracking-[0.15em] text-navy-800">
                Video — Coming Soon
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ============== 9. REVIEWS ============== */}
      <section className="bg-white py-[70px]">
        <div className={CONTAINER}>
          <h2 className="font-display text-[28px] font-bold uppercase leading-tight text-brand-600 md:text-[32px]">
            Real {name} Reviews
          </h2>
          {reviews.length > 0 ? (
            <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {reviews.map((rev, i) => (
                <div key={i} className="flex flex-col rounded-[8px] border border-cream-200 bg-cream-50 p-6 shadow-soft">
                  <Stars />
                  <p className="mt-3 flex-1 text-[15px] leading-relaxed text-navy-800">{rev.text}</p>
                  <div className="mt-4 flex items-center gap-2">
                    <ReviewerIcon />
                    <p className="font-bold text-navy-800">{rev.name}</p>
                  </div>
                  {rev.gbp_url && (
                    <a
                      href={rev.gbp_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 text-[13px] font-semibold text-accent-500 hover:text-brand-600"
                    >
                      View on Google →
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            city.reviewsElfsightId && (
              <div className="mt-8">
                <div className={`elfsight-app-${city.reviewsElfsightId}`} data-elfsight-app-lazy />
              </div>
            )
          )}
        </div>
      </section>

      {/* ============== 10. FAQ ============== */}
      {faqs.length > 0 && (
        <section className="bg-cream-100 py-[40px]">
          <div className={CONTAINER}>
            <h2 className="font-display text-[28px] font-bold uppercase leading-tight text-brand-600 md:text-[32px]">
              Frequently Asked Questions
            </h2>
            <FaqAccordion faqs={faqs} />
          </div>
        </section>
      )}

      {/* ============== 11. NO DRIP CLUB ============== */}
      {/* Brief 68 Fix 8 — the city-specific `ndc_intro` replaces the generic body
          copy inside the character module rather than sitting above it. */}
      <section className="bg-white py-[40px]">
        <div className={CONTAINER}>
          <NoDripClubSection body={db.ndcIntro || NDC_DEFAULT_BODY} />
        </div>
      </section>

      {/* ============== 12. FINAL CTA ============== */}
      {db.finalCtaHeading && (
        <section className="bg-brand-600 py-[70px] text-cream-100">
          <div className={`${CONTAINER} text-center`}>
            <h2 className="font-display text-[28px] font-bold uppercase leading-tight md:text-[34px]">
              {db.finalCtaHeading}
            </h2>
            {db.finalCtaBody && (
              <p className="mx-auto mt-4 max-w-[760px] leading-relaxed text-cream-100/90">
                {db.finalCtaBody}
              </p>
            )}
            <div className="mt-7">
              <PhoneCta href={settings.phoneHref} label={phoneLabel} />
            </div>
          </div>
        </section>
      )}
    </>
  );
}
