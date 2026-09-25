'use client';

import '@/app/knowledge-hub/[slug]/article-v2.css';

/**
 * Brief 190 (hard rule 6) — the ONE importer of article-v2.css. Renders nothing.
 *
 * WHY A SEPARATE, DYNAMICALLY-LOADED MODULE. V1 and V2 share one route
 * (/knowledge-hub/[slug]). Any CSS the route's server graph reaches — or that a
 * client component it imports eagerly reaches — is added to the ROUTE's entry
 * CSS, i.e. linked on all ~812 V1 articles (measured: a direct import from
 * ArticleV2Template put the 20 KB V2 stylesheet on every V1 article). A
 * `next/dynamic` import from a CLIENT component puts this module, and the CSS it
 * imports, in an async chunk instead; Next's PreloadCss then emits the
 * `<link rel="stylesheet">` only when this component actually renders — so the
 * stylesheet loads on V2 articles and nowhere else. See ArticleV2Client.tsx.
 */
export default function ArticleV2Styles() {
  return null;
}
