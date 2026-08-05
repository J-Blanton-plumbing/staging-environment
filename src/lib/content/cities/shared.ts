/**
 * Shared, non-per-city data for the city pages.
 *
 *  - `WATER_TESTING_FAQS`  — the global `jb_faq` set the live site shows on every
 *    city page (topic-mismatched water-testing Q&As; reproduced for fidelity,
 *    flagged for copy review). Used by BOTH the Local Office (Evanston) and
 *    Coverage Area templates so the data lives in one place.
 *  - `coverageServiceCategories(slug?)` — the STATIC OUR SERVICES menu from
 *    `template-parts/city-services-menu.php`, identical across coverage-area
 *    cities; only the per-city slug in each href differs. (No "Other Services"
 *    category and gas-line-leak-detection sits under Gas Lines, NOT Plumbing —
 *    the two differences from the Local Office accordion, brief §7.)
 *    Called with NO slug it emits global (non-city) service hrefs — Brief 138.
 *  - `resolveHeroImage()` — the PHP hero-image fallback logic (page-city.php 25–39).
 */
import type { CityFaq, CityServiceCategory } from './types';
import { globalServiceHref } from '../service-taxonomy';

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
  // Brief 126 (Fix A): the old WordPress uploads tree is gone — any value still
  // pointing there (e.g. Plumbing-Rough-In-800x600.jpg, cleared from the CMS by
  // scripts/migrate-brief-126-clear-wp-image-refs.ts) can never load. Treat it
  // as unset so the standard fallback applies even if stale data reappears.
  if (heroImage.includes('wp-content/uploads')) return HERO_IMAGE_FALLBACK;
  if (heroImage.startsWith('http') || heroImage.startsWith('/')) return heroImage;
  const file = heroImage.includes('.') ? heroImage : `${heroImage}.webp`;
  return `${CDN}/images/${file}`;
}

/* ── Elfsight widget IDs ─────────────────────────────────────────────────────
 * Ported verbatim from jb-blanton/functions.php `jb_get_elfsight_ids()` (hero
 * reviews) and page-city.php `$elfsight_content_map` (section reviews).
 * The social/TikTok widget is shared across all city pages.
 * ──────────────────────────────────────────────────────────────────────────── */

const _MCHENRY    = '55b5212b-bef7-488d-a0ce-0629fd1dfaa0';
const _ELGIN      = '395fbb1e-5f6b-4759-b2db-3d620c51e4e2';
const _ARH        = 'ca133efa-2c1f-4f4b-8095-6c07545044c8';
const _NBROOK     = 'bef726a2-1770-4806-9892-b36e55593142';
const _HINSDALE   = '5ce3f59e-a315-4272-a1e9-12f6e0843e75';
const _NAPERVILLE = '8342aee5-5fc9-4945-a8fd-f5ed625a682e';
const _EVANSTON   = '978a5a86-73cd-41c5-8b3a-1cb716957341';
const _JOLIET     = '266c99c1-530c-4f93-8046-bab90e4a05e5';

/** Per-city hero Google Reviews widget IDs (functions.php `jb_get_elfsight_ids`). */
const ELFSIGHT_HERO_ID_MAP: Record<string, string> = {
  'chicago-lincoln-park': '4cd46e30-dbbb-4bd9-be5d-96c6da17ed11',
  'algonquin':            '40f0bd27-b99c-4171-87b2-f600ef6d8210',
  'arlington-heights':    _ARH,
  'elgin':                _ELGIN,
  'evanston':             _EVANSTON,
  'hinsdale':             _HINSDALE,
  'mchenry':              _MCHENRY,
  'naperville':           _NAPERVILLE,
  'northbrook':           _NBROOK,
  'geneva':               '5915094e-aea7-4fe6-ade1-2d32c34c0e6d',
  // Brief 126 (Fix C): Elmhurst's dedicated widget 269bffb8-4e1c-4be0-ae5e-f54aeb0f43ab
  // returns WIDGET_NOT_FOUND from Elfsight (badge rendered blank). Mapped to the
  // site-wide default hero badge (_JOLIET, used on 78 pages) until Marketing
  // creates a dedicated Elmhurst widget in the Elfsight account — swap the ID
  // here when they do.
  'elmhurst':             _JOLIET,
  // McHenry hub
  'allens-corners': _MCHENRY, 'almora': _MCHENRY, 'alora-heights': _MCHENRY,
  'antioch': _MCHENRY, 'barrington-hills': _MCHENRY, 'belden': _MCHENRY,
  'bull-valley': _MCHENRY, 'burtons-bridge': _MCHENRY, 'cary': _MCHENRY,
  'channel-lake': _MCHENRY, 'crystal-lake': _MCHENRY, 'ferndale': _MCHENRY,
  'forest-lake': _MCHENRY, 'fox-lake': _MCHENRY, 'fox-lake-hills': _MCHENRY,
  'franklinville': _MCHENRY, 'grandwood-park': _MCHENRY, 'greenwood': _MCHENRY,
  'hainesville': _MCHENRY, 'harmony': _MCHENRY, 'hartland': _MCHENRY,
  'hawthorn-woods': _MCHENRY, 'holiday-hills': _MCHENRY, 'huntley': _MCHENRY,
  'ingleside': _MCHENRY, 'ingleside-shore': _MCHENRY, 'island-lake': _MCHENRY,
  'johnsburg': _MCHENRY, 'kildeer': _MCHENRY, 'lake-barrington': _MCHENRY,
  'lake-catherine': _MCHENRY, 'lake-in-the-hills': _MCHENRY, 'lake-villa': _MCHENRY,
  'lake-zurich': _MCHENRY, 'lakemoor': _MCHENRY, 'lindenhurst': _MCHENRY,
  'long-grove': _MCHENRY, 'long-lake': _MCHENRY, 'mccullom-lake': _MCHENRY,
  'mylith-park': _MCHENRY, 'oakwood-hills': _MCHENRY, 'old-mill-creek': _MCHENRY,
  'pistakee-highlands': _MCHENRY, 'prairie-grove': _MCHENRY, 'richmond': _MCHENRY,
  'ridgefield': _MCHENRY, 'ringwood': _MCHENRY, 'round-lake': _MCHENRY,
  'round-lake-beach': _MCHENRY, 'round-lake-heights': _MCHENRY, 'round-lake-park': _MCHENRY,
  'solon-mills': _MCHENRY, 'spring-grove': _MCHENRY, 'trout-valley': _MCHENRY,
  'venetian-cillage': _MCHENRY, 'venetian-village': _MCHENRY,
  'village-of-lakewood': _MCHENRY, 'volo': _MCHENRY, 'wauconda': _MCHENRY,
  'williams-park': _MCHENRY, 'wonder-lake': _MCHENRY, 'woodstock': _MCHENRY,
  // Elgin hub
  'bartlett': _ELGIN, 'burlington': _ELGIN, 'campton-hills': _ELGIN,
  'carol-stream': _ELGIN, 'gilberts': _ELGIN, 'hampshire': _ELGIN,
  'knoll-creek-west': _ELGIN, 'lily-lake': _ELGIN, 'new-lebanon': _ELGIN,
  'pingree-grove': _ELGIN, 'plato-center': _ELGIN, 'south-elgin': _ELGIN,
  'st-charles': _ELGIN, 'starks': _ELGIN, 'west-highland-acre': _ELGIN,
  'wildwood-valley': _ELGIN, 'williamsburg-green': _ELGIN,
  // Arlington Heights hub
  'bloomingdale': _ARH, 'deer-park': _ARH, 'elk-grove': _ARH,
  'hanover-park': _ARH, 'hoffman-estates': _ARH, 'inverness': _ARH,
  'keeneyville': _ARH, 'mount-prospect': _ARH, 'palatine': _ARH,
  'prospect-heights': _ARH, 'rolling-meadows': _ARH, 'roselle': _ARH,
  'schaumburg': _ARH, 'wheeling': _ARH,
  // Northbrook hub
  'bannockburn': _NBROOK, 'buffalo-grove': _NBROOK, 'fort-sheridan': _NBROOK,
  'glencoe': _NBROOK, 'green-oaks': _NBROOK, 'gurnee': _NBROOK,
  'highwood': _NBROOK, 'highland-park': _NBROOK, 'indian-creek': _NBROOK,
  'kenilworth': _NBROOK, 'knollwood': _NBROOK, 'lake-bluff': _NBROOK,
  'lake-forest': _NBROOK, 'libertyville': _NBROOK, 'lincolnshire': _NBROOK,
  'mettawa': _NBROOK, 'mundelein': _NBROOK, 'north-chicago': _NBROOK,
  'northfield': _NBROOK, 'rondout': _NBROOK, 'vernon-hills': _NBROOK,
  'waukegan': _NBROOK, 'wells-corners': _NBROOK, 'winnetka': _NBROOK,
  // Hinsdale hub
  'burr-ridge': _HINSDALE, 'butterfield': _HINSDALE, 'clarendon-hills': _HINSDALE,
  'darien': _HINSDALE, 'downers-grove': _HINSDALE, 'glen-ellyn': _HINSDALE,
  'la-grange': _HINSDALE, 'lombard': _HINSDALE, 'oak-brook': _HINSDALE,
  'oakbrook-terrace': _HINSDALE, 'villa-park': _HINSDALE, 'westchester': _HINSDALE,
  'western-springs': _HINSDALE, 'westmont': _HINSDALE, 'york-center': _HINSDALE,
  // Naperville hub
  'aurora': _NAPERVILLE, 'bolingbrook': _NAPERVILLE, 'plainfield': _NAPERVILLE,
  'romeoville': _NAPERVILLE, 'welco-corners': _NAPERVILLE, 'woodridge': _NAPERVILLE,
  // Evanston hub
  'morton-grove': _EVANSTON, 'skokie': _EVANSTON, 'wilmette': _EVANSTON,
  // Joliet hub
  'alsip': _JOLIET, 'arbury-hills': _JOLIET, 'blue-island': _JOLIET,
  'bonnie-brae': _JOLIET, 'chicago-heights': _JOLIET, 'country-club-hills': _JOLIET,
  'crest-hill': _JOLIET, 'fairmont': _JOLIET, 'flossmoor': _JOLIET,
  'frankfort': _JOLIET, 'frankfort-square': _JOLIET, 'harvey': _JOLIET,
  'homer-glen': _JOLIET, 'homewood': _JOLIET, 'ingalls-park': _JOLIET,
  'joliet': _JOLIET, 'lemont': _JOLIET, 'lockport': _JOLIET,
  'lockport-heights': _JOLIET, 'manhattan': _JOLIET, 'markham': _JOLIET,
  'matteson': _JOLIET, 'midlothian': _JOLIET, 'mokena': _JOLIET,
  'new-lenox': _JOLIET, 'oak-forest': _JOLIET, 'orland-park': _JOLIET,
  'palos-heights': _JOLIET, 'palos-hills': _JOLIET, 'park-forest': _JOLIET,
  'preston-heights': _JOLIET, 'rockdale': _JOLIET, 'roseland': _JOLIET,
  'south-holland': _JOLIET, 'tinley-park': _JOLIET,
};
const ELFSIGHT_HERO_DEFAULT = _JOLIET;

/** Per-city content-section (body) Google Reviews widget IDs (page-city.php `$elfsight_content_map`). */
const ELFSIGHT_CONTENT_ID_MAP: Record<string, string> = {
  'algonquin':         '8a4401fa-c2fb-411e-9bf3-8e691c1a9d5b',
  'arlington-heights': '63cfff20-7624-4c5b-9d7a-1ee39d90d602',
  'elgin':             '54f95d6e-ce23-49c6-b3ac-8e4234199072',
  'hinsdale':          '6a7311e8-5c7b-427d-9517-2a73c6b64d6c',
  'mchenry':           'ce2757ba-58d8-43ec-8e87-5003099a592c',
  'naperville':        '53445308-2ca6-49c1-ac47-da5c3a6401f6',
  'northbrook':        '37a7d292-8861-4ea3-9680-c342123c50bc',
  'geneva':            'e082be80-78f3-407c-aaba-6cc5442c12ad',
};
const ELFSIGHT_CONTENT_DEFAULT = '67911321-4b72-4209-b157-fc9812eadd3b';

/** Shared social/TikTok widget ID — same across all city pages. */
export const ELFSIGHT_SOCIAL_ID = '9f370c11-108b-412b-8529-6b3f093f04a3';

export function getElfsightHeroId(slug: string): string {
  return ELFSIGHT_HERO_ID_MAP[slug] ?? ELFSIGHT_HERO_DEFAULT;
}
export function getElfsightContentId(slug: string): string {
  return ELFSIGHT_CONTENT_ID_MAP[slug] ?? ELFSIGHT_CONTENT_DEFAULT;
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
  {
    name: 'Other Services',
    icon: 'u_shape_tube.svg',
    links: [
      ['sewage-line-backup-services', 'Sewage Line Backup Services'],
    ],
  },
];

/**
 * Build the static OUR SERVICES categories.
 *
 * With a `citySlug` (city pages) each item is city-scoped `/{city}/{service}` —
 * the `[city]/[service]` route renders every one of them.
 *
 * WITHOUT a `citySlug` (Brief 138 — utility/static pages that reuse this menu,
 * e.g. /j-blanton-is-hiring, /privacy-policy) items resolve to the GLOBAL
 * service pages via `globalServiceHref`. Passing a non-city slug used to emit
 * ~40 dead `/{page}/{service}` links; omitting it is now the correct call and
 * `CityServicesMenu` additionally refuses any slug that isn't a registered city.
 */
export function coverageServiceCategories(citySlug?: string): CityServiceCategory[] {
  return STATIC_SERVICE_MENU.map((cat) => ({
    name: cat.name,
    icon: `${CDN}/images/${cat.icon}`,
    links: cat.links.map(([slug, label]) => ({
      label,
      href: citySlug ? `/${citySlug}/${slug}` : globalServiceHref(slug),
    })),
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
