import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getService } from '@/lib/content/services';
import ServicePageTemplate from '@/components/ServicePageTemplate';

/**
 * `/sewer-rodding` — the first explicit static sub-service route (brief-11).
 *
 * Routing note: sub-services live at the top level (`/sewer-rodding`), the same
 * namespace as the `[city]` dynamic route. Next.js resolves this static segment
 * before `[city]`, so there is no collision. Each future sub-service is its own
 * static folder here until the Phase-3 CMS unifies them (brief-11 §Routing).
 */
export default function SewerRoddingPage() {
  const service = getService('sewer-rodding');
  if (!service) notFound();
  return <ServicePageTemplate content={service} />;
}

export const metadata: Metadata = {
  // The root layout applies a `%s | J. Blanton Plumbing` title template, so the
  // suffix from the brief's literal string is dropped here to avoid doubling it.
  // Rendered result: "Sewer Rodding Services in Chicagoland | J. Blanton Plumbing".
  title: 'Sewer Rodding Services in Chicagoland',
  description:
    "Annual or emergency sewer rodding done right the first time. Camera inspection before and after so you see exactly what's cleared. No upsell.",
};
