import { Phone } from 'lucide-react';
import type { Office } from '@/lib/content/cities/types';
import { SITE } from '@/lib/site';

/**
 * Coverage Area city hero — theme `.city-page-hero` (page-city.php 415–463;
 * city.css 121–185). A horizontal split: city image (45%) on the left, a dark
 * wrench-pattern content column (55%) on the right holding the centered `.w`
 * block (H1, reviews pill, NAP, phone CTA, optional callout).
 *
 * The 45/55 → 50/50 → 55/45 responsive splits and the vw-based type scale live
 * in globals.css under `.city-page-hero` (ported from city.css 442–565). The
 * `.contents` column gets a Midnight backstop behind the (dark) wrench pattern
 * so the white text is always legible if the CDN image is slow/blocked.
 *
 * Reviews + callout are gated; the Elfsight reviews widget is a styled
 * placeholder (not faked — brief §1 / Brief 09 §6).
 */
export interface CityHeroProps {
  /** Display name, e.g. "Elgin" (used in alt text + NAP label). */
  cityName: string;
  /** H1 text, title-case ("Elgin Plumber"); CSS uppercases it. */
  h1: string;
  /** Resolved hero image URL. */
  heroImageUrl: string;
  /** Wrench-pattern overlay URL. */
  wrenchPattern: string;
  /** The dispatching office (NAP link + address). */
  office: Office;
  /** Google Business Profile label suffix, e.g. "Elgin". */
  gbpLabel: string;
  /** Areas-served region label. */
  area: string;
  /** Optional hero callout (IThin). */
  callout?: string;
}

export default function CityHero({
  cityName,
  h1,
  heroImageUrl,
  wrenchPattern,
  office,
  gbpLabel,
  area,
  callout,
}: CityHeroProps) {
  return (
    <div className="city-page-hero">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="city-page-image" src={heroImageUrl} alt={h1} loading="eager" />

      <div className="contents">
        {/* Wrench-pattern overlay (z-1) behind the content (z-2). Decorative. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="wrench" src={wrenchPattern} alt="" aria-hidden="true" />

        <div className="w">
          <h1>{h1}</h1>

          {/* Elfsight reviews pill — placeholder, wiring pending (not faked). */}
          <div className="reviews">
            <div className="px-4 py-2 text-center text-[13px] font-semibold text-brand-600">
              ★ Google Reviews — widget loads here
            </div>
          </div>

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
