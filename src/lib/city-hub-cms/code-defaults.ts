/**
 * Brief 212 (Track A) — the City Hub code modules (src/lib/content/city-hubs) as stored-shape objects:
 * the fallback whenever a row is missing, unreadable or has no usable `hub_content` (Brief 206 dispatch
 * row 4), the seed's source for the 5 Batch 1 hubs, and the shared record's default. Fresh deep copies
 * every call, so no caller can mutate the modules.
 *
 * Everything here reproduces what `CityHubView` rendered from the code modules before Brief 212, byte
 * for byte: the two hero photo sets and the labels/patterns it used to hard-code (Brief 206 §2.3) moved
 * out of the view into data, unchanged.
 */
import { CITY_HUBS, getCityHub } from '@/lib/content/city-hubs';
import { CITY_HUB_SHARED } from '@/lib/content/city-hubs/shared';
import { clone } from '@/lib/cms-v2/shared';
import type { CityHubShared, CityHubStored, HubPhoto } from './model';

/** The shared "Standard van photo" (was hard-coded in CityHubView). */
const VAN_PHOTO: HubPhoto = {
  src: '/images/city-hubs/jbp-van-residential-street-2000.webp',
  src1100: '/images/city-hubs/jbp-van-residential-street-1100.webp',
  mobile: '/images/city-hubs/jbp-van-residential-street-mobile.webp',
  alt: 'J. Blanton Plumbing van parked on a residential street in front of a two-story home',
  width: 2000,
  height: 1189,
};

/** Columbus's own hero photo (was the view's `variant === 'columbus'` branch). */
const COLUMBUS_PHOTO: HubPhoto = {
  src: '/images/city-hubs/jbp-columbus-skyline-team-2000.webp',
  src1100: '/images/city-hubs/jbp-columbus-skyline-team-1100.webp',
  mobile: '/images/city-hubs/jbp-columbus-skyline-team-mobile.webp',
  alt: 'Two J. Blanton Plumbing team members in red company polos in front of the downtown Columbus skyline',
  width: 2000,
  height: 1334,
};

const YT_ID = /embed\/([A-Za-z0-9_-]{11})/;

/** The shared record's default: CITY_HUB_SHARED in the stored shape. */
export function codeSharedDefault(): CityHubShared {
  const SH = CITY_HUB_SHARED;
  const v = SH.videoJsonLd as Record<string, string>;
  return clone({
    schema: 1,
    heroPillsLabel: SH.heroPillsLabel,
    heroPills: SH.heroPills.map((p) => ({ label: p.label, href: p.href })),
    badge24Label: SH.badge24Label,
    trustLabel: SH.trustLabel,
    servicesEyebrow: SH.servicesEyebrow,
    officeSchedule: SH.officeSchedule,
    depthEyebrow: SH.depthEyebrow,
    fin: { ...SH.fin },
    why: { eyebrow: SH.why.eyebrow, intro: SH.why.intro, items: SH.why.items.map((i) => ({ h3: i.h3, body: i.body })), image: { ...SH.why.image } },
    video: { eyebrow: SH.video.eyebrow, h2: SH.video.h2, intro: SH.video.intro, title: SH.video.title, youtubeId: (SH.video.embed.match(YT_ID) ?? [])[1] ?? '' },
    videoSchema: { name: v.name, description: v.description, thumbnailUrl: v.thumbnailUrl, uploadDate: v.uploadDate, duration: v.duration },
    reviewsProofLabel: SH.reviewsProofLabel,
    verified: SH.verified,
    readOnGoogle: SH.readOnGoogle,
    bbb: { ...SH.bbb },
    faqEyebrow: SH.faqEyebrow,
    ndc: { eyebrow: SH.ndc.eyebrow, h2: SH.ndc.h2, benefits: [...SH.ndc.benefits], cta: SH.ndc.cta, href: SH.ndc.href, mascot: { ...SH.ndc.mascot } },
    finalSchedule: SH.finalSchedule,
    stripeTitle: SH.stripeTitle,
    stripe: SH.stripe.map(([group, items]) => ({ group, items: items.map(([label, slug]) => ({ label, slug })) })),
    vanPhoto: VAN_PHOTO,
    labels: { learnMore: 'Learn More', callNow: 'Call Now', callNowPrefix: 'Call Now: ', reviewStars: '5 out of 5 stars', and: ' and ', more: 'more' },
    patterns: {
      cardAria: 'Learn more about {card} in {city}',
      directoryAria: 'All plumbing services in {city}',
      mapTitle: 'Google Map of our {city} office',
      addressName: 'J. Blanton Plumbing, {city}',
      stripeCount: '{n} services in {city}',
    },
  } satisfies CityHubShared);
}

export function hasCodeHub(slug: string): boolean {
  return Object.prototype.hasOwnProperty.call(CITY_HUBS, slug);
}

/** One of the 5 code modules in the stored shape, or undefined for any other city. */
export function codeHubStored(slug: string): CityHubStored | undefined {
  const h = getCityHub(slug);
  if (!h) return undefined;
  const columbus = h.hero.variant === 'columbus';
  return clone({
    schema: 1,
    hero: { eyebrow: h.hero.eyebrow, h1: h.hero.h1, sub: h.hero.sub, photo: columbus ? COLUMBUS_PHOTO : 'standard', crop: columbus ? 'columbus' : 'standard' },
    trust: h.trust,
    services: h.services,
    office: h.office,
    depth: h.depth,
    whyH2: `Why ${h.name} Homeowners Choose J. Blanton`,
    reviews: h.reviews,
    faq: h.faq,
    ndc: h.ndc,
    final: h.final,
  } satisfies CityHubStored);
}

export function codeHubMeta(slug: string): { title: string; description: string } | undefined {
  const h = getCityHub(slug);
  return h ? { ...h.seo } : undefined;
}

/** The locked crop for a page: the code module's, or 'standard' for every other city. */
export function lockedCrop(slug: string): CityHubStored['hero']['crop'] {
  return codeHubStored(slug)?.hero.crop ?? 'standard';
}
