'use client';

import { useMemo, useRef, useState } from 'react';

/**
 * Brief 229 (Track D) — the "Areas We Serve" panels (Locations §5, State §7), the prototypes' search +
 * chip scripts in React. EVERY place is in the server HTML (crawlable); the filter only hides items.
 *   AreasList    /locations: one A–Z list, carmine letter dividers, All / Illinois / Ohio chips.
 *   StateAreas   a state page: county groups (City of Chicago / Columbus first), county chips.
 * Office cities link to their hub, Lincoln Park to its page, Tier 3 towns to their town page — the
 * links were resolved through the package's link map (`link_to_use_now`) at extraction.
 */

export interface AreaPlace {
  st?: string;
  n: string;
  label: string;
  suffix?: string;
  href?: string;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');

function SearchBox({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="cb-search">
      <span className="sr-only">{label}</span>
      <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input autoComplete="off" id="sa-q" onChange={(e) => onChange(e.target.value)} placeholder="Type your town" type="search" value={value} />
    </label>
  );
}

const Place = ({ p }: { p: AreaPlace }) =>
  p.href ? (
    <a href={p.href}>{p.label}</a>
  ) : (
    <>
      {p.label}
      {p.suffix ? (
        <>
          {' '}
          <span className="sa-in">{p.suffix}</span>
        </>
      ) : null}
    </>
  );

export function AreasList({ places, phoneHref }: { places: AreaPlace[]; phoneHref: string }) {
  const [q, setQ] = useState('');
  const [st, setSt] = useState('');
  const counts = useMemo(() => ({ all: places.length, IL: places.filter((p) => p.st === 'IL').length, OH: places.filter((p) => p.st === 'OH').length }), [places]);
  const v = norm(q);
  const match = (p: AreaPlace) => (!st || p.st === st) && (!v || norm(p.n).includes(v));
  const n = places.filter(match).length;
  // Group by first letter (the list is A–Z already).
  const groups: Array<{ letter: string; items: AreaPlace[] }> = [];
  for (const p of places) {
    const L = p.label.charAt(0).toUpperCase();
    if (!groups.length || groups[groups.length - 1].letter !== L) groups.push({ letter: L, items: [] });
    groups[groups.length - 1].items.push(p);
  }
  return (
    <div className="cb-panel sa-panel" id="service-areas">
      <div className="sa-ctrl">
        <SearchBox label="Search your town or neighborhood" onChange={setQ} value={q} />
        <div aria-label="Filter by state" className="lc-tabs sa-tabs" role="group">
          {[
            ['', 'All', counts.all],
            ['IL', 'Illinois', counts.IL],
            ['OH', 'Ohio', counts.OH],
          ].map(([key, label, c]) => (
            <button aria-pressed={st === key} className="lc-tab" data-st={key} key={label} onClick={() => setSt(String(key))} type="button">
              {label} <span>{c}</span>
            </button>
          ))}
        </div>
      </div>
      <p aria-live="polite" className="t-body-sm pv-mute sa-count" id="sa-count">
        {!v && !st ? 'Underlined places have their own page.' : `${n}${n === 1 ? ' place' : ' places'} found.`}
      </p>
      <div aria-label="All towns and neighborhoods we serve" className="sa-scroll" hidden={n === 0} role="region" tabIndex={0}>
        <ul className="cb-list sa-list" id="sa-list">
          {groups.map((g) => (
            <GroupRows g={g} key={g.letter} match={match} />
          ))}
        </ul>
      </div>
      <p aria-live="polite" className="t-body-sm cb-empty" hidden={n > 0} id="sa-empty">
        {n > 0 ? null : (
          <>
            {`We don’t list “${q}”${st ? ` in ${st === 'IL' ? 'Illinois' : 'Ohio'}` : ''}. We may still serve it: `}
            <a href={phoneHref}>call us 24/7</a>
            {' and we’ll let you know.'}
          </>
        )}
      </p>
    </div>
  );
}

function GroupRows({ g, match }: { g: { letter: string; items: AreaPlace[] }; match: (p: AreaPlace) => boolean }) {
  const any = g.items.some(match);
  return (
    <>
      <li aria-hidden="true" className="sa-letter" hidden={!any}>
        {g.letter}
      </li>
      {g.items.map((p) => (
        <li data-n={p.n} data-st={p.st} hidden={!match(p)} key={`${p.n}|${p.st}`}>
          <Place p={p} />
        </li>
      ))}
    </>
  );
}

export interface StateCounty {
  key: string;
  heading: string;
  count: number;
  places: AreaPlace[];
}

export function StateAreas({
  counties,
  chips,
  stateName,
  phoneHref,
}: {
  counties: StateCounty[];
  chips: Array<{ key: string; label: string; count: number }>;
  stateName: string;
  phoneHref: string;
}) {
  const [q, setQ] = useState('');
  const [g, setG] = useState('');
  const box = useRef<HTMLDivElement>(null);
  const v = norm(q);
  const shown = counties.map((c) => {
    const on = !g || c.key === g;
    const items = c.places.map((p) => on && (!v || norm(p.n).includes(v)));
    return { c, items, k: items.filter(Boolean).length };
  });
  const n = shown.reduce((a, x) => a + x.k, 0);
  const chipLabel = chips.find((c) => c.key === g)?.label ?? '';
  return (
    <div className="cb-panel sa-panel st-panel" id="service-areas">
      <div className="sa-ctrl st-ctrl">
        <SearchBox label="Search your town or neighborhood" onChange={setQ} value={q} />
        <div aria-label="Filter by county" className="lc-tabs sa-tabs st-chips" role="group">
          {chips.map((c) => (
            <button
              aria-pressed={g === c.key}
              className="lc-tab"
              data-g={c.key}
              key={c.key || 'all'}
              onClick={() => {
                setG(c.key);
                if (box.current) box.current.scrollTop = 0;
              }}
              type="button"
            >
              {c.label} <span>{c.count}</span>
            </button>
          ))}
        </div>
      </div>
      <p aria-live="polite" className="t-body-sm pv-mute sa-count" id="sa-count">
        {!v && !g ? 'Underlined places have their own page.' : `${n}${n === 1 ? ' place' : ' places'} found.`}
      </p>
      <div aria-label={`All ${stateName} towns and neighborhoods we serve`} className="sa-scroll st-scroll" hidden={n === 0} ref={box} role="region" tabIndex={0}>
        {shown.map(({ c, items, k }) => (
          <div className="st-county" data-g={c.key} hidden={k === 0} key={c.key + c.heading}>
            <h3 className="st-county-h">
              {c.heading} <span>{c.count}</span>
            </h3>
            <ul className="cb-list sa-list">
              {c.places.map((p, i) => (
                <li data-n={p.n} hidden={!items[i]} key={p.n}>
                  <Place p={p} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p aria-live="polite" className="t-body-sm cb-empty" hidden={n > 0} id="sa-empty">
        {n > 0 ? null : (
          <>
            {`We don’t list “${q}”${g ? ` in ${chipLabel}` : ''}. We may still serve it: `}
            <a href={phoneHref}>call us 24/7</a>
            {' and we’ll let you know.'}
          </>
        )}
      </p>
    </div>
  );
}
