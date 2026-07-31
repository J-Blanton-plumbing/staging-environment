'use client';

import type { ImgHTMLAttributes, SyntheticEvent } from 'react';

/**
 * Defensive <img> for the city templates (Brief 126, Fix A1).
 *
 * 184+ city pages rendered a broken-image icon because the CMS held a dead
 * WordPress URL (`.../wp-content/uploads/2019/11/Plumbing-Rough-In-800x600.jpg`).
 * The root cause is fixed by the Brief 126 data cleanup
 * (scripts/migrate-brief-126-clear-wp-image-refs.ts); this component is the
 * defensive layer so a broken image can never render again:
 *
 *  1. Up-front: any src still pointing at the dead `wp-content/uploads` tree is
 *     swapped for the fallback before the browser ever requests it.
 *  2. At runtime: `onError` swaps in the fallback when any src 404s in future.
 *
 * Plain `<img>` (not next/image) — matches how every city template already
 * renders these images, so optimization behavior is unchanged.
 */

const DEFAULT_FALLBACK = '/images/hero_image.webp';

/** The dead WordPress uploads tree — nothing under it exists anymore. */
function isDeadWordPressSrc(src: string): boolean {
  return src.includes('wp-content/uploads');
}

export interface CityPageImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  /** Swapped in when `src` is dead. Defaults to the shared city hero fallback. */
  fallbackSrc?: string;
}

export default function CityPageImage({
  src,
  fallbackSrc = DEFAULT_FALLBACK,
  ...rest
}: CityPageImageProps) {
  const resolvedSrc = !src || isDeadWordPressSrc(src) ? fallbackSrc : src;

  function handleError(e: SyntheticEvent<HTMLImageElement>) {
    const img = e.currentTarget;
    // Guard against an error loop if the fallback itself ever fails.
    if (!img.src.endsWith(fallbackSrc)) img.src = fallbackSrc;
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img {...rest} src={resolvedSrc} onError={handleError} />;
}
