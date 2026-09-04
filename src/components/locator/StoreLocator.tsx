import StoreLocatorPanel from '@/components/locator/StoreLocatorPanel';
import {
  buildLocatorRegions,
  LOCATOR_ALL_OFFICES,
  LOCATOR_COPY,
  orderLocatorOffices,
  type LocatorRegionView,
} from '@/lib/content/locator';
import type { CmsOffice } from '@/lib/cms/offices';

interface Props {
  /** The CMS offices, `getGlobalSettingsCached().offices`. All 15 render. */
  offices: CmsOffice[];
  /** `find_us_heading` from the CMS, or `HOME.findUs.heading`. Rendered as the `<h2>`. */
  heading: string;
  /** `find_us_body` paragraphs from the CMS, or `HOME.findUs.body`. */
  body: string[];
  /** Canonical display number + href, from global settings. Exactly one CTA uses them. */
  phone: string;
  phoneHref: string;
  /** Page-specific classes for the outer `<section>` band. */
  className?: string;
  /** Page-specific classes for the inner width wrapper. */
  contentClassName?: string;
}

/**
 * "WHERE TO FIND US" — the homepage store locator. Brief 171, Track D1.
 *
 * ─── What it replaced, and why ─────────────────────────────────────────────
 * This section used to be `<LocationsSection>` wrapping `<LocationsMap>`: a raw
 * Google Maps iframe whose query was a keyword search for
 * "J. Blanton Plumbing, Illinois". It rendered NONE of the 15 offices, it was
 * the single heaviest third-party request on the page, and — since Columbus
 * Integration Brief 04 put a two-region chooser directly above it — its
 * Chicagoland-only copy contradicted the section above it on the site's
 * highest-traffic page.
 *
 * `LocationsSection` and `LocationsMap` are UNTOUCHED: eight other pages
 * (`emergency-plumbing` and the six `/services/*` category pages, plus
 * `services/[slug]`) still render them verbatim. Migrating those is a separate
 * brief; this component is written so that migration is a prop change.
 *
 * ─── Four rules this section is built around ───────────────────────────────
 *
 * 1. NO NEW JSON-LD. `LocalBusinessSchema.tsx` already emits one
 *    `PlumbingBusiness` node per CMS office, mounted once in `Footer.tsx`, which
 *    renders on every page — so all 15 offices are ALREADY marked up on the
 *    homepage. A second graph for the same businesses would be duplicate
 *    structured data. The visible UI is the whole deliverable.
 *
 * 2. NO GEOLOCATION, NO IP LOOKUP, NO REGION-CONDITIONAL RENDERING. Same rule as
 *    `RegionChooser`: no `navigator.geolocation`, no `headers()` read, no branch
 *    on inferred location anywhere in this component or the panel. Googlebot
 *    crawls from one location, so a geo-branch would mean it only ever sees half
 *    the offices, and serving different content by inferred location edges
 *    toward cloaking.
 *
 * 3. ALL 15 OFFICES ARE IN THE SERVER-RENDERED HTML on first paint — every name
 *    and every address, as text. The panel is a client component because it
 *    holds search state, but nothing about the list waits for JavaScript. That
 *    is why it is ONE FLAT RUN of all fifteen and not a tabbed or paged control:
 *    anything that renders conditionally would drop offices out of the HTML
 *    entirely.
 *
 *    ⚠️ There are NO LINKS left in a row. Marketing's review removed the
 *    "Get Directions" and "View this location" pair, and then removed the
 *    address's link out to Google Maps as well — every part of a row now selects
 *    the office and centres the embedded map instead of navigating anywhere. So
 *    the NAP text here is crawlable but no link is, and in particular the
 *    per-row `/{slug}` link to each office's own city page is gone.
 *
 *    The homepage still links all 15 office pages through `Footer.tsx`'s office
 *    directory, which renders on every page of the site, so the internal-linking
 *    path to `/{slug}` survives — but it survives THERE, not here. Do not delete
 *    the footer directory without restoring a link in this section.
 *
 * 4. NO MAP API KEY, NO MAP SDK, NO BILLING ACCOUNT. The map is the keyless
 *    classic Google embed, the same URL shape `LocationsMap.tsx` used, and
 *    nothing was added to `.env.local`.
 *
 *    ⚠️ What this rule USED to say — "zero third-party requests before a click" —
 *    no longer holds, deliberately. The section shipped with a static greyscale
 *    OpenStreetMap image and a "Find an office" button that created the embed on
 *    click. Marketing dropped that on 2026-09-03 once the saving was measured:
 *    the iframe is `loading="lazy"` and this is the last band before the footer,
 *    so it never fires in a Lighthouse run and only costs a real visitor
 *    anything once they have scrolled to it and are looking at it. See the note
 *    on the `map` block in `StoreLocatorPanel.tsx` for the figures. Google can
 *    now set cookies on scroll rather than on click, which matters if this site
 *    ever needs consent gating.
 *
 * ─── Heading ───────────────────────────────────────────────────────────────
 * An `<h2>`; the homepage has exactly one `<h1>` (the hero) and Brief 132
 * removed the extras. `text-brand-600` and the explicit font-size are REQUIRED,
 * not decorative: `globals.css` `@layer base` sets `h1..h5 { text-navy-800 }`
 * and Tailwind Preflight makes heading `font-size: inherit`, so an unstyled `h2`
 * renders navy at the wrapper's 16px (Briefs 162/163). Classes copied from
 * `RegionChooser` so the two sections match. Office names inside the list are
 * `<h3>`.
 *
 * No class named `contents` appears here or in the panel — Tailwind ships a
 * `.contents` (`display: contents`) utility that collapses a column to 0x0
 * (CLAUDE.md gotcha 1). The width wrapper is `find-us-contents` only because
 * the old section used that hook; it carries no `contents` utility.
 */
export default function StoreLocator({
  offices,
  heading,
  body,
  phone,
  phoneHref,
  className,
  contentClassName,
}: Props) {
  /* Regions are built from the CMS array as-is (order is irrelevant — they only
     collect slugs); the LIST gets the pinned order. */
  const regions: LocatorRegionView[] = buildLocatorRegions(offices);
  const ordered = orderLocatorOffices(offices);

  return (
    <section aria-labelledby="home-where-to-find-us" className={className}>
      <div className={contentClassName}>
        <h2
          id="home-where-to-find-us"
          className="font-display font-bold text-brand-600 text-[28px] md:text-[32px] tracking-tight leading-none"
        >
          {heading}
        </h2>

        {body.map((para, i) => (
          <p
            key={i}
            className={`max-w-2xl font-sans text-[19px] leading-[30px] text-navy-800 max-[1280px]:text-[16px] max-[770px]:leading-[26px] ${
              i === 0 ? 'mt-3' : 'mt-2'
            }`}
          >
            {para}
          </p>
        ))}

        {/* `offices` is passed flat — the list is one run of all fifteen, with
            Northbrook, Columbus and Evanston pinned to the top by
            `orderLocatorOffices` and everything after them in CMS order, so
            Marketing still controls the tail by dragging rows in
            /admin/global-settings. `regions` carries only slugs, so each office
            record crosses the boundary exactly once. */}
        <StoreLocatorPanel
          offices={ordered}
          regions={regions}
          allOffices={LOCATOR_ALL_OFFICES}
          copy={LOCATOR_COPY}
          phone={phone}
          phoneHref={phoneHref}
        />
      </div>
    </section>
  );
}
