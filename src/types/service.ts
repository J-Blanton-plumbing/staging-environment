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
    body: string; // 1–2 sentence paragraph, service-specific or generic
  };
  preventiveSection: {
    heading: string;
    image: string; // CDN URL
    paragraphs: string[];
  };
  closingCTA: {
    heading: string;
    body: string;
  };
}
