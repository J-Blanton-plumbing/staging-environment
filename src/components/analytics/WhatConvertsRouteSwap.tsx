'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

/**
 * Drives the WhatConverts number swap on this App Router site, and keeps it
 * applied. Everything here exists because the vendor script assumes a classic
 * multi-page site and this is a hydrated SPA.
 *
 * THREE PROBLEMS IT SOLVES.
 *
 * 1. Hydration undoing the swap (the revenue-critical one). The vendor script
 *    mutates the DOM on DOMContentLoaded. React then hydrates, compares the live
 *    DOM against the server-rendered HTML, and on a TEXT mismatch patches the
 *    node back to the server value — i.e. straight back to the default number.
 *    Whether that happens is a pure race: with the script cached and the mapping
 *    already in the `wc_swap` cookie the swap lands early and loses. That is the
 *    reported "swaps, then swaps back to default". So the script is injected
 *    from an effect, which React only runs AFTER hydration has committed — the
 *    swap can no longer be overwritten by it. The cost is that the default
 *    number is briefly visible, which is inherent to any DNI setup.
 *
 * 2. Client-side navigation. The vendor script swaps exactly once and installs
 *    no MutationObserver and no pushState/popstate hook (verified by reading the
 *    shipped source). After a <Link> navigation React mounts fresh markup
 *    carrying the original number and nothing swaps it, so only the landing page
 *    would ever be tracked. Hence the re-injection on every pathname change.
 *
 * 3. Anything else that resurfaces the original number — a re-render, a cached
 *    RSC tree restored on back-navigation (this app runs the `staleTimes`
 *    experiment), a late-mounting section. The watchdog below catches those
 *    without needing to know why they happened.
 *
 * WHY RE-INJECTING IS SAFE, from the vendor source: the one-time reporting
 * beacon is guarded by profile-keyed globals (`…_102905`) that persist across
 * executions; once the `wc_swap` cookie exists a repeat run re-applies the
 * cached mapping with no network call, so no extra pool number is consumed; and
 * `form_init()` always removeEventListener's a handler before re-adding it.
 * Known cost: one extra anonymous document `click` listener per injection,
 * each calling the idempotent `form_init()`.
 *
 * `$wc_leads` is deliberately NOT refreshed — it is a frozen snapshot of the
 * entry URL and referrer, which is what a lead should be credited to. See
 * WHATCONVERTS_BOOTSTRAP in src/lib/whatconverts.ts.
 *
 * To exempt a number from swapping, give its element the vendor's `no-swap`
 * class; the DOM walker skips those subtrees.
 */
export default function WhatConvertsRouteSwap({ src }: { src: string }) {
  const pathname = usePathname();
  // Guards against two injections racing each other (e.g. the watchdog firing
  // while a navigation-triggered injection is still in flight).
  const injecting = useRef(false);

  useEffect(() => {
    const inject = () => {
      if (injecting.current) return;
      injecting.current = true;
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.setAttribute('data-wc-reswap', '');
      const done = () => {
        injecting.current = false;
        // Drop the tag so a long session doesn't accumulate a dead <script>
        // node per navigation. The code has already executed by now.
        script.remove();
      };
      script.addEventListener('load', done);
      script.addEventListener('error', done);
      document.head.appendChild(script);
    };

    // Runs after hydration commits on first mount, and after React has painted
    // the new page on every subsequent navigation.
    inject();

    // ── Watchdog ────────────────────────────────────────────────────────────
    // Re-swaps if the original number ever reappears. Reads the mapping the
    // vendor itself cached: `wc_swap` holds triplets joined by "+..+" as
    // [trackingNumber, originalNumber, keywordId, …]. No mapping (no pool
    // number assigned for this visitor) means there is nothing to restore and
    // the watchdog stays inert.
    const digitsOf = (value: string) => value.replace(/\D/g, '');

    const mappedOriginals = () => {
      const raw = document.cookie.match(/(?:^|;\s*)wc_swap=([^;]*)/)?.[1];
      if (!raw) return [];
      const parts = decodeURIComponent(raw).split('+..+');
      const originals: string[] = [];
      for (let i = 0; i + 1 < parts.length; i += 3) {
        const original = digitsOf(parts[i + 1] ?? '');
        if (original.length >= 10) originals.push(original);
      }
      return originals;
    };

    // Only the tel: anchors are checked — they are the elements that carry the
    // number, and there are a handful, so this stays cheap enough to run on
    // every mutation batch. Both the href and the visible text are inspected:
    // React's hydration patches TEXT but leaves attributes alone, so a revert
    // can show up in one and not the other.
    const hasRevertedNumber = () => {
      const originals = mappedOriginals();
      if (!originals.length) return false;
      return Array.from(document.querySelectorAll('a[href^="tel:"]')).some((anchor) => {
        const href = digitsOf(anchor.getAttribute('href') ?? '');
        const text = digitsOf(anchor.textContent ?? '');
        return originals.some((o) => href.includes(o) || text.includes(o));
      });
    };

    let queued = false;
    const observer = new MutationObserver(() => {
      if (queued || injecting.current) return;
      queued = true;
      // Coalesce a mutation burst (hydration, a route render) into one check.
      setTimeout(() => {
        queued = false;
        if (hasRevertedNumber()) inject();
      }, 300);
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributeFilter: ['href'],
    });

    // A single delayed sweep covers a revert that produces no further mutations
    // after the observer is attached.
    const sweep = window.setTimeout(() => {
      if (hasRevertedNumber()) inject();
    }, 1500);

    return () => {
      observer.disconnect();
      window.clearTimeout(sweep);
    };
  }, [pathname, src]);

  return null;
}
