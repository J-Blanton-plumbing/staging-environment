/**
 * Brief 149 (Track C) — one resolver for "what `<title>` and `<meta name=
 * description>` should this CMS-backed page render?".
 *
 * ── THE SHADOW THIS CLOSES ──────────────────────────────────────────────────
 * City pages and the main pages were CMS-driven for their BODY and static for
 * their metadata: `generateMetadata` read `src/lib/content/**`, so the SEO Title
 * and Meta Description fields sitting in the admin editor were written, saved,
 * versioned — and never read by anything. Same class of defect as the shadowed
 * sub-service rows in Tracks A and B, just one field lower down the page.
 *
 * Sub-service pages already worked this way (`getSubServiceMeta`); this brings
 * the other two families to the same contract.
 *
 * ── THE CONTRACT ────────────────────────────────────────────────────────────
 * CMS value wins when it is non-empty. Blank falls back to the static value the
 * page rendered before. Nothing 404s or renders an empty <title> because a field
 * was left blank — the fallback is a safety net, not a second source of truth,
 * and after this brief's backfill the CMS field holds what the page renders.
 *
 * ── SUFFIX, EXACTLY ONCE ────────────────────────────────────────────────────
 * The root layout appends "| J. Blanton Plumbing" through Next's title template.
 * Every title returned here goes through `pageTitle()`, which strips a trailing
 * brand suffix first — repeatedly, so even a doubled one collapses. Brief 147
 * swept the stored values clean; this makes it impossible for an editor to
 * re-break it by typing the suffix into the field tomorrow. That is the
 * difference between fixing the data and fixing the class of bug.
 *
 * Reads only — no writes, no version bump, safe on every render.
 */
import pool from '@/lib/db';
import { pageTitle } from '@/lib/seo';

export interface ResolvedPageMeta {
  title: string;
  description: string;
}

/** What the page rendered before this brief — used when the CMS field is blank. */
export interface MetaFallback {
  title: string;
  description: string;
}

function pick(cms: string | null | undefined, fallback: string): string {
  const v = (cms ?? '').trim();
  return v || fallback;
}

/**
 * Compose a CMS row's meta over the static fallback.
 *
 * Exported so callers that already hold the row (or a preview draft) can apply
 * the same rule without a second query.
 */
export function resolvePageMeta(
  cms: { metaTitle?: string | null; metaDescription?: string | null } | null,
  fallback: MetaFallback
): ResolvedPageMeta {
  return {
    // pageTitle() is applied to the RESULT, not just the CMS branch: the static
    // fallbacks are hand-written strings and a future one could carry the suffix
    // too. Normalizing once at the boundary covers both sources.
    title: pageTitle(pick(cms?.metaTitle, fallback.title)) || fallback.title,
    description: pick(cms?.metaDescription, fallback.description),
  };
}

/**
 * `city_pages` meta for a slug, composed over `fallback`.
 *
 * NOTE the column name: `city_pages` keys on `city_slug`, not `slug`. That trap
 * has cost this project twice already — the dead canonical-override resolver
 * (Brief 144) and the sitemap's missing city `<lastmod>` (Brief 147, Track D) —
 * so it is called out here rather than left to be rediscovered.
 *
 * Never throws: metadata generation must not be able to 500 a page, so a DB
 * error logs and yields the static fallback.
 */
export async function getCityPageMeta(slug: string, fallback: MetaFallback): Promise<ResolvedPageMeta> {
  try {
    const client = await pool.connect();
    try {
      const res = await client.query<{ meta_title: string | null; meta_description: string | null }>(
        'SELECT meta_title, meta_description FROM city_pages WHERE city_slug = $1',
        [slug]
      );
      const row = res.rows[0];
      return resolvePageMeta(
        row ? { metaTitle: row.meta_title, metaDescription: row.meta_description } : null,
        fallback
      );
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(`[page-meta] city "${slug}" — falling back to static metadata`, err);
    return resolvePageMeta(null, fallback);
  }
}

/** `main_pages` meta for a slug, composed over `fallback`. Never throws. */
export async function getMainPageMeta(slug: string, fallback: MetaFallback): Promise<ResolvedPageMeta> {
  try {
    const client = await pool.connect();
    try {
      const res = await client.query<{ meta_title: string | null; meta_description: string | null }>(
        'SELECT meta_title, meta_description FROM main_pages WHERE slug = $1',
        [slug]
      );
      const row = res.rows[0];
      return resolvePageMeta(
        row ? { metaTitle: row.meta_title, metaDescription: row.meta_description } : null,
        fallback
      );
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(`[page-meta] main page "${slug}" — falling back to static metadata`, err);
    return resolvePageMeta(null, fallback);
  }
}
