'use client';

import { useEffect, useState } from 'react';
import { formatUs, resolveSwap, type ResolvedSwap } from './whatconverts-swap';

/**
 * Returns the WhatConverts tracking number for this visitor so React can RENDER
 * it, rather than having the vendor patch it into DOM that React owns.
 *
 * WHY. WhatConverts does dynamic number insertion by mutating the DOM after load.
 * React also owns those nodes, and re-renders from props — so it reverts the
 * swap, and patching afterwards can only narrow the window, never close it. On
 * iOS this is worse than a narrow window: Safari resolves a tel: target from the
 * touch gesture, so a repair applied at click time lands too late to change what
 * is dialled.
 *
 * Confirmed in the field: once the site header rendered this value through React
 * it dialled correctly on the device that had been failing, while server-rendered
 * CTAs still relying on the vendor's DOM patch continued to display the tracking
 * number and dial the default one. React ownership works where patching does not,
 * which is why this hook backs every phone CTA rather than just the header.
 *
 * Hydration safety: returns null on first render so client markup matches the
 * server, then updates in an effect. Seeding from storage during render would be
 * a hydration mismatch and React would patch it straight back.
 *
 * Sources and their precedence live in ./whatconverts-swap — deliberately more
 * than just the cookie, because a device where the cookie is unreadable is one of
 * the shapes that produces "shows swapped, dials default".
 */

export interface SwappedNumber {
  /** Display form, e.g. `773-364-1541`. */
  display: string;
  /** Dial target, e.g. `tel:773-364-1541`. */
  href: string;
  /** Which evidence source resolved it — see ./whatconverts-swap. */
  source: ResolvedSwap['source'];
}

export function useWhatConvertsNumber(originalDisplay: string): SwappedNumber | null {
  const [swapped, setSwapped] = useState<SwappedNumber | null>(null);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    const check = () => {
      if (cancelled) return true;
      const resolved = resolveSwap(originalDisplay);
      if (!resolved) return false;
      const display = formatUs(resolved.pair.tracking);
      const next: SwappedNumber = {
        display,
        href: `tel:${display}`,
        source: resolved.source,
      };
      // Only set on change, so this can never loop.
      setSwapped((prev) =>
        prev?.href === next.href && prev?.source === next.source ? prev : next,
      );
      return true;
    };

    if (check()) return;

    // ~15s of polling: long enough for the vendor's number request on a slow
    // mobile connection, short enough not to run for the life of the page. Also
    // gives the DOM-derived sources time to see the vendor's own swap land.
    const timer = window.setInterval(() => {
      attempts += 1;
      if (check() || attempts > 30) window.clearInterval(timer);
    }, 500);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [originalDisplay]);

  return swapped;
}
