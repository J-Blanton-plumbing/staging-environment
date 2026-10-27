'use client';

import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import dynamic from 'next/dynamic';

// The Homepage 2026 stylesheet, code-split so it is linked only when this record renders.
const Home2026Styles = dynamic(() => import('./Home2026Styles'));

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Homepage 2026 (Brief 220) — the `.home-2026` wrapper every scoped rule hangs off, and the port of
 * the prototype's page-level script that is not owned by a section component:
 *
 *   - `class="js"` (the prototype put it on <html>; here it goes on the wrapper, in a layout effect)
 *   - the services directory: every group open on desktop with an inert summary; at ≤ 700px the
 *     groups collapse and each toggles (the prototype's inline script after the directory)
 *
 * The job stories, the video facade and the office finder are their own client components.
 * Everything is scoped to this element and torn down on unmount.
 */
export default function Home2026Root({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useIsoLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const cleanups: Array<() => void> = [];
    root.classList.add('js');
    cleanups.push(() => root.classList.remove('js'));

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
    <div className="home-2026" ref={ref}>
      <Home2026Styles />
      {children}
    </div>
  );
}
