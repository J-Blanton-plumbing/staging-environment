'use client';

import './pruning.css';

/**
 * Brief 229 — the ONE importer of pruning.css (the City Pruning pilot pages' stylesheet). Renders
 * nothing. Loaded with `next/dynamic` from the CLIENT component `CityHubRoot`, which renders it only on a
 * `.pruned` root (the pilot pages), so the CSS lands in an async chunk linked on those pages only (CLAUDE.md
 * gotcha 25) — never on a control hub, whose markup and stylesheet stay byte-identical.
 */
export default function PruningStyles() {
  return null;
}
