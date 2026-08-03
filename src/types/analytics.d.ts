/**
 * Globals installed by the Brief 128 base tags (src/components/analytics/AnalyticsScripts.tsx).
 * All optional — every one of them is absent whenever its env-gated ID is blank,
 * so callers must feature-detect before using them.
 */
interface Window {
  /** gtag.js command queue. */
  dataLayer?: unknown[];
  /** Declared by the gtag bootstrap as a top-level `function gtag(){…}`. */
  gtag?: (...args: unknown[]) => void;
  /** Meta Pixel command function. */
  fbq?: (...args: unknown[]) => void;
  /**
   * Bing UET queue. A plain array until bat.js loads, then a `UET` instance —
   * both expose `push`, which is all we ever call.
   */
  uetq?: { push: (...args: unknown[]) => unknown };
}
