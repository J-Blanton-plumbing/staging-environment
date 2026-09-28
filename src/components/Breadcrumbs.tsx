import Link from 'next/link';
import { SITE } from '@/lib/site';
import { isLiveBreadcrumbRoute } from '@/lib/content/service-taxonomy';
import { breadcrumbListJsonLd } from '@/lib/schema/breadcrumb-list';

/**
 * Reusable SEO breadcrumb (Brief 64, Track C).
 *
 * Renders a visible, accessible trail AND a `BreadcrumbList` JSON-LD block so
 * Google sees the topical silo. Given an ordered list of crumbs (root → current):
 *   - The last crumb is the current page — rendered as plain Midnight text
 *     (`aria-current="page"`), never a link.
 *   - Ancestor crumbs whose target route IS live render as Cerulean links;
 *     crumbs whose route is NOT yet built render as plain text (they flip to
 *     links automatically once the hub ships — see LIVE_HUB_SLUGS).
 *   - Every crumb — link or text — is emitted as a `ListItem` in the JSON-LD with
 *     its absolute canonical `item` URL (built from SITE.baseUrl), so the schema
 *     is complete even before an ancestor page exists.
 *
 * `hideCurrent` (Brief 193 follow-up, Marketing 2026-09-28 — the V1 article, to
 * match the Brief 191 V2 rule): the VISIBLE trail drops the last crumb (the
 * page's own title, which the H1 repeats directly below), so every visible
 * crumb is an ancestor and none is aria-current. The JSON-LD keeps the FULL
 * trail — the post-deploy validator requires a BreadcrumbList to end at the
 * page's own canonical (Brief 188 F4). Off by default, so every other page
 * renders exactly as before.
 *
 * Brand only: Cerulean links (`text-accent-500`), Midnight text (`text-navy-800`),
 * Nunito (`font-sans`). No `#000000`.
 */
export interface BreadcrumbItem {
  label: string;
  href: string;
}

export default function Breadcrumbs({ items, hideCurrent = false }: { items: BreadcrumbItem[]; hideCurrent?: boolean }) {
  if (!items || items.length === 0) return null;
  const visible = hideCurrent ? items.slice(0, -1) : items;

  // Brief 188: built by the shared pure helper (same object, same key order)
  // so the prebuild JSON-LD check validates exactly what this renders.
  const jsonLd = breadcrumbListJsonLd(items, SITE.baseUrl);

  return (
    <nav aria-label="Breadcrumb" className="w-[90%] lg:w-[81%] mx-auto pt-5 lg:pt-8">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 font-sans text-[13px] leading-tight md:text-[14px]">
        {visible.map((it, i) => {
          const isLast = i === visible.length - 1;
          const isCurrent = isLast && !hideCurrent;
          const live = isLiveBreadcrumbRoute(it.href);
          return (
            <li key={`${it.href}-${i}`} className="flex items-center gap-x-2">
              {isCurrent || !live ? (
                <span
                  className="text-navy-800 font-semibold"
                  aria-current={isCurrent ? 'page' : undefined}
                >
                  {it.label}
                </span>
              ) : (
                <Link href={it.href} className="text-accent-500 hover:underline">
                  {it.label}
                </Link>
              )}
              {!isLast && (
                <span className="text-navy-800/40" aria-hidden="true">
                  ›
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </nav>
  );
}
