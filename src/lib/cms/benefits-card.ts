/**
 * Brief 121 — the `benefitsCard` block's data shape, normalizer, and the
 * static-content mapper.
 *
 * The Benefits Card is the No Drip Club page's "MEMBERS GET:" card (Carmine
 * panel, checkmark benefit groups, price line, footnotes), generalized into a
 * reusable registry block. This module is the single source of truth for the
 * shape — the public render (`BenefitsCard.tsx`), the admin editor, and the
 * seed script (`scripts/seed-brief-121-ndc-benefits-card.ts`) all import from
 * here, so the seeded instance, the pre-seed static fallback, and the editor's
 * default state can never drift apart.
 *
 * Client-safe on purpose (no DB import, no sanitize import): every field
 * renders as a plain JSX text node, so nothing here needs the Brief 73
 * sanitizer. `{{tokens}}` (e.g. the price's `{{ndc_price}}`) are resolved at
 * render time by the page through `resolveTokens` (Brief 77).
 */

import { NDC } from '@/lib/content/ndc';

/** Desktop column counts the card supports (mobile always stacks to one). */
export const BENEFITS_CARD_COLUMNS = [1, 2, 3] as const;
export type BenefitsCardColumns = (typeof BENEFITS_CARD_COLUMNS)[number];

/** One benefit group: an optional sub-heading + its checkmark lines. */
export interface BenefitsCardGroup {
  /** Sub-heading, e.g. "SERIOUS SAVINGS". Optional — hidden when empty. */
  heading: string | null;
  /** Checkmark lines. */
  items: string[];
  /** Explicit desktop column placement (1-based); null → auto-flow. */
  column: BenefitsCardColumns | null;
}

/** The optional price block at the end of the last column. */
export interface BenefitsCardPrice {
  enabled: boolean;
  /** Price line — defaults to the `{{ndc_price}}` token (Global Settings). */
  amount: string;
  /** Optional fine-print line rendered directly under the price. */
  caption: string | null;
}

/** The full `data` payload of a `benefitsCard` block instance (Brief 121). */
export interface BenefitsCardData {
  /** Admin-only instance name (shown in the editor, never rendered). */
  label: string | null;
  /** Card title, e.g. "MEMBERS GET:". Optional — hidden when empty. */
  title: string | null;
  /** Desktop column count. Mobile (≤1050px) always stacks. */
  columns: BenefitsCardColumns;
  groups: BenefitsCardGroup[];
  price: BenefitsCardPrice;
  footnotes: string[];
}

/** A stored block instance — same `{id, type, data}` model as Briefs 90/99. */
export interface BenefitsCardInstance {
  id: string;
  type: 'benefitsCard';
  data: BenefitsCardData;
}

/** The key the No Drip Club page's `main_pages.content` blob stores its instance under. */
export const NDC_BENEFITS_CARD_CONTENT_KEY = 'benefits_card';

const asStr = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null);

const asColumns = (v: unknown): BenefitsCardColumns | null =>
  v === 1 || v === 2 || v === 3 ? v : null;

const asStrList = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string') : [];

/**
 * Coerce a raw `data` JSON blob into a well-formed `BenefitsCardData`.
 * Unknown/malformed fields fall back to safe defaults; never throws.
 */
export function normalizeBenefitsCardData(raw: unknown): BenefitsCardData {
  const d = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const rawGroups = Array.isArray(d.groups) ? d.groups : [];
  const groups: BenefitsCardGroup[] = rawGroups
    .filter((g): g is Record<string, unknown> => !!g && typeof g === 'object')
    .map((g) => ({
      heading: asStr(g.heading),
      items: asStrList(g.items),
      column: asColumns(g.column),
    }));
  const p = (d.price && typeof d.price === 'object' ? d.price : {}) as Record<string, unknown>;
  return {
    label: asStr(d.label),
    title: asStr(d.title),
    columns: asColumns(d.columns) ?? 2,
    groups,
    price: {
      enabled: typeof p.enabled === 'boolean' ? p.enabled : false,
      amount: typeof p.amount === 'string' ? p.amount : '',
      caption: asStr(p.caption),
    },
    footnotes: asStrList(d.footnotes),
  };
}

/**
 * Parse a stored `main_pages.content.benefits_card` value into an instance, or
 * null when absent/malformed (→ callers fall back to the static card).
 */
export function normalizeBenefitsCardInstance(raw: unknown): BenefitsCardInstance | null {
  if (!raw || typeof raw !== 'object') return null;
  const b = raw as Record<string, unknown>;
  if (b.type !== 'benefitsCard' || typeof b.id !== 'string' || b.id === '') return null;
  return { id: b.id, type: 'benefitsCard', data: normalizeBenefitsCardData(b.data) };
}

/**
 * Today's hardcoded "MEMBERS GET:" card (`lib/content/ndc.ts`, verbatim from
 * Brief 12 / the live theme) expressed as block data. This is what the seed
 * script writes, what the public page renders until the seed has run, and what
 * the admin editor starts from when no instance is stored yet — one mapper,
 * three call sites, zero drift.
 *
 * Column placement is EXPLICIT (left: Serious Savings + VIP Peace of Mind;
 * right: Complimentary Home Maintenance) so the seeded card reproduces the
 * exact current split regardless of the auto-flow rules.
 *
 * The price amount is the `{{ndc_price}}` token: the current page renders
 * `settings.ndcPrice` (Global Settings, Brief 77) as the pricing line, and the
 * token resolves to exactly that same value — the price stays driven by
 * Global Settings, byte-identically.
 */
export function staticNdcBenefitsCardData(): BenefitsCardData {
  return {
    label: 'Members Get card',
    title: NDC.card.label,
    columns: 2,
    groups: [
      ...NDC.card.leftColumn.map((g) => ({
        heading: g.heading as string | null,
        items: [...g.items],
        column: 1 as BenefitsCardColumns | null,
      })),
      ...NDC.card.rightColumn.map((g) => ({
        heading: g.heading as string | null,
        items: [...g.items],
        column: 2 as BenefitsCardColumns | null,
      })),
    ],
    price: { enabled: true, amount: '{{ndc_price}}', caption: null },
    footnotes: [...NDC.card.footnotes],
  };
}

/**
 * Split groups across `columns` desktop columns. Explicitly-placed groups go
 * to their column (clamped placements beyond the column count auto-flow
 * instead); the rest auto-flow in order, chunked evenly left-to-right.
 * Returns exactly `columns` arrays (some possibly empty).
 */
export function assignBenefitsCardColumns(
  groups: BenefitsCardGroup[],
  columns: BenefitsCardColumns
): BenefitsCardGroup[][] {
  const cols: BenefitsCardGroup[][] = Array.from({ length: columns }, () => []);
  const auto: BenefitsCardGroup[] = [];
  for (const g of groups) {
    if (g.column !== null && g.column >= 1 && g.column <= columns) cols[g.column - 1].push(g);
    else auto.push(g);
  }
  if (auto.length > 0) {
    const per = Math.ceil(auto.length / columns);
    auto.forEach((g, i) => cols[Math.min(Math.floor(i / per), columns - 1)].push(g));
  }
  return cols;
}
