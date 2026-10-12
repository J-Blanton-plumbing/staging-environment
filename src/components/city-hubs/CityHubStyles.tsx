'use client';

import './city-hubs.css';

/**
 * City Hubs V2 (Brief 205) — the ONE importer of city-hubs.css. Renders nothing.
 *
 * Same reason as `ArticleV2Styles` (Brief 190, CLAUDE.md gotcha 25): `[city]/page.tsx` imports
 * the city hub view for every `/{city}` request, so a plain CSS import anywhere in that graph
 * would be linked on all ~250 city pages. Loaded with `next/dynamic` from the client
 * `CityHubRoot`, this module and its CSS land in an async chunk that Next links only when a hub
 * renders (server-side too, so there is no flash of unstyled content).
 */
export default function CityHubStyles() {
  return null;
}
