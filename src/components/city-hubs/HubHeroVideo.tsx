'use client';

import { useEffect, useRef } from 'react';
import type { HubHeroVideo as Video } from '@/lib/city-hub-cms/model';

/**
 * Brief 216 (Track C3) — the full-bleed City Hub hero's background video (Evanston): muted, looping,
 * decorative (`aria-hidden`), `preload="metadata"`, cover-fitted by `.hub-hero--full` in city-hubs.css.
 *
 * `prefers-reduced-motion: reduce` → it does not play and shows the poster as a still. On a hard load
 * the inline guard CityHubView renders right after this element stops autoplay before the first frame
 * (an effect runs too late for that); this effect covers a client-side navigation, where inline
 * scripts don't run. With a `srcMobile`, the portrait cut plays below 781px (the Local Office
 * template's breakpoint).
 */
export default function HubHeroVideo({ video }: { video: Video }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v || typeof window.matchMedia !== 'function' || !window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    v.autoplay = false;
    v.removeAttribute('autoplay');
    v.pause();
    if (v.currentTime > 0) v.load(); // back to the poster if it had already started
  }, []);
  return (
    <video
      aria-hidden="true"
      autoPlay
      className="hub-hero-video"
      loop
      muted
      playsInline
      poster={video.poster}
      preload="metadata"
      ref={ref}
      src={video.srcMobile ? undefined : video.src}
    >
      {video.srcMobile ? (
        <>
          <source media="(max-width:780px)" src={video.srcMobile} type="video/mp4" />
          <source src={video.src} type="video/mp4" />
        </>
      ) : null}
    </video>
  );
}
