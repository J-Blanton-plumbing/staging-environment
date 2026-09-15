import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getMainPageMeta } from '@/lib/cms/page-meta';
import FaqPageSchema from '@/components/FaqPageSchema';
import PreviewBanner from '@/components/PreviewBanner';
import { getMainPageContent } from '@/lib/cms/main-pages';
import { getMainPagePreview } from '@/lib/cms/preview';
import { isPageLive } from '@/lib/cms/page-status';
import { getGlobalSettingsCached } from '@/lib/cms/global-settings';
import { renderCmsBlock } from '@/lib/cms/sanitize';
import { CONSUMER_RIGHTS, FAQ_ENTRIES } from '@/lib/content/consumer-rights';
import ConsumerRightsTemplate from './ConsumerRightsTemplate';
import './consumer-rights.css';

/**
 * /consumer-rights — "Home Repair: Know Your Consumer Rights" (Brief 176).
 *
 * A UTILITY PAGE with its own template (`./ConsumerRightsTemplate`): navbar,
 * hero, document, closing CTA, footer. Navbar and Footer come from the root
 * layout / SiteShell; everything between them belongs to this page.
 *
 * ── Deliberately NOT here (Marketing revision, 2026-09-14) ─────────────────
 * The brief's Track B specified the /privacy-policy shell, which is the Coverage
 * Area CITY template. Marketing reviewed the build and rejected that
 * inheritance, so the following are gone on purpose — do not "restore" them by
 * copying another page's shell:
 *
 *   • `CityHero`          — Local Office NAP box (address / areas served / hours)
 *                           and the Elfsight Google-reviews pill. Replaced by a
 *                           purpose-built hero carrying the copy document's own
 *                           H1 + lead + CTA.
 *   • the Google map      — a service-area map says nothing about Illinois
 *                           consumer law.
 *   • `CityServicesMenu`  — a 40-link sales menu, directly against this page's
 *                           "Brand presence: Neutral" decision on record.
 *   • `ArticleGrid`       — the three default Knowledge Hub articles (sewer
 *                           replacement, cold snap, pink stains) are unrelated.
 *   • `CityLocationsGrid` — a ~150-city areas-served grid.
 *   • `HeroNav`           — the "We've Got You Covered" cross-sell band.
 *   • `FaqAccordion`      — `WATER_TESTING_FAQS` are off-topic AND a second FAQ
 *                           block would collide with this page's FAQPage JSON-LD.
 *   • `GoogleReviews`     — review badges beside consumer-fraud warnings.
 *
 * The page is not orphaned by any of this: the shared Footer already carries the
 * full site nav and the office directory, and the navbar is untouched.
 *
 * CMS: the H1, the (optional) hero image and every prose field are editable at
 * /admin/consumer-rights and stored on the `main_pages` row (slug
 * `consumer-rights`), merged over the static `CONSUMER_RIGHTS` defaults so an
 * un-seeded environment still renders the approved copy. The two verbatim
 * statutory blocks, the tables, the cards and the CTA are NOT CMS fields — see
 * `@/lib/content/consumer-rights`.
 */

const SLUG = 'consumer-rights';

// Force-dynamic so CMS edits are reflected immediately (same as other main pages).
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const meta = await getMainPageMeta(SLUG, {
    title: CONSUMER_RIGHTS.meta.title,
    description: CONSUMER_RIGHTS.meta.description,
  });
  return {
    title: meta.title,
    description: meta.description,
    // Genuine informational content — indexable, unlike a typical utility page.
    robots: { index: true, follow: true },
  };
}

export default async function ConsumerRightsPage() {
  // Preview draft (authorized CMS session) wins over the live DB row.
  const preview = await getMainPagePreview(SLUG);

  // Brief 159 (Track D/E1) — the render gate. `isPageLive` fails OPEN on a DB
  // error, and a page with no row at all is treated as live.
  if (!preview && !(await isPageLive('main', SLUG))) notFound();
  const db = preview?.content ?? (await getMainPageContent(SLUG).catch(() => null));
  const d = db ?? {};
  const settings = await getGlobalSettingsCached();

  // String field with static fallback.
  const m = (val: unknown, fb: string) => (typeof val === 'string' && val ? val : fb);
  // Rich-text field → sanitized block HTML, DB value over static default.
  const rich = (val: unknown, fb: string) => renderCmsBlock(m(val, fb), settings);

  const S = CONSUMER_RIGHTS;

  return (
    <>
      {preview && (
        <PreviewBanner
          label={preview.meta.label}
          creatorName={preview.meta.creator_name}
          editorUrl={`/admin/${SLUG}`}
          liveUrl={`/${SLUG}`}
          draftId={preview.meta.id}
          pageType="main"
          pageSlug={SLUG}
        />
      )}

      {/* The page's one and only FAQPage node — nothing else here emits one. */}
      <FaqPageSchema entries={FAQ_ENTRIES} />

      <ConsumerRightsTemplate
        heading={m(d.hero_heading, S.hero.heading)}
        // Optional. Blank by default and blank in the seed — this template has no
        // stock-photo slot and the copy document specifies no image. Set it in the
        // CMS and the hero splits into two columns.
        heroImage={typeof d.hero_image === 'string' ? d.hero_image : S.hero.image}
        prose={{
          intro: rich(d.intro_body, S.prose.intro),
          scopeNote: rich(d.scope_note, S.prose.scopeNote),
          beforeSignIntro: rich(d.before_sign_intro, S.prose.beforeSignIntro),
          precautions: rich(d.precautions_html, S.prose.precautions),
          cancellationIntro: rich(d.cancellation_intro, S.prose.cancellationIntro),
          cancellationAfterTable: rich(d.cancellation_after_table, S.prose.cancellationAfterTable),
          cancellationAfterCallout: rich(d.cancellation_after_callout, S.prose.cancellationAfterCallout),
          contractAfterTable: rich(d.contract_after_table, S.prose.contractAfterTable),
          swornStatementBody: rich(d.sworn_statement_body, S.prose.swornStatementBody),
          liensBody: rich(d.liens_body, S.prose.liensBody),
          fraudIntro: rich(d.fraud_intro, S.prose.fraudIntro),
          complaintIntro: rich(d.complaint_intro, S.prose.complaintIntro),
          fileComplaintBody: rich(d.file_complaint_body, S.prose.fileComplaintBody),
          roofingBody: rich(d.roofing_body, S.prose.roofingBody),
          downloadBody: rich(d.download_body, S.prose.downloadBody),
          footnote: rich(d.footnote_html, S.prose.footnote),
        }}
      />
    </>
  );
}
