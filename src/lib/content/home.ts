/**
 * The homepage's CODE FALLBACK copy (`app/page.tsx`).
 *
 * Brief 219: every value here is editable in /admin/home. The `main_pages` row `home` holds the live
 * copy and a non-blank CMS value always wins (`src/lib/cms/home-content.ts` builds the field defaults
 * from this object). These values are what renders when a field is blank or the row is missing, so
 * they are kept equal to the live homepage of 2026-10-26 — editing them changes nothing on a running
 * site whose row is filled; edit /admin/home instead.
 */
import type { RegionDef } from '@/lib/content/locations-regions';
import { LOCATOR_COPY, type LocatorCopy } from '@/lib/content/locator-copy';

export interface HomeContent {
  /**
   * The hero (Brief 218 Track D layout, Brief 219 copy model). The page's ONE <h1> is sr-only and
   * built from `lineLead` + `rotatorWords` ("A and B", "A, B and C"), so the hidden heading and the
   * visible animated line can never disagree.
   */
  hero: {
    /** Small uppercase line above the headline. */
    eyebrow: string;
    /** Visible headline before the rotating word, e.g. "Plumbers in". */
    lineLead: string;
    /** The rotating words (1–4). One word = no rotation. */
    rotatorWords: string[];
    intro: string;
    /** The label above the phone pill (a phone link). */
    ctaLabel: string;
    /** The 24/7 mark perched on the headline's first letter (decorative, alt=""). */
    badgeImage: string;
    poster: string;
    videoDesktop: string;
    videoMobile: string;
  };
  services: {
    heading: string;
    intro: string;
    /** The desktop "VIEW PAGE" button next to the intro (links to /services). */
    ctaLabel: string;
  };
  /**
   * The homepage region chooser — Columbus Integration Brief 04, Track B.
   *
   * Only the LABELS and the two card images live here. Every number the band shows (the city counts)
   * is counted from `CITY_REGISTRY` at render time via `REGIONS`, never typed — the same rule
   * `locations-regions.ts` enforces for the /locations hub. Region names, tenure and county lines are
   * shared with /locations and the nav, so they stay in `locations-regions.ts`.
   */
  regions: {
    /** Section `<h2>` (the homepage has exactly one `<h1>`, the hero's). */
    heading: string;
    /** One-line sub-head under the heading. */
    intro: string;
    /**
     * Support line under each region name, e.g. "30+ years, 248 communities".
     * `{tenure}` comes from `RegionDef.tenure` and `{count}` from
     * `RegionDef.cities.length` — both derived, so neither may be hardcoded.
     */
    supportTemplate: string;
    /** CTA label per region, keyed off `RegionDef['key']` (a third region is a type error here). */
    ctaLabels: Record<RegionDef['key'], string>;
    /** Card image + alt per region (homepage-only; the files are 1000×500, 2:1). */
    images: Record<RegionDef['key'], { src: string; alt: string }>;
  };
  tiktok: {
    headline: string;
  };
  why: {
    heading: string;
    body: string[];
    /** YouTube video id of the "Why J. Blanton" embed. */
    videoId: string;
    /** The iframe's accessible title. */
    videoTitle: string;
    ctaLabel: string;
  };
  noDripClub: {
    /** Rich text (rendered through `renderCmsBlock`). */
    body: string;
    /** The skewed band label, rendered twice by the design. */
    label: string;
    image: string;
    imageAlt: string;
    ctaLabel: string;
  };
  knowledgeHub: {
    heading: string;
    intro: string;
    ctaLabel: string;
    featuredSlugs: string[];
  };
  findUs: {
    heading: string;
    body: string[];
  };
  /** The store locator's interface text (homepage-only component). `{tokens}` are filled at render. */
  locator: LocatorCopy;
}

export const HOME: HomeContent = {
  hero: {
    // Brief 218 (copy locked by Marketing 2026-10-26). Brief 04's trust statement ("30+ years in
    // Chicagoland. Now also serving Central Ohio.") was replaced by this eyebrow when the H1 started
    // carrying both markets.
    eyebrow: 'Serving Homeowners for 30+ Years',
    lineLead: 'Plumbers in',
    rotatorWords: ['Chicagoland', 'Columbus, OH'],
    intro:
      'From clogged drains to full sewer line work, we always answer your call and all your questions. Our technicians will walk you through your options and give you a flat rate before work begins. No surprises.',
    ctaLabel: 'Make a Good Call',
    badgeImage: '/images/247.webp',
    poster: '/images/hero-poster.webp',
    videoDesktop: '/videos/homepage-hero-desktop.webm',
    videoMobile: '/videos/homepage-hero-mobile.webm',
  },
  services: {
    heading: 'SERVICES',
    intro:
      'Our team of tenacious plumbers are always ready to leap into action to save your day, no matter how light or severe the situation.',
    ctaLabel: 'VIEW PAGE',
  },
  regions: {
    // Marketing-locked (Brief 04). Change them in /admin/home only with Marketing's sign-off.
    heading: 'Areas we service',
    intro: 'Choose your region to see every city and neighborhood we cover.',
    supportTemplate: '{tenure}, {count} communities',
    ctaLabels: {
      chicagoland: 'See Chicagoland areas',
      columbus: 'See Central Ohio areas',
    },
    images: {
      chicagoland: { src: '/images/region-chicagoland.webp', alt: 'The Chicago skyline at dusk, seen across the lakefront' },
      columbus: { src: '/images/region-central-ohio.webp', alt: 'The Columbus, Ohio skyline at night, reflected in the Scioto River' },
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
    videoId: 'ZDFzUtjBUCk',
    videoTitle: 'Why J. Blanton',
    ctaLabel: 'MEET OUR TEAM',
  },
  noDripClub: {
    body:
      "There are Good Calls—and then there's the No Drip Club. Members enjoy significant annual savings on home checkups, emergency repairs, and unlock exclusive perks, including VIP treatment whenever they call for service.",
    label: 'NO DRIP CLUB',
    image: '/images/jbcharacter.webp',
    imageAlt: 'J. Blanton Character',
    ctaLabel: 'JOIN THE NO DRIP CLUB',
  },
  knowledgeHub: {
    heading: 'KNOWLEDGE HUB',
    intro: "Check out the knowledge hub for FAQ's and helpful tips on all things plumbing.",
    ctaLabel: 'VIEW ALL ARTICLES',
    featuredSlugs: [
      'prepare-your-home-plumbing-for-the-chicago-cold-snap',
      'brown-friday-plumbing-drain-clog-emergency',
      'sewer-replacement-old-homes-chicagoland',
    ],
  },
  /**
   * Brief 171, Track E2 — the store-locator section's heading and intro (it replaced a Chicago-only
   * "FIND US" block). ONE paragraph, deliberately: the body splits on BLANK LINES, so a single string
   * renders a single `<p>`.
   */
  findUs: {
    heading: 'WHERE TO FIND US',
    body: [
      'J. Blanton Plumbing has local offices throughout Chicagoland and, more recently, in Columbus, serving homeowners across Central Ohio. Every office is staffed by plumbers who work in your area — not a call center routing you to a subcontractor.',
    ],
  },
  locator: LOCATOR_COPY,
};
