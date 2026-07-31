import { cache } from 'react';
import pool from '@/lib/db';
import { normalizePath } from '@/lib/seo';

/**
 * Per-page canonical override lookup (Brief 127, Track A.3).
 *
 * Every CMS page table carries an optional `canonical_url` column (provisioned
 * by scripts/ensure-schema.ts). When a row has a non-blank value, that URL is
 * rendered as the page's <link rel="canonical"> instead of the self-referencing
 * default built in the root layout. The field is an edge-case escape hatch and
 * is expected to be blank everywhere in normal operation, so this query
 * typically returns zero rows.
 *
 * Resolution is centralized here (keyed by normalized route path) rather than
 * threaded through every page's generateMetadata, so the root layout can apply
 * overrides for all page types in one place. `cache()` dedupes to one query per
 * request; a DB error degrades to "no overrides" — the site never breaks over
 * this feature.
 */
export const getCanonicalOverridesCached = cache(
  async (): Promise<Map<string, string>> => {
    try {
      const res = await pool.query<{ path: string; canonical_url: string }>(`
        SELECT CASE WHEN slug = 'home' THEN '/' ELSE '/' || slug END AS path, canonical_url
          FROM main_pages
         WHERE canonical_url IS NOT NULL AND btrim(canonical_url) <> ''
        UNION ALL
        SELECT '/services/' || slug, canonical_url
          FROM service_category_pages
         WHERE canonical_url IS NOT NULL AND btrim(canonical_url) <> ''
        UNION ALL
        SELECT '/' || slug, canonical_url
          FROM sub_service_pages
         WHERE canonical_url IS NOT NULL AND btrim(canonical_url) <> ''
        UNION ALL
        SELECT '/' || slug, canonical_url
          FROM city_pages
         WHERE canonical_url IS NOT NULL AND btrim(canonical_url) <> ''
        UNION ALL
        SELECT '/' || city_slug || '/' || service_slug, canonical_url
          FROM city_service_pages
         WHERE canonical_url IS NOT NULL AND btrim(canonical_url) <> ''
        UNION ALL
        SELECT '/knowledge-hub/' || slug, canonical_url
          FROM cms_articles
         WHERE canonical_url IS NOT NULL AND btrim(canonical_url) <> ''
        UNION ALL
        SELECT '/emergency-plumbing', canonical_url
          FROM emergency_plumbing_page
         WHERE canonical_url IS NOT NULL AND btrim(canonical_url) <> ''
      `);
      const map = new Map<string, string>();
      for (const row of res.rows) {
        map.set(normalizePath(row.path), row.canonical_url.trim());
      }
      return map;
    } catch (err) {
      console.error('getCanonicalOverridesCached: falling back to no overrides:', err);
      return new Map();
    }
  }
);
