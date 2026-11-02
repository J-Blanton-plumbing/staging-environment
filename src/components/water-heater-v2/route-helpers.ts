import type { Metadata } from 'next';
import { getGlobalSettingsCached } from '@/lib/cms/global-settings';
import { renderRatingField, type RatingTokenContext } from '@/lib/cms/tokens';
import { whMetaFor } from '@/lib/cms/water-heater-v2';
import { canonicalUrlFor, TITLE_TEMPLATE } from '@/lib/seo';
import type { WhSharedContent } from '@/lib/content/water-heater-v2/types';
import { whPathFor } from '@/lib/water-heater-v2-cms/model';
import type { WhPhone } from './WhNodes';
import type { WhRatingTexts } from './WhParts';

/**
 * Brief 222 route helpers, moved unchanged out of WhRoutes.tsx by Brief 225 so the emergency hub's route
 * can use them without importing the water heater views (and with them water-heater-v2.css). CSS-free.
 */

export async function sitePhone(): Promise<WhPhone> {
  const settings = await getGlobalSettingsCached();
  return { href: settings.phoneHref, display: settings.phoneDisplay };
}

/** Strips a short brand tail ("| J. Blanton") an editor may type; the template adds the full brand. */
export const shortTail = (t: string) => t.replace(/\s*[|\-–—]\s*J\.?\s*Blanton\s*$/i, '').trim();

export async function metadataFor(slug: string): Promise<Metadata> {
  const meta = await whMetaFor(slug);
  if (!meta) return {};
  const title = shortTail(meta.title);
  const full = TITLE_TEMPLATE.replace('%s', title);
  const url = canonicalUrlFor(whPathFor(slug));
  return {
    title,
    description: meta.description,
    // Next merges metadata shallowly: a page `openGraph` replaces the layout's, so its site-wide keys
    // are restated here (Brief 218 lesson).
    openGraph: { type: 'website', locale: 'en_US', siteName: 'J. Blanton Plumbing', title: full, description: meta.description, url, images: [{ url: meta.image }] },
    twitter: { card: 'summary_large_image', title: full, description: meta.description, images: [meta.image] },
  };
}

/** The rating card's texts (Brief 221 company tokens resolved), or null while there is no company row. */
export function ratingTexts(shared: WhSharedContent, ctx: RatingTokenContext): WhRatingTexts | null {
  if (!ctx.company) return null;
  const rating = renderRatingField(shared.proof.rating, ctx);
  const starsLabel = renderRatingField(shared.proof.starsLabel, ctx);
  const sub = renderRatingField(shared.proof.sub, ctx);
  return rating && starsLabel && sub ? { rating, starsLabel, sub } : null;
}
