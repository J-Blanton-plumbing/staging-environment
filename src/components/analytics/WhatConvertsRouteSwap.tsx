'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

/**
 * Re-applies WhatConverts' number swap after client-side navigations.
 *
 * WHY THIS IS NEEDED — the vendor script (`<host>/<profile>.js`) swaps numbers
 * exactly once, on DOM ready: it walks `document.body` recursively and rewrites
 * matching text nodes plus `href`/`title`/`data-actions` attributes. Inspecting
 * the shipped script confirms it installs NO MutationObserver and NO
 * `pushState`/`popstate` hook. That was fine on WordPress, where every page was
 * a full document load, but this site is an App Router SPA: after a <Link>
 * navigation React mounts fresh markup containing the ORIGINAL number from
 * Global Settings, and nothing swaps it back. Only the very first page a
 * visitor landed on would ever be tracked.
 *
 * WHY RE-INJECTING THE SCRIPT IS THE RIGHT FIX. The swap routine is a closure
 * with no exported handle, so it cannot be called directly, and re-deriving the
 * mapping ourselves would mean reimplementing the vendor's number-format regex
 * against an undocumented cookie layout. Re-running the script is safe here,
 * which the shipped source bears out:
 *   - It is idempotent for beacons. The one-time reporting POST is guarded by
 *     profile-keyed globals (`…_102905`) that persist across re-executions.
 *   - It does not burn pool numbers. Once the `wc_swap` cookie exists it
 *     re-applies the cached original→tracking mapping with no network call.
 *   - It does not double-bind lead tracking. Its `form_init()` always
 *     `removeEventListener`s a handler before re-adding it, and the script
 *     already re-runs `form_init()` on every document click by design.
 * Known cost: each re-execution adds one more anonymous document-level `click`
 * listener that calls the (idempotent) `form_init()`. It is bounded by
 * navigations in a session and each call is cheap, so we accept it rather than
 * fork the vendor's swap logic.
 *
 * The effect runs after React commits, so the new page's markup — and its
 * unswapped numbers — is already in the DOM when the script re-scans it.
 *
 * NOTE: `$wc_leads` is intentionally NOT refreshed on navigation. It is a
 * frozen snapshot of the entry URL and referrer, which is what attribution
 * should be credited to. See WHATCONVERTS_BOOTSTRAP in src/lib/whatconverts.ts.
 *
 * To keep a specific number from ever being swapped, give its element the
 * vendor's `no-swap` class — the DOM walker skips those subtrees.
 */
export default function WhatConvertsRouteSwap({ src }: { src: string }) {
  const pathname = usePathname();
  // The initial page load is already covered by the tags rendered into the
  // document itself; only subsequent navigations need a re-scan.
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.setAttribute('data-wc-reswap', '');
    // The script has executed by the time either fires; drop the tag so a long
    // session doesn't accumulate one dead <script> node per navigation.
    const remove = () => script.remove();
    script.addEventListener('load', remove);
    script.addEventListener('error', remove);
    document.head.appendChild(script);
  }, [pathname, src]);

  return null;
}
