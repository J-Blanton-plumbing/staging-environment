import * as ReactDOM from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { cache } from 'react';
import { getGlobalSettingsCached } from '@/lib/cms/global-settings';
import { PhoneLink } from '@/components/PhoneLink';
import HomeHeroVideo from '@/components/HomeHeroVideo';
import { HERO_NAV } from '@/components/HeroNav';
import PreviewBanner from '@/components/PreviewBanner';
import Home2026Root from '@/components/home/Home2026Root';
import JobStories from '@/components/home/JobStories';
import YouTubeFacade from '@/components/home/YouTubeFacade';
import OfficeFinder, { type FinderOffice } from '@/components/home/OfficeFinder';
import { IMAGE_HOSTS, OG_IMAGE, STATIC_META } from '@/components/home/ClassicHome';
import { sanitizeHome2026Content } from '@/lib/cms/sanitize';
import { HOME_2026_SLUG, fill, resolveHome2026Content } from '@/lib/cms/home-2026-content';
import { getMainPageContent } from '@/lib/cms/main-pages';
import { getHome2026Preview } from '@/lib/cms/preview';
import { getMainPageMeta } from '@/lib/cms/page-meta';
import { getHomeFeaturedArticles } from '@/lib/cms/home-featured';
import { FALLBACK_ARTICLE_IMAGE } from '@/lib/cms/related-articles';
import { getHomeDepartmentIds } from '@/lib/cms/home-departments';
import { homepageJsonLd } from '@/lib/schema/homepage';
import { getRatingContext } from '@/lib/cms/office-ratings';
import { formatRatingValue, ratingShownIn } from '@/lib/cms/tokens';
import { aggregateRatingJsonLd } from '@/lib/schema/aggregate-rating';
import { ldJson } from '@/lib/schema/city-pages';
import { TITLE_TEMPLATE } from '@/lib/seo';
import { REGIONS } from '@/lib/content/locations-regions';
import { orderLocatorOffices } from '@/lib/content/locator';
import { resolveOfficeOverrides } from '@/lib/content/cities';
import { formatOfficeAddress } from '@/lib/cms/offices';
import { homeServiceDirectory } from '@/lib/content/home-service-directory';

/*
 * Brief 220 — Homepage 2026 (Real Jobs, no Elfsight), the second homepage record (main_pages row
 * `home-2026`), rendered at `/` when the Live homepage switch selects it (or under an editor's
 * preview cookie). Inside the live header and footer; everything in <main> follows the approved
 * prototype (New Pages/Homepage v2 Real Jobs/JBP_Homepage_v1/index.html) section by section, with its
 * inline style="" values turned into scoped classes (src/styles/home-2026.css).
 *
 * Copy and images: `src/lib/cms/home-2026-content.ts` (every field editable in /admin/home).
 * From existing data, never typed here: the phone (Global Settings, through PhoneLink so call
 * tracking swaps it), the offices, the regions and their community counts, the services directory,
 * the Knowledge Hub cards, the hero pills (HeroNav's links).
 *
 * Loads NO Elfsight code (the root layout skips the platform script when this record renders), no
 * YouTube until play, no Google Maps until a click. Head: the record's own title / description, the
 * same canonical and the same Brief 218 Organization / WebSite / WebPage graph as Classic; no
 * noindex; no Review / AggregateRating anywhere.
 */

/** The ONE resolved title + description for this request (head and WebPage node share it). */
const home2026Meta = cache(async () => {
  const meta = await getMainPageMeta(HOME_2026_SLUG, STATIC_META);
  return { title: TITLE_TEMPLATE.replace('%s', meta.title), description: meta.description };
});

export async function home2026Metadata(): Promise<Metadata> {
  const { title, description } = await home2026Meta();
  return {
    title: { absolute: title },
    description,
    openGraph: { type: 'website', locale: 'en_US', siteName: 'J. Blanton Plumbing', title, description, images: [OG_IMAGE] },
    twitter: { card: 'summary_large_image', title, description, images: [OG_IMAGE.url] },
  };
}

const PhoneIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="20" height="20" aria-hidden="true">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.68 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.32 1.85.55 2.81.68A2 2 0 0 1 22 16.92z" />
  </svg>
);
const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9.5" />
    <path d="m8 12.3 2.7 2.7L16.2 9.5" />
  </svg>
);
/** The 24 HOURS mark — the prototype's inline SVG, decorative, not editable. */
const Badge24 = () => (
  <span className="badge24" role="img" aria-label="24 hours, 7 days a week emergency service">
    <svg viewBox="0 0 100 100" width="64" height="64" aria-hidden="true" focusable="false">
      <path d="M30.28 12.92 A42 42 0 1 1 67.75 88.06" fill="none" stroke="currentColor" strokeWidth="7" />
      <path d="M26.06 4.97 L15.18 26.51 L34.51 20.86 Z" fill="currentColor" />
      <path d="M58.73 91.08 A42 42 0 0 1 52.93 91.90" fill="none" stroke="currentColor" strokeWidth="7" />
      <path d="M47.80 91.94 A42 42 0 0 1 41.99 91.23" fill="none" stroke="currentColor" strokeWidth="7" />
      <path d="M37.02 89.94 A42 42 0 0 1 31.59 87.75" fill="none" stroke="currentColor" strokeWidth="7" />
      <path d="M27.13 85.22 A42 42 0 0 1 22.45 81.70" fill="none" stroke="currentColor" strokeWidth="7" />
      <path d="M18.79 78.10 A42 42 0 0 1 15.18 73.49" fill="none" stroke="currentColor" strokeWidth="7" />
      <path d="M12.58 69.07 A42 42 0 0 1 10.29 63.67" fill="none" stroke="currentColor" strokeWidth="7" />
      <path d="M8.92 58.73 A42 42 0 0 1 8.10 52.93" fill="none" stroke="currentColor" strokeWidth="7" />
      <text x="50" y="56" textAnchor="middle" fontFamily="Industry,Arial,sans-serif" fontWeight="700" fontSize="38" fill="currentColor">24</text>
      <text x="50" y="71" textAnchor="middle" fontFamily="Industry,Arial,sans-serif" fontWeight="700" fontSize="13" letterSpacing=".5" fill="currentColor">HOURS</text>
    </svg>
  </span>
);
const Arrow = () => <span aria-hidden="true">&rarr;</span>;

/** Section heading block: eyebrow, H2, intro (the prototype's `max-width:780px` head). */
function Head({ eyebrow, heading, intro, introClass = 'h26-intro-0' }: { eyebrow: string; heading: string; intro: string; introClass?: string }) {
  return (
    <div className="h26-head">
      <span className="t-eyebrow h26-carmine">{eyebrow}</span>
      <h2 className="hub-h2 t-h2 h26-h2">{heading}</h2>
      <p className={`t-body pv-mute ${introClass}`}>{intro}</p>
    </div>
  );
}

export default async function Home2026() {
  const settings = await getGlobalSettingsCached();
  const meta = await home2026Meta();
  const departmentIds = await getHomeDepartmentIds(settings.offices.map((o) => o.slug));
  const preview = await getHome2026Preview();
  const db = preview?.content ?? (await getMainPageContent(HOME_2026_SLUG).catch(() => null));
  // The stored record (or the draft under the preview cookie) → render values: the same sanitizer the
  // write path runs, then every blank / unusable value falls back to its default (never throws).
  // Brief 221: `{{company_rating}}` / `{{company_review_count}}` filled from the synced company total.
  const ratings = await getRatingContext(null);
  const c = resolveHome2026Content(sanitizeHome2026Content((db ?? {}) as Record<string, unknown>), IMAGE_HOSTS, ratings);
  // Brief 221 (C2): the Organization carries the company rating only when the page shows exactly it —
  // the review box's big number and the count in its caption (visible = schema).
  const company = ratings.company;
  const aggregateRating =
    company && c.rating === formatRatingValue(company.ratingValue) && ratingShownIn([c.rating, c.reviews.proofSub], company)
      ? aggregateRatingJsonLd(company)
      : null;
  // The same Brief 218 graph as Classic, named by this record's resolved title / description.
  const jsonLd = homepageJsonLd({ pageName: meta.title, pageDescription: meta.description, departmentIds, aggregateRating });
  const articles = await getHomeFeaturedArticles(c.kh.featuredSlugs);
  const directory = homeServiceDirectory();
  const offices: FinderOffice[] = orderLocatorOffices(settings.offices).map((o) => ({
    slug: o.slug,
    name: o.name,
    address: formatOfficeAddress(o),
    city: o.city,
    zip: o.zip,
  }));

  // The poster is the LCP candidate: fetch it first, at high priority. The video source itself is only
  // set after hydration (HomeHeroVideo), so it never competes with it.
  (ReactDOM as unknown as { preload?: (href: string, o: { as: string; fetchPriority?: string }) => void }).preload?.(c.hero.poster, {
    as: 'image',
    fetchPriority: 'high',
  });

  return (
    <>
      {preview && (
        <PreviewBanner
          label={preview.meta.label}
          creatorName={preview.meta.creator_name}
          editorUrl="/admin/home?tab=home-2026"
          liveUrl="/"
          draftId={preview.meta.id}
          pageType="home-2026"
          pageSlug={HOME_2026_SLUG}
        />
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={ldJson(jsonLd)} />
      <Home2026Root>
        {/* 1. HERO */}
        <section className="hub-hero hub-hero--video">
          <HomeHeroVideo desktopSrc={c.hero.videoDesktop} mobileSrc={c.hero.videoMobile} poster={c.hero.poster} className="hero-video" scrim={false} />
          <div className="hub-hero-in">
            <span className="t-eyebrow pv-in h26-on-dark" style={{ ['--i' as string]: 0 }}>
              {c.hero.eyebrow}
            </span>
            <h1 className="t-h1 hub-h1 pv-in h26-on-dark h26-hero-h1" style={{ ['--i' as string]: 1 }}>
              {c.hero.h1}
            </h1>
            <p className="t-body pv-in h26-on-dark h26-hero-intro" style={{ ['--i' as string]: 2 }}>
              {c.hero.intro}
            </p>
            <div className="pv-in" style={{ ['--i' as string]: 3 }}>
              <div className="hero-cta">
                {/* Same behaviour as the Classic hero's "Make a Good Call": a PhoneLink to the Global
                    Settings phone, which WhatConverts swaps like every tel: link. */}
                <PhoneLink href={settings.phoneHref} display={settings.phoneDisplay} className="btn btn-hero-cta t-btn">
                  <PhoneIcon />
                  {c.hero.ctaLabel}
                </PhoneLink>
                <Badge24 />
              </div>
            </div>
            <nav className="hub-pills pv-in" style={{ ['--i' as string]: 4 }} aria-label="Quick links">
              {HERO_NAV.map((l) => (
                <Link key={l.href} href={l.href}>
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
        </section>

        {/* 2. TRUST BAR (3 items max) */}
        <section className="trust-stripe" aria-label={c.trust.label}>
          <ul className="wrap trust-stripe-list">
            {c.trust.items.map((t) => (
              <li key={t.id}>
                <CheckIcon />
                <span>{t.text}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* 3. SERVICES (homepage-only photo cards) + the full directory */}
        <section className="sec home-svc h26-bg-cream" id="services">
          <div className="wrap">
            <Head eyebrow={c.services.eyebrow} heading={c.services.heading} intro={c.services.intro} introClass="h26-intro" />
            <div className="hub-grid hub-grid--flat">
              {c.services.cards.map((card) => (
                <article className="hub-card" key={card.id}>
                  <Image className="hub-card-img" src={card.image} width={1200} height={800} alt={card.alt} sizes="(max-width: 640px) 100vw, (max-width: 1200px) 50vw, 330px" loading="lazy" />
                  <h3 className="svc-title h26-card-title">
                    <Link href={card.href}>{card.title}</Link>
                  </h3>
                  <p className="svc-desc h26-card-desc">{card.description}</p>
                  <Link className="svc-cta" href={card.href} aria-label={`${c.services.cardCta} about ${card.title} services`}>
                    {c.services.cardCta} <Arrow />
                  </Link>
                </article>
              ))}
            </div>
            <details className="svc-dir">
              <summary className="svc-dir-head">
                <span className="svc-dir-t">{c.services.dirTitle}</span>
                <span className="svc-dir-meta">
                  <span className="svc-dir-n">{fill(c.services.dirCount, { count: directory.count })}</span>
                  <span className="svc-dir-arrow" aria-hidden="true">
                    &rarr;
                  </span>
                </span>
              </summary>
              <nav aria-label="All plumbing services">
                <div className="svc-dir-grid">
                  {directory.groups.map((g) => (
                    <details className="svc-grp" open key={g.label}>
                      <summary>
                        <span className="svc-grp-t">
                          {g.label}
                          <span className="svc-grp-n">({g.items.length})</span>
                        </span>
                        <span className="svc-grp-i" aria-hidden="true">
                          +
                        </span>
                      </summary>
                      <ul>
                        {g.items.map((it) => (
                          <li key={it.href}>
                            <Link href={it.href}>{it.label}</Link>
                          </li>
                        ))}
                      </ul>
                    </details>
                  ))}
                </div>
              </nav>
            </details>
          </div>
        </section>

        {/* 4. AREAS WE SERVE — names, counties and counts from locations-regions.ts */}
        <section className="sec h26-bg-sand" id="areas">
          <div className="wrap">
            <Head eyebrow={c.areas.eyebrow} heading={c.areas.heading} intro={c.areas.intro} />
            <div className="region-grid">
              {REGIONS.map((r) => {
                const rc = c.areas.regions[r.key];
                return (
                  <article className="region-card" key={r.key}>
                    <Image src={rc.image} width={1000} height={500} alt={rc.alt} sizes="(max-width: 800px) 100vw, 50vw" loading="lazy" />
                    <div className="region-card-body">
                      <span className="region-stat">{fill(c.areas.statTemplate, { tenure: r.tenure, count: r.cities.length })}</span>
                      <h3 className="t-h3 h26-m0">
                        <Link href={r.href} className="h26-inherit">
                          {r.label}
                        </Link>
                      </h3>
                      <p className="t-body-sm pv-mute h26-m0">{r.counties}</p>
                      <Link className="svc-cta" href={r.href}>
                        {rc.cta} <Arrow />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* 5. REAL JOBS, REAL REVIEWS — replaces Elfsight; plain HTML, no Review schema */}
        <section className="sec h26-bg-cream" id="reviews">
          <div className="wrap">
            <div className="hub-rev-head">
              <Head eyebrow={c.reviews.eyebrow} heading={c.reviews.heading} intro={c.reviews.intro} introClass="h26-intro-40" />
              <aside className="hub-proof" aria-label="Review ratings and accreditation">
                <div className="hub-proof-row">
                  <svg viewBox="0 0 48 48" width="34" height="34" aria-hidden="true" focusable="false">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  </svg>
                  <div>
                    <div className="hub-proof-score">
                      <strong>{c.rating}</strong>
                      <span className="pv-stars" role="img" aria-label={`${c.rating} out of 5 stars`}>
                        ★★★★★
                      </span>
                    </div>
                    <span className="hub-proof-sub">{c.reviews.proofSub}</span>
                  </div>
                </div>
                <a className="hub-proof-row hub-proof-bbb" href={c.reviews.bbbUrl} target="_blank" rel="noreferrer">
                  <Image src={c.reviews.bbbSeal} alt={c.reviews.bbbSealAlt} width={92} height={36} loading="lazy" />
                  <span className="hub-proof-sub">{c.reviews.bbbLabel}</span>
                </a>
              </aside>
            </div>
            <JobStories jobs={c.reviews.jobs} label={c.reviews.jobsLabel} photosLabel={c.reviews.photosLabel} readOnGoogle={c.reviews.readOnGoogle} />
          </div>
        </section>

        {/* 6. WHY J. BLANTON + BRAND VIDEO (click-to-load) */}
        <section className="sec h26-bg-sand" id="why-us">
          <div className="wrap home-why">
            <div>
              <span className="t-eyebrow h26-carmine">{c.why.eyebrow}</span>
              <h2 className="hub-h2 t-h2 h26-h2">{c.why.heading}</h2>
              {c.why.body.map((p, i) => (
                <p className="t-body pv-mute h26-m0" key={i}>
                  {p}
                </p>
              ))}
              <div className="hero-btns">
                <PhoneLink href={settings.phoneHref} display={settings.phoneDisplay} className="btn btn-hero-cta t-btn">
                  <PhoneIcon />
                  {c.why.ctaCall}
                </PhoneLink>
                <Link className="btn btn-outline t-btn" href="/why-j-blanton">
                  {c.why.ctaLabel}
                </Link>
              </div>
            </div>
            <YouTubeFacade videoId={c.why.videoId} title={c.why.videoTitle} playLabel={`Play video: J. Blanton Plumbing, ${c.why.videoTitle}`} />
          </div>
        </section>

        {/* 7. NO DRIP CLUB banner (homepage-2026-only; the shared NoDripClubSection is untouched) */}
        <section className="sec h26-bg-cream" id="no-drip-club">
          <div className="wrap">
            <div className="ndc-banner">
              <div className="ndc-banner-brand">
                <Image className="ndc-banner-char" src={c.ndc.image} width={375} height={509} alt={c.ndc.imageAlt} sizes="250px" loading="lazy" />
                <h2 className="ndc-banner-mark">
                  {c.ndc.mark.split(/\s+/).map((w, i, all) => (
                    <span key={i}>
                      {w}
                      {i < all.length - 1 && <br />}
                    </span>
                  ))}
                </h2>
              </div>
              <div className="ndc-banner-copy">
                <p className="t-body h26-ndc-body">{c.ndc.body}</p>
                <Link className="svc-cta-onred" href="/no-drip-club">
                  {c.ndc.cta} <Arrow />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* 8. KNOWLEDGE HUB (published articles only) */}
        <section className="sec h26-bg-cream" id="knowledge-hub">
          <div className="wrap">
            <Head eyebrow={c.kh.eyebrow} heading={c.kh.heading} intro={c.kh.intro} />
            <div className="kh-grid">
              {articles.map((a) => (
                <article className="hub-card" key={a.slug}>
                  <Image className="hub-card-img" src={a.image || FALLBACK_ARTICLE_IMAGE} width={800} height={500} alt={a.title} sizes="(max-width: 640px) 100vw, (max-width: 1000px) 50vw, 440px" loading="lazy" />
                  <h3 className="svc-title h26-card-title">
                    <Link href={a.href}>{a.title}</Link>
                  </h3>
                  <p className="svc-desc h26-card-desc">{a.excerpt}</p>
                  <Link className="svc-cta" href={a.href} aria-label={`Read the article: ${a.title}`}>
                    {c.kh.cardCta} <Arrow />
                  </Link>
                </article>
              ))}
            </div>
            <div className="home-kh-foot">
              <Link className="btn btn-outline t-btn" href="/knowledge-hub">
                {c.kh.cta}
              </Link>
            </div>
          </div>
        </section>

        {/* 9. WHERE TO FIND US — offices from Global Settings; static map until a click (D3) */}
        <section className="sec h26-bg-sand" id="locations">
          <div className="wrap">
            <Head eyebrow={c.loc.eyebrow} heading={c.loc.heading} intro={c.loc.intro} />
            <OfficeFinder offices={offices} officeOverrides={resolveOfficeOverrides(settings.offices)} copy={c.loc} />
          </div>
        </section>
      </Home2026Root>
    </>
  );
}
