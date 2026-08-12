'use client';

/**
 * Resolves the WhatConverts original→tracking number mapping for this visitor,
 * from whichever evidence is actually available in the browser.
 *
 * WHY MULTIPLE SOURCES. The first version of this read only the `wc_swap`
 * cookie. That is fragile in exactly the situation being debugged: a mobile
 * browser where the header button displays the tracking number but dials the
 * default one. If the cookie is unreadable — Safari's tracking prevention,
 * cookie partitioning, private browsing, a blocker that clears it — then the
 * cookie-only lookup yields nothing, React renders the DEFAULT href, and yet the
 * vendor's own in-memory swap has still rewritten the server-rendered markup. The
 * page then shows a swapped number and dials an untracked one, which is precisely
 * the reported symptom.
 *
 * So the mapping is resolved from four sources, cheapest and most authoritative
 * first:
 *
 *   1. the `wc_swap` cookie — what the vendor writes first;
 *   2. `localStorage.wc_swap` — the vendor writes this too, and it survives some
 *      conditions the cookie does not;
 *   3. a tel: anchor whose href digits differ from the default — i.e. read back
 *      what the vendor actually managed to apply to the DOM;
 *   4. a tel: anchor whose visible TEXT digits differ from the default — covers
 *      the case where the vendor swapped the text but not the attribute, which is
 *      the only shape that explains "shows swapped, dials default" on a page
 *      whose storage is intact.
 *
 * Sources 3 and 4 are deliberately derived from the page rather than from vendor
 * internals: whatever the vendor achieved anywhere on this page becomes the number
 * every phone link uses. That makes the outcome consistent even when no storage is
 * readable at all.
 */

export interface SwapPair {
  /** Pool number to display and dial, digits only. */
  tracking: string;
  /** The number it replaces, digits only. */
  original: string;
}

export interface ResolvedSwap {
  pair: SwapPair;
  /** Which evidence source won. */
  source: 'cookie' | 'localStorage' | 'dom-href' | 'dom-text';
}

export const digitsOf = (value: string) => value.replace(/\D/g, '');

/** 7733641541 → 773-364-1541, matching the format used sitewide. */
export function formatUs(digits: string): string {
  return digits.length === 10
    ? `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
    : digits;
}

/**
 * Parses the vendor's storage format: triplets joined by "+..+" as
 * [trackingNumber, originalNumber, keywordId, …]. Incomplete numbers are dropped
 * — a blank would make later `includes` checks match anything and rewrite links
 * the pool never mapped.
 */
function parsePairs(raw: string | null | undefined): SwapPair[] {
  if (!raw) return [];
  const parts = decodeURIComponent(raw).split('+..+');
  const pairs: SwapPair[] = [];
  for (let i = 0; i + 1 < parts.length; i += 3) {
    const tracking = digitsOf(parts[i] ?? '');
    const original = digitsOf(parts[i + 1] ?? '');
    if (tracking.length === 10 && original.length === 10) pairs.push({ tracking, original });
  }
  return pairs;
}

function fromCookie(): SwapPair[] {
  if (typeof document === 'undefined') return [];
  return parsePairs(document.cookie.match(/(?:^|;\s*)wc_swap=([^;]*)/)?.[1]);
}

function fromLocalStorage(): SwapPair[] {
  try {
    return parsePairs(window.localStorage.getItem('wc_swap'));
  } catch {
    // Private mode / storage disabled. Not an error worth surfacing.
    return [];
  }
}

/**
 * Reads back what the vendor actually applied to the page. `useText` looks at the
 * rendered number instead of the attribute, which is what catches a page whose
 * text was swapped while its href was not.
 */
function fromDom(defaultDigits: string, useText: boolean): SwapPair | null {
  if (typeof document === 'undefined' || defaultDigits.length !== 10) return null;
  const counts = new Map<string, number>();
  Array.from(document.querySelectorAll('a[href^="tel:"]')).forEach((anchor) => {
    const raw = useText ? (anchor.textContent ?? '') : (anchor.getAttribute('href') ?? '');
    const digits = digitsOf(raw);
    // A US number may carry a leading 1; take the last 10 digits.
    if (digits.length < 10) return;
    const candidate = digits.slice(-10);
    if (candidate === defaultDigits) return;
    counts.set(candidate, (counts.get(candidate) ?? 0) + 1);
  });
  if (!counts.size) return null;
  // Most frequent wins, so a one-off oddity can't hijack every link.
  const best = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0];
  return { tracking: best[0], original: defaultDigits };
}

/** Every mapping known from storage. Used to repair arbitrary tel: anchors. */
export function knownPairs(): SwapPair[] {
  const cookie = fromCookie();
  return cookie.length ? cookie : fromLocalStorage();
}

/**
 * The mapping that replaces `defaultDisplay`, or null when this visitor has no
 * pool number — in which case showing the default is correct behaviour, not a
 * failure.
 */
export function resolveSwap(defaultDisplay: string): ResolvedSwap | null {
  const wanted = digitsOf(defaultDisplay).slice(-10);

  const cookie = fromCookie();
  const cookieHit = cookie.find((p) => !wanted || p.original === wanted);
  if (cookieHit) return { pair: cookieHit, source: 'cookie' };

  const stored = fromLocalStorage();
  const storedHit = stored.find((p) => !wanted || p.original === wanted);
  if (storedHit) return { pair: storedHit, source: 'localStorage' };

  const byHref = fromDom(wanted, false);
  if (byHref) return { pair: byHref, source: 'dom-href' };

  const byText = fromDom(wanted, true);
  if (byText) return { pair: byText, source: 'dom-text' };

  return null;
}
