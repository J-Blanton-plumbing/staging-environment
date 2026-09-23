import type { Metadata } from 'next';
import ColumbusArticleTestTemplate from './ColumbusArticleTestTemplate';
import './columbus-article-test.css';

/**
 * /columbus-article-test — TEMPORARY MANAGER-REVIEW BUILD (Brief 185).
 *
 * ⚠ This page exists so the manager can review the approved Columbus launch
 * article design on desktop and mobile, BETWEEN THE LIVE SITE HEADER AND FOOTER,
 * before it becomes a reusable Knowledge Hub article template. The header and
 * footer come from the root layout / SiteShell and are consumed, not modified —
 * which is the whole reason this is a real route and not a static `public/` drop
 * like Brief 183 (files in `public/` bypass the root layout).
 *
 * ⚠ NOINDEX ON PURPOSE, and no canonical at all. `robots: { index: false,
 * follow: false }` below, plus an explicit `alternates: undefined` that
 * SUPPRESSES the root layout's self-referencing canonical (Next's
 * `mergeMetadata` iterates the keys present on this object, so the explicit
 * `undefined` is seen and resolves to null — same mechanism as Brief 180's
 * /hanover-park-test).
 *
 * Also deliberate: this route is in NO sitemap, has ZERO inbound links (nothing
 * in the navbar, footer, Knowledge Hub listings or any article points at it — it
 * is reachable only by typing the URL), and `robots.txt` is untouched. A
 * `Disallow` line there would stop crawlers reading the `noindex` (Brief 152).
 *
 * No CMS wiring, no JSON-LD, no global-settings read: the article carries the
 * Columbus number (614-547-6516) on purpose, not the sitewide phone.
 *
 * SOURCE OF TRUTH:
 *   `New Pages/Columbus Launch Article v3/jbp-columbus-launch-v3/`
 *     01_approved/jbp-columbus-jakubkrehel-v3.html   ← what the manager approved
 *     02_dev-source/jbp-columbus-v3.dev.html         ← the markup + CSS ported here
 *
 * AFTER APPROVAL: a separate brief turns this into a CMS article template and
 * retires or redirects this route. Rollback = delete this folder and
 * `public/images/columbus-article-test/`; nothing else references either.
 */

// Same as the /hanover-park-test precedent.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  // `absolute` bypasses the root layout's `%s | J. Blanton Plumbing` template;
  // the approved title already ends in the brand.
  title: {
    absolute: 'J. Blanton Plumbing Is Now Serving Columbus and Central Ohio | J. Blanton Plumbing',
  },
  description:
    'J. Blanton Plumbing has opened its first Ohio location at 1387 W. Goodale Blvd in Columbus. 24/7 plumbing, drain, sewer and water heater service across 138 Central Ohio communities.',
  robots: { index: false, follow: false },
  // Emit NO <link rel="canonical"> — see the note above.
  alternates: undefined,
};

export default function ColumbusArticleTestPage() {
  // SiteShell already wraps every page in <main>, so the template renders none.
  return <ColumbusArticleTestTemplate />;
}
