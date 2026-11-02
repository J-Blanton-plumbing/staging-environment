import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PreviewBanner from '@/components/PreviewBanner';
import { getRatingContext } from '@/lib/cms/office-ratings';
import { ratingShownIn, type RatingTokenContext } from '@/lib/cms/tokens';
import { loadEmHub } from '@/lib/cms/water-heater-v2';
import { aggregateRatingJsonLd } from '@/lib/schema/aggregate-rating';
import { emergencyJsonLd } from '@/lib/schema/emergency';
import { TITLE_TEMPLATE } from '@/lib/seo';
import { EM_PAGE_TYPE, EM_V2_PATH, EM_V2_SLUG } from '@/lib/water-heater-v2-cms/model';
import { metadataFor, ratingTexts, shortTail, sitePhone } from '@/components/water-heater-v2/route-helpers';
import { EmHubView } from './EmViews';

/**
 * Brief 225 — what `src/app/emergency-plumbing/page.tsx` renders. The water heater route recipe
 * (WhRoutes.tsx) for the emergency hub:
 *
 * Metadata: the row's title WITHOUT the brand (the root layout's template adds " | J. Blanton Plumbing"
 * once — the standing title rule, §1 #7), its description, and the site's standard Open Graph / Twitter
 * tags with the hero image (§1 #15). NO `alternates` (the root layout emits the self-canonical), NO
 * robots: the page is indexable (the prototype's `noindex` is not carried over).
 *
 * The non-preview branch returns the view ALONE (a one-slot ternary), like the sewer / water heater routes.
 */

export const emHubMetadata = (): Promise<Metadata> => metadataFor(EM_V2_SLUG);

export async function EmHubRoute() {
  const load = await loadEmHub();
  if (!load) notFound();
  const [phone, ctx] = await Promise.all([sitePhone(), getRatingContext(null).catch(() => ({ office: null, company: null }) as RatingTokenContext)]);
  const ratings = ratingTexts(load.shared, ctx);
  const faq = load.page.sections.find((s) => s.kind === 'faq');
  // Brief 221's rule: the company aggregateRating only when the page visibly shows exactly those numbers.
  const shown = !!(ratings && ctx.company && ratingShownIn([ratings.rating, ratings.sub], ctx.company));
  const jsonLd = emergencyJsonLd({
    path: EM_V2_PATH,
    title: TITLE_TEMPLATE.replace('%s', shortTail(load.page.meta.title)),
    description: load.page.meta.description,
    crumbLabel: load.shared.crumbParent.label,
    service: load.page.service,
    faqs: faq && faq.kind === 'faq' ? faq.items : [],
    phoneDisplay: phone.display,
    aggregateRating: shown && ctx.company ? aggregateRatingJsonLd(ctx.company) : null,
  });
  const props = { page: load.page, shared: load.shared, phone, ratings, jsonLd };
  return load.preview ? (
    <>
      <PreviewBanner
        label={load.preview.label}
        creatorName={load.preview.creator_name}
        editorUrl="/admin/emergency-plumbing"
        liveUrl={EM_V2_PATH}
        draftId={load.preview.id}
        pageType={EM_PAGE_TYPE}
        pageSlug={EM_V2_SLUG}
      />
      <EmHubView {...props} />
    </>
  ) : (
    <EmHubView {...props} />
  );
}
