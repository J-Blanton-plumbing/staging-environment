'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { CATEGORY_DEFS, CATEGORY_KEYS, deriveCategory } from '@/lib/content/service-taxonomy';
import { ADMIN_COLORS, ADMIN_SHADOWS } from '@/lib/admin/theme';

interface CityServiceRow {
  city_slug: string;
  service_slug: string;
  parent_slug: string | null;
  updated_at: string | null;
  status: string | null;
}

/**
 * A `city_pages` row, as returned by `GET /api/cms/cities` (no `view`).
 *
 * Brief 158 (Track B): this list used to feed the Local Office / Coverage Area
 * filter pills and NOTHING else — the card set was built exclusively from
 * `city_service_pages`, so a city with no service pages could not have a card in
 * any view: not Recent, not All, not an A–Z letter, not a search. That hid 26 of
 * 249 cities, including office-host **Geneva** (a fully populated, editable city
 * page reachable only by typing the URL) and **Columbus**, which is what
 * Marketing reported. Cards now come from the UNION of the two sources.
 */
interface CityPageRow {
  slug: string;
  cityType: string;
  updatedAt: string | null;
}

function toDisplayName(slug: string): string {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/**
 * The Emergency row is keyed off the service_slug (not parent_slug). In the DB the
 * emergency city-service page has service_slug='emergency-plumbing' with parent_slug NULL,
 * so it is detected by slug and rendered as a direct link (never a toggle).
 */
const EMERGENCY_SLUG = 'emergency-plumbing';

/*
 * Fixed category order + labels + the service→category mapping now live in the
 * shared taxonomy (`@/lib/content/service-taxonomy`) so the admin view, the
 * breadcrumb silo, and the Track-A migration all derive categories the same way.
 * CATEGORY_DEFS, CATEGORY_KEYS, deriveCategory are imported above.
 */

/**
 * Resolve a city-service row to a category key (or null = Uncategorized).
 *
 * Brief 64: `parent_slug` now holds the SERVICE HUB slug (e.g. `hydro-jetting`,
 * `clogged-drains-in-chicago`), not a broad category — so the category is derived
 * from the hub via deriveCategory(). Order:
 *   1. Back-compat: a parent_slug that is already one of the 6 category keys
 *      (a not-yet-migrated Brief 63 value) wins directly.
 *   2. Derive the category from the hub slug in parent_slug.
 *   3. Fall back to deriving from the service_slug itself, so nothing regresses
 *      to Uncategorized if parent_slug is NULL.
 * `emergency-plumbing` is handled separately as the direct Emergency link, so it
 * never reaches this function during card building.
 */
function categoryOf(row: CityServiceRow): string | null {
  if (row.parent_slug && CATEGORY_KEYS.includes(row.parent_slug)) return row.parent_slug;
  const fromHub = row.parent_slug ? deriveCategory(row.parent_slug) : null;
  return fromHub ?? deriveCategory(row.service_slug);
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

interface CityCard {
  slug: string;
  name: string;
  letter: string;
  emergency: CityServiceRow | null;
  categories: Array<{ key: string; label: string; rows: CityServiceRow[] }>;
  uncategorized: CityServiceRow[];
  latestUpdate: string | null;
  /** False for a city that has a `city_pages` row but no service pages (Brief 158). */
  hasServicePages: boolean;
  /** From `city_pages.city_type`; undefined only if the city has no `city_pages` row. */
  cityType?: string;
}

const CITY_TYPE_LABELS: Record<string, string> = {
  'local-office': 'Local Office',
  'local-office-v2': 'Local Office',
  'coverage-area': 'Coverage Area',
};

const RECENT_COUNT = 6;

// Brand tokens — sourced from the shared admin theme module (Brief 80) so this
// file stays in lockstep with the rest of the admin panel instead of re-typing hexes.
const CERULEAN = ADMIN_COLORS.cerulean;
const MIDNIGHT = ADMIN_COLORS.onSurface;

type PageTypeFilter = 'all' | 'local-office' | 'coverage-area';

export default function CitiesAdminPage() {
  const [cityServiceRows, setCityServiceRows] = useState<CityServiceRow[]>([]);
  const [cityPageRows, setCityPageRows] = useState<CityPageRow[]>([]);
  const [loadStatus, setLoadStatus] = useState<'loading' | 'error' | 'done'>('loading');
  const [openToggles, setOpenToggles] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState('');
  const [pageTypeFilter, setPageTypeFilter] = useState<PageTypeFilter>('all');
  const [activeLetter, setActiveLetter] = useState<string>('Recent');
  const listTopRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Brief 158 (Track B): BOTH fetches now feed the card set, so `loadStatus`
    // waits for both to settle — otherwise the city-pages-only cards would pop
    // in a beat after the rest and read as a rendering glitch.
    //
    // Failure handling is deliberately asymmetric, and matches what each source
    // is worth: the city-service fetch failing is still a hard error (it is most
    // of the page), while the city-pages fetch failing degrades to exactly the
    // pre-Brief-158 behaviour — cards from service rows only, and the type
    // filter inert — rather than blanking a working screen.
    let serviceRows: CityServiceRow[] = [];
    let pageRows: CityPageRow[] = [];
    let serviceFailed = false;

    Promise.allSettled([
      fetch('/api/cms/cities?view=city-services')
        .then(r => r.json())
        .then((rows) => { serviceRows = Array.isArray(rows) ? rows : []; })
        .catch(() => { serviceFailed = true; }),
      // Page-type (Local Office / Coverage Area) and the city page's own
      // freshness come from `city_pages` — fetched separately, merged in by slug.
      fetch('/api/cms/cities')
        .then(r => r.json())
        .then((data: CityPageRow[]) => { pageRows = Array.isArray(data) ? data : []; })
        .catch(() => {}),
    ]).then(() => {
      setCityServiceRows(serviceRows);
      setCityPageRows(pageRows);
      setLoadStatus(serviceFailed ? 'error' : 'done');
    });
  }, []);

  const cityTypes = useMemo(() => {
    const map: Record<string, string> = {};
    cityPageRows.forEach(r => { map[r.slug] = r.cityType; });
    return map;
  }, [cityPageRows]);

  function toggle(key: string) {
    setOpenToggles(prev => ({ ...prev, [key]: !prev[key] }));
  }

  // Build one card per city, categorizing that city's service pages.
  //
  // Brief 158 (Track B): the card set is the UNION of the two sources — a city
  // gets a card if it has ≥1 `city_service_pages` row OR a `city_pages` row.
  // It is deliberately NOT unioned with `CITY_REGISTRY`: a registry-only city
  // would get a card whose EDIT CITY PAGE button leads to the editor's "No CMS
  // content found" dead end, which is worse than a clean absence. The Brief 158
  // Track C coverage assertion is what catches that case, at deploy time.
  const allCards: CityCard[] = useMemo(() => {
    const byCity = new Map<string, CityServiceRow[]>();
    for (const r of cityServiceRows) {
      const list = byCity.get(r.city_slug) ?? [];
      list.push(r);
      byCity.set(r.city_slug, list);
    }

    const slugs = new Set<string>(byCity.keys());
    for (const r of cityPageRows) slugs.add(r.slug);
    const cityPageUpdatedAt = new Map<string, string | null>(
      cityPageRows.map(r => [r.slug, r.updatedAt])
    );

    const cards: CityCard[] = [];
    for (const slug of Array.from(slugs)) {
      const rows = byCity.get(slug) ?? [];
      const emergency = rows.find(r => r.service_slug === EMERGENCY_SLUG) ?? null;
      const nonEmergency = rows.filter(r => r.service_slug !== EMERGENCY_SLUG);

      const categories = CATEGORY_DEFS.map(def => ({
        key: def.key,
        label: def.label,
        rows: nonEmergency
          .filter(r => categoryOf(r) === def.key)
          .sort((a, b) => a.service_slug.localeCompare(b.service_slug)),
      }));

      const uncategorized = nonEmergency
        .filter(r => categoryOf(r) === null)
        .sort((a, b) => a.service_slug.localeCompare(b.service_slug));

      const name = toDisplayName(slug);
      const firstChar = name.charAt(0).toUpperCase();
      const letter = /[A-Z]/.test(firstChar) ? firstChar : '#';

      // Freshness is the newest of the city's service pages AND its own city
      // page — without the latter a city-page-only card could never reach the
      // Recent view, however recently someone edited it in the city editor.
      const latestUpdate = [...rows.map(r => r.updated_at), cityPageUpdatedAt.get(slug) ?? null]
        .reduce<string | null>((latest, ts) => {
          if (!ts) return latest;
          if (!latest || new Date(ts) > new Date(latest)) return ts;
          return latest;
        }, null);

      cards.push({
        slug,
        name,
        letter,
        emergency,
        categories,
        uncategorized,
        latestUpdate,
        hasServicePages: rows.length > 0,
        cityType: cityTypes[slug],
      });
    }

    cards.sort((a, b) => a.name.localeCompare(b.name));
    return cards;
  }, [cityServiceRows, cityPageRows, cityTypes]);

  // Which first-letters have at least one city (for enabling A–Z buttons).
  const availableLetters = useMemo(() => {
    const set = new Set<string>();
    for (const c of allCards) set.add(c.letter);
    return set;
  }, [allCards]);

  const q = query.trim().toLowerCase();
  const searching = q.length > 0;

  // Search + page-type + A–Z/Recent filters which city cards are visible (matches
  // city name OR any of its service page names — preserves the prior "city or
  // service" search behavior — restricts to Local Office / Coverage Area cities,
  // and restricts to either cities whose name starts with the selected letter, or
  // (default view) the RECENT_COUNT most-recently-updated cities).
  const visibleCards = useMemo(() => {
    let list = allCards;
    if (pageTypeFilter !== 'all') {
      // A card with no `city_pages` row has no type at all (`undefined`), so it
      // is hidden by a specific type filter and shown under "All Types" — never
      // crashes, never silently vanishes from the default view. That set is
      // empty today (every city with service rows also has a city_pages row,
      // verified 2026-08-27) and would only appear if a `city_service_pages` row
      // were created for an unseeded city.
      list = list.filter(card => cityTypes[card.slug] === pageTypeFilter);
    }
    if (!searching) {
      if (activeLetter === 'Recent') {
        list = [...list]
          .filter(card => card.latestUpdate)
          .sort((a, b) => new Date(b.latestUpdate!).getTime() - new Date(a.latestUpdate!).getTime())
          .slice(0, RECENT_COUNT);
      } else if (activeLetter !== 'All') {
        list = list.filter(card => card.letter === activeLetter);
      }
      return list;
    }
    return list.filter(card => {
      if (card.name.toLowerCase().includes(q) || card.slug.includes(q)) return true;
      const services = [
        ...(card.emergency ? [card.emergency] : []),
        ...card.categories.flatMap(c => c.rows),
        ...card.uncategorized,
      ];
      return services.some(
        r =>
          r.service_slug.includes(q) ||
          toDisplayName(r.service_slug).toLowerCase().includes(q)
      );
    });
  }, [allCards, searching, q, pageTypeFilter, cityTypes, activeLetter]);

  function handleLetterClick(letter: string) {
    if (searching) return;
    if (letter !== 'All' && letter !== 'Recent' && !availableLetters.has(letter)) return;
    setActiveLetter(letter);
    listTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---- shared styles ----
  const cardStyle: React.CSSProperties = {
    border: `1px solid ${ADMIN_COLORS.outlineVariant}2E`,
    borderRadius: '1.5rem',
    overflow: 'hidden',
    background: ADMIN_COLORS.surfaceContainerLow,
    boxShadow: ADMIN_SHADOWS.elegant,
  };
  const cardHeader: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.85rem 1rem',
    background: ADMIN_COLORS.surfaceContainer,
    borderBottom: `1px solid ${ADMIN_COLORS.outlineVariant}26`,
  };
  const rowBase: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.6rem 1rem',
    borderTop: `1px solid ${ADMIN_COLORS.outlineVariant}14`,
    fontFamily: 'var(--font-nunito), system-ui, sans-serif',
    fontSize: '14px',
  };

  return (
    <main style={{ padding: '2rem 2.5rem', fontFamily: 'system-ui, sans-serif' }}>
      {/* pill hover styles (inline styles can't express :hover) */}
      <style>{`
        .az-pill:not(.az-disabled):not(.az-active):hover { background: ${ADMIN_COLORS.surfaceContainerHigh}; }
        .svc-item:hover { background: ${ADMIN_COLORS.surfaceContainerHigh}66; }
        .page-type-pill:not(.pt-active):hover { background: ${ADMIN_COLORS.surfaceContainerHigh}; }
        .edit-city-btn { transition: box-shadow 0.2s ease, filter 0.2s ease; }
        .edit-city-btn:hover { box-shadow: ${ADMIN_SHADOWS.glowCerulean}; filter: brightness(1.05); }
        @media (max-width: 720px) {
          .city-cards-grid { grid-template-columns: minmax(0, 1fr) !important; }
        }
      `}</style>

      <h1 style={{ fontFamily: 'var(--font-outfit), system-ui, sans-serif', fontWeight: 700, fontSize: '1.875rem', letterSpacing: '-0.025em', color: MIDNIGHT, marginBottom: '0.25rem' }}>
        {/* Brief 158 (Track B): renamed from "City Service Pages". The view used
            to list only cities that HAD service pages, so the old heading was
            accurate and the sidebar link ("City Pages") was the thing setting a
            false expectation. Now that the card set is the union of city pages
            and city-service pages, this is a genuine city index and the two
            labels agree. The count also moves 223 → ~249 for the same reason —
            not a regression. */}
        City Pages
      </h1>
      <p style={{ fontFamily: 'var(--font-nunito), system-ui, sans-serif', color: `${ADMIN_COLORS.onSurfaceVariant}99`, fontSize: '0.875rem', marginBottom: '1.25rem' }}>
        {loadStatus === 'done'
          ? `${allCards.length} cities · edit a city page, or browse its service pages by category`
          : ' '}
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <input
          type="search"
          placeholder="Search by city or service…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{
            display: 'block',
            width: '100%',
            maxWidth: '360px',
            padding: '0.5rem 0.75rem',
            border: `1px solid ${ADMIN_COLORS.outlineVariant}4D`,
            borderRadius: '0.75rem',
            fontSize: '0.9rem',
            fontFamily: 'var(--font-nunito), system-ui, sans-serif',
            color: MIDNIGHT,
            background: ADMIN_COLORS.surfaceContainer,
            boxSizing: 'border-box',
          }}
        />

        {/* Page-type filter — Local Office vs Coverage Area, sourced from city_pages.city_type */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {([
            { key: 'all', label: 'All Types' },
            { key: 'local-office', label: 'Local Office' },
            { key: 'coverage-area', label: 'Coverage Area' },
          ] as const).map(opt => {
            const isActive = pageTypeFilter === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                className={`page-type-pill${isActive ? ' pt-active' : ''}`}
                onClick={() => setPageTypeFilter(opt.key)}
                style={{
                  fontFamily: 'var(--font-nunito), system-ui, sans-serif',
                  fontSize: '12px',
                  fontWeight: 700,
                  padding: '6px 12px',
                  borderRadius: '9999px',
                  border: isActive ? `1px solid ${CERULEAN}` : `1px solid ${ADMIN_COLORS.outlineVariant}4D`,
                  background: isActive ? CERULEAN : 'transparent',
                  color: isActive ? '#fff' : MIDNIGHT,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* A–Z strip — hidden while searching (only applies to the full unfiltered list) */}
      {loadStatus === 'done' && !searching && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '4px',
            marginBottom: '1.5rem',
            alignItems: 'center',
          }}
        >
          {['Recent', 'All', ...LETTERS].map(letter => {
            const isWide = letter === 'Recent' || letter === 'All';
            const enabled = isWide || availableLetters.has(letter);
            const isActive = activeLetter === letter;
            const cls =
              'az-pill' + (isActive ? ' az-active' : '') + (!enabled ? ' az-disabled' : '');
            return (
              <button
                key={letter}
                className={cls}
                onClick={() => handleLetterClick(letter)}
                disabled={!enabled}
                style={{
                  fontFamily: 'var(--font-nunito), system-ui, sans-serif',
                  fontSize: '12px',
                  fontWeight: 700,
                  padding: '4px 8px',
                  borderRadius: '9999px',
                  border: isActive ? `1px solid ${CERULEAN}` : `1px solid ${ADMIN_COLORS.outlineVariant}4D`,
                  background: isActive ? CERULEAN : 'transparent',
                  color: isActive ? '#fff' : MIDNIGHT,
                  opacity: enabled ? 1 : 0.4,
                  cursor: enabled ? 'pointer' : 'not-allowed',
                  minWidth: isWide ? 'auto' : '26px',
                }}
              >
                {letter}
              </button>
            );
          })}
        </div>
      )}

      {searching && loadStatus === 'done' && (
        <p style={{ fontSize: '13px', color: ADMIN_COLORS.onSurfaceVariant, fontFamily: 'var(--font-nunito), system-ui, sans-serif', marginBottom: '1rem' }}>
          {visibleCards.length} result{visibleCards.length !== 1 ? 's' : ''}
        </p>
      )}

      {loadStatus === 'loading' && <p style={{ color: ADMIN_COLORS.onSurfaceVariant }}>Loading…</p>}
      {loadStatus === 'error' && (
        <p style={{ color: ADMIN_COLORS.error }}>Failed to load city service pages. Check database connection.</p>
      )}

      {loadStatus === 'done' && (
        <div ref={listTopRef} className="city-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1rem', alignItems: 'start' }}>
          {visibleCards.map(card => {
            const activeCats = card.categories.filter(c => c.rows.length > 0);
            const hasUncategorized = card.uncategorized.length > 0;

            return (
              <div key={card.slug} data-letter={card.letter}>
                <div style={cardStyle}>
                  {/* Header */}
                  <div style={cardHeader}>
                    <span style={{ fontFamily: 'var(--font-outfit), system-ui, sans-serif', fontWeight: 700, fontSize: '18px', color: MIDNIGHT }}>
                      {card.name}
                    </span>
                    <Link
                      href={`/admin/city/${card.slug}`}
                      className="edit-city-btn"
                      style={{
                        background: CERULEAN, color: '#fff', textDecoration: 'none',
                        padding: '0.4rem 0.9rem', borderRadius: '9999px',
                        display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                        fontFamily: 'var(--font-nunito), system-ui, sans-serif', fontWeight: 700, fontSize: '11px', letterSpacing: '0.03em',
                        boxShadow: ADMIN_SHADOWS.sm, whiteSpace: 'nowrap',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>location_city</span>
                      EDIT CITY PAGE
                    </Link>
                  </div>

                  {/* Emergency — direct link, not a toggle. Hidden if no emergency page. */}
                  {card.emergency && (
                    <Link
                      href={`/admin/city-service/${card.slug}/${card.emergency.service_slug}`}
                      style={{ ...rowBase, borderTop: 'none', textDecoration: 'none' }}
                    >
                      <span style={{
                        color: '#fff', fontWeight: 700, fontSize: '13px',
                        textTransform: 'uppercase', letterSpacing: '0.04em',
                      }}>
                        Emergency
                      </span>
                      <span style={{ color: '#fff', fontWeight: 700, fontSize: '13px', textDecoration: 'underline' }}>
                        Edit service page &gt;
                      </span>
                    </Link>
                  )}

                  {/* Category toggles (only those with pages) */}
                  {activeCats.map(cat => {
                    const key = `${card.slug}:${cat.key}`;
                    const isOpen = !!openToggles[key];
                    return (
                      <div key={key}>
                        <div
                          role="button"
                          aria-expanded={isOpen}
                          onClick={() => toggle(key)}
                          style={{ ...rowBase, cursor: 'pointer', color: MIDNIGHT, userSelect: 'none' }}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                            <span style={{ fontSize: '11px', color: ADMIN_COLORS.onSurfaceVariant }}>{isOpen ? '▾' : '▸'}</span>
                            {cat.label}
                          </span>
                          <span style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            color: ADMIN_COLORS.onSurfaceVariant,
                            background: ADMIN_COLORS.surfaceContainerHighest,
                            borderRadius: '9999px',
                            padding: '1px 9px',
                          }}>
                            {cat.rows.length}
                          </span>
                        </div>
                        {isOpen && (
                          <div style={{ background: ADMIN_COLORS.surfaceContainerLowest }}>
                            {cat.rows.map(r => (
                              <Link
                                key={r.service_slug}
                                href={`/admin/city-service/${card.slug}/${r.service_slug}`}
                                className="svc-item"
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  padding: '0.5rem 1rem 0.5rem 2.25rem',
                                  borderTop: `1px solid ${ADMIN_COLORS.outlineVariant}14`,
                                  fontFamily: 'var(--font-nunito), system-ui, sans-serif',
                                  fontSize: '14px',
                                  fontWeight: 600,
                                  color: MIDNIGHT,
                                  textDecoration: 'none',
                                }}
                              >
                                <span>{toDisplayName(r.service_slug)}</span>
                                <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff', textDecoration: 'underline' }}>Edit service page &gt;</span>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Uncategorized toggle (only if uncategorized pages exist) */}
                  {hasUncategorized && (() => {
                    const key = `${card.slug}:__uncat__`;
                    const isOpen = !!openToggles[key];
                    return (
                      <div>
                        <div
                          role="button"
                          aria-expanded={isOpen}
                          onClick={() => toggle(key)}
                          style={{ ...rowBase, cursor: 'pointer', color: ADMIN_COLORS.onSurfaceVariant, userSelect: 'none' }}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                            <span style={{ fontSize: '11px', color: ADMIN_COLORS.onSurfaceVariant }}>{isOpen ? '▾' : '▸'}</span>
                            Uncategorized
                          </span>
                          <span style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            color: ADMIN_COLORS.onSurfaceVariant,
                            background: ADMIN_COLORS.surfaceContainerHighest,
                            borderRadius: '9999px',
                            padding: '1px 9px',
                          }}>
                            {card.uncategorized.length}
                          </span>
                        </div>
                        {isOpen && (
                          <div style={{ background: ADMIN_COLORS.surfaceContainerLowest }}>
                            {card.uncategorized.map(r => (
                              <Link
                                key={r.service_slug}
                                href={`/admin/city-service/${card.slug}/${r.service_slug}`}
                                className="svc-item"
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  padding: '0.5rem 1rem 0.5rem 2.25rem',
                                  borderTop: `1px solid ${ADMIN_COLORS.outlineVariant}14`,
                                  fontFamily: 'var(--font-nunito), system-ui, sans-serif',
                                  fontSize: '14px',
                                  fontWeight: 600,
                                  color: MIDNIGHT,
                                  textDecoration: 'none',
                                }}
                              >
                                <span>{toDisplayName(r.service_slug)}</span>
                                <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff', textDecoration: 'underline' }}>Edit service page &gt;</span>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Brief 158 (Track B): the empty state for a city that has a
                      `city_pages` row but no service pages — 26 cities today,
                      including Columbus and office-host Geneva. Without this the
                      card would render as a bare header strip and read as broken.
                      The card's own type is shown here rather than as a new badge
                      on every card, so nothing changes for the other ~223. */}
                  {!card.hasServicePages && (
                    <div
                      style={{
                        ...rowBase,
                        borderTop: 'none',
                        color: ADMIN_COLORS.onSurfaceVariant,
                        gap: '0.75rem',
                      }}
                    >
                      <span>No service pages for this city yet — the city page itself is editable above.</span>
                      {card.cityType && (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: ADMIN_COLORS.onSurfaceVariant,
                            background: ADMIN_COLORS.surfaceContainerHighest,
                            borderRadius: '9999px',
                            padding: '1px 9px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {CITY_TYPE_LABELS[card.cityType] ?? card.cityType}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {visibleCards.length === 0 && (
            <p style={{ color: ADMIN_COLORS.onSurfaceVariant, fontFamily: 'var(--font-nunito), system-ui, sans-serif' }}>
              {searching ? 'No cities match your search.' : 'No city pages found.'}
            </p>
          )}
        </div>
      )}
    </main>
  );
}
