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

    /**
     * The mapping the vendor itself cached, as [tracking, original] pairs.
     * `wc_swap` holds triplets joined by "+..+":
     * [trackingNumber, originalNumber, keywordId, …].
     */
    const mappings = () => {
      const raw = document.cookie.match(/(?:^|;\s*)wc_swap=([^;]*)/)?.[1];
      if (!raw) return [] as Array<{ tracking: string; original: string }>;
      const parts = decodeURIComponent(raw).split('+..+');
      const pairs: Array<{ tracking: string; original: string }> = [];
      for (let i = 0; i + 1 < parts.length; i += 3) {
        const tracking = digitsOf(parts[i] ?? '');
        const original = digitsOf(parts[i + 1] ?? '');
        // Both must be full numbers. A blank here would make the `includes`
        // checks below match everything and rewrite unrelated links.
        if (tracking.length === 10 && original.length === 10) {
          pairs.push({ tracking, original });
        }
      }
      return pairs;
    };

    const mappedOriginals = () => mappings().map((m) => m.original);

    /** 7733641541 → 773-364-1541, matching the format used sitewide. */
    const formatUs = (digits: string) =>
      digits.length === 10
        ? `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
        : digits;

    /**
     * Repairs tel: anchors directly, instead of re-running the vendor script and
     * hoping it wins.
     *
     * This exists because of a confirmed production failure: on iOS the hero
     * button rendered the tracking number while the header's icon-only call
     * button still DIALLED 773-724-9272 — the visible text was swapped and the
     * href was not. React owns that attribute; when it re-creates the element it
     * writes `phoneHref` back from props, and the vendor script has already run
     * its single pass and will not revisit it. Re-injecting the script is both
     * slower (a network fetch) and unreliable (the same race can repeat), so the
     * href is rewritten in place from the cached mapping instead. No network, no
     * dependency on vendor internals, and it cannot lose to a re-render.
     *
     * The dialled number is the revenue-critical value: a reverted href sends the
     * call to an untracked line and the lead is attributed to nothing, while the
     * page still LOOKS correct. That asymmetry is exactly what made this hard to
     * spot.
     */
    const repairTelAnchors = () => {
      const pairs = mappings();
      if (!pairs.length) return;
      Array.from(document.querySelectorAll('a[href^="tel:"]')).forEach((anchor) => {
        const href = anchor.getAttribute('href') ?? '';
        const hrefDigits = digitsOf(href);
        const hit = pairs.find((m) => hrefDigits.includes(m.original));
        if (hit) anchor.setAttribute('href', `tel:${formatUs(hit.tracking)}`);

        // The inverse case — href swapped, visible text reverted by hydration.
        // Walks ALL descendant text nodes, not just direct children: several
        // CTAs wrap the number in a <span> (CategoryHero, the mobile drawer), and
        // a direct-children-only pass left those reading the original number.
        // Still scoped to inside the anchor, so no unrelated body copy is touched.
        const textNodes: Text[] = [];
        const walker = document.createTreeWalker(anchor, NodeFilter.SHOW_TEXT);
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          textNodes.push(n as Text);
        }
        textNodes.forEach((node) => {
          const text = node.nodeValue ?? '';
          const textDigits = digitsOf(text);
          const textHit = pairs.find((m) => textDigits.includes(m.original));
          if (!textHit) return;
          // Rebuild from the digits actually present so the on-screen separator
          // style survives (773-724-9272 vs (773) 724-9272 vs 773.724.9272).
          const pattern = new RegExp(
            textHit.original.split('').join('[^0-9]?'),
            'g',
          );
          node.nodeValue = text.replace(pattern, formatUs(textHit.tracking));
        });
      });
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

    // Repair immediately. For a visitor who already has a mapping cached this
    // applies the swap synchronously, before the vendor script has even loaded.
    repairTelAnchors();

    let queued = false;
    const observer = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      // Coalesce a mutation burst (hydration, a route render) into one pass.
      // repairTelAnchors mutates the DOM and so re-triggers this observer, but
      // the second pass finds nothing left to fix and stops — no loop.
      setTimeout(() => {
        queued = false;
        if (hasRevertedNumber()) repairTelAnchors();
      }, 150);
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributeFilter: ['href'],
    });

    // Last line of defence, and the only one whose timing is guaranteed: repair
    // during the CAPTURE phase of a click on any tel: link, before the browser
    // reads the href to place the call. The observer and sweeps below close the
    // window to ~150ms, but "small window" is not good enough for the dialled
    // number — this makes it zero. The browser resolves the default action after
    // event dispatch finishes, so an href rewritten here is the one that dials.
    //
    // Deliberately passive: it never calls preventDefault and never returns
    // false, so the link keeps behaving like a link. An earlier debugging
    // iteration hung a preventDefault on this element and killed the second tap;
    // that must not happen to a real visitor.
    const onClickCapture = (event: Event) => {
      const target = event.target as Element | null;
      if (target?.closest?.('a[href^="tel:"]')) repairTelAnchors();
    };
    document.addEventListener('click', onClickCapture, true);
    // iOS can commit to a tel: navigation off the touch sequence, so repair on
    // first contact too rather than waiting for the synthesized click.
    document.addEventListener('touchstart', onClickCapture, true);

    // Belt and braces: React can reclaim an attribute at a moment that produces
    // no observable mutation of its own, and the pool number may not arrive
    // until the vendor script's round-trip completes. These sweeps cover both.
    const sweeps = [300, 1200, 3000, 6000].map((delay) =>
      window.setTimeout(() => {
        if (hasRevertedNumber()) repairTelAnchors();
      }, delay),
    );

    return () => {
      observer.disconnect();
      sweeps.forEach(window.clearTimeout);
      // Must be removed. The effect re-runs on every pathname change, so leaking
      // these would stack one pair of listeners per navigation — the same
      // unbounded accumulation that made the old re-injecting watchdog degrade
      // the page until taps stopped registering.
      document.removeEventListener('click', onClickCapture, true);
      document.removeEventListener('touchstart', onClickCapture, true);
    };
  }, [pathname, src]);

  return null;
}
