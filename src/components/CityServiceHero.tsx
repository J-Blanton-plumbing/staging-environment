import { Phone } from 'lucide-react';
import type { Office } from '@/lib/content/cities/types';
import { SITE } from '@/lib/site';

/**
 * Coverage Area city-SERVICE hero — brief-21 §1b.
 *
 * Mirrors the Coverage Area city hero (CityHero / brief-10 §1) in layout —
 * same dark right column with wrench-pattern overlay — but with:
 *  - Left: service-specific hero image (object-contain, 45%) instead of a city image.
 *  - H1: "[Service] in [City]" instead of "{City} Plumber".
 *  - No Elfsight reviews pill (not present on live city-service pages).
 *
 * The NAP block, phone button, and callout are identical to CityHero.
 * CSS reuses `.city-page-hero` from globals.css (same responsive splits).
 * When `serviceHeroImage` is empty, a Cream #F9F3EC background is shown
 * as a placeholder (CDN URLs unconfirmed at build time — flagged in brief).
 */
export interface CityServiceHeroProps {
  serviceTitle: string;
  cityName: string;
  serviceHeroImage: string;
  office: Office;
  gbpLabel: string;
  area: string;
  callout?: string;
}

export default function CityServiceHero({
  serviceTitle,
  cityName,
  serviceHeroImage,
  office,
  gbpLabel,
  area,
  callout,
}: CityServiceHeroProps) {
  const h1 = `${serviceTitle} in ${cityName}`;

  return (
    <div className="city-page-hero" style={{ height: '560px' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="city-page-image"
        src={serviceHeroImage || '/images/img_hydro-jetting.webp'}
        alt={h1}
        loading="eager"
        style={{ objectFit: 'cover', height: '100%' }}
      />

      <div className="hero-contents">
        <div className="w">
          <h1>{h1}</h1>

          <div className="nap">
            <div className="row">
              <p>Local Office:</p>
              <a target="_blank" rel="noreferrer" href={office.url}>
                J. Blanton Plumbing, Sewer &amp; Drain - {gbpLabel}
              </a>
            </div>
            <p>
              <span>Address: </span>
              {office.address}
            </p>
            <p>
              <span>Areas Served: </span>
              {area}
            </p>
            <p>
              <span>Hours Open: </span>24 hours
            </p>
            <div className="row">
              <p>Phone:</p>
              <a href={SITE.phoneHref}>(773) 724-9272</a>
            </div>
          </div>

          <a
            className="hero-link-button mt-[15px] inline-flex w-max items-center gap-2 rounded-[10px] bg-accent-500 px-[30px] py-[10px] text-white shadow-[0_0_10px_rgba(0,0,0,0.25)] transition-colors hover:bg-brand-600"
            href={SITE.phoneHref}
          >
            <Phone className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
            <span>{SITE.phone}</span>
          </a>

          {callout && <p className="callout">{callout}</p>}
        </div>
      </div>
    </div>
  );
}
