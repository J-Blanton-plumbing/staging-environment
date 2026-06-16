/**
 * Editable copy for the Plumbing service page (`app/services/plumbing/page.tsx`).
 * Structured for CMS-readiness (audit ref C-02/C-03): prose lives here, not in JSX.
 * Empty strings are unwritten copy (former inline TODOs) and render as nothing today.
 */
export interface PlumbingSubcategory {
  label: string;
  href: string;
  image: string;
  desc: string;
}

export interface PlumbingContent {
  hero: {
    heading: string;
    intro: string;
  };
  intro: {
    heading: string;
    body: string;
  };
  problems: {
    heading: string;
    items: string[];
  };
  subcategories: {
    heading: string;
    items: PlumbingSubcategory[];
  };
  serviceArea: {
    heading: string;
    body: string;
  };
  tiktok: {
    headline: string;
  };
  preventative: {
    heading: string;
    body: string;
  };
  finalPitch: {
    tagline: string;
    body: string;
  };
  articles: {
    featuredSlugs: string[];
  };
}

export const PLUMBING: PlumbingContent = {
  hero: {
    heading: 'Expert Plumbing Services near you.',
    // Confirmed live hero description (brief-08 §1) — do not substitute.
    intro:
      'Expert Residential Plumbing Services You Can Trust. From bathroom remodels to water heater installations, our certified plumbers deliver quality solutions for your home. Call J. Blanton for professional plumbing done right!',
  },
  intro: {
    heading: 'EXPERT PLUMBING SOLUTIONS',
    body: "When you need plumbing services, trust J. Blanton's team of certified professionals. From kitchen remodels to bathroom upgrades, we deliver expert solutions for all your home's plumbing needs. Our skilled technicians arrive promptly, equipped to handle any residential plumbing challenge in the Chicagoland area.",
  },
  problems: {
    heading: 'Plumbing Problems We Solve',
    items: [
      'Kitchen and bathroom fixture repairs and installations',
      'Drain cleaning and unclogging services',
      'Pipe repair and replacement',
      'Water line installation and maintenance',
      'Faucet and sink repairs',
    ],
  },
  subcategories: {
    heading: 'Explore More Plumbing Solutions',
    items: [
      {
        label: 'Bathroom Plumbing',
        href: '/bathroom-plumbing-chicago',
        image: '/images/sub-bathroom-plumbing.webp',
        desc: 'Professional Chicago plumbers offer comprehensive bathroom plumbing solutions from minor repairs to full remodels.',
      },
      {
        label: 'Kitchen Plumbing',
        href: '/kitchen-plumbing',
        image: '/images/sub-kitchen-plumbing.webp',
        desc: 'We provide expert kitchen plumbing repairs and solutions for all your needs.',
      },
      {
        label: 'Laundry Room Plumbing',
        href: '/laundry-room-plumbing',
        image: '/images/laundry-room.webp',
        desc: 'Professional plumbers offering comprehensive laundry room repairs and installations.',
      },
      {
        label: 'Gas Lines',
        href: '/gas-lines-chicago',
        image: '/images/sub-gas-lines.webp',
        desc: 'Expert gas line technicians provide emergency repairs and solutions for leaks and line issues.',
      },
    ],
  },
  serviceArea: {
    heading: 'We’re Almost Everywhere',
    body: 'With more plumbers and more trucks at our disposal, we can cover more ground and reach your home quickly.',
  },
  tiktok: {
    headline: 'J Blanton Plumbing — Turning Bad Calls to Good Calls',
  },
  preventative: {
    heading: 'We Make Plumbing Problems Disappear',
    // ⚠️ CONFIRM (brief-08 §4): reproduced verbatim from live. This copy is
    // drain-focused ("Expert Drain Services", "drain emergencies", "drains") on
    // a plumbing page — almost certainly a copy-paste artifact in the live site.
    // Kept as-is to match live; flagged for a plumbing-specific copy rewrite later.
    body: "Expert Drain Services in Chicagoland\n\nThat's why we created the No Drip Club, a complete peace of mind solution that helps prevent costly drain emergencies. Our certified technicians keep your drains flowing smoothly with professional maintenance and rapid response when issues arise.",
  },
  // Final-pitch (F3) conversion block — theme fallback copy (brief-08 §5).
  finalPitch: {
    tagline: 'TURN A PLUMBING PROBLEM INTO A PERFECT SOLUTION',
    body: "What are you waiting for? The sooner you call, the sooner we'll be there.",
  },
  articles: {
    featuredSlugs: [
      'where-did-those-pink-stains-in-your-bathroom-come-from',
      'prepare-your-home-plumbing-for-the-chicago-cold-snap',
      'sewer-replacement-old-homes-chicagoland',
    ],
  },
};
