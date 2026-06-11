import { Phone } from 'lucide-react';
import type { Office } from '@/lib/content/cities/types';
import { SITE } from '@/lib/site';

/**
 * Coverage Area city hero — theme `.city-page-hero` (page-city.php 415–463;
 * city.css 121–185). A horizontal split: city image (45%) on the left, a
 * Carmine wrench-pattern content column (55%) on the right holding the
 * centered `.w` block (H1, reviews widget, NAP, phone CTA, optional callout).
 *
 * Background is handled entirely in CSS (globals.css `.city-page-hero
 * .hero-contents`) — Carmine + tiled Wrench Filled Red BG.png, matching the
 * global hero pattern. No wrench overlay <img> needed here.
 *
 * `hero-contents` avoids Tailwind's `.contents { display:contents }` collision
 * (CLAUDE.md gotcha #1) that would collapse the right panel to 0×0.
 */
export interface CityHeroProps {
  /** Display name, e.g. "Elgin" (used in alt text + NAP label). */
  cityName: string;
  /** H1 text, title-case ("Elgin Plumber"); CSS uppercases it. */
  h1: string;
  /** Resolved hero image URL. */
  heroImageUrl: string;
  /** The dispatching office (NAP link + address). */
  office: Office;
  /** Google Business Profile label suffix, e.g. "Elgin". */
  gbpLabel: string;
  /** Areas-served region label. */
  area: string;
  /** Elfsight widget UUID for the hero reviews pill. */
  elfsightHeroId: string;
  /** Optional hero callout (IThin). */
  callout?: string;
}

export default function CityHero({
  cityName,
  h1,
  heroImageUrl,
  office,
  gbpLabel,
  area,
  elfsightHeroId,
  callout,
}: CityHeroProps) {
  return (
    <div className="city-page-hero">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="city-page-image" src={heroImageUrl} alt={h1} loading="eager" />

      {/* hero-contents avoids Tailwind's `.contents { display:contents }` collision */}
      <div className="hero-contents">
        <div className="w">
          <h1>{h1}</h1>

          {/* Google Reviews widget — origin-restricted on localhost, works on production */}
          <div className="reviews">
            <div className={`elfsight-app-${elfsightHeroId}`} />
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
