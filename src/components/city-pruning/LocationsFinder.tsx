'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Brief 229 (Track D) — the office finder of /locations and the two state pages: the package's map band
 * + floating panel and its inline script, ported to React (Locations_Template_v1_Changes.md §3, State
 * §6). Every office row is in the server HTML; search, tabs, "Use my location" and the map only change
 * what is shown.
 *
 *   - Search matches office names and cities, every town in the hub service-area lists ("Serves {Town}",
 *     + "Plumbers in {Town}" when it has a Tier 3 page) and 5-digit ZIPs. Searching resets the tab.
 *   - Tabs (All / Illinois / Ohio, /locations only) filter the rows and the map.
 *   - The map is a keyless Google Maps embed: the brand search over the visible offices (desktop: shifted
 *     0.55° east so the pins clear the panel), or one office's GBP address when one is picked.
 *   - ≤1000px: 4 rows + "Show all N offices" (search results and tab changes show every match).
 * The office phones are each listing's own number, marked `data-wc-ignore` so call tracking leaves them
 * alone (the open item in both changes MDs: "WhatsConvert must not swap the office phone numbers").
 */

export interface FinderOffice {
  name: string;
  st: string;
  key: string;
  url: string;
  phone: string;
  lat: number;
  lng: number;
  city: string;
  address: string;
}
export interface FinderTown {
  name: string;
  st: string;
  office: string;
  tier: string;
  link: string;
}

interface Hit {
  text: string;
  link?: { href: string; name: string };
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
const enc = (x: string) => encodeURIComponent(x).replace(/%20/g, '+');
const telHref = (phone: string) => `tel:+1${phone.replace(/\D/g, '').slice(-10)}`;
const rowId = (key: string) => `office-${key.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
function hav(a: number, b: number, c: number, d: number) {
  const R = 3959;
  const r = Math.PI / 180;
  const x = (c - a) * r;
  const y = (d - b) * r;
  const h = Math.sin(x / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(y / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const BRAND_Q = 'J. Blanton Plumbing, Sewer & Drain';

function PhoneGlyph() {
  return (
    <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.68 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.32 1.85.55 2.81.68A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

export default function LocationsFinder({
  offices,
  towns,
  zips,
  heading,
  tabs,
  phoneHref,
}: {
  offices: FinderOffice[];
  towns: FinderTown[];
  zips: Record<string, string[]>;
  heading: string;
  /** /locations: All / Illinois / Ohio tabs. The state pages have none (one state's data only). */
  tabs: boolean;
  phoneHref: string;
}) {
  const [q, setQ] = useState('');
  const [st, setSt] = useState('');
  const [hits, setHits] = useState<Record<string, Hit[]> | null>(null);
  const [msgPrefix, setMsgPrefix] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const [map, setMap] = useState<{ src: string; title: string; open: string } | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  const counts = useMemo(() => ({ all: offices.length, IL: offices.filter((o) => o.st === 'IL').length, OH: offices.filter((o) => o.st === 'OH').length }), [offices]);

  const place = useCallback((o: FinderOffice) => {
    const query = `J. Blanton Plumbing, ${o.address}`;
    setMap({
      src: `https://www.google.com/maps?q=${enc(query)}&z=13&output=embed`,
      title: `Map showing the J. Blanton Plumbing office at ${o.address}`,
      open: `https://www.google.com/maps/search/?api=1&query=${enc(query)}`,
    });
  }, []);
  const overview = useCallback(
    (os: FinderOffice[]) => {
      if (os.length === 1) return place(os[0]);
      const il = os.filter((o) => o.st === 'IL');
      const set = il.length ? il : os;
      let la = 0;
      let ln = 0;
      set.forEach((o) => {
        la += o.lat;
        ln += o.lng;
      });
      la /= set.length;
      ln /= set.length;
      if (window.innerWidth > 1000) ln += 0.55; // desktop: the pins sit left of the finder panel
      setMap({
        src: `https://www.google.com/maps?q=${enc(BRAND_Q)}&ll=${la.toFixed(4)},${ln.toFixed(4)}&z=9&output=embed`,
        title: 'Map of J. Blanton Plumbing offices',
        open: `https://www.google.com/maps/search/${enc(BRAND_Q)}`,
      });
    },
    [place]
  );
  const fit = useCallback(
    (keys: string[] | null, tab: string) => {
      const os = offices.filter((o) => (keys ? keys.includes(o.key) : !tab || o.st === tab));
      if (!os.length) return;
      if (keys && os.length === 1) place(os[0]);
      else overview(keys ? offices.filter((o) => !tab || o.st === tab) : os);
    },
    [offices, overview, place]
  );

  useEffect(() => {
    const mq = window.matchMedia('(max-width:1000px)');
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener('change', on);
    fit(null, '');
    return () => mq.removeEventListener('change', on);
  }, [fit]);

  const search = (value: string) => {
    setQ(value);
    setStatus(null);
    setActive(null);
    const n = norm(value.trim());
    if (n.length < 2 || (/^\d+$/.test(n) && n.length < 5)) {
      setHits(null);
      setMsgPrefix('');
      fit(null, st);
      return;
    }
    setSt('');
    const found: Record<string, Hit[]> = {};
    const add = (k: string, h?: Hit) => {
      found[k] = found[k] ?? [];
      if (h && found[k].length < 3) found[k].push(h);
    };
    const townHit = (t: FinderTown, text: string): Hit => ({ text, ...(t.tier === 'Tier 3' && t.link ? { link: { href: t.link, name: t.name } } : {}) });
    if (/^\d+$/.test(n)) {
      const z = n.slice(0, 5);
      (zips[z] ?? []).forEach((name) => {
        if (name.startsWith('@')) return add(name.slice(1), { text: `Serves ZIP ${z}` });
        const os = offices.filter((x) => x.city === name);
        if (os.length) return os.forEach((x) => add(x.key, { text: `Serves ${name} (${z})` }));
        towns.forEach((t) => {
          if (t.name === name) add(t.office, townHit(t, `Serves ${t.name}, ${t.st} (${z})`));
        });
      });
    } else {
      offices.forEach((o) => {
        if (norm(o.name).includes(n) || norm(o.city).startsWith(n)) add(o.key);
      });
      towns.forEach((t) => {
        if (norm(t.name).startsWith(n)) add(t.office, townHit(t, `Serves ${t.name}, ${t.st}`));
      });
    }
    setHits(found);
    setMsgPrefix('');
    fit(Object.keys(found), '');
  };

  const pickTab = (tab: string) => {
    setQ('');
    setHits(null);
    setStatus(null);
    setActive(null);
    setExpanded(false);
    setSt(tab);
    setMsgPrefix('');
    fit(null, tab);
  };

  const toRow = (k: string) => {
    setActive(k);
    requestAnimationFrame(() => {
      const list = listRef.current;
      const r = document.getElementById(rowId(k));
      if (list && r && !r.hidden && list.scrollHeight > list.clientHeight) list.scrollTo({ top: r.offsetTop - list.offsetTop - 8, behavior: 'smooth' });
    });
  };

  const geo = () => {
    if (!navigator.geolocation) return;
    setStatus('Finding your location...');
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const la = p.coords.latitude;
        const ln = p.coords.longitude;
        let best = offices[0];
        let bd = Infinity;
        offices.forEach((o) => {
          const d = hav(la, ln, o.lat, o.lng);
          if (d < bd) {
            bd = d;
            best = o;
          }
        });
        setQ('');
        setSt('');
        setStatus(null);
        setHits({ [best.key]: [{ text: `Your closest office, about ${Math.round(bd)} miles away` }] });
        setMsgPrefix('');
        place(best);
        toRow(best.key);
      },
      () => setStatus('Location is off. Search by town or ZIP instead.'),
      { timeout: 8000 }
    );
  };

  const visibleKeys = offices.filter((o) => (hits ? Object.prototype.hasOwnProperty.call(hits, o.key) : !st || o.st === st)).map((o) => o.key);
  const n = visibleKeys.length;
  const searching = norm(q).length >= 2;
  const collapse = narrow && !searching && !hits && n > 5;
  const extra = new Set(collapse && !expanded ? visibleKeys.slice(4) : []);
  const countText = status ?? `${msgPrefix}${n}${n === 1 ? ' location' : ' locations'}`;

  return (
    <div className="lc-band pv-in" style={{ ['--i' as string]: 4 }}>
      <div className="lc-map" id="lc-map" ref={mapRef}>
        <iframe allowFullScreen className="lc-gmap" id="lc-gmap" loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={map?.src} title={map?.title ?? 'Map of J. Blanton Plumbing offices'} />
        <a className="lc-open" href={map?.open ?? `https://www.google.com/maps/search/${enc(BRAND_Q)}`} id="lc-open" rel="noopener" target="_blank">
          Open in Google Maps
        </a>
      </div>
      <div className="lc-panel" ref={panelRef}>
        <div className="lc-top">
          <h2 className="t-h4 lc-panel-h">{heading}</h2>
          <label className="cb-search">
            <span className="sr-only">Search by town, neighborhood or ZIP</span>
            <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input autoComplete="off" id="lc-q" onChange={(e) => search(e.target.value)} placeholder="Town, neighborhood or ZIP" type="search" value={q} />
          </label>
          <button className="lc-geo" id="lc-geo" onClick={geo} type="button">
            <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
            </svg>
            Use my location
          </button>
          {tabs ? (
            <div aria-label="Filter offices by state" className="lc-tabs" role="tablist">
              {[
                ['', 'All', counts.all],
                ['IL', 'Illinois', counts.IL],
                ['OH', 'Ohio', counts.OH],
              ].map(([key, label, c]) => (
                <button aria-selected={st === key} className="lc-tab" data-st={key} key={label} onClick={() => pickTab(String(key))} role="tab" type="button">
                  {label} <span>{c}</span>
                </button>
              ))}
            </div>
          ) : null}
          <span aria-live="polite" className="t-eyebrow lc-count" id="lc-count">
            {countText}
          </span>
        </div>
        <ul className="lc-list" id="lc-list" ref={listRef}>
          {offices.map((o) => {
            const on = visibleKeys.includes(o.key);
            const lines = hits && on ? hits[o.key] ?? [] : [];
            const cls = ['lc-row', (hits && on && lines.length) || active === o.key ? 'is-on' : '', extra.has(o.key) ? 'is-extra' : ''].filter(Boolean).join(' ');
            return (
              <li
                className={cls}
                data-key={o.key}
                data-st={o.st}
                hidden={!on}
                id={rowId(o.key)}
                key={o.key}
                onClick={(ev) => {
                  if ((ev.target as Element).closest('a')) return;
                  toRow(o.key);
                  place(o);
                  if (narrow) mapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
              >
                <h3>{o.name}</h3>
                <p className="lc-addr">{o.address}</p>
                <div className="lc-meta">
                  <a data-wc-ignore="" href={telHref(o.phone)}>
                    <PhoneGlyph />
                    {o.phone}
                  </a>
                  <a className="lc-go" href={o.url}>
                    View office <span aria-hidden="true">→</span>
                  </a>
                </div>
                <div className="lc-hits">
                  {lines.map((h, i) => (
                    <p className="lc-serves" key={i}>
                      {h.text}
                      {h.link ? (
                        <>
                          {' · '}
                          <a href={h.link.href}>{`Plumbers in ${h.link.name}`}</a>
                        </>
                      ) : null}
                    </p>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
        <button
          aria-controls="lc-list"
          aria-expanded={expanded}
          className="lc-more"
          hidden={!collapse}
          id="lc-more"
          onClick={() => {
            const next = !expanded;
            setExpanded(next);
            if (!next && panelRef.current) window.scrollTo({ top: panelRef.current.getBoundingClientRect().top + window.pageYOffset - 90, behavior: 'smooth' });
          }}
          type="button"
        >
          {expanded ? 'Show fewer offices' : `Show all ${n} offices`}
        </button>
        <p className="lc-empty" hidden={n > 0} id="lc-empty">
          {n > 0 ? null : (
            <>
              {`We don’t list “${q}” yet. We may still serve it: `}
              <a href={phoneHref}>call us 24/7</a>
              {' and we’ll let you know, or '}
              <a href="#areas">see all the areas we serve</a>.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
