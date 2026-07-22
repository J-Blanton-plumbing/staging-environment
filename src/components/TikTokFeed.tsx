import { cn } from '@/lib/utils';
import { ELFSIGHT_WIDGETS } from '@/lib/widgets';

interface Props {
  /** Headline rendered above the feed. Omit when the call site renders its own headline. */
  headline?: string;
  /** Page-specific extras appended to the shared headline classes. */
  headlineClassName?: string;
  /** Optional wrapper around the embed (e.g. home's `overflow-x-auto`). */
  className?: string;
  /** Elfsight widget UUID. Defaults to the canonical tiktok constant. */
  widgetId?: string;
}

/**
 * Elfsight TikTok feed with an optional headline. The widget ID lives once in
 * `@/lib/widgets`. Call sites pass their own headline copy (and any
 * page-specific spacing) so the markup renders identically to before; sites
 * whose headline lives outside this component's wrapper omit `headline`.
 */
export default function TikTokFeed({ headline, headlineClassName, className, widgetId = ELFSIGHT_WIDGETS.tiktok }: Props) {
  const embed = (
    <div className={`elfsight-app-${widgetId}`} data-elfsight-app-lazy />
  );
  return (
    <>
      {headline && (
        <p className={cn('text-center font-display font-bold text-[24px] text-navy-800 mb-5', headlineClassName)}>
          {headline}
        </p>
      )}
      {className ? <div className={className}>{embed}</div> : embed}
    </>
  );
}
