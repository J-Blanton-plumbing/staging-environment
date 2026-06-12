const CDN = 'https://d1rplazj5a80fb.cloudfront.net/images';

export interface WaterHeaterSubcategory {
  label: string;
  href: string;
  image: string;
  desc: string;
}

export interface WaterHeaterExtraSection {
  heading: string;
  para1: string;
  para2: string;
}

export interface WaterHeaterContent {
  hero: { heading: string; intro: string };
  intro: { heading: string; body: string };
  problems: { heading: string; items: string[] };
  subcategories: { heading: string; items: WaterHeaterSubcategory[] };
  extraSection1: WaterHeaterExtraSection;
  serviceArea: { heading: string; body: string };
  tiktok: { headline: string };
  preventative: { heading: string; body: string };
  extraSection2: WaterHeaterExtraSection;
  finalPitch: { tagline: string; body: string };
  heroImage: string;
  fImage: string;
  f3Image: string;
  articles: { featuredSlugs: string[] };
}

export const WATER_HEATER: WaterHeaterContent = {
  hero: {
    heading: 'Is Your Water Heater on the Fritz?',
    intro:
      'When hot water disappears, our licensed plumbers provide fast water heater repair and expert water heater installation to restore comfort day or night.',
  },
  intro: {
    heading: '24/7 Water Heater Experts You Can Rely On',
    body: "Water heater problems rarely happen at a convenient time. That's why our team is available around the clock. We arrive prepared, diagnose the issue clearly, and explain your options before any work begins.\n\nIf repair isn't the best long-term solution, we also provide professional water heater installation with minimal disruption to your home. Our goal is to get your hot water flowing again—safely and efficiently.",
  },
  problems: {
    heading: 'Fast Solutions for Common Water Heater Problems',
    items: [
      'No hot water or inconsistent temperatures',
      'Strange noises coming from the tank',
      'Leaks around the unit',
      'Pilot light or ignition failures',
      'Aging or inefficient systems',
    ],
  },
  subcategories: {
    heading: 'Explore More Water-Heater Solutions',
    items: [
      {
        label: 'Residential Water Heater',
        href: '/residential-water-heater',
        image: `${CDN}/img_residential-water-heater.webp`,
        desc: 'We provide rapid water heater repairs and installations to restore your hot water.',
      },
      {
        label: 'Tankless Water Heater',
        href: '/tankless-water-heater',
        image: `${CDN}/img_tankless-water-heater.webp`,
        desc: 'We offer professional tankless water heater repairs and maintenance to keep your hot water flowing.',
      },
      {
        label: 'Commercial Water Heater',
        href: '/commercial-water-heater',
        image: `${CDN}/img_commercial-water-heater.webp`,
        desc: 'Expert commercial water heater repair and installation services for businesses.',
      },
    ],
  },
  extraSection1: {
    heading: 'Professional Water Heater Installation Done Right',
    para1:
      'When a system reaches the end of its lifespan, a new installation may be the smarter choice. Our team helps you choose the right unit for your home and usage needs.',
    para2:
      'Every water heater installation is completed to code, with careful attention to safety and efficiency. We also remove old units and test everything before we leave.',
  },
  serviceArea: {
    heading: "We're Almost Everywhere",
    body: 'With more plumbers and more trucks at our disposal, we can cover more ground and reach your home quickly.',
  },
  tiktok: {
    headline: 'J Blanton Plumbing — Turning Bad Calls to Good Calls',
  },
  preventative: {
    heading: 'Avoid Cold Showers with the No Drip Club',
    body: "We hate cold showers too. That's why we created the No Drip Club, designed to keep your plumbing system running smoothly all year. Members enjoy proactive care that helps prevent surprise breakdowns and expensive water heater repairs. It's a simple way to protect your comfort and extend the life of your system.",
  },
  extraSection2: {
    heading: 'Prevent Problems Before They Start',
    para1:
      'Routine maintenance plays a key role in water heater performance. Small issues can often be caught early, reducing the need for emergency water heater repair later on.',
    para2:
      'With our maintenance services, we work to keep your hot water reliable and efficient.',
  },
  finalPitch: {
    tagline: 'Schedule Water Heater Services with Confidence',
    body: "Whether you need urgent repairs or are planning ahead for a new system, our team is here to help. From expert diagnostics to careful water heater installation, you'll get clear communication and dependable workmanship.",
  },
  heroImage: `${CDN}/hero_image.webp`,
  fImage: `${CDN}/preventative.webp`,
  f3Image: `${CDN}/manplumber.webp`,
  articles: {
    featuredSlugs: [
      '45532-boost-your-water-heaters-efficiency-the-role-of-ventilation-in-arlington-heights-homes',
      '4-headaches-you-can-avoid-with-plumbing-maintenance',
      'prepare-your-home-plumbing-for-the-chicago-cold-snap',
    ],
  },
};
