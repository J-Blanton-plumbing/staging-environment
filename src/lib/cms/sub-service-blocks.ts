/**
 * Brief 89 (Track B) → Brief 90 (Track B) — pure, client-safe sub-service block helpers.
 *
 * Kept separate from `sub-service-pages.ts` (which imports the DB pool) so the
 * admin editor — a client component — and the block registry / sidebar can import
 * the block types, order and helpers WITHOUT pulling server-only code into the
 * client bundle.
 *
 * Brief 90 model change: `blocks` moved from a type-keyed ordered list
 * (`{ type, order, data }`) to an array of INSTANCE records
 * (`{ id, type, data }`). Array position is the order; `id` is a stable unique
 * id per instance. This lets the same block type appear more than once on a page
 * (a free page-builder), each instance carrying its own content in `data`.
 *
 * No sanitization happens here: rich-text fields (introBody, ndcBody) are
 * sanitized by the server write paths BEFORE persisting (see `RICH_TEXT_DATA_KEYS`
 * + `sanitizeBlockInstances`, which the server invokes with the shared allow-list).
 */

import type { SubServiceFields } from '@/lib/cms/sub-service-fields';

export type SubServiceBlockType =
  | 'hero'
  | 'intro'
  | 'listSection'
  | 'map'
  | 'googleReviews'
  | 'tiktokFeed'
  | 'noDripClub'
  | 'relatedArticles'
  | 'finalCta'
  // Brief 139 — placement-only OUR SERVICES menu. Deliberately NOT in
  // SUB_SERVICE_BLOCK_ORDER; see the two-list note below.
  | 'servicesMenu'
  // Brief 149 — the last two "ghost" sections. `ServicePageTemplate` has always
  // been able to render a centred text block (its `secondary` / `preventive`
  // sections) and a two-card related-services row, but ONLY from a static content
  // file — there was no block type, so no CMS page could author them and no
  // DB-backed page could render them. That is the same shadow this brief exists
  // to close, in the other direction: markup with no editor behind it.
  //
  // They exist so `/sewer-rodding` and `/hydro-jetting` can move onto
  // `sub_service_pages` without dropping three sections of live copy. Like
  // `servicesMenu`, both are OPT-IN — absent from SUB_SERVICE_BLOCK_ORDER, so no
  // existing page sprouts one.
  | 'textSection'
  | 'relatedServices';

/**
 * Canonical DEFAULT top-to-bottom order — matches Brief 87 Section A (rendering
 * blocks only). This is the SEED list: a page with no stored `blocks` gets one
 * instance of every type listed here (`assembleBlocks`, and the
 * `sub-service-pages.ts` / editor un-migrated-row fallbacks).
 *
 * ⚠️ Brief 139: this is deliberately NOT the same thing as "which types are
 * valid". Adding an opt-in block (`servicesMenu`) here would auto-insert it on
 * every page that has never been block-migrated — so the two roles are now two
 * lists. Add to ORDER only for a block that should appear on a page by default.
 */
export const SUB_SERVICE_BLOCK_ORDER: SubServiceBlockType[] = [
  'hero',
  'intro',
  'listSection',
  'map',
  'googleReviews',
  'tiktokFeed',
  'noDripClub',
  'relatedArticles',
  'finalCta',
];

/**
 * Brief 139 — every type a stored sub-service block instance may legally carry:
 * the default-order set plus opt-in types that only exist once an editor inserts
 * them. `normalizeBlocks` validates against THIS list, so an inserted
 * `servicesMenu` survives a save/load round trip; `SUB_SERVICE_BLOCK_ORDER`
 * stays the seed order so no page gains a block it wasn't given.
 */
export const SUB_SERVICE_BLOCK_TYPES: SubServiceBlockType[] = [
  ...SUB_SERVICE_BLOCK_ORDER,
  'servicesMenu',
  // Brief 149 — opt-in, same rule as servicesMenu: valid to store and insert,
  // never seeded onto a page that has not been given one.
  'textSection',
  'relatedServices',
];

/** Human labels for the editor's block boxes. */
export const SUB_SERVICE_BLOCK_LABELS: Record<SubServiceBlockType, string> = {
  hero: 'Hero Section',
  // Brief 93 (Track A): the Intro block was generalized into a reusable
  // heading + text + image + optional-button block. The type key stays `intro`
  // (no migration of existing instances); only the display label changed.
  intro: '2 Column Section',
  listSection: 'List Section',
  map: 'Coverage Map',
  googleReviews: 'Google Reviews',
  tiktokFeed: 'TikTok Feed',
  noDripClub: 'No Drip Club',
  relatedArticles: 'Related Articles',
  finalCta: 'Final CTA',
  // Brief 139 — placement-only block (no content fields).
  servicesMenu: 'Our Services Menu',
  // Brief 149 — the two former ghost sections.
  textSection: 'Text Section',
  relatedServices: 'Related Services',
};

/**
 * A single block INSTANCE (Brief 90). `id` is a stable, per-instance unique id;
 * `data` is that instance's own content. Array position is the render order.
 */
export interface SubServiceBlockInstance {
  id: string;
  type: SubServiceBlockType;
  data: Record<string, unknown>;
}

/** @deprecated Brief 89 type-keyed shape. Kept as an alias so old importers compile. */
export type SubServiceBlock = SubServiceBlockInstance;

// ── Shared render fallbacks (also used by ServicePageTemplate) ─────────────────
// Pulled here from sub-service-pages.ts so the (client-safe) template can apply
// per-instance fallbacks without importing the DB-bound module. Re-exported from
// sub-service-pages.ts for existing importers.
export const FALLBACK_HERO = '/images/hero_image.webp';
export const FALLBACK_CTA_IMAGE =
  'https://d1rplazj5a80fb.cloudfront.net/images/manplumber.webp';
export const NDC_DEFAULT_BODY =
  'Our No Drip Club offers premium plumbing protection and added peace of mind for homeowners. Members enjoy priority scheduling and routine inspections to catch small issues before they become costly repairs.';

/** Rich-text data keys per block type — sanitized on every instance on write. */
export const RICH_TEXT_DATA_KEYS: Partial<Record<SubServiceBlockType, string[]>> = {
  intro: ['introBody'],
  noDripClub: ['ndcBody'],
};

// ── Brief 91 — per-instance block STYLE options ────────────────────────────────
// A block instance's `data` may carry an optional `style` object. It is additive:
// no schema change (it lives inside the existing `data` JSONB), and a block with
// no `style` renders EXACTLY as it did before this brief (the component's legacy
// path). Backgrounds and illustrations are CLOSED lists pulled verbatim from
// brand-rules.md (Approved Color Combos) and asset-manifest.md (Brand Character J)
// — no free text, no color pickers, no uploads. Style is only meaningful for the
// two block types wired in Brief 91 (List Section + No Drip Club); every other
// type has no style options yet.

/** The six brand-approved foreground-on-background combos (brand-rules.md). Closed set. */
export type BlockBackground =
  | 'carmineOnCream'
  | 'creamOnCarmine'
  | 'creamOnRosewood'
  | 'creamOnMidnight'
  | 'creamOnMediumBlue'
  | 'scarletOnRosewood';

/** The four Brand Character (J) poses (asset-manifest.md → public/images/j/). Closed set. */
export type BlockIllustration = 'jGraphic' | 'jPose2' | 'jPose3' | 'jPose4';

/** Which side the illustration/character sits on (only for blocks that flip safely). */
export type BlockPosition = 'left' | 'right';

export interface BlockStyle {
  background: BlockBackground;
  illustration: BlockIllustration;
  /** Present only when the block's layout supports a safe left/right flip. */
  position?: BlockPosition;
}

export interface BackgroundOption {
  value: BlockBackground;
  label: string;
  /** Panel/section background color (hex from brand-rules.md). */
  bg: string;
  /** Text/foreground color (hex from brand-rules.md). */
  fg: string;
}

export interface IllustrationOption {
  value: BlockIllustration;
  label: string;
  /**
   * Raw public path under public/images/j/ (filenames contain spaces). Kept
   * un-encoded so `next/image` encodes it exactly once; plain `<img>` and the
   * browser encode spaces automatically too.
   */
  src: string;
}

// Brand hexes (brand-rules.md palette). Kept local so this stays a pure,
// client-safe module — never imports the admin/site color modules.
const CARMINE = '#BC0E0E';
const CREAM = '#F9F3EC';
const ROSEWOOD = '#540606';
const MIDNIGHT = '#0A1B2E';
const MEDIUM_BLUE = '#0044BF';
const SCARLET_WEB = '#1167FF';

/** Closed background list, in menu order. Foreground-on-background per brand-rules.md. */
export const BLOCK_BACKGROUNDS: BackgroundOption[] = [
  { value: 'carmineOnCream', label: 'Carmine on Cream', bg: CREAM, fg: CARMINE },
  { value: 'creamOnCarmine', label: 'Cream on Carmine', bg: CARMINE, fg: CREAM },
  { value: 'creamOnRosewood', label: 'Cream on Rosewood', bg: ROSEWOOD, fg: CREAM },
  { value: 'creamOnMidnight', label: 'Cream on Midnight', bg: MIDNIGHT, fg: CREAM },
  { value: 'creamOnMediumBlue', label: 'Cream on Medium Blue', bg: MEDIUM_BLUE, fg: CREAM },
  { value: 'scarletOnRosewood', label: 'Scarlet on Rosewood', bg: ROSEWOOD, fg: SCARLET_WEB },
];

/** Closed illustration list, in menu order. Raw paths (spaces intact). */
export const BLOCK_ILLUSTRATIONS: IllustrationOption[] = [
  { value: 'jGraphic', label: 'J Graphic', src: '/images/j/J Graphic.png' },
  { value: 'jPose2', label: 'J Pose 2', src: '/images/j/J Pose 2.png' },
  { value: 'jPose3', label: 'J Pose 3', src: '/images/j/J Pose 3.png' },
  { value: 'jPose4', label: 'J Pose 4', src: '/images/j/J Pose 4.png' },
];

const BACKGROUND_MAP = new Map(BLOCK_BACKGROUNDS.map((b) => [b.value, b]));
const ILLUSTRATION_MAP = new Map(BLOCK_ILLUSTRATIONS.map((i) => [i.value, i]));

export function backgroundOption(value: BlockBackground | string | undefined): BackgroundOption | undefined {
  return value ? BACKGROUND_MAP.get(value as BlockBackground) : undefined;
}
export function illustrationOption(value: BlockIllustration | string | undefined): IllustrationOption | undefined {
  return value ? ILLUSTRATION_MAP.get(value as BlockIllustration) : undefined;
}

/**
 * Per-block-type STYLE DEFAULTS — the token that most closely mirrors each block's
 * CURRENT hard-coded look, read from the component source (Brief 91):
 *
 * • List Section (ServiceProblems / CharacterPanel): a Carmine `#BC0E0E` panel with
 *   Cream/white copy and the J. Blanton character flush at the bottom-LEFT →
 *   `creamOnCarmine`, `jGraphic`, position `left`.
 * • No Drip Club (NoDripClubSimple, `.f2`): a Cream `#F9F3EC` band with a Carmine
 *   `#BC0E0E` label + navy body and the photo in the RIGHT column →
 *   `carmineOnCream`, `jGraphic`, position `right`.
 *
 * These defaults populate the sidebar pickers so a selected block shows its
 * current look pre-selected. They are NOT written to `data` until the editor makes
 * a choice — a block with no `style` still renders via the component's untouched
 * legacy path, so omitting `style` is byte-for-byte identical to pre-Brief-91.
 */
export const BLOCK_STYLE_DEFAULTS: Partial<Record<SubServiceBlockType, BlockStyle>> = {
  listSection: { background: 'creamOnCarmine', illustration: 'jGraphic', position: 'left' },
  noDripClub: { background: 'carmineOnCream', illustration: 'jGraphic', position: 'right' },
};

/** Does this block type expose style options (Brief 91)? */
export function hasStyleOptions(type: SubServiceBlockType): boolean {
  return type in BLOCK_STYLE_DEFAULTS;
}

/** The default style for a type, or null when the type has no style options. */
export function defaultBlockStyle(type: SubServiceBlockType): BlockStyle | null {
  return BLOCK_STYLE_DEFAULTS[type] ?? null;
}

/**
 * Coerce an arbitrary `data.style` value into a valid, complete BlockStyle for the
 * given type — or null when absent/invalid or when the type has no style options.
 * Unknown background/illustration/position tokens fall back to the type's default.
 * Returns null (→ legacy render) when `raw` is missing entirely.
 */
export function normalizeBlockStyle(type: SubServiceBlockType, raw: unknown): BlockStyle | null {
  const def = BLOCK_STYLE_DEFAULTS[type];
  if (!def) return null;
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const background = BACKGROUND_MAP.has(r.background as BlockBackground)
    ? (r.background as BlockBackground)
    : def.background;
  const illustration = ILLUSTRATION_MAP.has(r.illustration as BlockIllustration)
    ? (r.illustration as BlockIllustration)
    : def.illustration;
  const style: BlockStyle = { background, illustration };
  // Only carry `position` for types whose default declares it (i.e. that flip).
  if (def.position !== undefined) {
    style.position = r.position === 'left' || r.position === 'right' ? r.position : def.position;
  }
  return style;
}

/** Read the saved style off a block instance's `data` (null → render legacy default). */
export function readBlockStyle(type: SubServiceBlockType, data: Record<string, unknown> | undefined): BlockStyle | null {
  return normalizeBlockStyle(type, data?.style);
}

export interface ResolvedBlockStyle {
  background: BackgroundOption;
  illustration: IllustrationOption;
  position: BlockPosition;
}

/**
 * Resolve a block instance's `data.style` to concrete render values (color hexes +
 * image src + position). Returns null when no style is set (the caller must then
 * render the component's legacy look). Used by both the public render path and the
 * admin live preview so the two can never drift.
 */
export function resolveBlockStyle(type: SubServiceBlockType, data: Record<string, unknown> | undefined): ResolvedBlockStyle | null {
  const style = readBlockStyle(type, data);
  if (!style) return null;
  const background = BACKGROUND_MAP.get(style.background)!;
  const illustration = ILLUSTRATION_MAP.get(style.illustration)!;
  const position: BlockPosition = style.position ?? BLOCK_STYLE_DEFAULTS[type]?.position ?? 'left';
  return { background, illustration, position };
}

// ── Brief 93 — "2 Column Section" block (the generalized `intro` type) ──────────
// The 2 Column Section reuses the intro `data` keys unchanged (introHeading /
// introBody / fImage) so existing instances need NO data migration and render
// byte-for-byte as before. It adds two additive, optional pieces of config inside
// the same `data` JSONB:
//   • `data.style.position` — which side the IMAGE sits on (desktop only). Default
//     'right' = the intro's historical layout (text left, image right). 'left'
//     flips them (the old Final CTA `.f3-left` arrangement). Mobile is ALWAYS
//     text-first (the toggle only affects the desktop side-by-side).
//   • `data.button` — an optional brand-approved CTA. Off by default; when
//     `enabled` and a label are present, one Cerulean pill links to `href`.
// A 2 Column Section with neither set renders exactly like the pre-Brief-93 intro.

/** Default image side for the 2 Column Section — the intro's historical layout. */
export const TWO_COLUMN_DEFAULT_POSITION: BlockPosition = 'right';

/** Read the image-side position off a 2 Column Section instance's `data`. */
export function readTwoColumnPosition(data: Record<string, unknown> | undefined): BlockPosition {
  const style = data?.style as { position?: unknown } | undefined;
  const p = style?.position;
  return p === 'left' || p === 'right' ? p : TWO_COLUMN_DEFAULT_POSITION;
}

/** The optional CTA button config carried by a 2 Column Section instance. */
export interface TwoColumnButtonData {
  enabled?: boolean;
  label?: string;
  href?: string;
}

/**
 * Resolve a 2 Column Section instance's button to concrete render values, or null
 * when the button is off or has no label (→ nothing renders, matching the intro's
 * historical no-button look). Used by both the public render and the admin preview.
 */
export function readTwoColumnButton(
  data: Record<string, unknown> | undefined
): { label: string; href: string } | null {
  const b = data?.button as TwoColumnButtonData | undefined;
  if (!b || !b.enabled) return null;
  const label = typeof b.label === 'string' ? b.label.trim() : '';
  if (!label) return null;
  const href = typeof b.href === 'string' ? b.href : '';
  return { label, href };
}

/** Generate a stable, unique id for a new block instance (client + server safe). */
export function newBlockId(type: string): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  const rand =
    g.crypto && typeof g.crypto.randomUUID === 'function'
      ? g.crypto.randomUUID()
      : `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
  return `${type}-${rand}`;
}

/** Coerce an arbitrary value to a valid, complete, de-duplicated block ORDER (types only). */
export function normalizeBlockOrder(raw: unknown): SubServiceBlockType[] {
  // Brief 139: validate against the full TYPE set (so a stored opt-in type is
  // kept), but the "append what's missing" pass below still walks the narrower
  // default ORDER — an opt-in block is never added to a page that lacks it.
  const valid = new Set<string>(SUB_SERVICE_BLOCK_TYPES);
  const seen = new Set<string>();
  const out: SubServiceBlockType[] = [];
  if (Array.isArray(raw)) {
    for (const t of raw) {
      if (typeof t === 'string' && valid.has(t) && !seen.has(t)) {
        seen.add(t);
        out.push(t as SubServiceBlockType);
      }
    }
  }
  // Append any missing block types in canonical position so the set is complete.
  for (const t of SUB_SERVICE_BLOCK_ORDER) {
    if (!seen.has(t)) out.push(t);
  }
  return out;
}

/**
 * Coerce a stored/loaded `blocks` value into the Brief 90 instance shape.
 * Handles BOTH the new `{id,type,data}` shape and the legacy Brief 89
 * `{type,order,data}` shape (sorted by `order`, ids synthesised). Unknown types
 * and malformed entries are dropped; missing/duplicate ids are regenerated.
 * Duplicate instances of the same type are preserved (free builder).
 */
export function normalizeBlocks(raw: unknown): SubServiceBlockInstance[] {
  if (!Array.isArray(raw)) return [];
  // Brief 139: the full TYPE set, not the default ORDER — otherwise an inserted
  // opt-in block (servicesMenu) would be silently dropped on every load.
  const valid = new Set<string>(SUB_SERVICE_BLOCK_TYPES);
  const entries = raw.filter(
    (b): b is Record<string, unknown> => !!b && typeof b === 'object'
  );
  // Legacy shape carried an `order` number and no `id` — honour it for ordering.
  const legacy = entries.length > 0 && entries.every((b) => 'order' in b && !('id' in b));
  const ordered = legacy
    ? [...entries].sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0))
    : entries;

  const seenIds = new Set<string>();
  const out: SubServiceBlockInstance[] = [];
  for (const b of ordered) {
    const type = b.type;
    if (typeof type !== 'string' || !valid.has(type)) continue;
    let id = b.id;
    if (typeof id !== 'string' || id === '' || seenIds.has(id)) id = newBlockId(type);
    seenIds.add(id as string);
    const data = b.data && typeof b.data === 'object' ? (b.data as Record<string, unknown>) : {};
    out.push({ id: id as string, type: type as SubServiceBlockType, data });
  }
  return out;
}

/** Derive the ordered block-type list from a stored/loaded `blocks` array. */
export function blockOrderFromBlocks(blocks: unknown): SubServiceBlockType[] {
  const norm = normalizeBlocks(blocks);
  if (norm.length === 0) return [...SUB_SERVICE_BLOCK_ORDER];
  return norm.map((b) => b.type);
}

/** The per-type content payload carried by a block. Elfsight/auto blocks are empty. */
export function blockDataFor(type: SubServiceBlockType, f: SubServiceFields): Record<string, unknown> {
  const nn = (v: string | null | undefined) => (v == null || v === '' ? null : v);
  switch (type) {
    case 'hero':
      return { heroImage: nn(f.heroImage), heroHeading: nn(f.heroHeading), heroIntro: nn(f.heroIntro) };
    case 'intro':
      return { introHeading: nn(f.introHeading), introBody: nn(f.introBody), fImage: nn(f.fImage) };
    case 'listSection':
      return { problemsHeading: nn(f.problemsHeading), problemsItems: f.problemsItems ?? [] };
    case 'noDripClub':
      return { ndcTitle: nn(f.ndcTitle), ndcBody: nn(f.ndcBody) };
    case 'finalCta':
      return { ctaHeading: nn(f.ctaHeading), ctaBody: nn(f.ctaBody), f3Image: nn(f.f3Image) };
    case 'map':
    case 'googleReviews':
    case 'tiktokFeed':
    case 'relatedArticles':
    default:
      return {};
  }
}

/**
 * Assemble an ordered `blocks` INSTANCE array from a flat field set + a desired
 * order. One instance per type (legacy Brief 89 flat-field write path — the
 * editor now sends per-instance `blocks` directly and does not use this).
 * Rich-text fields must already be sanitized by the caller (server write path).
 */
export function assembleBlocks(f: SubServiceFields, order?: unknown): SubServiceBlockInstance[] {
  const types = normalizeBlockOrder(order);
  return types.map((type) => ({ id: newBlockId(type), type, data: blockDataFor(type, f) }));
}

/**
 * Reconstruct the flat "primary snapshot" field set from a `blocks` array — the
 * FIRST instance of each type wins (Brief 90: named columns are the rollback
 * snapshot of each page's primary/first instance and can no longer represent
 * duplicate instances). Also returns the full ordered type list.
 */
export function blocksToFields(blocks: unknown): { fields: SubServiceFields; order: SubServiceBlockType[] } {
  const norm = normalizeBlocks(blocks);
  const fields: SubServiceFields = { slug: '' };
  const seen = new Set<SubServiceBlockType>();
  for (const b of norm) {
    if (seen.has(b.type)) continue; // first instance = the primary snapshot
    seen.add(b.type);
    const d = b.data ?? {};
    switch (b.type) {
      case 'hero':
        fields.heroImage = (d.heroImage as string) ?? null;
        fields.heroHeading = (d.heroHeading as string) ?? null;
        fields.heroIntro = (d.heroIntro as string) ?? null;
        break;
      case 'intro':
        fields.introHeading = (d.introHeading as string) ?? null;
        fields.introBody = (d.introBody as string) ?? null;
        fields.fImage = (d.fImage as string) ?? null;
        break;
      case 'listSection':
        fields.problemsHeading = (d.problemsHeading as string) ?? null;
        fields.problemsItems = Array.isArray(d.problemsItems) ? (d.problemsItems as string[]) : [];
        break;
      case 'noDripClub':
        fields.ndcTitle = (d.ndcTitle as string) ?? null;
        fields.ndcBody = (d.ndcBody as string) ?? null;
        break;
      case 'finalCta':
        fields.ctaHeading = (d.ctaHeading as string) ?? null;
        fields.ctaBody = (d.ctaBody as string) ?? null;
        fields.f3Image = (d.f3Image as string) ?? null;
        break;
    }
  }
  return { fields, order: norm.map((b) => b.type) };
}

/**
 * Return a copy of `blocks` with every instance's rich-text data keys sanitized
 * via `sanitize` (the server passes the shared Brief 73 allow-list). Applied to
 * EVERY instance — a page may now carry more than one intro / No Drip Club block.
 */
export function sanitizeBlockInstances(
  blocks: SubServiceBlockInstance[],
  sanitize: (v: string | null | undefined) => string
): SubServiceBlockInstance[] {
  return blocks.map((b) => {
    const keys = RICH_TEXT_DATA_KEYS[b.type];
    if (!keys || keys.length === 0) return b;
    const data = { ...b.data };
    for (const key of keys) {
      if (typeof data[key] === 'string') data[key] = sanitize(data[key] as string);
    }
    return { ...b, data };
  });
}
