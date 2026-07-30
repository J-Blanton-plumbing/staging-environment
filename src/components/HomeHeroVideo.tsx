'use client';

import { useEffect, useRef, useState } from 'react';

const DESKTOP_SRC = '/videos/homepage-hero-desktop.webm';
const MOBILE_SRC = '/videos/homepage-hero-mobile.webm';
// Homepage mobile breakpoint — matches the hero's max-[780px] Tailwind variants
// and the legacy home.css 780px media query.
const MOBILE_QUERY = '(max-width: 780px)';

/**
 * Homepage hero video with desktop/mobile source switching (Brief 125).
 *
 * The src is chosen client-side via matchMedia instead of rendering two
 * <video> elements toggled by CSS: a display:none video with `autoplay`
 * still downloads its source, so the CSS approach double-fetches on every
 * device. Server-side this renders poster-only (no src), which keeps the
 * poster as the fast first paint; the correct file streams in on hydration.
 */
export default function HomeHeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setSrc(window.matchMedia(MOBILE_QUERY).matches ? MOBILE_SRC : DESKTOP_SRC);
  }, []);

  useEffect(() => {
    // Safety net: src arrives after hydration, and some browsers won't
    // re-evaluate the autoplay attribute on a late-set source.
    if (src) videoRef.current?.play().catch(() => {});
  }, [src]);

  return (
    <>
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        poster="/images/hero-poster.webp"
        src={src ?? undefined}
        onPlaying={() => setPlaying(true)}
        className="absolute inset-0 w-full h-full object-cover z-[1]"
      />
      {/* Legibility scrim replicating the live site's look. The live hero has
          no CSS overlay — its darkness is baked into the old export's color
          grade (measured avg RGB [62,49,50] vs the new export's [121,89,90],
          a uniform ~0.55x neutral multiply). rgba(0,0,0,0.45) reproduces that
          grade on the new footage; Midnight-tinting cannot (it needs
          incompatible per-channel alphas and adds a blue cast the live site
          doesn't have). Gated on `playing` because the poster already carries
          the baked-dark grade — scrimming it too would double-darken first
          paint relative to live. */}
      <div
        aria-hidden
        className={`absolute inset-0 z-[1] bg-[rgba(0,0,0,0.45)] pointer-events-none transition-opacity duration-500 ${playing ? 'opacity-100' : 'opacity-0'}`}
      />
    </>
  );
}
