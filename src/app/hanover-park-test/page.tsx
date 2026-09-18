import type { Metadata } from 'next';
import { getGlobalSettingsCached } from '@/lib/cms/global-settings';
import { HANOVER_PARK_TEST } from '@/lib/content/hanover-park-test';
import HanoverParkTestTemplate from './HanoverParkTestTemplate';
import './hanover-park-test.css';

/**
 * /hanover-park-test — TEMPORARY REVIEW BUILD (Brief 180).
 *
 * ⚠ This page exists so Marketing can read an approved copy rewrite in a real
 * browser, at real type sizes, with real spacing, BEFORE any CMS shape is
 * decided. It is a workflow experiment — text first, layout second, CMS third —
 * and the CMS's absence is the specific thing being tested. Do not wire it up.
 *
 * ⚠ NOINDEX ON PURPOSE, and no canonical at all. `robots: { index: false,
 * follow: false }` below, plus an explicit `alternates: undefined` that
 * SUPPRESSES the root layout's self-referencing canonical: Next's
 * `mergeMetadata` iterates the keys present on this object, so the explicit
 * `undefined` is seen and resolves to null. Without it the page would advertise
 * a canonical for a URL nobody should index. It must never point at
 * `/hanover-park`, which is a real, live, registered Coverage Area city page
 * this brief does not touch.
 *
 * Also deliberate: this route is in NO sitemap, has ZERO inbound links (nothing
 * in the navbar, footer, services menu, locations grid or any article points at
 * it — it is reachable only by typing the URL), and `robots.txt` is untouched.
 * A `Disallow` line there would stop crawlers reading the `noindex` and is the
 * wrong tool.
 *
 * COPY SOURCE OF TRUTH:
 *   `New Pages/Hanover Park city page/Hanover Park_CityPage_Copy_Rewrite.md`
 * Every user-visible string lives in `@/lib/content/hanover-park-test`, in that
 * document's published order. Nothing is hardcoded in the template.
 *
 * AFTER APPROVAL: how this copy reaches `/hanover-park` is an OPEN decision for
 * a separate brief — `/hanover-park` is a Coverage Area city rendered by the
 * shared `[city]` builder, and the standing Brief 179 rule is that no existing
 * Coverage Area page gets re-categorised. Nothing here presumes an answer.
 */

// Nothing on this page is cached content; force-dynamic matches the rest of the
// site and keeps the (single) global-settings read fresh.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  // `absolute` bypasses the root layout's `%s | J. Blanton Plumbing` template.
  // The rewrite's META DATA title already ends in the brand, so a plain string
  // would render it twice. This ships the approved title verbatim.
  title: { absolute: HANOVER_PARK_TEST.meta.title },
  description: HANOVER_PARK_TEST.meta.description,
  robots: { index: false, follow: false },
  // Emit NO <link rel="canonical"> — see the note above.
  alternates: undefined,
};

export default async function HanoverParkTestPage() {
  // The only live data this page reads: the phone number (never hardcoded —
  // design.md, "Copy and claims") and, since revision round 3, the Hanover Park
  // office address for the embedded map. Both come from the SAME settings object
  // and this getter already falls back to site.ts and never throws, so the page
  // renders with the database down.
  const settings = await getGlobalSettingsCached();

  return (
    <main>
      <HanoverParkTestTemplate
        phoneDisplay={settings.phoneDisplay}
        phoneHref={settings.phoneHref}
        offices={settings.offices}
      />
    </main>
  );
}
