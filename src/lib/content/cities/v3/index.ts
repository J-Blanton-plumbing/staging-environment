/**
 * Local Office City V3 — the per-city content registry.
 *
 * Brief 181 (Track B1). Mirrors the shape of `LOCAL_OFFICE_CONTENT` /
 * `getLocalOfficeContent` in `src/lib/content/cities/index.ts`, deliberately:
 * the `[city]` builder already knows that pattern, and a second, different one
 * for the same job is how template dispatch drifts.
 *
 * ── WHY THE SLUG LIST IS EXPORTED ──────────────────────────────────────────
 * `CITY_V3_SLUGS` is what stops the admin template picker offering "Local Office
 * V3" for a city this module cannot supply content for. Brief 179 fixed the
 * opposite defect — a picker that silently lied, because choosing "Local Office
 * City" rendered Coverage Area for every city without a copy file. A picker must
 * not offer what it cannot deliver, so the option is gated on this list.
 *
 * Brief 182 removes the gate: once the CMS can supply V3 content for any city,
 * the registry stops being the constraint and this list stops being the answer
 * to "which cities can be V3?".
 *
 * ── THE FALLTHROUGH IN `[city]/page.tsx` ───────────────────────────────────
 * `getCityV3Content` returning `undefined` is the ONLY reason a `template_type`
 * of `local-office-v3` would not render V3. That branch exists so a mis-set
 * value degrades to a working page instead of a 404 — it is a safety net, not a
 * second dispatch rule, and with the picker gated it is unreachable through the
 * admin.
 */
import type { CityV3Content } from '@/types/city-v3';
import { HANOVER_PARK_V3 } from './hanover-park';

/** City slug → its V3 content. One entry today; Brief 182 makes this CMS-fed. */
export const CITY_V3_CONTENT: Record<string, CityV3Content> = {
  'hanover-park': HANOVER_PARK_V3,
};

/** Every city that can render V3 today. Drives the admin template picker's gate. */
export const CITY_V3_SLUGS: readonly string[] = Object.keys(CITY_V3_CONTENT);

/** V3 content for a city slug, or `undefined` if this module has none. */
export function getCityV3Content(slug: string): CityV3Content | undefined {
  return CITY_V3_CONTENT[slug];
}

/** True when the admin may offer "Local Office V3" for this slug. */
export function cityCanUseV3(slug: string): boolean {
  return slug in CITY_V3_CONTENT;
}

/**
 * Substitute a V3 content string's `{{phone}}` token.
 *
 * Deliberately NOT `renderCmsInline` / `renderCmsBlock`: V3 carries no CMS
 * content (that is Brief 182), and the phone number is the one live value the
 * template reads. Pure string replacement, no sanitizer, no DB, no HTML — the
 * result is rendered as a text node.
 */
export function withPhone(copy: string, phoneDisplay: string): string {
  return copy.split('{{phone}}').join(phoneDisplay);
}

export type { CityV3Content };
