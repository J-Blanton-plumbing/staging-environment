/**
 * Per-city content for the Local Office ("video-hero") city page template.
 * Source of truth: jb-blanton/page-city-v2.php + the live page /evanston
 * (brief-09). The three Local Office cities (Evanston, Northbrook, Elmhurst)
 * differ ONLY in this data; the builder + sub-components stay generic — drop in
 * `northbrook.ts` / `elmhurst.ts` later to reuse the same template.
 *
 * Shared types now live in `./types`; re-exported here so existing Brief 09
 * components (`CityVideoHero`, `CityServicesAccordion`, `FaqAccordion`) keep
 * importing them from this module unchanged. The shared water-testing FAQ set
 * lives in `./shared` and is reused verbatim.
 *
 * Asset URLs point at the live CloudFront CDN the production site uses
 * (https://d1rplazj5a80fb.cloudfront.net) so the clone matches live exactly.
 */
import type {
  CityServiceCategory,
  CityServiceLink,
  LocalOfficeContent,
} from './types';
import { WATER_TESTING_FAQS } from './shared';

export type {
  CityFaq,
  CityServiceLink,
  CityServiceCategory,
  CityHeroContact,
} from './types';
/** Back-compat alias: Brief 09 components import `CityContent` from here. */
export type { LocalOfficeContent as CityContent } from './types';

const CDN = 'https://d1rplazj5a80fb.cloudfront.net';

/** Build a category from the CDN icon filename + its links. */
function category(name: string, icon: string, links: CityServiceLink[]): CityServiceCategory {
  return { name, icon: `${CDN}/images/${icon}`, links };
}

/** All hrefs on this page are `/evanston/{slug}` (404 until the routing brief lands). */
function svc(label: string, slug: string): CityServiceLink {
  return { label, href: `/evanston/${slug}` };
}

export const EVANSTON: LocalOfficeContent = {
  slug: 'evanston',
  name: 'Evanston',

  hero: {
    video: {
      src: `${CDN}/videos/evanston-hero-horizontal.mp4`,
      poster: `${CDN}/images/tumbh2.webp`,
    },
    badge: { src: `${CDN}/images/home/247.webp`, alt: '24/7' },
    headingLine1: 'EVANSTON PLUMBING EXPERTS',
    ctaLabel: 'MAKE A GOOD CALL!',
    ctaHref: 'tel:773-724-9272',
    headingLine2: 'PROUDLY SERVING EVANSTON FOR OVER 30 YEARS',
    intro:
      'Evanston is where you call home, and when plumbing issues like a burst pipe or a flooded kitchen arise, it can feel overwhelming. At J. Blanton Plumbing, we’re proud to serve our fellow Evanston residents with fast, expert solutions that restore comfort and peace to your home.',
    // Evanston shows NO right-column phone button (brief-09 §1) — the H1 link is the CTA.
    contact: null,
  },

  why: {
    heading: 'WHY J. BLANTON FOR EVANSTON PLUMBING',
    // Live copy (ACF `city_content`, the "16,000 homes" version) — brief-09 §3.
    body: "At J. Blanton Plumbing, we've been Evanston's trusted local experts for over 30 years, delivering fast, reliable solutions for everything from clogged drains to emergency repairs. With over 16,000 homes in this vibrant city of tree-lined streets and historic charm, residents rely on our Illinois-certified plumbers for same-day service, upfront pricing, and expert care. Whether it's a quick fix or a full plumbing overhaul, we're dedicated to keeping Evanston's homes—from early 1900s classics to modern builds—running smoothly with professional service and peace of mind.",
    image: { src: `${CDN}/images/Zana+Northwestern.webp`, alt: 'Evanston' },
  },

  skylineImage: `${CDN}/images/downtown-floating.png`,

  services: {
    heading: 'OUR SERVICES',
    categories: [
      category('Plumbing', 'u_shape_tube.svg', [
        svc('Burst Pipe Repair', 'burst-pipe-repair'),
        svc('Emergency Plumbing', 'emergency-plumbing'),
        svc('Kitchen Faucet Repair & Installation', 'kitchen-faucet-repair-and-installation'),
        svc('Leak Repairs', 'leak-repairs'),
        svc('Plumbing Fixture Installations', 'plumbing-fixture-installations'),
        svc('Plumbing Maintenance', 'plumbing-maintenance'),
        svc('Shower Repair', 'shower-repair'),
        svc('Faucet Installation & Repair', 'faucet-installation-repair'),
        svc('Garbage Disposal Installation & Repair', 'garbage-disposal-installation-repair'),
        svc('Gas Line Leak Detection', 'gas-line-leak-detection'),
        svc('Kitchen Plumbing', 'kitchen-plumbing'),
        svc('Toilet Installation & Repair', 'toilet-installation-repair'),
      ]),
      category('Gas Lines', 'boiler.svg', [
        svc('Gas Fireplace', 'gas-fireplace'),
        svc('Gas Line Installation', 'gas-line-installation'),
        svc('Gas Line Repair', 'gas-line-repair'),
      ]),
      category('Water Filtration Systems', 'water_droplet.svg', [
        svc('Water Testing', 'water-testing'),
        svc('Water Filtration Systems', 'water-filtration-systems'),
      ]),
      category('Water Heater Services', 'waterfaucet.svg', [
        svc('Commercial Water Heater', 'commercial-water-heater'),
        svc('Water Heater Installation', 'water-heater-installation'),
        svc('Water Heater Maintenance', 'water-heater-maintenance'),
        svc('Water Heater Repair', 'water-heater-repair'),
        svc('Residential Water Heater', 'residential-water-heater'),
        svc('Tankless Water Heater', 'tankless-water-heater'),
      ]),
      category('Sewer & Drain', 'sink.svg', [
        svc('Basement Waterproofing', 'basement-waterproofing'),
        svc('Catch Basin', 'catch-basin'),
        svc('Clogged Drains', 'clogged-drains'),
        svc('Ejector Pump', 'ejector-pump'),
        svc('Drain Cleaning', 'drain-cleaning'),
        svc('Hydro Jetting', 'hydro-jetting'),
        svc('Kitchen Sink Drain', 'kitchen-sink-drain'),
        svc('Basement Flooding', 'basement-flooding'),
        svc('Sewer Drain Clearing', 'sewer-drain-clearing'),
        svc('Sewer Maintenance', 'sewer-maintenance'),
        svc('Sewer Repair', 'sewer-repair'),
        svc('Sewer Rodding', 'sewer-rodding'),
        svc('Sump Pumps', 'sump-pumps'),
        svc('Trenchless Sewer Repair', 'trenchless-sewer-repair'),
        svc('Overhead Sewer Systems', 'overhead-sewer-systems'),
        svc('Video Camera Sewer & Drain Inspections', 'video-camera-sewer-inspections'),
      ]),
      // "Other Services" — the theme's catch-all category for uncategorised child pages.
      category('Other Services', 'u_shape_tube.svg', [
        svc('Sewage Line Backup Services', 'sewage-line-backup-services'),
      ]),
    ],
  },

  reviews: { elfsightId: '37a7d292-8861-4ea3-9680-c342123c50bc' },

  social: {
    headline: 'J Blanton Plumbing - Turning Bad Calls to Good Calls',
    elfsightId: '9f370c11-108b-412b-8529-6b3f093f04a3',
  },

  // Live Evanston shows 3 local-interest posts. Those exact records aren't in
  // lib/articles.ts yet, so we wire the closest existing articles — structure
  // over exact records (brief-09 §8); swap slugs once the posts are imported.
  articles: {
    featuredSlugs: [
      'sewer-replacement-old-homes-chicagoland',
      'prepare-your-home-plumbing-for-the-chicago-cold-snap',
      'where-did-those-pink-stains-in-your-bathroom-come-from',
    ],
  },

  partners: [
    `${CDN}/partners/Art+and+Science.webp`,
    `${CDN}/partners/Dazzle+Logo.webp`,
    `${CDN}/partners/Eva+Nails.webp`,
    `${CDN}/partners/Lavender+Logo.webp`,
    `${CDN}/partners/Hops-Grapes_UberEats-Logo.webp`,
    `${CDN}/partners/follow-your-nose-logo.webp`,
  ],

  // Live FAQs are a shared global set (water-testing topic) identical across city
  // pages — reused verbatim for fidelity (brief-09 §10 / brief-10 §11); flagged
  // for copy review. Sourced from ./shared so the Coverage Area pages share it.
  faqs: WATER_TESTING_FAQS,

  meta: {
    title: 'Evanston Plumbing Experts',
    description:
      'J. Blanton Plumbing — Evanston’s trusted local plumbers for over 30 years. Same-day service, upfront pricing, and expert care for burst pipes, drains, water heaters, sewers, and more.',
  },
};
