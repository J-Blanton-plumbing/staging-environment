/**
 * /hanover-park-test — EVERY user-visible string on the page (Brief 180, Track C).
 *
 * ── Why this file is the point of the brief ────────────────────────────────
 * This is a WORKFLOW EXPERIMENT: text first, layout second, CMS third. Marketing's
 * copy is finished and strategic before any layout exists, and both the block
 * editor and the existing city templates force layout decisions first. So this
 * module is deliberately modelled as **the page's content schema**, not as a bag
 * of constants: one exported object, ordered exactly as the copy document's
 * PUBLISHED ORDER, a typed interface per section, and arrays for every repeating
 * item (7 service cards, 3 why-points, 3 reviews, 6 FAQs, 4 NDC benefits).
 *
 * A later brief must be able to lift this into CMS fields **without re-typing a
 * single string**. That is the "headless" test. Concretely, the intended mapping:
 *
 *   HANOVER_PARK_TEST.meta          →  page meta title / description columns
 *   .hero / .midCta / .finalCta     →  one named column per leaf string
 *   .services.cards                 →  one repeater, 7 rows × {title, body}
 *   .whyUs.points                   →  one repeater, 3 rows × {label, body}
 *   .reviews.items                  →  the existing `reviews` JSONB shape
 *   .faq.items                      →  the existing `faqs` JSONB shape
 *   .ndc.benefits                   →  one repeater, 4 rows × string
 *
 * ── Rules this file keeps ──────────────────────────────────────────────────
 * 1. VERBATIM. Source of truth is
 *    `New Pages/Hanover Park city page/Hanover Park_CityPage_Copy_Rewrite.md`.
 *    Nothing here is rewritten, trimmed, re-ordered or "tightened", including the
 *    punctuation, the 😭 emoji and the `[...]` ellipses in the review quotes, the
 *    site-wide `4.7 stars … 5,669+` figure and the financing disclaimer.
 * 2. The copy document's parenthetical EDITORIAL NOTES are instructions to us,
 *    not page copy, so they are not here. Where such a note explains a missing
 *    link it is honoured instead: the Emergency and Plumbing cards carry no
 *    `href`, because no destination exists (flagged content gap).
 * 3. `{{phone}}` is this module's own token for the global-settings phone label.
 *    It is substituted by a three-line pure-string helper in the template —
 *    deliberately NOT through `renderCmsInline`/`renderCmsBlock`, because Brief
 *    180 hard rule 1 bans every piece of CMS plumbing on this page. The token
 *    spelling matches the CMS's existing `{{phone}}` convention (Brief 77) so the
 *    lift is a copy-paste.
 * 4. Inline links inside a sentence are modelled as ordered SEGMENTS rather than
 *    an HTML string, so nothing on this page needs `dangerouslySetInnerHTML` and
 *    the copy stays diffable against the document. A CMS lift turns each segment
 *    array into one rich-text field.
 * 5. `hrefs` are the copy document's own, character for character — trailing
 *    slashes included. Every one of the six resolves through a single 301 today
 *    (`/water-heater-services/` → `/services/water-heater`, `/sump-pumps/` →
 *    `/services/sewer`, the other four are trailing-slash-only). Reported, not
 *    silently "fixed" — see the Brief 180 report.
 *
 * The video script (`Hanover Park_Video_Script.md`) is a PRODUCTION document and
 * is never rendered; only the approved thumbnail title below comes from it.
 */

/* ── Shared shapes ─────────────────────────────────────────────────────────── */

/**
 * One run of copy. A segment with an `href` renders as an inline link; a segment
 * without one renders as plain text. Concatenating `.text` in order reproduces
 * the copy document's sentence exactly, which is what the copy diff checks.
 */
export interface CopySegment {
  text: string;
  /** Copy-document href, verbatim (trailing slash included). Absent = plain text. */
  href?: string;
}

/** A labelled slot where an asset will go. Rendered as a visibly labelled box. */
export interface PlaceholderSlot {
  /** Uppercase slot label, e.g. `SUMP PUMP SECTION IMAGE — 4:3`. */
  label: string;
  /** `width / height` for the reserved space. */
  ratio: number;
  /** Announced to assistive tech in place of alt text, which does not exist yet. */
  ariaLabel: string;
}

/**
 * A real photograph. Distinct from `PlaceholderSlot` — this one has an asset.
 *
 * `provisionalAlt` is PROVISIONAL every time. The copy rewrite leaves Image and
 * Alt text blank on purpose for the creative workflow, so no approved alt string
 * exists for any image on this page. Each is a plain factual description of what
 * the photo shows — no marketing language, no keywords — and the template puts
 * an HTML comment above it saying the final alt is pending Marketing.
 */
export interface PhotoSlot {
  src: string;
  width: number;
  height: number;
  provisionalAlt: string;
}

/* ── Section interfaces, in published order ───────────────────────────────── */

export interface HptMeta {
  /** Rendered with `title.absolute` so the root layout's brand template can't double it. */
  title: string;
  description: string;
}

export interface HptHero {
  h1: string;
  subText: string;
  /** `{{phone}}` — the copy document's CTA field is literally `[Phone Number]`. */
  cta: string;
  image: {
    src: string;
    width: number;
    height: number;
    /**
     * PROVISIONAL. The copy document leaves Image/Alt text blank on purpose for
     * the creative workflow, so there is no approved alt string. This is a plain
     * factual description of what the render actually shows — no marketing
     * language, no keywords. Final alt pending Marketing.
     */
    provisionalAlt: string;
  };
}

export interface HptServiceCard {
  title: string;
  body: CopySegment[];
  /** Marketing flag rendered as an HTML comment above the card, not as copy. */
  flag?: string;
}

export interface HptServices {
  /** ⚠ PROVISIONAL, NOT APPROVED COPY — see PROVISIONAL_EYEBROWS. */
  eyebrow: string;
  h2: string;
  intro: string;
  /**
   * The 7 service cards.
   *
   * Revision round 1 (2026-09-17) replaced these with the site's red OUR
   * SERVICES dropdown menu; revision round 2 REVERTED that, because the menu is
   * a link list and cannot carry an `<h3>` per service category — Marketing's
   * reason: "detrimental for SEO as we cannot use the H3s that signal the
   * service categories". Each card's title is now a real `<h3>`.
   *
   * Card ICONS are not in this module: they are assets, not copy, and they are
   * looked up from `@/lib/services` so the page shares one source of truth with
   * the homepage cards.
   */
  cards: HptServiceCard[];
}

export interface HptSumpPump {
  /**
   * ⚠ PROVISIONAL, NOT APPROVED COPY. Marketing asked for a section eyebrow on
   * 2026-09-17 ("Most common service — or something like that"); the copy
   * rewrite contains no such string. The template renders an HTML comment above
   * it asking for the final wording.
   */
  eyebrow: string;
  h2: string;
  /**
   * PARAGRAPHS, not one run — Marketing split this for readability on
   * 2026-09-17, between "…now pushing 50 years old." and "When one fails during
   * a storm…". **No word changes**: the break is purely a paragraph boundary, so
   * concatenating the paragraphs still reproduces the copy document's field
   * exactly, which is what the copy diff asserts.
   */
  body: CopySegment[][];
  /** Revision round 3, item 3 — a real photo replaced the labelled placeholder. */
  image: PhotoSlot;
}

export interface HptWhyPoint {
  label: string;
  body: string;
}

export interface HptWhyUs {
  /** ⚠ PROVISIONAL, NOT APPROVED COPY — see PROVISIONAL_EYEBROWS. */
  eyebrow: string;
  h2: string;
  points: HptWhyPoint[];
  cta: string;
  /**
   * Revision round 3, item 4 — an embedded Google map pinned on the Hanover Park
   * Google Business Profile, replacing the labelled image placeholder.
   *
   * The embed is the site's established KEYLESS classic embed
   * (`maps.google.com/maps?q=...&output=embed`) — the same mechanism
   * `LocationsMap`, `CoverageAreaCity` and the store locator all use. No API key,
   * no billing account. Google runs `q` against its own index and drops ITS OWN
   * pin for the matching listing, which is more authoritative than any
   * coordinate we could plot, and immune to the stale office coordinates flagged
   * in the Brief 171 report.
   *
   * `gbpName` must stay the EXACT Google Business Profile name — verified in
   * `src/lib/content/locator.ts` against the four short links Marketing supplied,
   * which all resolve to "J. Blanton Plumbing, Sewer & Drain". A looser name
   * pulls unrelated businesses into the frame.
   *
   * The ADDRESS is deliberately NOT stored here: it is read from the Hanover Park
   * office record in global settings, so this page can never disagree with the
   * NAP the rest of the site renders.
   */
  map: {
    gbpName: string;
    zoom: number;
    /** The `<iframe>`'s `title` — what the frame is, for assistive tech. */
    title: string;
  };
}

export interface HptMidCta {
  /** ⚠ PROVISIONAL, NOT APPROVED COPY — see PROVISIONAL_EYEBROWS. */
  eyebrow: string;
  h2: string;
  body: string;
  disclaimer: string;
  cta: string;
  /**
   * Revision round 3, item 5 — a background photograph under a Carmine overlay,
   * the treatment in the fx-reference Marketing supplied on 2026-09-17.
   *
   * DECORATIVE: it is a CSS background, so it has no alt and is invisible to
   * assistive tech by construction. Everything the band communicates is in the
   * copy on top of it. See the CSS for why the overlay is a `multiply` blend and
   * not an alpha wash — that choice is what guarantees the text contrast.
   */
  backgroundImage: string;
}

/**
 * ⚠ NOT RENDERED since 2026-09-17 — Marketing: "take the video section out
 * completely FOR NOW". Temporary, so the approved copy stays here rather than
 * being deleted; restoring the section is a template change only. The three
 * strings below (H2, intro, thumbnail title) are the ones that stop appearing.
 */
export interface HptVideo {
  /** ⚠ PROVISIONAL, NOT APPROVED COPY — same as `HptSumpPump.eyebrow`. */
  eyebrow: string;
  h2: string;
  intro: string;
  /** Approved copy — the one string this page takes from the video document. */
  thumbnailTitle: string;
  placeholder: PlaceholderSlot;
}

export interface HptReview {
  name: string;
  gbpUrl: string;
  text: string;
}

export interface HptReviews {
  /** ⚠ PROVISIONAL, NOT APPROVED COPY — see PROVISIONAL_EYEBROWS. */
  eyebrow: string;
  h2: string;
  /** Site-wide fallback figure. Do not update, do not localize. */
  intro: string;
  /**
   * ⚠ PROVISIONAL, NOT APPROVED COPY. The reference card layout Marketing sent
   * on 2026-09-17 carries a second line under the reviewer's name reading
   * "Chicago Resident". That is a RESIDENCY CLAIM about three named real people,
   * and these three reviews come from the SITE-WIDE fallback set — the page
   * brief is explicit that they must not be presented as city-specific, and
   * nothing on record says where any of them live. So the slot renders a
   * statement that is verifiably true instead. Replace it with approved copy, or
   * drop the line.
   */
  sourceLabel: string;
  items: HptReview[];
}

export interface HptFaqItem {
  question: string;
  answer: string;
}

export interface HptFaq {
  /** ⚠ PROVISIONAL, NOT APPROVED COPY — see PROVISIONAL_EYEBROWS. */
  eyebrow: string;
  /**
   * NOT APPROVED COPY. The copy document supplies six Q&A pairs and no section
   * heading; this is a working placeholder. The template renders an HTML comment
   * above it asking Marketing for the final heading.
   */
  h2: string;
  items: HptFaqItem[];
}

export interface HptNdc {
  eyebrow: string;
  /** The copy document links only the leading clause, not the whole heading. */
  h2: CopySegment[];
  body: string;
  benefits: string[];
  cta: { label: string; href: string };
}

export interface HptFinalCta {
  /** ⚠ PROVISIONAL, NOT APPROVED COPY — see PROVISIONAL_EYEBROWS. */
  eyebrow: string;
  /** The copy document calls this field "Title"; it renders as the section H2. */
  h2: string;
  text: string;
  cta: string;
}

export interface HanoverParkTestContent {
  meta: HptMeta;
  hero: HptHero;
  services: HptServices;
  sumpPump: HptSumpPump;
  whyUs: HptWhyUs;
  midCta: HptMidCta;
  video: HptVideo;
  reviews: HptReviews;
  faq: HptFaq;
  ndc: HptNdc;
  finalCta: HptFinalCta;
}

/* ── The content ───────────────────────────────────────────────────────────── */

export const HANOVER_PARK_TEST: HanoverParkTestContent = {
  // ── META DATA ────────────────────────────────────────────────────────────
  meta: {
    title: 'Hanover Park Plumbers, Available 24/7 — J. Blanton Plumbing',
    description:
      'Our Hanover Park office serves the northwest suburbs, including Streamwood, Bartlett, and Schaumburg. Call 24/7 for a flat-rate quote before we start.',
  },

  // ── 1. HERO ──────────────────────────────────────────────────────────────
  hero: {
    h1: 'Plumbers in Hanover Park, IL',
    subText:
      "Our Hanover Park office serves the northwest suburbs, including Streamwood, Bartlett, and Schaumburg. Local dispatch means we're always reachable when you need us most. Call 24/7, even on weekends and holidays.",
    cta: '{{phone}}',
    image: {
      src: '/images/hanover-park/hero.webp',
      width: 1200,
      height: 896,
      provisionalAlt:
        'A J. Blanton Plumbing technician in overalls stands on a residential street holding a metal toolbox, in front of a branded J. Blanton Plumbing van parked beside a brick apartment building.',
    },
  },

  // ── 2. PLUMBING SERVICES IN HANOVER PARK ─────────────────────────────────
  services: {
    eyebrow: 'Our Services',
    h2: 'Plumbing Services in Hanover Park',
    intro:
      'From routine repairs to full sewer line replacements, our licensed technicians handle every plumbing job in Hanover Park.',
    cards: [
      {
        // No internal link — no Emergency Plumbing category page exists in the
        // current site structure. Content gap, flagged in the copy document.
        title: 'Emergency',
        body: [{ text: 'We offer fast drain and plumbing services for emergencies.' }],
      },
      {
        // No internal link — too generic for a single accurate destination.
        title: 'Plumbing',
        body: [
          { text: 'Our Illinois-certified plumbers are trained and skilled for complex plumbing tasks.' },
        ],
      },
      {
        title: 'Sewer',
        body: [
          { text: 'Sewer services', href: '/sewer-repair/' },
          { text: ' ensure clogs are resolved and plumbing stays smooth.' },
        ],
      },
      {
        title: 'Drain',
        body: [
          { text: 'Drain services', href: '/drain-cleaning-services-in-chicago/' },
          { text: " keep your home's plumbing running smoothly." },
        ],
      },
      {
        title: 'Water Heater',
        body: [
          { text: "Ensure consistent hot water with J. Blanton Plumbing's " },
          { text: 'water heater services', href: '/water-heater-services/' },
          { text: '.' },
        ],
      },
      {
        title: 'Water Quality',
        body: [
          { text: 'Water filtration', href: '/water-filtration-systems/' },
          { text: ' ensures clean, safe water and protects your health and plumbing.' },
        ],
      },
      {
        title: 'Commercial',
        body: [
          {
            text: 'Reliable and efficient plumbing solutions tailored to meet the needs of your business.',
          },
        ],
        flag: 'fixed template copy, off-persona for a homeowners-only page. Swap decision pending.',
      },
    ],
  },

  // ── 3. SUMP PUMP & BASEMENT FLOODING PROTECTION ──────────────────────────
  sumpPump: {
    // ⚠ PROVISIONAL — see HptSumpPump.eyebrow.
    eyebrow: 'Featured Service',
    h2: 'Sump Pump & Basement Flooding Protection in Hanover Park',
    body: [
      [
        {
          text: "Hanover Park's housing stock dates mostly to the 1970s, when the village's population nearly tripled in a decade. A lot of homes here are still running on their original sump systems, now pushing 50 years old.",
        },
      ],
      [
        {
          text: 'When one fails during a storm, water finds the lowest point in your house fast. We inspect, repair, and replace ',
        },
        { text: 'sump pumps', href: '/sump-pumps/' },
        { text: " and backup systems so a heavy rain doesn't turn into a flooded basement." },
      ],
    ],
    image: {
      src: '/images/hanover-park/sump-pump.webp',
      width: 1400,
      height: 933,
      provisionalAlt:
        'A J. Blanton Plumbing technician in a red hooded sweatshirt kneels beside an open sump pit in a basement, holding the pump’s power cord, with PVC drain pipes, a water heater and a tool bag around him.',
    },
  },

  // ── 4. WHY HANOVER PARK HOMEOWNERS CALL US FIRST ─────────────────────────
  whyUs: {
    eyebrow: 'Why J. Blanton',
    h2: 'Why Hanover Park Homeowners Call Us First',
    points: [
      {
        label: 'We Always Pick Up',
        body: 'Our line is open 24/7, including weekends and holidays. When you call our office on Greenbrook Blvd., a local plumber comes to your door, not a subcontractor.',
      },
      {
        label: 'We Know Hanover Park Homes',
        body: "We've served Chicagoland homeowners for more than 30 years. Most homes in Hanover Park still date back to the 1970s building boom, and we know exactly what a 50-year-old sump system, water heater, or pipe run is likely to need, because we've already seen it.",
      },
      {
        label: 'Our Service Gives You Peace Of Mind',
        body: "The plumbing industry has a reputation for no-shows and upsells, and it's earned one too often. We do it differently: an honest diagnosis, a walkthrough of your options, and upfront pricing every time.",
      },
    ],
    cta: '{{phone}}',
    map: {
      // EXACT Google Business Profile name. Do not loosen it — see the interface.
      gbpName: 'J. Blanton Plumbing, Sewer & Drain',
      zoom: 15,
      title: 'Google map showing the J. Blanton Plumbing office in Hanover Park',
    },
  },

  // ── 5. MID CTA ───────────────────────────────────────────────────────────
  midCta: {
    eyebrow: 'Financing',
    h2: 'Fix It With Financing As Low As 0%',
    body: "We've partnered with trusted lenders, so you can get the service you need now and pay on your terms.",
    disclaimer: 'Subject to credit approval. Rates and terms vary.',
    cta: 'Ask about financing options',
    backgroundImage: '/images/hanover-park/financing.webp',
  },

  // ── 6. VIDEO SECTION ─────────────────────────────────────────────────────
  video: {
    // ⚠ PROVISIONAL — see HptVideo.eyebrow.
    eyebrow: 'Watch',
    h2: "Why Hanover Park's 50-Year-Old Homes Are More Likely to Freeze",
    intro:
      "Here's what actually happens inside an old pipe run when Hanover Park hits its first hard freeze of the season.",
    thumbnailTitle: 'Why Older Pipes Freeze First',
    placeholder: {
      label: 'VIDEO — 50s',
      ratio: 16 / 9,
      ariaLabel: 'Video placeholder — 50 second video pending',
    },
  },

  // ── 7. J. BLANTON PLUMBING REAL CUSTOMER REVIEWS ─────────────────────────
  reviews: {
    eyebrow: 'Customer Stories',
    h2: 'J. Blanton Plumbing Real Customer Reviews',
    // Company-wide fallback figure. Hanover Park's own GBP listing has only 2
    // reviews, so this is never presented as city-specific. Do not update.
    intro: '4.7 stars average across 5,669+ Google reviews.',
    // ⚠ PROVISIONAL — see HptReviews.sourceLabel.
    sourceLabel: 'Google Review',
    items: [
      {
        name: 'Betty Knows',
        gbpUrl: 'https://maps.app.goo.gl/rCeZm7fveeyr8Mbu7',
        text: "So it's Christmas Eve and my sewer is backed up😭. J. Blanton did not hesitate or cancel my appointment. George and Mike were excellent!! They were not rushed, answered all my questions. Very knowledgeable and honest [...] Their pricing is VERY reasonable compared to other companies and professionalism exceeded expectations.",
      },
      {
        name: 'Mark Jeffery',
        gbpUrl: 'https://maps.app.goo.gl/TAqgxB8Vtw5wHkep9',
        text: 'In this week of artic chiberia I cannot say how much I appreciated the care, attention that Ronnie Levandowski did last night with his service of attending to my burst pipes in the basement. He was detailed, thorough, skilled, walked me through the options he was able to do to stop the water and fix the problem. [...] Ronnie is so hard working, he travelled from his previous job, 50 minutes away in a snow storm and he had been working all day to help other customers.',
      },
      {
        name: 'Christopher Rubano',
        gbpUrl: 'https://maps.app.goo.gl/mG7zF17sqLBVfrZE6',
        text: "Very friendly & personable service. The initial tech Robert was happy to troubleshoot my faulty water heater and walk me through his assessment before suggesting a resolution. The repair would be almost 65% of the cost of a new unit, so we ultimately decided to replace. The price quoted ($4200) was less than other quotes I'd gotten, and for lesser quality builds. [...] The installer Thomas was similarly friendly and extensively knowledgeable. Like Robert, he took the time to explain the process before beginning work. [...] The work was excellent, and the jobsite was left immaculate!",
      },
    ],
  },

  // ── 8. FAQ ───────────────────────────────────────────────────────────────
  faq: {
    // ⚠ INVENTED, NOT APPROVED — see HptFaq.h2.
    eyebrow: 'Common Questions',
    h2: 'Frequently Asked Questions',
    items: [
      {
        question: 'Does cold weather cause pipes to freeze and burst in Hanover Park homes?',
        answer:
          "Yes, especially in homes built during Hanover Park's 1970s construction boom. Pipe runs from that era are still common in crawl spaces and unheated basements, and they're more likely to crack when temperatures drop hard and fast. We see this pattern every winter in this area, so we know what to check first.",
      },
      {
        question: 'How quickly can you respond to a plumbing emergency in Hanover Park?',
        answer:
          "We dispatch from our Hanover Park office and treat emergency calls as a priority, including holidays and weekends. One customer's sewer backed up on Christmas Eve, and we didn't cancel that appointment. Call us and we'll get a technician moving as soon as we can.",
      },
      {
        question: 'Is basement flooding a common issue for Hanover Park homeowners?',
        answer:
          "It's a real risk here. Most homes in Hanover Park date back to the 1970s building boom, and a lot of them are still running on their original sump systems, now pushing 50 years old. When one of those fails during a storm, flooding can happen fast.",
      },
      {
        question: 'Do you give a quote before starting work?',
        answer:
          "Yes. We walk you through what's wrong and give you a flat-rate price before any work starts, so you know the cost going in. No guessing, no surprise add-ons.",
      },
      {
        question: 'Are J. Blanton plumbers licensed and insured in Illinois?',
        answer: "Yes. We're licensed, bonded, and insured to work in Illinois.",
      },
      {
        question: 'How much does a plumber cost in Hanover Park?',
        answer:
          "Cost depends on the job: what's wrong, how much access we need, and whether parts have to be special-ordered. We give you a flat-rate price before we start, based on your specific situation. Call us and we'll walk you through it.",
      },
    ],
  },

  // ── 9. NO DRIP CLUB ──────────────────────────────────────────────────────
  ndc: {
    eyebrow: 'Annual Protection Plan',
    h2: [
      { text: 'Join the No Drip Club', href: '/no-drip-club/' },
      { text: ' for Year-Round Plumbing Protection' },
    ],
    body: 'Prevent costly repairs before they disrupt your life. The No Drip Club keeps your plumbing and sump systems monitored and serviced regularly by our best technicians.',
    benefits: [
      'Two Free Professional Maintenance Visits per Year',
      '10% Discount on All General Plumbing & Sewer Services',
      '5-Year Parts and Labor Warranty on Approved Projects',
      'VIP Priority Scheduling Status (Skip the Queue)',
    ],
    cta: { label: 'Learn More About the No Drip Club', href: '/no-drip-club/' },
  },

  // ── 10. FINAL CTA ────────────────────────────────────────────────────────
  finalCta: {
    eyebrow: 'Get In Touch',
    h2: "Hanover Park's Plumber — Available When You Need Us Most",
    text: "Whether it's a burst pipe at 2 a.m. or a sump pump that just gave out during a storm, our Hanover Park technicians are ready to help.",
    cta: '{{phone}}',
  },
};

/**
 * Substitute this module's own `{{phone}}` token.
 *
 * Deliberately NOT `renderCmsInline` / `renderCmsBlock` — Brief 180 hard rule 1
 * bans every piece of CMS plumbing on this page. Pure string replacement, no
 * sanitizer, no DB, no HTML: the result is rendered as a text node.
 */
export function withPhone(copy: string, phoneDisplay: string): string {
  return copy.split('{{phone}}').join(phoneDisplay);
}
