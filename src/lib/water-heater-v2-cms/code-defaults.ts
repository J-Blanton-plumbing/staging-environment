/**
 * Brief 222 — the water heater code modules as stored-shape objects: the fallback when a row is
 * missing, unreadable or has no `v2_content`, the template `conform.ts` locks the layout to, and the
 * seed's source. Fresh deep copies every call.
 */
import { WH_HUB } from '@/lib/content/water-heater-v2/hub';
import { WH_WATER_HEATER_REPAIR } from '@/lib/content/water-heater-v2/water-heater-repair';
import { WH_WATER_HEATER_INSTALLATION } from '@/lib/content/water-heater-v2/water-heater-installation';
import { WH_WATER_HEATER_MAINTENANCE } from '@/lib/content/water-heater-v2/water-heater-maintenance';
import { WH_TANKLESS_WATER_HEATER } from '@/lib/content/water-heater-v2/tankless-water-heater';
import { WH_COMMERCIAL_WATER_HEATER } from '@/lib/content/water-heater-v2/commercial-water-heater';
import { WH_SHARED_DEFAULT } from '@/lib/content/water-heater-v2/shared-content';
import type { WhHubStored, WhPage, WhStored } from '@/lib/content/water-heater-v2/types';
import { pageToStored, type WhServiceSlug } from './model';

export const WH_PAGES: Record<WhServiceSlug, WhPage> = {
  'water-heater-repair': WH_WATER_HEATER_REPAIR,
  'water-heater-installation': WH_WATER_HEATER_INSTALLATION,
  'water-heater-maintenance': WH_WATER_HEATER_MAINTENANCE,
  'tankless-water-heater': WH_TANKLESS_WATER_HEATER,
  'commercial-water-heater': WH_COMMERCIAL_WATER_HEATER,
};

export function codeWhServiceStored(slug: WhServiceSlug): WhStored {
  return pageToStored(WH_PAGES[slug]);
}

export function codeWhServiceMeta(slug: WhServiceSlug): { title: string; description: string } {
  return { ...WH_PAGES[slug].meta };
}

export function codeWhHubStored(): WhHubStored {
  return { ...pageToStored(WH_HUB), shared: JSON.parse(JSON.stringify(WH_SHARED_DEFAULT)) };
}

export function codeWhHubMeta(): { title: string; description: string } {
  return { ...WH_HUB.meta };
}
