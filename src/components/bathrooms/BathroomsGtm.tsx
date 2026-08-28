/**
 * Brief 156 §7 — the Bathrooms division's Google Tag Manager container, built in
 * and switched OFF.
 *
 * Marketing's decision: GTM only, gated behind an environment variable. The
 * container goes in the code now; the ID is supplied at the PPC cutover. From
 * then on the Bathrooms team adds GA4, Meta Pixel and call tracking through the
 * GTM dashboard without ever touching this repo again.
 *
 * DEFAULT STATE, AND HOW IT SHIPS: `NEXT_PUBLIC_BATHROOMS_GTM_ID` is unset, this
 * renders `null`, and the page source contains no script tag, no <noscript>
 * iframe and no dataLayer push. No ID from the live Webflow page is committed
 * here — the cutover values live in Brief 156 §7, not in the repo.
 *
 * `NEXT_PUBLIC_*` is inlined at BUILD time. Setting the variable on a server
 * requires a rebuild, not just a pm2 restart (same rule as Brief 128's IDs).
 *
 * ⚠️ THIS IS NOT THE ONLY TAGGING ON THIS ROUTE. The root layout mounts
 * `SiteAnalytics` on every non-admin path, so /bathrooms already fires the main
 * site's GA4 property, Google Ads conversion ID, Meta Pixel and Bing UET —
 * which, since the 2026-08-11 recovery, default to the LIVE production IDs
 * unless `NEXT_PUBLIC_TRACKING_DISABLED=1` is set (CLAUDE.md gotcha #12). Those
 * are direct gtag.js tags, not a GTM container, so there is no container-on-
 * container double-fire; but at cutover this page would report into the
 * plumbing accounts AND the bathrooms accounts at once. Flagged for the cutover
 * conversation — see the implementation report.
 */

import Script from 'next/script';

/**
 * A GTM container ID is `GTM-` plus uppercase alphanumerics. Anything else is a
 * misconfiguration (a stray quote, a whole snippet pasted in, a URL) and is
 * treated as unset: the value is interpolated into inline <script> text, so a
 * malformed one would break out of the string literal.
 */
const GTM_ID_PATTERN = /^GTM-[A-Z0-9]+$/;

function bathroomsGtmId(): string {
  const raw = (process.env.NEXT_PUBLIC_BATHROOMS_GTM_ID ?? '').trim();
  return GTM_ID_PATTERN.test(raw) ? raw : '';
}

export default function BathroomsGtm() {
  const id = bathroomsGtmId();
  if (!id) return null;

  return (
    <>
      <Script id="bathrooms-gtm" strategy="afterInteractive">{`
        (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
        new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
        j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
        'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','${id}');
      `}</Script>
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${id}`}
          height="0"
          width="0"
          style={{ display: 'none', visibility: 'hidden' }}
          title="Google Tag Manager"
        />
      </noscript>
    </>
  );
}
