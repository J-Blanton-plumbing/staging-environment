'use client';

import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import dynamic from 'next/dynamic';

// The design system (city-hubs.css) + the pilot stylesheet, code-split into their own async chunk.
const LocationsStyles = dynamic(() => import('./LocationsStyles'));

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Brief 229 (Track D) — the root of /locations, /locations/illinois and /locations/ohio: the same
 * `#city-hub-v2` scope the City Hub design system is written for, with the page's `.pruned` class, the
 * package's `js` class and the scroll reveal. It is deliberately NOT `CityHubRoot`: sharing that client
 * module with these routes made webpack split it into a chunk shared with the `[city]` route, which changed
 * the client chunk list of every city page (the control pages must stay byte-identical).
 */
export default function LocationsRoot({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useIsoLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    root.classList.add('js');
    const reveals = Array.from(root.querySelectorAll<HTMLElement>('.pv-reveal'));
    reveals.forEach((el) => el.classList.add('pv-in'));
    return () => root.classList.remove('js');
  }, []);
  return (
    <div className={className} id="city-hub-v2" ref={ref}>
      <LocationsStyles />
      {children}
    </div>
  );
}
