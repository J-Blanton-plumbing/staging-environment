/**
 * Hanover Park — Local Office City V3 content.
 *
 * Brief 181 (Track B1). MOVED from `src/lib/content/hanover-park-test.ts`, which
 * backed the review URL `/hanover-park-test` (Brief 180 + Marketing revision
 * rounds 1–5 of 2026-09-17). The data block below is that file's, transformed by
 * a script rather than re-typed, so no approved sentence could drift in the
 * move. `.scripts-out/b181-make-content.js` prints every edit it makes.
 *
 * ── THE ONLY THINGS THAT CHANGED, AND WHY ──────────────────────────────────
 * Brief 181 hard rule 1: the approved copy, section order and layout ship
 * unchanged. Four categories of edit are authorised, and nothing else was
 * touched:
 *
 * 1. D3/D4 — LINK DESTINATIONS. Every href here used to carry the live
 *    WordPress trailing slash, so every internal link was at minimum a one-hop
 *    301. Six of the seven service cards now point at the city-scoped
 *    `/hanover-park/{service}` page; Commercial keeps `/services/commercial`
 *    because no city-scoped commercial page exists. The inline "sump pumps"
 *    link was the page's weakest: `/sump-pumps/` 301'd to `/services/sewer`, a
 *    generic category page, from the section this page's whole strategy
 *    promotes. It now points at `/hanover-park/sump-pumps`, which is a real,
 *    live, self-canonical, sitemap-listed page about that service in that city.
 *    Every destination was measured at 200 on production before it shipped.
 *
 * 2. D5 — ALT TEXT. The two photographs carried `provisionalAlt`; the field is
 *    now `alt` and both strings were rewritten against the images themselves.
 *    Still pending Marketing's sign-off — see the Brief 181 report.
 *
 * 3. `meta.title` LOST ITS BRAND SUFFIX. The review page rendered its title with
 *    `title.absolute`, so the approved string shipped verbatim, em dash and all.
 *    A `[city]` page composes through the root layout's `TITLE_TEMPLATE`
 *    instead, and Marketing confirmed the vertical separator on 2026-09-18. See
 *    `CityV3Meta.title`.
 *
 * 4. FIELD AND SECTION NAMES generalised (`HANOVER_PARK_TEST` →
 *    `HANOVER_PARK_V3`, `sumpPump` → `featuredService`, `Hpt*` → `CityV3*`).
 *    Brief 182 lifts these names straight into the CMS schema, and `sumpPump` is
 *    a Hanover Park fact, not a template one — the section's own eyebrow reads
 *    "Featured Service". No rendered string is affected.
 *
 * ── STILL SUSPENDED ────────────────────────────────────────────────────────
 * `video` holds three approved strings that DO NOT RENDER — Marketing pulled the
 * section on 2026-09-17 with the words "FOR NOW". Deleting the block would
 * quietly convert a suspension into a decision, so it stays. Restoring the
 * section is a template change only.
 */
import type { CityV3Content } from '@/types/city-v3';

export const HANOVER_PARK_V3: CityV3Content = {
  // ── META DATA ────────────────────────────────────────────────────────────
  meta: {
    title: 'Hanover Park Plumbers, Available 24/7',
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
      alt:
        'A J. Blanton Plumbing technician in tan overalls and a red cap stands in a residential street holding a metal toolbox, beside an orange J. Blanton Plumbing van parked outside a brick apartment building.',
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
        title: 'Emergency',
        href: '/hanover-park/emergency-plumbing',
        body: [{ text: 'We offer fast drain and plumbing services for emergencies.' }],
      },
      {
        title: 'Plumbing',
        href: '/hanover-park/plumbing-services',
        body: [
          { text: 'Our Illinois-certified plumbers are trained and skilled for complex plumbing tasks.' },
        ],
      },
      {
        title: 'Sewer',
        href: '/hanover-park/sewer-repair',
        body: [
          { text: 'Sewer services' },
          { text: ' ensure clogs are resolved and plumbing stays smooth.' },
        ],
      },
      {
        title: 'Drain',
        href: '/hanover-park/drain-cleaning',
        body: [
          { text: 'Drain services' },
          { text: " keep your home's plumbing running smoothly." },
        ],
      },
      {
        title: 'Water Heater',
        href: '/hanover-park/residential-water-heater',
        body: [
          { text: "Ensure consistent hot water with J. Blanton Plumbing's " },
          { text: 'water heater services' },
          { text: '.' },
        ],
      },
      {
        title: 'Water Quality',
        href: '/hanover-park/water-filtration-systems',
        body: [
          { text: 'Water filtration' },
          { text: ' ensures clean, safe water and protects your health and plumbing.' },
        ],
      },
      {
        title: 'Commercial',
        href: '/services/commercial',
        body: [
          {
            text: 'Reliable and efficient plumbing solutions tailored to meet the needs of your business.',
          },
        ],
        flag: 'fixed template copy, off-persona for a homeowners-only page. Swap decision pending.',
      },
    ],
  },

  // ── 3. FEATURED SERVICE — sump pump & basement flooding protection ───────
  featuredService: {
    // ⚠ PROVISIONAL — see CityV3FeaturedService.eyebrow.
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
        { text: 'sump pumps', href: '/hanover-park/sump-pumps' },
        { text: " and backup systems so a heavy rain doesn't turn into a flooded basement." },
      ],
    ],
    image: {
      src: '/images/hanover-park/sump-pump.webp',
      width: 1400,
      height: 933,
      alt:
        'A J. Blanton Plumbing technician in a red hooded sweatshirt and work gloves kneels over an open sump pit in a basement, holding the pump’s power cord, with PVC drain lines, a water heater and a tool bag around him.',
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
    // ⚠ PROVISIONAL — see CityV3Video.eyebrow.
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
    // ⚠ PROVISIONAL — see CityV3Reviews.sourceLabel.
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
    // ⚠ INVENTED, NOT APPROVED — see CityV3Faq.h2.
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
      { text: 'Join the No Drip Club', href: '/no-drip-club' },
      { text: ' for Year-Round Plumbing Protection' },
    ],
    body: 'Prevent costly repairs before they disrupt your life. The No Drip Club keeps your plumbing and sump systems monitored and serviced regularly by our best technicians.',
    benefits: [
      'Two Free Professional Maintenance Visits per Year',
      '10% Discount on All General Plumbing & Sewer Services',
      '5-Year Parts and Labor Warranty on Approved Projects',
      'VIP Priority Scheduling Status (Skip the Queue)',
    ],
    cta: { label: 'Learn More About the No Drip Club', href: '/no-drip-club' },
  },

  // ── 10. FINAL CTA ────────────────────────────────────────────────────────
  finalCta: {
    eyebrow: 'Get In Touch',
    h2: "Hanover Park's Plumber — Available When You Need Us Most",
    text: "Whether it's a burst pipe at 2 a.m. or a sump pump that just gave out during a storm, our Hanover Park technicians are ready to help.",
    cta: '{{phone}}',
  },

  // ── OFFICE (not copy — the map's address comes from global settings) ──────
  // Matched on city NAME, not slug: the live office rows store their slug with
  // a leading slash ("/hanover-park"), a data quirk no template should depend on.
  officeCity: 'Hanover Park',
  // Used only when global settings has no matching office record, so the map
  // still pins correctly with the database down.
  officeAddressFallback: '1300 Greenbrook Blvd, Suite B5, Hanover Park, IL 60133',
};
