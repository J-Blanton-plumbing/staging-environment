import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  buildLocalOfficeFallback,
  getArea,
  getCity,
  getCoverageContent,
  getGridCities,
  getOfficeKeyFor,
  gridRegionFor,
  getLocalOfficeContent,
  getOffice,
  staticCityMeta,
} from '@/lib/content/cities';
import { DEFAULT_ARTICLE_SLUGS, WATER_TESTING_FAQS } from '@/lib/content/cities/shared';
import { nearbyOhioAreas } from '@/lib/content/cities/ohio-nearby';
import { OHIO_ARTICLE_SLUGS } from '@/lib/content/cities/ohio-template-content';
import { getArticles } from '@/lib/articles';
import { getCityCmsContent } from '@/lib/cms/city-pages';
import { getCityPreview } from '@/lib/cms/preview';
import { isPageLive } from '@/lib/cms/page-status';
import { getGlobalSettingsCached } from '@/lib/cms/global-settings';
import { getCityV3Content } from '@/lib/content/cities/v3';
import CoverageAreaCity from '@/components/CoverageAreaCity';
import LocalOfficeCity from '@/components/LocalOfficeCity';
import LocalOfficeCityV2 from '@/components/LocalOfficeCityV2';
import LocalOfficeCityV3 from '@/components/LocalOfficeCityV3';
import PreviewBanner from '@/components/PreviewBanner';
import { getCityPageMeta } from '@/lib/cms/page-meta';

/**
 * Shared dynamic city builder (brief-10, routing DECIDED 2026-06-03).
 *
 * Brief 31/32: DB content merged when a city_pages row exists; falls back silently
 * to static content for the 140+ non-seeded cities.
 */

export const dynamic = 'force-dynamic';

/**
 * Brief 72 — build failure fix (audit CQ-2).
 *
 * Same fix as the sibling `[city]/[service]` route. This route is
 * `force-dynamic` and emits no static HTML at build, so enumerating every
 * registry slug in `generateStaticParams()` only added dead entries to the
 * build's page-data collection. Combined with the ~10,500-entry
 * `[city]/[service]` fan-out, that collection load intermittently killed a
 * build worker (surfacing as `PageNotFoundError`). We now prebuild nothing and
 * render on demand. Unknown slugs are still 404'd by the `notFound()` guard in
 * the component below — the exact complement of the old static param list — so
 * routing behavior is unchanged.
 */
export const dynamicParams = true;

export function generateStaticParams() {
  return [];
}

/**
 * Brief 149 (Track C): reads the `city_pages` SEO fields, falling back to the
 * static content file. Those fields were editable in the admin and read by
 * nothing — the same shadow Tracks A and B close for sub-service pages.
 *
 * Now async (it queries), which is fine: the route is already `force-dynamic`.
 * `getCityPageMeta` never throws — a DB blip yields the static values rather
 * than a 500 on a page whose body renders fine.
 */
export async function generateMetadata({ params }: { params: { city: string } }): Promise<Metadata> {
  const fallback = staticCityMeta(params.city);
  if (!fallback) return {};
  const meta = await getCityPageMeta(params.city, fallback);
  return { title: meta.title, description: meta.description };
}

export default async function CityPage({ params }: { params: { city: string } }) {
  const entry = getCity(params.city);
  if (!entry) notFound();

  const preview = await getCityPreview(params.city);
  const previewDraft = preview ? preview.meta : null;

  /*
   * Brief 159 (Track D / E1) — the render gate.
   *
   * A page is live if and only if one of its versions is Published; the live
   * row's `status` column mirrors that fact so this costs ONE indexed column
   * read, not a join to `page_drafts` on every request. `notFound()` rather than
   * a 200 with `noindex`: a 200 keeps the URL in the crawl set and contradicts
   * the sitemap removal that goes with it.
   *
   * The preview cookie wins — an editor previewing an unpublished page must
   * still see it (`getCityPreview` is session-gated, so this is not a public
   * bypass). `isPageLive` fails OPEN on a database error: a DB blip must not
   * take a ranked page off the index.
   */
  if (!preview && !(await isPageLive('city', params.city))) notFound();

  let db = preview ? preview.db : await getCityCmsContent(params.city).catch(() => null);

  // Brief 102 (Track C): fetched once up-front — every branch below needs
  // settings.offices to resolve the city's NAP data via getOffice().
  const settings = await getGlobalSettingsCached();

  // Brief 35: use template_type from DB when available; fall back to registry type
  const templateType: string = db?.templateType ?? entry.type;

  /*
   * Brief 181 (Track B2) — Local Office City V3.
   *
   * ABOVE the V2 branch deliberately: V3 is the newest template and the one a
   * template switch lands on, so it gets first refusal on the value. The order
   * is otherwise irrelevant — the strings are distinct.
   *
   * The page reads live data for the phone number and the office address ONLY,
   * both off `settings` (already fetched above). `getGlobalSettingsCached()`
   * falls back to `site.ts` and never throws, so this branch RENDERS WITH THE
   * DATABASE DOWN — `db` is not consulted at all. Keep it that way until Brief
   * 182, which is where CMS content arrives.
   *
   * ── THE FALLTHROUGH, AND WHY IT IS NOT A SECOND BUG ───────────────────────
   * No V3 content for the slug ⇒ fall through to the templates below rather than
   * 404. That is the ONLY reason a `local-office-v3` selection would not render
   * V3, and it cannot happen for a city the admin can actually select: Brief 179
   * fixed the opposite defect — a picker that silently served Coverage Area when
   * it said "Local Office City" — so `TemplateSwitcher` now offers V3 only for
   * slugs in `CITY_V3_SLUGS`. This branch exists so a `template_type` set by
   * hand, or left behind by a future registry change, degrades to a working page
   * instead of taking a ranked city page dark. It logs, so it is never silent.
   */
  if (templateType === 'local-office-v3') {
    const v3 = getCityV3Content(entry.slug);
    if (v3) {
      return (
        <>
          {previewDraft && (
            <PreviewBanner
              label={previewDraft.label}
              creatorName={previewDraft.creator_name}
              editorUrl={`/admin/city/${params.city}`}
              liveUrl={`/${params.city}`}
              draftId={previewDraft.id}
              pageType="city"
              pageSlug={params.city}
            />
          )}
          <LocalOfficeCityV3
            city={{ name: entry.name, slug: entry.slug }}
            content={v3}
            settings={settings}
          />
        </>
      );
    }
    console.warn(
      `[city] "${entry.slug}" has template_type "local-office-v3" but no entry in ` +
        `CITY_V3_CONTENT — falling through to its registry template. Add the city to ` +
        `src/lib/content/cities/v3/index.ts, or switch it back in /admin/city/${entry.slug}.`
    );
  }

  // Brief 67: Local Office City V2 — DB-driven 12-section template.
  if (templateType === 'local-office-v2') {
    if (!db) notFound();
    const coverage = getCoverageContent(entry.slug);
    const localOffice = getLocalOfficeContent(entry.slug);

    return (
      <>
        {previewDraft && (
          <PreviewBanner
            label={previewDraft.label}
            creatorName={previewDraft.creator_name}
            editorUrl={`/admin/city/${params.city}`}
            liveUrl={`/${params.city}`}
            draftId={previewDraft.id}
            pageType="city"
            pageSlug={params.city}
          />
        )}
        <LocalOfficeCityV2
          city={{
            name: entry.name,
            slug: entry.slug,
            heroImage: coverage?.heroImage,
            officeAddress: getOffice(entry.slug, settings.offices).address,
            reviewsElfsightId: localOffice?.reviews.elfsightId,
            whyFallback: localOffice ? { heading: localOffice.why.heading, body: localOffice.why.body } : null,
          }}
          db={db}
          settings={settings}
        />
      </>
    );
  }

  if (templateType === 'local-office') {
    /*
     * Brief 179 (Track A.4) — this branch ALWAYS returns.
     *
     * `buildLocalOfficeFallback` synthesises a complete, valid
     * `LocalOfficeContent` for any registry city, so there is nothing left to
     * fall through to: choosing "Local Office City" in the CMS now renders the
     * Local Office template, for every city, not just the one with a
     * hand-written copy file. (The Brief 70 fallthrough that used to sit here
     * silently served Coverage Area instead — the template picker lied.)
     */
    const content = getLocalOfficeContent(entry.slug) ?? buildLocalOfficeFallback(entry, settings);
    const merged = db ? {
      ...content,
      hero: {
        ...content.hero,
        // Brief 179 (Track A.2): the DB supplies both halves of the hero video —
        // `hero_video_url` is the MP4 (blank → no `src`, so CityVideoHero paints
        // the poster as a still) and `hero_image` is the poster. Neither falls
        // back to the other: they are separate slots with separate columns.
        video: {
          src:    db.heroVideoUrl || content.hero.video.src,
          poster: db.heroImage    || content.hero.video.poster,
        },
        headingLine1: db.heroHeadingLine1 || content.hero.headingLine1,
        headingLine2: db.heroHeadingLine2 ?? content.hero.headingLine2,
        intro:        db.heroDescription  || content.hero.intro,
      },
      why: {
        ...content.why,
        heading: db.contentHeading || content.why.heading,
        body:    db.contentBody    || content.why.body,
      },
      faqs: (db.faqs?.length ?? 0) > 0 ? db.faqs : content.faqs,
    } : content;

    return (
      <>
        {previewDraft && (
          <PreviewBanner
            label={previewDraft.label}
            creatorName={previewDraft.creator_name}
            editorUrl={`/admin/city/${params.city}`}
            liveUrl={`/${params.city}`}
            draftId={previewDraft.id}
            pageType="city"
            pageSlug={params.city}
          />
        )}
        <LocalOfficeCity city={merged} />
      </>
    );
  }

  // Coverage Area
  const content = getCoverageContent(entry.slug);
  /*
   * Columbus Integration Brief 02: an Ohio page gets the geo-neutral article set.
   * Two of the three shared defaults are Chicago-titled ("Why Chicagoland
   * Homeowners…", "…the Chicago Cold Snap") and render as such on an Ohio page.
   * A city's own `articleSlugs` still wins, so this is only the default.
   */
  const articles = getArticles(
    content?.articleSlugs ??
      (entry.state === 'Ohio' ? [...OHIO_ARTICLE_SLUGS] : DEFAULT_ARTICLE_SLUGS)
  );

  let mergedContent = content;
  if (db) {
    const base = content ?? { slug: params.city };
    mergedContent = {
      ...base,
      // hero image — non-empty DB URL wins over static file
      heroImage:         db.heroImage      || base.heroImage,
      // h1Override — DB line1 wins when non-empty
      h1Override:        db.heroHeadingLine1 || base.h1Override,
      // callout uses heroCallout column (separate from heroDescription)
      callout:           db.heroCallout    || base.callout,
      // "We've Got You Covered" heading — Brief 160 (Track A). NOT
      // db.contentHeading: that column is the local-office Why-heading and is
      // deliberately left alone (Brief 95, A.2). `covered_heading` is a new,
      // coverage-area-only column, so a template switch cannot repurpose it.
      // Empty falls through to the code literal in CoverageAreaCity.tsx.
      coveredHeading:    db.coveredHeading || base.coveredHeading,
      coveredBody:       db.contentBody    || base.coveredBody,
      // Section-1 image — Brief 160 (Track C). Its own column; it must never
      // fall back to heroImage, or the coupling this brief removed comes back.
      coveredImage:      db.coveredImage   || base.coveredImage,
      // "manplumber" block
      manplumberHeading: db.f2Heading      || base.manplumberHeading,
      manplumberBody:    db.f2Body         || base.manplumberBody,
    };
  }

  const mergedFaqs = db && db.faqs.length > 0 ? db.faqs : WATER_TESTING_FAQS;

  /*
   * Columbus Integration Brief 02, Track B.
   *
   * `gridRegion` scopes the §10 locations grid: an Illinois page keeps rendering
   * the Chicagoland list and its existing trust line, and an Ohio page renders
   * the Ohio list. Without this, registering 138 Ohio areas would have appended
   * 137 links to the bottom of every Illinois city page.
   */
  const gridRegion = gridRegionFor(entry.slug);
  const isOhio = gridRegion === 'ohio';
  /*
   * Brief 178 (Track A2): resolved through the CMS-aware `getOfficeKeyFor`, not
   * the static `getOfficeKey`. `getOffice()` below already resolves the ADDRESS
   * through the CMS, so leaving this on the static map would print one office's
   * NAME over another office's ADDRESS — worse than either error on its own.
   */
  const officeName = settings.offices.find(
    (o) => o.slug === getOfficeKeyFor(entry.slug, settings.offices)
  )?.name;

  return (
    <>
      {previewDraft && (
        <PreviewBanner
          label={previewDraft.label}
          creatorName={previewDraft.creator_name}
          editorUrl={`/admin/city/${params.city}`}
          liveUrl={`/${params.city}`}
          draftId={previewDraft.id}
          pageType="city"
          pageSlug={params.city}
        />
      )}
      <CoverageAreaCity
        name={entry.name}
        content={mergedContent}
        office={getOffice(entry.slug, settings.offices)}
        area={getArea(entry.slug)}
        articles={articles}
        faqs={mergedFaqs}
        cities={getGridCities(gridRegion)}
        state={entry.state}
        /*
         * Columbus Integration Brief 02, Track B.
         *
         * Every prop below is `undefined` / empty for an Illinois city, and each
         * block it feeds renders nothing in that case — so no Illinois page's
         * markup changes. `slug` is passed only for Ohio (see the prop's docblock:
         * passing it for Illinois would flip ~240 pages' OUR SERVICES menus).
         */
        county={entry.county}
        driveTimeMinutes={entry.driveTimeMinutes}
        population={entry.population}
        zips={entry.zips}
        nearby={nearbyOhioAreas(entry.slug)}
        slug={isOhio ? entry.slug : undefined}
        officeName={isOhio ? officeName : undefined}
        gridRegion={gridRegion}
      />
    </>
  );
}
