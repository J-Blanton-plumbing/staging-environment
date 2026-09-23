'use client';

import { useEffect } from 'react';

/**
 * The two behaviours of the approved Columbus article prototype (Brief 185),
 * ported from its inline `<script>` — renders nothing.
 *
 *  1. TOC active section. The active entry is the LAST heading that has passed
 *     30% of the viewport (works for jumps, not only slow scrolls); the moving
 *     indicator reads `--y` / `--h` off the `<ol>`.
 *  2. Mobile call bar. Slides in once the masthead has left the viewport.
 *
 * Everything is looked up inside `.cat-root` and every listener / observer is
 * torn down on unmount, so a client-side navigation away leaves nothing behind.
 * The prototype's `html.js` flag becomes `data-js` on `.cat-root` for the same
 * reason — nothing is added to `<html>` sitewide.
 */
export default function ColumbusArticleTestClient() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.cat-root');
    if (!root) return;
    root.dataset.js = 'true';

    const cleanups: (() => void)[] = [];

    const list = root.querySelector<HTMLOListElement>('#toc');
    if (list) {
      const links = Array.from(list.querySelectorAll<HTMLAnchorElement>('a'));
      const heads = links
        .map((a) => root.querySelector<HTMLElement>(a.getAttribute('href') ?? ''))
        .filter((h): h is HTMLElement => h !== null);

      const set = (id: string) => {
        links.forEach((a) => {
          const on = a.getAttribute('href') === '#' + id;
          a.setAttribute('aria-current', String(on));
          if (on) {
            list.style.setProperty('--y', a.offsetTop + 'px');
            list.style.setProperty('--h', a.offsetHeight + 'px');
          }
        });
      };

      let tick = false;
      let raf = 0;
      const update = () => {
        tick = false;
        if (!heads.length) return;
        const y = window.innerHeight * 0.3;
        let cur = heads[0];
        for (const h of heads) {
          if (h.getBoundingClientRect().top <= y) cur = h;
        }
        set(cur.id);
      };
      const onScroll = () => {
        if (!tick) {
          tick = true;
          raf = requestAnimationFrame(update);
        }
      };

      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', update);
      update();
      cleanups.push(() => {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', update);
        cancelAnimationFrame(raf);
      });
    }

    const callbar = root.querySelector<HTMLElement>('#callbar');
    const masthead = root.querySelector<HTMLElement>('.masthead');
    if (callbar && masthead && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver(([e]) => {
        callbar.dataset.show = String(!e.isIntersecting);
      });
      io.observe(masthead);
      cleanups.push(() => io.disconnect());
    }

    return () => cleanups.forEach((fn) => fn());
  }, []);

  return null;
}
