/**
 * Single source of truth for J. Blanton Plumbing business info.
 * Import from here instead of hardcoding values (CMS-readiness, audit ref C-05).
 */
export const SITE = {
  // Canonical production origin (no trailing slash). Used to build absolute URLs
  // for structured data (JSON-LD `item` URLs, canonical links). Never hardcode the
  // domain elsewhere — reference SITE.baseUrl.
  baseUrl: 'https://jblantonplumbing.com',

  // Canonical business number — default for general usage across the site.
  phone: '773-724-9272',
  phoneHref: 'tel:773-724-9272',

  // DEPRECATED — no longer rendered anywhere. This was a hardcoded call-tracking
  // line shown only in the navbar header, back when call attribution meant
  // baking a second static number into the markup.
  //
  // WhatConverts now does dynamic number insertion sitewide (src/lib/whatconverts.ts):
  // it rewrites the canonical `phone` above into a per-visitor tracking number at
  // runtime. A second hardcoded number defeats that — DNI is configured to swap
  // `phone`, so anything else on the page is simply a number that never gets
  // attributed. Marketing's call (2026-08-08): 773-724-9272 everywhere, all places.
  //
  // Kept as a named constant only so the DB fallback below still type-checks;
  // remove both once the `global_settings.header_phone` column is dropped.
  headerPhone: '773-900-8690',
  headerPhoneHref: 'tel:773-900-8690',

  // External review / accreditation destinations shown in the footer (business data).
  reviewLinks: {
    google: 'https://g.page/r/CW0h_mbUZBu5EAE/review',
    // Yelp "write a review" deep link (not the plain business page) — matches live (brief-06 §7).
    yelp: 'https://www.yelp.com/writeareview/biz/h-3jgJfNryJ43CN5970iFw?return_url=%2Fbiz%2Fh-3jgJfNryJ43CN5970iFw&review_origin=biz-details-war-button',
    // BBB profile; the #sealclick anchor matches the live badge link (brief-06 §8).
    // (Live also swaps this per location page via JS — out of scope for the shared footer.)
    bbb: 'https://www.bbb.org/us/il/morton-grove/profile/plumber/j-blanton-plumbing-0654-88664305/#sealclick',
  },

  // Social profiles — order matches the live footer: LinkedIn, Instagram, Facebook, X.
  // NOTE (brief-06 §6): the branded icon assets are NOT in /public yet. The `icon`
  // paths below are where they should live once the four .webp files are downloaded
  // from the brand CDN (https://d1rplazj5a80fb.cloudfront.net/images/<name>.webp).
  // Until then the footer renders the alt text — do NOT substitute a lucide bird for X.
  social: [
    { label: 'LinkedIn',  href: 'https://www.linkedin.com/company/j-blanton-plumbing/', icon: '/images/social/linkedin.webp' },
    { label: 'Instagram', href: 'https://www.instagram.com/j.blantonplumbing/',         icon: '/images/social/ig.webp' },
    { label: 'Facebook',  href: 'https://www.facebook.com/J.BlantonPlumbing',            icon: '/images/social/fb.webp' },
    { label: 'X',         href: 'https://x.com/JBPchicago',                              icon: '/images/social/x.webp' },
  ],
} as const;
