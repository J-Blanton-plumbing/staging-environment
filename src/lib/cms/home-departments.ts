/**
 * Brief 218 (Track B) — the homepage Organization's `department` list: the `@id` of every office
 * whose City Hub renders an office node, in Global Settings office order.
 *
 * Built from the SAME data the hub `#office` nodes come from: `resolveCityHub` (the route's own
 * dispatch, no preview) + `hubPlumberJsonLd` (the node builder). So a `department` ref can only ever
 * point at a node a live hub actually emits — a hub without a GBP link, unpublished, or still on a
 * legacy template drops out, and an office that gets a hub joins on its own (the dev notes' rule).
 *
 * The homepage is force-dynamic, and this costs two small reads per office, so the result is memoised
 * for 60s across requests (the `getCityTaggedArticles` pattern). Never throws: an office whose hub
 * can't be resolved is left out, and the live check reports a short list.
 */
import { resolveCityHub } from '@/lib/cms/city-hubs';
import { hubPlumberJsonLd } from '@/lib/city-hub-cms/model';
import { schemaPhone } from '@/lib/schema/city-pages';
import { HOME_PACKAGE_DEPARTMENT_IDS } from '@/lib/schema/homepage';

const TTL_MS = 60_000;
let memo: { key: string; at: number; ids: string[] } | null = null;

const normSlug = (s: string) => s.trim().replace(/^\/+/, '').replace(/\/+$/, '').toLowerCase();

export async function getHomeDepartmentIds(officeSlugs: readonly string[]): Promise<string[]> {
  const slugs = Array.from(new Set(officeSlugs.map(normSlug).filter(Boolean)));
  const key = slugs.join(',');
  if (memo && memo.key === key && Date.now() - memo.at < TTL_MS) return memo.ids;

  const ids: string[] = [];
  for (const slug of slugs) {
    try {
      const d = await resolveCityHub(slug, { preview: false });
      // The phone does not affect the @id; the builder only needs a value to format.
      const node = d.kind === 'hub' ? hubPlumberJsonLd(d.hub, '', schemaPhone) : null;
      if (node) ids.push(node['@id']);
    } catch (err) {
      console.error(`[home-departments] /${slug} — left out of the homepage department list`, err instanceof Error ? err.message : err);
    }
  }
  if (ids.join('\n') !== HOME_PACKAGE_DEPARTMENT_IDS.join('\n')) {
    const missing = HOME_PACKAGE_DEPARTMENT_IDS.filter((id) => !ids.includes(id));
    const extra = ids.filter((id) => !HOME_PACKAGE_DEPARTMENT_IDS.includes(id));
    console.warn(
      `[home-departments] the homepage department list differs from the Brief 218 package (${ids.length} vs ${HOME_PACKAGE_DEPARTMENT_IDS.length})` +
        (missing.length ? `; missing ${missing.join(', ')}` : '') +
        (extra.length ? `; added ${extra.join(', ')}` : '') +
        (!missing.length && !extra.length ? '; same offices, different order' : '')
    );
  }
  memo = { key, at: Date.now(), ids };
  return ids;
}
