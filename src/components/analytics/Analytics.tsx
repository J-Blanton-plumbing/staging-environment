'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { CLICK_EVENT_NAME, type TrackingIds } from '@/lib/analytics';

/**
 * Brief 128 (Tracks B + C) — the two things the live site's tags can't do on
 * their own once the site is a client-navigated App Router app:
 *
 *  B. Fire a fresh pageview on every client-side route change. gtag.js, Meta
 *     Pixel, and Bing UET only auto-fire a pageview on a full document load; on
 *     soft navigation nothing fires unless we do it, which silently loses the
 *     large majority of pageviews. This is the classic tracking-migration bug.
 *
 *  C. Replicate the live site's homemade `element_1_click` GA4 event, with the
 *     same params and the same name-derivation chain, via one delegated
 *     document-level listener (so it covers elements that mount after a soft
 *     navigation too).
 *
 * Every platform is independently gated on its own ID (Track D) — blank ID means
 * that platform gets nothing, and the corresponding global won't exist anyway.
 * Mounted from the root layout via SiteAnalytics, so it survives navigation and
 * is never remounted mid-session.
 */
export default function Analytics({ ids }: { ids: TrackingIds }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /**
   * Last URL a pageview was sent for. `null` until the first effect run, which
   * is the initial document load the base tags already counted — that run only
   * records the URL and sends nothing (Track B item 3: no double-count on first
   * paint). Comparing URLs rather than flipping a "first run" boolean also makes
   * the handler idempotent under React StrictMode's double-invoked effects in
   * dev, which would otherwise fire a spurious pageview on load.
   */
  const lastTrackedUrl = useRef<string | null>(null);

  useEffect(() => {
    const qs = searchParams?.toString();
    const url = qs ? `${pathname}?${qs}` : pathname;

    if (lastTrackedUrl.current === null) {
      lastTrackedUrl.current = url;
      return;
    }
    if (lastTrackedUrl.current === url) return;
    lastTrackedUrl.current = url;

    if (ids.ga4 && typeof window.gtag === 'function') {
      window.gtag('event', 'page_view', {
        page_path: url,
        page_location: window.location.href,
        page_title: document.title,
      });
    }

    if (ids.metaPixel && typeof window.fbq === 'function') {
      window.fbq('track', 'PageView');
    }

    // UET's own SPA auto-tracking is off (see AnalyticsScripts.tsx), so this is
    // the single source of Bing pageviews after the initial `pageLoad`.
    if (ids.bingUet && typeof window.uetq?.push === 'function') {
      window.uetq.push('event', 'page_view', { page_path: url });
    }
  }, [pathname, searchParams, ids.ga4, ids.metaPixel, ids.bingUet]);

  // ── Track C: `element_1_click` ─────────────────────────────────────────────
  // The body of this handler is a faithful port of the live site's inline
  // footer script (verified against https://jblantonplumbing.com 2026-07-31),
  // including the exact name-derivation order and character limits:
  //   id → data-track-click → innerText (30) → inner img alt (30) →
  //   anchor href (50) → 'element_unnamed', then `|| 'unknown'`.
  // Don't "clean this up" — the values land in GA4 alongside years of history.
  useEffect(() => {
    if (!ids.ga4) return;

    function handleClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const el = target.closest<HTMLElement>('button, a, [data-track-click]');
      if (!el) return;

      const elementId = el.id;
      const dataTrackClick = el.getAttribute('data-track-click');
      const innerText = el.innerText;
      let finalName = '';
      if (elementId) {
        finalName = elementId;
      } else if (dataTrackClick) {
        finalName = dataTrackClick;
      } else if (innerText && innerText.trim() !== '') {
        finalName = innerText.trim().substring(0, 30);
      } else {
        const innerImg = el.querySelector('img');
        if (innerImg && innerImg.alt) {
          finalName = innerImg.alt.trim().substring(0, 30);
        } else if (el.tagName.toLowerCase() === 'a' && (el as HTMLAnchorElement).href) {
          finalName = (el as HTMLAnchorElement).href.substring(0, 50);
        } else {
          finalName = 'element_unnamed';
        }
      }
      const buttonName = finalName || 'unknown';

      if (typeof window.gtag === 'function') {
        window.gtag('event', CLICK_EVENT_NAME, {
          element_name: buttonName.trim(),
          element_type: el.tagName.toLowerCase(),
          page_location: window.location.href,
        });
      }
    }

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [ids.ga4]);

  return null;
}
