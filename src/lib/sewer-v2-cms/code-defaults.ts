/**
 * Brief 204 — the code modules as stored-shape objects: the fallback whenever a row is missing,
 * unreadable or has no `v2_content`, the template `conform.ts` locks the layout to, and the seed's
 * source. Fresh deep copies every call, so no caller can mutate the modules.
 */
import { SEWER_V2_PAGES } from '@/lib/content/sewer-v2';
import { SEWER_HUB } from '@/lib/content/sewer-v2/hub';
import { SEWER_SHARED_DEFAULT } from '@/lib/content/sewer-v2/shared-content';
import type { SewerServiceStored } from '@/lib/content/sewer-v2/types';
import { pageToStored, type SewerHubStored, type SewerServiceSlug } from './model';

export function codeServiceStored(slug: SewerServiceSlug): SewerServiceStored {
  return pageToStored(SEWER_V2_PAGES[slug]);
}

export function codeServiceMeta(slug: SewerServiceSlug): { title: string; description: string } {
  return { ...SEWER_V2_PAGES[slug].meta };
}

export function codeHubStored(): SewerHubStored {
  const { meta: _meta, ...hub } = SEWER_HUB;
  void _meta;
  return JSON.parse(JSON.stringify({ schema: 1, hub, shared: SEWER_SHARED_DEFAULT })) as SewerHubStored;
}

export function codeHubMeta(): { title: string; description: string } {
  return { ...SEWER_HUB.meta };
}
