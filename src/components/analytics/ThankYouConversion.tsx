'use client';

import { useEffect, useRef } from 'react';

/**
 * Brief 174 (Track B) — fires the Google Ads "Schedule Service Form Submit"
 * conversion once per visit to `/thank-you`.
 *
 * Google's instructions for this conversion are the generic copy-paste snippet
 * they hand to a static HTML site:
 *
 *   <script>gtag('event','conversion',{'send_to':'AW-…/…'});</script>
 *
 * placed in the thank-you page. Pasted literally into
 * `src/app/thank-you/page.tsx` that snippet would be WRONG HERE, and wrong in
 * the quiet way: an inline <script> in a server component executes on a full
 * document load and never again. `/thank-you` is reached by
 * `router.push('/thank-you')` from the scheduling modal — a client-side
 * navigation, which streams an RSC payload and runs no injected script tags. So
 * the snippet would appear to work on a hard refresh in QA and silently never
 * fire on the one path real traffic uses. Hence a client component with an
 * effect: it runs on mount, and mounting is exactly what both arrival paths
 * have in common.
 *
 * Renders no DOM. Mounted from `src/app/thank-you/page.tsx`, and only when the
 * env-sourced `send_to` is present and valid (`src/lib/analytics.ts`) — a blank
 * or malformed value means this component is never rendered at all, so no
 * conversion code reaches the page and no request is made.
 *
 * Deliberately NOT here: a `page_view`. `Analytics.tsx` already sends one per
 * route change for every platform (Brief 128, Track B). This component owns the
 * conversion event and nothing else.
 */

/** How often to re-check for `window.gtag` while it is still loading. */
const GTAG_POLL_INTERVAL_MS = 200;

/** How long to keep re-checking before giving up silently. */
const GTAG_POLL_CEILING_MS = 5000;

export default function ThankYouConversion({ sendTo }: { sendTo: string }) {
  /**
   * Once-per-mount latch.
   *
   * A `useRef`, NOT a module-scope boolean. Module scope would survive the
   * whole browser session, so a visitor who submits a second request in the
   * same tab would get no second conversion — the opposite bug from the one
   * being guarded against. A ref is per component instance, which is precisely
   * "per visit to this page": it persists across React StrictMode's
   * double-invoked effects in dev (same instance, so the second run sees the
   * latch already set and does nothing), and it resets on a genuine unmount and
   * remount when the visitor navigates away and comes back. Same reasoning as
   * the "last URL a pageview was sent for" ref in `Analytics.tsx`.
   */
  const firedRef = useRef(false);

  useEffect(() => {
    if (!sendTo) return;
    if (firedRef.current) return;

    /**
     * Fires if gtag is there, reports whether it is safe to stop waiting.
     * `typeof window.gtag === 'function'` is checked every time and never
     * assumed: the whole tag block is env-gated, so on a build with tracking
     * disabled the global simply never appears.
     */
    function fire(): boolean {
      if (typeof window.gtag !== 'function') return false;
      if (firedRef.current) return true;
      firedRef.current = true;
      window.gtag('event', 'conversion', { send_to: sendTo });
      return true;
    }

    // The load race. gtag.js is injected with `strategy="afterInteractive"`, so
    // on a HARD load of /thank-you this effect can easily run first and find no
    // `window.gtag`. On a client-side navigation it is already there and the
    // first call below fires immediately, with no timer at all.
    //
    // Not solved by pushing straight into `window.dataLayer`: the array only
    // replays once gtag.js has loaded AND the `gtag('js')`/`gtag('config')`
    // bootstrap has run. Queueing a conversion ahead of its own `config` call
    // is the documented way to get a hit attributed to nothing. Waiting for the
    // real function is the honest fix.
    if (fire()) return;

    // Wall-clock deadline, NOT a tick count. Counting elapsed as
    // `ticks * GTAG_POLL_INTERVAL_MS` looks equivalent and is not: a browser
    // throttles setInterval to ~1s in a backgrounded tab, so a tick-counted
    // ceiling silently stretches to ~25 seconds — measured at 7.5s real time
    // reaching only 1.4s of "elapsed" during verification. `Date.now()` makes
    // the ceiling mean what it says on any tab.
    const deadline = Date.now() + GTAG_POLL_CEILING_MS;
    const timer = setInterval(() => {
      // Give up silently at the deadline. If gtag has not appeared in five
      // seconds it is blocked, offline, or switched off — none of which is
      // something a confirmation page should surface to a visitor.
      if (fire() || Date.now() >= deadline) clearInterval(timer);
    }, GTAG_POLL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [sendTo]);

  return null;
}
