/**
 * Office/service-center location type + formatting helper (Brief 102, Track C).
 *
 * Deliberately DB-free (no `@/lib/db` import) — `global-settings.ts` re-exports
 * these, but public components that only need the shape/formatter (e.g.
 * `Footer.tsx`, rendered from the client `SiteShell`) must import from HERE
 * instead of `global-settings.ts`, whose module-scope `import pool from
 * '@/lib/db'` pulls the Node-only `pg` package into any bundle that imports it —
 * including a client bundle, where `fs`/`net`/`tls` don't resolve and the build
 * fails outright.
 */

/**
 * A single office/service-center location — the single source of truth for
 * every address printed on the public site (footer, contact, locations, and the
 * city templates' NAP blocks), plus the Track D LocalBusiness JSON-LD. `mapUrl`
 * and `lat`/`lng` are used for the NAP "Local Office:" link and structured-data
 * `geo` respectively; `lat`/`lng` may be blank (schema stays valid without them —
 * see `LocalBusinessSchema.tsx`).
 */
export interface CmsOffice {
  /** Route slug — footer/schema link to `/${slug}`; also the city→office dispatch key (see cities/index.ts). */
  slug: string;
  /** Display name, e.g. "Northbrook (Corporate)". */
  name: string;
  streetAddress: string;
  city: string;
  state: string;
  zip: string;
  /** Google Maps link shown in the city-page NAP block. Blank when none is known. */
  mapUrl: string;
  lat: number | null;
  lng: number | null;
}

/** `${streetAddress}, ${city}, ${state} ${zip}` — the single-line NAP/footer format used everywhere. */
export function formatOfficeAddress(o: CmsOffice): string {
  return `${o.streetAddress}, ${o.city}, ${o.state} ${o.zip}`;
}
