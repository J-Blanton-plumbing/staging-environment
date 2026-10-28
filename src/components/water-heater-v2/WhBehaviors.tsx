'use client';

import { useEffect } from 'react';
import { WH_UI } from '@/lib/content/water-heater-v2/ui';

/**
 * Brief 222 — the port of the package's js/water-heater.js (the base script.js is SewerV2Root, shared
 * with the sewer pages). Renders nothing; everything is scoped to the water heater root
 * (`#sewer-v2.wh-v2`) and torn down on unmount, so a client-side navigation away leaves nothing behind.
 *
 *   1. headline rotator   — "Chicagoland" ⇄ "Columbus, OH"; hover pauses, a tap toggles pause (WCAG
 *                           2.2.2), hidden tabs pause; NEVER rotates under prefers-reduced-motion
 *   2. mobile sticky bar  — shown only while neither the hero call button nor the final CTA is on screen
 *   3. severity card      — the hub's mild → serious bar grows once, then the dots fade in
 *   4. job-photo gallery  — arrows, thumbnails, ←/→ keys and swipe; wraps at both ends
 *   5. "On this page"     — open on desktop, collapsed below 1001px (closes after a jump); scrollspy
 *   6. long tables        — more than 3 rows: 3 + "Show N more" on phones (CSS hides the button above 700px)
 */
export default function WhBehaviors() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('#sewer-v2.wh-v2');
    if (!root) return;
    const cleanups: Array<() => void> = [];
    const on = <K extends keyof HTMLElementEventMap>(el: EventTarget, type: K | string, fn: EventListener, opts?: AddEventListenerOptions) => {
      el.addEventListener(type, fn, opts);
      cleanups.push(() => el.removeEventListener(type, fn, opts));
    };
    const reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;
    const hasIO = 'IntersectionObserver' in window;

    // 1. Market name rotator.
    const rot = root.querySelector<HTMLElement>('[data-rotate]');
    if (rot && !reduce) {
      const host = rot.closest<HTMLElement>('[data-rotate-host]') ?? rot;
      const items = Array.from(rot.children) as HTMLElement[];
      if (items.length >= 2) {
        let i = 0;
        const HOLD = 2600;
        let timer: number | null = null;
        let hovered = false;
        let tapped = false;
        const timeouts = new Set<number>();
        const next = () => {
          const cur = items[i];
          i = (i + 1) % items.length;
          const nxt = items[i];
          cur.classList.add('is-out');
          cur.classList.remove('is-on');
          nxt.classList.remove('is-out');
          requestAnimationFrame(() => nxt.classList.add('is-on'));
          const t = window.setTimeout(() => {
            cur.classList.remove('is-out');
            timeouts.delete(t);
          }, 340);
          timeouts.add(t);
        };
        const start = () => {
          if (!timer && !hovered && !tapped && !document.hidden) timer = window.setInterval(next, HOLD);
        };
        const stop = () => {
          if (timer) window.clearInterval(timer);
          timer = null;
        };
        on(host, 'mouseenter', () => { hovered = true; stop(); });
        on(host, 'mouseleave', () => { hovered = false; start(); });
        on(host, 'pointerup', (e) => {
          if ((e as PointerEvent).pointerType === 'mouse') return;
          tapped = !tapped;
          if (tapped) stop(); else start();
        });
        on(document, 'visibilitychange', () => (document.hidden ? stop() : start()));
        start();
        cleanups.push(() => {
          stop();
          timeouts.forEach((t) => window.clearTimeout(t));
        });
      }
    }

    // 2. Mobile sticky call bar.
    const bar = root.querySelector<HTMLElement>('.ss-sticky-cta');
    if (bar) {
      const watch = [root.querySelector('.hero-cta'), root.querySelector('#book')].filter((x): x is Element => !!x);
      if (!hasIO || !watch.length) bar.classList.add('is-shown');
      else {
        const visible = new Set<Element>();
        const obs = new IntersectionObserver((entries) => {
          entries.forEach((en) => (en.isIntersecting ? visible.add(en.target) : visible.delete(en.target)));
          bar.classList.toggle('is-shown', visible.size === 0);
        });
        watch.forEach((el) => obs.observe(el));
        cleanups.push(() => obs.disconnect());
      }
    }

    // 3. Severity card.
    const card = root.querySelector<HTMLElement>('.wh-signs');
    if (card) {
      card.querySelectorAll<HTMLElement>('.wh-dot').forEach((d, i) => d.style.setProperty('--d', String(i)));
      if (!hasIO || reduce) card.classList.add('is-in');
      else {
        const o2 = new IntersectionObserver(
          (entries) => entries.forEach((en) => {
            if (en.isIntersecting) {
              card.classList.add('is-in');
              o2.unobserve(card);
            }
          }),
          { threshold: 0.35 }
        );
        o2.observe(card);
        cleanups.push(() => o2.disconnect());
      }
    }

    // 4. Job-photo gallery.
    root.querySelectorAll<HTMLElement>('[data-rj-gallery]').forEach((g) => {
      const main = g.querySelector<HTMLImageElement>('.rj-main');
      const thumbs = Array.from(g.querySelectorAll<HTMLButtonElement>('.rj-thumb'));
      const n = g.querySelector<HTMLElement>('[data-rj-n]');
      if (!main || thumbs.length < 2) return;
      let i = 0;
      const show = (k: number) => {
        i = (k + thumbs.length) % thumbs.length;
        const t = thumbs[i];
        const src = t.getAttribute('data-src') ?? '';
        thumbs.forEach((x, j) => x.setAttribute('aria-current', j === i ? 'true' : 'false'));
        if (n) n.textContent = String(i + 1);
        main.classList.add('is-swapping');
        const pre = new Image();
        pre.onload = pre.onerror = () => {
          main.src = src;
          main.alt = t.getAttribute('data-alt') ?? '';
          main.classList.remove('is-swapping');
        };
        pre.src = src;
      };
      thumbs.forEach((t, j) => on(t, 'click', () => show(j)));
      const prev = g.querySelector('.rj-prev');
      const nxt = g.querySelector('.rj-next');
      if (prev) on(prev, 'click', () => show(i - 1));
      if (nxt) on(nxt, 'click', () => show(i + 1));
      on(g, 'keydown', (e) => {
        const k = (e as KeyboardEvent).key;
        if (k === 'ArrowLeft') { show(i - 1); e.preventDefault(); }
        if (k === 'ArrowRight') { show(i + 1); e.preventDefault(); }
      });
      const stage = g.querySelector('.rj-stage');
      let x0: number | null = null;
      if (stage) {
        on(stage, 'touchstart', (e) => { x0 = (e as TouchEvent).touches[0].clientX; }, { passive: true });
        on(stage, 'touchend', (e) => {
          if (x0 === null) return;
          const dx = (e as TouchEvent).changedTouches[0].clientX - x0;
          x0 = null;
          if (Math.abs(dx) > 40) show(dx < 0 ? i + 1 : i - 1);
        });
      }
    });

    // 5. "On this page" index.
    const toc = root.querySelector<HTMLDetailsElement>('[data-toc]');
    if (toc) {
      const mq = window.matchMedia('(min-width:1001px)');
      const sync = () => { toc.open = mq.matches; };
      sync();
      if (mq.addEventListener) {
        mq.addEventListener('change', sync);
        cleanups.push(() => mq.removeEventListener('change', sync));
      }
      const summary = toc.querySelector('summary');
      if (summary) on(summary, 'click', (e) => { if (mq.matches) e.preventDefault(); });
      const links = Array.from(toc.querySelectorAll<HTMLAnchorElement>('a[href^="#"]'));
      const secs = links.map((a) => document.getElementById((a.getAttribute('href') ?? '').slice(1)));
      links.forEach((a, k) => on(a, 'click', (e) => {
        const t = secs[k];
        if (!t) return;
        e.preventDefault();
        t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
        if (history.replaceState) history.replaceState(history.state, '', `#${t.id}`);
        if (!mq.matches) toc.open = false;
      }));
      let ticking = false;
      let frame = 0;
      const spy = () => {
        ticking = false;
        let cur = -1;
        const line = 140;
        secs.forEach((sec, k) => { if (sec && sec.getBoundingClientRect().top <= line) cur = k; });
        links.forEach((a, k) => (k === cur ? a.setAttribute('aria-current', 'location') : a.removeAttribute('aria-current')));
      };
      on(window, 'scroll', () => {
        if (!ticking) {
          ticking = true;
          frame = requestAnimationFrame(spy);
        }
      }, { passive: true });
      cleanups.push(() => cancelAnimationFrame(frame));
      spy();
    }

    // 6. "Show N more" on long tables.
    root.querySelectorAll<HTMLTableElement>('table.wh-table').forEach((t, k) => {
      const rows = t.tBodies[0] ? t.tBodies[0].rows.length : 0;
      if (rows <= 3) return;
      const addedId = !t.id;
      if (addedId) t.id = `wh-table-${k + 1}`;
      t.classList.add('wh-collapsible');
      const more = rows - 3;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'wh-more';
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-controls', t.id);
      const label = document.createElement('span');
      label.textContent = WH_UI.tableMore(more);
      btn.appendChild(label);
      btn.insertAdjacentHTML('beforeend', '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>');
      on(btn, 'click', () => {
        const open = t.classList.toggle('is-expanded');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        label.textContent = open ? WH_UI.tableLess : WH_UI.tableMore(more);
        if (!open) t.scrollIntoView({ block: 'nearest' });
      });
      const host = t.closest('.ss-compare-wrap') ?? t;
      host.parentNode?.insertBefore(btn, host.nextSibling);
      cleanups.push(() => {
        btn.remove();
        t.classList.remove('wh-collapsible', 'is-expanded');
        if (addedId) t.removeAttribute('id');
      });
    });

    return () => cleanups.forEach((fn) => fn());
  }, []);

  return null;
}
