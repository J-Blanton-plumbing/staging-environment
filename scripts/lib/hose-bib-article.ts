/**
 * Brief 202 (Track A1) — the hose bib article's slugs, and the ONE way its deploy scripts find it.
 *
 * Brief 202 renamed the article from `hose-bib-irrigation-fall-checklist` (Brief 198) to
 * `how-to-winterize-outdoor-faucets-spigots`. Every script in its chain runs on every deploy
 * (seed 198 → update 201 → 201 review rounds 1–3 → update 202) and resolves the article under
 * EITHER slug (CLAUDE.md gotcha 27). Brief 203 moved the lookup itself into the shared
 * `renamed-article.ts` (the older-homes chain uses it too); this module keeps the hose bib slugs
 * and the names its scripts already import, so their behaviour is unchanged.
 */
import { describeBoth, findArticleUnderSlugs, type ArticleLookup, type Queryable } from './renamed-article';

export const OLD_SLUG = 'hose-bib-irrigation-fall-checklist';
export const NEW_SLUG = 'how-to-winterize-outdoor-faucets-spigots';
export const HOSE_BIB_SLUGS = [OLD_SLUG, NEW_SLUG];

export type HoseBibLookup = ArticleLookup;

export function findHoseBibArticle(c: Queryable): Promise<HoseBibLookup> {
  return findArticleUnderSlugs(c, HOSE_BIB_SLUGS);
}

export { describeBoth };
