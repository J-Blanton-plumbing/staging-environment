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
