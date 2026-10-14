/**
 * City Service Pages V2 (Brief 209) — the code default of each city's SHARED service-page parts
 * (`CityServiceShared`): what a city's 29 pages repeat, edited once per city in the city hub's editor
 * and stored on the city's `city_pages` row (`v2_content.shared`).
 *
 * Every value is the approved Brief 209 template's (identical on all 145 pages), except the three
 * that are per city by nature: the breadcrumb parent, the sticky bar's "Call our {City} Office" and
 * the rail's trust list (Columbus has its own, Brief 209 §2.3).
 */
import type { CityServiceShared } from './types';
import type { CityV2City } from './registry';

const NAMES: Record<CityV2City, string> = {
  northbrook: 'Northbrook',
  columbus: 'Columbus',
  'tinley-park': 'Tinley Park',
  joliet: 'Joliet',
  naperville: 'Naperville',
};

const ILLINOIS_TRUST = [
  'Serving Chicagoland since 1993',
  'Licensed & bonded in Illinois',
  '4.7 stars · 5,669+ Google reviews across all locations',
];
const TRUST: Record<CityV2City, string[]> = {
  northbrook: ILLINOIS_TRUST,
  'tinley-park': ILLINOIS_TRUST,
  joliet: ILLINOIS_TRUST,
  naperville: ILLINOIS_TRUST,
  columbus: ['Serving homeowners 30+ years', 'Local office on W. Goodale Blvd', '4.7 stars · 5,669+ Google reviews across all locations'],
};

export function cityV2Name(city: CityV2City): string {
  return NAMES[city];
}

export function cityServiceSharedDefault(city: CityV2City): CityServiceShared {
  const name = NAMES[city];
  return {
    crumbParent: { label: name, href: `/${city}` },
    badge24Label: '24 hours, 7 days a week emergency service',
    quickLinks: {
      ariaLabel: 'Quick links',
      links: [
        { href: '/emergency-plumbing', label: 'Emergency Plumbing' },
        { href: '/knowledge-hub', label: 'Knowledge Hub' },
        { href: '/financing', label: 'Financing' },
        { href: '/help-and-support', label: 'Help & Support' },
      ],
    },
    rail: {
      ariaLabel: 'Contact and trust',
      call: { heading: '24/7 Emergency Service', body: 'Dispatched nights, weekends, and holidays.', cta: 'Call Now' },
      trust: [...TRUST[city]],
      financing: {
        image: '/images/city-services-v2/financing-consultation-homeowners.webp',
        alt: 'J. Blanton Plumbing technician reviewing financing options with a homeowner couple at their kitchen table',
        heading: 'Fix It With Financing As Low As 0%',
        body: "We've partnered with trusted lenders, so you can get the service you need now and pay on your terms.",
        note: 'Subject to credit approval. Rates and terms vary.',
        cta: 'Ask about your options',
      },
    },
    sticky: { title: 'Need a Plumber?', sub: `Call our ${name} Office`, cta: 'Call Now', ariaLabel: 'Call J. Blanton Plumbing now, {{phone}}' },
    ndc: {
      eyebrow: 'Annual Protection Plan',
      headingLink: 'Join the No Drip Club',
      href: '/no-drip-club',
      benefits: [
        'Two Free Professional Maintenance Visits per Year',
        '10% Discount on All General Plumbing & Sewer Services',
        '5-Year Parts and Labor Warranty on Approved Projects',
        'VIP Priority Scheduling Status (Skip the Queue)',
      ],
      cta: 'Learn More About the No Drip Club',
      image: '/images/city-services-v2/no-drip-club-mascot.webp',
      alt: 'No Drip Club mascot: an illustrated J. Blanton plumber holding a red pipe wrench',
      general: {
        headingRest: '',
        body: 'Most plumbing problems start small. The No Drip Club brings a J. Blanton plumber to your home for regular maintenance, so small issues get caught before they turn into big repairs.',
      },
      sewer: {
        headingRest: ' for Year-Round Sewer Protection',
        body: 'Prevent catastrophes before they disrupt your life. The No Drip Club ensures your waste and sewer lines are monitored and serviced regularly by J. Blanton’s absolute best.',
      },
    },
  };
}
