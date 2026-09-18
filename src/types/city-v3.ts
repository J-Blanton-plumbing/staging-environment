/**
 * `CityV3Content` — the typed content contract for the Local Office City V3
 * template (`src/components/LocalOfficeCityV3.tsx`, `template_type =
 * 'local-office-v3'`).
 *
 * Brief 181 (Track B1). Lifted from `src/lib/content/hanover-park-test.ts`,
 * where the same shapes were named `Hpt*` because exactly one page used them.
 * The shapes are unchanged; only the names generalise.
 *
 * ── WHY THIS FILE EXISTS SEPARATELY ────────────────────────────────────────
 * Brief 182 wires this template to the CMS and lifts these field names straight
 * into the `city_pages` schema / editor. Keeping the interface in its own module
 * means the schema work can import the contract without dragging Hanover Park's
 * content along with it, and means a field rename is a compile error in every
 * consumer rather than a silent mismatch.
 *
 * ── WHAT IS NOT IN HERE ────────────────────────────────────────────────────
 * Assets that are not copy: the 7 service-card ICONS come from `@/lib/services`
 * (the same registry the homepage cards read), and the map ADDRESS comes from
 * the office record in global settings. Neither is duplicated here, so a V3 page
 * can never disagree with the NAP or the icon set the rest of the site renders.
 *
 * ── PROVISIONAL COPY ───────────────────────────────────────────────────────
 * Several fields carry copy that Marketing has SEEN but not signed off as final
 * wording (the section eyebrows, the FAQ H2, the review source label). They are
 * flagged `⚠ PROVISIONAL` on the field, individually, and the flags travel with
 * the type rather than living in a comment somewhere else that goes stale.
 */

/**
 * One run of copy. A segment with an `href` renders as an inline link; a segment
 * without one renders as plain text. Concatenating `.text` in order reproduces
 * the copy document's sentence exactly, which is what the copy diff checks.
 */
export interface CopySegment {
  text: string;
  href?: string;
}

/**
 * A labelled slot where an asset will go — rendered as a visibly labelled box
 * that reserves its real space at every breakpoint.
 *
 * Nothing renders one today: the only slot left is inside the un-rendered
 * `video` block (see `CityV3Video`). Kept because that block is suspended, not
 * deleted — restoring the section must not also require re-deriving this shape.
 */
export interface PlaceholderSlot {
  /** Uppercase slot label, e.g. `SUMP PUMP SECTION IMAGE — 4:3`. */
  label: string;
  /** `width / height` for the reserved space. */
  ratio: number;
  /** Announced to assistive tech in place of alt text, which does not exist yet. */
  ariaLabel: string;
}

/**
 * A real photograph, with its final alt text.
 *
 * Brief 181 (D5) replaced the old `provisionalAlt` field with `alt`. The copy
 * rewrite leaves Image and Alt text blank on purpose for the creative workflow,
 * so no alt string here comes from an approved copy document — each is a plain
 * factual description of what is actually in the frame, written against the
 * image itself, and each is listed in the Brief 181 report for Marketing's
 * sign-off. Changing one is a content edit, not a copy edit: no approved
 * sentence is involved.
 */
export interface PhotoSlot {
  src: string;
  width: number;
  height: number;
  alt: string;
}

/* ── Section interfaces, in published order ───────────────────────────────── */

export interface CityV3Meta {
  /**
   * The page title WITHOUT the brand suffix.
   *
   * ⚠ Brief 181 (B3 / Marketing decision 2, 2026-09-18). This value is a
   * FALLBACK — `getCityPageMeta` prefers `city_pages.meta_title` when that
   * column is non-empty, and the root layout composes the brand on with
   * `TITLE_TEMPLATE` (`%s | J. Blanton Plumbing`). Do not type the brand in
   * here: `pageTitle()` would strip it again, and typing it invites the
   * double-brand defect Briefs 145/146 exist to close.
   */
  title: string;
  description: string;
}

export interface CityV3Hero {
  h1: string;
  subText: string;
  /** `{{phone}}` — resolved at render by `withPhone()`. Never a literal number. */
  cta: string;
  image: PhotoSlot;
}

export interface CityV3ServiceCard {
  title: string;
  /**
   * The card body. Rendered as PLAIN TEXT — the whole card is the link (see
   * `href`), and an `<a>` inside an `<a>` is invalid HTML.
   */
  body: CopySegment[];
  /**
   * Where the whole card links. Brief 181 (D4) made this explicit.
   *
   * It used to be DERIVED — from the first `body` segment that carried an
   * `href`, falling back to a service-category hub keyed off the card title.
   * That produced a grid where two cards could point at different levels of the
   * site, and it meant the destination was a side effect of how a sentence had
   * been marked up. Six of the seven now point at the city-scoped
   * `/{city}/{service}` page; Commercial keeps the national hub because no
   * city-scoped commercial page exists (`/{city}/commercial` 301s to it).
   */
  href: string;
  /** Marketing flag carried as data, not rendered as copy. */
  flag?: string;
}

export interface CityV3Services {
  /** ⚠ PROVISIONAL, not approved copy. */
  eyebrow: string;
  h2: string;
  intro: string;
  /** The 7 service cards. Icons are NOT here — they come from `@/lib/services`. */
  cards: CityV3ServiceCard[];
}

export interface CityV3FeaturedService {
  /** ⚠ PROVISIONAL, not approved copy. */
  eyebrow: string;
  h2: string;
  /**
   * PARAGRAPHS, not one run. The break is a readability boundary only —
   * concatenating the paragraphs still reproduces the copy document's field
   * exactly, which is what the copy diff asserts.
   */
  body: CopySegment[][];
  image: PhotoSlot;
}

export interface CityV3WhyPoint {
  label: string;
  body: string;
}

export interface CityV3WhyUs {
  /** ⚠ PROVISIONAL, not approved copy. */
  eyebrow: string;
  h2: string;
  points: CityV3WhyPoint[];
  cta: string;
  /**
   * An embedded Google map pinned on the city's Google Business Profile.
   *
   * The site's established KEYLESS classic embed
   * (`maps.google.com/maps?q=...&output=embed`) — the same mechanism
   * `LocationsMap`, `CoverageAreaCity` and the store locator all use. No API
   * key. Google runs `q` against its own index and drops ITS OWN pin, which is
   * more authoritative than any coordinate we could plot and immune to the
   * stale office coordinates flagged in the Brief 171 report.
   *
   * The ADDRESS is deliberately NOT stored here: it is read from the office
   * record in global settings (`officeCity` selects which one), so a V3 page can
   * never disagree with the NAP the rest of the site renders.
   */
  map: {
    /**
     * ⚠ The EXACT Google Business Profile name. A looser name pulls unrelated
     * businesses into the frame. Data only — see `LocalOfficeCityV3` for why it
     * must never be prepended to the address in the `q` parameter.
     */
    gbpName: string;
    zoom: number;
    /** The `<iframe>`'s `title` — what the frame is, for assistive tech. */
    title: string;
  };
}

export interface CityV3MidCta {
  /** ⚠ PROVISIONAL, not approved copy. */
  eyebrow: string;
  h2: string;
  body: string;
  disclaimer: string;
  cta: string;
  /**
   * A background photograph under a Carmine overlay.
   *
   * DECORATIVE: a CSS background, so it has no alt and is invisible to assistive
   * tech by construction. Everything the band communicates is in the copy on top
   * of it. See the CSS for why the overlay is a `multiply` blend and not an
   * alpha wash — that choice is what guarantees the text contrast.
   */
  backgroundImage: string;
}

/**
 * ⚠ NOT RENDERED since 2026-09-17 — Marketing: "take the video section out
 * completely FOR NOW". Temporary, so the approved copy stays here rather than
 * being deleted; restoring the section is a template change only.
 *
 * Brief 181 kept it for exactly that reason: "for now" is Marketing's word, and
 * deleting the block would quietly convert a suspension into a decision.
 */
export interface CityV3Video {
  /** ⚠ PROVISIONAL, not approved copy. */
  eyebrow: string;
  h2: string;
  intro: string;
  /** Approved copy — the one string this section takes from the video document. */
  thumbnailTitle: string;
  placeholder: PlaceholderSlot;
}

export interface CityV3Review {
  name: string;
  gbpUrl: string;
  text: string;
}

export interface CityV3Reviews {
  /** ⚠ PROVISIONAL, not approved copy. */
  eyebrow: string;
  h2: string;
  /** Site-wide fallback figure. Do not update, do not localize. */
  intro: string;
  /**
   * ⚠ PROVISIONAL, not approved copy. The reference card layout carries
   * "Chicago Resident" here — a RESIDENCY CLAIM about three named real people,
   * from the SITE-WIDE fallback review set, where nothing on record says where
   * any of them live. This slot renders a verifiable statement instead.
   */
  sourceLabel: string;
  items: CityV3Review[];
}

export interface CityV3FaqItem {
  question: string;
  answer: string;
}

export interface CityV3Faq {
  /** ⚠ PROVISIONAL, not approved copy. */
  eyebrow: string;
  /**
   * ⚠ NOT APPROVED COPY. The copy document supplies the Q&A pairs and no section
   * heading; this is a working placeholder.
   *
   * It is also load-bearing for the heading outline: Brief 181 (D2) promotes the
   * accordion's questions to `<h3>` precisely BECAUSE a real H2 labels the set
   * here. Blanking this field would leave six H3s under no H2.
   */
  h2: string;
  items: CityV3FaqItem[];
}

export interface CityV3Ndc {
  eyebrow: string;
  /** The copy document links only the leading clause, not the whole heading. */
  h2: CopySegment[];
  body: string;
  benefits: string[];
  cta: { label: string; href: string };
}

export interface CityV3FinalCta {
  /** ⚠ PROVISIONAL, not approved copy. */
  eyebrow: string;
  /** The copy document calls this field "Title"; it renders as the section H2. */
  h2: string;
  text: string;
  cta: string;
}

/**
 * One city's V3 content, in published section order.
 *
 * `video` is suspended (see `CityV3Video`); every other key renders.
 */
export interface CityV3Content {
  meta: CityV3Meta;
  hero: CityV3Hero;
  services: CityV3Services;
  featuredService: CityV3FeaturedService;
  whyUs: CityV3WhyUs;
  midCta: CityV3MidCta;
  video: CityV3Video;
  reviews: CityV3Reviews;
  faq: CityV3Faq;
  ndc: CityV3Ndc;
  finalCta: CityV3FinalCta;
  /**
   * Which office record in global settings supplies the map address, matched on
   * `CmsOffice.city` (case-insensitive).
   *
   * Matched on city NAME rather than slug on purpose: the live rows store their
   * slug with a leading slash (`/hanover-park`), which is a data quirk no
   * template should depend on.
   */
  officeCity: string;
  /**
   * The map address used when global settings has no matching office — the same
   * fail-open posture `getGlobalSettingsCached()` itself takes, so the map still
   * pins correctly with the database down.
   */
  officeAddressFallback: string;
}
