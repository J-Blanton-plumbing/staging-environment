/**
 * Brief 200 — content model for the Sewer Ecosystem v2 pages (`/services/sewer` + 9 service pages).
 *
 * The pages were approved as a static package (`/sewer-v2-test/`, Briefs 183 → 184 → 197) and are
 * now rendered inside the live site shell by `src/components/sewer-v2/*`. All copy lives in the
 * modules next to this file; the components hold none.
 *
 * Two kinds of content:
 *   - STRUCTURED fields for everything the 9 service pages share in shape — hero, reviews, FAQs,
 *     the services rows, No Drip Club, final CTA, contact rail, sticky bar, video blocks. These map
 *     1:1 onto CMS fields in the follow-up brief.
 *   - `SewerNode[]` for the free-form editorial panels in between. Every page's middle panels are a
 *     different mix of splits, card grids, comparison tables and lists (with per-element spacing the
 *     approved design depends on), so they were ported by script into this typed tree rather than
 *     retyped — no approved sentence was touched by hand. The CMS brief can map each panel to a
 *     rich-text field or promote recurring shapes to blocks.
 *
 * Phone numbers are NEVER literal here: a `{ phone }` node renders through `PhoneLink` and a
 * `{ phoneNumber: true }` node through `PhoneNumber`, so WhatConverts DNI swaps them exactly like
 * every other number on the site (Brief 185 §4.1 — a second literal number hijacks the header).
 */

/** Element tags a panel body may use. Anything else is a port error. */
export type SewerTag =
  | 'div' | 'span' | 'p' | 'h2' | 'h3' | 'h4' | 'ul' | 'ol' | 'li' | 'strong' | 'em' | 'br' | 'a' | 'img'
  | 'table' | 'thead' | 'tbody' | 'tr' | 'th' | 'td' | 'figure' | 'figcaption' | 'button' | 'section' | 'article' | 'nav';

/** Inline SVGs used by the approved markup, keyed by name (see sewer-v2/icons.tsx). */
export type SewerIconName =
  | 'phone20' | 'phone18' | 'phone18NoAria' | 'badge24' | 'checkCircle' | 'googleG' | 'avatar'
  | 'ndcCheck' | 'userPlus' | 'chevronLeft' | 'chevronRight';

export interface SewerElement {
  tag: SewerTag;
  /** `class` attribute, verbatim. */
  cls?: string;
  /** `style` attribute, verbatim CSS text (custom properties such as `--o` included). */
  style?: string;
  /** Other attributes, HTML names (`aria-label`, `data-label`, `loading` …). `true` = boolean attribute. */
  attrs?: Record<string, string | true>;
  kids?: SewerNode[];
}

/** A `tel:` link — rendered as `<PhoneLink>` with the site's default number. */
export interface SewerPhoneLink {
  phone: { cls?: string; ariaLabel?: string; kids?: SewerNode[] };
}

/** The visible phone number — rendered as `<PhoneNumber>`. */
export interface SewerPhoneNumber {
  phoneNumber: true;
}

export interface SewerIconNode {
  icon: SewerIconName;
}

/** The site's schedule popup trigger (`.schedule-popup`, ScheduleServiceModal — Brief 169). */
export interface SewerScheduleNode {
  schedule: { cls: string; label: string };
}

export type SewerVideo =
  | { kind: 'youtube'; id: string; title: string }
  /** `fallback` holds `{phone}` where the number goes (rendered through PhoneNumber). */
  | { kind: 'mp4'; src: string; poster: string; fallback: string };

export interface SewerVideoNode {
  video: SewerVideo;
}

export type SewerNode =
  | string
  | SewerElement
  | SewerPhoneLink
  | SewerPhoneNumber
  | SewerIconNode
  | SewerScheduleNode
  | SewerVideoNode;

/** FAQ answer text — a plain string, or nodes when the answer carries a link. */
export type SewerRich = string | SewerNode[];

export interface SewerFaq {
  q: string;
  preview: SewerRich;
  full: SewerRich;
}

export interface SewerReview {
  quote: string;
  name: string;
  /** The reviewer's Google Maps review link. */
  href: string;
}

/**
 * The approved package shipped three review-card variants, and they do not render the same:
 *   - `plain` — the name link inherits Midnight (`style="text-decoration:none;color:inherit"`)
 *   - `link`  — the name link has no inline style, so it renders Cerulean like any link
 *   - `cap`   — as `link`, with the caption coloured by `.pv-cap` instead of an inline style
 * Reproduced as approved. Flagged in the Brief 200 report for Marketing.
 */
export type SewerReviewsVariant = 'plain' | 'link' | 'cap';

/** One section of a service page's main column, in DOM order. `order` is the mobile `--o` value. */
export type SewerSection =
  | { kind: 'panel'; id: string; tint: boolean; order: number; body: SewerNode[] }
  | {
      kind: 'reviews';
      order: number;
      variant: SewerReviewsVariant;
      eyebrow: string;
      heading: string;
      items: SewerReview[];
    }
  | { kind: 'faq'; order: number; eyebrow: string; heading: string; items: SewerFaq[] }
  /** `body` overrides the shared No Drip Club sentence (two pages were approved with different wording). */
  | { kind: 'ndc'; order: number; body?: string }
  | { kind: 'services'; order: number }
  | { kind: 'final'; order: number; heading: string; body: string };

export interface SewerImage {
  src: string;
  alt: string;
}

export interface SewerServicePage {
  slug: string;
  /** Title WITHOUT the brand suffix — the root layout's template appends it (Briefs 145/146). */
  meta: { title: string; description: string };
  hero: {
    /** The current-page label of the visible breadcrumb ("Sewer Services / {crumb}"). */
    crumb: string;
    eyebrow: string;
    heading: string;
    intro: string;
    image: SewerImage;
  };
  sections: SewerSection[];
  /** The financing card's mobile `--o` value (the call box and trust list are shared). */
  rail: { financingOrder: number };
  /** schema.org VideoObject, verbatim from the approved package (7 of the 9 pages). */
  videoSchema?: Record<string, unknown>;
}

// ── shared lists ────────────────────────────────────────────────────────────────

/** One sewer service, as both the hub grid and every service page's "Services We Provide" rows show it. */
export interface SewerServiceEntry {
  slug: string;
  /** Live URL. */
  href: string;
  image: string;
  /** Rows on the 8 sibling service pages. */
  row: { title: string; short: string; alt: string };
  /** Card on the hub. */
  hub: { title: string; desc: string; alt: string };
}
