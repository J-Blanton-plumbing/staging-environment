const CDN = 'https://d1rplazj5a80fb.cloudfront.net/images';

export interface WaterQualitySubcategory {
  label: string;
  href: string;
  image: string;
  desc: string;
}

export interface WaterQualityContent {
  hero: { heading: string; intro: string };
  intro: { heading: string; body: string };
  problems: { heading: string; items: string[] };
  subcategories: { heading: string; items: WaterQualitySubcategory[] };
  serviceArea: { heading: string; body: string };
  tiktok: { headline: string };
  preventative: { heading: string; body: string };
  finalPitch: { tagline: string; body: string };
  heroImage: string;
  fImage: string;
  f3Image: string;
  articles: { featuredSlugs: string[] };
}

export const WATER_QUALITY: WaterQualityContent = {
  hero: {
    heading: 'J. BLANTON, YOUR WATER QUALITY EXPERTS',
    intro:
      "Pure, Clean Water 24/7: Expert Water Quality Solutions at Your Service. Don't compromise with contaminated or hard water—call us now! We'll transform your tap water into crystal-clear, healthy hydration.",
  },
  intro: {
    heading: 'PURE WATER SOLUTIONS',
    body: "Clean water is essential for your family's health. J. Blanton's expert team delivers comprehensive water filtration solutions, ensuring your home's water is pure and safe — right when you need it most.",
  },
  problems: {
    heading: 'PURE WATER WE DELIVER',
    items: [
      'Water testing and analysis',
      'Water filtration system installation',
      'Water softener installation',
      'Reverse osmosis system installation',
      'Water purification solutions',
    ],
  },
  subcategories: {
    heading: 'Explore More Water-Quality Solutions',
    items: [
      {
        label: 'Water Filtration Systems',
        href: '/water-filtration-systems',
        image: `${CDN}/img_water-filtration-system.webp`,
        desc: 'Expert water filtration installation transforms tap water into clean, healthy drinking water.',
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
    heading: 'WE CARE ABOUT CLEAN WATER TOO',
    body: "That's why we offer the No Drip Club—a comprehensive solution to ensure your water stays pure and safe, preventing and addressing water quality issues before they impact your home.",
  },
  finalPitch: {
    tagline: 'TURN WATER ISSUES INTO A CLEAR SOLUTION',
    body: "Don't let poor water quality disrupt your home! Our Chicago water quality experts are ready to restore your water's purity today.",
  },
  heroImage: `${CDN}/water-quality-hero.webp`,
  fImage: `${CDN}/preventative.webp`,
  f3Image: `${CDN}/manplumber.webp`,
  articles: {
    featuredSlugs: [
      'where-did-those-pink-stains-in-your-bathroom-come-from',
      '4-headaches-you-can-avoid-with-plumbing-maintenance',
      'prepare-your-home-plumbing-for-the-chicago-cold-snap',
    ],
  },
};
