import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PreviewBanner from '@/components/PreviewBanner';
import { getGlobalSettingsCached } from '@/lib/cms/global-settings';
import { loadSewerHub, loadSewerServicePage, sewerHubMetaFor, sewerServiceMetaFor } from '@/lib/cms/sewer-v2';
import type { SewerServiceSlug } from '@/lib/sewer-v2-cms/model';
import type { SewerPhone } from './SewerNodes';
import SewerHubView from './SewerHubView';
import SewerServiceView from './SewerServiceView';

/**
 * Brief 200 — what each of the 10 Sewer Ecosystem v2 route files renders. The route files stay
 * explicit static routes (a top-level `[service]` segment would collide with `[city]`, CLAUDE.md).
 *
 * Metadata: title WITHOUT the brand (the root layout's template adds it once — Briefs 145/146) and
 * the approved description. Deliberately NO `alternates`: the root layout emits the self-canonical,
 * and setting `alternates` at all (even `undefined`) suppresses it. No robots: these pages are
 * indexable.
 *
 * Brief 204: content comes from the CMS — the page's `sub_service_pages` row (the hub's
 * `service_category_pages` row), with the code modules as the fallback, and the sewer-shared
 * sections from the hub row. See src/lib/cms/sewer-v2.ts for the render gate (an unpublished row
 * 404s; no row / DB down → code module). Titles and descriptions come from the rows' `meta_title` /
 * `meta_description` once the row holds v2 content. Draft previews render with the PreviewBanner.
 *
 * The non-preview branch returns the view ALONE (a one-slot ternary, not `{preview && …}` beside
 * it), so the RSC payload of a normal request is byte-identical to Brief 200's.
 */

export type { SewerServiceSlug };

async function sitePhone(): Promise<SewerPhone> {
  // The same source every live CTA uses (Global Settings, falling back to site.ts when the DB is down).
  const settings = await getGlobalSettingsCached();
  return { href: settings.phoneHref, display: settings.phoneDisplay };
}

export async function sewerServiceMetadata(slug: SewerServiceSlug): Promise<Metadata> {
  const meta = await sewerServiceMetaFor(slug);
  return meta ? { title: meta.title, description: meta.description } : {};
}

export async function SewerServiceRoute({ slug }: { slug: SewerServiceSlug }) {
  const load = await loadSewerServicePage(slug);
  if (!load) notFound();
  const phone = await sitePhone();
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
      <SewerServiceView page={load.page} shared={load.shared} phone={phone} />
    </>
  ) : (
    <SewerServiceView page={load.page} shared={load.shared} phone={phone} />
  );
}

export async function sewerHubMetadata(): Promise<Metadata> {
  const meta = await sewerHubMetaFor();
  return meta ? { title: meta.title, description: meta.description } : {};
}

export async function SewerHubRoute() {
  const load = await loadSewerHub();
  if (!load) notFound();
  const phone = await sitePhone();
  return load.preview ? (
    <>
      <PreviewBanner
        label={load.preview.label}
        creatorName={load.preview.creator_name}
        editorUrl="/admin/sewer"
        liveUrl="/services/sewer"
        draftId={load.preview.id}
        pageType="service"
        pageSlug="sewer"
      />
      <SewerHubView hub={load.hub} shared={load.shared} phone={phone} />
    </>
  ) : (
    <SewerHubView hub={load.hub} shared={load.shared} phone={phone} />
  );
}
