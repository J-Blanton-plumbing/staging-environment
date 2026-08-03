/**
 * Analytics & conversion tracking config (Brief 128).
 *
 * HARD RULE (brief-128): every tracking ID comes from environment config — never
 * a hardcoded literal, and never derived from the request hostname. When an ID's
 * env var is blank, that platform's tag must not load and its events must not
 * fire. That is the code-level guarantee that staging/dev test traffic can never
 * reach the production GA4 property, Google Ads account, Meta Pixel, or Bing UET
 * tag. Same pattern as Brief 127's env-sourced CANONICAL_BASE_URL (src/lib/seo.ts).
 *
 * Production values (public client-side IDs, carried over from the live
 * WordPress site so GA4 history, Ads conversion actions, and Meta/Bing
 * audiences all stay intact):
 *   NEXT_PUBLIC_GA4_ID=G-SQZLV0V58J
 *   NEXT_PUBLIC_GOOGLE_ADS_ID=AW-661617195
 *   NEXT_PUBLIC_META_PIXEL_ID=1674876326613103
 *   NEXT_PUBLIC_BING_UET_ID=97007877
 *
 * NOTE: `NEXT_PUBLIC_*` values are inlined at BUILD time. Changing one on a
 * server requires a rebuild (`npm run build`), not just a pm2 restart — the
 * deploy workflow builds on the box, so setting them in the box's env file
 * before a deploy is enough.
 */

export interface TrackingIds {
  /** GA4 measurement ID, e.g. `G-SQZLV0V58J`. Blank = GA4 off. */
  ga4: string;
  /** Google Ads conversion ID, e.g. `AW-661617195`. Blank = Ads off. */
  googleAds: string;
  /** Meta (Facebook) Pixel ID, e.g. `1674876326613103`. Blank = Pixel off. */
  metaPixel: string;
  /** Microsoft Bing UET tag ID, e.g. `97007877`. Blank = UET off. */
  bingUet: string;
}

/**
 * Every real tracking ID is letters/digits with an optional `-`/`_`. Anything
 * else is a misconfiguration (stray quote, whole snippet pasted in, URL, …) and
 * is treated as blank: these values are interpolated into inline <script> text,
 * so a malformed one would break out of the string literal and take the whole
 * tag block down with it. Rejecting is safer than emitting a mangled ID.
 */
const ID_PATTERN = /^[A-Za-z0-9_-]+$/;

function readId(envName: string, raw: string | undefined): string {
  const value = (raw ?? '').trim();
  if (!value) return '';
  if (!ID_PATTERN.test(value)) {
    console.warn(
      `[analytics] Ignoring ${envName}="${value}" — not a valid tracking ID ` +
        '(letters, digits, - and _ only). That tag will not load.',
    );
    return '';
  }
  return value;
}

// Memoized: NEXT_PUBLIC_* values are build-time constants, so reading them once
// per process is equivalent to reading them per request — and it keeps the
// misconfiguration warning above to one line per boot instead of one per render.
let cached: TrackingIds | null = null;

/** The four tracking IDs, env-sourced. Blank string = that platform is off. */
export function getTrackingIds(): TrackingIds {
  if (!cached) {
    cached = {
      ga4: readId('NEXT_PUBLIC_GA4_ID', process.env.NEXT_PUBLIC_GA4_ID),
      googleAds: readId('NEXT_PUBLIC_GOOGLE_ADS_ID', process.env.NEXT_PUBLIC_GOOGLE_ADS_ID),
      metaPixel: readId('NEXT_PUBLIC_META_PIXEL_ID', process.env.NEXT_PUBLIC_META_PIXEL_ID),
      bingUet: readId('NEXT_PUBLIC_BING_UET_ID', process.env.NEXT_PUBLIC_BING_UET_ID),
    };
  }
  return cached;
}

/**
 * GA4 event name for the site's homemade click tracker.
 *
 * Deliberately the LITERAL string `element_1_click`, matching the live site
 * byte-for-byte (verified against https://jblantonplumbing.com 2026-07-31: the
 * live footer fires `gtag('event', 'element_1_click', eventParams)` — a fixed
 * name, with the clicked element's name carried in the `element_name` param, not
 * in the event name). Brief 128's Track C prose describes it as
 * `element_<name>_click`; interpolating the name would mint a new GA4 event name
 * per element and break comparability with the existing property's history,
 * which is the stated goal of that track. See the brief-128 report.
 */
export const CLICK_EVENT_NAME = 'element_1_click';
