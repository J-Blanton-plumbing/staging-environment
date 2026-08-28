/**
 * Brief 160 (Track C) — the ONE definition of the city-page fallback image.
 *
 * The marketing lead's rule, verbatim (2026-08-28): *"everywhere we dont have an
 * image and we need one we use that picture of pipes as backup, otherwise we use
 * what we inputed."*
 *
 * `hero_image.webp` is that picture — a photograph of red and blue rough-in
 * pipes (confirmed by opening `public/images/hero_image.webp`, Brief 160 §0.3.7).
 * It is the same asset Brief 126 wired behind the five city image slots when the
 * CMS held a dead `wp-content/uploads` URL.
 *
 * Before this file the path existed twice with two different spellings — the CDN
 * URL in `shared.ts` (`HERO_IMAGE_FALLBACK`, server-rendered) and the
 * same-origin `/images/hero_image.webp` in `CityPageImage.tsx` (the `onError`
 * swap). Both point at the same photo; they now come from here so a future
 * change lands in one place.
 *
 * Deliberate exception, left alone: `CityServiceHero` passes its own
 * service-specific default (`/images/img_hydro-jetting.webp`, Brief 126) as
 * `fallbackSrc`. That is a per-slot override of this default, not a second
 * definition of it.
 *
 * Pure string constants, no imports — safe from both server and client modules.
 */

/** CloudFront origin for the ported WordPress media library. */
export const CITY_IMAGE_CDN = 'https://d1rplazj5a80fb.cloudfront.net';

/**
 * The pipes photo. Every city image slot with nothing in its field renders this.
 *
 * The CDN spelling (not the same-origin `/images/hero_image.webp`, which also
 * exists in `public/`) is deliberate: it is what `resolveHeroImage()` has always
 * emitted server-side, so adopting it here leaves the rendered HTML of ~243
 * coverage-area heroes byte-identical.
 */
export const CITY_FALLBACK_IMAGE = `${CITY_IMAGE_CDN}/images/hero_image.webp`;
