/**
 * Per-city content for Columbus, OH — Brief 154 dummy content, cloned from
 * `./evanston.ts` (the only V1 local-office city with a dedicated content
 * file — Algonquin/Elgin are `local-office` registry entries that fall back to
 * their `CoverageAreaContent` files; see `index.ts` COVERAGE_CONTENT).
 *
 * ⚠️ DUMMY CONTENT (Brief 154, Track B). This is Evanston's copy with the city
 * name and state substituted — no new marketing prose was written. Marketing
 * replaces this with real Columbus copy in a later brief. Section shape, field
 * count, and order are byte-for-byte identical to evanston.ts on purpose (Hard
 * rule: no redesign, no new template).
 *
 * Columbus is the first OUT-OF-STATE office (every other city/office is
 * Illinois). Every "Illinois" in the source copy is substituted to "Ohio"; the
 * factual claims that don't generalize (30 years, 16,000 homes, early-1900s
 * housing stock) are Evanston-specific and are LEFT AS-IS per the brief's "swap
 * the name/state tokens only, don't rewrite" rule — flagged in the Brief 154
 * report as copy Marketing must replace, not fix here.
 *
 * Items that could NOT be meaningfully cloned (brief-154 Track B.6):
 *  - hero.video / hero.video.poster: Evanston's own drone/b-roll footage. No
 *    Columbus video exists yet, so the REFERENCE VALUE IS LEFT IN PLACE (a
 *    broken/missing hero would fail the "no empty blocks" verification) —
 *    flagged for a Columbus-specific video in the report.
 *  - why.image: a locally-shot Evanston photo (Northwestern University).
 *    Reference value left in place for the same reason — flagged for a
 *    Columbus-specific photo.
 *  - skylineImage: a decorative Chicago downtown skyline graphic, shared
 *    across the (currently Illinois-only) Local Office cities. Left in place
 *    (it's decorative art, not copy) — flagged in the report since it depicts
 *    the wrong city for an Ohio page.
 *  - partners: OMITTED (empty array). These are named Evanston, IL businesses
 *    (nail salons, a bar) — reusing them on a Columbus, OH page would imply a
 *    partnership that doesn't exist, which is worse than an empty section.
 *    `LocalOfficeCity` already hides the "OUR PARTNERS" block when this array
 *    is empty, so no empty block renders. Flagged for a curated Columbus
 *    partners list.
 *  - articles.featuredSlugs: reused DEFAULT_ARTICLE_SLUGS (shared.ts) — the
 *    same site-wide default Evanston itself uses, not an Evanston-only pick.
 */
import type {
  CityServiceCategory,
  CityServiceLink,
  LocalOfficeContent,
} from './types';
import { WATER_TESTING_FAQS, DEFAULT_ARTICLE_SLUGS, ELFSIGHT_HERO_DEFAULT } from './shared';

const CDN = 'https://d1rplazj5a80fb.cloudfront.net';

/** Build a category from the CDN icon filename + its links. */
function category(name: string, icon: string, links: CityServiceLink[]): CityServiceCategory {
  return { name, icon: `${CDN}/images/${icon}`, links };
}

/** All hrefs on this page are `/columbus/{slug}` (mirrors evanston.ts). */
function svc(label: string, slug: string): CityServiceLink {
  return { label, href: `/columbus/${slug}` };
}

export const COLUMBUS: LocalOfficeContent = {
  slug: 'columbus',
  name: 'Columbus',

  hero: {
    // ⚠️ Evanston's video/poster, left in place — see file docblock. Swap for
    // Columbus-specific footage when Marketing supplies it (Brief 154 report).
    video: {
      src: `${CDN}/videos/evanston-hero-horizontal.mp4`,
      poster: `${CDN}/images/tumbh2.webp`,
    },
    badge: { src: `${CDN}/images/home/247.webp`, alt: '24/7' },
    headingLine1: 'COLUMBUS PLUMBING EXPERTS',
    ctaLabel: 'MAKE A GOOD CALL!',
    ctaHref: 'tel:773-724-9272',
    headingLine2: 'PROUDLY SERVING COLUMBUS FOR OVER 30 YEARS',
    intro:
      'Columbus is where you call home, and when plumbing issues like a burst pipe or a flooded kitchen arise, it can feel overwhelming. At J. Blanton Plumbing, we’re proud to serve our fellow Columbus residents with fast, expert solutions that restore comfort and peace to your home.',
    // Columbus shows NO right-column phone button, matching Evanston (brief-09 §1) — the H1 link is the CTA.
    contact: null,
  },

  why: {
    heading: 'WHY J. BLANTON FOR COLUMBUS PLUMBING',
    // Evanston's copy (ACF `city_content`) with the city name + state substituted.
    // Population figure and housing-stock claims are Evanston-specific and are
    // NOT Columbus facts — dummy placeholder, see file docblock.
    body: "At J. Blanton Plumbing, we've been Columbus's trusted local experts for over 30 years, delivering fast, reliable solutions for everything from clogged drains to emergency repairs. With over 16,000 homes in this vibrant city of tree-lined streets and historic charm, residents rely on our Ohio-certified plumbers for same-day service, upfront pricing, and expert care. Whether it's a quick fix or a full plumbing overhaul, we're dedicated to keeping Columbus's homes—from early 1900s classics to modern builds—running smoothly with professional service and peace of mind.",
    // ⚠️ Evanston's own photo (Northwestern University), left in place — see file docblock.
    image: { src: `${CDN}/images/Zana+Northwestern.webp`, alt: 'Columbus' },
  },

  // ⚠️ Decorative Chicago skyline graphic, shared/left in place — see file docblock.
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

  // ⚠️ Brief 154 (Track B.5): Columbus has no Elfsight Google Reviews widget of
  // its own yet, so this uses the SITE-WIDE DEFAULT widget ID — exactly the
  // treatment Elmhurst got in shared.ts's `ELFSIGHT_HERO_ID_MAP` (Brief 126,
  // Fix C) until its own widget existed. This means /columbus (and every
  // /columbus/{service} page) shows ANOTHER OFFICE's Google reviews until
  // Marketing creates a Columbus Elfsight widget and sends the ID — swap this
  // for the real widget ID when they do.
  reviews: { elfsightId: ELFSIGHT_HERO_DEFAULT },

  social: {
    headline: 'J Blanton Plumbing - Turning Bad Calls to Good Calls',
    elfsightId: '9f370c11-108b-412b-8529-6b3f093f04a3',
  },

  // Reused from the shared site-wide default (shared.ts DEFAULT_ARTICLE_SLUGS) —
  // the same 3 slugs Evanston itself uses, not an Evanston-only pick.
  articles: {
    featuredSlugs: DEFAULT_ARTICLE_SLUGS,
  },

  // ⚠️ Brief 154 (Track B.6): OMITTED. Evanston's partners are named Evanston,
  // IL businesses (a nail salon, a bar, a UberEats listing) — reusing them here
  // would imply a Columbus partnership that doesn't exist. `LocalOfficeCity`
  // hides the "OUR PARTNERS" section when this is empty, so nothing renders.
  // Flagged in the Brief 154 report for a curated Columbus partners list.
  partners: [],

  // Live FAQs are a shared global set (water-testing topic) identical across city
  // pages — reused verbatim for fidelity (brief-09 §10 / brief-10 §11); flagged
  // for copy review. Sourced from ./shared so the Coverage Area pages share it.
  faqs: WATER_TESTING_FAQS,

  meta: {
    title: 'Columbus Plumbing Experts',
    description:
      'J. Blanton Plumbing — Columbus’s trusted local plumbers for over 30 years. Same-day service, upfront pricing, and expert care for burst pipes, drains, water heaters, sewers, and more.',
  },
};
