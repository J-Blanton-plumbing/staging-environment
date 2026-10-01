/**
 * Brief 195 — the manager review area, `/review/...`.
 *
 * Unpublished CMS content shown to people without CMS logins, behind a shared
 * Basic Auth password (src/middleware.ts). Never indexable, never cached, no
 * canonical, no analytics: the root layout and the tracking mounts skip every
 * path this matches. Edge-safe (middleware imports it): no DB, no Node APIs.
 */
export const REVIEW_PREFIX = '/review';

/** `/review` and everything under it — but not `/reviews` (a live 301). */
export function isReviewPath(pathname: string): boolean {
  return pathname === REVIEW_PREFIX || pathname.startsWith(REVIEW_PREFIX + '/');
}
