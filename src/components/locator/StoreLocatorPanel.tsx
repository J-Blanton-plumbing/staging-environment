'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Phone, Search } from 'lucide-react';
import { PhoneLink, PhoneNumber } from '@/components/PhoneLink';
import { cn } from '@/lib/utils';
import { formatOfficeAddress, type CmsOffice } from '@/lib/cms/offices';
import type { LocatorAllOfficesView, LocatorRegionView } from '@/lib/content/locator';

/**
 * Search + map state for the homepage store locator. Brief 171, Track D2.
 *
 * ─── The shape: ONE element, not two columns ───────────────────────────────
 * Everything below lives inside a single bordered, rounded, clipped card, and
 * the three panes share its edges rather than floating apart:
 *
 *     ┌──────────────────┬───────────────────────────────┐
 *     │ finder + status  │                               │
 *     ├──────────────────┤            map                │
 *     │ scrolling list  ▓│                               │
 *     └──────────────────┴───────────────────────────────┘
 *
 * The pieces are three siblings of one grid so they can be re-ordered by CSS
 * alone: desktop puts the finder and list in a left column with the map spanning
 * both rows; below 900px the same three flow finder -> map -> list in a single
 * column. Nothing is duplicated and nothing renders conditionally.
 *
 * ─── Why the list is absolutely positioned (this is the height mechanism) ──
 * The list must never make the card taller than the card — it is capped and gets
 * its own scrollbar. The card's desktop height is one explicit value (see the
 * note on the card itself); the list's grid cell holds an
 * absolutely-positioned scroller, and an absolutely-positioned child contributes
 * ZERO height, so the list can never inflate the card no matter how many offices
 * Marketing adds. The cell stretches to whatever is left after the finder, and
 * `inset-0` makes the scroller exactly that tall. No JS, no `ResizeObserver`, no
 * second height to keep in sync. Below 900px the absolute positioning is off and
 * the list flows at its natural height, which is what a phone wants.
 *
 * ─── Why every office still renders server-side ────────────────────────────
 * This holds its state — the query, the selected office slug, whether the live
 * embed has been activated, the lazily-loaded city index and whether the list is
 * scrolled to the bottom — so it has to be a client component. It is NOT a
 * client-rendered widget: its SSR output already contains every office name and
 * address as text. Two things make that true and must stay true: the query
 * starts EMPTY and an empty query filters nothing, and the list is one flat run
 * rather than anything tabbed or paged.
 *
 * ─── Brief 178: what search matches, and what the list says about itself ───
 * Two changes, both driven by the jump from 15 offices to 18.
 *
 * SEARCH NOW MATCHES THE OFFICES THEMSELVES — their `name`, `city` and `zip` —
 * ahead of the generated city index. That is the layer that does not depend on
 * the registry at all, so an office saved in /admin/global-settings is findable
 * by its own name the moment it exists, with no rebuild and no registry entry.
 * It is also what finally makes Skokie and Joliet findable: under the static map
 * they dispatch only their own town, and before this they could not be searched
 * for by name at all.
 *
 * THE LIST SAYS HOW LONG IT IS. Eighteen rows sit in a ~469px scroll box
 * (~1,500px of content), so six are visible and the eighteenth is at offsetTop
 * 1419 — Marketing reported a newly added office as missing from the site when
 * it was simply below the fold of a box with no visible bottom edge. Hence the
 * count header and the bottom fade.
 *
 * ⚠️ There are NO LINKS in a row any more. Review removed the "Get Directions"
 * and "View this location" pair, then removed the address's link out to Google
 * Maps as well — every part of a row now selects the office and centres the map
 * instead. So the NAP text is crawlable here but no link is: the homepage's
 * links to the `/{slug}` office pages come from `Footer.tsx`'s office directory,
 * which renders on every page of the site. Do not remove that directory without
 * putting a link back in this section.
 *
 * Verify with `grep` on the built HTML for `naperville` and `columbus`.
 *
 * ─── What this module may and may not import ───────────────────────────────
 * `@/lib/cms/offices` is fine: it is deliberately DB-free (no `pg`), which is
 * the whole reason `formatOfficeAddress` lives there rather than in
 * `global-settings.ts`.
 *
 * It must NEVER import `global-settings.ts` (module-scope `pg` — `fs`/`net`/`tls`
 * do not resolve in a client bundle and the build fails outright),
 * `CITY_REGISTRY` / `getOfficeKey` (assembled from every city copy file), or a
 * VALUE from `@/lib/content/locator` (which imports `locations-regions.ts`,
 * which imports the registry). Copy and regions arrive as plain serializable
 * props; the only import from `locator.ts` is a type, which the compiler erases.
 *
 * ─── The map loads with the section, by decision ───────────────────────────
 * This section used to show a static greyscale map and create the Google embed
 * only inside a click, to satisfy Brief 171's Hard rule 4. Marketing overrode
 * that on 2026-09-03 after the cost was measured: see the long note on the
 * `map` block below for the numbers and the reasoning. The embed is now rendered
 * directly, and `loading="lazy"` is what keeps it cheap — it is the entire basis
 * of the decision, so do not remove it.
 *
 * ─── No phone number per row ───────────────────────────────────────────────
 * Marketing's 2026-08-08 decision is one number sitewide so WhatConverts DNI can
 * swap it; a per-office number is a number that never gets attributed. There is
 * exactly ONE phone CTA in this section — in the no-results state — and it goes
 * through `PhoneLink`/`PhoneNumber` so React owns the swap. No "24/7" line in
 * the rows either; deliberately declined by Marketing for this section.
 */

/**
 * How close the map box has to get to the viewport before the embed is mounted.
 * Generous on purpose: the fetch starts before the section is on screen, so the
 * map is already there when the visitor arrives instead of blank-then-popping.
 */
const MAP_PRELOAD_PX = 600;

/**
 * How many pixels of unseen content below the fold still counts as "scrolled to
 * the bottom" (Brief 178, Track C2). Sub-pixel layout and the elastic overscroll
 * on trackpads both leave a pixel or two behind, and a fade that never quite
 * disappears looks like a rendering bug.
 */
const SCROLL_CUE_EPSILON_PX = 4;

/** The generated tuple: `[slug, name, officeSlug]`. See locator-index.generated.ts. */
type IndexRow = readonly [slug: string, name: string, office: string];

/**
 * One row of the list: an office, and the cities that matched onto it.
 *
 * `cities: null` means the OFFICE ITSELF matched — by its name, its town or its
 * ZIP — so the row renders no "…is served from our…" line. It is the answer; a
 * row reading "Tinley Park is served from our Tinley Park service center" is the
 * kind of thing that gets screenshotted.
 */
interface OfficeMatch {
  office: CmsOffice;
  cities: string[] | null;
}

/**
 * The copy bag, typed off the constant it comes from so a renamed key is a
 * compile error here. `typeof import(...)` is a type-only construct — it is
 * erased and adds nothing to the bundle.
 */
type LocatorCopy = typeof import('@/lib/content/locator').LOCATOR_COPY;

interface Props {
  /**
   * Every office, flat and already ordered by `orderLocatorOffices` (pinned
   * three, then A–Z). The list renders this run verbatim.
   */
  offices: CmsOffice[];
  /** Regions — they choose the static map, they do NOT section the list. */
  regions: LocatorRegionView[];
  /**
   * Brief 178 (Track B2) — `{ citySlug: officeSlug }` for the handful of cities
   * where the LIVE CMS answer differs from the generated index, computed by the
   * server component in `StoreLocator.tsx` (see its note).
   *
   * The index is generated in Node from the static `cityToOffice` map, so it
   * cannot know that an office added in /admin/global-settings now claims its
   * own town. This is applied to an index row's office slug right after the row
   * is read, and nowhere else — the index stays the fallback and this is the
   * correction on top of it.
   */
  officeOverrides: Record<string, string>;
  /** The embed's default view: every office, both regions. See `LOCATOR_ALL_OFFICES`. */
  allOffices: LocatorAllOfficesView;
  copy: LocatorCopy;
  phone: string;
  phoneHref: string;
}

/* ── Helpers ───────────────────────────────────────────────────────────────── */

/**
 * Fill `{token}` placeholders. Local rather than imported from `locator.ts` for
 * the bundle reason in this file's header. Unknown tokens are left alone so a
 * typo shows up on screen instead of silently rendering an empty string.
 */
function fillTokens(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in values ? String(values[key]) : whole
  );
}

/** Drops a trailing parenthetical so "Northbrook (Corporate)" reads right mid-sentence. */
function shortOfficeName(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*$/, '').trim() || name;
}

/** U+0300–U+036F, the combining diacritical marks NFD splits accents into. */
const COMBINING_MARKS = /[̀-ͯ]/g;

/**
 * Case- and diacritic-insensitive comparison key.
 *
 * `NFD` + stripping the combining range is what makes "Bourbonnais" findable by
 * typing an unaccented query, and it costs nothing on the ASCII names that make
 * up almost all of the registry.
 */
function normalize(s: string): string {
  return s.normalize('NFD').replace(COMBINING_MARKS, '').toLowerCase().trim();
}

/** "A", "A and B", "A, B and C", "A, B and C, and 94 more". */
function cityList(cities: string[], andMoreTemplate: string): string {
  const shown = cities.slice(0, 3);
  const extra = cities.length - shown.length;
  let list =
    shown.length === 1
      ? shown[0]
      : shown.length === 2
        ? `${shown[0]} and ${shown[1]}`
        : `${shown[0]}, ${shown[1]} and ${shown[2]}`;
  if (extra > 0) list += `, ${fillTokens(andMoreTemplate, { count: extra })}`;
  return list;
}

/* ── Component ─────────────────────────────────────────────────────────────── */

export default function StoreLocatorPanel({
  offices,
  regions,
  officeOverrides,
  allOffices,
  copy,
  phone,
  phoneHref,
}: Props) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  /**
   * Whether the map box has come close enough to the viewport to be worth
   * loading. Starts false, flips once, never flips back — see the note on the
   * `map` block for why `loading="lazy"` cannot do this job.
   */
  const [mapVisible, setMapVisible] = useState(false);
  const mapBoxRef = useRef<HTMLDivElement | null>(null);
  /**
   * Brief 178 (Track C2). Whether there is still list below the fold — drives the
   * bottom fade. Starts FALSE so the server-rendered HTML carries no cue and
   * nothing flashes on a page that does not need one; the effect below turns it
   * on after mount if the list actually overflows.
   */
  const listScrollRef = useRef<HTMLDivElement | null>(null);
  const [showScrollCue, setShowScrollCue] = useState(false);
  const [index, setIndex] = useState<readonly IndexRow[] | null>(null);
  const [indexLoading, setIndexLoading] = useState(false);
  /** Memoized so focus + N keystrokes still produce exactly one dynamic import. */
  const indexPromise = useRef<Promise<void> | null>(null);

  /**
   * Mount the map once its box is within `MAP_PRELOAD_PX` of the viewport.
   *
   * TWO mechanisms, deliberately, because the failure modes are asymmetric: a
   * map that loads a little early costs bytes, a map that never loads is a
   * broken feature.
   *
   *   - IntersectionObserver is the primary path — cheap, no scroll handler.
   *   - A passive `scroll`/`resize` rect check is the fallback. It exists because
   *     IO is tied to the rendering lifecycle and does not fire at all in a
   *     throttled or occluded page: verified in this repo's own preview harness,
   *     where `document.visibilityState === 'hidden'` and IO would not fire even
   *     on `document.body`. In that state nobody is looking, so "loads when the
   *     page becomes visible and is scrolled" is the correct behaviour — but
   *     without the fallback it would have been "never loads".
   *
   * Both run the same `check()` and both are torn down the moment it succeeds,
   * so the map mounts exactly once and never unmounts. That last part matters:
   * remounting would flash the iframe instead of panning it when an office is
   * picked.
   */
  useEffect(() => {
    const el = mapBoxRef.current;
    if (!el) return;

    let done = false;
    const reveal = () => {
      if (done) return;
      done = true;
      setMapVisible(true);
      cleanup();
    };
    const check = () => {
      const r = el.getBoundingClientRect();
      const withinReach =
        r.top < window.innerHeight + MAP_PRELOAD_PX && r.bottom > -MAP_PRELOAD_PX;
      if (withinReach) reveal();
    };

    let io: IntersectionObserver | null = null;
    const cleanup = () => {
      io?.disconnect();
      window.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
    };

    if (typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) reveal();
        },
        { rootMargin: `${MAP_PRELOAD_PX}px 0px` }
      );
      io.observe(el);
    }
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    /* One synchronous check for the case where the section is already on screen
       at mount — a short viewport, or a deep link that restores scroll. */
    check();

    return cleanup;
  }, []);

  const ensureIndex = useCallback(() => {
    if (indexPromise.current) return;
    setIndexLoading(true);
    indexPromise.current = import('@/lib/content/locator-index.generated')
      .then((m) => {
        setIndex(m.LOCATOR_INDEX as readonly IndexRow[]);
      })
      .catch(() => {
        /* The full list is already on screen, so a failed chunk degrades to
           browsing rather than to a broken section. Reset the memo so a later
           keystroke can retry. */
        indexPromise.current = null;
      })
      .finally(() => setIndexLoading(false));
  }, []);

  /**
   * Picking an office selects it and pans the live map onto it.
   *
   * The office name used to be a link to `/{slug}`; Marketing's review replaced
   * that with this — the point of the click is "show me where that is". With the
   * embed now rendered directly there is nothing to activate, so this only has
   * to move the map, which it does by changing the iframe's `src`.
   */
  const pickOffice = useCallback((slug: string) => setSelected(slug), []);

  const normalizedQuery = normalize(query);
  /** Under 2 characters filters nothing — one letter matches half the registry. */
  const searching = normalizedQuery.length >= 2;

  /**
   * Matching, in four strict ranks (Brief 178, Track B1):
   *
   *   1. An office whose NAME or TOWN starts with the query
   *   2. An office whose name or town contains it
   *   3. An office whose ZIP starts with it
   *   4. City-index matches — prefix first, then substring, as before
   *
   * Ranks 1–3 read the live `offices` prop, so they need no index, no registry
   * entry and no rebuild: a brand-new office is findable by its own name the
   * moment Marketing saves it. Rank 4 is the old behaviour, with Track B2's
   * overrides applied to each row's office slug.
   *
   * Deduplicated by office slug, highest rank wins — an office already listed by
   * its own name is not listed again with a "served from" line under it. Cities
   * are still grouped onto their dispatching office, so several matched towns
   * collapse into ONE row that names why it matched.
   */
  const results = useMemo<OfficeMatch[] | null>(() => {
    if (!searching) return null;

    /* ── Ranks 1–3: the CMS offices themselves ─────────────────────────────
       The else-if chain is what enforces "highest rank wins" WITHIN the office
       pass: an office matched by name is never also collected by ZIP. */
    const nameStarts: CmsOffice[] = [];
    const nameContains: CmsOffice[] = [];
    const zipStarts: CmsOffice[] = [];
    for (const office of offices) {
      const name = normalize(office.name);
      const city = normalize(office.city);
      if (name.startsWith(normalizedQuery) || city.startsWith(normalizedQuery)) {
        nameStarts.push(office);
      } else if (name.includes(normalizedQuery) || city.includes(normalizedQuery)) {
        nameContains.push(office);
      } else if (normalize(office.zip).startsWith(normalizedQuery)) {
        zipStarts.push(office);
      }
    }

    const out: OfficeMatch[] = [...nameStarts, ...nameContains, ...zipStarts].map((office) => ({
      office,
      cities: null,
    }));
    const alreadyListed = new Set(out.map((m) => m.office.slug));

    /* ── Rank 4: the generated city index ─────────────────────────────────── */
    if (index) {
      const prefix: IndexRow[] = [];
      const contains: IndexRow[] = [];
      for (const row of index) {
        const name = normalize(row[1]);
        if (name.startsWith(normalizedQuery)) prefix.push(row);
        else if (name.includes(normalizedQuery)) contains.push(row);
      }

      const byOffice = new Map<string, string[]>();
      for (const row of [...prefix, ...contains]) {
        /* Track B2: the index row carries the STATIC answer; the override is
           the live one. Applied here, at the point of reading, so everything
           downstream — grouping, the match line, the map — sees one answer. */
        const officeSlug = officeOverrides[row[0]] ?? row[2];
        const cities = byOffice.get(officeSlug);
        if (cities) cities.push(row[1]);
        else byOffice.set(officeSlug, [row[1]]);
      }

      /* Array.from rather than [...map.entries()] — tsconfig's target predates
         downlevelIteration, so spreading a Map iterator is a compile error here.
         Insertion order is preserved either way, which is what keeps the
         prefix-first ranking intact. */
      for (const [officeSlug, cities] of Array.from(byOffice.entries())) {
        if (alreadyListed.has(officeSlug)) continue;
        const office = offices.find((o) => o.slug === officeSlug);
        if (office) out.push({ office, cities });
      }
    }

    return out;
  }, [searching, index, normalizedQuery, offices, officeOverrides]);

  /**
   * A genuine no-match, as opposed to "the city index has not arrived yet".
   * Ranks 1–3 can answer without the index, so an empty result set before it
   * loads is not yet an answer — showing the phone CTA there would be telling a
   * visitor we do not serve their town while we are still looking it up.
   */
  const noMatches = results !== null && results.length === 0 && index !== null;
  /** What the list is showing: the filtered rows, or every office. */
  const visible: OfficeMatch[] =
    results && results.length > 0 ? results : offices.map((office) => ({ office, cities: null }));

  /** The status line under the finder. Always present, so nothing shifts. */
  const statusMessage = (() => {
    if (!searching) return '';
    const count = results ? results.length : 0;
    if (count > 0) {
      return fillTokens(
        count === 1 ? copy.resultsCountTemplateSingular : copy.resultsCountTemplate,
        { count, query: query.trim() }
      );
    }
    if (!index) return indexLoading ? copy.searchLoading : '';
    return fillTokens(copy.noResultsTemplate, { query: query.trim() });
  })();

  /**
   * Brief 178 (Track C2) — the bottom fade, on only while there is more list.
   *
   * It is a plain read of the scroller's own metrics: no library, no
   * `ResizeObserver`, and nothing that touches `scrollTop`, so it cannot fight
   * the visitor for control of the scroll. Below 900px the list is static and
   * `scrollHeight === clientHeight`, so this settles on `false` there — and the
   * element is `hidden` at that width anyway, belt and braces.
   *
   * Re-runs when the rendered row count changes, because filtering a list of 18
   * down to one row removes the overflow that the cue is advertising.
   */
  useEffect(() => {
    const el = listScrollRef.current;
    if (!el) return;

    const sync = () => {
      setShowScrollCue(el.scrollHeight - el.scrollTop - el.clientHeight > SCROLL_CUE_EPSILON_PX);
    };
    sync();
    el.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    return () => {
      el.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
    };
  }, [visible.length, noMatches]);

  const regionOf = useCallback(
    (slug: string) => regions.find((r) => r.officeSlugs.includes(slug)),
    [regions]
  );

  const selectedOffice = selected ? offices.find((o) => o.slug === selected) : undefined;

  /**
   * The single region every current search result belongs to, or `undefined` if
   * the results span both (or there is no search). Searching "Dublin" narrows to
   * Central Ohio; searching "Chicago" does not narrow at all.
   */
  const narrowedRegion = (() => {
    if (!results || results.length === 0) return undefined;
    const keys = new Set(results.map((r) => regionOf(r.office.slug)?.key));
    return keys.size === 1 ? regions.find((r) => keys.has(r.key)) : undefined;
  })();

  /**
   * What the EMBED shows, in three tiers.
   *
   *   1. An office is picked -> its street address at z15. One pin, the right one.
   *   2. A search narrowed to one region -> that region, at the zoom its static
   *      image was rendered at, so activating the map does not jump scale.
   *   3. Nothing picked, nothing narrowed -> ALL OF OUR LOCATIONS, pinned by
   *      Google's own search over our Business Profile name, zoomed out to hold
   *      Chicagoland and Central Ohio in one frame. See `LOCATOR_ALL_OFFICES` in
   *      `locator.ts` for why a keyword search is the only keyless way to get
   *      more than one pin, and for the measurement behind the centre and zoom.
   *
   * Tier 3 is the state behind the "Find an office" button, which is the whole
   * point of that button: show me everywhere you are.
   */
  const embed = selectedOffice
    ? { query: formatOfficeAddress(selectedOffice), center: undefined, zoom: 15, label: selectedOffice.name }
    : narrowedRegion
      ? { query: narrowedRegion.mapQuery, center: undefined, zoom: narrowedRegion.mapZoom, label: narrowedRegion.label }
      : { query: allOffices.mapQuery, center: allOffices.mapCenter, zoom: allOffices.mapZoom, label: allOffices.label };

  /* Same keyless URL shape LocationsMap.tsx uses — no API key, no SDK, nothing
     in .env.local. `ll` is only sent when a tier supplies one; the classic embed
     honours it (verified: the 301 resolves to a `pb` payload carrying the centre
     and zoom back verbatim), and omitting it lets Google centre on the query. */
  const mapSrc =
    `https://maps.google.com/maps?hl=en&q=${encodeURIComponent(embed.query)}` +
    (embed.center ? `&ll=${encodeURIComponent(embed.center)}` : '') +
    `&z=${embed.zoom}&ie=UTF8&iwloc=B&output=embed`;
  const mapLabel = embed.label;

  /* ── Panes ───────────────────────────────────────────────────────────────── */

  const finder = (
    <div className="order-1 border-b border-navy-100 p-5 min-[900px]:order-none min-[900px]:col-start-1 min-[900px]:col-span-5 min-[900px]:row-start-1 min-[900px]:border-r">
      <label htmlFor="locator-search" className="sr-only">
        {copy.searchLabel}
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-navy-500"
          strokeWidth={2.5}
          aria-hidden="true"
        />
        <input
          id="locator-search"
          type="search"
          value={query}
          placeholder={copy.searchPlaceholder}
          autoComplete="off"
          onFocus={ensureIndex}
          onChange={(e) => {
            ensureIndex();
            setQuery(e.target.value);
          }}
          className="h-[48px] w-full rounded-[10px] border border-navy-100 bg-white pl-11 pr-4 font-sans text-[16px] text-navy-800 placeholder:text-navy-500 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/25"
        />
      </div>
      {/* The status line, for screen readers and for everybody. Rendered even
          when empty — a live region has to be in the DOM before it can announce
          anything — but it carries its top margin ONLY when it has something to
          say, so an idle finder has no dead gap under it. */}
      <p
        aria-live="polite"
        className={cn(
          'font-sans text-[15px] leading-[22px] text-navy-500',
          statusMessage && 'mt-3'
        )}
      >
        {statusMessage}
      </p>
    </div>
  );

  const map = (
    <div className="order-2 min-[900px]:order-none min-[900px]:col-start-6 min-[900px]:col-span-7 min-[900px]:row-start-1 min-[900px]:row-span-2">
      {/* 4:3 on mobile; on desktop it FILLS the card's height instead, so the
          map reaches all four edges of its half. Either way the box's height is
          known before the iframe mounts, so CLS stays at zero. */}
      <div
        ref={mapBoxRef}
        className="relative aspect-[4/3] w-full overflow-hidden bg-cream-200 min-[900px]:aspect-auto min-[900px]:h-full"
      >
        {/*
         * The live Google embed — no click-to-load, no static placeholder — but
         * mounted only once the section is ABOUT TO BE SEEN.
         *
         * ⚠️ `loading="lazy"` DOES NOT WORK HERE. That is measured, not assumed.
         * With the attribute set and this box 6,387px below the fold, the embed's
         * request still started at 229ms — before DOMContentLoaded (249ms) and
         * long before the load event (993ms). Chromium decides an iframe's
         * lazy-loading eligibility very early, before this card's CSS-driven
         * height has positioned it, so it concludes the frame is in-viewport and
         * fetches it eagerly. The attribute is kept below because it costs
         * nothing and helps where it is honoured, but it CANNOT be relied on.
         *
         * So the deferral is done explicitly, with an IntersectionObserver. That
         * matters because the embed is not cheap: 9 requests, 272 KB over the
         * wire, 269 KB of it JavaScript parsing to 990 KB, plus two extra
         * third-party hosts. On the critical path that is a real cost to every
         * visitor and it shows up in Lighthouse's TBT; moved behind the observer
         * it is paid only by people who actually scroll to the last band of the
         * page, at which point the map is what they are looking at.
         *
         * The deferral itself lives in the effect above — see its note for why
         * two mechanisms are needed and why this must never unmount.
         *
         * Marketing's 2026-09-03 decision was to drop the click-to-load button
         * and show the real map. This keeps that decision AND the saving the
         * button was there for.
         */}
        {mapVisible && (
          <iframe
            className="absolute inset-0 h-full w-full"
            src={mapSrc}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title={fillTokens(copy.mapIframeTitleTemplate, { label: mapLabel })}
          />
        )}
      </div>
    </div>
  );

  const row = (office: CmsOffice, matchLine: string | null) => {
    const isSelected = selected === office.slug;
    return (
      <li
        key={office.slug}
        aria-current={isSelected ? 'true' : undefined}
        /* The WHOLE row is one target — name, address and match line all pick
           the office. There are no links left inside a row to protect from this
           handler, so it needs no `closest('a')` guard; if anything link-shaped
           is ever added back in here, that guard has to come back with it.

           The row is still not a `<button>` WRAPPER: a button may only contain
           phrasing content, so it cannot hold the `<h3>` and `<p>` this row
           needs. The office-name button below is the accessible control and the
           row's single tab stop; this handler is the mouse convenience. */
        onClick={() => pickOffice(office.slug)}
        className={cn(
          'cursor-pointer border-l-[3px] px-5 py-4 transition-colors',
          isSelected
            ? 'border-accent-500 bg-cream-50'
            : 'border-transparent hover:bg-cream-50/70'
        )}
      >
        {/* h3 under the section's h2. A `<button>`, not a link: Marketing's
            review is that this click belongs to the map, not to navigation. */}
        <h3 className="font-display text-[18px] font-bold leading-tight text-navy-800">
          <button
            type="button"
            onClick={() => pickOffice(office.slug)}
            aria-label={fillTokens(copy.selectAriaTemplate, { office: office.name })}
            className="text-left underline-offset-4 hover:underline focus-visible:underline"
          >
            {office.name}
          </button>
        </h3>

        {/* Plain text, NOT a link. It was briefly an `<a>` to the office's
            Google Business Profile; review took that out — clicking the address
            should do what clicking the name does, and neither should send the
            visitor off-site. It is inside the row's click target, so it still
            selects the office; it just no longer advertises itself as a link. */}
        <p className="mt-1 font-sans text-[15px] leading-[24px] text-navy-500">
          {formatOfficeAddress(office)}
        </p>

        {matchLine && (
          <p className="mt-2 font-sans text-[15px] leading-[24px] text-navy-800">{matchLine}</p>
        )}
      </li>
    );
  };

  const list = (
    <div className="order-3 min-[900px]:order-none min-[900px]:col-start-1 min-[900px]:col-span-5 min-[900px]:row-start-2 min-[900px]:relative min-[900px]:min-h-0 min-[900px]:border-r min-[900px]:border-navy-100">
      {/* Absolute on desktop ONLY — that is what caps the list at the map's
          height and hands it its own scrollbar (see the file header). Static
          below 900px, where it flows at full height instead. */}
      <div
        ref={listScrollRef}
        className="locator-scroll min-[900px]:absolute min-[900px]:inset-0 min-[900px]:overflow-y-auto"
      >
        {/* Brief 178 (C2): how many locations there are, from `offices.length`
            and never typed. `sticky` rather than a header outside the scroller
            because on desktop the scroller is `absolute inset-0` — a sibling
            above it would need a second height kept in sync with this one, and
            the whole point of the absolute positioning (see the file header) is
            that there is only ever one.

            It reports the TOTAL and does not change while searching; the
            `aria-live` line under the search box is what reports matches. */}
        <p className="sticky top-0 z-[1] border-b border-navy-100 bg-white px-5 py-[10px] font-display text-[13px] font-bold uppercase tracking-[0.08em] text-navy-500">
          {fillTokens(copy.officeCountTemplate, { count: offices.length })}
        </p>
        {noMatches && (
          /* Never an empty panel. The full list stays below this, and this is
             the section's single phone CTA. */
          <div className="border-b border-navy-100 bg-cream-100 px-5 py-4">
            <p className="font-sans text-[15px] leading-[24px] text-navy-800">
              {copy.noResultsHelp}
            </p>
            <PhoneLink
              href={phoneHref}
              display={phone}
              className="mt-2 inline-flex items-center gap-2 font-display text-[18px] font-bold tracking-tight text-brand-600 hover:underline"
            >
              <Phone className="h-[18px] w-[18px]" strokeWidth={2.5} aria-hidden="true" />
              <PhoneNumber value={phone} />
            </PhoneLink>
          </div>
        )}
        {/* ONE flat run of offices — no region sub-headings. `RegionChooser` one
            scroll above already does the two-region job, with photos and city
            counts; repeating that taxonomy here bought no navigation. */}
        <ul className="divide-y divide-navy-100">
          {visible.map(({ office, cities }) =>
            row(
              office,
              cities && cities.length
                ? fillTokens(
                    cities.length === 1 ? copy.matchTemplate : copy.matchTemplatePlural,
                    {
                      cities: cityList(cities, copy.matchAndMore),
                      office: shortOfficeName(office.name),
                    }
                  )
                : null
            )
          )}
        </ul>
      </div>

      {/* Brief 178 (C2) — the scroll affordance.
          A soft fade over the last 48px of the scroller, faded out once the
          bottom is reached or when the list is short enough not to scroll.

          `pointer-events-none` is load-bearing: the fade sits over the last row,
          and a row is the section's click target. `right-2` clears the 8px
          scrollbar (`.locator-scroll` in globals.css) so the thumb is not
          tinted. `hidden min-[900px]:block` — below 900px the list is static and
          flows at full height, so there is nothing to cue.

          It fades to WHITE, not cream, because the card it sits on is
          `bg-white`; a cream fade would read as a band rather than a fade.
          `to-white/0` rather than `to-transparent`, so the gradient interpolates
          through white instead of through transparent black. */}
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute bottom-0 left-0 right-2 hidden h-12 bg-gradient-to-t from-white via-white/80 to-white/0 transition-opacity duration-200 min-[900px]:block',
          showScrollCue ? 'opacity-100' : 'opacity-0'
        )}
      />
    </div>
  );

  return (
    <div className="mt-8">
      {/* The card. `overflow-hidden` + `rounded-lg` is what makes the three
          panes read as one element: the map is clipped to the card's right
          corners and the list's scrollbar sits inside the border rather than
          floating between two columns. `grid-rows-[auto_minmax(0,1fr)]` gives
          the finder its content height and hands everything left over to the
          list's row.

          `h-[560px]` is the ONE magic number in this section, and it is
          deliberately editorial — "how tall is the widget" — rather than
          derived. Letting the map's 4:3 box set the height instead was tried and
          is worse: at the 900px grid break the map is only ~348px tall, which
          left the list 225px, about two of fifteen rows. A fixed height gives
          the list ~437px (five rows) at every desktop width and lets the map
          fill its half. If it changes, it changes here and nowhere else. */}
      <div className="grid grid-cols-1 overflow-hidden rounded-lg border border-navy-100 bg-white shadow-soft min-[900px]:h-[560px] min-[900px]:grid-cols-12 min-[900px]:grid-rows-[auto_minmax(0,1fr)]">
        {finder}
        {map}
        {list}
      </div>
      {/* No credit line of our own any more. The static OpenStreetMap
          placeholder it existed for is gone, and the Google embed renders its
          own "Map data ©… Google" attribution inside the iframe, so a second
          one out here would be a duplicate. */}
    </div>
  );
}
