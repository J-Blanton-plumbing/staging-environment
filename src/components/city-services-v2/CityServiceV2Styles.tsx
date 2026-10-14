'use client';

import './city-services-v2.css';

/**
 * City Service Pages V2 (Brief 209) — the ONE importer of city-services-v2.css. Renders nothing.
 *
 * Same reason as `CityHubStyles` / `ArticleV2Styles` (CLAUDE.md gotcha 25): `[city]/[service]/page.tsx`
 * imports the V2 view for every `/{city}/{service}` request, so a plain CSS import anywhere in that
 * graph would be linked on all ~11,000 city-service pages. Loaded with `next/dynamic` from the client
 * `CityServiceV2Root`, this module and its CSS land in an async chunk that Next links only when a V2
 * page renders (server-side too, so there is no flash of unstyled content).
 */
export default function CityServiceV2Styles() {
  return null;
}
