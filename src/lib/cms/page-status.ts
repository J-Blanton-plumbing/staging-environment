/**
 * Brief 159 — the ONE place that knows how a page's live/dark state is stored.
 *
 * ─── The model ─────────────────────────────────────────────────────────────
 * Status belongs to the VERSION, not to the page (marketing decision,
 * 2026-08-28). `page_drafts.is_published` is the single source of truth:
 *
 *   • exactly one version of a page may carry `is_published = TRUE`
 *     (enforced by a partial unique index, not by application code), and
 *   • a page is live IF AND ONLY IF one of its versions carries it.
 *
 * The public render path must not join `page_drafts` on every request, so each
 * live content row also carries a `status` column that MIRRORS that fact. That
 * column is DERIVED. It has exactly one writer — `setLiveStatusInTx` below,
 * called only from the transaction in `publishDraft` / `unpublishDraft` that
 * moves `is_published`. There is no API route, no admin control and no script
 * that sets it on its own, and adding one would re-create the exact class of
 * bug this brief exists to fix (two controls, one field). `status` is asserted
 * against `is_published` by `scripts/check-brief-159-status-invariant.ts`, which
 * REPORTS drift rather than silently repairing it.
 *
 * ─── page_type aliases ─────────────────────────────────────────────────────
 * `page_drafts.page_type` accumulated pre-unification aliases (`city-local`,
 * `financing`, …) that all resolve to the same live table. `canonicalPageType`
 * collapses them so "every other version of this page" means every version of
 * the PAGE, not every version that happens to share a legacy string.
 */
import type { PoolClient } from 'pg';
import pool from '@/lib/db';
import { SERVICE_CATEGORY_SLUGS } from '@/lib/services';
import { allRedirectPairs } from '@/lib/redirects/lookup';
import { allCityScopedRedirectPairs } from '@/lib/redirects/city-scoped';

export type PageStatus = 'published' | 'draft';

/** The canonical page types — one per live content table. */
export type CanonicalPageType =
  | 'city'
  | 'service'
  | 'sub-service'
  | 'city-service'
  | 'emergency-plumbing'
  | 'main'
  | 'article';

/**
 * Legacy `page_drafts.page_type` values → the canonical type. Kept in sync with
 * the writer map in `publishDraft`; a value not listed here is already canonical.
 */
const PAGE_TYPE_ALIASES: Readonly<Record<string, CanonicalPageType>> = {
  city: 'city',
  'city-coverage': 'city',
  'city-local': 'city',
  'local-office-v2': 'city',
  service: 'service',
  'sub-service': 'sub-service',
  'city-service': 'city-service',
  'emergency-plumbing': 'emergency-plumbing',
  main: 'main',
  financing: 'main',
  'customer-stories': 'main',
  'help-and-support': 'main',
  locations: 'main',
  article: 'article',
};

export function canonicalPageType(pageType: string): CanonicalPageType | null {
  return PAGE_TYPE_ALIASES[pageType] ?? null;
}

/** Every `page_drafts.page_type` string that resolves to the same canonical page. */
export function pageTypeAliasesFor(pageType: string): string[] {
  const canonical = canonicalPageType(pageType);
  if (!canonical) return [pageType];
  return Object.entries(PAGE_TYPE_ALIASES)
    .filter(([, c]) => c === canonical)
    .map(([alias]) => alias);
}

interface LiveTable {
  table: string;
  /** WHERE clause + params for one page's row. `emergency_plumbing_page` is a singleton. */
  where: (pageSlug: string) => { sql: string; params: unknown[] };
}

/**
 * The live content table behind each canonical page type. `sub_service_pages`
 * and `cms_articles` already carried a `status` column before this brief
 * (Brief 75 Track D / the articles editor) — those are REUSED, never duplicated.
 */
const LIVE_TABLES: Readonly<Record<CanonicalPageType, LiveTable>> = {
  city: { table: 'city_pages', where: (s) => ({ sql: 'city_slug = $1', params: [s] }) },
  service: { table: 'service_category_pages', where: (s) => ({ sql: 'slug = $1', params: [s] }) },
  'sub-service': { table: 'sub_service_pages', where: (s) => ({ sql: 'slug = $1', params: [s] }) },
  'city-service': {
    table: 'city_service_pages',
    where: (s) => {
      const [city, service] = s.split('/');
      return { sql: 'city_slug = $1 AND service_slug = $2', params: [city, service] };
    },
  },
  // Brief 145 (Track D): this singleton table held duplicate rows with
  // independent counters — always address it by the lowest id, exactly as the
  // reader and `getLivePageState` do.
  'emergency-plumbing': {
    table: 'emergency_plumbing_page',
    where: () => ({ sql: 'id = (SELECT id FROM emergency_plumbing_page ORDER BY id LIMIT 1)', params: [] }),
  },
  main: { table: 'main_pages', where: (s) => ({ sql: 'slug = $1', params: [s] }) },
  article: { table: 'cms_articles', where: (s) => ({ sql: 'slug = $1', params: [s] }) },
};

/** Every content table this brief's derived `status` column lives on. */
export const STATUS_CONTENT_TABLES: readonly string[] = Object.values(LIVE_TABLES).map((t) => t.table);

/* ── The public URL of a page ─────────────────────────────────────────────── */

/**
 * The path a (pageType, pageSlug) pair renders at. Used by the unpublish
 * guardrails, the confirmation copy, and the sitemap filters. Returns null for a
 * page type with no single public URL.
 */
export function publicPathFor(pageType: string, pageSlug: string): string | null {
  switch (canonicalPageType(pageType)) {
    case 'city':
      return `/${pageSlug}`;
    case 'service':
      return `/services/${pageSlug}`;
    case 'sub-service':
      return `/${pageSlug}`;
    case 'city-service':
      return `/${pageSlug}`; // already "city/service"
    case 'emergency-plumbing':
      return '/emergency-plumbing';
    case 'main':
      return pageSlug === 'home' ? '/' : `/${pageSlug}`;
    case 'article':
      return `/knowledge-hub/${pageSlug}`;
    default:
      return null;
  }
}

/* ── Reading the derived gate ─────────────────────────────────────────────── */

/**
 * The live row's derived status, or null when the page has no live row at all.
 *
 * NULL MEANS LIVE. A page type with no row (a city that renders purely from its
 * static content file, say) has nothing to unpublish and must never be 404'd by
 * this gate — every caller treats null as "live". Failing open here is
 * deliberate: the failure mode of failing closed is a silently dark page, which
 * is exactly what Track E's guardrails exist to prevent.
 */
export async function getLivePageStatus(pageType: string, pageSlug: string): Promise<PageStatus | null> {
  const canonical = canonicalPageType(pageType);
  if (!canonical) return null;
  const t = LIVE_TABLES[canonical];
  const { sql, params } = t.where(pageSlug);
  const res = await pool.query<{ status: string }>(
    `SELECT status FROM ${t.table} WHERE ${sql} LIMIT 1`,
    params
  );
  const raw = res.rows[0]?.status;
  if (raw === undefined || raw === null) return null;
  return raw === 'draft' ? 'draft' : 'published';
}

/**
 * The render gate (Brief 159, Track D). One indexed column read, no join to
 * `page_drafts`. A database error resolves to "live" for the same fail-open
 * reason as above — a DB blip must not take a ranked page off the index.
 */
export async function isPageLive(pageType: string, pageSlug: string): Promise<boolean> {
  try {
    return (await getLivePageStatus(pageType, pageSlug)) !== 'draft';
  } catch {
    return true;
  }
}

/** Every page currently held in `draft` — the deploy summary's dark-page report (E2.5). */
export async function listUnpublishedPages(): Promise<Array<{ pageType: CanonicalPageType; pageSlug: string; path: string | null }>> {
  const out: Array<{ pageType: CanonicalPageType; pageSlug: string; path: string | null }> = [];
  for (const [canonical, t] of Object.entries(LIVE_TABLES) as Array<[CanonicalPageType, LiveTable]>) {
    const slugExpr =
      canonical === 'city' ? 'city_slug'
      : canonical === 'city-service' ? `city_slug || '/' || service_slug`
      : canonical === 'emergency-plumbing' ? `'emergency-plumbing'`
      : 'slug';
    const res = await pool.query<{ slug: string }>(
      `SELECT ${slugExpr} AS slug FROM ${t.table} WHERE status = 'draft' ORDER BY 1`
    );
    for (const r of res.rows) {
      out.push({ pageType: canonical, pageSlug: r.slug, path: publicPathFor(canonical, r.slug) });
    }
  }
  return out;
}

/* ── The single writer ────────────────────────────────────────────────────── */

/**
 * THE ONLY WRITER of a content row's derived `status` column.
 *
 * Call it exclusively from the transaction that is already moving a version's
 * `is_published` flag (see `publishDraft` / `unpublishDraft` in
 * `src/lib/cms/drafts.ts`). Anything else — an API route, an admin control, a
 * seed script — would be a second door onto one field, which is the shape of the
 * bug Brief 159 was written to close. Do not add one.
 *
 * Deliberately does NOT bump the row's `version`: the optimistic-lock token
 * guards CONTENT edits, and a status flip changes no content. Bumping it would
 * 409 every editor holding the page open, for a change they can already see.
 */
export async function setLiveStatusInTx(
  client: PoolClient,
  pageType: string,
  pageSlug: string,
  status: PageStatus
): Promise<void> {
  const canonical = canonicalPageType(pageType);
  if (!canonical) return;
  const t = LIVE_TABLES[canonical];
  const { sql, params } = t.where(pageSlug);
  await client.query(
    `UPDATE ${t.table} SET status = $${params.length + 1} WHERE ${sql}`,
    [...params, status]
  );
}

/* ── Track E guardrails ───────────────────────────────────────────────────── */

/**
 * Paths that must never go dark, whatever the CMS says.
 *
 * `/` and the six `/services/{category}` hubs are the site's navigational spine
 * and the targets of `next.config.mjs`'s bare `/{category}` redirects — there is
 * no path on which unpublishing one is correct (Brief 159, E2 item 3).
 */
export const NEVER_UNPUBLISHABLE_PATHS: readonly string[] = Object.freeze([
  '/',
  ...SERVICE_CATEGORY_SLUGS.map((s) => `/services/${s}`),
]);

/**
 * Every path something 301s TO. Unpublishing one of these turns a working
 * redirect into a redirect-to-404 — the worst outcome available here, because
 * the origin URL is one Google already holds (Brief 159, E2 item 2).
 *
 * Built once at module scope from the same two sources middleware routes with,
 * so it can never drift from what actually redirects.
 */
let redirectTargetCache: Set<string> | null = null;
export function redirectTargets(): Set<string> {
  if (redirectTargetCache) return redirectTargetCache;
  const set = new Set<string>();
  for (const { to, status } of allRedirectPairs()) {
    if (status === 301) set.add(to);
  }
  for (const { to } of allCityScopedRedirectPairs()) set.add(to);
  redirectTargetCache = set;
  return set;
}

export interface UnpublishGuardResult {
  allowed: boolean;
  /** Editor-facing explanation when `allowed` is false. */
  reason?: string;
  path: string | null;
}

/**
 * Server-side enforcement of E2 items 2 and 3. The UI mirrors this, but the UI
 * is not the enforcement point — every refusal below also has to hold against a
 * hand-rolled POST.
 */
export function checkUnpublishAllowed(pageType: string, pageSlug: string): UnpublishGuardResult {
  const path = publicPathFor(pageType, pageSlug);
  if (!path) {
    return { allowed: false, path, reason: 'This page type has no public URL, so it cannot be unpublished.' };
  }
  if (NEVER_UNPUBLISHABLE_PATHS.includes(path)) {
    return {
      allowed: false,
      path,
      reason:
        `${path} is a core page (the home page or a top-level service category) and can never be unpublished. ` +
        'Edit its content instead.',
    };
  }
  const targets = redirectTargets();
  if (targets.has(path)) {
    const sources = [
      ...allRedirectPairs().filter((r) => r.to === path).map((r) => r.from),
      ...allCityScopedRedirectPairs().filter((r) => r.to === path).map((r) => r.from),
    ];
    const shown = sources.slice(0, 3).join(', ');
    const more = sources.length > 3 ? ` (and ${sources.length - 3} more)` : '';
    return {
      allowed: false,
      path,
      reason:
        `${path} is the destination of a live 301 redirect from ${shown}${more}. ` +
        'Unpublishing it would turn those redirects into redirects to a 404. ' +
        'Remove or repoint the redirect first.',
    };
  }
  return { allowed: true, path };
}
