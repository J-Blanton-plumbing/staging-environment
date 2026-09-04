import Image from 'next/image';
import Link from 'next/link';
import Breadcrumbs from '@/components/Breadcrumbs';
import { PhoneLink, PhoneNumber } from '@/components/PhoneLink';
import { SITE } from '@/lib/site';
import { type CityGroup, type RegionDef } from '@/lib/content/locations-regions';

/**
 * The shared body of `/locations/chicagoland` and `/locations/central-ohio` —
 * Columbus Integration Brief 03, Track B; redesigned as the region-page pilot
 * template by Brief 170.
 *
 * One component rather than two near-identical pages: the only real difference
 * between the two region pages is whether the city list is FLAT (Chicagoland —
 * 248 cities in the chunked column grid the hub used to render) or GROUPED
 * (Central Ohio — county groups plus a Columbus-neighborhoods group). Everything
 * else — breadcrumbs, the H1 band, the counts, the CTA — is the same page, and
 * duplicating it would guarantee the two drift.
 *
 * ─── Brief 170 shipped as a pilot; it now applies to BOTH regions ───────────
 * Brief 170 rebuilt this page on `/locations/central-ohio` only, behind opt-in
 * props, with `/locations/chicagoland` held byte-identical as the gate. Marketing
 * approved the result and asked for the same treatment on Chicagoland, so the
 * gate is RETIRED and the pieces that are not data-dependent are now
 * unconditional:
 *
 *   the photo hero band     was `heroImage`,       now both pages pass one
 *   the `.link-button` CTA  was `designSystemCta`, now the only CTA (prop gone)
 *   the `.l-cities-flow` grid                      now both branches
 *
 * Two props remain, and both are DATA-driven rather than cosmetic:
 *
 *   groups       Brief 03 — a labelled list per group. Central Ohio has county
 *                data to group by (`RegistryEntry.county`); every Illinois entry
 *                leaves it undefined, so Chicagoland renders one flat A→Z list.
 *   collapsible  Track D — group headings become native `<details>` toggles.
 *                Only meaningful alongside `groups`.
 *
 * If a third region is ever added, it inherits the hero + CTA + grid for free and
 * only has to answer the grouping question.
 */
export default function LocationsRegionView({
  region,
  groups,
  intro,
  collapsible,
}: {
  region: RegionDef;
  /** County / neighborhood groups. Omit for a single flat A→Z grid. */
  groups?: readonly CityGroup[];
  intro: string;
  /**
   * Brief 170, Track D. Render each group as a native `<details>` toggle,
   * expanded when `group.defaultOpen`. Only meaningful alongside `groups`.
   *
   * `<details>` and not a JS accordion because collapsed content still SHIPS in
   * the HTML — all 138 city links stay crawlable whether or not their county is
   * open. Do not "improve" this into conditional rendering.
   */
  collapsible?: boolean;
}) {
  const total = region.cities.length;

  const breadcrumbs = (
    <Breadcrumbs
      items={[
        { label: 'Home', href: '/' },
        { label: 'Locations', href: '/locations' },
        { label: region.label, href: region.href },
      ]}
    />
  );

  const head = (
    <div className="region-head w81">
      <p className="red-text">Service Area</p>
      <h1>Plumbing Services in {region.heading}</h1>
      <p className="region-head-meta">
        {total} cities &amp; neighborhoods · {region.counties} · {region.tenure}
      </p>
      <p className="region-head-intro">{intro}</p>
      <PhoneLink
        href={SITE.phoneHref}
        display={SITE.phone}
        className="link-button mt-[26px]"
      >
        Call <PhoneNumber value={SITE.phone} />
      </PhoneLink>
    </div>
  );

  return (
    /* `locations-page` reuses the hub's page CSS; `locations-region` adds the
       region-only rules. The fixed-navbar clearance lives on `.region-hero`, not
       on this wrapper, so the photo runs up UNDER the navbar instead of leaving
       70px of white above it (Brief 170, Track B6). */
    <div className="locations-page locations-region">
      {/* The photo band. Unconditional: `RegionDef.image` is REQUIRED — a region
          without a skyline is already a type error — and both region pages now
          carry the band, so there is no white-band variant left to fall back to. */}
      <div className="region-hero">
        {/* `fill` + `sizes="100vw"`: the band is full-bleed and both files are
            1000x500, so they upscale at desktop widths — the scrim
            (`.region-hero::before`) both carries the copy contrast and masks
            that. `priority` because this is above the fold.

            `alt=""`: the photo is DECORATIVE here, because the H1 two lines
            below already names the place. The same file carries real alt text on
            the homepage region card, where it is the only thing identifying the
            region — do NOT reuse `region.image.alt`. */}
        <Image
          src={region.image.src}
          alt=""
          fill
          priority
          sizes="100vw"
          style={{ objectFit: 'cover', objectPosition: 'center' }}
        />
        <div className="region-hero-inner">
          {/* Breadcrumbs go INSIDE the band. Leaving them above it just moves
              the white strip Marketing flagged rather than removing it. Their
              colours are scoped overrides in locations.css — Breadcrumbs.tsx
              is used sitewide and is not edited. */}
          {breadcrumbs}
          {head}
        </div>
      </div>

      <div className="ls-cream">
        <div className="w81">
          <div className="city-labels">
            <h2>Areas We Serve in {region.label}</h2>
            <p>
              Every city and neighborhood below has its own page. Don&apos;t see yours?
              Call us — the list is where we have pages, not the edge of where we drive.
            </p>
          </div>

          {groups ? (
            /* Grouped: one labelled block per county, plus the neighborhoods
               group. The groups come from `OHIO_GROUPS`, which is derived from
               `ohioCounties()` and asserted at module load to sum to the
               registered Ohio count — see locations-regions.ts. */
            <div className="region-groups">
              {groups.map((group) => (
                <CityGroupBlock key={group.label} group={group} collapsible={collapsible} />
              ))}
            </div>
          ) : (
            /* Ungrouped (Chicagoland): one flat A→Z list in the SAME
               `.l-cities-flow` grid the groups use, so the two region pages read
               identically. It used to be `cityColumns(region.cities, 5)` in
               `.l-cities` — five fixed columns of 50, chunked in JS and read
               top-to-bottom per column. That was the hub's old grid, kept for
               Brief 170's byte-identical gate; with the gate retired there is no
               reason for the sibling pages to lay their city lists out
               differently. */
            <div className="l-cities-flow">
              {region.cities.map((city) => (
                <div key={city.slug}>
                  <MapPin />
                  <Link href={`/${city.slug}`}>{city.name}</Link>
                </div>
              ))}
            </div>
          )}

          <p className="region-back">
            <Link href="/locations">← All J. Blanton Plumbing locations</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * One county / neighborhood group — Brief 170, Tracks D and E.
 *
 * Track D: with `collapsible`, the wrapper is a native `<details>` and the
 * heading moves into a `<summary>`. The `<h3>` stays INSIDE the summary rather
 * than being replaced by it — a summary is not a heading, and swapping it would
 * quietly drop 18 headings out of the document outline. `<summary>` is natively
 * focusable and natively announces its expanded state, so no `role`, `tabindex`
 * or `aria-expanded` is added; the caret is CSS on `[open]` and there is no JS.
 *
 * Track E: the city list is FLAT — no `cityColumns()` pre-chunking. Fixing the
 * column count at 5 made rows-per-column a function of group size, which is what
 * produced 5-column/1-row groups next to 4-column/3-row-plus-a-stub ones. A
 * single `auto-fill` grid (`.l-cities-flow`) gives every group the same
 * left-to-right wrapping list of equal-width cells, whatever its size.
 */
function CityGroupBlock({
  group,
  collapsible,
}: {
  group: CityGroup;
  collapsible?: boolean;
}) {
  const heading = (
    <h3>
      {group.label} <span className="region-group-count">({group.cities.length})</span>
    </h3>
  );

  const cities = (
    <div className="l-cities-flow">
      {group.cities.map((city) => (
        <div key={city.slug}>
          <MapPin />
          <Link href={`/${city.slug}`}>{city.name}</Link>
        </div>
      ))}
    </div>
  );

  if (!collapsible) {
    return (
      <section className="region-group">
        {heading}
        {cities}
      </section>
    );
  }

  return (
    <details className="region-group" open={group.defaultOpen}>
      <summary>{heading}</summary>
      {cities}
    </details>
  );
}

/** The same pin the hub's city grid uses — kept local so the grid markup matches. */
function MapPin() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M12 11.5A2.5 2.5 0 0 1 9.5 9A2.5 2.5 0 0 1 12 6.5A2.5 2.5 0 0 1 14.5 9a2.5 2.5 0 0 1-2.5 2.5M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7" />
    </svg>
  );
}
