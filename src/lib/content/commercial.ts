const CDN = 'https://d1rplazj5a80fb.cloudfront.net/images';

export interface CommercialSubcategory {
  label: string;
  href: string;
  image: string;
  desc: string;
}

export interface CommercialContent {
  hero: { heading: string; intro: string };
  intro: { heading: string; body: string };
  problems: { heading: string; items: string[] };
  subcategories: { heading: string; items: CommercialSubcategory[] };
  serviceArea: { heading: string; body: string };
  tiktok: { headline: string };
  preventative: { heading: string; body: string };
  finalPitch: { tagline: string; body: string };
  heroImage: string;
  fImage: string;
  f3Image: string;
  articles: { featuredSlugs: string[] };
}

export const COMMERCIAL: CommercialContent = {
  hero: {
    heading: 'J. BLANTON KEEP YOUR BUSINESS FLOWING',
    intro:
      "If your business is experiencing plumbing issues, we're here to help! From clogged drains to water heater problems, our expert team delivers fast, reliable solutions to keep your operations running smoothly.",
  },
  intro: {
    heading: 'PLUMBING EXPERTS STANDING BY',
    body: "When it comes to commercial plumbing, every service matters. At J. Blanton, you're not just getting a single technician—you're backed by a full team of plumbing experts. Whatever the issue, we'll send the right professional to your door, ready to diagnose and resolve the problem with precision and expertise you can trust.",
  },
  problems: {
    heading: 'COMMERCIAL PLUMBING SERVICES',
    items: [],
  },
  subcategories: {
    heading: 'Explore More Commercial Plumbing Solutions',
    items: [
      {
        label: 'Commercial Jetting',
        href: '/commercial-jetting',
        image: `${CDN}/Commercial+Jetting+copy.webp`,
        desc: '',
      },
      {
        label: 'Commercial Drain Service',
        href: '/commercial-drain-service',
        image: `${CDN}/drain-hero.webp`,
        desc: '',
      },
      {
        label: 'Commercial Water Heater',
        href: '/commercial-water-heater',
        image: `${CDN}/img_commercial-water-heater.webp`,
        desc: '',
      },
      {
        label: 'Restaurant Plumbing Service',
        href: '/restaurant-plumbing-services',
        image: `${CDN}/img_restaurant-plumbing-services.webp`,
        desc: '',
      },
      {
        label: 'Restaurant Drain Clearing',
        href: '/restaurant-drain-clearing',
        image: `${CDN}/sewer.webp`,
        desc: '',
      },
      {
        label: 'Restaurant Water Heater',
        href: '/restaurant-water-heater',
        image: `${CDN}/commercial-water-heater.webp`,
        desc: '',
      },
    ],
  },
  serviceArea: {
    heading: "We're Almost Everywhere",
    body: 'With more plumbers and more trucks at our disposal, we can cover more ground and reach your home quickly.',
  },
  tiktok: {
    headline: 'J Blanton Plumbing — Turning Bad Calls to Good Calls',
  },
  preventative: {
    heading: 'WE HATE PLUMBING PROBLEMS TOO',
    body: "That's why we created COMMERCIAL PLUMBING EXPERTS, a comprehensive commercial plumbing solution that helps businesses maintain efficient operations through expert drain services, water heater installations, and specialized restaurant plumbing maintenance.",
  },
  finalPitch: {
    tagline: 'WE TURN PLUMBING PROBLEMS INTO PLUMBING CONFIDENCE',
    body: "Why let plumbing problems disrupt your business? Trust our commercial plumbing experts for fast, reliable solutions that keep your operations running smoothly.",
  },
  heroImage: `${CDN}/Commercial+Jetting+copy.webp`,
  fImage: `${CDN}/Commercial+Jetting+copy.webp`,
  f3Image: `${CDN}/manplumber.webp`,
  articles: {
    featuredSlugs: [
      'brown-friday-plumbing-drain-clog-emergency',
      '4-headaches-you-can-avoid-with-plumbing-maintenance',
      'prepare-your-home-plumbing-for-the-chicago-cold-snap',
    ],
  },
};
