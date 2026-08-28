'use client';

/**
 * Brief 156 — before/after comparison slider, replacing the jQuery plugin the
 * live Webflow page uses (`.viewer` → `.before-wrapper`/`.after-wrapper`/
 * `.separator`). No jQuery comes across; this is the whole behaviour.
 *
 * Note on fidelity: the live plugin is BROKEN — it sizes each `.viewer` from the
 * first image's rendered height at init time, but the images are `loading="lazy"`
 * and so measure 0 below the fold. 7 of the 9 sliders therefore collapse to
 * `height: 0` and render nothing at all on the live page, and the 2 that do
 * initialise squeeze a 3:4 photo into a 1.29:1 box. That defect is NOT cloned —
 * Brief 156 §6.2 specifies the correct behaviour instead (fixed aspect ratio,
 * 67% start, pointer + keyboard). See punch-list item in the implementation
 * report.
 *
 * Sizing: the container owns a fixed 3:4 aspect ratio and both images fill it
 * with object-cover, so there is no layout shift and no dependence on when the
 * images decode. Two of the nine "before" photos are landscape at source
 * (pairs 8 and 9); object-cover centre-crops them into the portrait frame.
 *
 * Accessibility: the divider is a real `role="slider"` with arrow-key support,
 * Home/End, and a visible focus ring. Pointer events cover mouse, touch and pen
 * in one code path; `setPointerCapture` keeps the drag alive when the pointer
 * leaves the element.
 */

import Image from 'next/image';
import { useCallback, useId, useRef, useState } from 'react';

export interface BeforeAfterPair {
  /** Absolute path under /bathrooms/gallery/ — never relative (Brief 127, gotcha #3). */
  beforeSrc: string;
  afterSrc: string;
  /** Describes the transformation for screen readers; both images are decorative on their own. */
  label: string;
}

/** The live plugin's configured start position. */
const INITIAL_PERCENT = 67;
const KEYBOARD_STEP = 2;

export default function BeforeAfterSlider({ beforeSrc, afterSrc, label }: BeforeAfterPair) {
  const [percent, setPercent] = useState(INITIAL_PERCENT);
  const containerRef = useRef<HTMLDivElement>(null);
  const labelId = useId();

  const setFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0) return;
    const next = ((clientX - rect.left) / rect.width) * 100;
    setPercent(Math.min(100, Math.max(0, next)));
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setFromClientX(e.clientX);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    // Stops the browser turning a horizontal drag into a scroll/pan on touch.
    e.preventDefault();
    setFromClientX(e.clientX);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const nudge = (delta: number) => {
      e.preventDefault();
      setPercent((p) => Math.min(100, Math.max(0, p + delta)));
    };
    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        return nudge(-KEYBOARD_STEP);
      case 'ArrowRight':
      case 'ArrowUp':
        return nudge(KEYBOARD_STEP);
      case 'PageDown':
        return nudge(-10);
      case 'PageUp':
        return nudge(10);
      case 'Home':
        e.preventDefault();
        return setPercent(0);
      case 'End':
        e.preventDefault();
        return setPercent(100);
      default:
    }
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className="relative aspect-[3/4] w-full touch-none select-none overflow-hidden rounded-lg bg-[#E5E5DB]"
    >
      <span id={labelId} className="sr-only">
        {label}
      </span>

      {/* Bottom layer: the "after" photo, always fully visible. */}
      <Image
        src={afterSrc}
        alt=""
        fill
        sizes="(max-width: 767px) 100vw, (max-width: 991px) 50vw, 33vw"
        className="pointer-events-none object-cover"
      />

      {/* Top layer: the "before" photo at full container size, revealed up to the
          divider by a clip-path. Clipping (rather than shrinking a wrapper) is
          what keeps the photo itself stationary while the edge sweeps across it —
          and it has no reciprocal-width maths to divide by zero at 0%. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ clipPath: `inset(0 ${100 - percent}% 0 0)` }}
      >
        <Image
          src={beforeSrc}
          alt=""
          fill
          sizes="(max-width: 767px) 100vw, (max-width: 991px) 50vw, 33vw"
          className="object-cover"
        />
      </div>

      {/* Divider: 4px white bar at 70% opacity with a round grab handle, as the
          live plugin renders it. */}
      <div
        role="slider"
        tabIndex={0}
        aria-labelledby={labelId}
        aria-orientation="horizontal"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
        aria-valuetext={`${Math.round(percent)}% before, ${100 - Math.round(percent)}% after`}
        onKeyDown={onKeyDown}
        className="absolute inset-y-0 z-10 -ml-0.5 w-1 cursor-ew-resize bg-white/70 outline-none focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#1560E6]"
        style={{ left: `${percent}%` }}
      >
        <span className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-[0_1px_4px_rgba(23,23,20,0.35)]">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="#171714" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 6 4 12l5 6M15 6l5 6-5 6" />
          </svg>
        </span>
      </div>
    </div>
  );
}
