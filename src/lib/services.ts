export interface Service {
  slug: string;
  name: string;
  shortDesc: string;
  iconUrl: string;
}

export const SERVICES: Service[] = [
  {
    slug: 'emergency-plumbing',
    name: 'Emergency',
    shortDesc: 'We offer fast drain and plumbing services for emergencies.',
    iconUrl: '/images/icon-phone.svg',
  },
  {
    slug: 'plumbing',
    name: 'Plumbing',
    shortDesc: 'Our Illinois-certified plumbers are trained and skilled for complex plumbing tasks.',
    iconUrl: '/images/icon-utube.svg',
  },
  {
    slug: 'sewer',
    name: 'Sewer',
    shortDesc: 'Sewer services ensure clogs are resolved and plumbing stays smooth.',
    iconUrl: '/images/icon-home.svg',
  },
  {
    slug: 'drain',
    name: 'Drain',
    shortDesc: "Drain services keep your home's plumbing running smoothly.",
    iconUrl: '/images/icon-sink.svg',
  },
  {
    slug: 'water-heater',
    name: 'Water Heater',
    shortDesc: "Ensure consistent hot water with J. Blanton Plumbing's.",
    iconUrl: '/images/icon-faucet.svg',
  },
  {
    slug: 'water-quality',
    name: 'Water Quality',
    shortDesc: 'Water filtration ensures clean, safe water and protects your health and plumbing.',
    iconUrl: '/images/icon-droplet.svg',
  },
  {
    slug: 'commercial',
    name: 'Commercial',
    shortDesc: 'Reliable and efficient plumbing solutions tailored to meet the needs of your business.',
    iconUrl: '/images/icon-utube.svg',
  },
];

export function getService(slug: string): Service | undefined {
  return SERVICES.find((s) => s.slug === slug);
}

// Canonical `/services/*` category slugs. Each has a dedicated route file
// (`src/app/services/<slug>/page.tsx`) and a `service_category_pages` row.
// This is the single allowlist that gates both the `/services/[slug]` fallback
// route (Brief 76 / DM-1) and CMS service-category page creation (DM-2), so no
// stray slug (e.g. `hvac-services`, `hydro-jetting`) can resolve or be created.
// `emergency-plumbing` is a separate template with its own top-level route and
// is intentionally excluded.
export const SERVICE_CATEGORY_SLUGS = [
  'plumbing',
  'sewer',
  'drain',
  'water-heater',
  'water-quality',
  'commercial',
] as const;

export function isServiceCategorySlug(slug: string): boolean {
  return (SERVICE_CATEGORY_SLUGS as readonly string[]).includes(slug);
}
