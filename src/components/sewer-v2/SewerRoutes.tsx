import type { Metadata } from 'next';
import { getGlobalSettingsCached } from '@/lib/cms/global-settings';
import { pageTitle } from '@/lib/seo';
import { SEWER_V2_PAGES } from '@/lib/content/sewer-v2';
import { SEWER_HUB } from '@/lib/content/sewer-v2/hub';
import type { SEWER_V2_SERVICE_SLUGS } from '@/lib/content/sewer-v2/routes';
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
 * ⚠️ CMS: these pages do not read `sub_service_pages` or `service_category_pages`. Admin edits to
 * those rows no longer change them until the CMS follow-up brief (Brief 200 report §4 lists the rows).
 */

export type SewerServiceSlug = (typeof SEWER_V2_SERVICE_SLUGS)[number];

async function sitePhone(): Promise<SewerPhone> {
  // The same source every live CTA uses (Global Settings, falling back to site.ts when the DB is down).
  const settings = await getGlobalSettingsCached();
  return { href: settings.phoneHref, display: settings.phoneDisplay };
}

export function sewerServiceMetadata(slug: SewerServiceSlug): Metadata {
  const { meta } = SEWER_V2_PAGES[slug];
  return { title: pageTitle(meta.title), description: meta.description };
}

export async function SewerServiceRoute({ slug }: { slug: SewerServiceSlug }) {
  return <SewerServiceView page={SEWER_V2_PAGES[slug]} phone={await sitePhone()} />;
}

export const sewerHubMetadata: Metadata = {
  title: pageTitle(SEWER_HUB.meta.title),
  description: SEWER_HUB.meta.description,
};

export async function SewerHubRoute() {
  return <SewerHubView phone={await sitePhone()} />;
}
