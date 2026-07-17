'use client';

import { useEffect, useState } from 'react';
import { PAGE_ATTRS_STORAGE_KEY } from './index';

/**
 * Persists the Page Attributes sidebar's open/closed state across the whole
 * admin (one global preference, matching the WP reference panel toggle).
 * First-ever visit defaults to closed on narrow (<768px) viewports so the
 * sidebar doesn't squeeze the editor content — every visit after that reads
 * the stored preference regardless of viewport width.
 */
export function usePageAttributesOpen(): [boolean, (next: boolean) => void] {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(PAGE_ATTRS_STORAGE_KEY);
    if (stored === 'open') { setOpen(true); return; }
    if (stored === 'closed') { setOpen(false); return; }
    setOpen(window.innerWidth >= 768);
  }, []);

  function set(next: boolean) {
    setOpen(next);
    window.localStorage.setItem(PAGE_ATTRS_STORAGE_KEY, next ? 'open' : 'closed');
  }

  return [open, set];
}
