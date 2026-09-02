/**
 * Name-swapped template copy for the Ohio area pages — Columbus Integration
 * Brief 02.
 *
 * ─── What this is ──────────────────────────────────────────────────────────
 * The brief's shipping state: "Content is the current template with the city
 * name substituted — this brief creates pages, it does not write copy." Real
 * per-area copy is Brief 03+.
 *
 * Every one of the 137 Ohio areas registered by this brief gets this copy with
 * its own name and state substituted, so the prose blocks render instead of
 * hiding. `columbus` is excluded — it has its own file (`./columbus.ts`) and
 * keeps it.
 *
 * ─── Where the text comes from ─────────────────────────────────────────────
 * `columbus.ts`, which is itself Elgin's copy with the name swapped. Two of its
 * three blocks came across as-is, one had to be rewritten:
 *
 *  • `callout` — portable. Company-level claims only ("30 years of experience",
 *    "5-star reviews", "same-day service available"), all of which already ship
 *    on /columbus. Only the city name is substituted.
 *
 *  • `coveredBody` — portable VERBATIM. Read it: it is entirely generic plumbing
 *    service copy parameterised on city + state. There is not one Illinois fact
 *    in it. This is the bulk of the body copy on the page.
 *
 *  • `manplumberBody` — REWRITTEN, and this is the only place this file departs
 *    from a pure token swap. The template version cannot be swapped onto an Ohio
 *    area page, for two separate reasons:
 *
 *      1. It carries Elgin's facts. "the historic homes along Chicago Street",
 *         "the modern developments near Randall Road", "over 100,000 residents",
 *         "historic architecture … dating back to the 19th century", "charming
 *         Victorian houses". Those are real Elgin, Illinois landmarks and Elgin's
 *         population. Copying them onto 137 Ohio pages would put Illinois street
 *         names on Ohio pages and assert a population figure for each of 137
 *         places — squarely against the brief's "Do not invent local detail — no
 *         Ohio street names, landmarks, neighbourhood claims or statistics that
 *         were not supplied or sourced from public data".
 *
 *      2. It says "Our local office in {city}" and "our local office
 *         conveniently located in {city}". That is FALSE for all 137 areas —
 *         every one is `hasOffice: false` and dispatches from the Columbus
 *         office. Shipping it would put an untrue business claim on 137 pages.
 *
 *    So the replacement below keeps the block's job (a paragraph of prose about
 *    serving that city) while asserting nothing that is not true of every area:
 *    it names the city and state, states that service comes FROM the Central
 *    Ohio office rather than from an office in that city, and lists services the
 *    site already sells. No street, no landmark, no population, no architecture,
 *    no tenure-in-Ohio claim.
 *
 * ─── Rules held ────────────────────────────────────────────────────────────
 *  • No phone number appears in this prose. `SITE.phone` is rendered by the
 *    hero, the header and the footer; a literal here would be a second hardcoded
 *    number that WhatConverts DNI never swaps (see `site.ts`).
 *  • No "Chicagoland" and no "30+ years serving <region>" tenure claim — the
 *    brief bars carrying the Chicago trust statement onto Ohio pages.
 *  • `meta` is deliberately NOT set, so `staticCityMeta()`'s Ohio branch still
 *    produces the per-area title ("Plumber in {Area}, OH") and the county-bearing
 *    description from Track B. Setting it here would override both.
 *  • `heroImage` is not set — the generic fallback, matching `elgin.ts` and
 *    `columbus.ts`. There are no Ohio hero assets to point at.
 *  • Heading level is `<h3>`, matching the template. The page's `<h1>` is the
 *    city heading and the `<h2>` is "WE'VE GOT YOU COVERED", so `h3` keeps the
 *    outline correct — and it is what /columbus renders live today.
 *
 * ─── The CMS still wins ────────────────────────────────────────────────────
 * `[city]/page.tsx` merges a `city_pages` row over this (`db.contentBody ||
 * base.coveredBody`), so when Brief 03 writes real copy for an area it simply
 * overrides. Nothing here has to be deleted first.
 */
import type { CoverageAreaContent } from './types';
import { OHIO_STATE, getOhioArea } from './ohio-areas';

/**
 * `{city}` → the area name, `{state}` → "Ohio". Deliberately a tiny local
 * helper rather than a shared token system: this file is temporary scaffolding
 * that Brief 03+ replaces area by area.
 */
function fill(template: string, city: string): string {
  return template.split('{city}').join(city).split('{state}').join(OHIO_STATE);
}

/** Portable from the template — company-level claims only. */
const CALLOUT =
  'Highly-Rated Plumbers with Over 30 Years of Experience, 5-Star Reviews, and Same-Day Service Available. ' +
  'Serving {city} for All Your Plumbing Repair Needs.';

/** Verbatim from the template. Contains no Illinois fact — check before editing. */
const COVERED_BODY = `
    <h3>Professional Plumbing Repairs in {city}, {state}</h3>
    <p>Looking for reliable plumbing repairs in {city}, {state}? Look no further! Our team of certified plumbers is equipped with the skills and expertise to handle any plumbing issue, no matter how complex.</p>
    <p>Here's what sets us apart:</p>
    <ul>
      <li>Emergency plumbing services</li>
      <li>Same-day sewer repairs</li>
      <li>Certified, licensed, and insured plumbers in {state}</li>
      <li>Annual maintenance plans with our exclusive 'No-Drip Club'</li>
    </ul>
    <h3>Residential Plumbing Services in {city}, {state}</h3>
    <p>Your home's plumbing system works hard every day, and over time, issues like clogs, faulty fixtures, and broken pipes are inevitable. Trust J. Blanton Plumbing to provide dependable and professional plumbing services in {city}, {state}.</p>
    <h3>Emergency Plumbing Services</h3>
    <p>When a plumbing emergency strikes, you need prompt and reliable assistance. Our team is ready to respond quickly to your call, dispatching a plumber to address the issue without delay.</p>
    <h3>Basement Plumbing Services</h3>
    <p>Protect your basement from potential water damage with our expert plumbing services. From sump pump and ejector pump installation to basement waterproofing, we've got you covered.</p>
    <h3>Bathroom and Kitchen Plumbing Services</h3>
    <p>The bathroom and kitchen are two of the most heavily used areas in any home. Our skilled technicians can handle all your plumbing needs, from drains and fixtures to pipes and water-based appliances. Whether it's repairs, installations, or routine servicing, we've got you covered.</p>
  `;

/** Portable from the template. */
const MANPLUMBER_HEADING = 'Expert Plumbing Repairs in {city}: Your Local Solution';

/**
 * REWRITTEN — see the docblock. Asserts nothing that is not true of all 137
 * areas: no street, landmark, population, architecture or in-city office.
 */
const MANPLUMBER_BODY = `
    <p>Homes and businesses in {city}, {state} run into the same plumbing problems every year — drains that clog, supply lines that leak, water heaters that stop keeping up, and sewer lines that back up at the worst possible moment. J. Blanton Plumbing covers {city} from our Central Ohio office, and our plumbers arrive equipped to diagnose the problem and, wherever possible, fix it on the same visit.</p>
    <p>We handle general plumbing repairs, drain cleaning and rodding, sewer camera inspections, sewer repair, water heater repair and replacement, sump and ejector pumps, and fixture installation, for both residential and commercial properties in {city}. Emergency service is available 24 hours a day, and every job is carried out by a certified, licensed and insured plumber. Get in touch and we will tell you what is wrong, what it costs to put right, and when we can be there.</p>
  `;

/**
 * The related-articles set for an Ohio page.
 *
 * The shared `DEFAULT_ARTICLE_SLUGS` set that every coverage-area page uses is
 * two-thirds Chicago-specific — "Why **Chicagoland** Homeowners Should Consider
 * Replacement" and "Prepare Your Home Plumbing for the **Chicago** Cold Snap".
 * Those two cards render, with those titles, on an Ohio page. That is the same
 * defect as the Chicagoland trust statement the brief bars, just in the articles
 * block instead of the grid.
 *
 * These three are the evergreen, geo-neutral articles in the library. Only four
 * of the seven seeded articles are geo-neutral at all (the fourth, "Brown
 * Friday", is Thanksgiving-seasonal, so it is left out of an always-on page),
 * which is why this is a fixed set of three rather than a filter.
 *
 * When Ohio-specific articles exist, point this at them.
 */
export const OHIO_ARTICLE_SLUGS: readonly string[] = [
  'where-did-those-pink-stains-in-your-bathroom-come-from',
  '4-headaches-you-can-avoid-with-plumbing-maintenance',
  'pvc-vs-abs-pipes',
];

/**
 * The name-swapped template copy for one Ohio area, or `undefined` when the slug
 * is not an Ohio area registered by this brief.
 *
 * Returns `undefined` for `columbus` too — it has its own copy file and keeps
 * it, so this never overwrites hand-written content.
 */
export function getOhioTemplateContent(slug: string): CoverageAreaContent | undefined {
  if (slug === 'columbus') return undefined;
  const area = getOhioArea(slug);
  if (!area) return undefined;

  return {
    slug: area.slug,
    callout: fill(CALLOUT, area.name),
    coveredBody: fill(COVERED_BODY, area.name),
    manplumberHeading: fill(MANPLUMBER_HEADING, area.name),
    manplumberBody: fill(MANPLUMBER_BODY, area.name),
    // `meta` and `heroImage` intentionally omitted — see the docblock.
  };
}
