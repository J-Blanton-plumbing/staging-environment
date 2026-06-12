const CDN = 'https://d1rplazj5a80fb.cloudfront.net/images';

export interface DrainSubcategory {
  label: string;
  href: string;
  image: string;
  desc: string;
}

export interface DrainContent {
  hero: { heading: string; intro: string };
  intro: { heading: string; body: string };
  problems: { heading: string; items: string[] };
  subcategories: { heading: string; items: DrainSubcategory[] };
  serviceArea: { heading: string; body: string };
  tiktok: { headline: string };
  preventative: { heading: string; body: string };
  finalPitch: { tagline: string; body: string };
  heroImage: string;
  fImage: string;
  f3Image: string;
  articles: { featuredSlugs: string[] };
}

export const DRAIN: DrainContent = {
  hero: {
    heading: 'Are You Having Drain Troubles?',
    intro:
      'Slow water, bad smells, and recurring clogs are common drain problems that can quickly disrupt daily routines, but at J. Blanton Plumbing, our experienced team has the tools and expertise to diagnose the issue fast and fix it the right way.',
  },
  intro: {
    heading: 'Drain Solutions Experts on Standby',
    body: 'Our plumbers use proven methods to restore proper flow. We inspect lines, identify blockages, and recommend the best fix.\n\nFrom thorough cleaning to targeted repairs, we handle each drain issue with care. Every service is tailored to your home and plumbing system. You can trust J. Blanton Plumbing for lasting results.',
  },
  problems: {
    heading: 'Reliable Solutions for Common Drain Problems',
    items: [
      'Slow moving water in sinks or tubs',
      'Frequent clogs that keep coming back',
      'Foul odors coming from pipes',
      'Gurgling sounds or backups',
    ],
  },
  subcategories: {
    heading: 'Explore More Drain Solutions',
    items: [
      {
        label: 'Clogged Drains',
        href: '/clogged-drains-in-chicago',
        image: `${CDN}/img_clogged-drains.webp`,
        desc: 'We quickly clear all types of clogged drains in Chicago.',
      },
      {
        label: 'Basement Flooding',
        href: '/basement-flooding',
        image: `${CDN}/Basement-flooding.webp`,
        desc: 'We provide emergency response services to handle basement flooding and restore your space.',
      },
      {
        label: 'Kitchen Sink Drain',
        href: '/kitchen-sink-drain',
        image: `${CDN}/Kitchen-Sink-Drain.webp`,
        desc: 'Professional plumbers fix kitchen sink drain problems to restore normal function.',
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
    heading: 'Join the No Drip Club',
    body: 'The No Drip Club is our premium maintenance program. Members receive priority scheduling and routine inspections. This helps catch small issues before they become big repairs. Discounts and exclusive benefits are included. It\'s an easy way to protect your plumbing year-round.',
  },
  finalPitch: {
    tagline: 'Schedule Your Drain Service Today',
    body: "Don't wait for small issues to get worse. Scheduling service is quick and easy. Our team is ready to help when you need it most. Book online or call to speak with a specialist. Let J. Blanton Plumbing handle your next drain service with confidence.",
  },
  heroImage: `${CDN}/hero_image.webp`,
  fImage: `${CDN}/clogged-drain-hero.webp`,
  f3Image: `${CDN}/manplumber.webp`,
  articles: {
    featuredSlugs: [
      'brown-friday-plumbing-drain-clog-emergency',
      '4-headaches-you-can-avoid-with-plumbing-maintenance',
      'where-did-those-pink-stains-in-your-bathroom-come-from',
    ],
  },
};
