/**
 * City Hubs V2 — the CMS shape (Brief 209 CMS wiring, 2026-10-14).
 *
 * A hub row (`city_pages.v2_content`) stores `CityHubStored`:
 *   hub        — this city's own hub copy (`CityHubContent` minus what the row's columns or the
 *                code own: `seo` → meta_title/meta_description; `slug`/`name`/`phoneRegion` → code)
 *   hubShared  — the hub template's shared sections (quick-link pills, financing band, Why Us, video,
 *                review proof, No Drip Club list, service directory), edited per city
 *   shared     — the city's 29 SERVICE pages' shared parts (src/lib/content/city-services-v2/types.ts)
 *
 * Rich fields (`body`, `a`, `ndc`) hold `SewerRich`: a plain string, or the inline node tree when
 * the text carries a link — the Sewer v2 rich-text format (Brief 204), edited the same way.
 */
import type { SewerRich } from '@/lib/content/sewer-v2/types';
import type { CityServiceShared } from '@/lib/content/city-services-v2/types';
import type { CityHubContent } from './types';

export interface CityHubPage {
  hero: CityHubContent['hero'];
  trust: string[];
  services: CityHubContent['services'];
  office: { eyebrow: string; h2: string; body: SewerRich; address: string; areasH3: string; areas: Array<{ label: string; href: string }>; more: string };
  depth: { h2: string; intro: string; tiles: Array<{ title: string; body: SewerRich }> };
  reviews: {
    eyebrow: string;
    h2: string;
    intro: string;
    rating: string;
    ratingSub: string;
    /** Exactly 3 (one featured, two beside it). `url` '' = no "Read on Google" link. */
    items: Array<{ name: string; url: string; text: string }>;
  };
  faq: { h2: string; items: Array<{ q: string; preview: string; a: SewerRich }> };
  ndc: SewerRich;
  final: { eyebrow: string; h2: string; body: SewerRich };
}

export interface CityHubShared {
  heroPillsLabel: string;
  heroPills: Array<{ label: string; href: string }>;
  badge24Label: string;
  trustLabel: string;
  servicesEyebrow: string;
  officeSchedule: string;
  depthEyebrow: string;
  fin: { eyebrow: string; h2: string; body: string; disclaimer: string; cta: string };
  why: { eyebrow: string; intro: string; items: Array<{ h3: string; body: SewerRich }>; image: { src: string; alt: string } };
  video: { eyebrow: string; h2: string; intro: string; title: string; embed: string };
  /** schema.org VideoObject — `@context`/`@type` are fixed. */
  videoJsonLd: Record<string, string>;
  reviewsProofLabel: string;
  verified: string;
  readOnGoogle: string;
  bbb: { href: string; alt: string; src: string; label: string };
  faqEyebrow: string;
  ndc: { eyebrow: string; h2: string; benefits: string[]; cta: string; href: string; mascot: { src: string; alt: string } };
  finalSchedule: string;
  /** "Explore all our plumbing services": groups of links. */
  stripe: Array<{ group: string; items: Array<{ label: string; href: string }> }>;
  stripeTitle: string;
}

export interface CityHubStored {
  schema: 1;
  hub: CityHubPage;
  hubShared: CityHubShared;
  shared: CityServiceShared;
}
