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

  useEffect(() => {
    setSrc(window.matchMedia(MOBILE_QUERY).matches ? MOBILE_SRC : DESKTOP_SRC);
  }, []);

  useEffect(() => {
    // Safety net: src arrives after hydration, and some browsers won't
    // re-evaluate the autoplay attribute on a late-set source.
    if (src) videoRef.current?.play().catch(() => {});
  }, [src]);

  return (
    <video
      ref={videoRef}
      autoPlay
      loop
      muted
      playsInline
      preload="metadata"
      poster="/images/hero-poster.webp"
      src={src ?? undefined}
      className="absolute inset-0 w-full h-full object-cover z-[1]"
    />
  );
}
