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
 *
 * Brief 192 (Track D): sources 3 and 4 count ONLY anchors that held the default
 * number earlier on the same page (`recordDefaultAnchors`) — i.e. anchors the
 * vendor demonstrably rewrote. Before this, any non-default tel: link in the
 * page content (e.g. a state agency's number on /consumer-rights) was taken as
 * "the swap" and pushed into the header for the rest of the visit.
 *
 * And never inside `[data-wc-ignore]` (Brief 190, Track F): a page section that
 * shows another real number on purpose — a local office line — opts its anchors
 * out of sources 3 and 4, so that number can never be mistaken for the swap.
 * The opt-out only narrows what counts as evidence; it does not stop the vendor
 * or the repair pass from swapping the default number inside that section.
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
 * Brief 192 (Track D) — PROOF that the vendor rewrote an anchor.
 *
 * The vendor's swap (`replace_number` in the deployed 102905.js, read
 * 2026-09-25) replaces occurrences of the ORIGINAL number in text nodes and in
 * `href`/`title` attributes. It marks nothing, but its effect has one shape: an
 * anchor that showed the default number now shows another one. So the DOM
 * fallback accepts a number ONLY from an anchor this module saw holding the
 * default number earlier on the same page. A number that is merely in the page
 * content (a state agency's line, a division's line, an office line) was never
 * the default on its anchor, so it can never become "the swap" — on any page,
 * today or in future CMS content.
 *
 * Why "earlier" is always before the vendor runs: the vendor script is injected
 * from an effect (WhatConvertsRouteSwap) and is async, so it executes after
 * every effect of that commit — including the first resolveSwap() of the header
 * hook, the page's PhoneLinks and RouteSwap's own repair pass, each of which
 * records the anchors holding the default here first.
 *
 * Reset per path: after a client navigation React may REUSE an anchor node for a
 * different number (e.g. one article's rail link becoming another's), so a node
 * seen with the default on the previous page is no evidence on this one.
 */
let seenDefault = new WeakSet<Element>();
let seenPath: string | null = null;

function recordDefaultAnchors(defaultDigits: string, anchors: Element[]): void {
  const path = typeof window === 'undefined' ? '' : window.location.pathname;
  if (path !== seenPath) {
    seenDefault = new WeakSet<Element>();
    seenPath = path;
  }
  for (const anchor of anchors) {
    const href = digitsOf(anchor.getAttribute('href') ?? '').slice(-10);
    const text = digitsOf(anchor.textContent ?? '').slice(-10);
    if (href === defaultDigits || text === defaultDigits) seenDefault.add(anchor);
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
  const anchors = Array.from(document.querySelectorAll('a[href^="tel:"]'));
  recordDefaultAnchors(defaultDigits, anchors);
  anchors.forEach((anchor) => {
    // Brief 192 (Track D): only an anchor that held the default number on this
    // page can carry the swap (see recordDefaultAnchors). Everything else on the
    // page is content, never evidence.
    if (!seenDefault.has(anchor)) return;
    // Brief 190 (Track F): a container marked `data-wc-ignore` holds a SECOND
    // real number on purpose (an Article V2 office phone, the Columbus test
    // article's 614 line). Its anchors are not evidence of a swap — without this,
    // a visitor with no pool number had the header adopt the office number as
    // "the tracking number" and keep it on every page they clicked to next.
    // Pages without the attribute behave exactly as before.
    if (anchor.closest('[data-wc-ignore]')) return;
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
