/**
 * Brief 99 (Track B) — pure, client-safe City V2 block helpers. Mirrors
 * `sub-service-blocks.ts` exactly: kept separate from `city-pages.ts` (which
 * imports the DB pool) so the admin editor (a client component) and the block
 * registry can import these types/helpers without pulling server-only code
 * into the client bundle.
 *
 * City V2 (`LocalOfficeCityV2.tsx`, `template_type='local-office-v2'`) moves
 * from fixed-position `{condition && <section>}` JSX to a per-instance
 * `blocks` array, same `{id,type,data}` shape Brief 90 established for
 * sub-service. The 15 V2-only named columns on `city_pages` stay populated as
 * a rollback snapshot of each page's PRIMARY (first) instance per type — they
 * no longer drive the render once `blocks` is present.
 *
 * No HTML sanitization is needed here: every City V2 field renders as plain
 * JSX text (`{value}`), never `dangerouslySetInnerHTML` — confirmed by
 * reading `LocalOfficeCityV2.tsx`. Unlike sub-service's `ndcBody`/`introBody`,
 * nothing here needs the Brief 73 rich-text allow-list.
 */

import type {
  MostRequestedService,
  WhyPoint,
  CityReview,
} from '@/lib/cms/city-pages-types';

export type CityV2BlockType =
  | 'localOfficeV2Hero'
  | 'trustBar'
  | 'servicesGrid'
  | 'mostRequestedServices'
  | 'midCta'
  | 'whyPoints'
  | 'videoPlaceholder'
  | 'reviews'
  | 'faqAccordion'
  | 'noDripClub'
  | 'finalCta';

/** Canonical top-to-bottom order (Brief 99, Track B). */
export const CITY_V2_BLOCK_ORDER: CityV2BlockType[] = [
  'localOfficeV2Hero',
  'trustBar',
  'servicesGrid',
  'mostRequestedServices',
  'midCta',
  'whyPoints',
  'videoPlaceholder',
  'reviews',
  'faqAccordion',
  'noDripClub',
  'finalCta',
];

/** A single City V2 block instance — same `{id,type,data}` shape as sub-service. */
export interface CityV2BlockInstance {
  id: string;
  type: CityV2BlockType;
  data: Record<string, unknown>;
}

/** The named-column fields a City V2 block instance's `data` is folded from/to. */
export interface CityV2LegacyFields {
  heroImage?: string | null;
  heroHeadingLine1?: string | null;
  heroDescription?: string | null;
  trustBarStars?: string | null;
  trustBarReviewCount?: string | null;
  servicesIntro?: string | null;
  mostRequestedServices?: MostRequestedService[];
  midCtaText?: string | null;
  whyPoints?: WhyPoint[];
  videoHeading?: string | null;
  videoIntro?: string | null;
  videoScript?: string | null;
  reviews?: CityReview[];
  faqs?: Array<{ question: string; answer: string }>;
  ndcIntro?: string | null;
  finalCtaHeading?: string | null;
  finalCtaBody?: string | null;
}

/** Generate a stable, unique id for a new block instance (client + server safe). */
export function newCityV2BlockId(type: string): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  const rand =
    g.crypto && typeof g.crypto.randomUUID === 'function'
      ? g.crypto.randomUUID()
      : `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
  return `${type}-${rand}`;
}

const nn = (v: string | null | undefined): string | null => (v == null || v === '' ? null : v);

/**
 * Per-type content payload derived from the legacy named-column fields —
 * mirrors `blockDataFor()` in `sub-service-blocks.ts`. `noDripClub` gets a
 * `variant` marker (Brief 94 decisions log #2: one `noDripClub` type, variant
 * switch) — City V2 always writes `'v1'` (the Carmine character-card look,
 * `NoDripClubSection.tsx`), reconciling its `body`-only shape with
 * sub-service's `ndcTitle`+`ndcBody` by reusing the `ndcBody` key for the
 * body copy and simply never setting `ndcTitle`.
 */
export function cityV2BlockDataFor(type: CityV2BlockType, f: CityV2LegacyFields): Record<string, unknown> {
  switch (type) {
    case 'localOfficeV2Hero':
      return { heroImage: nn(f.heroImage), heroHeadingLine1: nn(f.heroHeadingLine1), heroDescription: nn(f.heroDescription) };
    case 'trustBar':
      return { trustBarStars: nn(f.trustBarStars), trustBarReviewCount: nn(f.trustBarReviewCount) };
    case 'servicesGrid':
      return { servicesIntro: nn(f.servicesIntro) };
    case 'mostRequestedServices':
      return { items: f.mostRequestedServices ?? [] };
    case 'midCta':
      return { midCtaText: nn(f.midCtaText) };
    case 'whyPoints':
      return { items: f.whyPoints ?? [] };
    case 'videoPlaceholder':
      return { videoHeading: nn(f.videoHeading), videoIntro: nn(f.videoIntro), videoScript: nn(f.videoScript) };
    case 'reviews':
      return { items: f.reviews ?? [] };
    case 'faqAccordion':
      return { heading: null, faqs: f.faqs ?? [] };
    case 'noDripClub':
      return { variant: 'v1', ndcBody: nn(f.ndcIntro) };
    case 'finalCta':
      return { ctaHeading: nn(f.finalCtaHeading), ctaBody: nn(f.finalCtaBody) };
    default:
      return {};
  }
}

/** Coerce an arbitrary value into a valid, de-duplicated-id City V2 block instance array. */
export function normalizeCityV2Blocks(raw: unknown): CityV2BlockInstance[] {
  if (!Array.isArray(raw)) return [];
  const valid = new Set<string>(CITY_V2_BLOCK_ORDER);
  const seenIds = new Set<string>();
  const out: CityV2BlockInstance[] = [];
  for (const b of raw) {
    if (!b || typeof b !== 'object') continue;
    const rec = b as Record<string, unknown>;
    const type = rec.type;
    if (typeof type !== 'string' || !valid.has(type)) continue;
    let id = rec.id;
    if (typeof id !== 'string' || id === '' || seenIds.has(id)) id = newCityV2BlockId(type);
    seenIds.add(id as string);
    const data = rec.data && typeof rec.data === 'object' ? (rec.data as Record<string, unknown>) : {};
    out.push({ id: id as string, type: type as CityV2BlockType, data });
  }
  return out;
}

/**
 * Assemble the canonical-order instance array from a legacy flat field set —
 * used by the reader's fallback (a row migrated before `blocks` existed) and
 * by the migration script.
 */
export function assembleCityV2Blocks(f: CityV2LegacyFields, order: CityV2BlockType[] = CITY_V2_BLOCK_ORDER): CityV2BlockInstance[] {
  return order.map((type) => ({ id: newCityV2BlockId(type), type, data: cityV2BlockDataFor(type, f) }));
}

/**
 * Reconstruct the flat "primary snapshot" field set from a `blocks` array —
 * the FIRST instance of each type wins (mirrors `blocksToFields()`). Used by
 * the writer to keep the 15 named columns populated as a rollback snapshot.
 * A block type absent from `blocks` (e.g. removed by the editor) leaves its
 * key out of the returned object entirely, so the caller's COALESCE preserves
 * whatever that column already held — it is a snapshot, not a live mirror.
 */
export function cityV2BlocksToFields(blocks: unknown): CityV2LegacyFields {
  const norm = normalizeCityV2Blocks(blocks);
  const fields: CityV2LegacyFields = {};
  const seen = new Set<CityV2BlockType>();
  for (const b of norm) {
    if (seen.has(b.type)) continue; // first instance = the primary snapshot
    seen.add(b.type);
    const d = b.data ?? {};
    switch (b.type) {
      case 'localOfficeV2Hero':
        fields.heroImage = (d.heroImage as string) ?? null;
        fields.heroHeadingLine1 = (d.heroHeadingLine1 as string) ?? null;
        fields.heroDescription = (d.heroDescription as string) ?? null;
        break;
      case 'trustBar':
        fields.trustBarStars = (d.trustBarStars as string) ?? null;
        fields.trustBarReviewCount = (d.trustBarReviewCount as string) ?? null;
        break;
      case 'servicesGrid':
        fields.servicesIntro = (d.servicesIntro as string) ?? null;
        break;
      case 'mostRequestedServices':
        fields.mostRequestedServices = Array.isArray(d.items) ? (d.items as MostRequestedService[]) : [];
        break;
      case 'midCta':
        fields.midCtaText = (d.midCtaText as string) ?? null;
        break;
      case 'whyPoints':
        fields.whyPoints = Array.isArray(d.items) ? (d.items as WhyPoint[]) : [];
        break;
      case 'videoPlaceholder':
        fields.videoHeading = (d.videoHeading as string) ?? null;
        fields.videoIntro = (d.videoIntro as string) ?? null;
        fields.videoScript = (d.videoScript as string) ?? null;
        break;
      case 'reviews':
        fields.reviews = Array.isArray(d.items) ? (d.items as CityReview[]) : [];
        break;
      case 'faqAccordion':
        fields.faqs = Array.isArray(d.faqs) ? (d.faqs as Array<{ question: string; answer: string }>) : [];
        break;
      case 'noDripClub':
        fields.ndcIntro = (d.ndcBody as string) ?? null;
        break;
      case 'finalCta':
        fields.finalCtaHeading = (d.ctaHeading as string) ?? null;
        fields.finalCtaBody = (d.ctaBody as string) ?? null;
        break;
    }
  }
  return fields;
}
