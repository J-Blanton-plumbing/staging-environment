/**
 * Brief 141 (Track B) — the No Drip Club page's template variant.
 *
 * `main_pages` has `content`, `page_type` and `version` but no template column:
 * main pages have no template concept. Rather than add one, the variant is a
 * plain string under `content.template_variant` for slug `no-drip-club`. Three
 * reasons, in order of importance:
 *
 *  1. **A variant switch is draftable.** Stored in `content`, the switch flows
 *     through the Brief 75 draft → preview → publish path like any other field,
 *     so an editor can stage the new template, look at it, and publish when
 *     ready. A column would sit outside the draft system and flip live the
 *     instant it was clicked.
 *  2. No schema change (Brief 141's additive-data-model rule).
 *  3. `sanitizeMainPageContent` only touches the keys registered as rich text
 *     for the slug (`hero_description`, `wait_body`), so this string passes
 *     through save/draft/preview/publish untouched — the same property Brief 121
 *     relied on for the nested `benefits_card` object.
 *
 * The two variants share NO content keys — `classic` owns `content.benefits_card`,
 * `comparison` owns `content.membership_comparison` — which is what makes
 * switching non-destructive by construction. There is deliberately no mapping,
 * archiving or restore step here, and this module must not grow one: the city-page
 * `template-switching.ts` machinery exists because city templates share fields.
 *
 * Client-safe (no imports) so the public page and the admin editor share it.
 */

export const NDC_TEMPLATE_VARIANTS = ['classic', 'comparison'] as const;
export type NdcTemplateVariant = (typeof NDC_TEMPLATE_VARIANTS)[number];

/** The `main_pages.content` key holding the variant. */
export const NDC_TEMPLATE_VARIANT_CONTENT_KEY = 'template_variant';

/**
 * The variant to render when the key is absent or unrecognised. `classic` on
 * purpose: any environment that has not run the Brief 141 seed keeps rendering
 * exactly today's page.
 */
export const NDC_DEFAULT_TEMPLATE_VARIANT: NdcTemplateVariant = 'classic';

/** Admin-facing labels for the Page Attributes → Template selector. */
export const NDC_TEMPLATE_VARIANT_LABELS: Record<NdcTemplateVariant, string> = {
  classic: 'No Drip Club — Classic',
  comparison: 'No Drip Club — Membership Comparison',
};

/** Coerce any stored value to a known variant, falling back to `classic`. */
export function normalizeNdcTemplateVariant(raw: unknown): NdcTemplateVariant {
  return raw === 'comparison' || raw === 'classic' ? raw : NDC_DEFAULT_TEMPLATE_VARIANT;
}
