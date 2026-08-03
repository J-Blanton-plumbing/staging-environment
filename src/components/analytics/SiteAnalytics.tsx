import { Suspense } from 'react';
import { headers } from 'next/headers';
import { getTrackingIds } from '@/lib/analytics';
import AnalyticsScripts from './AnalyticsScripts';
import Analytics from './Analytics';

/**
 * Brief 128 — single mount point for the whole tracking stack, rendered once
 * from the root layout. Composes:
 *   • AnalyticsScripts — the four env-gated base tags (Track A)
 *   • Analytics — route-change pageviews (Track B) + `element_1_click` (Track C)
 *
 * The `/admin` skip: the CMS panel is an internal tool with no counterpart on
 * the live site (wp-admin never carried these tags), so tagging it would push
 * staff editing sessions into the production GA4 property and Meta/Bing
 * audiences. Same `x-pathname` header Brief 127's canonical logic reads, and
 * same exclusion list — the root layout is already dynamic because
 * generateMetadata reads that header, so this adds no rendering cost.
 *
 * Analytics needs a Suspense boundary because it calls useSearchParams().
 */
export default function SiteAnalytics() {
  const pathname = headers().get('x-pathname') ?? '';
  if (pathname.startsWith('/admin') || pathname.startsWith('/api')) return null;

  const ids = getTrackingIds();

  return (
    <>
      <AnalyticsScripts ids={ids} />
      <Suspense fallback={null}>
        <Analytics ids={ids} />
      </Suspense>
    </>
  );
}
