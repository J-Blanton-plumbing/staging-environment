import Link from 'next/link';
import { Fragment } from 'react';
import ArticleTermChips, { hasArticleTerms } from '@/components/kh/ArticleTermChips';
import TopicServiceLink from '@/components/kh/TopicServiceLink';
import ArticleV2Client from '@/components/kh/ArticleV2Client';
import { SITE } from '@/lib/site';
import { BRAND_SUFFIX } from '@/lib/seo';
import { renderCmsInline, sanitizeCmsInlineHtml } from '@/lib/cms/sanitize';
import { resolveTokens } from '@/lib/cms/tokens';
import { formatOfficeAddress, type CmsOffice } from '@/lib/cms/offices';
import type { GlobalSettings } from '@/lib/cms/global-settings';
import { FALLBACK_ARTICLE_IMAGE } from '@/lib/cms/related-articles';
import { breadcrumbListJsonLd } from '@/lib/schema/breadcrumb-list';
import { isLiveBreadcrumbRoute } from '@/lib/content/service-taxonomy';
import { CHICAGOLAND, CHICAGOLAND_GROUPS, COLUMBUS_REGION, OHIO_GROUPS, type CityGroup } from '@/lib/content/locations-regions';
import { NDC_RAIL_CARD } from '@/lib/content/ndc';
import { buildV2Body, countWords, htmlToText, type V2TocItem } from '@/lib/cms/article-v2-body';
import { DEFAULT_BYLINE_NAME, bylineInitials, readMinutes, type ArticleV2Content } from '@/lib/cms/article-v2';
import type { ArticleTermsDisplay } from '@/lib/cms/kh-taxonomy-types';
import type { KhArticleCard } from '@/lib/cms/kh-taxonomy';
import type { KhCrumb } from '@/lib/cms/kh-crumbs';

/**
 * Brief 190 — "Article V2": the approved Columbus article design (Briefs 185 +
 * 189) as a reusable, CMS-driven Knowledge Hub template.
 *
 *   masthead (crumbs · tags · H1 · subtitle · byline · hero)
 *   → TOC | article (key takeaways · body · office map · FAQ · service link) | rail
 *   → related articles → mobile call bar
 *
 * EVERYTHING VISIBLE comes from the article row, its Brief 187/188 tags and
 * related picks, Global Settings (phone, offices) or shared data (the region
 * groups, the NDC rail card) — except the fixed UI labels in `UI` below
 * (hard rule 3). The CSS (article-v2.css, every rule scoped under
 * `.article-v2`) is loaded by ArticleV2Client through a dynamic import, so it
 * is linked on V2 articles only — never on V1 (hard rule 6; see ArticleV2Styles).
 *
 * PHONE: every tel: link in the article — rail, CTAs, call bar and a body
 * `{{phone}}` — is the chosen office's phone when that office has one, else the
 * global number. Nothing is hardcoded. The root carries `data-wc-ignore` so an
 * office number is never read as the WhatConverts swap (Track F).
 *
 * The header and footer come from SiteShell (as on the test page), and the page's
 * one <main> is SiteShell's — the article column is an <article>.
 */

const UI = {
  skip: 'Skip to article',
  breadcrumb: 'Breadcrumb',
  by: 'By',
  minRead: 'min read',
  onThisPage: 'On this page',
  keyTakeaways: 'Key takeaways',
  introduction: 'Introduction',
  faqHeading: 'Frequently Asked Questions',
  faqToc: 'FAQ',
  railLabel: 'Get help',
  answering: 'Answering 24/7',
  officeSuffix: 'office',
  helpBody: 'Talk to a local plumber, day or night. You get a flat rate before any work begins.',
  callNow: 'Call now',
  scheduleOnline: 'Schedule online',
  schedule: 'Schedule',
  scheduleHref: '/contact',
  call: 'Call',
  callbarLabel: 'Call us',
  callbarOfficeLabel: (office: string) => `Contact the ${office} office`,
  mapTitle: (brand: string, address: string) => `Map of ${brand}, ${address}`,
  directions: 'Get directions',
  directionsNewTab: ' (opens Google Maps in a new tab)',
  communitiesDefault: (count: number, region: string) => `See all ${count} communities we serve in ${region}`,
  relatedHeading: 'Related articles',
  readArticle: 'Read article',
  allArticles: 'All Knowledge Hub articles',
  allArticlesHref: '/knowledge-hub',
} as const;

const SERVICE_AREAS: Record<'columbus' | 'chicagoland', { label: string; groups: readonly CityGroup[] }> = {
  columbus: { label: COLUMBUS_REGION.label, groups: OHIO_GROUPS },
  chicagoland: { label: CHICAGOLAND.label, groups: CHICAGOLAND_GROUPS },
};

export interface ArticleV2TemplateProps {
  article: { slug: string; title: string; image: string; body: string };
  /** Already sanitized (sanitizeArticleV2Content). */
  v2: ArticleV2Content;
  terms: ArticleTermsDisplay;
  related: KhArticleCard[];
  crumbs: KhCrumb[];
  settings: GlobalSettings;
}

function Check({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#BC0E0E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

function Plus() {
  return (
    <span className="plus" aria-hidden="true">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M1 6h10" />
        <path className="v" d="M6 1v10" />
      </svg>
    </span>
  );
}

function TocList({ items }: { items: V2TocItem[] }) {
  return (
    <>
      {items.map((t) => (
        <li key={t.id}>
          <a href={`#${t.id}`}>{t.label}</a>
        </li>
      ))}
    </>
  );
}

/** `tel:` target for a displayed number: E.164 for a 10-digit US number. */
function telHref(display: string): string {
  const digits = display.replace(/\D/g, '');
  if (digits.length === 10) return `tel:+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `tel:+${digits}`;
  return `tel:${display}`;
}

export default function ArticleV2Template({ article, v2, terms, related, crumbs, settings }: ArticleV2TemplateProps) {
  // ── Phone + office (Global Settings) ──
  const office: CmsOffice | null = v2.office ? settings.offices.find((o) => o.slug === v2.office) ?? null : null;
  const officePhone = office?.phone?.trim() ?? '';
  const phoneDisplay = officePhone || settings.phoneDisplay;
  const phoneHref = officePhone ? telHref(officePhone) : settings.phoneHref;
  const tokenSettings: GlobalSettings = { ...settings, phoneDisplay };

  // ── Body: sanitized, {{phone}} = the article's phone, H2 ids, sections ──
  const body = buildV2Body(article.body, (html) => resolveTokens(html, tokenSettings, { escape: true }));
  // FAQ answers: the inline allow-list (again, at render), then flattened into the one <p>.
  const faqs = v2.faqs.map((f) => ({ q: f.q, a: renderCmsInline(sanitizeCmsInlineHtml(f.a), tokenSettings) }));
  const toc: V2TocItem[] = [...body.toc, ...(faqs.length ? [{ id: 'faq', label: UI.faqToc }] : [])];

  const words =
    body.wordCount +
    v2.takeaways.reduce((n, t) => n + countWords(t), 0) +
    faqs.reduce((n, f) => n + countWords(f.q) + countWords(htmlToText(f.a)), 0);
  const minutes = readMinutes(words);

  const bylineName = v2.byline_name || DEFAULT_BYLINE_NAME;

  // ── Office map + directions + service-area list: ONE block ──
  const area = v2.service_area ? SERVICE_AREAS[v2.service_area] : null;
  const areaCount = area ? area.groups.reduce((n, g) => n + g.cities.length, 0) : 0;
  const address = office ? formatOfficeAddress(office) : '';
  const mapQuery = office ? encodeURIComponent(`${BRAND_SUFFIX}, ${address}`) : '';
  const officeMapBlock =
    office || area ? (
      <div className="office-map-block">
        {office && (
          <figure className="map">
            <iframe
              title={UI.mapTitle(BRAND_SUFFIX, address)}
              src={`https://www.google.com/maps?q=${mapQuery}&output=embed`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            ></iframe>
            <figcaption>
              <a className="more" href={`https://www.google.com/maps/dir/?api=1&destination=${mapQuery}`} target="_blank" rel="noopener">
                {UI.directions}
                <span className="visually-hidden">{UI.directionsNewTab}</span>
              </a>
            </figcaption>
          </figure>
        )}
        {area && (
          <details className="communities">
            <summary>{v2.service_area_label || UI.communitiesDefault(areaCount, area.label)}</summary>
            <div className="communities-body">
              {area.groups.map((group) => (
                <details key={group.label} className="communities-group" open={group.defaultOpen}>
                  <summary>
                    {group.label} <span>({group.cities.length})</span>
                  </summary>
                  <ul>
                    {group.cities.map((city) => (
                      <li key={city.slug}>{city.name}</li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          </details>
        )}
      </div>
    ) : null;

  // ── Breadcrumb: the Brief 188 trail V1 renders, and its one BreadcrumbList ──
  const crumbJsonLd = breadcrumbListJsonLd(crumbs, SITE.baseUrl);

  return (
    <div className="article-v2" data-wc-ignore="">
      <a className="skip" href="#content">
        {UI.skip}
      </a>

      <div className={article.image ? 'masthead' : 'masthead masthead--no-frame'}>
        <div className="masthead-band" aria-hidden="true"></div>
        <div className="masthead-text">
          <nav className="crumbs" aria-label={UI.breadcrumb}>
            <ol>
              {crumbs.map((c, i) => {
                const last = i === crumbs.length - 1;
                return (
                  <li key={`${c.href}-${i}`} aria-current={last ? 'page' : undefined}>
                    {last || !isLiveBreadcrumbRoute(c.href) ? c.label : <Link href={c.href}>{c.label}</Link>}
                  </li>
                );
              })}
            </ol>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbJsonLd) }} />
          </nav>
          {hasArticleTerms(terms) && <ArticleTermChips terms={terms} onRed />}
          <h1>{article.title}</h1>
          {v2.dek && <p className="dek">{v2.dek}</p>}
        </div>
        <div className="masthead-meta">
          <div className="byline">
            <span className="avatar" aria-hidden="true">
              {bylineInitials(bylineName)}
            </span>
            <span>
              {UI.by} <strong>{bylineName}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {minutes} {UI.minRead}
            </span>
          </div>
        </div>
        {article.image && (
          <figure className="frame">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={article.image} width={1500} height={1000} alt={v2.image_alt || article.title} fetchPriority="high" />
            {v2.image_caption && <figcaption>{v2.image_caption}</figcaption>}
          </figure>
        )}
      </div>

      <div className={toc.length ? 'body' : 'body body--no-toc'}>
        {toc.length > 0 && (
          <nav className="toc" aria-labelledby="toc-label">
            <p className="rail-label" id="toc-label">
              {UI.onThisPage}
            </p>
            <ol id="toc">
              <TocList items={toc} />
            </ol>
          </nav>
        )}

        <article id="content" className="v2-article">
          {v2.takeaways.length > 0 && (
            <section className="takeaways" aria-labelledby="kt">
              <p className="takeaways-label" id="kt">
                {UI.keyTakeaways}
              </p>
              <ul>
                {v2.takeaways.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </section>
          )}

          {toc.length > 0 && (
            <details className="toc-m">
              <summary>{UI.onThisPage}</summary>
              <ol>
                <TocList items={toc} />
              </ol>
            </details>
          )}

          {body.sections.map((s, i) => (
            <section
              key={s.headingId ?? `intro-${i}`}
              {...(s.headingId ? { 'aria-labelledby': s.headingId } : { 'aria-label': UI.introduction })}
            >
              {s.parts.map((p, j) =>
                p.kind === 'office-map' ? (
                  <Fragment key={j}>{officeMapBlock}</Fragment>
                ) : (
                  <div key={j} dangerouslySetInnerHTML={{ __html: p.html }} />
                )
              )}
            </section>
          ))}

          {/* No [[office-map]] marker in the body → the block follows the body. */}
          {!body.hasMarker && officeMapBlock && <section>{officeMapBlock}</section>}

          {faqs.length > 0 && (
            <section className="faq" aria-labelledby="faq">
              <h2 id="faq">{UI.faqHeading}</h2>
              {faqs.map((f, i) => (
                <details key={i}>
                  <summary>
                    {f.q}
                    <Plus />
                  </summary>
                  {f.a && <p dangerouslySetInnerHTML={{ __html: f.a }} />}
                </details>
              ))}
            </section>
          )}

          <TopicServiceLink href={terms.primary?.serviceHref} text={terms.primary?.serviceCtaText} />
        </article>

        <aside className="rail" aria-label={UI.railLabel}>
          <div className="rail-stick">
            {office && (
              <div className="help">
                <span className="status">
                  <span className="pulse" aria-hidden="true"></span>
                  {UI.answering}
                </span>
                <span className="loc">
                  {office.name} {UI.officeSuffix}
                </span>
                <a className="num" href={phoneHref}>
                  {phoneDisplay}
                </a>
                <p>{UI.helpBody}</p>
                <address>
                  {office.streetAddress}
                  <br />
                  {office.city}, {office.state} {office.zip}
                </address>
                <a className="btn btn-fill" href={phoneHref}>
                  {UI.callNow}
                </a>
                <Link className="btn btn-line" href={UI.scheduleHref}>
                  {UI.scheduleOnline}
                </Link>
              </div>
            )}
            <div className="ndc">
              <p className="ndc-title">{NDC_RAIL_CARD.title}</p>
              <p>{NDC_RAIL_CARD.body}</p>
              <ul>
                {NDC_RAIL_CARD.benefits.map((b) => (
                  <li key={b}>
                    <Check size={12} />
                    {b}
                  </li>
                ))}
              </ul>
              <Link className="btn btn-line" href={NDC_RAIL_CARD.href}>
                {NDC_RAIL_CARD.cta}
              </Link>
            </div>
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="related" aria-labelledby="related">
          <h2 id="related">{UI.relatedHeading}</h2>
          <ul>
            {related.map((r) => (
              <li key={r.href}>
                <Link href={r.href}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.image || FALLBACK_ARTICLE_IMAGE} alt="" width={640} height={360} loading="lazy" decoding="async" />
                  <b>{r.title}</b>
                  <i>{UI.readArticle}</i>
                </Link>
              </li>
            ))}
          </ul>
          <Link className="more" href={UI.allArticlesHref}>
            {UI.allArticles}
          </Link>
        </section>
      )}

      <div
        className="callbar"
        id="callbar"
        aria-label={office ? UI.callbarOfficeLabel(office.name) : UI.callbarLabel}
        role="region"
      >
        <a className="btn btn-fill" href={phoneHref}>
          {UI.call} {phoneDisplay}
        </a>
        <Link className="btn btn-line" href={UI.scheduleHref}>
          {UI.schedule}
        </Link>
      </div>

      <ArticleV2Client />
    </div>
  );
}
