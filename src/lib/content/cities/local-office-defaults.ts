/**
 * Brief 179 (Track A.1) — the shared Local Office fallback.
 *
 * ── THE DEFECT THIS CLOSES ──────────────────────────────────────────────────
 * `LOCAL_OFFICE_CONTENT` (index.ts) holds exactly ONE entry: Evanston. The
 * `[city]` builder used to test `if (content)` before rendering
 * `LocalOfficeCity`, so for every other city that guard failed and execution
 * FELL THROUGH to the Coverage Area render. The CMS template picker offered
 * "Local Office City", the write path saved `template_type = 'local-office'`
 * correctly, and the page then quietly served the wrong template with no warning
 * anywhere in the admin. The Brief 70 fallthrough was a deliberate safety net
 * when only Algonquin and Elgin could reach it; it became the bug the editor
 * sees.
 *
 * This module removes the reason for that guard: it synthesises a COMPLETE,
 * valid `LocalOfficeContent` for ANY registry city, so `getLocalOfficeContent()
 * ?? buildLocalOfficeFallback()` can never be undefined and the dispatch branch
 * can always return.
 *
 * ── WHAT IT IS NOT ──────────────────────────────────────────────────────────
 * It is NOT a backfill and it does NOT re-categorise anything. It is only
 * consulted when `templateType === 'local-office'`, which as of this brief is
 * exactly one city (`evanston`) — and Evanston has a hand-written file, so it
 * never reaches this code. Every value here is a default for a city an editor
 * chooses to move onto the template FROM HERE ON.
 *
 * ── WHERE THE VALUES COME FROM ──────────────────────────────────────────────
 * Nothing is invented. Every field is either derived from the registry entry, or
 * is an asset/helper that already ships and is already shared across every city:
 * the 24/7 badge Evanston uses, the shared pipes fallback image, the shared
 * `coverageServiceCategories()` menu, the per-city Elfsight reviews widget the
 * Coverage Area template already renders, the shared social widget, the shared
 * water-testing FAQ set, and the global phone number from Global Settings.
 *
 * The copy-bearing slots (`hero.intro`, `why.heading`, `why.body`) are
 * deliberately EMPTY: the CMS row's `hero_description`, `content_heading` and
 * `content_body` supply them, and those are the six fields the Local Office
 * editor already exposes. An empty default is visible to the editor; an invented
 * one would be indistinguishable from copy someone approved.
 */
import type { LocalOfficeContent, RegistryEntry } from './types';
import type { GlobalSettings } from '@/lib/cms/global-settings';
import {
  CITY_IMAGE_CDN,
  CITY_FALLBACK_IMAGE,
} from './fallback-image';
import {
  DEFAULT_ARTICLE_SLUGS,
  ELFSIGHT_SOCIAL_ID,
  WATER_TESTING_FAQS,
  coverageServiceCategories,
  getElfsightContentId,
  resolveCityImage,
} from './shared';
import { OHIO_ARTICLE_SLUGS } from './ohio-template-content';

/**
 * The shared 24/7 badge that overlaps the H1 in the video hero. Generic, not
 * city-specific — it is the same asset `evanston.ts` points at.
 */
const BADGE_247 = `${CITY_IMAGE_CDN}/images/home/247.webp`;

/**
 * "Turning Bad Calls to Good Calls" — the social headline, identical on every
 * city page today (see `evanston.ts` and `CoverageAreaCity`).
 */
const SOCIAL_HEADLINE = 'J Blanton Plumbing - Turning Bad Calls to Good Calls';

/**
 * Build a complete `LocalOfficeContent` for a registry city that has no
 * hand-written copy file.
 *
 * Pure function of its two arguments — `settings` is passed in (rather than
 * fetched) because the caller already holds it and this must stay synchronous
 * and cache-free: the phone number is CMS-editable and changes between requests.
 *
 * @param entry    the city's registry row — the only per-city input.
 * @param settings live Global Settings, for the canonical phone `tel:` href.
 */
export function buildLocalOfficeFallback(
  entry: RegistryEntry,
  settings: GlobalSettings,
): LocalOfficeContent {
  const upper = entry.name.toUpperCase();

  return {
    slug: entry.slug,
    name: entry.name,

    hero: {
      /*
       * No `src` — Brief 179 (Track A.2). `CityVideoHero` renders the `<video>`
       * with the poster and no source, so the hero shows a still at exactly the
       * same geometry. The CMS field `hero_video_url` fills `src` when Marketing
       * has a video for the city, and `hero_image` overrides the poster; both are
       * merged in `[city]/page.tsx`, not here.
       */
      video: { poster: CITY_FALLBACK_IMAGE },
      badge: { src: BADGE_247, alt: '24/7' },
      headingLine1: `${upper} PLUMBING EXPERTS`,
      /*
       * "FOR OVER 30 YEARS" is live on /evanston today and is in the design
       * system's Content Bank as the company positioning, so it is an approved
       * claim — but auto-generating it as the default H1 line for every new
       * Local Office city is a COPY decision. Flagged for Marketing sign-off in
       * the Brief 179 report (Open Question 1); the CMS `hero_heading_line2`
       * field overrides it per city.
       */
      headingLine2: `PROUDLY SERVING ${upper} FOR OVER 30 YEARS`,
      /* Primary tagline (brand-rules.md), and the CMS-editable phone — NOT
         Evanston's hard-coded `tel:` literal. */
      ctaLabel: 'MAKE A GOOD CALL!',
      ctaHref: settings.phoneHref,
      /* The DB `hero_description` supplies this; empty renders an empty right
         column, which is acceptable and visible to the editor. */
      intro: '',
      /* Matches Evanston: the H1 link IS the CTA, so no second phone button. */
      contact: null,
    },

    why: {
      /* Both supplied by the DB (`content_heading` / `content_body`). */
      heading: '',
      body: '',
      image: { src: resolveCityImage(undefined), alt: entry.name },
    },

    /* Empty hides the band — see `LocalOfficeCity` §4. Evanston's is a Chicago
       skyline and there is no per-city equivalent to fall back to. */
    skylineImage: '',

    services: {
      heading: 'OUR SERVICES',
      /* The shared static menu, city-scoped to `/{city}/{service}` — the exact
         same links the Coverage Area template renders for this city. */
      categories: coverageServiceCategories(entry.slug),
    },

    /* The per-city content-reviews widget the Coverage Area template already
       uses for this slug, falling back to the shared default. */
    reviews: { elfsightId: getElfsightContentId(entry.slug) },

    social: { headline: SOCIAL_HEADLINE, elfsightId: ELFSIGHT_SOCIAL_ID },

    /*
     * Mirrors the Coverage Area branch in `[city]/page.tsx`: two of the three
     * shared defaults are Chicago-titled, so an Ohio page gets the geo-neutral
     * set instead (Columbus Integration Brief 02).
     */
    articles: {
      featuredSlugs:
        entry.state === 'Ohio' ? [...OHIO_ARTICLE_SLUGS] : [...DEFAULT_ARTICLE_SLUGS],
    },

    /* `LocalOfficeCity` gates the carousel on a non-empty array, so the OUR
       PARTNERS section simply does not render. Partner logos are per-city
       business relationships — there is no generic set. */
    partners: [],

    /* The shared global FAQ set, overridden by the row's `faqs` when it has any
       (merged in `[city]/page.tsx`). */
    faqs: WATER_TESTING_FAQS,

    /*
     * `generateMetadata` reads `getCityPageMeta(slug, staticCityMeta(slug))` and
     * never consumes this field, so it exists only to satisfy the type. Left
     * empty rather than duplicating `staticCityMeta`'s strings, which would be a
     * second copy of the title rule that could drift.
     */
    meta: { title: '', description: '' },
  };
}
