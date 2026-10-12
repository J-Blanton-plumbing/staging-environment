/**
 * City Hubs V2 (Brief 205) — the sections every city hub shares, verbatim from the approved
 * Highland Park hub (Brief 196 Rev 2) as cloned by Brief 205: hero quick links, Mid CTA, Why Us,
 * Video, No Drip Club list and the review-proof BBB row. City-specific copy lives in `<slug>.ts`.
 */
export const CITY_HUB_SHARED = {
  heroPillsLabel: 'Quick links',
  heroPills: [
    { label: 'Emergency Plumbing', href: '/emergency-plumbing' },
    { label: 'Knowledge Hub', href: '/knowledge-hub' },
    { label: 'Financing', href: '/financing' },
    { label: 'Help & Support', href: '/help-and-support' },
  ],
  badge24Label: '24 hours, 7 days a week emergency service',
  trustLabel: 'Why homeowners trust J. Blanton',
  servicesEyebrow: 'What We Fix',
  officeSchedule: 'Schedule',
  depthEyebrow: 'Local Knowledge',
  fin: {
    eyebrow: 'Financing',
    h2: 'Fix It With Financing As Low As 0%',
    body: 'We’ve partnered with trusted lenders, so you can get the service you need now and pay on your terms.',
    disclaimer: 'Subject to credit approval. Rates and terms vary.',
    cta: 'Ask about financing options',
  },
  why: {
    eyebrow: 'Why J. Blanton',
    intro: 'The most common complaint about plumbing companies is simple: you called a plumber and got a salesman. Here’s how we work instead.',
    /** `{camera}` is replaced by a link to `/{city}/video-camera-sewer-inspections`. */
    items: [
      { h3: 'Options, Not a Sales Pitch', body: 'Our plumber explains the problem in plain English first. When it’s a drain or sewer issue, we can [run a camera down the line]({camera}) so you see what we see. Then you decide.' },
      { h3: 'A Clear Price Before Any Work Starts', body: 'We give you a flat-rate price before we touch anything. The price we quote is the price you pay, with no surprise add-ons when the job is done.' },
      { h3: 'We Treat an Emergency Like One', body: 'Our phone line is open around the clock, including weekends and holidays. When water is coming into your basement, we work to get a plumber to your home as soon as we can.' },
    ],
    image: { src: '/images/city-hubs/plumber-sewer-camera-front-steps.webp', alt: 'J. Blanton plumber in shoe covers on a home’s front steps with a sewer camera' },
  },
  video: {
    eyebrow: 'Meet J. Blanton',
    h2: 'Big Enough to Get the Job Done, Small Enough to Care',
    intro: 'We’ve grown a lot since 1993, but the way we work hasn’t changed. Here’s a closer look at who we are.',
    title: 'Meet J. Blanton Plumbing',
    embed: 'https://www.youtube-nocookie.com/embed/ZDFzUtjBUCk?rel=0',
  },
  /** HP's filled VideoObject block, byte-for-byte (Brief 205 §2.1). The page's only JSON-LD. */
  videoJsonLd: {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: 'Meet J. Blanton Plumbing',
    description: 'J. Blanton Plumbing delivers fast, reliable, same-day plumbing service across Chicago and the surrounding suburbs.',
    thumbnailUrl: 'https://i.ytimg.com/vi/ZDFzUtjBUCk/maxresdefault.jpg',
    uploadDate: '2025-05-21T07:47:39-07:00',
    duration: 'PT47S',
    contentUrl: 'https://www.youtube.com/watch?v=ZDFzUtjBUCk',
    embedUrl: 'https://www.youtube.com/embed/ZDFzUtjBUCk',
  },
  reviewsProofLabel: 'Review ratings and accreditation',
  verified: 'Verified Customer',
  readOnGoogle: 'Read on Google',
  bbb: {
    href: 'https://www.bbb.org/us/il/morton-grove/profile/plumber/j-blanton-plumbing-0654-88664305/#sealclick',
    alt: 'BBB Accredited Business seal',
    src: '/images/city-hubs/seal-bbb-accredited.webp',
    label: 'Accredited business. View our BBB profile',
  },
  faqEyebrow: 'Common Questions',
  ndc: {
    eyebrow: 'Annual Protection Plan',
    h2: 'Join the No Drip Club',
    benefits: [
      'Two Free Professional Maintenance Visits per Year',
      '10% Discount on All General Plumbing & Sewer Services',
      '5-Year Parts and Labor Warranty on Approved Projects',
      'VIP Priority Scheduling Status (Skip the Queue)',
    ],
    cta: 'Learn More About the No Drip Club',
    href: '/no-drip-club/',
    mascot: { src: '/images/city-hubs/no-drip-club-mascot.webp', alt: 'No Drip Club mascot: an illustrated J. Blanton plumber holding a red pipe wrench' },
  },
  finalSchedule: 'Schedule a Service',
  /** The 40-entry "Explore all our plumbing services" stripe: HP's groups, names and order. */
  stripe: [
    ['Plumbing', [['Burst Pipe Repair', 'burst-pipe-repair'], ['Emergency Plumbing', 'emergency-plumbing'], ['Faucet Installation & Repair', 'faucet-installation-repair'], ['Garbage Disposal Installation & Repair', 'garbage-disposal-installation-repair'], ['Kitchen Faucet Repair & Installation', 'kitchen-faucet-repair-and-installation'], ['Kitchen Plumbing', 'kitchen-plumbing'], ['Leak Repairs', 'leak-repairs'], ['Plumbing Fixture Installations', 'plumbing-fixture-installations'], ['Plumbing Maintenance', 'plumbing-maintenance'], ['Shower Repair', 'shower-repair'], ['Toilet Installation & Repair', 'toilet-installation-repair']]],
    ['Sewer Services', [['Hydro Jetting', 'hydro-jetting'], ['Overhead Sewer Systems', 'overhead-sewer-systems'], ['Sewage Line Backup Services', 'sewage-line-backup-services'], ['Sewer Drain Clearing', 'sewer-drain-clearing'], ['Sewer Maintenance', 'sewer-maintenance'], ['Sewer Repair', 'sewer-repair'], ['Sewer Rodding', 'sewer-rodding'], ['Trenchless Sewer Repair', 'trenchless-sewer-repair'], ['Video Camera Sewer & Drain Inspections', 'video-camera-sewer-inspections']]],
    ['Drains & Basements', [['Basement Flooding', 'basement-flooding'], ['Basement Waterproofing', 'basement-waterproofing'], ['Catch Basin', 'catch-basin'], ['Clogged Drains', 'clogged-drains'], ['Drain Cleaning', 'drain-cleaning'], ['Ejector Pump', 'ejector-pump'], ['Kitchen Sink Drain', 'kitchen-sink-drain'], ['Sump Pumps', 'sump-pumps']]],
    ['Water Heaters', [['Commercial Water Heater', 'commercial-water-heater'], ['Residential Water Heater', 'residential-water-heater'], ['Tankless Water Heater', 'tankless-water-heater'], ['Water Heater Installation', 'water-heater-installation'], ['Water Heater Maintenance', 'water-heater-maintenance'], ['Water Heater Repair', 'water-heater-repair']]],
    ['Gas Lines', [['Gas Fireplace', 'gas-fireplace'], ['Gas Line Installation', 'gas-line-installation'], ['Gas Line Leak Detection', 'gas-line-leak-detection'], ['Gas Line Repair', 'gas-line-repair']]],
    ['Water Filtration & Testing', [['Water Filtration Systems', 'water-filtration-systems'], ['Water Testing', 'water-testing']]],
  ] as ReadonlyArray<readonly [string, ReadonlyArray<readonly [string, string]>]>,
  stripeTitle: 'Explore all our plumbing services',
} as const;
