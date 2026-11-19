/**
 * Brief 229 — the City Pruning Phase 1 Pilot's PAGE MAP, dependency-free (no redirect JSON), so the
 * footer, the footer schema and the client-safe paths can import it without pulling the
 * redirect map into their bundles. src/lib/city-pruning/phase1.ts re-exports all of it.
 */

/** New hub slug → the legacy slug whose row, office record and ratings it carries. */
export const PILOT_HUBS: Readonly<Record<string, string>> = Object.freeze({
  'mokena-il': 'mokena',
  'tinley-park-il': 'tinley-park',
  'skokie-il': 'skokie',
});

export interface PilotTown {
  /** The legacy registry slug (`/frankfort`), now a 301 source. */
  legacy: string;
  /** The new hub slug whose office serves the town and whose service pages the town links to. */
  hub: string;
  name: string;
}

/** The 7 Tier 3 town pages (README §2), in the package's order. */
export const PILOT_TOWNS: Readonly<Record<string, PilotTown>> = Object.freeze({
  'frankfort-il': { legacy: 'frankfort', hub: 'mokena-il', name: 'Frankfort' },
  'orland-park-il': { legacy: 'orland-park', hub: 'tinley-park-il', name: 'Orland Park' },
  'park-forest-il': { legacy: 'park-forest', hub: 'tinley-park-il', name: 'Park Forest' },
  'park-ridge-il': { legacy: 'park-ridge', hub: 'skokie-il', name: 'Park Ridge' },
  'niles-il': { legacy: 'niles', hub: 'skokie-il', name: 'Niles' },
  'morton-grove-il': { legacy: 'morton-grove', hub: 'skokie-il', name: 'Morton Grove' },
  'lincolnwood-il': { legacy: 'lincolnwood', hub: 'skokie-il', name: 'Lincolnwood' },
});

/** The legacy (office / ratings / content) slug of a pilot page: a hub's own legacy slug, a town's hub's. */
export function pilotOfficeSlug(slug: string): string | null {
  if (PILOT_HUBS[slug]) return PILOT_HUBS[slug];
  const town = PILOT_TOWNS[slug];
  return town ? PILOT_HUBS[town.hub] ?? null : null;
}

/** The new pilot page of a legacy office slug (`mokena` → `mokena-il`), else null. */
export function pilotPageOfOffice(officeSlug: string): string | null {
  for (const [hub, legacy] of Object.entries(PILOT_HUBS)) if (legacy === officeSlug) return hub;
  return null;
}

/** An office's page path: its pilot page when it has one (`/mokena-il`), else `/{slug}`, unchanged. */
export function officePagePath(officeSlug: string): string {
  return `/${pilotPageOfOffice(officeSlug) ?? officeSlug}`;
}
