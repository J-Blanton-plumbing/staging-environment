/**
 * Brief 169 (Track A2) — the "Schedule a Service" popup trigger.
 *
 * Deliberately a plain, prop-free element: `ScheduleServiceModal` (mounted once
 * in the root layout) catches the click with ONE delegated listener on
 * `document`, matching on the `schedule-popup` class. So this component has no
 * `'use client'`, no handlers and no `data-*` attributes — which is what lets
 * the seven server-component pages that render a trigger stay server components.
 *
 * It replaces the `.involveme_popup` divs each of those pages used to hand-roll.
 * The class string a caller passes is preserved byte-for-byte, because the
 * per-page CSS files style these buttons by class (`.contact-page
 * .schedule-popup`, …) and every trigger has to look exactly as it did before.
 *
 * Mirrors the shape of `InvolveMePopup.tsx` (which still serves the No Drip Club
 * project) so the two patterns read the same: `div` gets `role`/`tabIndex`,
 * `as="button"` renders a real `<button type="button">` and needs neither.
 */

import type { ReactNode } from 'react';

export default function ScheduleTrigger({
  label,
  className = '',
  as = 'div',
}: {
  label: ReactNode;
  className?: string;
  as?: 'div' | 'button';
}) {
  const cls = `schedule-popup${className ? ` ${className}` : ''}`;

  if (as === 'button') {
    return (
      <button type="button" className={cls}>
        {label}
      </button>
    );
  }

  return (
    <div className={cls} role="button" tabIndex={0}>
      {label}
    </div>
  );
}
