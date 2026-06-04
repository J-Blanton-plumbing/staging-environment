/**
 * Single source of truth for J. Blanton Plumbing business info.
 * Import from here instead of hardcoding values (CMS-readiness, audit ref C-05).
 */
export const SITE = {
  // Canonical business number — default for general usage across the site.
  phone: '773-724-9272',
  phoneHref: 'tel:773-724-9272',

  // Call-tracking number — used ONLY in the navbar header display + its tel: link.
  // This is intentionally DIFFERENT from `phone` above: it is a tracking line that
  // routes through call-attribution, matching what the live site shows in its header.
  // Do not "correct" these to match `phone` — the divergence is on purpose, and keeping
  // them as two named variables lets us swap either number from one place.
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
