import { ELFSIGHT_WIDGETS } from '@/lib/widgets';

/**
 * Elfsight Google Reviews carousel. The widget ID lives once in
 * `@/lib/widgets`; the Elfsight platform script (loaded in the root
 * layout) hydrates any element with the matching `elfsight-app-<id>` class.
 * Page-specific spacing stays on the wrapping element at the call site.
 */
export default function GoogleReviews() {
  return (
    <div className={`elfsight-app-${ELFSIGHT_WIDGETS.googleReviews}`} data-elfsight-app-lazy />
  );
}
