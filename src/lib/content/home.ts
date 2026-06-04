/**
 * Editable copy for the home page (`app/page.tsx`).
 * Structured for CMS-readiness (audit ref C-02/C-03): prose lives here, not in JSX.
 * Empty strings are unwritten copy (former inline TODOs) and render as nothing today.
 */
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
  tiktok: {
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
    headingTagline: 'Proudly Serving Chicago and Suburbs for Over 30 Years',
    intro:
      'Home is where life happens, but unexpected disruptions like a burst pipe or a kitchen flood can shatter the peace. When the unexpected strikes, trust J. Blanton Plumbing to be there.',
  },
  services: {
    heading: 'SERVICES',
    intro:
      'Our team of tenacious plumbers are always ready to leap into action to save your day, no matter how light or severe the situation.',
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
  findUs: {
    heading: 'FIND US',
    body: [
      'We’ve proudly served the Chicagoland area for 30+ years.',
      'Contact us or use the site map to find the location that’s nearest to you.',
    ],
  },
};
