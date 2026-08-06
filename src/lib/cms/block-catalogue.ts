/**
 * Brief 90 (Track B) — the block REGISTRY. Generalized beyond sub-service by
 * Brief 97 (Track A) to describe blocks for more than one page type.
 *
 * Single source of truth for the block library: the left-sidebar Block Catalogue
 * (Track C) and the in-editor "+" inserter (Track D) both read this one file, as
 * does the sub-service editor when it renders a block instance's fields. Brief 97
 * added a `pageTypes` dimension so a definition can declare which templates it's
 * valid for — the sub-service editor and public render are UNCHANGED by this: they
 * only ever ask for the 9 original types, scoped to `'sub-service'`.
 *
 * Built directly from the Track A inventory (`briefs/brief-90-block-inventory.md`)
 * and Brief 94's site-wide catalogue (`briefs/brief-94-all-editors-block-inventory.md`
 * Part 2). Do NOT invent block types that aren't in the code — every entry here
 * maps to a real component that some template can render.
 *
 * Pure / client-safe: no DB import, no sanitize import (sanitization happens on
 * the server write path via `sanitizeBlockInstances`).
 */

import type {
  SubServiceBlockType,
  BlockBackground,
  BlockIllustration,
  BlockPosition,
} from '@/lib/cms/sub-service-blocks';
import {
  SUB_SERVICE_BLOCK_ORDER,
  BLOCK_BACKGROUNDS,
  BLOCK_ILLUSTRATIONS,
} from '@/lib/cms/sub-service-blocks';
import {
  RELATED_ARTICLES_MODES,
  RELATED_ARTICLES_COUNTS,
  RELATED_ARTICLES_MODE_LABELS,
  type RelatedArticlesMode,
  type RelatedArticlesCount,
} from '@/lib/cms/related-articles';
import { BENEFITS_CARD_COLUMNS, type BenefitsCardColumns } from '@/lib/cms/benefits-card';
import { staticNdcMembershipComparisonData } from '@/lib/cms/membership-comparison';

/**
 * `content`      — per-page authored content; the free-builder candidates.
 * `shared-embed` — same everywhere (Elfsight); positional only, no per-page content.
 * `auto`         — auto-generated from another source (article list).
 * (Chrome blocks — Hero Nav / Breadcrumb — are intentionally NOT registry entries.)
 */
export type BlockCategory = 'content' | 'shared-embed' | 'auto';

export const BLOCK_CATEGORY_LABELS: Record<BlockCategory, string> = {
  content: 'Content',
  'shared-embed': 'Shared',
  auto: 'Auto-generated',
};

export type BlockFieldType =
  | 'text'
  | 'textarea'
  | 'richtext'
  | 'image'
  | 'list'
  | 'faqRepeater'
  | 'subcategoryRepeater'
  // Brief 99 — City V2 object-shaped repeaters (one editor card per item, a
  // fixed set of sub-fields per item). Named per item shape, matching the
  // faqRepeater/subcategoryRepeater precedent rather than one generic type.
  | 'mostRequestedRepeater'
  | 'whyPointRepeater'
  | 'reviewRepeater'
  // Brief 121 — Benefits Card: benefit groups (heading + nested checkmark
  // lines + optional column placement) and the price on/off + amount + caption
  // cluster. Named per shape, matching the repeater precedent above.
  | 'benefitsGroupRepeater'
  | 'priceConfig'
  // Brief 141 — Membership Comparison: the benefit-row repeater (label + caveat
  // + child flag + a check/cross per column) and the annual price-card repeater
  // (term + amount + button label + single-choice emphasis). Named per shape,
  // matching the precedent above.
  | 'comparisonRowRepeater'
  | 'priceCardRepeater';

export interface BlockFieldDef {
  /** Key inside the block instance's `data`. */
  key: string;
  label: string;
  type: BlockFieldType;
  /** textarea/richtext row count. */
  rows?: number;
  help?: string;
  placeholder?: string;
  /** list: floor of always-present inputs. */
  minItems?: number;
  /** list: add-button label. */
  addLabel?: string;
}

/**
 * Brief 97 — every distinct page template that can host registry-driven blocks.
 * Named after the real template component / `template_type` value it corresponds
 * to (see `template-switching.ts` for the `city-*` template_type strings and
 * `preview.ts` for the `page_type` strings) so the identifier is traceable back to
 * actual code, not an invented taxonomy.
 */
export type PageType =
  | 'sub-service'
  | 'home'
  | 'city-local-office' // LocalOfficeCity.tsx — City V1 video-hero (template_type 'local-office')
  | 'city-coverage-area' // CoverageAreaCity.tsx — City V1 image-hero (template_type 'coverage-area')
  | 'city-v2' // LocalOfficeCityV2.tsx (template_type 'local-office-v2')
  | 'city-service' // CityServicePageTemplate.tsx (page_type 'city-service')
  | 'service-category' // src/app/services/{plumbing,sewer,drain,water-heater,water-quality,commercial}/page.tsx (+ [slug])
  | 'services-index' // src/app/services/page.tsx
  | 'knowledge-hub'
  | 'customer-stories'
  | 'financing'
  | 'emergency-plumbing'
  // Brief 121 — the No Drip Club page (src/app/no-drip-club/page.tsx, a
  // standalone main_pages-backed template). Registered so `benefitsCard` has a
  // real page-type scope; the page hosts a single contained block instance
  // (stored in main_pages.content.benefits_card), not a full block builder.
  | 'no-drip-club';

/**
 * Brief 97 (Track A) — the general block-type union. `BlockType` is strictly
 * additive: the sub-service set plus whatever net-new types the registry gains
 * (`faqAccordion`, Track B; the City V2 types, Brief 99; …).
 *
 * Brief 139: `SubServiceBlockType` gained one entry (`servicesMenu`). A block
 * that is VALID ON sub-service pages has to be in that union — the sub-service
 * instance type, `normalizeBlocks`' validity check and the editor's
 * `insertBlock` all key off it, so a type outside it can't be inserted or even
 * survive a load. What did NOT change is `SUB_SERVICE_BLOCK_ORDER` (still the
 * original 9): that is the DEFAULT SEED order, and keeping `servicesMenu` out of
 * it is what stops every un-migrated page from sprouting a services menu. The
 * faqAccordion precedent (net-new in `BlockType` only) works there solely
 * because faqAccordion is not valid on sub-service pages.
 */
export type BlockType =
  | SubServiceBlockType
  | 'faqAccordion'
  | 'serviceSubcategories'
  // Brief 99 — City V2 net-new block types (pageTypes: ['city-v2']).
  | 'localOfficeV2Hero'
  | 'trustBar'
  | 'servicesGrid'
  | 'mostRequestedServices'
  | 'midCta'
  | 'whyPoints'
  | 'videoPlaceholder'
  | 'reviews'
  // Brief 121 — reusable Benefits Card (first consumer: the No Drip Club page).
  | 'benefitsCard'
  // Brief 139 — placement-only OUR SERVICES menu (no content fields).
  | 'servicesMenu'
  // Brief 141 — Member vs. Non-Member comparison table + annual price cards.
  | 'membershipComparison';

/**
 * Brief 91 — the closed lists of style choices a block type exposes in the
 * sidebar's Block tab. Registry-driven, exactly like `fields`: the Style panel
 * reads this to know which controls to render and which options are allowed. Only
 * block types with real style options (List Section, No Drip Club) set it; every
 * other type omits it and the Block tab shows "no style options yet". `position`
 * is present only when the block's layout supports a safe left/right flip.
 */
export interface BlockStyleOptions {
  /**
   * Brief 93: `background` + `illustration` are optional. The character-panel
   * blocks (List Section, No Drip Club) expose the full brand remix (both set);
   * the 2 Column Section exposes only `position` (a photo two-column has no
   * background/character remix), so it sets `position` alone.
   */
  background?: BlockBackground[];
  illustration?: BlockIllustration[];
  position?: BlockPosition[];
  /**
   * Brief 121 — desktop column count (Benefits Card). A closed numeric list,
   * exactly like the other style controls: the sidebar/style surface renders
   * one button per allowed count. Stored top-level in the block's `data`
   * (`data.columns`, per the Brief 121 data shape), not inside `data.style`.
   */
  columns?: readonly BenefitsCardColumns[];
}

/**
 * Brief 92 — the closed lists of SELECTION choices a block type exposes in the
 * sidebar's Block tab (mode + count). Registry-driven, exactly like `styleOptions`:
 * the sidebar's selection panel reads this to know which controls to render and
 * which options are allowed. Only the Related Articles block sets it today; the
 * mode-specific INPUTS (category picker, hand-pick fields, backfill) live in the
 * block's own box in the main column, not here.
 */
export interface BlockSelectionOptions {
  modes: Array<{ value: RelatedArticlesMode; label: string }>;
  counts: readonly RelatedArticlesCount[];
}

export interface BlockDefinition {
  type: BlockType;
  label: string;
  variant: string;
  category: BlockCategory;
  /** Short one-liner shown in the sidebar catalogue + inserter tiles. */
  description: string;
  /** Can a new instance be added from the inserter? (Hero is core chrome → false.) */
  isInsertable: boolean;
  /** May the page hold more than one instance of this type? */
  allowMultiple: boolean;
  /** May an existing instance be removed from the page? (Hero → false, see brief.) */
  removable: boolean;
  /**
   * Brief 97 — which page templates this block is valid for. The 9 pre-existing
   * entries are `['sub-service']` (unchanged scope); net-new/widened entries list
   * every template that actually renders the underlying component today.
   */
  pageTypes: PageType[];
  /** Editor field list (empty for read-only shared/auto blocks). */
  fields: BlockFieldDef[];
  /** Read-only badge text for shared/auto blocks (shown in the editor box). */
  badge?: string;
  /** Default `data` for a freshly-inserted instance. */
  defaultData: Record<string, unknown>;
  /** Brief 91 — style controls this block exposes in the sidebar Block tab (closed lists). */
  styleOptions?: BlockStyleOptions;
  /** Brief 92 — selection controls (mode + count) this block exposes in the Block tab. */
  selectionOptions?: BlockSelectionOptions;
  /**
   * Brief 97 (Track B) — per-instance props a shared component already accepts
   * optionally (e.g. `GoogleReviews`'s `widgetId`, Brief 96) that a future editor
   * COULD expose. Deliberately separate from `fields` — the sub-service editor
   * renders live inputs whenever `fields.length > 0` (falling back to a read-only
   * badge otherwise), so adding here (and not to `fields`) documents the
   * possibility for Brief 99+ without changing any existing editor's UI today.
   */
  instanceOverrides?: BlockFieldDef[];
  /**
   * Brief 99 (Track A) — per-pageType overrides for a shared type whose field
   * shape or insert/remove behavior genuinely differs by template (e.g.
   * `noDripClub`'s v1-on-city-v2 body-only shape vs v2-on-sub-service's
   * title+body; `finalCta`'s deprecated sub-service alias vs a normal
   * insertable City V2 block). Absent for every type that behaves identically
   * everywhere it's valid — the 9 original sub-service types included.
   */
  fieldsByPageType?: Partial<Record<PageType, BlockFieldDef[]>>;
  defaultDataByPageType?: Partial<Record<PageType, Record<string, unknown>>>;
  flagsByPageType?: Partial<Record<PageType, { isInsertable?: boolean; allowMultiple?: boolean; removable?: boolean }>>;
}

/** Fields for `type` on `pageType` — the override when set, else the base list. */
export function fieldsFor(def: BlockDefinition, pageType: PageType): BlockFieldDef[] {
  return def.fieldsByPageType?.[pageType] ?? def.fields;
}

/** isInsertable/allowMultiple/removable for `type` on `pageType` — override wins per-flag. */
export function flagsFor(
  def: BlockDefinition,
  pageType: PageType
): { isInsertable: boolean; allowMultiple: boolean; removable: boolean } {
  const o = def.flagsByPageType?.[pageType];
  return {
    isInsertable: o?.isInsertable ?? def.isInsertable,
    allowMultiple: o?.allowMultiple ?? def.allowMultiple,
    removable: o?.removable ?? def.removable,
  };
}

// Brief 92 — the Related Articles selection controls, built from the closed lists
// in related-articles.ts so the sidebar renders from the registry (not hard-coded).
const RELATED_ARTICLES_SELECTION: BlockSelectionOptions = {
  modes: RELATED_ARTICLES_MODES.map((value) => ({ value, label: RELATED_ARTICLES_MODE_LABELS[value] })),
  counts: RELATED_ARTICLES_COUNTS,
};

// The full closed lists, shared by the two style-enabled block types below.
const ALL_BACKGROUNDS: BlockBackground[] = BLOCK_BACKGROUNDS.map((b) => b.value);
const ALL_ILLUSTRATIONS: BlockIllustration[] = BLOCK_ILLUSTRATIONS.map((i) => i.value);
// Brief 91 fix — the List Section's character sits in a tall portrait slot, so only
// the two full-body, camera-facing poses fit; the kneeling "fixing the tube" poses
// (J Pose 3 / 4) are landscape and render awkwardly there, so they're excluded.
const FULL_BODY_ILLUSTRATIONS: BlockIllustration[] = ['jGraphic', 'jPose2'];

export const BLOCK_CATALOGUE: Record<BlockType, BlockDefinition> = {
  hero: {
    type: 'hero',
    label: 'Hero Section',
    variant: 'Split image hero',
    category: 'content',
    description: 'Page hero — image, H1, subtext and phone CTA. One per page (core).',
    isInsertable: false, // core, non-removable, carries Hero Nav + breadcrumb chrome
    allowMultiple: false,
    removable: false,
    pageTypes: ['sub-service'],
    fields: [
      { key: 'heroImage', label: 'Hero Image', type: 'image' },
      { key: 'heroHeading', label: 'H1: Main Header', type: 'text' },
      { key: 'heroIntro', label: 'Sub-text', type: 'textarea', rows: 3 },
    ],
    defaultData: { heroImage: null, heroHeading: null, heroIntro: null },
  },
  intro: {
    // Brief 93 (Track A): the former "Intro Section" — generalized into a reusable
    // heading + rich body + photo block with an alignment toggle and an optional
    // button. The internal type key stays `intro` so existing instances need no
    // migration; only the label + options changed. Final CTA now merges into this
    // type (Track E) — a converted Final CTA is an `intro` instance with the
    // button enabled.
    type: 'intro',
    label: '2 Column Section',
    variant: 'Text + image, optional button',
    category: 'content',
    description: 'Heading + rich body + photo side-by-side, with an optional CTA button.',
    isInsertable: true,
    allowMultiple: true,
    removable: true,
    pageTypes: ['sub-service'],
    fields: [
      { key: 'introHeading', label: 'H2: Section Header', type: 'text' },
      { key: 'introBody', label: 'Section Body', type: 'richtext', rows: 6 },
      { key: 'fImage', label: 'Section Image', type: 'image' },
    ],
    defaultData: { introHeading: null, introBody: null, fImage: null },
    // Brief 93 (Track B): the only structural style option is which side the image
    // sits on (desktop). No background/character remix — this is a photo layout.
    styleOptions: { position: ['left', 'right'] },
  },
  listSection: {
    type: 'listSection',
    label: 'List Section',
    variant: 'Carmine character panel',
    category: 'content',
    description: 'Heading + checklist of items on the red character panel.',
    isInsertable: true,
    allowMultiple: true,
    removable: true,
    pageTypes: ['sub-service'],
    fields: [
      { key: 'problemsHeading', label: 'H2: Section Header', type: 'text' },
      { key: 'problemsItems', label: 'List items', type: 'list', minItems: 3, addLabel: '+ Add Item' },
    ],
    defaultData: { problemsHeading: null, problemsItems: [] },
    // Brief 91: the character panel is a flex row with the character on one side —
    // a safe left/right flip, so `position` is wired. Only the two full-body poses
    // fit the portrait character slot.
    styleOptions: { background: ALL_BACKGROUNDS, illustration: FULL_BODY_ILLUSTRATIONS, position: ['left', 'right'] },
  },
  map: {
    type: 'map',
    label: 'Coverage Map',
    variant: 'Elfsight',
    category: 'shared-embed',
    description: 'Service-area map ("We’re almost everywhere"). Shared across all pages.',
    isInsertable: true,
    allowMultiple: false,
    removable: true,
    // Brief 94: every other template's "map" is a raw Google Maps iframe, a
    // structurally different embed technology — this Elfsight coverage widget
    // stays sub-service-only until/unless that's reconciled (not this brief).
    pageTypes: ['sub-service'],
    fields: [],
    badge: 'Managed in Elfsight',
    defaultData: {},
  },
  googleReviews: {
    type: 'googleReviews',
    label: 'Google Reviews',
    variant: 'Elfsight',
    category: 'shared-embed',
    description: 'Google reviews carousel, shared across the site.',
    isInsertable: true,
    allowMultiple: false,
    removable: true,
    // Brief 97 (Track B): Brief 96 consolidated every raw-div implementation onto
    // this one `GoogleReviews.tsx` component — widened to every template that
    // renders it today.
    pageTypes: [
      'sub-service',
      'home',
      'city-local-office',
      'city-coverage-area',
      'city-v2',
      'city-service',
      'service-category',
      'services-index',
      'knowledge-hub',
      'customer-stories',
      'financing',
      'emergency-plumbing',
    ],
    fields: [],
    badge: 'Managed in Elfsight',
    defaultData: {},
    // Brief 96 made `widgetId` an optional prop on `GoogleReviews.tsx` (defaults to
    // the sitewide constant). Documented here, not added to `fields`, so the
    // sub-service editor's read-only badge box is unaffected (see `instanceOverrides` doc).
    instanceOverrides: [
      { key: 'widgetId', label: 'Elfsight Widget ID', type: 'text', help: 'Optional override — defaults to the sitewide Google Reviews widget.' },
    ],
  },
  tiktokFeed: {
    type: 'tiktokFeed',
    label: 'TikTok Feed',
    variant: 'Elfsight',
    category: 'shared-embed',
    description: 'TikTok video feed. Headline is shared across all sub-service pages.',
    isInsertable: true,
    allowMultiple: false,
    removable: true,
    // Brief 97 (Track B): widened to every template that renders the
    // Brief-96-consolidated `TikTokFeed.tsx` (Knowledge Hub and Customer Stories
    // render Google Reviews only, no TikTok feed — excluded deliberately).
    pageTypes: [
      'sub-service',
      'home',
      'city-local-office',
      'city-coverage-area',
      'city-service',
      'service-category',
      'services-index',
      'financing',
      'emergency-plumbing',
    ],
    fields: [],
    badge: 'Managed in Elfsight',
    defaultData: {},
    // Brief 96 made `headline`/`widgetId` optional props on `TikTokFeed.tsx`.
    instanceOverrides: [
      { key: 'headline', label: 'Headline', type: 'text', help: 'Optional headline shown above the feed.' },
      { key: 'widgetId', label: 'Elfsight Widget ID', type: 'text', help: 'Optional override — defaults to the sitewide TikTok widget.' },
    ],
  },
  noDripClub: {
    type: 'noDripClub',
    label: 'No Drip Club',
    variant: 'v2 · .f2 two-column',
    category: 'content',
    description: 'No Drip Club pitch — red label, rich body, JOIN NOW pill.',
    isInsertable: true,
    allowMultiple: true,
    removable: true,
    // Brief 99 (decisions-log 2026-07-21 #2): one `noDripClub` type, variant
    // switch — City V2 uses the v1 Carmine character-card look
    // (`NoDripClubSection.tsx`) via `data.variant`, reconciling v1's
    // `body`-only shape with v2's `ndcTitle`+`ndcBody` by reusing `ndcBody`
    // for the copy on both variants and simply omitting `ndcTitle` on v1.
    pageTypes: ['sub-service', 'city-v2'],
    fields: [
      { key: 'ndcTitle', label: 'H2: Section Header', type: 'text' },
      {
        key: 'ndcBody',
        label: 'Section Body',
        type: 'richtext',
        rows: 4,
        help: 'The per-service No Drip Club pitch. Leave blank to use the generic default copy.',
      },
    ],
    defaultData: { ndcTitle: null, ndcBody: null },
    // Brief 91: the `.f2` band is a two-column grid — the image column flips left/right
    // via the same `order` pattern the Coverage Map already uses, so `position` is wired.
    styleOptions: { background: ALL_BACKGROUNDS, illustration: ALL_ILLUSTRATIONS, position: ['left', 'right'] },
    fieldsByPageType: {
      // City V2's v1 variant has no title in the render (`NoDripClubSection`
      // shows body copy only) — `ndcBody` is the only editable field; the
      // style pickers above are v2-`.f2`-specific (a different component/look)
      // and are deliberately NOT surfaced for city-v2 (no visual remix exists
      // for the v1 character-card look) — see the city-v2 editor's Block tab.
      'city-v2': [
        { key: 'ndcBody', label: 'City Intro', type: 'textarea', rows: 5, help: 'Shown inside the standard No Drip Club block. Leave blank to use the generic default copy.' },
      ],
    },
    defaultDataByPageType: {
      'city-v2': { variant: 'v1', ndcBody: null },
    },
    flagsByPageType: {
      'city-v2': { isInsertable: true, allowMultiple: false, removable: true },
    },
  },
  relatedArticles: {
    type: 'relatedArticles',
    label: 'Related Articles',
    variant: 'Knowledge Hub grid',
    category: 'auto',
    description: 'Knowledge Hub articles — newest, filtered by category, or hand-picked.',
    isInsertable: true,
    allowMultiple: false,
    removable: true,
    // Brief 97 (Track B): `ArticleGrid.tsx` (the render) is shared across every one
    // of these templates already — the gap is entirely in the SELECTION layer.
    // Sub-service is the only one with the richer mode/count/category system
    // (`selectionOptions` below); the others (home, both City V1 variants,
    // City×Service, service-category) currently resolve a static slug list, which
    // maps onto this same config shape as `mode: 'handpick'` — no separate field
    // needed. Knowledge Hub (paginated full-index grid), Customer Stories, Financing
    // (its own `ArticleCard` grid, no mode/count) and emergency-plumbing/
    // services-index (no article grid at all) are deliberately excluded.
    pageTypes: ['sub-service', 'home', 'city-local-office', 'city-coverage-area', 'city-service', 'service-category'],
    fields: [],
    // Brief 92: the editor box is rendered by a dedicated component (mode-specific
    // inputs), not the generic `fields` list — so it is no longer a read-only badge.
    defaultData: {},
    // Brief 92: mode (category/newest/handpick) + count (3/6/9) picked in the Block tab.
    selectionOptions: RELATED_ARTICLES_SELECTION,
  },
  finalCta: {
    // Brief 93 (Track E): Final CTA is merged into the 2 Column Section. It is
    // removed from the inserter (`isInsertable: false`) so no NEW Final CTA can be
    // added, but the entry + render path are kept as an ALIAS — any legacy /
    // not-yet-converted `finalCta` instance still renders correctly (as the same
    // 2 Column output, with the phone button). The conversion script rewrites
    // existing instances to type `intro`.
    type: 'finalCta',
    label: 'Final CTA',
    variant: '.f3.f3-left',
    category: 'content',
    description: 'Closing CTA — tagline, body, photo and phone pill.',
    isInsertable: false,
    allowMultiple: true,
    removable: true,
    // Brief 99: widened to City V2's closing Carmine band (`finalCtaHeading`/
    // `finalCtaBody`, no image) — unlike the sub-service alias, this is a
    // normal insertable/removable single-instance block on city-v2.
    pageTypes: ['sub-service', 'city-v2'],
    fields: [
      { key: 'ctaHeading', label: 'Section Header', type: 'text' },
      { key: 'ctaBody', label: 'Section Body', type: 'textarea', rows: 3 },
      { key: 'f3Image', label: 'Closing CTA Image', type: 'image' },
    ],
    defaultData: { ctaHeading: null, ctaBody: null, f3Image: null },
    fieldsByPageType: {
      'city-v2': [
        { key: 'ctaHeading', label: 'Heading', type: 'text' },
        { key: 'ctaBody', label: 'Body', type: 'textarea', rows: 3 },
      ],
    },
    defaultDataByPageType: {
      'city-v2': { ctaHeading: null, ctaBody: null },
    },
    flagsByPageType: {
      'city-v2': { isInsertable: true, allowMultiple: false, removable: true },
    },
  },
  faqAccordion: {
    // Brief 97 (Track B) — net-new. `FaqAccordion.tsx` is already a single,
    // un-diverged shared component across the 4 city templates listed below (Brief
    // 94 Part 3 §1(a): "lowest-effort net-new registry addition on the whole list").
    // No new component needed — this is a registry definition only; no template
    // wires an inserter to it in this brief (Brief 99+).
    type: 'faqAccordion',
    label: 'FAQs',
    variant: 'Carmine accordion',
    category: 'content',
    description: 'Frequently asked questions — Carmine accordion, shared across the city templates.',
    isInsertable: true,
    allowMultiple: false,
    removable: true,
    pageTypes: ['city-local-office', 'city-coverage-area', 'city-v2', 'city-service'],
    fields: [
      // `FaqAccordion.tsx` renders no heading today — this is a forward-looking,
      // optional field for a future section heading, not yet wired to any render.
      { key: 'heading', label: 'Section Heading', type: 'text', help: 'Optional — not yet rendered; reserved for a future section heading.' },
      { key: 'faqs', label: 'FAQs', type: 'faqRepeater', minItems: 1, addLabel: '+ Add FAQ' },
    ],
    defaultData: { heading: null, faqs: [] },
  },
  serviceSubcategories: {
    // Brief 98 — net-new. Migrated off the relational `service_subcategories`
    // table (ordered by `sort_order`) onto the generic `{id,type,data}` JSONB
    // model, matching every other registry block. `SubcategoriesGrid.tsx` is
    // the extracted, shared component (Track B) rendered by the 6 static
    // `src/app/services/<slug>/page.tsx` files — NOT by the dead
    // `src/app/services/[slug]/page.tsx` catch-all (shadowed by those 6 static
    // routes; see the Brief 98 report).
    //
    // `image` is additive beyond the brief's original `{label,href,desc}` item
    // spec: the live cards show a per-item thumbnail that, pre-migration, came
    // from each category's static content file (`src/lib/content/*.ts`) zipped
    // to the DB row by array index. Folding it into the block makes the block
    // a single self-contained, fully-editable source of truth instead of a
    // second by-index lookup the editor could never reach.
    type: 'serviceSubcategories',
    label: 'Subcategories Grid',
    variant: '1-4 col card grid',
    category: 'content',
    description: 'Linked subcategory cards ("Explore More ... Solutions") — image, label, description.',
    isInsertable: true,
    allowMultiple: false,
    removable: true,
    pageTypes: ['service-category'],
    fields: [
      { key: 'heading', label: 'Section Heading', type: 'text' },
      { key: 'items', label: 'Subcategory Cards', type: 'subcategoryRepeater', minItems: 0, addLabel: '+ Add card' },
    ],
    defaultData: { heading: null, items: [] },
    // No style options — this block has no background/character remix or
    // left/right flip, unlike List Section / No Drip Club / 2 Column Section.
  },

  // ── Brief 99 (Track A) — City V2 net-new block types ──────────────────────
  // Built from the Brief 94 §4 City V2 trace (`briefs/brief-94-all-editors-
  // block-inventory.md`) — data keys are the exact `city_pages` DB columns
  // (camelCased) so the migration/reader/writer fold 1:1 with no translation
  // layer. Brief 115: this used to say every field renders as plain JSX text
  // and none need the Brief 73 sanitizer — no longer true for `noDripClub.ndcBody`,
  // which now renders as HTML (see `city-v2-blocks.ts`). Every other field here
  // is still plain JSX text and still needs no sanitization.

  localOfficeV2Hero: {
    // Core chrome, exactly like sub-service's `hero` — one per page, pinned
    // first, non-removable (decisions-log 2026-07-21 #3: heroes stay core
    // everywhere). A distinct type (not a reuse of `hero`) because the V2
    // split image/Carmine hero has its own field shape and component.
    type: 'localOfficeV2Hero',
    label: 'Hero Section',
    variant: 'Split image / Carmine hero',
    category: 'content',
    description: 'Page hero — image, H1 and intro paragraph. One per page (core).',
    isInsertable: false,
    allowMultiple: false,
    removable: false,
    pageTypes: ['city-v2'],
    fields: [
      { key: 'heroImage', label: 'Hero Image', type: 'image' },
      { key: 'heroHeadingLine1', label: 'Hero Heading', type: 'text' },
      { key: 'heroDescription', label: 'Hero Description', type: 'textarea', rows: 3 },
    ],
    defaultData: { heroImage: null, heroHeadingLine1: null, heroDescription: null },
  },
  trustBar: {
    type: 'trustBar',
    label: 'Trust Bar',
    variant: 'Cream strip, pipe-separated stats',
    category: 'content',
    description: 'Office address · star rating · review count strip below Hero Nav.',
    isInsertable: true,
    allowMultiple: false,
    removable: true,
    pageTypes: ['city-v2'],
    fields: [
      { key: 'trustBarStars', label: 'Stars', type: 'text', help: 'e.g. "4.8"' },
      { key: 'trustBarReviewCount', label: 'Review Count', type: 'text', help: 'e.g. "300+"' },
    ],
    defaultData: { trustBarStars: null, trustBarReviewCount: null },
  },
  servicesGrid: {
    type: 'servicesGrid',
    label: 'Services Grid',
    variant: 'Homepage-shared card grid',
    category: 'content',
    description: 'Plumbing services intro + the shared services card grid (card list is site-wide, not per-page).',
    isInsertable: true,
    allowMultiple: false,
    removable: true,
    pageTypes: ['city-v2'],
    fields: [
      { key: 'servicesIntro', label: 'Intro Text', type: 'textarea', rows: 3 },
    ],
    defaultData: { servicesIntro: null },
  },
  mostRequestedServices: {
    type: 'mostRequestedServices',
    label: 'Most Requested Services',
    variant: 'Asymmetric 1-tall + 2-stacked cards',
    category: 'content',
    description: 'Per-city highlight cards — title + body per service.',
    isInsertable: true,
    allowMultiple: false,
    removable: true,
    pageTypes: ['city-v2'],
    fields: [
      { key: 'items', label: 'Services', type: 'mostRequestedRepeater', minItems: 0, addLabel: '+ Add service' },
    ],
    defaultData: { items: [] },
  },
  midCta: {
    type: 'midCta',
    label: 'Mid CTA',
    variant: 'Navy full-width band',
    category: 'content',
    description: 'Short callout line + phone button between the services and Why sections.',
    isInsertable: true,
    allowMultiple: false,
    removable: true,
    pageTypes: ['city-v2'],
    fields: [
      { key: 'midCtaText', label: 'Text', type: 'textarea', rows: 3 },
    ],
    defaultData: { midCtaText: null },
  },
  whyPoints: {
    type: 'whyPoints',
    label: 'Why Homeowners Call Us First',
    variant: '3-col point grid (or static V1 fallback)',
    category: 'content',
    description: '3-column reasons grid. Falls back to the city’s static V1 copy when left empty.',
    isInsertable: true,
    allowMultiple: false,
    removable: true,
    pageTypes: ['city-v2'],
    fields: [
      { key: 'items', label: 'Points', type: 'whyPointRepeater', minItems: 0, addLabel: '+ Add point' },
    ],
    defaultData: { items: [] },
  },
  videoPlaceholder: {
    type: 'videoPlaceholder',
    label: 'Video Section',
    variant: '"Coming Soon" placeholder',
    category: 'content',
    description: 'Heading + intro above a "Video — Coming Soon" placeholder.',
    isInsertable: true,
    allowMultiple: false,
    removable: true,
    pageTypes: ['city-v2'],
    fields: [
      { key: 'videoHeading', label: 'Heading', type: 'text' },
      { key: 'videoIntro', label: 'Intro', type: 'textarea', rows: 3 },
      {
        key: 'videoScript',
        label: 'Script',
        type: 'textarea',
        rows: 8,
        help: 'Production-only — never rendered on the public page (kept write-only by design, Brief 68 Fix 6).',
      },
    ],
    defaultData: { videoHeading: null, videoIntro: null, videoScript: null },
  },
  reviews: {
    type: 'reviews',
    label: 'Reviews',
    variant: 'DB cards (or Elfsight fallback)',
    category: 'content',
    description: 'Up to 5 hand-entered reviews. Falls back to the Elfsight widget when empty.',
    isInsertable: true,
    allowMultiple: false,
    removable: true,
    pageTypes: ['city-v2'],
    fields: [
      { key: 'items', label: 'Reviews', type: 'reviewRepeater', minItems: 0, addLabel: '+ Add review' },
    ],
    defaultData: { items: [] },
  },

  // ── Brief 121 — Benefits Card ──────────────────────────────────────────────
  benefitsCard: {
    // A titled Carmine card of benefit groups (sub-heading + checkmark lines)
    // across 1–3 desktop columns, with an optional price line and footnotes.
    // Ported from the No Drip Club page's hardcoded "MEMBERS GET:" card
    // (Brief 12 / `ndc.css`); layout, checkmarks, fonts and colors are fixed by
    // the template — only text/structure is editable. Data shape + normalizer
    // live in `@/lib/cms/benefits-card.ts`.
    type: 'benefitsCard',
    label: 'Benefits Card',
    variant: 'Carmine benefits/pricing card',
    category: 'content',
    description: 'Benefit groups with checkmark lists across 1–3 columns, optional price line + footnotes.',
    isInsertable: true,
    allowMultiple: true,
    removable: true,
    // First consumer is the No Drip Club page; deliberately NOT hard-scoped in
    // any structural way — widening to another template is a one-line addition
    // here once that template's editor wires an inserter to it.
    pageTypes: ['no-drip-club'],
    fields: [
      {
        key: 'label',
        label: 'Admin Label',
        type: 'text',
        help: 'Editor-only instance name — never shown on the public page.',
        placeholder: 'e.g. Members Get card',
      },
      { key: 'title', label: 'Card Title', type: 'text', placeholder: 'e.g. MEMBERS GET:', help: 'Optional — hidden when empty.' },
      { key: 'groups', label: 'Benefit Groups', type: 'benefitsGroupRepeater', minItems: 0, addLabel: '+ Add group' },
      { key: 'price', label: 'Price', type: 'priceConfig' },
      { key: 'footnotes', label: 'Footnotes', type: 'list', minItems: 0, addLabel: '+ Add footnote', placeholder: 'Fine-print line {n}' },
    ],
    // Fresh insert: one empty group, 2 columns, price enabled and driven by the
    // {{ndc_price}} Global Settings token (Brief 77), no footnotes.
    defaultData: {
      label: null,
      title: null,
      columns: 2,
      groups: [{ heading: null, items: [], column: null }],
      price: { enabled: true, amount: '{{ndc_price}}', caption: null },
      footnotes: [],
    },
    // Structural control (desktop column count) — a style option per the
    // Brief 91 principle: structure in the Block tab / style surface, content
    // in the block's box. Stored as top-level `data.columns`.
    styleOptions: { columns: BENEFITS_CARD_COLUMNS },
  },

  // ── Brief 141 — Membership Comparison ──────────────────────────────────────
  membershipComparison: {
    // The `comparison` No Drip Club template's primary content: the Member vs.
    // Non-Member benefits table, the annual price cards and the purchase-term
    // footnote — one block, because they are one visual section and always
    // co-occur (same reasoning as `benefitsCard` bundling groups + price +
    // footnotes). Data shape + normalizer live in
    // `@/lib/cms/membership-comparison.ts`; layout, card chrome, the blue member
    // column tab, the check/cross iconography, fonts and colors are fixed by the
    // template and deliberately NOT editable.
    type: 'membershipComparison',
    label: 'Membership Comparison',
    variant: 'Member vs. non-member table + price cards',
    category: 'content',
    description: 'Benefit-by-benefit member/non-member table with annual price cards and footnotes.',
    isInsertable: true,
    // One known instance per page — this IS the comparison template's body.
    allowMultiple: false,
    removable: false,
    // Reuses the PageType Brief 121 registered; not re-added.
    pageTypes: ['no-drip-club'],
    fields: [
      {
        key: 'label',
        label: 'Admin Label',
        type: 'text',
        help: 'Editor-only instance name — never shown on the public page.',
        placeholder: 'e.g. Membership comparison',
      },
      { key: 'title', label: 'Section Title (H2)', type: 'text', placeholder: 'e.g. MEMBERSHIP BENEFITS' },
      { key: 'subtitle', label: 'Subtitle', type: 'text', placeholder: 'e.g. RESIDENTIAL HOMES ONLY', help: 'Optional — hidden when empty.' },
      { key: 'memberColumnLabel', label: 'Member Column Heading', type: 'text', placeholder: 'e.g. NO DRIP CLUB' },
      { key: 'nonMemberColumnLabel', label: 'Non-Member Column Heading', type: 'text', placeholder: 'e.g. NON MEMBER' },
      { key: 'rows', label: 'Benefit Rows', type: 'comparisonRowRepeater', minItems: 1, addLabel: '+ Add row' },
      {
        key: 'closingLine',
        label: 'Closing Line (between table and prices)',
        type: 'text',
        placeholder: 'e.g. Increases standard labor warranty from 1-year to 5-years',
        help: 'Optional — hidden when empty.',
      },
      { key: 'prices', label: 'Price Cards', type: 'priceCardRepeater', minItems: 1, addLabel: '+ Add price card' },
      {
        key: 'priceFootnote',
        label: 'Pricing Footnote (under the cards)',
        type: 'text',
        placeholder: 'e.g. *Charged upfront, auto renewal unless…',
        help: 'Purchase terms. Kept next to the Join buttons on purpose — do not move it into a page footer.',
      },
    ],
    // Unlike `benefitsCard` (which defaults empty), a fresh insert defaults to
    // the approved sell-sheet content: this block has a single known instance, so
    // a useful default beats a blank one. Built from the same static mapper the
    // seed and the public fallback use, so the three can never drift.
    defaultData: staticNdcMembershipComparisonData() as unknown as Record<string, unknown>,
    // No styleOptions: every visual choice is fixed by the approved design.
  },

  // ── Brief 139 — OUR SERVICES menu (placement block) ────────────────────────
  servicesMenu: {
    // A PLACEMENT block, not a content block: it renders the existing shared
    // `CityServicesMenu` where the editor drops it and nothing more. Brief 94
    // classifies this menu as "shared-by-construction" — the same static
    // 6-category / 41-item list on every page — so zero content fields is the
    // correct shape, not an oversight. Do NOT add speculative fields here
    // (Brief 97's `faqAccordion.heading` ghost-field is the cautionary tale).
    //
    // Link routing is derived from PAGE CONTEXT by the template, never stored:
    // sub-service pages render `<CityServicesMenu />` (global links via
    // `globalServiceHref`), City V2 pages pass their own city slug (city-scoped
    // `/{city}/{service}`). `citySlug` deliberately never appears in `data` —
    // a copied stale value would silently pin the wrong links.
    type: 'servicesMenu',
    label: 'Our Services Menu',
    variant: 'Red gradient category menu',
    category: 'shared-embed',
    description: 'The OUR SERVICES category menu. Links follow the page automatically.',
    isInsertable: true,
    allowMultiple: false,
    removable: true,
    // Only the two templates that render from a `blocks` array today. Widen
    // (plus a render case with the right context) as the block model reaches
    // more templates — same discipline Brief 97 applied.
    pageTypes: ['sub-service', 'city-v2'],
    fields: [],
    badge: 'No settings — links follow the page',
    defaultData: {},
    // No styleOptions: the panel's look is fixed by globals.css
    // (`.city-services-row` red gradient + white text/icons/caret).
  },
};

/** All block TYPES the registry knows about, in a stable canonical order. */
const ALL_BLOCK_TYPES: BlockType[] = [
  ...SUB_SERVICE_BLOCK_ORDER,
  'faqAccordion',
  'serviceSubcategories',
  // Brief 99 — City V2 net-new types, in the template's canonical render order.
  'localOfficeV2Hero',
  'trustBar',
  'servicesGrid',
  'mostRequestedServices',
  'midCta',
  'whyPoints',
  'videoPlaceholder',
  'reviews',
  // Brief 121 — reusable Benefits Card.
  'benefitsCard',
  // Brief 139 — OUR SERVICES menu. Listed here (not via SUB_SERVICE_BLOCK_ORDER,
  // which stays the 9-entry default seed order) so it appears in the catalogue
  // and inserter without being auto-added to any page.
  'servicesMenu',
  // Brief 141 — Membership Comparison (No Drip Club `comparison` variant).
  'membershipComparison',
];

/** Every block definition in canonical order (all page types). */
export const ALL_BLOCKS: BlockDefinition[] = ALL_BLOCK_TYPES.map((t) => BLOCK_CATALOGUE[t]);

/** Insertable blocks grouped by category, in a stable display order. */
export const CATEGORY_ORDER: BlockCategory[] = ['content', 'shared-embed', 'auto'];

// ── Brief 97 (Track A) — general, page-type-parameterized registry queries ─────
// The single set of query functions every template (sub-service today, others from
// Brief 99+) should use. Sub-service-scoped exports below delegate to these so
// existing behavior is unchanged.

/** The definition for `type`, but only if it's valid for `pageType` — else undefined. */
export function blockDefFor(pageType: PageType, type: BlockType): BlockDefinition | undefined {
  const def = BLOCK_CATALOGUE[type];
  return def && def.pageTypes.includes(pageType) ? def : undefined;
}

/** Insertable blocks valid for `pageType`, in canonical order. */
export function insertableBlocksFor(pageType: PageType): BlockDefinition[] {
  return ALL_BLOCKS.filter((b) => b.pageTypes.includes(pageType) && flagsFor(b, pageType).isInsertable);
}

/** Insertable blocks valid for `pageType`, grouped by category (stable display order). */
export function insertableBlocksByCategoryFor(
  pageType: PageType
): Array<{ category: BlockCategory; label: string; blocks: BlockDefinition[] }> {
  const blocks = insertableBlocksFor(pageType);
  return CATEGORY_ORDER.map((category) => ({
    category,
    label: BLOCK_CATEGORY_LABELS[category],
    blocks: blocks.filter((b) => b.category === category),
  })).filter((g) => g.blocks.length > 0);
}

// ── Sub-service-scoped exports (unchanged behavior — delegate to the general queries) ──
//
// `BlockDefinition.type` is now the general `BlockType`, but every entry reachable
// through these sub-service-scoped exports is (by construction — filtered on
// `pageTypes.includes('sub-service')`) a member of `SubServiceBlockType`: the
// original 9 plus Brief 139's `servicesMenu`. Types that are never valid on
// sub-service (faqAccordion, the City V2 set, benefitsCard) can't reach them.
// `SubServiceBlockDefinition` re-narrows `.type` back to
// `SubServiceBlockType` at the type level so the sub-service editor's existing
// `SubServiceBlockType`-typed call sites (`disabledFor`, `onInsert`, `insertBlock`)
// keep compiling and behaving exactly as before this brief. Exported so the one
// remaining sub-service-only lookup keyed directly off `BLOCK_CATALOGUE` (the
// editor's "recently used" list) can apply the same narrowing.
export type SubServiceBlockDefinition = BlockDefinition & { type: SubServiceBlockType };

/** All block definitions in canonical order. Sub-service scope only — unchanged. */
export const BLOCK_LIST: SubServiceBlockDefinition[] = SUB_SERVICE_BLOCK_ORDER.map(
  (t) => BLOCK_CATALOGUE[t] as SubServiceBlockDefinition
);

/** Insertable blocks only (what the sidebar catalogue + inserter show). Sub-service scope only — unchanged. */
export const INSERTABLE_BLOCKS: SubServiceBlockDefinition[] = insertableBlocksFor('sub-service') as SubServiceBlockDefinition[];

/** @deprecated in favor of `insertableBlocksByCategoryFor('sub-service')` — kept for existing callers. */
export function insertableBlocksByCategory(): Array<{ category: BlockCategory; label: string; blocks: SubServiceBlockDefinition[] }> {
  return insertableBlocksByCategoryFor('sub-service') as Array<{
    category: BlockCategory;
    label: string;
    blocks: SubServiceBlockDefinition[];
  }>;
}

/**
 * Deep-clone a definition's defaultData so instances never share a reference.
 * Brief 99: `pageType` is optional (existing sub-service call sites omit it —
 * unchanged behavior); when passed, a `defaultDataByPageType` override wins.
 */
export function defaultDataFor(type: BlockType, pageType?: PageType): Record<string, unknown> {
  const def = BLOCK_CATALOGUE[type];
  const data = (pageType && def.defaultDataByPageType?.[pageType]) ?? def.defaultData;
  return structuredClone(data);
}
