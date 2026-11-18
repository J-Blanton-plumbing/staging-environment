/**
 * Brief 229 — the "Type your town" search box of the service-areas panel, as plain server markup.
 * CityHubRoot wires it (`wireServiceAreasSearch` in ./behaviors.ts) on a `.pruned` root; until then the
 * list simply stays unfiltered. The panel carries `data-phone-href` for the no-match line's call link.
 */
export default function SearchBox() {
  return (
    <label className="cb-search">
      <span className="sr-only">Search your town</span>
      <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input autoComplete="off" data-cb-input="" placeholder="Type your town" type="search" />
    </label>
  );
}
