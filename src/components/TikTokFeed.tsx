import { cn } from '@/lib/utils';
import { ELFSIGHT_WIDGETS } from '@/lib/widgets';

interface Props {
  /** Headline rendered above the feed. */
  headline: string;
  /** Page-specific extras appended to the shared headline classes. */
  headlineClassName?: string;
  /** Optional wrapper around the embed (e.g. home's `overflow-x-auto`). */
  className?: string;
}

/**
 * Elfsight TikTok feed with a headline. The widget ID lives once in
 * `@/lib/widgets`. Both call sites pass their own headline copy (and any
 * page-specific spacing) so the markup renders identically to before.
 */
export default function TikTokFeed({ headline, headlineClassName, className }: Props) {
  const embed = (
    <div className={`elfsight-app-${ELFSIGHT_WIDGETS.tiktok}`} data-elfsight-app-lazy />
  );
  return (
    <>
      <p className={cn('text-center font-display font-bold text-[24px] text-navy-800 mb-5', headlineClassName)}>
        {headline}
      </p>
      {className ? <div className={className}>{embed}</div> : embed}
    </>
  );
}
