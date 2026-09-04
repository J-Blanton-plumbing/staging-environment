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
  /**
   * Brief 107 (Track B) — controls whether this office appears in the footer's
   * office directory. Optional; absent/undefined is treated as `true` (shown)
   * so pre-existing records default to the current footer output unchanged.
   * Does NOT affect `LocalBusinessSchema` — see that component's docblock.
   */
  showInFooter?: boolean;
}

/** `${streetAddress}, ${city}, ${state} ${zip}` — the single-line NAP/footer format used everywhere. */
export function formatOfficeAddress(o: CmsOffice): string {
  return `${o.streetAddress}, ${o.city}, ${o.state} ${o.zip}`;
}

/**
 * The office's Google link — its real Google Business Profile / Maps URL when
 * one is known, else a Maps search URL built from the formatted address (Brief
 * 171, Track A2).
 *
 * ⚠️ CURRENTLY HAS NO CALLER, and that is worth knowing before you rely on it.
 * It was written for the store locator's row links, which briefly pointed each
 * office's address at its Google Business Profile. Marketing's review removed
 * that link — a row now selects the office and centres the embedded map instead
 * of sending the visitor off-site — so nothing calls this today.
 *
 * It is kept rather than deleted because the behaviour it encodes is still the
 * right answer wherever a GBP link IS rendered, and it is the guard for the
 * SIXTEENTH office: `/admin/global-settings` lets a human add an office and save
 * it before they have hunted down its GBP short link, and `mapUrl` is a plain
 * text input with no required-field validation. Without this, such an office
 * renders `href=""` — a link that navigates to the current page.
 *
 * Deliberately NOT retrofitted into `Footer.tsx` or the city-page NAP blocks:
 * those render `office.mapUrl` inside an `{office.url && …}` guard, so they
 * currently HIDE a missing link rather than emitting a dead one, and changing
 * that is a behaviour change on ~390 pages that no brief has asked for. Either
 * of those is the obvious next consumer; until one adopts it, this is dead code
 * with a reason.
 */
export function officeMapUrl(o: CmsOffice): string {
  const explicit = o.mapUrl.trim();
  if (explicit) return explicit;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formatOfficeAddress(o))}`;
}
