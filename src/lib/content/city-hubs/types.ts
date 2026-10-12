/**
 * City Hubs V2 (Brief 205) — content shape for one city hub page.
 *
 * Copy is the Brief 205 approved package's, verbatim (the Brief 205 MDs with the §3 fact-check
 * corrections and the post-review Marketing edits of 2026-10-12). Strings are stored exactly as
 * they render: typographic apostrophes (’), and `[label](/href)` for an inline link — the only
 * markup the view understands (see `CityHubRich`). Phone numbers are NEVER stored here: the view
 * reads the site phone from Global Settings (Columbus: the Central Ohio phone, Brief 192).
 */

export interface CityHubImage {
  src: string;
  alt: string;
}

export interface CityHubCard {
  title: string;
  href: string;
  desc: string;
  image: CityHubImage;
}

export interface CityHubReview {
  name: string;
  /** Google Business Profile review link; null → no "Read on Google" line. */
  url: string | null;
  text: string;
}

export interface CityHubContent {
  slug: string;
  name: string;
  /** `central-ohio` renders the Central Ohio phone (Global Settings) in the page body. */
  phoneRegion: 'main' | 'central-ohio';
  seo: { title: string; description: string };
  hero: {
    eyebrow: string;
    h1: string;
    sub: string;
    /** Page-scoped hero modifier class (Columbus), or none = the shared van photo. */
    variant: 'van' | 'columbus';
  };
  trust: string[];
  services: { h2: string; intro: string; cards: CityHubCard[] };
  office: {
    eyebrow: string;
    h2: string;
    body: string;
    address: string;
    areasH3: string;
    areas: Array<{ label: string; href: string }>;
    more: string;
  };
  depth: { h2: string; intro: string; tiles: Array<{ title: string; body: string }> };
  reviews: {
    eyebrow: string;
    h2: string;
    intro: string;
    rating: string;
    ratingSub: string;
    items: [CityHubReview, CityHubReview, CityHubReview];
  };
  faq: { h2: string; items: Array<{ q: string; preview: string; a: string }> };
  ndc: string;
  final: { eyebrow: string; h2: string; body: string };
}
