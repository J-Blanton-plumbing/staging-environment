import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { REGIONS } from '@/lib/content/locations-regions';
import { HOME } from '@/lib/content/home';

/**
 * Homepage region chooser — "Areas we service".
 * Columbus Integration Brief 04, Track B.
 *
 * ─── Why this exists ───────────────────────────────────────────────────────
 * Brief 02 registered 138 Ohio areas and Brief 03 gave them a region page, but
 * the homepage still said nothing about Ohio anywhere: the only "where we work"
 * block was `LocationsSection` ("FIND US"), whose copy is Chicagoland-only. On
 * the site's highest-traffic page, a visitor in Dublin or Westerville had no
 * signal that J. Blanton serves them and no link to the page that proves it.
 * This band is that signal, and the two internal links are how Ohio's 138 area
 * pages get discovered from the homepage.
 *
 * ─── Three hard rules, all deliberate ──────────────────────────────────────
 *
 * 1. NO GEOLOCATION, NO IP LOOKUP, NO REGION-CONDITIONAL RENDERING. Both
 *    columns render for every visitor on every request. There is no
 *    `navigator.geolocation`, no IP/header sniffing, no `headers()` read and no
 *    branch on region anywhere in this file — and none may be added. Googlebot
 *    crawls from one location, so a geo-branch would mean it only ever sees half
 *    the site, and serving different content by inferred location edges toward
 *    cloaking. This is not a performance optimisation to revisit later.
 *
 * 2. This is a SERVER COMPONENT with real `<a href>` links. `next/link` renders
 *    a genuine anchor into the server HTML, so both region URLs are crawlable
 *    without JavaScript. Do not convert this to a client component, a `<button>`
 *    + `router.push`, or an `onClick` handler.
 *
 * 3. The heading is an `<h2>`. The homepage has exactly one `<h1>` — the hero
 *    headline — and Brief 132 already removed two extra ones from that hero. Do
 *    not "improve" this to an h1.
 *
 * ─── Numbers are counted, never typed ──────────────────────────────────────
 * `REGIONS` derives both city counts from `CITY_REGISTRY` (see
 * `locations-regions.ts`), so registering a city updates this band, the
 * /locations hub and the region pages together and they cannot disagree.
 *
 * ─── Styling ───────────────────────────────────────────────────────────────
 * Tailwind utilities inline, because the homepage has NO scoped CSS file — it is
 * the one page styled entirely in JSX (plus shared classes from `globals.css`).
 * Brief 04 named a "homepage scoped CSS" target that does not exist; creating
 * one would mean a stylesheet nothing imports. See the report.
 *
 * Note the class names are `home-region-*`. `.region-card` / `.region-cards`
 * already exist in `locations.css`, scoped under `.locations-page`; the prefix
 * keeps these independent of that even if the two ever load together.
 *
 * ─── The skyline band ──────────────────────────────────────────────────────
 * Each card opens with `region.image` (2:1, pre-cropped, 1000x500 WebP in
 * `public/images/`). It is a full-bleed band, so the card itself carries NO
 * padding any more — `overflow-hidden` + `rounded-lg` clip the photo to the
 * card's top corners and a nested `p-7 / p-9` wrapper holds the text. Moving
 * the padding onto that wrapper is what lets the photo touch all three edges;
 * putting it back on the card would inset the photo and reintroduce a visible
 * navy frame on three sides.
 *
 * `flex-1` on that wrapper (not on the card) is what keeps `mt-auto` on the CTA
 * working, so both CTAs stay bottom-aligned and the two cards stay the same
 * height — the parity rule in point 3 above.
 *
 * Both photos are decorative-adjacent but named places, so they get real alt
 * text from the data file, not `alt=""`.
 *
 * No class named `contents` appears here. Tailwind ships a `.contents`
 * (`display:contents`) utility that collapses a column to 0×0, which has bitten
 * every page cloned from the hero template (CLAUDE.md gotcha 1). Nothing in this
 * file is cloned from the hero, and the grid wrapper is `home-region-grid`.
 */
export default function RegionChooser({ className }: { className?: string }) {
  const copy = HOME.regions;

  return (
    <section
      aria-labelledby="home-areas-we-service"
      className={['home-region-chooser', className].filter(Boolean).join(' ')}
    >
      {/* Heading treatment matches this section's other headings (SERVICES,
          WHY J. BLANTON, KNOWLEDGE HUB): Carmine, Industry bold, 28/32px.
          `text-brand-600` and the explicit size are REQUIRED, not decorative —
          globals.css `@layer base` sets `h1..h5 { text-navy-800 }` and Tailwind
          Preflight makes heading font-size `inherit`, so an unstyled h2 here
          would render navy at the wrapper's 16px (Brief 162/163). */}
      <h2
        id="home-areas-we-service"
        className="font-display font-bold text-brand-600 text-[28px] md:text-[32px] tracking-tight leading-none"
      >
        {copy.heading}
      </h2>
      <p className="mt-3 max-w-2xl font-sans text-[19px] leading-[30px] text-navy-800 max-[1280px]:text-[16px] max-[770px]:leading-[26px]">
        {copy.intro}
      </p>

      {/* Two equal columns on desktop, stacked below 900px — the same 900px
          breakpoint the services block uses for its accordion/card-row split.
          `grid-cols-2` with `items-stretch` (grid's default) is what keeps the
          two cards the same height, so neither region reads as the secondary
          one. Chicagoland is the far bigger market; Brief 04's rule is that a
          visitor from Central Ohio must not be able to tell that from here. */}
      <div className="home-region-grid mt-8 grid grid-cols-1 gap-6 min-[900px]:grid-cols-2 min-[900px]:gap-[30px]">
        {REGIONS.map((region) => {
          const support = copy.supportTemplate
            .replace('{tenure}', region.tenure)
            .replace('{count}', String(region.cities.length));

          return (
            <div
              key={region.key}
              className="home-region-card flex flex-col overflow-hidden rounded-lg bg-navy-800 shadow-soft"
            >
              {/* Full-bleed 2:1 skyline band. `w-full h-auto` with the intrinsic
                  1000x500 keeps the ratio without a wrapper, and `sizes` tells
                  Next the card is half the viewport once the grid goes 2-up at
                  900px. Lazy by default — this band sits well below the fold. */}
              <Image
                src={region.image.src}
                alt={region.image.alt}
                width={region.image.width}
                height={region.image.height}
                sizes="(min-width: 900px) 50vw, 100vw"
                className="h-auto w-full object-cover"
              />

              <div className="flex flex-1 flex-col p-7 min-[900px]:p-9">
                {/* h3, under the section's h2 — the band contributes no h1 and no
                    second h2 beyond the one heading above. */}
                <h3 className="font-display text-[26px] font-bold leading-none text-cream-100 min-[900px]:text-[30px]">
                  {region.label}
                </h3>
                {/* `supportTemplate` already opens with the tenure ("30+ years,
                    248 communities"), which is Brief 04's specified support line.
                    An eyebrow above the h3 repeating `region.tenure` was tried and
                    removed — it rendered the tenure twice per card. */}
                <p className="mt-3 font-sans text-[17px] leading-[26px] text-cream-100">
                  {support}
                </p>
                <p className="mt-1 font-sans text-[15px] leading-[24px] text-cream-200">
                  {region.counties}
                </p>

                {/* `.link-button` is the canonical section CTA (globals.css,
                    brief-113 A1) — the same pill as the "VIEW PAGE" button
                    directly above this band. It carries NO utilities of its own:
                    brief-113's hard rule is that a section CTA never gets a
                    colour, shape or spacing utility, and `.link-button` already
                    sets its own `height` and `padding`, so spacing goes on this
                    wrapper instead. `mt-auto` bottom-aligns both CTAs, keeping the
                    two cards symmetrical when the counties lines wrap to
                    different heights. */}
                <div className="mt-auto pt-7 min-[900px]:pt-8">
                  <Link href={region.href} className="link-button">
                    {copy.ctaLabels[region.key]}
                    <ArrowRight className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
