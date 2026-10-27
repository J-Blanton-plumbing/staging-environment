'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import Image from 'next/image';

/**
 * Homepage 2026 (Brief 220, B9) — "Where to Find Us": search + office list | map, the prototype's
 * `.loc-panel` layout.
 *
 * Offices come from Global Settings (ordered by `orderLocatorOffices`: Northbrook, Columbus,
 * Evanston pinned, then A–Z), never hardcoded; the count is derived.
 *
 * Search keeps the Brief 171 / 178 matching, so "Search by city, neighborhood, or ZIP" is true:
 *   1. an office whose name or town starts with the query, 2. contains it, 3. whose ZIP starts with
 *   it, 4. a town / neighborhood from the generated city index, grouped onto the office that serves
 *   it (with the Brief 178 overrides applied). The index is `locator-index.generated.ts` — loaded
 *   lazily on first focus, its own chunk — so CITY_REGISTRY never reaches the client bundle (the
 *   Brief 171 trap). Same algorithm as `StoreLocatorPanel` (the Classic homepage's locator, left
 *   untouched by this brief).
 *
 * Map (Marketing D3): a static map image (the Brief 171 `build:locator-maps` all-regions frame, OSM,
 * credited) until the visitor clicks an office or the map. Only then is the Google embed created; after
 * that an office click re-centres it. "Open in Maps" is a plain link and works before and after.
 */

export interface FinderOffice {
  slug: string;
  name: string;
  address: string;
  city: string;
  zip: string;
}
type IndexRow = readonly [slug: string, name: string, office: string];
interface Match {
  office: FinderOffice;
  cities: string[] | null;
}

/** U+0300–U+036F, the combining diacritical marks NFD splits accents into. */
const COMBINING_MARKS = /[̀-ͯ]/g;
const normalize = (s: string) => s.normalize('NFD').replace(COMBINING_MARKS, '').toLowerCase().trim();

const DEFAULT_EMBED = 'https://maps.google.com/maps?q=J.%20Blanton%20Plumbing&ll=41.6,-85.2&z=6&output=embed';
const DEFAULT_OPEN = 'https://www.google.com/maps/search/J.+Blanton+Plumbing';
const fill = (t: string, v: Record<string, string | number>) => t.replace(/\{(\w+)\}/g, (m, k: string) => (k in v ? String(v[k]) : m));

export default function OfficeFinder({
  offices,
  officeOverrides,
  copy,
}: {
  offices: FinderOffice[];
  officeOverrides: Record<string, string>;
  copy: {
    searchLabel: string;
    searchPlaceholder: string;
    count: string;
    match: string;
    empty: string;
    emptyLink: string;
    mapTitle: string;
    mapButton: string;
    openMaps: string;
  };
}) {
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState<readonly IndexRow[] | null>(null);
  const [indexFailed, setIndexFailed] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [mapLive, setMapLive] = useState(false);
  const indexPromise = useRef<Promise<void> | null>(null);

  const ensureIndex = useCallback(() => {
    if (indexPromise.current) return;
    indexPromise.current = import('@/lib/content/locator-index.generated')
      .then((m) => setIndex(m.LOCATOR_INDEX as readonly IndexRow[]))
      .catch(() => {
        indexPromise.current = null;
        setIndexFailed(true);
      });
  }, []);

  const q = normalize(query);
  const searching = q.length >= 2;

  const results = useMemo<Match[] | null>(() => {
    if (!searching) return null;
    const starts: FinderOffice[] = [];
    const contains: FinderOffice[] = [];
    const zips: FinderOffice[] = [];
    for (const o of offices) {
      const name = normalize(o.name);
      const city = normalize(o.city);
      if (name.startsWith(q) || city.startsWith(q)) starts.push(o);
      else if (name.includes(q) || city.includes(q)) contains.push(o);
      else if (normalize(o.zip).startsWith(q)) zips.push(o);
    }
    const out: Match[] = [...starts, ...contains, ...zips].map((office) => ({ office, cities: null }));
    const listed = new Set(out.map((m) => m.office.slug));
    if (index) {
      const prefix: IndexRow[] = [];
      const inner: IndexRow[] = [];
      for (const row of index) {
        const name = normalize(row[1]);
        if (name.startsWith(q)) prefix.push(row);
        else if (name.includes(q)) inner.push(row);
      }
      const byOffice = new Map<string, string[]>();
      for (const row of [...prefix, ...inner]) {
        const slug = officeOverrides[row[0]] ?? row[2];
        const cities = byOffice.get(slug);
        if (cities) cities.push(row[1]);
        else byOffice.set(slug, [row[1]]);
      }
      for (const [slug, cities] of Array.from(byOffice.entries())) {
        if (listed.has(slug)) continue;
        const office = offices.find((o) => o.slug === slug);
        if (office) out.push({ office, cities });
      }
    }
    return out;
  }, [searching, q, index, offices, officeOverrides]);

  const shown: Match[] = results ?? offices.map((office) => ({ office, cities: null }));
  // "No match" only once the city index has answered (or failed): before that, towns are still unknown.
  const noMatch = searching && shown.length === 0 && (index !== null || indexFailed);

  const sel = offices.find((o) => o.slug === selected) ?? null;
  const a = sel ? encodeURIComponent(`J. Blanton Plumbing, ${sel.address}`) : null;
  const embed = a ? `https://maps.google.com/maps?q=${a}&z=14&output=embed` : DEFAULT_EMBED;
  const openHref = a ? `https://www.google.com/maps/search/?api=1&query=${a}` : DEFAULT_OPEN;

  const pick = (slug: string) => {
    setSelected(slug);
    setMapLive(true);
  };

  return (
    <div className="loc-panel">
      <div className="loc-side">
        <div className="loc-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <label className="sr-only" htmlFor="of-q">
            {copy.searchLabel}
          </label>
          <input
            id="of-q"
            type="search"
            placeholder={copy.searchPlaceholder}
            autoComplete="off"
            value={query}
            onFocus={ensureIndex}
            onChange={(e) => {
              ensureIndex();
              setQuery(e.target.value);
            }}
          />
        </div>
        <p className="loc-count" aria-live="polite">
          {fill(copy.count, { count: shown.length })}
        </p>
        <ul className="loc-list" id="of-list">
          {shown.map(({ office, cities }) => (
            <li key={office.slug}>
              <button type="button" className={`loc-item${selected === office.slug ? ' is-active' : ''}`} onClick={() => pick(office.slug)}>
                <h3>{office.name}</h3>
                <p>{office.address}</p>
                {cities && <p>{fill(copy.match, { cities: cities.slice(0, 3).join(', ') + (cities.length > 3 ? ` +${cities.length - 3}` : '') })}</p>}
              </button>
            </li>
          ))}
        </ul>
        <p className="t-body-sm pv-mute loc-empty" id="of-empty" hidden={!noMatch}>
          {copy.empty} <a href="/locations">{copy.emptyLink}</a>.
        </p>
      </div>
      <div className="loc-map">
        {mapLive ? (
          <iframe id="loc-map" title={copy.mapTitle} src={embed} referrerPolicy="no-referrer-when-downgrade" />
        ) : (
          <button type="button" className="h26-static-map" onClick={() => setMapLive(true)} aria-label={copy.mapButton}>
            <Image src="/images/locator/all-regions.webp" alt="" fill sizes="(max-width: 900px) 100vw, 60vw" loading="lazy" />
            <span className="h26-map-load">{copy.mapButton}</span>
            <span className="h26-map-credit">© OpenStreetMap contributors</span>
          </button>
        )}
        <a className="loc-open" id="loc-open" href={openHref} target="_blank" rel="noreferrer">
          {copy.openMaps}
        </a>
      </div>
    </div>
  );
}
