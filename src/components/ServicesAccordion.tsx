'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SERVICES } from '@/lib/services';

/**
 * Mobile services list (below ~900px) — a red collapsible accordion that mirrors
 * the live theme's `.services-contents-mobile` (front-page.php lines ~67–89 + its
 * toggle script). Each row expands on tap to reveal its description + "Read more"
 * link; a full-width "VIEW ALL SERVICES" button sits below. The desktop flex grid
 * and this accordion are swapped at the ~900px breakpoint, same as live.
 */
export default function ServicesAccordion() {
  const [open, setOpen] = useState<Set<string>>(new Set());

  const toggle = (slug: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });

  return (
    <div className="services-contents-mobile min-[900px]:hidden">
      {SERVICES.map((service, i) => {
        const isOpen = open.has(service.slug);
        return (
          <div
            key={service.slug}
            className={cn(
              'service-card bg-brand-600 text-white px-[15px] py-[12px]',
              i < SERVICES.length - 1 && 'border-b border-white'
            )}
          >
            <button
              type="button"
              onClick={() => toggle(service.slug)}
              aria-expanded={isOpen}
              className="service-header w-full flex items-center justify-between text-left"
            >
              <span className="service-label font-display font-bold text-[24px] leading-none">
                {service.name}
              </span>
              <ChevronDown
                className={cn('h-5 w-5 flex-shrink-0 transition-transform', isOpen && 'rotate-180')}
                strokeWidth={1.5}
              />
            </button>

            {isOpen && (
              <div className="pt-[12px]">
                <p className="leading-relaxed">{service.shortDesc}</p>
                <Link
                  href={`/${service.slug}`}
                  className="mt-[10px] inline-flex items-center gap-2 text-white font-display font-bold"
                >
                  Read more <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                </Link>
              </div>
            )}
          </div>
        );
      })}

      <Link
        href="/services"
        className="link-button w-full mt-[25px]"
      >
        VIEW ALL SERVICES
      </Link>
    </div>
  );
}
