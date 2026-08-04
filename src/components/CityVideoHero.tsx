import Link from 'next/link';
import { Phone } from 'lucide-react';
import type { CityContent } from '@/lib/content/cities/evanston';

/**
 * v2 city-page video hero — theme `.test2-hero` (city.css 144–187): a full-
 * viewport autoplay video with a bottom-aligned two-column content row.
 *
 * Fidelity notes (match live, not a redesign):
 * - EXACTLY ONE `<h1>`: the city heading line. The live WordPress page renders
 *   three headline lines as three `<h1>`s (brief-09 §1); that is a WordPress
 *   defect, not a design decision, and it is deliberately NOT reproduced — one
 *   H1 per page is the rule, and a linked phone number is never a heading. The
 *   other two lines are `<p>`s carrying the identical classes, so the rendering
 *   is pixel-identical to the three-H1 version (verified at 1440/1280/900/375).
 *   Same fix as the homepage hero (Brief 132).
 * - Line 1 and the CTA line render LARGER (50px) than the closing line (40px).
 *   That mirrors what the live CSS actually produces — the theme's
 *   `.l h1:nth-child(2)` selector hits the first heading because the badge
 *   `<img>` is `:nth-child(1)` — and is the opposite of brief-09's literal
 *   40/50 reading. The sizes are set by the Tailwind classes below, not by any
 *   nth-child rule, so they are unaffected by the tag change.
 * - The "MAKE A GOOD CALL!" link is WHITE in the theme even though it's the CTA
 *   (`.l h1 a { color:#fff }`) — kept white per theme.
 * - Evanston passes `contact: null` (no right-column phone button); Northbrook/
 *   Elmhurst supply one to render the Cerulean `.test2-hero-contact`.
 */
export default function CityVideoHero({ hero }: { hero: CityContent['hero'] }) {
  return (
    <section className="test2-hero relative w-full h-auto min-[781px]:h-screen overflow-hidden bg-navy-900">
      <video
        className="absolute inset-0 z-[1] h-full w-full object-cover"
        src={hero.video.src}
        poster={hero.video.poster}
        loop
        autoPlay
        muted
        playsInline
      />

      <div className="test2-hero-body relative z-[2] flex h-full items-center pt-[110px] min-[781px]:items-end min-[781px]:pt-0">
        <div className="test2-hero-contents mx-auto flex w-[90%] flex-col mb-[40px] min-[781px]:flex-row min-[781px]:mb-[100px] min-[1281px]:mb-[150px]">
          {/* Left column (50%) */}
          <div className="l relative mb-10 w-full min-[781px]:mb-0 min-[781px]:mr-[15px] min-[781px]:w-1/2">
            {/* 24/7 badge — absolutely positioned, overlapping the H1 top-left. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={hero.badge.src}
              alt={hero.badge.alt}
              className="absolute left-0 top-0 -ml-[10px] -mt-[30px] h-[80px] w-[80px] min-[781px]:-ml-[35px] min-[781px]:-mt-[33px] min-[781px]:h-[100px] min-[781px]:w-[100px]"
            />
            {/* The page's single H1 — the city heading, nothing else. */}
            <h1 className="font-display font-bold uppercase leading-[1.05] tracking-tight text-white text-[26px] min-[781px]:text-[30px] min-[1281px]:text-[50px]">
              {hero.headingLine1}
            </h1>
            {/* CTA line — same classes as the H1 above, so it keeps the 50px
                size and sits on the next line exactly as the old `<br />` did
                (both are block boxes with margin 0 and the same line-height). */}
            <p className="font-display font-bold uppercase leading-[1.05] tracking-tight text-white text-[26px] min-[781px]:text-[30px] min-[1281px]:text-[50px]">
              <Link href={hero.ctaHref} className="text-white transition-colors hover:text-brand-400">
                {hero.ctaLabel}
              </Link>
            </p>
            <p className="mt-[15px] font-display font-bold uppercase leading-[1.05] tracking-tight text-white text-[26px] min-[781px]:text-[30px] min-[1281px]:text-[40px]">
              {hero.headingLine2}
            </p>
          </div>

          {/* Right column (50%) */}
          <div className="r flex w-full flex-col min-[781px]:w-1/2">
            <p className="intro font-display font-medium text-white text-[4.5vw] leading-[26px] min-[391px]:text-[4vw] min-[581px]:text-[2.3vw] min-[781px]:text-[20px] min-[781px]:leading-[30px] min-[1281px]:text-[30px] min-[1281px]:leading-[35px]">
              {hero.intro}
            </p>
            {hero.contact && (
              <Link
                href={hero.contact.href}
                className="test2-hero-contact mt-[20px] inline-flex w-max items-center rounded-[10px] bg-accent-500 px-[30px] py-[10px] text-white shadow-[0_0_10px_rgba(0,0,0,0.25)] transition-colors hover:bg-brand-600 min-[781px]:mt-[40px]"
              >
                <span className="mr-[10px] flex h-5 w-5 items-center justify-center">
                  <Phone className="h-5 w-5" strokeWidth={2.5} />
                </span>
                <span>{hero.contact.phone}</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
