/**
 * Shape of a single sub-service page's content (brief-11).
 *
 * Every sub-service page (`/sewer-rodding`, `/hydro-jetting`, …) is the SAME
 * `ServicePageTemplate` component fed a different data file under
 * `lib/content/services/[slug].ts`. Copy and image URLs live here — never
 * hardcoded in the components (CMS-readiness, brief-11 hard rules).
 *
 * Image fields are CDN URLs. Interior section images on the live site are
 * JS-lazy-loaded and their exact CDN filenames are unconfirmed (brief-11 §1
 * note + downstream flag 3); leave those as an empty string and the section
 * components render a Cream `#F9F3EC` placeholder until the filename lands.
 */
export interface RelatedServiceCard {
  title: string;
  teaser: string;
  image: string; // CDN URL
  href: string; // top-level slug e.g. "/hydro-jetting"
}

export interface ServiceContent {
  slug: string;
  /**
   * Brief 89 (Track B): ordered list of rendering-block types for DB-backed
   * sub-service pages. When present, `ServicePageTemplate` renders its sections
   * in this order; when absent (static-content service pages), it uses the fixed
   * default order. Only sub-service pages set this.
   */
  blockOrder?: string[];
  /**
   * Brief 90 (Track B): the authoritative per-instance block list for DB-backed
   * sub-service pages — `{ id, type, data }[]`, where the same type may appear
   * more than once (free page-builder). When present, `ServicePageTemplate`
   * renders each instance from its own `data` (supporting duplicates); when
   * absent (static-content pages), it falls back to `blockOrder`/default order
   * driven by the flat section fields below. Only sub-service pages set this.
   */
  blocks?: Array<{ id: string; type: string; data: Record<string, unknown> }>;
  seo: {
    title: string;
    description: string;
  };
  hero: {
    heading: string; // e.g. "Sewer Rodding in Chicagoland"
    intro: string; // hero subtext below the H1
    image: string; // CDN URL
  };
  expertSection: {
    heading: string;
    image1: string; // CDN URL — shown in two-col layout
    image2: string; // CDN URL
    paragraphs: string[]; // typically 3 paragraphs
  };
  problemsSection: {
    heading: string;
    problems: string[]; // 3–6 bullet items
  };
  relatedServicesSection: {
    heading: string;
    cards: RelatedServiceCard[]; // always 2 on the live site
  };
  secondarySection: {
    heading: string;
    paragraphs: string[];
  };
  noDropClubSection: {
    title?: string; // §8 `.f2` red label; defaults in <NoDripClubSimple />
    body: string; // 1–2 sentence paragraph, service-specific or generic
  };
  preventiveSection: {
    heading: string;
    image: string; // CDN URL
    paragraphs: string[];
  };
  closingCTA: {
    heading: string; // §11 `.f3` red label / tagline
    body: string;
    image: string; // CDN URL — left column photo (manplumber.webp on sewer-rodding)
  };
}
