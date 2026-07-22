import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface Props {
  /** Page-specific classes for the outer <section> (margins, min-height, CSS hooks). */
  className?: string;
  /** Page-specific classes for the inner flex row (e.g. home's `min-h-[500px]`). */
  innerClassName?: string;
  /** Sizing classes for the character image wrapper (differs per page). */
  characterClassName: string;
  /** Extra classes for the red overlay (e.g. home's `no-drip-red` hook). */
  overlayClassName?: string;
  /** Right-side content placed next to the character. */
  children: ReactNode;

  // ── Brief 91 — optional style overrides ──────────────────────────────────────
  // All default to the historical hard-coded values, so every existing caller
  // (homepage NDC panel, un-styled List Section) renders byte-for-byte as before.
  /** Solid panel background color. Default = Carmine `#BC0E0E`. */
  bgColor?: string;
  /** Textured background image. Pass `null` to drop the texture (solid color only). */
  bgImage?: string | null;
  /** Whether to render the translucent red overlay. Default = true. */
  showOverlay?: boolean;
  /** Character image source. Default = the legacy `/images/jbcharacter.webp`. */
  characterSrc?: string;
  /** Character alt text. */
  characterAlt?: string;
  /** Flip the character to the right side (content on the left). Default = false. */
  reverse?: boolean;
  /**
   * Half-shot framing (Brief 91 fix). The default character (`jbcharacter.webp`)
   * is a pre-cropped half-body, so `object-contain` shows it large. The J poses
   * are full-body head-to-toe, so `object-contain` would shrink the whole figure
   * to a small "full shot". When `characterZoom` is true, the pose is scaled up
   * and top-anchored so only its head-to-thigh portion fills the panel — keeping
   * the original composition's scale — and the legs are cropped at the bottom.
   */
  characterZoom?: boolean;
}

/**
 * Red-overlay panel with the J. Blanton character on the left and a content
 * slot on the right. Used by Home's "No Drip Club" panel and Plumbing's
 * "Problems We Solve" panel. The shell (background, red overlay, character)
 * is fixed; each page passes its own right-side content as children plus the
 * sizing/spacing classes that differ between the two layouts.
 *
 * Brief 91: the sub-service List Section can now remix the panel from a closed
 * brand-approved list — background color, character pose and side — via the
 * optional style props above. Callers that pass none keep the historical look.
 */
export default function CharacterPanel({
  className,
  innerClassName,
  characterClassName,
  overlayClassName,
  children,
  bgColor = '#BC0E0E',
  bgImage = '/images/no-drip-club.webp',
  showOverlay = true,
  characterSrc = '/images/jbcharacter.webp',
  characterAlt = 'J. Blanton Character',
  reverse = false,
  characterZoom = false,
}: Props) {
  return (
    <section
      className={cn('relative rounded-lg overflow-hidden bg-cover bg-center', className)}
      style={{
        backgroundColor: bgColor,
        ...(bgImage
          ? { backgroundImage: `url(${bgImage})`, backgroundBlendMode: 'multiply' }
          : {}),
      }}
    >
      {showOverlay && <div className={cn('absolute inset-0 bg-brand-600/15', overlayClassName)} />}
      <div
        className={cn(
          'relative z-[2] flex flex-col items-center',
          reverse ? 'sm:flex-row-reverse' : 'sm:flex-row',
          innerClassName
        )}
      >
        {/* Character */}
        <div className={cn(characterClassName, characterZoom && 'overflow-hidden')}>
          {characterZoom ? (
            // Zoom to ~200% of the panel height and top-anchor so the head-to-thigh
            // half-shot fills the panel at the original scale; the panel's
            // overflow-hidden crops the legs. `max-w-none` keeps the pose from
            // being width-constrained; horizontally centered.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={characterSrc}
              alt={characterAlt}
              className="absolute left-1/2 top-0 h-[200%] w-auto max-w-none -translate-x-1/2"
            />
          ) : (
            <Image
              src={characterSrc}
              alt={characterAlt}
              fill
              className="object-contain object-bottom"
            />
          )}
        </div>

        {children}
      </div>
    </section>
  );
}
