/**
 * WhatConverts call tracking / Dynamic Number Insertion (DNI) config.
 *
 * The live WordPress theme carried this snippet in <head> (see
 * `jb-blanton/header.php` lines 22-24) but it was never ported when the site
 * moved to Next.js — verified against https://jblantonplumbing.com, where
 * `window.$wc_leads` was `undefined` and neither tracking script was present.
 * Result: no phone number on the site was ever swapped for a tracking number,
 * so every call came back unattributed.
 *
 * HARD RULE, same as Brief 128's analytics IDs (src/lib/analytics.ts): the
 * profile ID comes from environment config, never a hardcoded literal. A blank
 * value is a hard no-op — no script tag, no network request, no swap. That is
 * what keeps staging and dev from burning numbers out of the production dynamic
 * number pool and logging phantom visitors into the production account.
 *
 * Production value:
 *   NEXT_PUBLIC_WHATCONVERTS_PROFILE_ID=102905
 *
 * NOTE: `NEXT_PUBLIC_*` values are inlined at BUILD time. Setting this on the
 * box requires a rebuild (`npm run build`), not just a pm2 restart — the deploy
 * workflow builds on the box, so writing it to the env file before a deploy is
 * enough.
 */

/**
 * WhatConverts' per-account tracking host. This deliberately opaque hostname is
 * the vendor's anti-adblock CDN domain and is taken verbatim from the account's
 * own snippet — it is NOT a value to invent or guess. If WhatConverts ever
 * rotates it, the new snippet's host goes here (or in the env override below).
 */
const DEFAULT_HOST = 's.ksrndkehqnwntyxlhgto.com';

/**
 * The live WhatConverts profile, used whenever the env var is unset.
 *
 * Default flipped 2026-08-11. Previously blank meant "off", so that a staging box
 * could never consume numbers from the live pool. When the compromised live site
 * was replaced by the staging environment in an emergency, that box had no env
 * vars — so call tracking went dark on the real site and every call came back
 * unattributed. The safeguard was protecting an environment that no longer existed.
 *
 * ⚠️ A future staging environment must set NEXT_PUBLIC_TRACKING_DISABLED=1 (and
 * rebuild), or it will check out numbers from the live pool. With a small pool that
 * can leave REAL visitors seeing the untracked default number.
 */
const PRODUCTION_PROFILE_ID = '102905';

/** Single explicit off switch, shared with src/lib/analytics.ts. */
const TRACKING_DISABLED =
  (process.env.NEXT_PUBLIC_TRACKING_DISABLED ?? '').trim() === '1';

export interface WhatConvertsConfig {
  /** Numeric profile ID, e.g. `102905`. Blank = WhatConverts off. */
  profileId: string;
  /** Tracking script host, no scheme and no trailing slash. */
  host: string;
}

// Both values are interpolated into a <script src> and an inline <script> body,
// so anything outside these shapes is treated as a misconfiguration and dropped
// rather than emitted — a stray quote or a whole pasted snippet would otherwise
// break out of the attribute/string literal.
const PROFILE_ID_PATTERN = /^[0-9]+$/;
const HOST_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

let cached: WhatConvertsConfig | null = null;

/** The WhatConverts config, env-sourced. Blank `profileId` = the tag never loads. */
export function getWhatConvertsConfig(): WhatConvertsConfig {
  if (cached) return cached;

  const rawId = (process.env.NEXT_PUBLIC_WHATCONVERTS_PROFILE_ID ?? '').trim();
  const rawHost = (process.env.NEXT_PUBLIC_WHATCONVERTS_HOST ?? '').trim().toLowerCase();

  // Unset/blank now means "use the live profile", not "off". Switching call
  // tracking off is done with NEXT_PUBLIC_TRACKING_DISABLED=1.
  let profileId = TRACKING_DISABLED ? '' : PRODUCTION_PROFILE_ID;
  if (rawId && !TRACKING_DISABLED) {
    if (PROFILE_ID_PATTERN.test(rawId)) {
      profileId = rawId;
    } else {
      console.warn(
        `[whatconverts] Ignoring NEXT_PUBLIC_WHATCONVERTS_PROFILE_ID="${rawId}" — ` +
          `expected digits only (e.g. 102905). Falling back to the live profile ` +
          `${PRODUCTION_PROFILE_ID}. To switch call tracking OFF, set ` +
          'NEXT_PUBLIC_TRACKING_DISABLED=1 instead.',
      );
    }
  }

  let host = DEFAULT_HOST;
  if (rawHost) {
    if (HOST_PATTERN.test(rawHost)) {
      host = rawHost;
    } else {
      console.warn(
        `[whatconverts] Ignoring NEXT_PUBLIC_WHATCONVERTS_HOST="${rawHost}" — ` +
          `not a bare hostname. Falling back to ${DEFAULT_HOST}.`,
      );
    }
  }

  cached = { profileId, host };
  return cached;
}

/**
 * Protocol-relative, exactly as the vendor snippet ships it, so the script
 * inherits the page's scheme.
 */
export function whatConvertsScriptUrl({ profileId, host }: WhatConvertsConfig): string {
  return `//${host}/${profileId}.js`;
}

/**
 * The vendor's bootstrap, byte-for-byte from the WhatConverts dashboard snippet.
 *
 * It must execute BEFORE the tracking script: it snapshots the entry URL,
 * referrer, query string and hash at first paint, and the tracking script reads
 * `$wc_leads.doc.*` for attribution. Deep-cloning through JSON is the vendor's
 * way of freezing those values so a later `history.pushState` (i.e. every
 * client-side navigation in this App Router site) can't retroactively rewrite
 * the source that a lead gets credited to.
 */
export const WHATCONVERTS_BOOTSTRAP =
  'var $wc_load=function(a){return JSON.parse(JSON.stringify(a))},' +
  '$wc_leads=$wc_leads||{doc:{url:$wc_load(document.URL),ref:$wc_load(document.referrer),' +
  'search:$wc_load(location.search),hash:$wc_load(location.hash)}};';
