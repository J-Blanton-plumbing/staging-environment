'use client';

import { RefObject, useEffect, useState } from 'react';

/**
 * Computes fixed-viewport coordinates for a portaled popover panel anchored to a
 * trigger element. Needed because the sidebar itself scrolls (`overflow-y: auto`,
 * which per the CSS spec also forces `overflow-x` to clip) — an absolutely
 * positioned panel nested inside it gets cut off at the sidebar's own edges.
 * Portaling to `document.body` with these coordinates renders the panel above
 * everything, unclipped (Brief 85 iter. 3 bugfix).
 */
export function usePopoverPlacement(
  open: boolean,
  triggerRef: RefObject<HTMLElement>,
  width: number
) {
  const [style, setStyle] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useEffect(() => {
    if (!open) return;
    function place() {
      const el = triggerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
      const top = Math.min(rect.bottom + 6, window.innerHeight - 40);
      setStyle({ top, left });
    }
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, triggerRef, width]);

  return style;
}
