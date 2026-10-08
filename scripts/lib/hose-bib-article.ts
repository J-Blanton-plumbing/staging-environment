/**
 * Brief 202 (Track A1) — the ONE way the hose bib article's deploy scripts find it.
 *
 * Brief 202 renames the article from `hose-bib-irrigation-fall-checklist` (Brief 198) to
 * `how-to-winterize-outdoor-faucets-spigots`. Every script in its chain runs on every deploy
 * (seed 198 → update 201 → 201 review rounds 1–3 → update 202), and each used to look the
 * article up by the OLD slug only. After the rename that is the slug-rename duplicate trap
 * (CLAUDE.md gotcha 27): the create-once seed would find "no article" and create a SECOND draft
 * at the old slug, and the update scripts would then "apply" to it. So every script resolves
 * the article under EITHER slug through this helper:
 *   • exactly one row  → that row and the slug it has NOW (versions are keyed by it, page_drafts.page_slug);
 *   • none             → the script's own "no article" path;
 *   • both slugs exist → never written by this chain; reported as a guard (NOT-APPLIED), exit 0.
 */
export const OLD_SLUG = 'hose-bib-irrigation-fall-checklist';
export const NEW_SLUG = 'how-to-winterize-outdoor-faucets-spigots';
export const HOSE_BIB_SLUGS = [OLD_SLUG, NEW_SLUG];

interface Queryable {
  query<R = Record<string, unknown>>(text: string, values?: unknown[]): Promise<{ rows: R[] }>;
}

export type HoseBibLookup =
  | { kind: 'one'; id: number; slug: string; status: string }
  | { kind: 'none' }
  | { kind: 'both'; rows: { id: number; slug: string; status: string }[] };

export async function findHoseBibArticle(c: Queryable): Promise<HoseBibLookup> {
  const rows = (
    await c.query<{ id: number; slug: string; status: string }>(
      'SELECT id, slug, status FROM cms_articles WHERE slug = ANY($1::text[]) ORDER BY id',
      [HOSE_BIB_SLUGS]
    )
  ).rows;
  if (rows.length === 0) return { kind: 'none' };
  if (rows.length > 1) return { kind: 'both', rows };
  return { kind: 'one', ...rows[0] };
}

/** One line naming both rows, for a verdict. */
export function describeBoth(rows: { id: number; slug: string; status: string }[]): string {
  return `two articles (${rows.map((r) => `id ${r.id} /${r.slug} ${r.status}`).join('; ')}) — expected one; nothing written`;
}
