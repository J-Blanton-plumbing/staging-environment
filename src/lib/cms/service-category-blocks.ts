/**
 * Brief 98 — pure, client-safe helpers for the `serviceSubcategories` block
 * stored in `service_category_pages.blocks` (JSONB).
 *
 * Kept separate from `service-pages.ts` (which imports the DB pool) so the
 * admin editor (a client component) and the block registry can import these
 * types/helpers without pulling server-only code into the client bundle —
 * same split as `sub-service-blocks.ts` vs `sub-service-pages.ts`.
 *
 * Brief 98 decision: the migrated block's item shape is `{label, href, desc,
 * image}` — `image` was added beyond the brief's original `{label,href,desc}`
 * spec because the live render (the 6 static `src/app/services/<slug>/page.tsx`
 * files) shows a per-card thumbnail that today comes from each category's
 * static content file, zipped to the DB row by array index. Folding `image`
 * into the block makes it a single self-contained source of truth and an
 * editable field, instead of a second by-index lookup the editor can never
 * reach.
 */

import { newBlockId } from '@/lib/cms/sub-service-blocks';

export const SERVICE_SUBCATEGORIES_BLOCK_TYPE = 'serviceSubcategories' as const;

export interface ServiceSubcategoryItem {
  label: string;
  href: string;
  desc: string;
  image: string;
}

export interface ServiceSubcategoriesBlockData {
  heading: string | null;
  items: ServiceSubcategoryItem[];
}

export interface ServiceCategoryBlockInstance {
  id: string;
  type: typeof SERVICE_SUBCATEGORIES_BLOCK_TYPE;
  data: ServiceSubcategoriesBlockData;
}

function normalizeItem(raw: unknown): ServiceSubcategoryItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.label !== 'string' || typeof r.href !== 'string') return null;
  return {
    label: r.label,
    href: r.href,
    desc: typeof r.desc === 'string' ? r.desc : '',
    image: typeof r.image === 'string' ? r.image : '',
  };
}

/**
 * Coerce an arbitrary stored/loaded `blocks` value into valid instances.
 * Unknown types and malformed entries are dropped; missing/duplicate ids are
 * regenerated. Only one instance is meaningful today (`allowMultiple: false`
 * in the registry), but this normalizes the whole array defensively.
 */
export function normalizeServiceCategoryBlocks(raw: unknown): ServiceCategoryBlockInstance[] {
  if (!Array.isArray(raw)) return [];
  const seenIds = new Set<string>();
  const out: ServiceCategoryBlockInstance[] = [];
  for (const b of raw) {
    if (!b || typeof b !== 'object') continue;
    const entry = b as Record<string, unknown>;
    if (entry.type !== SERVICE_SUBCATEGORIES_BLOCK_TYPE) continue;
    const data = entry.data && typeof entry.data === 'object' ? (entry.data as Record<string, unknown>) : {};
    const items = Array.isArray(data.items)
      ? (data.items as unknown[]).map(normalizeItem).filter((i): i is ServiceSubcategoryItem => i !== null)
      : [];
    let id = entry.id;
    if (typeof id !== 'string' || id === '' || seenIds.has(id)) id = newBlockId(SERVICE_SUBCATEGORIES_BLOCK_TYPE);
    seenIds.add(id as string);
    out.push({
      id: id as string,
      type: SERVICE_SUBCATEGORIES_BLOCK_TYPE,
      data: {
        heading: typeof data.heading === 'string' ? data.heading : null,
        items,
      },
    });
  }
  return out;
}

/** The single `serviceSubcategories` block's data, or null when absent (render nothing). */
export function getSubcategoriesBlockData(blocks: unknown): ServiceSubcategoriesBlockData | null {
  const [first] = normalizeServiceCategoryBlocks(blocks);
  return first ? first.data : null;
}

/**
 * Build the `blocks` array to persist for a page, given its CURRENT stored
 * `blocks` (so a stable id is reused across saves — see `sub-service-blocks.ts`'s
 * `newBlockId` doc) and the new `data`.
 */
export function buildSubcategoriesBlocks(
  currentBlocks: unknown,
  data: ServiceSubcategoriesBlockData
): ServiceCategoryBlockInstance[] {
  const [existing] = normalizeServiceCategoryBlocks(currentBlocks);
  const id = existing?.id ?? newBlockId(SERVICE_SUBCATEGORIES_BLOCK_TYPE);
  return [{ id, type: SERVICE_SUBCATEGORIES_BLOCK_TYPE, data }];
}
