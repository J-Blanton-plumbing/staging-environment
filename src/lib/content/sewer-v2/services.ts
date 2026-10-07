import type { SewerServiceEntry } from './types';

/**
 * Brief 200 (Track C) — the ONE list of sewer services behind both services components:
 *   - every service page's "What We Handle / Sewer Line Services We Provide" rows (`row`), which list
 *     the 8 siblings in this order and leave the page's own service out, then the Emergency row;
 *   - the hub's "Sewer Services We Provide" featured card + grid (`hub`, ordered by SEWER_HUB_ORDER).
 * A page cannot drift from its siblings because none of them carries its own copy of this list.
 * Strings are verbatim from the approved package (Brief 197 + the 2026-10-05 photo follow-ups).
 */
export const SEWER_SERVICES: SewerServiceEntry[] = [
  {
    slug: "trenchless-sewer-repair",
    href: "/trenchless-sewer-repair",
    image: "/images/services/sewer/trenchless-sewer-liner-prep.webp",
    row: {
      title: "Trenchless Sewer Line Repair",
      short: "Don't tear up your yard or driveway for a sewer repair.",
      alt: "Two J. Blanton plumbers pouring resin into a sewer liner bag to prepare a trenchless pipe lining",
    },
    hub: {
      title: "Trenchless Sewer Repair",
      desc: "Repairs a damaged line by lining the pipe in place, with no digging up your yard.",
      alt: "Two J. Blanton plumbers pouring resin into a sewer liner bag to prepare a trenchless pipe lining",
    },
  },
  {
    slug: "sewer-rodding",
    href: "/sewer-rodding",
    image: "/images/services/sewer/sewer-rodding-front-yard.webp",
    row: {
      title: "Sewer Rodding",
      short: "Clears most blockages fast.",
      alt: "J. Blanton plumber feeding the cable from a drum rodding machine into an outdoor sewer cleanout in a front yard",
    },
    hub: {
      title: "Sewer Rodding",
      desc: "Mechanical clearing for blockages like tree roots, grease, and debris, so water flows again fast.",
      alt: "J. Blanton plumber feeding the cable from a drum rodding machine into an outdoor sewer cleanout in a front yard",
    },
  },
  {
    slug: "sewer-repair",
    href: "/sewer-repair",
    image: "/images/services/sewer/sewer-repair-lining-machine.webp",
    row: {
      title: "Sewer Line Repair",
      short: "Fixes a damaged section of pipe without replacing the whole line.",
      alt: "J. Blanton plumbers working a sewer lining machine connected to the cleanout at a residential sewer repair",
    },
    hub: {
      title: "Sewer Line Repair",
      desc: "Fixes for damaged sections of pipe (cracks, joint separation, root intrusion through a seam) without replacing the whole line.",
      alt: "J. Blanton plumbers working a sewer lining machine connected to the cleanout at a residential sewer repair",
    },
  },
  {
    slug: "sewer-line-replacement",
    href: "/sewer-line-replacement",
    image: "/images/services/sewer/svc-sewer-replacement.webp",
    row: {
      title: "Sewer Line Replacement",
      short: "For lines too far gone for a targeted repair.",
      alt: "J. Blanton Plumbing technician guiding a hose into a sewer line access point during a replacement job",
    },
    hub: {
      title: "Sewer Line Replacement",
      desc: "For lines too far gone for a targeted repair: extensive cracking, collapse, or pipe material breaking down along most of its length.",
      alt: "J. Blanton Plumbing technician guiding a hose into a sewer line access point during a replacement job",
    },
  },
  {
    slug: "hydro-jetting",
    href: "/hydro-jetting",
    image: "/images/services/sewer/svc-hydro-jetting.webp",
    row: {
      title: "Hydro Jetting",
      short: "Flush out older buildup with high-pressure water.",
      alt: "J. Blanton Plumbing technician hydro jetting a sewer line through a Chicago street manhole",
    },
    hub: {
      title: "Hydro Jetting",
      desc: "High-pressure water clears grease, scale, and root buildup that rodding alone can't fully remove.",
      alt: "J. Blanton Plumbing technician hydro jetting a sewer line through a Chicago street manhole",
    },
  },
  {
    slug: "sewer-camera-inspection",
    href: "/sewer-camera-inspection",
    image: "/images/services/sewer/sewer-camera-inspection-backyard.webp",
    row: {
      title: "Sewer Camera Inspection",
      short: "See exactly what's causing the problem before any work begins.",
      alt: "Two J. Blanton plumbers watching the monitor of a sewer camera during a backyard sewer line inspection",
    },
    hub: {
      title: "Sewer Camera Inspection",
      desc: "A camera run through your line before we recommend anything, so you see exactly what's wrong and we walk you through the options.",
      alt: "Two J. Blanton plumbers watching the monitor of a sewer camera during a backyard sewer line inspection",
    },
  },
  {
    slug: "overhead-sewer-systems",
    href: "/overhead-sewer-systems",
    image: "/images/services/sewer/svc-overhead-sewer.webp",
    row: {
      title: "Overhead Sewer Systems",
      short: "Keeps sewage moving up and out, even during heavy rain.",
      alt: "J. Blanton Plumbing technician installing an overhead sewer pipe along a basement ceiling",
    },
    hub: {
      title: "Overhead Sewer Systems",
      desc: "Converts a gravity-fed line into a pump-driven system that keeps sewage moving up and out, even during heavy rain.",
      alt: "J. Blanton Plumbing technician installing an overhead sewer pipe along a basement ceiling",
    },
  },
  {
    slug: "sewer-maintenance",
    href: "/sewer-maintenance",
    image: "/images/services/sewer/sewer-cleanout-camera-maintenance.webp",
    row: {
      title: "Sewer Maintenance",
      short: "Routine service that catches small issues before they become a backup.",
      alt: "J. Blanton plumber opening an outdoor sewer cleanout in a front yard, with the sewer camera reel ready beside him",
    },
    hub: {
      title: "Sewer Line Maintenance",
      desc: "Routine service that catches small issues, like early root growth or a slow drain, before years of buildup turn into a backup in your basement.",
      alt: "J. Blanton plumber opening an outdoor sewer cleanout in a front yard, with the sewer camera reel ready beside him",
    },
  },
  {
    slug: "sewer-line-installation",
    href: "/sewer-line-installation",
    image: "/images/services/sewer/svc-sewer-install.webp",
    row: {
      title: "Sewer Line Installation",
      short: "New lines for new builds, conversions, and system upgrades.",
      alt: "J. Blanton Plumbing technician lowering a new sewer pipe into an excavated trench",
    },
    hub: {
      title: "Sewer Line Installation",
      desc: "New sewer line installation for new construction, conversions, and properties that need a first-time connection or a full system upgrade.",
      alt: "J. Blanton Plumbing technician gluing PVC pipe fittings in an excavated trench during a new sewer line installation",
    },
  },
];

/** The hub's featured service (Trenchless — promoted 2026-09-23 in the approved package). */
export const SEWER_HUB_FEATURED = 'trenchless-sewer-repair';

/** The hub grid, in the approved order (the featured service is not repeated in the grid). */
export const SEWER_HUB_ORDER = [
  'sewer-rodding',
  'sewer-repair',
  'sewer-line-replacement',
  'sewer-maintenance',
  'sewer-camera-inspection',
  'hydro-jetting',
  'sewer-line-installation',
  'overhead-sewer-systems',
] as const;

/** The red row that ends every service page's list. "Call Now" renders through PhoneLink. */
export const SEWER_EMERGENCY_ROW = {
  title: 'Emergency Service',
  short: 'Dispatched nights, weekends, and holidays.',
  image: '/images/services/sewer/emergency-call-under-sink.jpeg',
  alt: 'Woman kneeling by her kitchen sink, phone in hand, calling J. Blanton Plumbing for emergency service',
  cta: 'Call Now',
} as const;


export function sewerService(slug: string): SewerServiceEntry | undefined {
  return SEWER_SERVICES.find((s) => s.slug === slug);
}
