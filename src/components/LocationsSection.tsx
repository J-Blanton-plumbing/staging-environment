import { cn } from '@/lib/utils';
import ScheduleButton from '@/components/ScheduleButton';
import LocationsMap from '@/components/LocationsMap';

interface Props {
  heading: string;
  /** One or more body paragraphs. The last gets `mb-6`, earlier ones `mb-3`. */
  body: string[];
  /** Page-specific classes for the outer <section>. */
  className?: string;
  /** Page-specific extras for the inner grid wrapper (e.g. home's width/centering). */
  contentsClassName?: string;
  /** Optional class for the left text column (e.g. Plumbing's `ep-contents`). */
  contentClassName?: string;
  /** Page-specific extras for the heading (e.g. `leading-none` vs `leading-tight uppercase`). */
  headingClassName?: string;
  /** Base classes for the body paragraphs (differs per page). */
  bodyClassName?: string;
  /**
   * Show the BOOK NOW button under the copy. Home keeps it; category pages
   * (e.g. Plumbing's `.ep-map`) omit it to match live (brief-08 §9).
   */
  showButton?: boolean;
  /** Render Home's mobile-only BOOK NOW button below the map. */
  mobileButton?: boolean;
}

/**
 * Two-column "heading + copy + BOOK NOW + map" section, used by Home's
 * `find-us` and Plumbing's `ep-map`. Wraps the existing <LocationsMap />.
 */
export default function LocationsSection({
  heading,
  body,
  className,
  contentsClassName,
  contentClassName,
  headingClassName,
  bodyClassName,
  showButton = true,
  mobileButton = false,
}: Props) {
  return (
    <section className={className}>
      <div className={cn('grid grid-cols-1 lg:grid-cols-2 gap-10 items-center', contentsClassName)}>
        <div className={contentClassName}>
          <p
            className={cn(
              'red-text font-display font-bold text-brand-600 text-[28px] md:text-[32px] tracking-tight mb-4',
              headingClassName
            )}
          >
            {heading}
          </p>
          {body.map((para, i) => (
            <p key={i} className={cn(bodyClassName, i === body.length - 1 ? 'mb-6' : 'mb-3')}>
              {para}
            </p>
          ))}
          {showButton && (
            <ScheduleButton variant="blue" size="md" className="text-sm font-semibold">
              BOOK NOW
            </ScheduleButton>
          )}
        </div>

        <LocationsMap />

        {mobileButton && (
          <div className="lg:hidden">
            <ScheduleButton
              variant="blue"
              size="md"
              className="book-now-map w-full text-sm font-semibold"
            >
              BOOK NOW
            </ScheduleButton>
          </div>
        )}
      </div>
    </section>
  );
}
