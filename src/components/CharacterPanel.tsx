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
}

/**
 * Red-overlay panel with the J. Blanton character on the left and a content
 * slot on the right. Used by Home's "No Drip Club" panel and Plumbing's
 * "Problems We Solve" panel. The shell (background, red overlay, character)
 * is fixed; each page passes its own right-side content as children plus the
 * sizing/spacing classes that differ between the two layouts.
 */
export default function CharacterPanel({
  className,
  innerClassName,
  characterClassName,
  overlayClassName,
  children,
}: Props) {
  return (
    <section
      className={cn('relative rounded-lg overflow-hidden bg-cover bg-center', className)}
      style={{ backgroundImage: 'url(/images/no-drip-club.webp)' }}
    >
      {/* Red overlay */}
      <div className={cn('absolute inset-0 bg-brand-600/95', overlayClassName)} />

      <div className={cn('relative z-[2] flex flex-col lg:flex-row items-center', innerClassName)}>
        {/* Character — left */}
        <div className={characterClassName}>
          <Image
            src="/images/jbcharacter.webp"
            alt="J. Blanton Character"
            fill
            className="object-contain object-bottom"
          />
        </div>

        {children}
      </div>
    </section>
  );
}
