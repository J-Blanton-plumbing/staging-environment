export interface Testimonial {
  name: string;
  location: string;
  body: string;
  stars: number;
  image: string;
  imageAlt: string;
}

export interface CustomerStoriesContent {
  hero: {
    heading: string;
    subheading: string;
    patternImage: string;
  };
  heroNav: {
    helpHref?: string;
  };
  testimonials: Testimonial[];
  behindTheReview: {
    heading: string;
    videoSrc: string;
    videoTitle: string;
  };
  elfsightWidgetId: string;
  involveme: {
    project: string;
    embedMode: string;
    triggerEvent: string;
    popupSize: string;
    organizationUrl: string;
  };
  cta: {
    heading: string;
    body: string;
    buttonLabel: string;
    googleButtonLabel: string;
    googleHref: string;
  };
}

export const CUSTOMER_STORIES: CustomerStoriesContent = {
  hero: {
    heading: 'CUSTOMER STORIES',
    subheading: 'Real reviews from real Chicagoland homeowners.',
    patternImage: '/images/pattern.webp',
  },
  heroNav: {},
  testimonials: [
    {
      name: 'Maria S.',
      location: 'Evanston, IL',
      body: 'J. Blanton came out same day when our basement drain backed up. The tech was professional, explained everything clearly, and had us back to normal in under two hours. Best plumbing experience we\'ve ever had — and we\'ve had a lot of plumbers.',
      stars: 5,
      image: '/images/character.webp',
      imageAlt: 'J. Blanton Plumbing technician',
    },
    {
      name: 'David R.',
      location: 'Chicago, IL',
      body: 'Called at 7 AM on a Sunday with a burst pipe. They answered immediately, arrived within the hour, and fixed everything without any emergency upcharge surprise. Honest, fast, and fair. I\'m a customer for life.',
      stars: 5,
      image: '/images/character.webp',
      imageAlt: 'J. Blanton Plumbing technician',
    },
    {
      name: 'Jennifer L.',
      location: 'Skokie, IL',
      body: 'We had a stubborn sewer issue that two other companies couldn\'t solve. J. Blanton diagnosed it with a camera inspection and cleared it the same visit. The technician walked me through the footage so I could see exactly what was going on. Truly above and beyond.',
      stars: 5,
      image: '/images/character.webp',
      imageAlt: 'J. Blanton Plumbing technician',
    },
    {
      name: 'Tom K.',
      location: 'Wilmette, IL',
      body: 'Had a water heater die on a Tuesday night. J. Blanton had a new unit installed by Wednesday afternoon. They were upfront about pricing before any work started and cleaned up after themselves. Exactly what you want from a plumber.',
      stars: 5,
      image: '/images/character.webp',
      imageAlt: 'J. Blanton Plumbing technician',
    },
    {
      name: 'Sarah M.',
      location: 'Oak Park, IL',
      body: 'Our No Drip Club membership has already saved us hundreds of dollars. The annual tune-up caught a small issue before it became a big one. Highly recommend signing up — it\'s completely worth it for the peace of mind alone.',
      stars: 5,
      image: '/images/character.webp',
      imageAlt: 'J. Blanton Plumbing technician',
    },
    {
      name: 'Carlos V.',
      location: 'Naperville, IL',
      body: 'Professional from first call to job completion. The dispatcher kept me updated on arrival time, the tech arrived exactly when promised, and the work was done right the first time. This is what five-star service actually looks like.',
      stars: 5,
      image: '/images/character.webp',
      imageAlt: 'J. Blanton Plumbing technician',
    },
    {
      name: 'Linda P.',
      location: 'Glenview, IL',
      body: 'I\'ve used J. Blanton for three different jobs over the past two years — a drain cleaning, a faucet replacement, and a full bathroom rough-in. Every single time the experience has been flawless. They\'ve earned a customer for life.',
      stars: 5,
      image: '/images/character.webp',
      imageAlt: 'J. Blanton Plumbing technician',
    },
  ],
  behindTheReview: {
    heading: 'BEHIND THE REVIEW',
    videoSrc: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    videoTitle: 'J. Blanton Plumbing — Behind the Review',
  },
  elfsightWidgetId: '266c99c1-530c-4f93-8046-bab90e4a05e5',
  involveme: {
    project: 'schedule-service-new',
    embedMode: 'popup',
    triggerEvent: 'button',
    popupSize: 'medium',
    organizationUrl: 'https://jblantonplumbing.involve.me',
  },
  cta: {
    heading: 'READY TO EXPERIENCE 5-STAR SERVICE?',
    body: 'Join thousands of Chicagoland homeowners who trust J. Blanton Plumbing for all their plumbing needs.',
    buttonLabel: 'Schedule Service Today',
    googleButtonLabel: 'Review Us on Google',
    googleHref: 'https://g.page/r/CW0h_mbUZBu5EAE/review',
  },
};
