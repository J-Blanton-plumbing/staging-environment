import { cn } from '@/lib/utils';
import { CalendarDays } from 'lucide-react';
import type { ReactNode } from 'react';

interface Props {
  children?: ReactNode;
  className?: string;
  variant?: 'red' | 'blue' | 'white' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const VARIANTS = {
  red:     'bg-brand-600 hover:bg-brand-700 text-white',
  blue:    'bg-accent-500 hover:bg-brand-600 text-white',
  white:   'bg-white hover:bg-cream-100 text-brand-700',
  outline: 'bg-transparent hover:bg-white/10 text-white border-2 border-white',
};

const SIZES = {
  sm: 'text-xs px-4 py-2.5',
  md: 'text-sm px-5 py-3',
  lg: 'text-base px-7 py-4',
};

/**
 * Opens the site's "Schedule a Service" popup (Brief 169) — Mainline's own
 * /schedule-service form in a first-party modal.
 *
 * All this renders is the `schedule-popup` class. <ScheduleServiceModal />,
 * mounted once in app/layout.tsx, catches the click with a single delegated
 * listener on `document` and builds the iframe URL, attribution included.
 *
 * That is also why this is no longer a client component: with delegation there
 * is nothing client-side left here, so the five call sites may render it from a
 * server component. Props, classes and the VARIANTS/SIZES table are unchanged
 * from the involve.me version — the button has to look identical.
 */
export default function ScheduleButton({
  children = 'SCHEDULE A SERVICE',
  className,
  variant = 'blue',
  size = 'md',
  showIcon = false,
}: Props) {
  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        'schedule-popup link-button inline-flex items-center justify-center gap-2 font-display font-semibold tracking-wider rounded-full transition-colors duration-150 cursor-pointer',
        VARIANTS[variant],
        SIZES[size],
        className
      )}
    >
      {showIcon && <CalendarDays className="h-4 w-4" strokeWidth={2.5} />}
      <span>{children}</span>
    </div>
  );
}
