'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Brief 218 (Track D3) — the homepage hero's rotating market name ("Chicagoland" ↔ "Columbus, OH").
 *
 * Every word is in the server HTML (all spans render; CSS stacks them in one grid cell, so the line
 * never changes width or height between words). This component only moves the `is-on` / `is-out`
 * classes — it never inserts or replaces text. The real heading is the page's sr-only <h1>; the line
 * this sits in is `aria-hidden`.
 *
 * Holds each word 2.6s. Pauses while a mouse is over the line, toggles on a tap (touch), stops while
 * the tab is hidden, and NEVER rotates under `prefers-reduced-motion: reduce` (WCAG 2.2.2) — the
 * first word stays on. Styles: `.hero-rot` in src/app/home-hero.css.
 */
const HOLD_MS = 2600;
/** Longer than the 320ms exit transition: then the outgoing word drops back below, unseen (opacity 0). */
const OUT_CLEAR_MS = 400;

export default function HomeHeroRotator({ words }: { words: readonly string[] }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [state, setState] = useState<{ on: number; out: number | null }>({ on: 0, out: null });
  const count = words.length;

  useEffect(() => {
    const el = ref.current;
    if (!el || count < 2) return;
    const host = el.parentElement ?? el;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    let hover = false;
    let tapped = false;
    let timer: number | undefined;
    let clear: number | undefined;

    const canRun = () => !mq.matches && !hover && !tapped && document.visibilityState === 'visible';
    const schedule = () => {
      window.clearTimeout(timer);
      if (canRun()) timer = window.setTimeout(advance, HOLD_MS);
    };
    const advance = () => {
      setState((s) => ({ on: (s.on + 1) % count, out: s.on }));
      window.clearTimeout(clear);
      clear = window.setTimeout(() => setState((s) => ({ ...s, out: null })), OUT_CLEAR_MS);
      schedule();
    };
    const onMotion = () => {
      if (mq.matches) setState({ on: 0, out: null });
      schedule();
    };
    const onEnter = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') { hover = true; schedule(); }
    };
    const onLeave = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') { hover = false; schedule(); }
    };
    const onTap = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') { tapped = !tapped; schedule(); }
    };

    host.addEventListener('pointerenter', onEnter);
    host.addEventListener('pointerleave', onLeave);
    host.addEventListener('pointerup', onTap);
    document.addEventListener('visibilitychange', schedule);
    mq.addEventListener('change', onMotion);
    schedule();
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(clear);
      host.removeEventListener('pointerenter', onEnter);
      host.removeEventListener('pointerleave', onLeave);
      host.removeEventListener('pointerup', onTap);
      document.removeEventListener('visibilitychange', schedule);
      mq.removeEventListener('change', onMotion);
    };
  }, [count]);

  return (
    <span ref={ref} className="hero-rot" data-rotate="">
      {words.map((w, i) => (
        <span key={w} className={i === state.on ? 'is-on' : i === state.out ? 'is-out' : undefined}>
          {w}
        </span>
      ))}
    </span>
  );
}
