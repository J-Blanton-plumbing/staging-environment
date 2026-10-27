'use client';

import '@/styles/home-2026.css';

/**
 * Homepage 2026 (Brief 220) — the ONE importer of src/styles/home-2026.css. Renders nothing.
 *
 * Same reason as `CityHubStyles` / `ArticleV2Styles` (CLAUDE.md gotcha 25): `src/app/page.tsx`
 * imports BOTH homepage records, so a plain CSS import anywhere in that graph would be linked on `/`
 * while the Classic homepage is live — changing its bytes. Loaded with `next/dynamic` from the client
 * `Home2026Root`, this module and its CSS land in an async chunk Next links only when Homepage 2026
 * renders (server-side too, so there is no flash of unstyled content).
 */
export default function Home2026Styles() {
  return null;
}
