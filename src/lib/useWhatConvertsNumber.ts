'use client';

import { useEffect, useState } from 'react';

/**
 * Returns the WhatConverts tracking number for this visitor, so React can RENDER
 * it rather than have it patched into the DOM afterwards.
 *
 * WHY THIS EXISTS — the whole class of bug this ends.
 *
 * WhatConverts does dynamic number insertion by mutating the DOM: it rewrites
 * phone text nodes and `href` attributes after the page loads. React also owns
 * those nodes. The two fight, and React wins whenever it re-renders or
 * re-creates an element, because it writes `phoneHref` back from props. Patching
 * the DOM again afterwards only ever narrows the window; it never closes it.
 *
 * On iOS that window is not merely narrow, it is in the wrong place. Safari
 * resolves a `tel:` link's target from the touch gesture, not after event
 * dispatch the way desktop browsers do. So a repair applied during the click
 * lands too late to change what actually gets dialled — which is exactly the
 * confirmed failure: the button rendered the tracking number and dialled the
 * default one. Mutating `href` mid-gesture also appears to break the link for
 * subsequent taps, matching the report that the button stops working after one
 * tap and a cancel.
 *
 * The fix is to stop fighting. React renders the tracking number itself, so the
 * href is already correct before any tap, nothing mutates during the gesture,
 * and a re-render re-renders the CORRECT value instead of reverting it.
 *
 * Hydration safety: this returns null on the first render so the client's markup
 * matches the server's, then updates in an effect. Seeding state from the cookie
 * directly would be a hydration mismatch and React would patch it straight back.
 *
 * The mapping comes from the `wc_swap` cookie the vendor script populates:
 * triplets joined by "+..+" as [trackingNumber, originalNumber, keywordId, …].
 * Polling is bounded — the cookie appears once the vendor's round-trip finishes
 * (or immediately for a returning visitor), so there is no reason to watch
 * forever.
 */

export interface SwappedNumber {
  /** Display form, e.g. `773-364-1541`. */
  display: string;
  /** Dial target, e.g. `tel:773-364-1541`. */
  href: string;
}

const digitsOf = (value: string) => value.replace(/\D/g, '');

/** 7733641541 → 773-364-1541, matching the format used sitewide. */
function formatUs(digits: string): string {
  return digits.length === 10
    ? `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
    : digits;
}

/**
 * Reads the tracking number that replaces `originalDisplay`. Returns null when
 * no pool number has been assigned — in which case the caller must keep showing
 * its own default, which is correct behaviour and not a failure.
 */
function readSwap(originalDisplay: string): SwappedNumber | null {
  if (typeof document === 'undefined') return null;
  const raw = document.cookie.match(/(?:^|;\s*)wc_swap=([^;]*)/)?.[1];
  if (!raw) return null;

  const wanted = digitsOf(originalDisplay);
  const parts = decodeURIComponent(raw).split('+..+');
  for (let i = 0; i + 1 < parts.length; i += 3) {
    const tracking = digitsOf(parts[i] ?? '');
    const original = digitsOf(parts[i + 1] ?? '');
    // Both must be complete. A blank would otherwise match anything and swap a
    // number the pool never mapped.
    if (tracking.length !== 10 || original.length !== 10) continue;
    if (wanted && original !== wanted) continue;
    const display = formatUs(tracking);
    return { display, href: `tel:${display}` };
  }
  return null;
}

export function useWhatConvertsNumber(originalDisplay: string): SwappedNumber | null {
  const [swapped, setSwapped] = useState<SwappedNumber | null>(null);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    const check = () => {
      if (cancelled) return;
      const next = readSwap(originalDisplay);
      if (next) {
        // Only set when the value actually changes, so this never loops.
        setSwapped((prev) => (prev?.href === next.href ? prev : next));
        return true;
      }
      return false;
    };

    if (check()) return;

    // ~15s of polling: long enough for the vendor's number request on a slow
    // mobile connection, short enough not to run for the life of the page.
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
