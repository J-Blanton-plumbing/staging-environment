'use client';

import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import dynamic from 'next/dynamic';

// The page stylesheet, code-split so it is linked on the 145 V2 pages only (see CityServiceV2Styles).
const CityServiceV2Styles = dynamic(() => import('./CityServiceV2Styles'));

const EASE = 'cubic-bezier(0.23, 1, 0.32, 1)';
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * City Service Pages V2 (Brief 209) — the root of a V2 city-service page, and the port of the parts
 * of the approved package's `js/jbp.js` these pages use. Scoped to THIS element and torn down on
 * unmount, so nothing survives a client-side navigation away:
 *
 *   1. drawer          — dropped: it drove the package's own header; the live shell replaces it
 *   2. FAQ accordion   — one delegated click listener (WAAPI height + fade, as approved)
 *   3. image fade-in   — `img.pv-img` (the services-list thumbnails) gets `.is-loaded` once loaded;
 *                        the stylesheet hides it until then, so this is required, not decorative
 *   (the package's chart, count-up, card-rail and testimonial-reveal code drive markup these
 *   pages do not have)
 *
 * The package put `class="js"` on <html>; here it goes on the root, in a layout effect.
 */
export default function CityServiceV2Root({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useIsoLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const cleanups: Array<() => void> = [];
    const reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;

    root.classList.add('js');
    cleanups.push(() => root.classList.remove('js'));

    // 2. FAQ accordion.
    const onFaqClick = (e: MouseEvent) => {
      const btn = (e.target as Element | null)?.closest?.('.faq-q');
      if (!btn || !root.contains(btn)) return;
      const item = btn.closest('.faq-item2');
      const panel = item?.querySelector<HTMLElement>('.faq-panel');
      if (!item || !panel) return;
      const from = panel.getBoundingClientRect().height;
      if (panel.getAnimations) panel.getAnimations({ subtree: true }).forEach((a) => a.cancel());
      const open = item.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (!panel.animate) return;
      panel.querySelector(open ? '.faq-full' : '.faq-preview')?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: EASE });
      if (reduce) return;
      const to = panel.getBoundingClientRect().height;
      panel.animate([{ height: `${from}px` }, { height: `${to}px` }], { duration: 220, easing: EASE });
    };
    root.addEventListener('click', onFaqClick);
    cleanups.push(() => root.removeEventListener('click', onFaqClick));

    // 3. Content images fade in once loaded instead of popping in.
    root.querySelectorAll<HTMLImageElement>('img.pv-img').forEach((img) => {
      const done = () => img.classList.add('is-loaded');
      if (img.complete && img.naturalWidth) return done();
      img.addEventListener('load', done, { once: true });
      img.addEventListener('error', done, { once: true });
      cleanups.push(() => {
        img.removeEventListener('load', done);
        img.removeEventListener('error', done);
      });
    });

    return () => cleanups.forEach((fn) => fn());
  }, []);

  return (
    <div id="city-service-v2" ref={ref}>
      <CityServiceV2Styles />
      {children}
    </div>
  );
}
