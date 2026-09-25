'use client';

import { useEffect } from 'react';

/**
 * Brief 190 — Article V2's two behaviours, ported from the Columbus test page's
 * client component (Brief 185, `ColumbusArticleTestClient.tsx`). Renders nothing.
 *
 *  1. TOC active section. The active entry is the LAST heading that has passed
 *     30% of the viewport (works for jumps, not only slow scrolls); the moving
 *     indicator reads `--y` / `--h` off the `<ol>`.
 *  2. Mobile call bar. Slides in once the masthead has left the viewport.
 *
 * Everything is looked up inside `.article-v2` and every listener / observer is
 * torn down on unmount, so a client-side navigation away leaves nothing behind.
 * `data-js` goes on `.article-v2`, never on `<html>`. A V2 article with no H2s
 * has no `#toc`, and step 1 simply does not run.
 */
export default function ArticleV2Client() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.article-v2');
    if (!root) return;
    root.dataset.js = 'true';

    const cleanups: (() => void)[] = [];

    const list = root.querySelector<HTMLOListElement>('#toc');
    if (list) {
      const links = Array.from(list.querySelectorAll<HTMLAnchorElement>('a'));
      const heads = links
        .map((a) => {
          const id = (a.getAttribute('href') ?? '').slice(1);
          return id ? root.querySelector<HTMLElement>(`[id="${CSS.escape(id)}"]`) : null;
        })
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
