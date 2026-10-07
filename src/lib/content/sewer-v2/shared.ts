import type { SewerSection } from './types';

/**
 * Brief 200 — copy shared by the Sewer Ecosystem v2 pages. Verbatim from the approved package;
 * the port script asserted each of these is identical on all 9 service pages before it was
 * lifted here (the per-page differences live in the page modules).
 */

/** Hero "24 hours" badge next to the phone CTA (hub + every service page). */
export const SEWER_BADGE24_LABEL = '24 hours, 7 days a week emergency service';

/** The 4-link quick-links bar under every service-page hero (`.jbp-subnav`). */
export const SEWER_QUICK_LINKS = {
  ariaLabel: 'Quick links',
  links: [
    { href: '/emergency-plumbing', label: 'Emergency Plumbing' },
    { href: '/knowledge-hub', label: 'Knowledge Hub' },
    { href: '/financing', label: 'Financing' },
    { href: '/help-and-support', label: 'Help & Support' },
  ],
} as const;

/** Service-page contact rail: call box, trust list, financing card. */
export const SEWER_RAIL = {
  ariaLabel: 'Contact and trust',
  call: {
    heading: '24/7 Emergency Service',
    body: 'Dispatched nights, weekends, and holidays.',
    cta: 'Call Now',
  },
  trust: [
    { icon: '/images/services/sewer/trust-no-subcontractors.webp', label: '2,000+ Installs a year' },
    { icon: '/images/services/sewer/trust-driver-tested.webp', label: 'No Subcontractors' },
    { icon: '/images/services/sewer/trust-background-checked.webp', label: '4.8 Stars in Google Reviews' },
    { icon: '/images/services/sewer/trust-price-match.webp', label: 'Price Match Guarantee' },
  ],
  financing: {
    image: '/images/services/sewer/financing-family.webp',
    alt: 'J. Blanton Plumbing technician reviewing financing options with a homeowner couple at their kitchen table',
    heading: 'Fix It With Financing As Low As 0%',
    body: "We've partnered with trusted lenders, so you can get the service you need now and pay on your terms.",
    note: 'Subject to credit approval. Rates and terms vary.',
    cta: 'Ask about your options',
  },
} as const;

/** Mobile sticky call bar (≤1000px, service pages). */
export const SEWER_STICKY = {
  title: 'Need Sewer Service?',
  sub: 'We answer 24/7',
  cta: 'Call Now',
  /** `{phone}` is filled with the site's default display number. */
  ariaLabel: 'Call J. Blanton Plumbing now, {phone}',
} as const;

/** No Drip Club — one component, two contexts (band on the hub, panel on service pages). */
export const SEWER_NDC = {
  eyebrow: 'Annual Protection Plan',
  headingLink: 'Join the No Drip Club',
  headingRest: ' for Year-Round Sewer Protection',
  body: 'Prevent catastrophes before they disrupt your life. The No Drip Club ensures your waste and sewer lines are monitored and serviced regularly by J. Blanton’s absolute best.',
  benefits: [
    'Two Free Professional Maintenance Visits per Year',
    '10% Discount on All General Plumbing & Sewer Services',
    '5-Year Parts and Labor Warranty on Approved Projects',
    'VIP Priority Scheduling Status (Skip the Queue)',
  ],
  cta: 'Learn More About the No Drip Club',
  href: '/no-drip-club',
  image: '/images/services/sewer/j-ndc.webp',
} as const;

/** Service pages: the head of the services rows section. */
export const SEWER_SERVICES_HEAD = {
  eyebrow: 'What We Handle',
  heading: 'Sewer Line Services We Provide',
} as const;

/** Final CTA: the parts every page shares (heading/body are per page). */
export const SEWER_FINAL = {
  eyebrow: 'Get Started Today',
  /** Rendered as "Call Now: " + PhoneNumber. */
  callPrefix: 'Call Now: ',
  schedule: 'Schedule a Service',
} as const;

/** The visible breadcrumb's parent crumb on every service page. */
export const SEWER_CRUMB_PARENT = { label: 'Sewer Services', href: '/services/sewer' } as const;

/** Review card atoms (hub + service pages). */
export const SEWER_REVIEW = {
  stars: '★★★★★',
  starsLabel: '5 out of 5 stars',
  caption: 'Verified Customer',
} as const;

/** Text of the "Learn More" service links; the aria-label is "Learn More about {title}". */
export const SEWER_LEARN_MORE = 'Learn More';

/**
 * "Meet J. Blanton" — the YouTube section six service pages carry, verbatim (eyebrow, heading, text,
 * video), and its VideoObject. Marketing, 2026-10-07: Hydro Jetting and Sewer Rodding use it too, in
 * place of their two self-hosted MP4 sections, whose videos were never uploaded to S3.
 */
export const MEET_J_BLANTON_VIDEO_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'VideoObject',
  name: 'Meet J. Blanton Plumbing',
  description: 'J. Blanton Plumbing delivers fast, reliable, same-day plumbing service across Chicago and the surrounding suburbs.',
  thumbnailUrl: 'https://i.ytimg.com/vi/ZDFzUtjBUCk/maxresdefault.jpg',
  uploadDate: '2025-05-21T07:47:39-07:00',
  duration: 'PT47S',
  contentUrl: 'https://www.youtube.com/watch?v=ZDFzUtjBUCk',
  embedUrl: 'https://www.youtube.com/embed/ZDFzUtjBUCk',
};

export function meetJBlantonPanel(order: number): SewerSection {
  return {
    kind: 'panel',
    id: 'video',
    tint: false,
    order,
    body: [
      {
        tag: 'div',
        cls: 'ss-split',
        kids: [
          { tag: 'div', kids: [{ video: { kind: 'youtube', id: 'ZDFzUtjBUCk', title: 'Meet J. Blanton Plumbing' } }] },
          {
            tag: 'div',
            kids: [
              { tag: 'span', cls: 't-eyebrow', style: 'color:var(--c-carmine)', kids: ['Meet J. Blanton'] },
              { tag: 'h2', cls: 't-h2', style: 'margin:12px 0 16px;max-width:66ch', kids: ['Big Enough to Get the Job Done, Small Enough to Care'] },
              {
                tag: 'p',
                cls: 't-body',
                style: 'color:var(--c-slate);margin:0;max-width:66ch',
                kids: ['We’ve grown a lot since 1993, but the way we work hasn’t changed. Here’s a closer look at who we are.'],
              },
            ],
          },
        ],
      },
    ],
  };
}
