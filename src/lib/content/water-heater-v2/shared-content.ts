import type { WhSharedContent } from './types';

/**
 * Brief 222 — the code default of the sections every water heater page shares (stored on the hub row
 * under `v2_content.shared`). Ported from the package; the port script checked each part is identical
 * on every page that shows it. The rating fields carry Brief 221's company tokens — never a number.
 */
export const WH_SHARED_DEFAULT: WhSharedContent = {
  badge24Label: "24 hours, 7 days a week emergency service",
  quickLinks: {
    ariaLabel: "Quick links",
    links: [
      { href: "/emergency-plumbing", label: "Emergency Plumbing" },
      { href: "/knowledge-hub", label: "Knowledge Hub" },
      { href: "/financing", label: "Financing" },
      { href: "/help-and-support", label: "Help & Support" },
    ],
  },
  crumbParent: { label: "Water Heater Services", href: "/services/water-heater" },
  call: { heading: "24/7 Emergency Service", body: "Dispatched nights, weekends, and holidays.", cta: "Call Now" },
  financing: {
    eyebrow: "Financing",
    heading: "Fix It With Financing As Low As 0%",
    body: "We've partnered with trusted lenders, so you can get the service you need now and pay on your terms.",
    note: "Subject to credit approval. Rates and terms vary.",
    cta: "Ask about your options",
    image: "/images/services/sewer/financing-family.webp",
    alt: "J. Blanton Plumbing technician reviewing financing options with a homeowner couple at their kitchen table",
  },
  sticky: {
    title: "24/7 Emergency Service",
    sub: "Nights, weekends and holidays.",
    cta: "Call Now",
    ariaLabel: "Call J. Blanton Plumbing now, {{phone}}",
  },
  proof: {
    ariaLabel: "Review ratings and accreditation",
    rating: "{{company_rating}}",
    starsLabel: "{{company_rating}} out of 5 stars",
    sub: "Average from {{company_review_count}} Google reviews",
    bbb: {
      href: "https://www.bbb.org/us/il/morton-grove/profile/plumber/j-blanton-plumbing-0654-88664305/#sealclick",
      seal: "/images/services/sewer/bbb-seal.webp",
      sealAlt: "BBB Accredited Business seal",
      label: "Accredited business. View our BBB profile",
    },
  },
  review: { stars: "★★★★★", starsLabel: "5 out of 5 stars", caption: "Verified Customer" },
};
