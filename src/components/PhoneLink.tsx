'use client';

import type { ReactNode } from 'react';
import { useWhatConvertsNumber } from '@/lib/useWhatConvertsNumber';

/**
 * Two small client primitives that let React OWN the WhatConverts tracking
 * number, usable from server components (a client component may be rendered
 * inside one).
 *
 * They exist because DOM patching demonstrably does not hold on iOS. The vendor
 * script rewrites phone text and hrefs after load; React reverts what it owns on
 * re-render, and Safari resolves a tel: target from the touch gesture, so a
 * repair at click time is too late to change what is dialled. In the field the
 * header — once it rendered the number through React — dialled correctly on the
 * device that had been failing, while server-rendered CTAs still relying on the
 * vendor's patch displayed the tracking number and dialled the default one.
 *
 * Deliberately split into two pieces so converting a CTA does not change its
 * markup: wrap the anchor with PhoneLink, and swap the number text for
 * PhoneNumber. Icons, spans and classes stay exactly where they were, which
 * matters because these CTAs are a faithful clone of the original theme's layout.
 *
 * Both fall back to the passed-in default whenever no pool number is assigned,
 * which is correct behaviour rather than a failure — the canonical number must
 * always be reachable.
 */

interface PhoneLinkProps {
  /** Default dial target, e.g. `tel:773-724-9272`. */
  href: string;
  /**
   * Default display number, e.g. `773-724-9272`. Used to find which mapping
   * applies; pass it even when the visible text lives in a child PhoneNumber.
   */
  display: string;
  className?: string;
  children?: ReactNode;
  'aria-label'?: string;
}

export function PhoneLink({
  href,
  display,
  className,
  children,
  'aria-label': ariaLabel,
}: PhoneLinkProps) {
  const swapped = useWhatConvertsNumber(display);
  return (
    <a href={swapped?.href ?? href} className={className} aria-label={ariaLabel}>
      {children}
    </a>
  );
}

/** Renders just the number text, swapped when a pool number is assigned. */
export function PhoneNumber({ value }: { value: string }) {
  const swapped = useWhatConvertsNumber(value);
  return <>{swapped?.display ?? value}</>;
}
