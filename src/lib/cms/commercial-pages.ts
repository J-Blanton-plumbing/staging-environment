/**
 * Brief 143 (Track A) — which service pages count as COMMERCIAL.
 *
 * The No Drip Club is a residential membership ("RESIDENTIAL HOMES ONLY" on the
 * approved sell sheet), so its section must never render on a commercial page.
 *
 * This is deliberately a RULE over the data rather than a list of slugs. Brief
 * 142 only found NDC copy on `commercial-jetting` and `commercial-drain-service`
 * because those are the two commercial rows whose `ndc_title`/`ndc_body` happen
 * to be populated — a row-level fix would have left every other commercial page
 * free to pick the section up the moment an editor filled those fields in, and
 * would not cover commercial pages added later.
 *
 * Two clauses, and BOTH are needed:
 *
 *  1. `parent_slug === 'commercial'` — the category an editor assigns in
 *     `/admin/sub-service/[slug]`. This is the canonical field and the reason a
 *     newly-added commercial page inherits the rule for free. It covers the
 *     restaurant pages, which are commercial work but are not named `commercial-*`.
 *
 *  2. `slug` starts with `commercial-` — a safety net for pages filed under a
 *     RESIDENTIAL category. `commercial-water-heater` is exactly this case: it
 *     sits under `parent_slug = 'water-heater'`, so clause 1 alone would miss it.
 *     Brief 143 calls it out by name, and it is the page that proves the audit's
 *     blind spot was structural rather than a one-off.
 *
 * Pure and client-safe on purpose — no DB import — so the admin bundle can use
 * it without pulling a server-only module in.
 */

/** The `parent_slug` value that marks a sub-service page as commercial. */
export const COMMERCIAL_PARENT_SLUG = 'commercial';

/** Slug prefix that marks a page as commercial regardless of its category. */
export const COMMERCIAL_SLUG_PREFIX = 'commercial-';

/**
 * True when a service page is commercial and must therefore not render the
 * No Drip Club section. `parentSlug` may be absent (a draft preview, or a
 * static-content page) — the slug clause still applies.
 */
export function isCommercialServicePage(input: {
  slug: string | null | undefined;
  parentSlug?: string | null;
}): boolean {
  const slug = (input.slug ?? '').trim().toLowerCase();
  const parent = (input.parentSlug ?? '').trim().toLowerCase();
  return parent === COMMERCIAL_PARENT_SLUG || slug.startsWith(COMMERCIAL_SLUG_PREFIX);
}
