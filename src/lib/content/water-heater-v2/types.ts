/**
 * Brief 222 — content model for the Water Heater cluster v1 (`/services/water-heater` + 5 service
 * pages), ported from the approved package (`New Pages/Water Heater Cluster v1/_source/package`).
 *
 * Three template versions share one shape:
 *   - `wh-hub`      — the hub (the Sewer v2 hub design system + the new `.wh-*` components);
 *   - `wh-standard` — a page about one service (Repair, Installation, Maintenance): rail = Emergency
 *                     card → trust box → financing card (the sewer "Dispatch" rail order);
 *   - `wh-index`    — a page covering several services (Tankless, Commercial): rail = "On this page"
 *                     index → trust box → Emergency card (tall screens only); financing, when on, is an
 *                     in-content panel.
 *
 * Copy is never in the components. Editorial panels are `SewerNode` trees (the Brief 200 node model,
 * rendered by `WhNodes`) whose OUTER element is the `<section>` itself, so the section's id, classes
 * and mobile order are part of the locked layout. Reviews, FAQs, the "Other Water Heater Services"
 * rows, the financing panel, the hero and the rail are structured fields.
 *
 * Phone numbers are never literal: `{ phone }` / `{ phoneNumber: true }` nodes render through
 * PhoneLink / PhoneNumber (WhatConverts DNI); `{{phone}}` in a phone link's screen-reader label is
 * replaced with the display number. Ratings are never literal either: the rating card is fed by the
 * Brief 221 tokens `{{company_rating}}` / `{{company_review_count}}`.
 */
import type { SewerFaq, SewerTag } from '@/lib/content/sewer-v2/types';

/**
 * A node of a water heater content tree: the Brief 200 `SewerNode` model, except that icons name the
 * water heater SVG set (src/components/water-heater-v2/wh-icon-data.ts) instead of the sewer one.
 */
export type WhTreeNode =
  | string
  | WhTreeElement
  | { phone: { cls?: string; ariaLabel?: string; kids?: WhTreeNode[] } }
  | { phoneNumber: true }
  | { icon: string }
  | { schedule: { cls: string; label: string } };

export interface WhTreeElement {
  tag: SewerTag;
  cls?: string;
  style?: string;
  attrs?: Record<string, string | true>;
  kids?: WhTreeNode[];
}

export type WhTemplate = 'wh-hub' | 'wh-standard' | 'wh-index';

/** A photo whose alt text comes from the package HTML. */
export interface WhImage {
  src: string;
  alt: string;
}

export interface WhHero {
  /** Current-page label of the visible breadcrumb (service pages; '' on the hub). */
  crumb: string;
  eyebrow: string;
  /** The page's ONLY <h1> — visually hidden; search engines and screen readers read it. */
  h1: string;
  /** The visible (aria-hidden) headline before the rotating market name. */
  lead: string;
  /** The market names that rotate in the visible headline ("Chicagoland", "Columbus, OH"). */
  words: string[];
  intro: string;
  image: WhImage;
}

export interface WhReview {
  quote: string;
  name: string;
  /** Shown after "Verified Customer ·". */
  location: string;
  /** The reviewer's Google review link — '' until a real one exists (the name is then not linked). */
  href: string;
}

/** The optional photo gallery on the FIRST review (the "Real Jobs, Real Reviews" job). */
export interface WhGallery {
  /** Screen-reader label of the review card. */
  label: string;
  photos: WhImage[];
}

export interface WhServiceRow {
  title: string;
  desc: string;
  image: string;
  alt: string;
  href: string;
}

export type WhSection =
  /** An editorial section: the whole `<section>` element as a node tree (layout locked). */
  | { kind: 'panel'; el: WhTreeNode }
  | {
      kind: 'reviews';
      layout: 'hub' | 'spoke';
      /** The section's class / inline style (mobile order) — layout. */
      cls: string;
      style: string;
      eyebrow: string;
      heading: string;
      items: WhReview[];
      /** Spoke pages only; null = text-only reviews. */
      gallery: WhGallery | null;
    }
  | { kind: 'faq'; layout: 'hub' | 'spoke'; cls: string; style: string; eyebrow: string; heading: string; items: SewerFaq[] }
  | {
      kind: 'services';
      cls: string;
      style: string;
      eyebrow: string;
      heading: string;
      items: WhServiceRow[];
      emergency: { title: string; desc: string; image: string; alt: string; cta: string };
    }
  /** Index pages: the in-content financing panel. Copy is the shared (fixed) financing copy. */
  | { kind: 'financing'; style: string; enabled: boolean };

export interface WhRail {
  /**
   * The trust box (`div.ss-trust`) as a node tree: its items are a list (add / remove / reorder). The
   * first item is the service-specific review count (big number + sentence-case label); the others
   * carry an image icon or an inline red-circle SVG.
   */
  trust: WhTreeNode;
  /** Standard pages: the financing card's mobile order. 0 on Index pages (no financing card). */
  financingOrder: number;
  /** Index pages: the "On this page" index. Link targets are section ids (locked). */
  toc: { label: string; items: { href: string; label: string }[] } | null;
}

/** The page's schema.org Service node — the editable words; ids, URLs and the rest are derived. */
export interface WhServiceSchema {
  name: string;
  serviceType: string;
  description: string;
  audienceType: string;
  /** Index pages + hub: hasOfferCatalog. Item URLs are locked (section anchors / the spoke pages). */
  catalog: { name: string; items: { name: string; url: string }[] } | null;
}

export interface WhPage {
  slug: string;
  template: WhTemplate;
  /** Title WITHOUT the brand suffix — the root layout's template appends it. */
  meta: { title: string; description: string };
  hero: WhHero;
  sections: WhSection[];
  /** Service pages only. */
  rail: WhRail | null;
  service: WhServiceSchema;
}

/**
 * What every water heater page shares, stored on the HUB row under `v2_content.shared` and edited in
 * /admin for the hub. Nothing here is shared with the sewer pages.
 */
export interface WhSharedContent {
  badge24Label: string;
  quickLinks: { ariaLabel: string; links: { href: string; label: string }[] };
  crumbParent: { label: string; href: string };
  /** The Emergency card (service pages' rail). */
  call: { heading: string; body: string; cta: string };
  /** Fixed financing copy (handoff §2d): never name a lender. */
  financing: { eyebrow: string; heading: string; body: string; note: string; cta: string; image: string; alt: string };
  /** Mobile sticky call bar; `{{phone}}` in `ariaLabel` is replaced with the display number. */
  sticky: { title: string; sub: string; cta: string; ariaLabel: string };
  /** The rating + BBB card. Rating fields carry the Brief 221 company tokens. */
  proof: {
    ariaLabel: string;
    rating: string;
    starsLabel: string;
    sub: string;
    bbb: { href: string; seal: string; sealAlt: string; label: string };
  };
  review: { stars: string; starsLabel: string; caption: string };
}

/** A service page as stored in `sub_service_pages.v2_content` (slug and meta live on the row). */
export interface WhStored {
  schema: 1;
  template: WhTemplate;
  hero: WhHero;
  sections: WhSection[];
  rail: WhRail | null;
  service: WhServiceSchema;
}

/** The hub as stored in `service_category_pages.v2_content`: the page + the shared sections. */
export interface WhHubStored extends WhStored {
  shared: WhSharedContent;
}
