/**
 * Brief 141 — the `membershipComparison` block's data shape, normalizers, and
 * the static-content mapper. Mirrors `@/lib/cms/benefits-card.ts` (Brief 121)
 * deliberately: same instance model, same three call sites (public render,
 * admin editor, seed script), same "one mapper so nothing can drift" rule.
 *
 * The block is the No Drip Club page's `comparison` template variant primary
 * content: the Member vs. Non-Member table, the annual price cards and the
 * purchase-term footnote. One block holds all three because they are one visual
 * section and always co-occur (exactly how `benefitsCard` bundled groups + price
 * + footnotes).
 *
 * Client-safe on purpose (no DB import, no sanitize import): every field renders
 * as a plain JSX text node, so nothing here needs the Brief 73 sanitizer.
 * `{{tokens}}` — the price cards' `{{ndc_price_1yr}}` / `{{ndc_price_2yr}}` —
 * resolve at render time through `resolveTokens` (Brief 77).
 */

import { NDC } from '@/lib/content/ndc';

/** Editor cap on price cards. The render handles 1–3; more would break the row. */
export const MEMBERSHIP_COMPARISON_MAX_PRICES = 3;

/** One benefit row. `member`/`nonMember` are per-cell so any cell can be flipped. */
export interface ComparisonRowData {
  label: string;
  /** Small qualifying line under the label. Hidden when null/empty. */
  caveat: string | null;
  /** True → indented, bullet-marked child of the preceding parent row. */
  child: boolean;
  /** Check when true, cross when false. */
  member: boolean;
  /** Check when true, cross when false. */
  nonMember: boolean;
}

/** One annual-term price card. */
export interface ComparisonPriceData {
  termLabel: string;
  /** Free text — defaults to a Global Settings token, e.g. `{{ndc_price_1yr}}`. */
  amount: string;
  buttonLabel: string;
  /** Carmine border + shadow. At most one card may carry it (enforced in the editor). */
  emphasized: boolean;
}

/** The full `data` payload of a `membershipComparison` block instance. */
export interface MembershipComparisonData {
  /** Admin-only instance name (BlockShell convention); never rendered. */
  label: string | null;
  title: string;
  /** Hidden when empty. */
  subtitle: string | null;
  memberColumnLabel: string;
  nonMemberColumnLabel: string;
  rows: ComparisonRowData[];
  /** Warranty line between the table and the price cards. Hidden when empty. */
  closingLine: string | null;
  prices: ComparisonPriceData[];
  /** Auto-renewal purchase term, directly beneath the cards. Hidden when empty. */
  priceFootnote: string | null;
}

/** A stored block instance — same `{id, type, data}` model as Briefs 90/99/121. */
export interface MembershipComparisonInstance {
  id: string;
  type: 'membershipComparison';
  data: MembershipComparisonData;
}

/**
 * The key the No Drip Club page's `main_pages.content` blob stores this instance
 * under. The `comparison` variant reads and writes ONLY this key; the `classic`
 * variant reads and writes ONLY `benefits_card`. That separation — not a
 * migration or an archive — is what makes a variant switch non-destructive
 * (Brief 141, Track B).
 */
export const NDC_MEMBERSHIP_COMPARISON_CONTENT_KEY = 'membership_comparison';

const asStr = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null);
const asText = (v: unknown, fb: string): string => (typeof v === 'string' && v !== '' ? v : fb);
const asBool = (v: unknown, fb: boolean): boolean => (typeof v === 'boolean' ? v : fb);

/**
 * Coerce a raw `data` JSON blob into a well-formed `MembershipComparisonData`.
 * Unknown/malformed fields fall back to safe defaults; never throws. A row whose
 * label is missing is dropped (an unlabelled row is not a benefit); a `child: true`
 * row with no parent before it is kept and simply renders indented.
 */
export function normalizeMembershipComparisonData(raw: unknown): MembershipComparisonData {
  const d = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const rows: ComparisonRowData[] = (Array.isArray(d.rows) ? d.rows : [])
    .filter((r): r is Record<string, unknown> => !!r && typeof r === 'object')
    .map((r) => ({
      label: typeof r.label === 'string' ? r.label : '',
      caveat: asStr(r.caveat),
      child: asBool(r.child, false),
      member: asBool(r.member, true),
      nonMember: asBool(r.nonMember, false),
    }))
    .filter((r) => r.label !== '');
  const prices: ComparisonPriceData[] = (Array.isArray(d.prices) ? d.prices : [])
    .filter((p): p is Record<string, unknown> => !!p && typeof p === 'object')
    .map((p) => ({
      termLabel: typeof p.termLabel === 'string' ? p.termLabel : '',
      amount: typeof p.amount === 'string' ? p.amount : '',
      buttonLabel: asText(p.buttonLabel, 'Join Today'),
      emphasized: asBool(p.emphasized, false),
    }))
    .slice(0, MEMBERSHIP_COMPARISON_MAX_PRICES);
  return {
    label: asStr(d.label),
    title: asText(d.title, NDC.comparison.title),
    subtitle: asStr(d.subtitle),
    memberColumnLabel: asText(d.memberColumnLabel, NDC.comparison.memberColumnLabel),
    nonMemberColumnLabel: asText(d.nonMemberColumnLabel, NDC.comparison.nonMemberColumnLabel),
    rows,
    closingLine: asStr(d.closingLine),
    prices,
    priceFootnote: asStr(d.priceFootnote),
  };
}

/**
 * Parse a stored `main_pages.content.membership_comparison` value into an
 * instance, or null when absent/malformed (→ callers fall back to the static
 * mapper below, so no code path can render an empty section).
 */
export function normalizeMembershipComparisonInstance(
  raw: unknown
): MembershipComparisonInstance | null {
  if (!raw || typeof raw !== 'object') return null;
  const b = raw as Record<string, unknown>;
  if (b.type !== 'membershipComparison' || typeof b.id !== 'string' || b.id === '') return null;
  return { id: b.id, type: 'membershipComparison', data: normalizeMembershipComparisonData(b.data) };
}

/**
 * The approved sell-sheet content (`src/lib/content/ndc.ts` → `NDC.comparison`,
 * verbatim from `ndc-sell-sheet/Back.png`) expressed as block data. This is what
 * the seed script writes, what the public page renders until the seed has run,
 * what a fresh insert defaults to, and what the admin editor starts from — one
 * mapper, four call sites, zero drift.
 *
 * Price amounts are the Global Settings TOKENS, not the literals, so both cards
 * stay driven by Global Settings (Brief 141, Track A).
 */
export function staticNdcMembershipComparisonData(): MembershipComparisonData {
  const c = NDC.comparison;
  return {
    label: 'Membership comparison',
    title: c.title,
    subtitle: c.subtitle,
    memberColumnLabel: c.memberColumnLabel,
    nonMemberColumnLabel: c.nonMemberColumnLabel,
    rows: c.rows.map((r) => ({ ...r })),
    closingLine: c.closingLine,
    prices: c.prices.map((p) => ({ ...p })),
    priceFootnote: c.priceFootnote,
  };
}
