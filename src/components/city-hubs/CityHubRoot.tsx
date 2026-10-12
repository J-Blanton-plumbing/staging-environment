'use client';

import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import dynamic from 'next/dynamic';

// The hub stylesheet, code-split so it is linked on the 5 hub pages only (see CityHubStyles).
const CityHubStyles = dynamic(() => import('./CityHubStyles'));

const EASE = 'cubic-bezier(0.23, 1, 0.32, 1)';
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * City Hubs V2 (Brief 205) — the root of a city hub page, and the port of the approved package's
 * `js/jbp.js` (identical to the Sewer v2 script; see `SewerV2Root`). Scoped to THIS element and
 * torn down on unmount, so nothing survives a client-side navigation away:
 *
 *   1. drawer               — dropped: it drove the package's own header; the live shell replaces it
 *   2. FAQ accordion        — one delegated click listener (WAAPI height + fade, as approved)
 *   3. testimonial reveal   — `.pv-reveal` gets `.pv-in` when scrolled into view
 *   4. services stripe      — the package's inline script: groups open ≥ 701px and their
 *                             summaries are inert there; below 701px each group toggles
 *   (the package's chart and card-rail code drive markup a city hub does not have)
 *
 * The package put `class="js"` on <html>; here it goes on the root, in a layout effect.
 */
export default function CityHubRoot({ className, children }: { className?: string; children: ReactNode }) {
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

    // 3. Testimonial cards: reveal on scroll, reusing the pv-in entrance.
    const reveals = Array.from(root.querySelectorAll<HTMLElement>('.pv-reveal'));
    if (reveals.length) {
      if (reduce || !('IntersectionObserver' in window)) {
        reveals.forEach((el) => el.classList.add('pv-in'));
      } else {
        const io = new IntersectionObserver(
          (entries) => {
            entries.forEach((en) => {
              if (!en.isIntersecting) return;
              en.target.classList.add('pv-in');
              io.unobserve(en.target);
            });
          },
          { threshold: 0.3 }
        );
        reveals.forEach((el) => io.observe(el));
        cleanups.push(() => io.disconnect());
      }
    }

    // 4. Services stripe groups (the package's inline <script> after the stripe).
    const groups = Array.from(root.querySelectorAll<HTMLDetailsElement>('.svc-grp'));
    if (groups.length && window.matchMedia) {
      const mq = window.matchMedia('(max-width:700px)');
      const set = () => groups.forEach((g) => { g.open = !mq.matches; });
      set();
      mq.addEventListener('change', set);
      cleanups.push(() => mq.removeEventListener('change', set));
      const onSummary = (e: Event) => { if (!mq.matches) e.preventDefault(); };
      const summaries = groups.map((g) => g.querySelector('summary')).filter((s): s is HTMLElement => !!s);
      summaries.forEach((s) => s.addEventListener('click', onSummary));
      cleanups.push(() => summaries.forEach((s) => s.removeEventListener('click', onSummary)));
    }

    return () => cleanups.forEach((fn) => fn());
  }, []);

  return (
    <div id="city-hub-v2" ref={ref} className={className}>
      <CityHubStyles />
      {children}
    </div>
  );
}
