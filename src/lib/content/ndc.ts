/**
 * Editable copy + config for the No Drip Club page (`app/no-drip-club/page.tsx`).
 * Structured for CMS-readiness (same pattern as `lib/content/home.ts`): every
 * string the page renders lives here as typed data — no prose is hardcoded in
 * the JSX. Strings come verbatim from the live theme (`page-no-drip-club.php`).
 */

/** Shared involve.me popup attributes (one project drives all three CTAs). */
export interface InvolveMeConfig {
  project: string;
  embedMode: string;
  triggerEvent: string;
  popupSize: string;
  organizationUrl: string;
}

/** A sub-heading + its list of checkmark benefit lines. */
export interface BenefitGroup {
  heading: string;
  items: string[];
}

/** A single "How It Works" step. */
export interface HowStep {
  label: string;
  text: string;
}

/**
 * Brief 141 — one row of the `comparison` variant's membership table. Transcribed
 * verbatim from the approved sell sheet (`ndc-sell-sheet/Back.png`).
 */
export interface ComparisonRow {
  label: string;
  /** Small qualifying line under the label. Null on most rows. */
  caveat: string | null;
  /** True = indented bullet child of the preceding parent row. */
  child: boolean;
  member: boolean;
  nonMember: boolean;
}

/** Brief 141 — one annual-term price card. `amount` is a Global Settings token. */
export interface ComparisonPriceCard {
  termLabel: string;
  amount: string;
  buttonLabel: string;
  /** Carmine border + shadow treatment. At most one card carries it. */
  emphasized: boolean;
}

/** Brief 141 — the `comparison` variant's Member vs. Non-Member section copy. */
export interface ComparisonContent {
  title: string;
  subtitle: string | null;
  memberColumnLabel: string;
  nonMemberColumnLabel: string;
  rows: ComparisonRow[];
  closingLine: string | null;
  prices: ComparisonPriceCard[];
  priceFootnote: string | null;
  /**
   * The two-line callout under HOW IT WORKS on the Carmine band. The sell sheet
   * also prints `CALL 773-724-9272` and `OR GO ONLINE JBLANTONPLUMBING.COM`
   * beneath these lines; both were removed on purpose by the marketing lead
   * (the phone is already in the site header and the URL is meaningless on the
   * site itself). Do not add them back.
   */
  callout: string[];
}

export interface NdcContent {
  hero: {
    heading: string;
    /** Empty on live (ACF field blank) — renders as nothing. */
    subheading: string;
    description: string;
    cta: string;
    videoSrc: string;
    videoTitle: string;
    patternImage: string;
  };
  card: {
    label: string;
    overlayImage: string;
    overlayAlt: string;
    /** Left column benefit groups (SERIOUS SAVINGS, VIP PEACE OF MIND). */
    leftColumn: BenefitGroup[];
    /** Right column benefit groups (COMPLIMENTARY HOME MAINTENANCE). */
    rightColumn: BenefitGroup[];
    pricing: string;
    footnotes: string[];
  };
  signUpCta: string;
  how: {
    heading: string;
    steps: HowStep[];
  };
  /**
   * Brief 141 — the `comparison` template variant's content. Used as the seed
   * source and as the pre-seed static fallback (`staticNdcMembershipComparisonData()`
   * in `@/lib/cms/membership-comparison`). The `classic` variant never reads it.
   */
  comparison: ComparisonContent;
  /** Elfsight widget class id (script is loaded globally in layout). */
  reviewsWidgetClass: string;
  wait: {
    heading: string;
    body: string;
    cta: string;
    image: string;
    imageAlt: string;
  };
  involveMe: InvolveMeConfig;
}

export const NDC: NdcContent = {
  hero: {
    heading: 'JOIN THE NO DRIP CLUB',
    subheading: '',
    description:
      "There are Good Calls—and then there's the No Drip Club. Members enjoy significant annual savings on home checkups, emergency repairs, and unlock exclusive perks, including VIP treatment whenever they call for service.",
    cta: 'Join Today',
    videoSrc: 'https://www.youtube-nocookie.com/embed/F-dPAWZcyZE?controls=0&rel=0&fs=0',
    videoTitle: 'No Drip Club Video',
    patternImage: '/images/wrench-pattern.webp',
  },
  card: {
    label: 'MEMBERS GET:',
    overlayImage: '/images/no-drip-club.webp',
    overlayAlt: 'NDC',
    leftColumn: [
      {
        heading: 'SERIOUS SAVINGS',
        items: [
          '10% Discount (Includes Service and Equipment)*',
          'Additional Exclusive Membership Pricing',
        ],
      },
      {
        heading: 'VIP PEACE OF MIND',
        items: [
          'VIP Priority Scheduling (Guaranteed Within 24 Hours)',
          'No Emergency Fees or Trip Charges',
          'No After-Hours or Holiday Charges',
          'Extended Labor Warranty (From 1 to 5 Years)',
        ],
      },
    ],
    rightColumn: [
      {
        heading: 'COMPLIMENTARY HOME MAINTENANCE',
        items: [
          '1 Free Drain Clearing Per Year',
          '1 Free Chemical Water Quality Analysis Per Year',
          'Free Annual Whole Home Plumbing Tune-Up',
          'Free Annual Sewer Camera Inspection',
          'Free Annual Water Heater Flush & Maintenance',
          'Free Annual Home Winterization',
        ],
      },
    ],
    pricing: 'All for just $29.97/month**',
    footnotes: [
      '*10% discount up to $500 per job, excluding membership pricing.',
      'Promotions and discounts are not stackable, and the higher value will be chosen.',
      '**Membership requires 12-month commitment.',
    ],
  },
  signUpCta: 'SIGN UP',
  how: {
    heading: 'HOW IT WORKS',
    steps: [
      { label: 'SIGN UP TODAY', text: 'Join the NDC today and enjoy member benefits right away.' },
      {
        label: 'CALL ANYTIME',
        text: 'Dial the exclusive members-only number for priority service 24/7/365.',
      },
      {
        label: 'RELAX FOREVER',
        text: "Rest easy knowing you're getting a good deal and even better service.",
      },
    ],
  },
  // Brief 141 — every string below is transcribed verbatim from the approved
  // sell sheet (`ndc-sell-sheet/Back.png`) and signed off. Wording,
  // capitalization and punctuation are as printed; do not "fix" them.
  comparison: {
    title: 'MEMBERSHIP BENEFITS',
    subtitle: 'RESIDENTIAL HOMES ONLY',
    memberColumnLabel: 'NO DRIP CLUB',
    nonMemberColumnLabel: 'NON MEMBER',
    rows: [
      { label: 'VIP - PRIORITY SCHEDULING', caveat: null, child: false, member: true, nonMember: false },
      { label: '10% DISCOUNT (INCLUDING SERVICE AND EQUIPMENT)', caveat: null, child: false, member: true, nonMember: false },
      { label: 'NO EMERGENCY FEES OR TRIP CHARGES', caveat: null, child: false, member: true, nonMember: false },
      { label: 'NO AFTER HOURS OR HOLIDAY CHARGES', caveat: null, child: false, member: true, nonMember: false },
      { label: '2 PREVENTATIVE MAINTENANCE VISITS PER YEAR:', caveat: null, child: false, member: true, nonMember: false },
      { label: 'FREE WATER HEATER FLUSH & MAINTENANCE', caveat: null, child: true, member: true, nonMember: false },
      { label: 'FREE SEWER CAMERA INSPECTION', caveat: null, child: true, member: true, nonMember: false },
      { label: 'FREE WHOLE HOME PLUMBING TUNE-UP', caveat: null, child: true, member: true, nonMember: false },
      {
        label: 'FREE CHEMICAL WATER TEST',
        caveat: '(as needed, only during maintenance visits)',
        child: true,
        member: true,
        nonMember: false,
      },
      {
        label: '1 FREE INTERIOR DRAIN CLEARING - TUB, KITCHEN, SINK',
        caveat: '(as needed, only during maintenance visits)',
        child: true,
        member: true,
        nonMember: false,
      },
    ],
    closingLine: 'Increases standard labor warranty from 1-year to 5-years',
    // Amounts are Global Settings TOKENS, not literals (Brief 141, Track A), so
    // the prices stay editable in one place. A literal typed here (or in the
    // block editor) silently detaches that card from Global Settings.
    prices: [
      { termLabel: '1 YEAR', amount: '{{ndc_price_1yr}}', buttonLabel: 'Join Today', emphasized: false },
      { termLabel: '2 YEARS', amount: '{{ndc_price_2yr}}', buttonLabel: 'Join Today', emphasized: true },
    ],
    priceFootnote:
      '*Charged upfront, auto renewal unless given 30-day notice, must save valid card on file to activate',
    callout: ['MAKE A GOOD CALL.', 'JOIN THE NO DRIP CLUB TODAY.'],
  },
  reviewsWidgetClass: 'elfsight-app-67911321-4b72-4209-b157-fc9812eadd3b',
  wait: {
    heading: 'WHAT ARE YOU WAITING FOR?',
    body: 'Still not convinced? Need more info?',
    cta: 'CONTACT US',
    image: '/images/preventative.webp',
    imageAlt: 'Plumbers',
  },
  involveMe: {
    project: 'no-drip-club',
    embedMode: 'popup',
    triggerEvent: 'button',
    popupSize: 'medium',
    organizationUrl: 'https://jblantonplumbing.involve.me',
  },
};
