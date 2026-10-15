/**
 * Brief 212 — the server's conform checks for City Hub and City Service V2 content: the real
 * plain-text sanitiser and the real city / city-service registries. React-free on purpose: the write
 * path (drafts.ts) and the deploy seeds import it, and React's `cache` exists only inside RSC.
 */
import { getCity } from '@/lib/content/cities';
import { OHIO_STATE } from '@/lib/content/cities/ohio-areas';
import { getCityService } from '@/lib/content/city-services';
import { sanitizeCmsPlainText } from '@/lib/cms/sanitize';
import type { HubChecks } from '@/lib/city-hub-cms/conform';
import type { ServiceChecks } from '@/lib/city-service-v2-cms/conform';

export const HUB_SERVER_CHECKS: HubChecks = {
  plain: (s) => sanitizeCmsPlainText(s),
  cityExists: (slug) => !!getCity(slug),
  cityServiceExists: (svc) => !!getCityService(svc),
};

export const SERVICE_SERVER_CHECKS: ServiceChecks = {
  plain: (s) => sanitizeCmsPlainText(s),
  cityServiceExists: (svc) => !!getCityService(svc),
};

/** An Ohio city (registry state) — its City Hub / V2 page body uses the Central Ohio phone (Brief 192). */
export function isOhioCity(city: string): boolean {
  return getCity(city)?.state === OHIO_STATE;
}

/** "IL" / "OH" — the state in a V2 page's Service schema `areaServed`. */
export function stateAbbr(city: string): string {
  return isOhioCity(city) ? 'OH' : 'IL';
}
