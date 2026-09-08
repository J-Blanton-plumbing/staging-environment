/**
 * Analytics & conversion tracking config (Brief 128, revised 2026-08-11).
 *
 * ORIGINAL RULE, AND WHY IT CHANGED. Brief 128 required every tracking ID to come
 * from env config with a blank value meaning "tag off". That existed to guarantee
 * staging/dev traffic could never reach the production GA4 property, Google Ads
 * account, Meta Pixel or Bing UET tag.
 *
 * On 2026-08-11 the old live site was compromised and the staging environment was
 * promoted to serve jblantonplumbing.com in an emergency. That box never had the
 * tracking env vars, so ALL FIVE tags (these four plus WhatConverts) went dark on
 * the live site and every conversion went unrecorded — the safeguard was protecting
 * an environment that no longer exists, at the cost of the real one.
 *
 * So the default is inverted: these IDs now apply unless explicitly switched off.
 * An env var still overrides, so nothing is locked in.
 *
 * ⚠️ WHEN A NEW STAGING ENVIRONMENT IS BUILT, set NEXT_PUBLIC_TRACKING_DISABLED=1
 * on it (and rebuild). Without that flag it WILL report into the production
 * analytics accounts and burn numbers out of the live WhatConverts pool. That is
 * the trade this inversion makes: the live site can no longer be silently
 * untracked, and a future staging must opt out on purpose.
 *
 * These are public client-side IDs, carried over from the live WordPress site so
 * GA4 history, Ads conversion actions and Meta/Bing audiences stay intact. They
 * ship inside the browser bundle and were readable in the old page source, so
 * holding them in code leaks nothing.
 *
 * NOTE: `NEXT_PUBLIC_*` values are inlined at BUILD time. Changing one on a
 * server requires a rebuild (`npm run build`), not just a pm2 restart.
 */

/** Live account IDs, used whenever the matching env var is unset. */
const PRODUCTION_IDS = {
  ga4: 'G-SQZLV0V58J',
  /**
   * Google Ads. Swapped from `AW-661617195` to `AW-16486409650` on 2026-09-07
   * (Brief 174, Track A) on the instruction of Google's Lead Generation team:
   * Tag Assistant could not detect `AW-16486409650` on the site, so the
   * "Schedule Service Form Submit" conversion action under manager account
   * 117-076-6031 had counted zero and Ads was optimizing blind.
   *
   * A REPLACEMENT, not an addition — exactly one Ads `config` call is issued
   * site-wide. The consequence is deliberate and Marketing-approved: our pages
   * no longer feed `AW-661617195`'s "Mainline web — Lead (thank-you)"
   * conversion. (The Mainline app inside the scheduling iframe still loads
   * `AW-661617195` on its own; that is not ours to change.)
   *
   * TO ROLL BACK: this line, plus `export NEXT_PUBLIC_GOOGLE_ADS_ID=` in
   * `.github/workflows/deploy.yml`, then redeploy — NEXT_PUBLIC_* is inlined at
   * BUILD time, so a pm2 restart will not pick up a change.
   */
  googleAds: 'AW-16486409650',
  metaPixel: '1674876326613103',
  bingUet: '97007877',
} as const;

/** The single explicit off switch for every tag below. Set to `1` on staging. */
const TRACKING_DISABLED =
  (process.env.NEXT_PUBLIC_TRACKING_DISABLED ?? '').trim() === '1';

export interface TrackingIds {
  /** GA4 measurement ID, e.g. `G-SQZLV0V58J`. Blank = GA4 off. */
  ga4: string;
  /** Google Ads conversion ID, e.g. `AW-16486409650`. Blank = Ads off. */
  googleAds: string;
  /** Meta (Facebook) Pixel ID, e.g. `1674876326613103`. Blank = Pixel off. */
  metaPixel: string;
  /** Microsoft Bing UET tag ID, e.g. `97007877`. Blank = UET off. */
  bingUet: string;
  /**
   * Google Ads conversion `send_to` for `/thank-you` — the "Schedule Service
   * Form Submit" action (Brief 174, Track B). Shaped `AW-<digits>/<label>`.
   * Blank = no conversion component is rendered and no event fires.
   *
   * Unlike the four IDs above, this one is FAIL-CLOSED: blank means off, with
   * no baked-in fallback. The four IDs were inverted to fail open on 2026-08-11
   * because a blank value had silently un-tracked the live site; that argument
   * does not transfer to a conversion label. A pageview landing in the wrong
   * GA4 property is a reporting nuisance — a phantom *lead* reported from a dev
   * or staging box corrupts Smart Bidding on a live Ads account. So this value
   * is set explicitly, in the deploy workflow's build-time export block.
   */
  googleAdsConversionThankYou: string;
}

/**
 * Every real tracking ID is letters/digits with an optional `-`/`_`. Anything
 * else is a misconfiguration (stray quote, whole snippet pasted in, URL, …) and
 * is treated as blank: these values are interpolated into inline <script> text,
 * so a malformed one would break out of the string literal and take the whole
 * tag block down with it. Rejecting is safer than emitting a mangled ID.
 */
const ID_PATTERN = /^[A-Za-z0-9_-]+$/;

function readId(envName: string, raw: string | undefined, fallback: string): string {
  if (TRACKING_DISABLED) return '';
  const value = (raw ?? '').trim();
  // Unset/blank now means "use the live ID", not "off" — see the docblock above.
  // Turning a tag off is done with NEXT_PUBLIC_TRACKING_DISABLED=1.
  if (!value) return fallback;
  if (!ID_PATTERN.test(value)) {
    console.warn(
      `[analytics] Ignoring ${envName}="${value}" — not a valid tracking ID ` +
        '(letters, digits, - and _ only). That tag will not load.',
    );
    return '';
  }
  return value;
}

/**
 * A Google Ads conversion `send_to`: the account, `/`, then the
 * conversion-action label. Validated separately from ID_PATTERN, which rejects
 * the `/` — and because a value that does not match this shape is not a label
 * at all. The realistic failure mode is somebody pasting Google's whole event
 * snippet into the env file; anything non-matching is treated as blank rather
 * than handed to gtag, which would otherwise record hits against a destination
 * nobody ever reports on.
 */
const CONVERSION_SEND_TO_PATTERN = /^AW-\d+\/[A-Za-z0-9_-]+$/;

/**
 * Fail-CLOSED reader for a conversion label — see
 * `TrackingIds.googleAdsConversionThankYou` for why this one has no fallback.
 */
function readConversionSendTo(envName: string, raw: string | undefined): string {
  if (TRACKING_DISABLED) return '';
  const value = (raw ?? '').trim();
  if (!value) return '';
  if (!CONVERSION_SEND_TO_PATTERN.test(value)) {
    console.warn(
      `[analytics] Ignoring ${envName}="${value}" — not a Google Ads conversion ` +
        'send_to (expected `AW-<digits>/<label>`). That conversion will not fire.',
    );
    return '';
  }
  return value;
}

// Memoized: NEXT_PUBLIC_* values are build-time constants, so reading them once
// per process is equivalent to reading them per request — and it keeps the
// misconfiguration warning above to one line per boot instead of one per render.
let cached: TrackingIds | null = null;

/** The tracking IDs, env-sourced. Blank string = that platform/event is off. */
export function getTrackingIds(): TrackingIds {
  if (!cached) {
    const googleAds = readId(
      'NEXT_PUBLIC_GOOGLE_ADS_ID',
      process.env.NEXT_PUBLIC_GOOGLE_ADS_ID,
      PRODUCTION_IDS.googleAds,
    );
    const conversionThankYou = readConversionSendTo(
      'NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_THANK_YOU',
      process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_THANK_YOU,
    );
    cached = {
      ga4: readId('NEXT_PUBLIC_GA4_ID', process.env.NEXT_PUBLIC_GA4_ID, PRODUCTION_IDS.ga4),
      googleAds,
      metaPixel: readId('NEXT_PUBLIC_META_PIXEL_ID', process.env.NEXT_PUBLIC_META_PIXEL_ID, PRODUCTION_IDS.metaPixel),
      bingUet: readId('NEXT_PUBLIC_BING_UET_ID', process.env.NEXT_PUBLIC_BING_UET_ID, PRODUCTION_IDS.bingUet),
      // Cross-gated on the Ads ID: the event is sent with `send_to`, which only
      // resolves for a destination that has had a `gtag('config', …)` call. With
      // the Ads tag off (NEXT_PUBLIC_TRACKING_DISABLED=1, or an invalid ID
      // override) no such call is issued, so firing would be a no-op at best and
      // an unconfigured hit at worst. One switch, both halves.
      googleAdsConversionThankYou: googleAds ? conversionThankYou : '',
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
