/**
 * City Service Pages V2 (Brief 209) — the content model of the 145 `/{city}/{service}` pages, in the
 * same shape as the Sewer v2 service pages (Brief 204): the approved package's editorial blocks are
 * locked `SewerNode` trees ("panels"), everything else is structured fields.
 *
 *   per page   → `city_service_pages.v2_content` (`CityServiceStored`) + the row's meta columns
 *   per city   → `city_pages.v2_content.shared` (`CityServiceShared`): the parts every one of the
 *                city's 29 service pages repeats (breadcrumb parent, quick links, contact rail,
 *                sticky bar, No Drip Club box), edited once with the city hub (Marketing 2026-10-14)
 *
 * The code module (./data/*.json + ./shared.ts) is the layout template and the fallback, exactly as
 * src/lib/content/sewer-v2 is for the sewer pages. Phone numbers are never literal: `{ phone }` /
 * `{ phoneNumber: true }` nodes render the Global Settings number (Columbus: the Central Ohio phone).
 */
import type { SewerNode, SewerRich } from '@/lib/content/sewer-v2/types';

export interface CityImage {
  src: string;
  alt: string;
}

/** One section of the main column, in DOM order. `cls`, `id` and `order` are the approved layout. */
export type CityServiceSection =
  | { kind: 'panel'; id: string; cls: string; order: number; body: SewerNode[] }
  /** The city's shared No Drip Club box; `variant` picks its general or sewer wording. */
  | { kind: 'ndc'; id: string; cls: string; order: number; variant: 'general' | 'sewer' };

/** The editable parts of the page's schema.org `Service` (the rest is fixed or derived at render). */
export interface CityServiceSchemaFields {
  name: string;
  serviceType: string;
  description: string;
  provider: {
    name: string;
    url: string;
    address: { streetAddress: string; addressLocality: string; addressRegion: string; postalCode: string; addressCountry: string };
  };
  areaServed: string[];
}

/** What `city_service_pages.v2_content` stores for one page. */
export interface CityServiceStored {
  schema: 1;
  hero: { crumb: string; eyebrow: string; heading: string; intro: string; image: CityImage };
  sections: CityServiceSection[];
  serviceSchema: CityServiceSchemaFields;
}

/** One page's code module: the stored shape + its meta (title WITHOUT the brand suffix). */
export interface CityServiceCode {
  meta: { title: string; description: string };
  stored: CityServiceStored;
}

/**
 * The parts a city's 29 service pages share, stored on the city's `city_pages` row. Every `body` is
 * rich text (a plain string, or the inline tree once an editor adds a link).
 */
export interface CityServiceShared {
  /** The visible breadcrumb's first link (the city hub). */
  crumbParent: { label: string; href: string };
  badge24Label: string;
  quickLinks: { ariaLabel: string; links: { href: string; label: string }[] };
  rail: {
    ariaLabel: string;
    call: { heading: string; body: SewerRich; cta: string };
    trust: string[];
    financing: { image: string; alt: string; heading: string; body: SewerRich; note: string; cta: string };
  };
  /** `sub` is "Call our {City} Office"; `ariaLabel` carries `{{phone}}`, replaced with the number. */
  sticky: { title: string; sub: string; cta: string; ariaLabel: string };
  ndc: {
    eyebrow: string;
    headingLink: string;
    href: string;
    benefits: string[];
    cta: string;
    image: string;
    alt: string;
    /** General service pages. */
    general: { headingRest: string; body: SewerRich };
    /** The 8 sewer service pages (approved with their own heading tail and sentence). */
    sewer: { headingRest: string; body: SewerRich };
  };
}
