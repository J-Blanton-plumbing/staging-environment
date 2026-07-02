'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { CATEGORY_DEFS, CATEGORY_KEYS, deriveCategory } from '@/lib/content/service-taxonomy';

interface CityServiceRow {
  city_slug: string;
  service_slug: string;
  parent_slug: string | null;
  updated_at: string | null;
  status: string | null;
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
}

// Brand tokens
const CARMINE = '#BC0E0E';
const CERULEAN = '#1560E6';
const CREAM = '#F9F3EC';
const MIDNIGHT = '#0A1B2E';

export default function CitiesAdminPage() {
  const [cityServiceRows, setCityServiceRows] = useState<CityServiceRow[]>([]);
  const [loadStatus, setLoadStatus] = useState<'loading' | 'error' | 'done'>('loading');
  const [openToggles, setOpenToggles] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState('');
  const [activeLetter, setActiveLetter] = useState<string>('All');
  const listTopRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/cms/cities?view=city-services')
      .then(r => r.json())
      .then((rows) => {
        setCityServiceRows(Array.isArray(rows) ? rows : []);
        setLoadStatus('done');
      })
      .catch(() => setLoadStatus('error'));
  }, []);

  function toggle(key: string) {
    setOpenToggles(prev => ({ ...prev, [key]: !prev[key] }));
  }

  // Build one card per city, categorizing that city's service pages.
  const allCards: CityCard[] = useMemo(() => {
    const byCity = new Map<string, CityServiceRow[]>();
    for (const r of cityServiceRows) {
      const list = byCity.get(r.city_slug) ?? [];
      list.push(r);
      byCity.set(r.city_slug, list);
    }

    const cards: CityCard[] = [];
    for (const [slug, rows] of Array.from(byCity.entries())) {
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

      cards.push({ slug, name, letter, emergency, categories, uncategorized });
    }

    cards.sort((a, b) => a.name.localeCompare(b.name));
    return cards;
  }, [cityServiceRows]);

  // Which first-letters have at least one city (for enabling A–Z buttons).
  const availableLetters = useMemo(() => {
    const set = new Set<string>();
    for (const c of allCards) set.add(c.letter);
    return set;
  }, [allCards]);

  const q = query.trim().toLowerCase();
  const searching = q.length > 0;

  // Search filters which city cards are visible (matches city name OR any of its
  // service page names — preserves the prior "city or service" search behavior).
  const visibleCards = useMemo(() => {
    if (!searching) return allCards;
    return allCards.filter(card => {
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
  }, [allCards, searching, q]);

  function handleLetterClick(letter: string) {
    if (searching) return;
    if (letter === 'All') {
      setActiveLetter('All');
      listTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (!availableLetters.has(letter)) return;
    setActiveLetter(letter);
    document.getElementById(`letter-${letter}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---- shared styles ----
  const cardStyle: React.CSSProperties = {
    border: '1px solid rgba(10,27,46,0.14)',
    borderRadius: '10px',
    overflow: 'hidden',
    background: '#fff',
  };
  const cardHeader: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.85rem 1rem',
    background: CREAM,
    borderBottom: '1px solid rgba(10,27,46,0.1)',
  };
  const rowBase: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.6rem 1rem',
    borderTop: '1px solid rgba(10,27,46,0.06)',
    fontFamily: 'Nunito, sans-serif',
    fontSize: '14px',
  };

  let lastLetter = '';

  return (
    <main style={{ padding: '2rem', maxWidth: '860px', fontFamily: 'system-ui, sans-serif' }}>
      {/* pill hover styles (inline styles can't express :hover) */}
      <style>{`
        .az-pill:not(.az-disabled):not(.az-active):hover { background: rgba(0,0,0,0.05); }
        .svc-item:hover { background: rgba(21,96,230,0.06); }
      `}</style>

      <h1 style={{ fontFamily: 'Industry, sans-serif', color: MIDNIGHT, marginBottom: '0.25rem' }}>
        City Service Pages
      </h1>
      <p style={{ color: '#5a6a7a', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
        {loadStatus === 'done'
          ? `${allCards.length} cities · browse each city's service pages by category`
          : ' '}
      </p>

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
          border: '1px solid rgba(10,27,46,0.2)',
          borderRadius: '6px',
          fontSize: '0.9rem',
          marginBottom: '1rem',
          fontFamily: 'Nunito, sans-serif',
          color: MIDNIGHT,
          boxSizing: 'border-box',
        }}
      />

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
          {['All', ...LETTERS].map(letter => {
            const isAll = letter === 'All';
            const enabled = isAll || availableLetters.has(letter);
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
                  fontFamily: 'Nunito, sans-serif',
                  fontSize: '12px',
                  fontWeight: 700,
                  padding: '4px 8px',
                  borderRadius: '999px',
                  border: isActive ? `1px solid ${CERULEAN}` : '1px solid rgba(10,27,46,0.18)',
                  background: isActive ? CERULEAN : '#fff',
                  color: isActive ? '#fff' : MIDNIGHT,
                  opacity: enabled ? 1 : 0.4,
                  cursor: enabled ? 'pointer' : 'not-allowed',
                  minWidth: isAll ? 'auto' : '26px',
                }}
              >
                {letter}
              </button>
            );
          })}
        </div>
      )}

      {searching && loadStatus === 'done' && (
        <p style={{ fontSize: '13px', color: '#5a6a7a', fontFamily: 'Nunito, sans-serif', marginBottom: '1rem' }}>
          {visibleCards.length} result{visibleCards.length !== 1 ? 's' : ''}
        </p>
      )}

      {loadStatus === 'loading' && <p style={{ color: '#5a6a7a' }}>Loading…</p>}
      {loadStatus === 'error' && (
        <p style={{ color: CARMINE }}>Failed to load city service pages. Check database connection.</p>
      )}

      {loadStatus === 'done' && (
        <div ref={listTopRef} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {visibleCards.map(card => {
            // Emit an invisible scroll anchor before the first city of each new letter
            // (only meaningful when not searching, since the strip is hidden then).
            const showAnchor = !searching && card.letter !== lastLetter;
            if (showAnchor) lastLetter = card.letter;

            const activeCats = card.categories.filter(c => c.rows.length > 0);
            const hasUncategorized = card.uncategorized.length > 0;

            return (
              <div key={card.slug} data-letter={card.letter}>
                {showAnchor && (
                  <div
                    id={`letter-${card.letter}`}
                    style={{ position: 'relative', top: '-16px', height: 0 }}
                    aria-hidden
                  />
                )}
                <div style={cardStyle}>
                  {/* Header */}
                  <div style={cardHeader}>
                    <span style={{ fontFamily: 'Industry, sans-serif', fontWeight: 700, fontSize: '18px', color: MIDNIGHT }}>
                      {card.name}
                    </span>
                    <Link
                      href={`/admin/city/${card.slug}`}
                      style={{ fontFamily: 'Nunito, sans-serif', fontSize: '13px', fontWeight: 700, color: CARMINE, textDecoration: 'none' }}
                    >
                      Edit City →
                    </Link>
                  </div>

                  {/* Emergency — direct link, not a toggle. Hidden if no emergency page. */}
                  {card.emergency && (
                    <Link
                      href={`/admin/city-service/${card.slug}/${card.emergency.service_slug}`}
                      style={{ ...rowBase, borderTop: 'none', textDecoration: 'none', color: CARMINE, fontWeight: 700 }}
                    >
                      <span>Emergency</span>
                      <span style={{ fontSize: '13px', fontWeight: 700 }}>Edit →</span>
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
                            <span style={{ fontSize: '11px', color: '#5a6a7a' }}>{isOpen ? '▾' : '▸'}</span>
                            {cat.label}
                          </span>
                          <span style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            color: '#5a6a7a',
                            background: 'rgba(10,27,46,0.06)',
                            borderRadius: '999px',
                            padding: '1px 9px',
                          }}>
                            {cat.rows.length}
                          </span>
                        </div>
                        {isOpen && (
                          <div style={{ background: '#fafaf9' }}>
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
                                  borderTop: '1px solid rgba(10,27,46,0.05)',
                                  fontFamily: 'Nunito, sans-serif',
                                  fontSize: '14px',
                                  color: MIDNIGHT,
                                  textDecoration: 'none',
                                }}
                              >
                                <span>{toDisplayName(r.service_slug)}</span>
                                <span style={{ fontSize: '13px', fontWeight: 700, color: CARMINE }}>Edit →</span>
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
                          style={{ ...rowBase, cursor: 'pointer', color: '#5a6a7a', userSelect: 'none' }}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                            <span style={{ fontSize: '11px', color: '#5a6a7a' }}>{isOpen ? '▾' : '▸'}</span>
                            Uncategorized
                          </span>
                          <span style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            color: '#5a6a7a',
                            background: 'rgba(10,27,46,0.06)',
                            borderRadius: '999px',
                            padding: '1px 9px',
                          }}>
                            {card.uncategorized.length}
                          </span>
                        </div>
                        {isOpen && (
                          <div style={{ background: '#fafaf9' }}>
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
                                  borderTop: '1px solid rgba(10,27,46,0.05)',
                                  fontFamily: 'Nunito, sans-serif',
                                  fontSize: '14px',
                                  color: MIDNIGHT,
                                  textDecoration: 'none',
                                }}
                              >
                                <span>{toDisplayName(r.service_slug)}</span>
                                <span style={{ fontSize: '13px', fontWeight: 700, color: CARMINE }}>Edit →</span>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })}

          {visibleCards.length === 0 && (
            <p style={{ color: '#5a6a7a', fontFamily: 'Nunito, sans-serif' }}>
              {searching ? 'No cities match your search.' : 'No city service pages found.'}
            </p>
          )}
        </div>
      )}
    </main>
  );
}
