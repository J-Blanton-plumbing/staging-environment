'use client';

/**
 * Brief 156 — the Google-review screenshot lightbox, replacing Webflow's
 * `w-lightbox` (which comes with the Webflow runtime and jQuery; neither is
 * ported).
 *
 * Renders the two screenshot thumbnails as buttons; clicking either opens a
 * modal showing the full screenshot. Closes on backdrop click, the close button
 * and Esc, and traps focus while open.
 */

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface ReviewScreenshot {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export default function ReviewLightbox({ screenshots }: { screenshots: ReviewScreenshot[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    setOpenIndex(null);
    lastFocusedRef.current?.focus?.();
  }, []);

  const open = (i: number) => {
    lastFocusedRef.current = document.activeElement as HTMLElement | null;
    setOpenIndex(i);
  };

  useEffect(() => {
    if (openIndex === null) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
        return;
      }
      if (e.key !== 'Tab') return;
      // Focus trap: this dialog's only focusable element is the close button, so
      // Tab and Shift+Tab both just keep focus on it.
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button, [href], [tabindex]:not([tabindex="-1"])');
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.querySelector<HTMLElement>('button')?.focus();
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [openIndex, close]);

  const active = openIndex === null ? null : screenshots[openIndex];

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        {screenshots.map((shot, i) => (
          <button
            key={shot.src}
            type="button"
            onClick={() => open(i)}
            aria-label={`Open review screenshot: ${shot.alt}`}
            /* Square 256px thumbnails with a centre crop — the source renders
               these at 256x256 with object-fit: cover and no corner radius. */
            className="block aspect-square w-full cursor-pointer overflow-hidden border-0 bg-transparent p-0"
          >
            <Image
              src={shot.src}
              alt={shot.alt}
              width={shot.width}
              height={shot.height}
              sizes="(max-width: 767px) 45vw, 256px"
              className="h-full w-full object-cover"
            />
          </button>
        ))}
      </div>

      {active && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-5">
          {/* The page's warm ink at 50%, not #000000 (Brief 156 §4.2). */}
          <button
            type="button"
            aria-label="Close"
            onClick={close}
            className="absolute inset-0 z-[1] cursor-pointer border-0"
            style={{ backgroundColor: 'rgba(23, 23, 20, 0.5)' }}
          />
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={active.alt}
            className="relative z-[2] max-h-[90vh] w-auto max-w-[min(90vw,600px)] overflow-hidden rounded-2xl bg-white"
          >
            <Image
              src={active.src}
              alt={active.alt}
              width={active.width}
              height={active.height}
              sizes="(max-width: 767px) 90vw, 600px"
              className="max-h-[90vh] w-full object-contain"
            />
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="absolute right-3 top-3 z-10 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-0 bg-white/90 p-0 shadow-[0_1px_4px_rgba(23,23,20,0.35)]"
            >
              <Image
                src="/bathrooms/icons/close-cross.svg"
                alt=""
                width={20}
                height={20}
                unoptimized
                className="h-5 w-5"
              />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
