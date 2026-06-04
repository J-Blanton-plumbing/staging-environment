/**
 * Shared, non-per-city data for the city pages.
 *
 *  - `WATER_TESTING_FAQS`  — the global `jb_faq` set the live site shows on every
 *    city page (topic-mismatched water-testing Q&As; reproduced for fidelity,
 *    flagged for copy review). Used by BOTH the Local Office (Evanston) and
 *    Coverage Area templates so the data lives in one place.
 *  - `coverageServiceCategories(slug)` — the STATIC OUR SERVICES menu from
 *    `template-parts/city-services-menu.php`, identical across coverage-area
 *    cities; only the per-city slug in each href differs. (No "Other Services"
 *    category and gas-line-leak-detection sits under Gas Lines, NOT Plumbing —
 *    the two differences from the Local Office accordion, brief §7.)
 *  - `resolveHeroImage()` — the PHP hero-image fallback logic (page-city.php 25–39).
 */
import type { CityFaq, CityServiceCategory } from './types';

const CDN = 'https://d1rplazj5a80fb.cloudfront.net';

export const HERO_IMAGE_FALLBACK = `${CDN}/images/hero_image.webp`;
export const WRENCH_PATTERN = `${CDN}/images/wrench_pattern.webp`;
export const MANPLUMBER_IMAGE = `${CDN}/images/manplumber.webp`;

/**
 * Resolve a per-city hero-image value to a full URL, mirroring page-city.php
 * 25–39: a full `http(s)` URL passes through; a plain slug/filename becomes
 * `/images/{x}.webp`; nothing falls back to `hero_image.webp`.
 */
export function resolveHeroImage(heroImage?: string): string {
  if (!heroImage) return HERO_IMAGE_FALLBACK;
  if (heroImage.startsWith('http')) return heroImage;
  const file = heroImage.includes('.') ? heroImage : `${heroImage}.webp`;
  return `${CDN}/images/${file}`;
}

/** Default 3 articles for coverage-area pages that don't name their own (brief §9). */
export const DEFAULT_ARTICLE_SLUGS = [
  'sewer-replacement-old-homes-chicagoland',
  'prepare-your-home-plumbing-for-the-chicago-cold-snap',
  'where-did-those-pink-stains-in-your-bathroom-come-from',
];

/**
 * Static OUR SERVICES menu — ported verbatim from city-services-menu.php.
 * `[slug, label]` pairs; the builder prefixes `/{city}/` per city.
 */
const STATIC_SERVICE_MENU: { name: string; icon: string; links: [string, string][] }[] = [
  {
    name: 'Plumbing',
    icon: 'u_shape_tube.svg',
    links: [
      ['burst-pipe-repair', 'Burst Pipe Repair'],
      ['emergency-plumbing', 'Emergency Plumbing'],
      ['faucet-installation-repair', 'Faucet Installation & Repair'],
      ['garbage-disposal-installation-repair', 'Garbage Disposal Installation & Repair'],
      ['kitchen-faucet-repair-and-installation', 'Kitchen Faucet Repair & Installation'],
      ['kitchen-plumbing', 'Kitchen Plumbing'],
      ['leak-repairs', 'Leak Repairs'],
      ['plumbing-fixture-installations', 'Plumbing Fixture Installations'],
      ['plumbing-maintenance', 'Plumbing Maintenance'],
      ['shower-repair', 'Shower Repair'],
      ['toilet-installation-repair', 'Toilet Installation & Repair'],
    ],
  },
  {
    name: 'Gas Lines',
    icon: 'boiler.svg',
    links: [
      ['gas-fireplace', 'Gas Fireplace'],
      ['gas-line-installation', 'Gas Line Installation'],
      ['gas-line-leak-detection', 'Gas Line Leak Detection'],
      ['gas-line-repair', 'Gas Line Repair'],
    ],
  },
  {
    name: 'Water Filtration Systems',
    icon: 'water_droplet.svg',
    links: [
      ['water-filtration-systems', 'Water Filtration Systems'],
      ['water-testing', 'Water Testing'],
    ],
  },
  {
    name: 'Water Heater Services',
    icon: 'waterfaucet.svg',
    links: [
      ['commercial-water-heater', 'Commercial Water Heater'],
      ['residential-water-heater', 'Residential Water Heater'],
      ['tankless-water-heater', 'Tankless Water Heater'],
      ['water-heater-installation', 'Water Heater Installation'],
      ['water-heater-maintenance', 'Water Heater Maintenance'],
      ['water-heater-repair', 'Water Heater Repair'],
    ],
  },
  {
    name: 'Sewer & Drain',
    icon: 'sink.svg',
    links: [
      ['basement-flooding', 'Basement Flooding'],
      ['basement-waterproofing', 'Basement Waterproofing'],
      ['catch-basin', 'Catch Basin'],
      ['clogged-drains', 'Clogged Drains'],
      ['drain-cleaning', 'Drain Cleaning'],
      ['ejector-pump', 'Ejector Pump'],
      ['hydro-jetting', 'Hydro Jetting'],
      ['kitchen-sink-drain', 'Kitchen Sink Drain'],
      ['overhead-sewer-systems', 'Overhead Sewer Systems'],
      ['sewage-line-backup-services', 'Sewage Line Backup Services'],
      ['sewer-drain-clearing', 'Sewer Drain Clearing'],
      ['sewer-maintenance', 'Sewer Maintenance'],
      ['sewer-repair', 'Sewer Repair'],
      ['sewer-rodding', 'Sewer Rodding'],
      ['sump-pumps', 'Sump Pumps'],
      ['trenchless-sewer-repair', 'Trenchless Sewer Repair'],
      ['video-camera-sewer-inspections', 'Video Camera Sewer & Drain Inspections'],
    ],
  },
];

/** Build the static OUR SERVICES categories for a given city slug. */
export function coverageServiceCategories(citySlug: string): CityServiceCategory[] {
  return STATIC_SERVICE_MENU.map((cat) => ({
    name: cat.name,
    icon: `${CDN}/images/${cat.icon}`,
    links: cat.links.map(([slug, label]) => ({ label, href: `/${citySlug}/${slug}` })),
  }));
}

/**
 * The shared global FAQ set (live `jb_faq`) shown identically on every city page.
 * Topic-mismatched (water testing) — reproduced verbatim for fidelity, flagged
 * for copy review (brief §11 / Brief 09 §10).
 */
export const WATER_TESTING_FAQS: CityFaq[] = [
  {
    question:
      'How can water testing help identify any potential issues with my household water supply that may not be visible or noticeable?',
    answer:
      'Water testing can help identify potential issues with your household water supply by detecting contaminants, such as bacteria, lead, pesticides, or other harmful substances that may not be visible or noticeable. Testing can also determine the pH levels, hardness, and other factors that can affect the quality of your water and potentially cause health problems or damage to your plumbing system. Regular water testing is essential to ensure the safety and quality of your drinking water.',
  },
  {
    question:
      'What are the potential health risks associated with not regularly testing my household water, and how can water testing help prevent these risks?',
    answer:
      'Potential health risks associated with not regularly testing household water include exposure to harmful contaminants such as bacteria, lead, pesticides, and other pollutants. Water testing can help prevent these risks by identifying any contaminants present in the water supply, allowing for appropriate treatment or filtration measures to be implemented to ensure the water is safe for consumption. Regular testing can also help detect any issues early on before they become a serious health concern for you and your family.',
  },
  {
    question:
      'How often should I have my water tested to ensure the continued safety and quality of my household water supply?',
    answer:
      'It is recommended to have your water tested annually to ensure the continued safety and quality of your household water supply.',
  },
  {
    question:
      'What specific contaminants can water testing detect, and how can addressing these improve the overall health and safety of my household water supply?',
    answer:
      'Water testing can detect contaminants such as bacteria, lead, pesticides, nitrates, and other harmful substances. Addressing these contaminants can improve the overall health and safety of your household water supply by reducing the risk of waterborne illnesses, protecting against potential long-term health effects, and ensuring that your water meets regulatory standards for safe drinking water.',
  },
  {
    question:
      "Can you explain the process of water testing and how it can benefit my home's water quality?",
    answer:
      "Water testing involves collecting samples of your home's water and analyzing them for various contaminants such as bacteria, lead, pesticides, and other harmful substances. By conducting water testing, you can identify any potential issues with your water quality and take appropriate measures to address them, such as installing water filtration systems or treatment devices. Regular water testing can help ensure that your family has access to clean and safe drinking water.",
  },
];
