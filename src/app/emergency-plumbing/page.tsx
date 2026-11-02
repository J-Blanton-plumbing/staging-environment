import type { Metadata } from 'next';
import { EmHubRoute, emHubMetadata } from '@/components/emergency-v2/EmRoutes';

/**
 * Brief 225 — `/emergency-plumbing`: the Emergency Plumbing hub (Emergency Hub template, `em-hub`).
 *
 * Until Brief 225 this was the Brief 16 standalone page (CategoryHero + the "what's your emergency" card,
 * Elfsight reviews and TikTok) read from the legacy columns of the singleton `emergency_plumbing_page`
 * row. The page now reads the same row's `v2_content` through EmRoutes (the Brief 222 water heater CMS
 * model, third template), with the code module src/lib/content/emergency-v2/hub.ts as the fallback;
 * edited in /admin/emergency-plumbing. The pre-v2 content is kept as the unpublished version
 * "Pre-v2 archive (2026-11)".
 */

export const dynamic = 'force-dynamic';

export function generateMetadata(): Promise<Metadata> {
  return emHubMetadata();
}

export default function EmergencyPlumbingPage() {
  return <EmHubRoute />;
}
