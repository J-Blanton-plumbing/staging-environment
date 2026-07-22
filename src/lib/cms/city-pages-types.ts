/**
 * Brief 99 — pure type-only module for the City V2 repeater item shapes.
 * Extracted out of `city-pages.ts` (which imports the DB pool) so client-safe
 * modules (`city-v2-blocks.ts`, the block registry, admin editor) can import
 * these shapes without pulling server-only code into the client bundle.
 * Re-exported from `city-pages.ts` for existing importers.
 */

/** Brief 67 — V2 "Most Requested Services" item. */
export interface MostRequestedService {
  title: string;
  body: string;
}

/** Brief 67 — V2 "Why … Call Us First" point. */
export interface WhyPoint {
  heading: string;
  body: string;
}

/** Brief 67 — V2 review card. */
export interface CityReview {
  name: string;
  text: string;
  gbp_url: string;
}
