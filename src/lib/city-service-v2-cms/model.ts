/**
 * Brief 212 (Track B) — the City Service V2 CMS content model. Pure and client-safe (the admin editor
 * imports it too).
 *
 * Storage (Brief 212 Track B, the Brief 204 model):
 *   - `city_service_pages.v2_content` → `CityServiceStored`: `CityServiceV2Page` minus `city`, `service`
 *     and `meta` (those are the row's identity and its `meta_title` / `meta_description` columns);
 *   - a row renders V2 when its published state has conforming `v2_content` (no template picker entry);
 *   - the meta columns are read ONLY when the row has `v2_content`, suffix-free (the layout adds the
 *     brand once — `pageTitle()`).
 * A version (`page_drafts.content`) is `CityServiceV2DraftContent`, stamped `template_type
 * 'city-service-v2'`. A city-service version WITHOUT the marker is "old-shaped" (the legacy template):
 * opened read-only, never published onto a V2 row.
 *
 * The rail labels, quick links, sticky bar labels and the two No Drip Club variants stay in code
 * (`CityServiceV2View`) this round — identical on every page (Brief 212 Track B).
 */
import type { CityServiceV2Page, CsBlock } from '@/lib/content/city-services-v2/types';
import { clone, mdLinks, mdPlain } from '@/lib/cms-v2/shared';
import { renderRatingField, ratingShownIn, type RatingTokenContext } from '@/lib/cms/tokens';

export const CITY_SERVICE_V2_TEMPLATE = 'city-service-v2';
export const PRE_V2_ARCHIVE_LABEL = 'Pre-V2 archive (2026-10)';
export const SERVICE_V1_LABEL = 'Version 1 — City Service V2';
export const OLD_SERVICE_SHAPE_MESSAGE =
  "This version uses the old city-service layout and can't be edited or published on a City Service V2 page.";

/** What `city_service_pages.v2_content` holds. */
export interface CityServiceStored {
  schema: 1;
  hero: CityServiceV2Page['hero'];
  trust: string[];
  blocks: CsBlock[];
  /** Derived on every save from the page's fields; `provider.telephone` is filled at render. */
  serviceSchema: CityServiceV2Page['serviceSchema'];
  /** Brief 221 (optional): the pre-token text of the rating-bearing fields (see CityServiceV2Page). */
  ratingFallbacks?: Record<string, string>;
}

export interface CityServiceV2DraftContent {
  template: typeof CITY_SERVICE_V2_TEMPLATE;
  page: CityServiceStored;
  metaTitle: string;
  metaDescription: string;
}

export function isCityServiceV2DraftContent(c: unknown): c is CityServiceV2DraftContent {
  return (
    !!c &&
    typeof c === 'object' &&
    !Array.isArray(c) &&
    (c as Record<string, unknown>).template === CITY_SERVICE_V2_TEMPLATE &&
    !!(c as Record<string, unknown>).page &&
    typeof (c as Record<string, unknown>).page === 'object'
  );
}

/** A code-module / imported page → the object the row stores (deep copy). */
export function pageToStored(page: CityServiceV2Page): CityServiceStored {
  return clone({
    schema: 1,
    hero: page.hero,
    trust: page.trust,
    blocks: page.blocks,
    serviceSchema: page.serviceSchema,
    ...(page.ratingFallbacks ? { ratingFallbacks: page.ratingFallbacks } : {}),
  });
}

/** Stored + identity + meta → what `CityServiceV2View` renders. */
export function storedToPage(city: string, service: string, stored: CityServiceStored, meta: { title: string; description: string }): CityServiceV2Page {
  return {
    city,
    service,
    meta,
    hero: stored.hero,
    trust: stored.trust,
    blocks: stored.blocks,
    serviceSchema: stored.serviceSchema,
    ...(stored.ratingFallbacks ? { ratingFallbacks: stored.ratingFallbacks } : {}),
  };
}

/**
 * The approved title tails ("| J. Blanton Plumbing", "| J. Blanton", "| JBP") are stripped before
 * storing: the layout's title template adds the standard one exactly once (Brief 209 title fix).
 */
export function stripTitleTail(title: string): string {
  let out = title.trim();
  for (;;) {
    const next = out.replace(/\s*\|\s*(?:J\.?\s*Blanton(?:\s+Plumbing)?|JBP)\s*$/i, '').trim();
    if (next === out || !next) return out;
    out = next;
  }
}

const SITE = 'https://jblantonplumbing.com';

/**
 * The Service JSON-LD, derived from the page's own fields (Brief 212 Track B — "not a free-text box"):
 *   name = H1 · serviceType = breadcrumb label · url = the page · description = the SEO description ·
 *   areaServed = "{City}, {ST}" + each community linked in the Final CTA (not the /locations "more").
 * The provider (the office's name, URL and address) is kept from the stored value. Key order is the
 * order production has always emitted. Reproduces all 145 Batch 1 schemas byte for byte.
 */
export function deriveServiceSchema(
  stored: CityServiceStored,
  ids: { city: string; service: string; cityName: string; state: string },
  metaDescription: string
): CityServiceStored['serviceSchema'] {
  const final = stored.blocks.find((b) => b.type === 'final') as Extract<CsBlock, { type: 'final' }> | undefined;
  const communities = final
    ? mdLinks(final.communities)
        .filter((l) => /^\/[a-z0-9-]+$/.test(l.href))
        .map((l) => `${mdPlain(l.label)}, ${ids.state}`)
    : [];
  const prev = stored.serviceSchema ?? ({} as CityServiceStored['serviceSchema']);
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: stored.hero.h1,
    serviceType: stored.hero.crumb,
    url: `${SITE}/${ids.city}/${ids.service}`,
    description: metaDescription,
    provider: { ...(prev.provider ?? {}), telephone: '' },
    areaServed: [`${ids.cityName}, ${ids.state}`, ...communities],
  } as CityServiceStored['serviceSchema'];
}

/** Every editable field that must hold text before the page can go live. */
export function requiredEmptyServiceFields(stored: CityServiceStored, metaTitle: string, metaDescription: string): string[] {
  const out: string[] = [];
  const need = (path: string, v: unknown) => {
    if (typeof v !== 'string' || v.trim() === '') out.push(path);
  };
  need('metaTitle', metaTitle);
  need('metaDescription', metaDescription);
  need('hero.crumb', stored.hero?.crumb);
  need('hero.eyebrow', stored.hero?.eyebrow);
  need('hero.h1', stored.hero?.h1);
  need('hero.sub', stored.hero?.sub);
  need('hero.img.src', stored.hero?.img?.src);
  need('hero.img.alt', stored.hero?.img?.alt);
  (stored.trust ?? []).forEach((t, i) => need(`trust[${i}]`, t));
  const walk = (v: unknown, path: string) => {
    if (typeof v === 'string') need(path, v);
    else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`));
    else if (v && typeof v === 'object') {
      for (const [k, x] of Object.entries(v)) {
        if (['id', 'cls', 'order', 'type', 'variant', 'minCol', 'emergency'].includes(k)) continue;
        if (k === 'url' || k === 'note' || k === 'proof') continue; // optional: a review's link, a block's small print, a pull-quote
        if (k === 'head') continue; // a table's corner header cell is blank by design
        walk(x, `${path}.${k}`);
      }
    }
  };
  (stored.blocks ?? []).forEach((b, i) => walk(b, `blocks[${i}](${b.type})`));
  return out;
}

/**
 * Brief 221 (D1 + C1) — a V2 page as it renders: the live-rating tokens in the rail trust items and in
 * each reviews section's rating line filled from `ctx` (its hub office + the company total), else the
 * pre-token fallback. Returns whether the page SHOWS its office's synced numbers (a reviews rating line
 * carrying both), which is the condition for the office node's `aggregateRating`. A page without
 * tokens comes back as the SAME object.
 */
export function applyServiceRatings(page: CityServiceV2Page, ctx: RatingTokenContext): { page: CityServiceV2Page; officeRatingShown: boolean } {
  const fb = page.ratingFallbacks;
  const field = (t: string) => renderRatingField(t, ctx, fb);
  const trust = page.trust.map(field);
  let changed = trust.some((t, i) => t !== page.trust[i]);
  const blocks = page.blocks.map((b) => {
    if (b.type !== 'reviews') return b;
    const rating = field(b.rating);
    if (rating === b.rating) return b;
    changed = true;
    return { ...b, rating };
  });
  const lines = blocks.flatMap((b) => (b.type === 'reviews' ? [b.rating] : []));
  const office = ctx.office;
  const officeRatingShown = !!office && lines.some((l) => ratingShownIn([l], office));
  return { page: changed ? { ...page, trust, blocks } : page, officeRatingShown };
}
