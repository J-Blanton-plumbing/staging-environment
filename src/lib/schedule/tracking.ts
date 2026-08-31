/**
 * Brief 169 (Track C) — carries paid-search / social attribution from OUR page
 * into the Mainline `/schedule-service` form that the popup embeds.
 *
 * involve.me took attribution through a `data-params` attribute that its embed
 * script read off the trigger element (written there by the UTM tracker inside
 * `InvolveMeScript`). An iframe has no such channel: the ONLY way to hand the
 * Mainline app its attribution is the query string of the URL we set as
 * `iframe.src`. Mainline reads those params with `useSearchParams()` and ships
 * them in the `tracking` object attached to the lead.
 *
 * Source precedence mirrors the legacy tracker: the CURRENT URL wins, and
 * `sessionStorage['jb_utm_params']` fills whatever the URL does not carry. The
 * storage key is deliberately the same one `InvolveMeScript` still writes — a
 * visitor may have landed (and been recorded) before this module ever ran, and
 * a second key would silently halve attribution coverage.
 *
 * One deliberate difference from the legacy tracker: it treated the URL as
 * all-or-nothing (any query param at all meant sessionStorage was ignored
 * entirely), so a landing at `/?gclid=x` followed by a click through to
 * `/knowledge-hub?page=2` lost the gclid. This merges per key instead, which is
 * what "URL first, then sessionStorage" actually means.
 */

/**
 * Origin of the Mainline app that serves the scheduling form.
 *
 * Env-overridable so a staging box can point the popup at a staging Mainline
 * without a code change. NEXT_PUBLIC_* is inlined at BUILD time — changing it
 * needs a rebuild, not just a restart (same caveat as the Brief 128 IDs).
 *
 * This constant is also the security boundary for the `postMessage` listener in
 * `ScheduleServiceModal`: every inbound message whose `event.origin` is not
 * exactly this string is dropped unread.
 */
export const MAINLINE_ORIGIN =
  process.env.NEXT_PUBLIC_MAINLINE_ORIGIN || 'https://mainline.jblantonplumbing.com';

/** Path of the scheduling form on the Mainline app. */
export const MAINLINE_SCHEDULE_PATH = '/schedule-service';

/** Hard cap on the built URL. Params are shed (see DROP_ORDER) to stay under it. */
const MAX_URL_LENGTH = 2000;

/** sessionStorage key written by the legacy tracker in `InvolveMeScript`. */
const STORAGE_KEY = 'jb_utm_params';

/**
 * Params we forward, in Mainline's own naming, each with the source keys to try
 * in order. The legacy involve.me field names (`source`, `medium`,
 * `campaignname`, `keyword`) are accepted as aliases because live Google Ads
 * templates still append some of them.
 *
 * Deliberately NOT forwarded, because Mainline has no equivalent field:
 * `network`, `device`, `utm_adgroup` / `adgroupid`. See the implementation report.
 */
const PARAM_SOURCES: Array<[string, string[]]> = [
  ['utm_source', ['utm_source', 'source']],
  ['utm_medium', ['utm_medium', 'medium']],
  ['utm_campaign', ['utm_campaign', 'campaignname']],
  ['utm_term', ['utm_term', 'keyword']],
  ['utm_content', ['utm_content']],
  ['utm_id', ['utm_id']],
  ['gclid', ['gclid']],
  ['fbclid', ['fbclid']],
  ['fbp', ['fbp']],
  ['fbc', ['fbc']],
  // Mainline does not read msclkid today (audited 2026-08-31). Sent anyway: it
  // is inert if ignored, and Microsoft Ads attribution starts working the moment
  // they add the field, with no change on our side.
  ['msclkid', ['msclkid']],
];

/**
 * Order in which params are sacrificed if the URL would exceed MAX_URL_LENGTH.
 * Lowest attribution value first; the click IDs and `utm_source` go last.
 */
const DROP_ORDER = [
  'utm_content',
  'utm_term',
  'utm_id',
  'fbc',
  'fbp',
  'utm_campaign',
  'msclkid',
  'fbclid',
  'utm_medium',
  'utm_source',
  'gclid',
];

/** Query params of the current URL, decoded. Empty object off-browser. */
function readUrlParams(): Record<string, string> {
  const out: Record<string, string> = {};
  if (typeof window === 'undefined') return out;
  try {
    new URLSearchParams(window.location.search).forEach((value, key) => {
      if (key && value) out[key] = value;
    });
  } catch {
    /* malformed query string — treat as no params */
  }
  return out;
}

/** Params cached by the legacy tracker on the landing pageview. */
function readStoredParams(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === 'string' && value) out[key] = value;
    }
    return out;
  } catch {
    // Private-mode sessionStorage throws on read; a hand-edited value throws in
    // JSON.parse. Either way: no stored attribution, not a broken popup.
    return {};
  }
}

/** Reads a cookie value by name. Used for the Meta Pixel's `_fbp` / `_fbc`. */
function readCookie(name: string): string {
  if (typeof document === 'undefined') return '';
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + escaped + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : '';
}

/**
 * Resolved attribution values in Mainline's naming, blank values omitted.
 * Exported for QA/diagnostics — the modal only needs `buildScheduleUrl()`.
 */
export function collectScheduleParams(): Record<string, string> {
  const url = readUrlParams();
  const stored = readStoredParams();
  // Per-key merge: URL wins, sessionStorage fills the gaps.
  const params: Record<string, string> = { ...stored, ...url };

  // Meta Pixel writes its browser/click IDs as cookies, not query params, so
  // they never reach either source above.
  if (!params.fbp) params.fbp = readCookie('_fbp');
  if (!params.fbc) params.fbc = readCookie('_fbc');

  const out: Record<string, string> = {};
  for (const [target, sources] of PARAM_SOURCES) {
    for (const key of sources) {
      const value = params[key];
      if (typeof value === 'string' && value.trim()) {
        out[target] = value.trim();
        break;
      }
    }
  }
  return out;
}

/** Serializes `params` onto the form URL. `URLSearchParams` percent-encodes. */
function serialize(params: Record<string, string>): string {
  const qs = new URLSearchParams(params).toString();
  const base = `${MAINLINE_ORIGIN}${MAINLINE_SCHEDULE_PATH}`;
  return qs ? `${base}?${qs}` : base;
}

/**
 * The `iframe.src` for the popup: the Mainline form plus whatever attribution
 * we can prove for this visitor. Called at OPEN time, never at page load —
 * mounting the frame early would pull Mainline's app, GTM, Google Ads and Meta
 * Pixel into every pageview on the site.
 */
export function buildScheduleUrl(): string {
  const params = collectScheduleParams();
  let url = serialize(params);

  // Some Google Ads value-track templates produce very long `utm_content`
  // values; a 2 kB ceiling keeps us clear of the shortest URL limits in the
  // wild. Shed the least valuable params until it fits.
  for (const key of DROP_ORDER) {
    if (url.length <= MAX_URL_LENGTH) break;
    if (key in params) {
      delete params[key];
      url = serialize(params);
    }
  }
  return url;
}
