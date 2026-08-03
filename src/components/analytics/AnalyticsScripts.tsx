import Script from 'next/script';
import type { TrackingIds } from '@/lib/analytics';

/**
 * Brief 128 (Track A) — the site-wide base tags, mounted once in the root layout
 * so they load on the first hit of any route. Ported 1:1 from the live
 * WordPress theme (`jb-blanton/header.php` + `footer.php`, re-verified against
 * https://jblantonplumbing.com on 2026-07-31), with every ID swapped for its
 * env-sourced value.
 *
 * Each block renders ONLY when its ID is present (Track D). A blank env var is a
 * hard no-op: no script tag, no network request, no events — that is how staging
 * runs the full tracking build without a single hit landing in the production
 * accounts.
 *
 * `afterInteractive` on all of them: they inject after hydration so nothing
 * blocks render, which is also what `defer`/`async` did on the live site.
 */
export default function AnalyticsScripts({ ids }: { ids: TrackingIds }) {
  // One gtag.js load serves BOTH the GA4 property and the Google Ads account,
  // exactly as on the live site. The `?id=` param just needs to be one of the
  // two — the `config` calls below are what actually register each destination.
  const gtagLoadId = ids.ga4 || ids.googleAds;

  return (
    <>
      {gtagLoadId ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gtagLoadId}`}
            strategy="afterInteractive"
          />
          <Script id="jb-gtag-init" strategy="afterInteractive">{`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            ${ids.ga4 ? `gtag('config', '${ids.ga4}');` : ''}
            ${ids.googleAds ? `gtag('config', '${ids.googleAds}');` : ''}
          `}</Script>
        </>
      ) : null}

      {ids.metaPixel ? (
        <>
          <Script id="jb-meta-pixel" strategy="afterInteractive">{`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${ids.metaPixel}');
            fbq('track', 'PageView');
          `}</Script>
          {/* Same no-JS fallback pixel the live site carries. */}
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              height="1"
              width="1"
              style={{ display: 'none' }}
              alt=""
              src={`https://www.facebook.com/tr?id=${ids.metaPixel}&ev=PageView&noscript=1`}
            />
          </noscript>
        </>
      ) : null}

      {ids.bingUet ? (
        // Live bootstrap, with ONE deliberate change: `enableAutoSpaTracking` is
        // false here (live has it true, where it does nothing on a non-SPA
        // WordPress site). On this App Router SPA, leaving UET's auto history
        // hook on *and* pushing a pageview from the route-change handler would
        // double-count every client-side navigation. Pageviews after the initial
        // load come from Analytics.tsx instead, alongside GA4's and Meta's — one
        // code path, exactly one pageview per navigation.
        <Script id="jb-bing-uet" strategy="afterInteractive">{`
          (function(w,d,t,r,u){var f,n,i;w[u]=w[u]||[],f=function(){var o={ti:"${ids.bingUet}", enableAutoSpaTracking: false};o.q=w[u],w[u]=new UET(o),w[u].push("pageLoad")},n=d.createElement(t),n.src=r,n.async=1,n.onload=n.onreadystatechange=function(){var s=this.readyState;s&&s!=="loaded"&&s!=="complete"||(f(),n.onload=n.onreadystatechange=null)},i=d.getElementsByTagName(t)[0],i.parentNode.insertBefore(n,i)})(window,document,"script","//bat.bing.com/bat.js","uetq");
        `}</Script>
      ) : null}
    </>
  );
}
