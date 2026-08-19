/**
 * Shared types for the city-page content system (Briefs 09 + 10).
 *
 * Two intentional city page *types* (decisions-log 2026-06-03):
 *  - `local-office`  → video-hero layout (Brief 09; Evanston, Northbrook, Elmhurst)
 *  - `coverage-area` → standard image-hero layout (Brief 10; Elgin, Skokie, …)
 *
 * The `type` lives on the registry entry, NOT the copy file — a city is re-typed
 * by editing one field, no code change. A separate factual `hasOffice` flag
 * records whether J. Blanton actually has an office there (e.g. Elgin
 * `hasOffice: true` but `type: 'coverage-area'` until its page is upgraded).
 */

export type CityType = 'local-office' | 'coverage-area';

/** A single OUR SERVICES link (label + full per-city href). */
export interface CityServiceLink {
  /** Display label, e.g. "Burst Pipe Repair". */
  label: string;
  /**
   * Full href, e.g. "/elgin/burst-pipe-repair" — or "/sewer-rodding" /
   * "/services/sewer" in the global (non-city) mode added by Brief 138.
   *
   * `null` means "no verified destination exists for this item"; renderers show
   * it as plain text rather than guessing a URL that would 404. Nothing in the
   * current menu resolves to `null` — it is the guard for future menu items
   * whose category can't be derived from the service taxonomy.
   */
  href: string | null;
}

/** One OUR SERVICES category (icon + its links). */
export interface CityServiceCategory {
  /** Category name shown in the <summary>, e.g. "Plumbing". */
  name: string;
  /** Category icon URL (rendered white via filter-invert, per theme). */
  icon: string;
  links: CityServiceLink[];
}

export interface CityFaq {
  question: string;
  answer: string;
}

/** Optional right-column phone button (Northbrook/Elmhurst get one; Evanston does not). */
export interface CityHeroContact {
  phone: string;
  href: string;
}

/** A dispatching office, shared by the many coverage-area cities it serves. */
export interface Office {
  /** Google-maps URL for the office pin. */
  url: string;
  /** Street address line shown in the NAP block. */
  address: string;
}

/** A registry row — the single list that drives `generateStaticParams` + the §10 grid. */
export interface RegistryEntry {
  /** Route slug, e.g. "elgin". */
  slug: string;
  /** Display name, e.g. "Elgin". */
  name: string;
  /** Which layout the shared builder renders. */
  type: CityType;
  /** Factual: does J. Blanton have an office in this city? (Separate from `type`.) */
  hasOffice: boolean;
  /**
   * Brief 154 (Track E1): the state name used to build this city's Google-map
   * embed query (`"{name}, {state}"`) and its `<title>`. Every existing city is
   * Illinois and leaves this UNSET so its embed URL stays byte-identical to
   * before this field existed — `CoverageAreaCity`/`CityServicePageTemplate`
   * default to `'Illinois'` when absent. Only set this for an out-of-state
   * city (Columbus → `'Ohio'`).
   */
  state?: string;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Local Office (video-hero) per-city content — Brief 09 shape.
 * (Kept here so `evanston.ts` and the builder share one definition.)
 * ──────────────────────────────────────────────────────────────────────────── */
export interface LocalOfficeContent {
  /** Route slug, e.g. "evanston". */
  slug: string;
  /** Display name, e.g. "Evanston". */
  name: string;

  hero: {
    /** Autoplay background video. */
    video: { src: string; poster: string };
    /** 24/7 badge overlapping the H1 top-left. */
    badge: { src: string; alt: string };
    /** H1 line 1, e.g. "EVANSTON PLUMBING EXPERTS" (uppercased upstream). */
    headingLine1: string;
    /** Carmine-tagline CTA link inside H1, e.g. "MAKE A GOOD CALL!". */
    ctaLabel: string;
    ctaHref: string;
    /** Second <h1>, e.g. "PROUDLY SERVING EVANSTON FOR OVER 30 YEARS". */
    headingLine2: string;
    /** Right-column intro paragraph. */
    intro: string;
    /**
     * Right-column phone button. `null` for Evanston (the H1 link is the CTA);
     * Northbrook/Elmhurst supply one to render the Cerulean `.test2-hero-contact`.
     */
    contact: CityHeroContact | null;
  };

  why: {
    /** Carmine heading, e.g. "WHY J. BLANTON FOR EVANSTON PLUMBING". */
    heading: string;
    /** Body copy (Nunito). */
    body: string;
    image: { src: string; alt: string };
  };

  /** Decorative full-width skyline band below the WHY block. */
  skylineImage: string;

  services: {
    heading: string;
    categories: CityServiceCategory[];
  };

  /** Elfsight reviews embed — wiring pending (rendered as a styled placeholder). */
  reviews: { elfsightId: string };

  /** "Turning Bad Calls to Good Calls" headline + social Elfsight embed (placeholder). */
  social: { headline: string; elfsightId: string };

  /** Related articles — resolved against lib/articles.ts by slug. */
  articles: { featuredSlugs: string[] };

  /** OUR PARTNERS marquee logos. Empty array = no partners section. */
  partners: string[];

  faqs: CityFaq[];

  meta: { title: string; description: string };
}

/* ────────────────────────────────────────────────────────────────────────────
 * Coverage Area (image-hero) per-city content — Brief 10 shape.
 *
 * Everything here is OPTIONAL: the office NAP, area label, FAQs, services menu,
 * map and city grid are all derived in the builder from the registry + theme
 * maps, so a coverage-area city renders correctly with NO copy file at all
 * (the copy-dependent blocks simply hide). A copy file only supplies the unique
 * per-city marketing prose (the biggest content-backfill task, brief §"Content
 * dependency").
 * ──────────────────────────────────────────────────────────────────────────── */
export interface CoverageAreaContent {
  /** Route slug, e.g. "elgin". */
  slug: string;
  /** Override the H1 ("{name} Plumber" by default; theme `h1_override`). */
  h1Override?: string;
  /** Google Business Profile label suffix in the NAP link (defaults to the city name). */
  gbp?: string;
  /**
   * Hero image: a CDN filename-slug (→ `/images/{x}.webp`) or a full URL.
   * Defaults to `hero_image.webp` (PHP page-city.php 25–39).
   */
  heroImage?: string;
  /** Optional hero callout (IThin), rendered only when present. */
  callout?: string;
  /** Rich HTML for the "WE'VE GOT YOU COVERED" body; the block hides when absent. */
  coveredBody?: string;
  /** Optional red heading for the "manplumber" section (theme `city_page_title`). */
  manplumberHeading?: string;
  /** Rich HTML for the "manplumber" body; the paragraph hides when absent. */
  manplumberBody?: string;
  /** Featured article slugs (defaults to a shared set in shared.ts). */
  articleSlugs?: string[];
  /** Page metadata (defaults to "{name} Plumber" + a generic description). */
  meta?: { title?: string; description?: string };
}
