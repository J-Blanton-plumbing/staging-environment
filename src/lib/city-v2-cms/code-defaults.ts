/**
 * City V2 CMS — the CODE MODULES in their stored shape: the layout template every save is locked
 * against, and the fallback when a page has no row / no v2 content / no database. Server-only (the
 * service-page data is ~3 MB of JSON).
 */
import type { SewerNode, SewerRich } from '@/lib/content/sewer-v2/types';
import type { CityServiceShared, CityServiceStored } from '@/lib/content/city-services-v2/types';
import { cityServiceCode, cityServiceSharedDefault, type CityV2City } from '@/lib/content/city-services-v2';
import { getCityHub } from '@/lib/content/city-hubs';
import { CITY_HUB_SHARED } from '@/lib/content/city-hubs/shared';
import type { CityHubShared, CityHubStored } from '@/lib/content/city-hubs/stored';
import { CITY_SERVICE_FOLD_REDIRECTS } from '@/lib/redirects/city-service-folds';

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

// ── service pages ───────────────────────────────────────────────────────────────────

export function codeServiceStored(city: string, service: string): CityServiceStored | null {
  const c = cityServiceCode(city, service);
  return c ? clone(c.stored) : null;
}

export function codeServiceMeta(city: string, service: string): { title: string; description: string } | null {
  const c = cityServiceCode(city, service);
  return c ? { ...c.meta } : null;
}

export function codeCityShared(city: CityV2City): CityServiceShared {
  return cityServiceSharedDefault(city);
}

// ── hubs ────────────────────────────────────────────────────────────────────────────

/** `[label](/href)` (the code modules' only markup) → the Sewer v2 rich tree; plain text stays a string. */
export function markdownToRich(text: string, linkStyle?: string): SewerRich {
  const out: SewerNode[] = [];
  const re = /\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push({ tag: 'a', ...(linkStyle ? { style: linkStyle } : {}), attrs: { href: m[2] }, kids: [m[1]] });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out.length === 1 && typeof out[0] === 'string' ? out[0] : out;
}

/** The hub's No Drip Club sentence link style (the approved markup's inline style). */
export const HUB_NDC_LINK_STYLE = 'color:#F9F3EC;text-decoration:underline;text-underline-offset:3px';

/**
 * The anchor each folded service lives at on its parent page (the fold maps' "Menu link" column).
 * The hub directory points folded entries here instead of at the 301 (Brief 209 CMS wiring).
 */
const FOLD_ANCHORS: Record<string, string> = {
  'clogged-drains': 'clogged-drains',
  'sewer-drain-clearing': 'sewer-drain-clearing',
  'kitchen-sink-drain': 'kitchen-sink-drain',
  'kitchen-faucet-repair-and-installation': 'kitchen-faucet',
  'kitchen-plumbing': 'kitchen-plumbing',
  'plumbing-fixture-installations': 'fixture-installation',
  'residential-water-heater': 'residential-water-heater',
  'basement-waterproofing': 'basement-waterproofing',
  'gas-line-leak-detection': 'gas-leak-detection',
  'water-heater-maintenance': 'water-heater-maintenance',
  'water-testing': 'water-testing',
};

function serviceHref(city: string, slug: string): string {
  const from = `/${city}/${slug}`;
  const to = CITY_SERVICE_FOLD_REDIRECTS[from];
  if (!to) return from;
  const anchor = FOLD_ANCHORS[slug];
  return anchor ? `${to}#${anchor}` : to;
}

function codeHubShared(city: string): CityHubShared {
  const SH = CITY_HUB_SHARED;
  return {
    heroPillsLabel: SH.heroPillsLabel,
    heroPills: SH.heroPills.map((p) => ({ label: p.label, href: p.href })),
    badge24Label: SH.badge24Label,
    trustLabel: SH.trustLabel,
    servicesEyebrow: SH.servicesEyebrow,
    officeSchedule: SH.officeSchedule,
    depthEyebrow: SH.depthEyebrow,
    fin: { ...SH.fin },
    why: {
      eyebrow: SH.why.eyebrow,
      intro: SH.why.intro,
      // `{camera}` resolves per city here, so the stored link is a real path an editor can see.
      items: SH.why.items.map((w) => ({ h3: w.h3, body: markdownToRich(w.body.replace('{camera}', `/${city}/video-camera-sewer-inspections`)) })),
      image: { ...SH.why.image },
    },
    video: { ...SH.video },
    videoJsonLd: { ...SH.videoJsonLd },
    reviewsProofLabel: SH.reviewsProofLabel,
    verified: SH.verified,
    readOnGoogle: SH.readOnGoogle,
    bbb: { ...SH.bbb },
    faqEyebrow: SH.faqEyebrow,
    ndc: { eyebrow: SH.ndc.eyebrow, h2: SH.ndc.h2, benefits: [...SH.ndc.benefits], cta: SH.ndc.cta, href: SH.ndc.href, mascot: { ...SH.ndc.mascot } },
    finalSchedule: SH.finalSchedule,
    stripe: SH.stripe.map(([group, items]) => ({ group, items: items.map(([label, slug]) => ({ label, href: serviceHref(city, slug) })) })),
    stripeTitle: SH.stripeTitle,
  };
}

export function codeHubStored(city: string): CityHubStored | null {
  const h = getCityHub(city);
  if (!h) return null;
  return {
    schema: 1,
    hub: {
      hero: { ...h.hero },
      trust: [...h.trust],
      services: clone(h.services),
      office: { ...clone(h.office), body: markdownToRich(h.office.body) },
      depth: { h2: h.depth.h2, intro: h.depth.intro, tiles: h.depth.tiles.map((t) => ({ title: t.title, body: markdownToRich(t.body) })) },
      reviews: { ...clone(h.reviews), items: h.reviews.items.map((r) => ({ name: r.name, url: r.url ?? '', text: r.text })) },
      faq: { h2: h.faq.h2, items: h.faq.items.map((f) => ({ q: f.q, preview: f.preview, a: markdownToRich(f.a) })) },
      ndc: markdownToRich(h.ndc, HUB_NDC_LINK_STYLE),
      final: { eyebrow: h.final.eyebrow, h2: h.final.h2, body: markdownToRich(h.final.body) },
    },
    hubShared: codeHubShared(city),
    shared: cityServiceSharedDefault(city as CityV2City),
  };
}

export function codeHubMeta(city: string): { title: string; description: string } | null {
  const h = getCityHub(city);
  return h ? { title: h.seo.title, description: h.seo.description } : null;
}
