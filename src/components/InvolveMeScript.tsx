'use client';

import Script from 'next/script';

/**
 * Loads the involve.me popup embed script and the UTM-param tracker.
 *
 * The UTM tracker reads `utm_*`, `gclid`, `msclkid`, `network`, `device`
 * params from the URL on first visit, stores them in sessionStorage,
 * then writes them into the `data-params` attribute of every
 * `.involveme_popup` element on the page so the popup form receives
 * the attribution data.
 *
 * Mirrors the script behavior on the live jblantonplumbing.com site.
 */
export default function InvolveMeScript() {
  return (
    <>
      <Script
        src="https://jblantonplumbing.involve.me/embed?type=popup"
        strategy="afterInteractive"
      />
      <Script id="jb-utm-tracker" strategy="afterInteractive">
        {`
          (function () {
            var STORAGE_KEY = 'jb_utm_params';

            // Parse URL query params
            var urlParams = {};
            var search = window.location.search.slice(1);
            if (search) {
              search.split('&').forEach(function (pair) {
                var kv = pair.split('=');
                if (kv[0]) {
                  urlParams[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
                }
              });
            }

            // Persist URL params to sessionStorage (overwrites previous)
            var hasUrlParams = Object.keys(urlParams).length > 0;
            if (hasUrlParams) {
              try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(urlParams)); } catch(e) {}
            }

            // Prefer URL params, fall back to sessionStorage
            var params = urlParams;
            if (!hasUrlParams) {
              try {
                var stored = sessionStorage.getItem(STORAGE_KEY);
                if (stored) params = JSON.parse(stored);
              } catch(e) {}
            }

            // Map to involve.me field names
            var fields = {
              source:       params['utm_source']   || params['source']       || '',
              campaignname: params['utm_campaign'] || params['campaignname'] || '',
              utm_campaign: params['utm_campaign'] || '',
              utm_adgroup:  params['utm_adgroup']  || params['adgroupid']    || '',
              keyword:      params['utm_term']     || params['keyword']      || '',
              network:      params['network']      || '',
              device:       params['device']       || '',
              medium:       params['utm_medium']   || params['medium']       || '',
              gclid:        params['gclid']        || '',
              msclkid:      params['msclkid']      || ''
            };

            var dataParams = Object.keys(fields)
              .map(function (k) { return k + '=' + fields[k]; })
              .join(',');

            // Apply to all .involveme_popup elements (including ones added later)
            function applyToButtons() {
              document.querySelectorAll('.involveme_popup').forEach(function (el) {
                el.setAttribute('data-params', dataParams);
              });
            }
            applyToButtons();

            // Re-apply after client-side route changes (Next.js App Router)
            var observer = new MutationObserver(applyToButtons);
            observer.observe(document.body, { childList: true, subtree: true });
          })();
        `}
      </Script>
    </>
  );
}
