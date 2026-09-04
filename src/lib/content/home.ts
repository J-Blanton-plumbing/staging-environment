/**
 * Editable copy for the home page (`app/page.tsx`).
 * Structured for CMS-readiness (audit ref C-02/C-03): prose lives here, not in JSX.
 * Empty strings are unwritten copy (former inline TODOs) and render as nothing today.
 */
import type { RegionDef } from '@/lib/content/locations-regions';

export interface HomeContent {
  hero: {
    heading: string;
    headingCta: string;
    headingTagline: string;
    intro: string;
  };
  services: {
    heading: string;
    intro: string;
  };
  /**
   * The homepage region chooser — Columbus Integration Brief 04, Track B.
   *
   * Only the LABELS live here. Every number the band shows (the city counts) is
   * counted from `CITY_REGISTRY` at render time via `REGIONS`, never typed —
   * the same rule `locations-regions.ts` enforces for the /locations hub.
   */
  regions: {
    /**
     * Section `<h2>`. Marketing-locked wording (Brief 04) — do not reword.
     * The homepage has exactly one `<h1>` (the hero headline); this is an h2.
     */
    heading: string;
    /** One-line sub-head under the heading. */
    intro: string;
    /**
     * Support line under each region name, e.g. "30+ years, 248 communities".
     * `{tenure}` comes from `RegionDef.tenure` and `{count}` from
     * `RegionDef.cities.length` — both derived, so neither may be hardcoded.
     */
    supportTemplate: string;
    /**
     * CTA label per region, keyed off `RegionDef['key']` so adding a third
     * region becomes a TYPE ERROR here rather than a card that renders no CTA.
     */
    ctaLabels: Record<RegionDef['key'], string>;
  };
  tiktok: {
    /**
     * Brief 95 (A.7): intentionally static — no DB column/editor field. This
     * headline rarely changes; adding a column is out of proportion to a
     * cleanup brief. Revisit if per-page TikTok headlines are wanted later.
     */
    headline: string;
  };
  why: {
    heading: string;
    body: string[];
  };
  noDripClub: {
    body: string;
  };
  knowledgeHub: {
    heading: string;
    intro: string;
    featuredSlugs: string[];
  };
  findUs: {
    heading: string;
    body: string[];
  };
}

export const HOME: HomeContent = {
  hero: {
    heading: 'Plumbing Experts',
    headingCta: 'Make a Good Call!',
    /**
     * Columbus Integration Brief 04, Track A — the homepage trust statement.
     *
     * Was "Proudly Serving Chicago and Suburbs for Over 30 Years". This is the
     * only trust claim the homepage makes, and it asserted a Chicago-only
     * service area on the page that now links to Ohio. Marketing supplied the
     * replacement VERBATIM and locked it: extend, do not dilute — "Chicagoland"
     * and "30+ years" stay, Ohio is ADDED, and no vague multi-market phrase
     * replaces either.
     *
     * The element is `uppercase`, so this renders "30+ YEARS IN CHICAGOLAND.
     * NOW ALSO SERVING CENTRAL OHIO." — casing is CSS, the copy is as approved.
     *
     * 24/7 availability is carried by the `/images/247.webp` badge overlapping
     * this block's headline, not by this string. Brief 04 also asked for a
     * licence number here: no licence number exists anywhere in this repo, in
     * `site.ts`, or on the live homepage, so there is nothing to source and one
     * must not be invented for a regulatory credential — flagged for Marketing.
     */
    headingTagline: '30+ years in Chicagoland. Now also serving Central Ohio.',
    intro:
      'Home is where life happens, but unexpected disruptions like a burst pipe or a kitchen flood can shatter the peace. When the unexpected strikes, trust J. Blanton Plumbing to be there.',
  },
  services: {
    heading: 'SERVICES',
    intro:
      'Our team of tenacious plumbers are always ready to leap into action to save your day, no matter how light or severe the situation.',
  },
  regions: {
    // Marketing-locked (Brief 04). Do not reword either of the next two.
    heading: 'Areas we service',
    intro: 'Choose your region to see every city and neighborhood we cover.',
    supportTemplate: '{tenure}, {count} communities',
    ctaLabels: {
      chicagoland: 'See Chicagoland areas',
      columbus: 'See Central Ohio areas',
    },
  },
  tiktok: {
    headline: 'J Blanton Plumbing — Turning Bad Calls to Good Calls',
  },
  why: {
    heading: 'WHY J. BLANTON',
    body: [
      "At J Blanton, we understand the importance of an owner's home. We know that when disaster strikes, you need more than just a plumber; you need a problem solver who can bring fast relief to unexpected chaos.",
      'For more than 30 years, our professionals have raced through heat, rain, snow, and hail to restore order and peace back into the homes of many Chicagoland families.',
    ],
  },
  noDripClub: {
    body:
      "There are Good Calls—and then there's the No Drip Club. Members enjoy significant annual savings on home checkups, emergency repairs, and unlock exclusive perks, including VIP treatment whenever they call for service.",
  },
  knowledgeHub: {
    heading: 'KNOWLEDGE HUB',
    intro: "Check out the knowledge hub for FAQ's and helpful tips on all things plumbing.",
    featuredSlugs: [
      'prepare-your-home-plumbing-for-the-chicago-cold-snap',
      'brown-friday-plumbing-drain-clog-emergency',
      'sewer-replacement-old-homes-chicagoland',
    ],
  },
  /**
   * Brief 171, Track E2 — the store-locator section's heading and intro.
   *
   * Was "FIND US" over two Chicagoland-only lines ("We've proudly served the
   * Chicagoland area for 30+ years." / "Contact us or use the site map to find
   * the location that's nearest to you."). Both were live content defects by the
   * time this brief landed: the copy asserted a Chicago-only service area
   * directly under `RegionChooser`, which advertises two regions on the same
   * page, and "use the site map" described a block that showed no locations at
   * all — a Google iframe keyword-searching for the company in Illinois.
   *
   * ⚠️ FALLBACK ONLY. `page.tsx` reads `find_us_heading` / `find_us_body` from
   * the `main_pages` `home` row and a non-empty DB value ALWAYS wins, so editing
   * these two values changes nothing on a running site. The DB side is
   * `scripts/fix-brief-171-home-copy.ts`; run it per environment. Marketing
   * keeps editorial control from /admin/home.
   */
  findUs: {
    heading: 'WHERE TO FIND US',
    /*
     * ONE paragraph, deliberately. `page.tsx`'s `paragraphs()` splits the CMS
     * textarea on BLANK LINES, so a single string renders a single `<p>`. Both
     * sentences belong together — the first says where we are, the second says
     * why that matters — and splitting them would put a paragraph break between
     * a claim and its point.
     */
    body: [
      'J. Blanton Plumbing has local offices throughout Chicagoland and, more recently, in Columbus, serving homeowners across Central Ohio. Every office is staffed by plumbers who work in your area — not a call center routing you to a subcontractor.',
    ],
  },
};
