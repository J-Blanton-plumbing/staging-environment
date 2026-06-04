/**
 * Sub-service content registry (brief-11). Maps a top-level slug → its
 * `ServiceContent` data file, mirroring the cities registry pattern
 * (`lib/content/cities/index.ts`).
 *
 * Each new sub-service is a one-line add: import the data file and drop it in
 * `SERVICE_CONTENT`. The static route folder under `src/app/[slug]/page.tsx`
 * then calls `getService(slug)` and renders `ServicePageTemplate`.
 */
import type { ServiceContent } from '@/types/service';
import { SEWER_RODDING } from './sewer-rodding';

const SERVICE_CONTENT: Record<string, ServiceContent> = {
  'sewer-rodding': SEWER_RODDING,
};

/** Resolve a slug to its service content, or `undefined` if unregistered. */
export function getService(slug: string): ServiceContent | undefined {
  return SERVICE_CONTENT[slug];
}

/** All registered sub-service slugs (for static-param generation later). */
export function getServiceSlugs(): string[] {
  return Object.keys(SERVICE_CONTENT);
}
