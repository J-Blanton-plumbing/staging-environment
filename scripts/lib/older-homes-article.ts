/**
 * Brief 203 (Track A1) — the Columbus "older homes" article's slugs, and the ONE way its deploy
 * scripts find it.
 *
 * Brief 203 renames the article from
 *   `older-homes-plumbing-problems-grandview-clintonville-german-village` (Brief 199) to
 *   `old-house-plumbing-problems-grandview-worthington-german-village`.
 * Every script in its chain runs on every deploy (seed 199 → review rounds 1–3 → update 203) and
 * resolves the article under EITHER slug through the shared `renamed-article.ts` (CLAUDE.md
 * gotcha 27): one row → it, at the slug it has now; none → the script's "no article" path;
 * both → NOT-APPLIED, nothing written.
 * (The image folder `public/images/knowledge-hub/columbus-older-homes/` keeps its name.)
 */
import { describeBoth, findArticleUnderSlugs, type ArticleLookup, type Queryable } from './renamed-article';

export const OLD_SLUG = 'older-homes-plumbing-problems-grandview-clintonville-german-village';
export const NEW_SLUG = 'old-house-plumbing-problems-grandview-worthington-german-village';
export const OLDER_HOMES_SLUGS = [OLD_SLUG, NEW_SLUG];

export function findOlderHomesArticle(c: Queryable): Promise<ArticleLookup> {
  return findArticleUnderSlugs(c, OLDER_HOMES_SLUGS);
}

export { describeBoth };
