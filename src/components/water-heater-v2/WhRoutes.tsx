import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PreviewBanner from '@/components/PreviewBanner';
import { getGlobalSettingsCached } from '@/lib/cms/global-settings';
import { getRatingContext } from '@/lib/cms/office-ratings';
import { renderRatingField, ratingShownIn, type RatingTokenContext } from '@/lib/cms/tokens';
import { loadWhHub, loadWhServicePage, whMetaFor, type WhLoad } from '@/lib/cms/water-heater-v2';
import { aggregateRatingJsonLd } from '@/lib/schema/aggregate-rating';
import { waterHeaterJsonLd } from '@/lib/schema/water-heater';
import { canonicalUrlFor, TITLE_TEMPLATE } from '@/lib/seo';
import type { WhSharedContent } from '@/lib/content/water-heater-v2/types';
import { whPathFor, WH_V2_HUB_SLUG, WH_V2_SERVICE_SLUGS, type WhServiceSlug } from '@/lib/water-heater-v2-cms/model';
import type { WhPhone } from './WhNodes';
import type { WhRatingTexts } from './WhParts';
import { WhHubView, WhServiceView } from './WhViews';

/**
 * Brief 222 — what the 6 water heater route files render (explicit static routes: a top-level
 * `[service]` segment would collide with `[city]`, CLAUDE.md).
 *
 * Metadata: the row's title WITHOUT the brand (the root layout's template adds " | J. Blanton Plumbing"
 * once — the standing title rule), its description, and the site's standard Open Graph / Twitter tags
 * with the page's hero image (§1 #13). Deliberately NO `alternates`: the root layout emits the
 * self-canonical. No robots: these pages are indexable.
 *
 * The non-preview branch returns the view ALONE (a one-slot ternary), like the sewer routes.
 */

export type { WhServiceSlug };

async function sitePhone(): Promise<WhPhone> {
  const settings = await getGlobalSettingsCached();
  return { href: settings.phoneHref, display: settings.phoneDisplay };
}

/** Strips a short brand tail ("| J. Blanton") an editor may type; the template adds the full brand. */
const shortTail = (t: string) => t.replace(/\s*[|\-–—]\s*J\.?\s*Blanton\s*$/i, '').trim();

async function metadataFor(slug: string): Promise<Metadata> {
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

export const whServiceMetadata = (slug: WhServiceSlug) => metadataFor(slug);
export const whHubMetadata = () => metadataFor(WH_V2_HUB_SLUG);

/** The rating card's texts (Brief 221 company tokens resolved), or null while there is no company row. */
function ratingTexts(shared: WhSharedContent, ctx: RatingTokenContext): WhRatingTexts | null {
  if (!ctx.company) return null;
  const rating = renderRatingField(shared.proof.rating, ctx);
  const starsLabel = renderRatingField(shared.proof.starsLabel, ctx);
  const sub = renderRatingField(shared.proof.sub, ctx);
  return rating && starsLabel && sub ? { rating, starsLabel, sub } : null;
}

async function viewProps(load: WhLoad, hub: boolean) {
  const [phone, ctx] = await Promise.all([sitePhone(), getRatingContext(null).catch(() => ({ office: null, company: null }) as RatingTokenContext)]);
  const ratings = ratingTexts(load.shared, ctx);
  const path = whPathFor(load.page.slug);
  const title = TITLE_TEMPLATE.replace('%s', shortTail(load.page.meta.title));
  const faq = load.page.sections.find((s) => s.kind === 'faq');
  // Brief 221's rule: the company aggregateRating only when the page visibly shows exactly those numbers.
  const shown = !!(ratings && ctx.company && ratingShownIn([ratings.rating, ratings.sub], ctx.company));
  const jsonLd = waterHeaterJsonLd({
    path,
    hub,
    title,
    description: load.page.meta.description,
    crumb: load.page.hero.crumb,
    crumbParent: load.shared.crumbParent,
    service: load.page.service,
    spokePaths: WH_V2_SERVICE_SLUGS.map((s) => `/${s}`),
    faqs: faq && faq.kind === 'faq' ? faq.items : [],
    phoneDisplay: phone.display,
    aggregateRating: shown && ctx.company ? aggregateRatingJsonLd(ctx.company) : null,
  });
  return { page: load.page, shared: load.shared, phone, ratings, jsonLd };
}

export async function WhServiceRoute({ slug }: { slug: WhServiceSlug }) {
  const load = await loadWhServicePage(slug);
  if (!load) notFound();
  const props = await viewProps(load, false);
  return load.preview ? (
    <>
      <PreviewBanner
        label={load.preview.label}
        creatorName={load.preview.creator_name}
        editorUrl={`/admin/sub-service/${slug}`}
        liveUrl={`/${slug}`}
        draftId={load.preview.id}
        pageType="sub-service"
        pageSlug={slug}
      />
      <WhServiceView {...props} />
    </>
  ) : (
    <WhServiceView {...props} />
  );
}

export async function WhHubRoute() {
  const load = await loadWhHub();
  if (!load) notFound();
  const props = await viewProps(load, true);
  return load.preview ? (
    <>
      <PreviewBanner
        label={load.preview.label}
        creatorName={load.preview.creator_name}
        editorUrl={`/admin/${WH_V2_HUB_SLUG}`}
        liveUrl={whPathFor(WH_V2_HUB_SLUG)}
        draftId={load.preview.id}
        pageType="service"
        pageSlug={WH_V2_HUB_SLUG}
      />
      <WhHubView {...props} />
    </>
  ) : (
    <WhHubView {...props} />
  );
}
