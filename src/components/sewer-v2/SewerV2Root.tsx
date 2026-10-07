'use client';

import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';

/**
 * Brief 200 — the root of every Sewer Ecosystem v2 page, and the port of the approved package's
 * `js/script.js` (159 lines). Everything the script did is here, scoped to THIS element instead of
 * `document`/`html`, and torn down on unmount so nothing is left behind after a client-side
 * navigation away:
 *
 *   1. drawer               — dropped: it drove the package's own header, which the live shell replaces
 *   2. FAQ accordion        — one delegated click listener on the root (WAAPI height + fade, as approved)
 *   3b. image fade-in       — `img.pv-img` fades in once loaded
 *   3c. testimonial reveal  — `.pv-reveal` gets `.pv-in` when scrolled into view
 *   3. survival chart       — bars grow and labels count up once (hub)
 *   4. card rails           — prev/next buttons + edge mask (Camera Inspection page)
 *   +  `onerror="this.style.opacity=0"` on the two hub tiles (React cannot carry an inline handler
 *      from a server component, and an error that fires before hydration would be missed anyway)
 *
 * The package put `class="js"` on <html> from an inline head script. Here the class goes on the
 * root (`#sewer-v2.js …` in sewer-v2.css), set in a layout effect together with marking the images
 * that are already loaded — so on a hard load nothing that is visible blinks out and back.
 */

const EASE = 'cubic-bezier(0.23, 1, 0.32, 1)';
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export default function SewerV2Root({ className, children }: { className: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useIsoLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const cleanups: Array<() => void> = [];
    const reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;

    root.classList.add('js');
    cleanups.push(() => root.classList.remove('js'));

    // 2. FAQ accordion: height animated with WAAPI, preview swaps to the full answer.
    const onFaqClick = (e: MouseEvent) => {
      const target = e.target as Element | null;
      const btn = target?.closest?.('.faq-q');
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

    // 3b. Content images fade in once loaded instead of popping in.
    root.querySelectorAll<HTMLImageElement>('img.pv-img').forEach((img) => {
      if (img.complete && img.naturalWidth) {
        img.classList.add('is-loaded');
        return;
      }
      const done = () => img.classList.add('is-loaded');
      img.addEventListener('load', done, { once: true });
      img.addEventListener('error', done, { once: true });
      cleanups.push(() => {
        img.removeEventListener('load', done);
        img.removeEventListener('error', done);
      });
    });

    // Hub tiles: hide a broken image (the package's inline onerror).
    root.querySelectorAll<HTMLImageElement>('img.hub-tile-img').forEach((img) => {
      const hide = () => {
        img.style.opacity = '0';
      };
      if (img.complete && img.naturalWidth === 0 && img.currentSrc) hide();
      img.addEventListener('error', hide, { once: true });
      cleanups.push(() => img.removeEventListener('error', hide));
    });

    // 3c. Testimonial cards: reveal on scroll, reusing the pv-in entrance.
    const reveals = Array.from(root.querySelectorAll<HTMLElement>('.pv-reveal'));
    if (reveals.length) {
      if (reduce || !('IntersectionObserver' in window)) {
        reveals.forEach((el) => el.classList.add('pv-in'));
      } else {
        const ioReveal = new IntersectionObserver(
          (entries) => {
            entries.forEach((en) => {
              if (!en.isIntersecting) return;
              en.target.classList.add('pv-in');
              ioReveal.unobserve(en.target);
            });
          },
          { threshold: 0.3 }
        );
        reveals.forEach((el) => ioReveal.observe(el));
        cleanups.push(() => ioReveal.disconnect());
      }
    }

    // 3. Survival chart: bars grow, labels count up once when scrolled into view.
    const charts = Array.from(root.querySelectorAll<HTMLElement>('[data-chart]'));
    const counters = Array.from(root.querySelectorAll<HTMLElement>('[data-count-solo]'));
    const frames = new Set<number>();
    const timers = new Set<number>();
    cleanups.push(() => {
      frames.forEach((f) => cancelAnimationFrame(f));
      timers.forEach((t) => clearTimeout(t));
    });
    const countUp = (el: HTMLElement, dur: number) => {
      const end = parseFloat(el.getAttribute('data-count') ?? '');
      if (Number.isNaN(end)) return;
      let t0: number | null = null;
      const step = (t: number) => {
        if (t0 === null) t0 = t;
        const p = Math.min((t - t0) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = String(Math.round(end * eased));
        if (p < 1) frames.add(requestAnimationFrame(step));
        else el.textContent = String(end);
      };
      el.textContent = '0';
      frames.add(requestAnimationFrame(step));
    };
    if (charts.length || counters.length) {
      if (reduce || !('IntersectionObserver' in window)) {
        charts.forEach((c) => c.classList.add('reduce', 'is-in'));
      } else {
        const io = new IntersectionObserver(
          (entries) => {
            entries.forEach((en) => {
              if (!en.isIntersecting) return;
              const el = en.target as HTMLElement;
              io.unobserve(el);
              if (el.hasAttribute('data-chart')) {
                el.classList.add('is-in');
                Array.from(el.querySelectorAll<HTMLElement>('[data-count]')).forEach((n, i) => {
                  timers.add(window.setTimeout(() => countUp(n, 900), i * 110 + 250));
                });
              } else {
                countUp(el, 1200);
              }
            });
          },
          { threshold: 0.35 }
        );
        charts.forEach((c) => {
          // start hidden values at 0 so the count-up has somewhere to start (bars are hidden by CSS until .is-in)
          c.querySelectorAll<HTMLElement>('[data-count]').forEach((n) => {
            n.textContent = '0';
          });
          io.observe(c);
        });
        counters.forEach((n) => {
          n.textContent = '0';
          io.observe(n);
        });
        cleanups.push(() => io.disconnect());
      }
    }

    // 4. Card rails: prev/next buttons, an edge mask on whichever side still has hidden cards.
    const FADE = 36;
    const buildMask = (canLeft: boolean, canRight: boolean) => {
      const stops: string[] = [];
      stops.push(canLeft ? 'transparent 0' : 'black 0');
      if (canLeft) stops.push(`black ${FADE}px`);
      stops.push(canRight ? `black calc(100% - ${FADE}px)` : 'black 100%');
      if (canRight) stops.push('transparent 100%');
      return `linear-gradient(to right, ${stops.join(', ')})`;
    };
    root.querySelectorAll<HTMLElement>('.rail-block').forEach((block) => {
      const rail = block.querySelector<HTMLElement>('.rail');
      const prev = block.querySelector<HTMLButtonElement>('[data-rail-dir="prev"]');
      const next = block.querySelector<HTMLButtonElement>('[data-rail-dir="next"]');
      const nav = block.querySelector<HTMLElement>('.rail-nav');
      if (!rail) return;
      const update = () => {
        const max = rail.scrollWidth - rail.clientWidth;
        const scrollable = max > 2;
        const canLeft = scrollable && rail.scrollLeft > 2;
        const canRight = scrollable && rail.scrollLeft < max - 2;
        if (nav) nav.hidden = !scrollable;
        if (prev) prev.disabled = !canLeft;
        if (next) next.disabled = !canRight;
        const mask = scrollable ? buildMask(canLeft, canRight) : 'none';
        rail.style.maskImage = mask;
        rail.style.setProperty('-webkit-mask-image', mask);
      };
      const scrollByCard = (dir: number) => {
        const card = rail.querySelector('.card');
        const stepPx = card ? card.getBoundingClientRect().width + 20 : rail.clientWidth * 0.8;
        rail.scrollBy({ left: dir * stepPx, behavior: reduce ? 'auto' : 'smooth' });
      };
      const onPrev = () => scrollByCard(-1);
      const onNext = () => scrollByCard(1);
      prev?.addEventListener('click', onPrev);
      next?.addEventListener('click', onNext);
      rail.addEventListener('scroll', update, { passive: true });
      window.addEventListener('resize', update);
      update();
      cleanups.push(() => {
        prev?.removeEventListener('click', onPrev);
        next?.removeEventListener('click', onNext);
        rail.removeEventListener('scroll', update);
        window.removeEventListener('resize', update);
      });
    });

    return () => cleanups.forEach((fn) => fn());
  }, []);

  return (
    <div id="sewer-v2" ref={ref} className={className}>
      {children}
    </div>
  );
}
