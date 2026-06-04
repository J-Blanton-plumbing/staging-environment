'use client';

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
 * Triggers the J. Blanton involve.me popup "schedule-service-new".
 * Reads UTM params from the URL (or sessionStorage) and passes them
 * to involve.me — the embed script handles the rest on click.
 *
 * Make sure <InvolveMeScript /> is mounted (in app/layout.tsx).
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
        'involveme_popup link-button inline-flex items-center justify-center gap-2 font-display font-semibold tracking-wider rounded transition-colors cursor-pointer',
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      data-params="source=,campaignname=,utm_campaign=,utm_adgroup=,keyword=,network=,device=,medium=,gclid=,msclkid="
      data-project="schedule-service-new"
      data-embed-mode="popup"
      data-trigger-event="button"
      data-popup-size="medium"
      data-organization-url="https://jblantonplumbing.involve.me"
    >
      {showIcon && <CalendarDays className="h-4 w-4" strokeWidth={2.5} />}
      <span>{children}</span>
    </div>
  );
}
