/**
 * Brief 200 — the routes the Sewer Ecosystem v2 renders FROM CODE (no database read).
 *
 * Deliberately a tiny, data-free module: the sitemap renderer and `scripts/validate-sitemap.ts`
 * import it, and neither should pull in page copy.
 *
 * Why the sitemap needs it: `/sitemap-pages.xml` lists a top-level sub-service only when its
 * `sub_service_pages` row is published, because a DB-backed route 404s without one. These nine do
 * not read that table at all — three of them (`sewer-camera-inspection`, `sewer-line-replacement`,
 * `sewer-line-installation`) have no row anywhere — so the published-row filter would silently drop
 * live, indexable pages. They are listed unconditionally instead, and the hub likewise ignores the
 * `service_category_pages` draft flag (the page no longer reads that row).
 *
 * When the CMS follow-up brief moves these pages back onto the database, remove the slugs it moves
 * from here so the published-row rule applies to them again.
 */
export const SEWER_V2_SERVICE_SLUGS = [
  'hydro-jetting',
  'sewer-rodding',
  'sewer-repair',
  'sewer-camera-inspection',
  'sewer-line-replacement',
  'sewer-maintenance',
  'overhead-sewer-systems',
  'trenchless-sewer-repair',
  'sewer-line-installation',
] as const;

/** The category hub rendered from code: `/services/sewer`. */
export const SEWER_V2_CATEGORY_SLUG = 'sewer';
