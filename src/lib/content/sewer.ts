const CDN = 'https://d1rplazj5a80fb.cloudfront.net/images';

export interface SewerSubcategory {
  label: string;
  href: string;
  image: string;
  desc: string;
}

export interface SewerContent {
  hero: { heading: string; intro: string };
  intro: { heading: string; body: string };
  problems: { heading: string; items: string[] };
  subcategories: { heading: string; items: SewerSubcategory[] };
  serviceArea: { heading: string; body: string };
  tiktok: { headline: string };
  preventative: { heading: string; body: string };
  finalPitch: { tagline: string; body: string };
  heroImage: string;
  fImage: string;
  f3Image: string;
  articles: { featuredSlugs: string[] };
}

export const SEWER: SewerContent = {
  hero: {
    heading: "SEWER PROBLEMS? J. BLANTON'S ON THE WAY!",
    intro:
      "24/7 Emergency Sewer Service: When disaster strikes, we're here. From backed-up lines to overflowing drains, our expert team will respond immediately to protect your home and restore your peace of mind. Don't wait—call us now!",
  },
  intro: {
    heading: 'SEWER EXPERTS ON CALL',
    body: "When sewer problems strike, every second counts. J. Blanton isn't just one plumber—we're a full team of sewer repair specialists ready to act fast. Whatever the issue, we'll have the right expert at your door, ready to tackle your sewer emergency — as soon as humanly possible.",
  },
  problems: {
    heading: 'SEWER EMERGENCIES SOLVED',
    items: [
      'Emergency sewer line repair and replacement',
      '24/7 sewer backup and clog removal',
      'Main line cleaning and repair',
      'Trenchless sewer repair services',
      'Camera inspection and diagnostics',
    ],
  },
  subcategories: {
    heading: 'Explore More Sewer Solutions',
    items: [
      {
        label: 'Sewer Rodding',
        href: '/sewer-rodding',
        image: `${CDN}/img_sewer-rodding.webp`,
        desc: 'We provide emergency sewer rodding to quickly clear blocked drains and sewage backups.',
      },
      {
        label: 'Sewer Repair',
        href: '/sewer-repair',
        image: `${CDN}/img_sewer-repair.webp`,
        desc: 'Professional sewer repair services transform emergencies into permanent solutions.',
      },
      {
        label: 'Sewer Maintenance',
        href: '/sewer-maintenance',
        image: `${CDN}/img_sewer-maintenance.webp`,
        desc: 'We provide expert sewer line maintenance to address slow drains, odors, and clogs.',
      },
      {
        label: 'Home Repipe',
        href: '/home-repipe',
        image: `${CDN}/img_home-repipe.webp`,
        desc: 'Professional plumbers provide comprehensive home repiping services and system upgrades.',
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
    heading: 'WE HATE SEWER PROBLEMS TOO',
    body: "That's why we created our expert sewer repair service, a complete peace of mind solution that helps you avoid costly emergency repairs and property damage.",
  },
  finalPitch: {
    tagline: 'TURN A SEWER CRISIS INTO A CLEAN SOLUTION',
    body: "Don't wait until your sewer problems get worse. Call us now for immediate sewer repair service.",
  },
  heroImage: `${CDN}/chicago-sewer.webp`,
  fImage: `${CDN}/preventative.webp`,
  f3Image: `${CDN}/sewer-f3.webp`,
  articles: {
    featuredSlugs: [
      'sewer-replacement-old-homes-chicagoland',
      'pvc-vs-abs-pipes',
      'prepare-your-home-plumbing-for-the-chicago-cold-snap',
    ],
  },
};
