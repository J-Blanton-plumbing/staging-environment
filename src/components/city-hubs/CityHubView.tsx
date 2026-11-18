import { Fragment, type CSSProperties, type ReactNode } from 'react';
import { PhoneLink, PhoneNumber } from '@/components/PhoneLink';
import ScheduleTrigger from '@/components/schedule/ScheduleTrigger';
import type { CityHubRender, CityHubShared, HubPhoto } from '@/lib/city-hub-cms/model';
import { fillPattern, hubPlumberJsonLd } from '@/lib/city-hub-cms/model';
import type { AggregateRatingNode } from '@/lib/schema/aggregate-rating';
import { faqPageJsonLd, hubBreadcrumbJsonLd, ldJson, schemaPhone } from '@/lib/schema/city-pages';
import CityHubRoot from './CityHubRoot';
import HubHeroVideo from './HubHeroVideo';
import { pilotServiceHref, pruneHref } from '@/lib/city-pruning/phase1';
// Brief 229: plain server markup — CityHubRoot wires the search and links pruning.css on a `.pruned` root
// (no new client component on the [city] route, so every other city page keeps its exact chunks).
import SearchBox from '@/components/city-pruning/SearchBox';

/**
 * City Hubs V2 (Brief 205) — ALL the markup of a city hub page (/joliet, /tinley-park,
 * /columbus, /northbrook, /naperville).
 *
 * The approved package (`New Pages/City Hubs V2/{slug}.html`, cloned from the Highland Park hub)
 * element for element: same section order, classes and inline styles. What changed on the way in,
 * and nothing else:
 *   • The package's own header, drawer, footer and prototype banner are gone — the live shell
 *     (Navbar, Footer, schedule modal, analytics, call tracking) supplies them.
 *   • Every phone position renders through PhoneLink/PhoneNumber, so WhatConverts can swap the
 *     number, with the site phone from Global Settings (Columbus: the Central Ohio phone).
 *   • "Schedule" buttons are the site's schedule-popup trigger (Brief 169), not `#book` links.
 *   • Structured data: the VideoObject, then (Brief 216, Marketing 2026-10-21) a page-scoped
 *     Plumber node when the office has a Google Business Profile link (`office.gbpUrl` — sameAs +
 *     hasMap; built here in a fixed key order) and ONE FAQPage derived from the visible FAQ. Both
 *     are derived at render, never stored. Brief 217 (one location per city page): that Plumber node
 *     is the ONLY office node on the page — the footer's sitewide PlumbingBusiness graph is off on
 *     this template (SiteShell, decided by template), and the hub's service pages emit the same node.
 *   • `noindex` is gone (the package was a review prototype).
 * Copy lives in the CMS (Brief 212 = Brief 206 Tracks B–E): the page's own content comes from its
 * `city_pages.hub_content` row and the sections every hub shares from the `city-hubs` shared record,
 * each falling back to the code modules in src/lib/content/city-hubs. This file holds none — the
 * labels and patterns it used to hard-code (Brief 206 §2.3) are shared-record fields now, with the
 * exact same text, so the markup is byte-identical.
 */

export interface CityHubPhone {
  href: string;
  display: string;
}

/** Inline style string → React style object (the approved markup's inline styles, verbatim). */
function s(css: string): CSSProperties {
  const out: Record<string, string> = {};
  for (const decl of css.split(';')) {
    const i = decl.indexOf(':');
    if (i < 0) continue;
    const prop = decl.slice(0, i).trim();
    const val = decl.slice(i + 1).trim();
    if (!prop) continue;
    out[prop.startsWith('--') ? prop : prop.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())] = val;
  }
  return out as CSSProperties;
}

/** `[label](/href)` → <a>; everything else is text. The only markup the content files carry. */
function Rich({ text, linkStyle }: { text: string; linkStyle?: CSSProperties }) {
  const parts: ReactNode[] = [];
  const re = /\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    // Brief 229 (Track F): a link to a page the City Pruning pilot redirects → its final target.
    parts.push(
      <a key={m.index} href={pruneHref(m[2])} style={linkStyle}>
        {m[1]}
      </a>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

/* ── Icons (the approved package's inline SVGs) ─────────────────────────────────────────── */
const PHONE_PATH =
  'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.68 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.32 1.85.55 2.81.68A2 2 0 0 1 22 16.92z';

function PhoneIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" style={{ flexShrink: 0 }} viewBox="0 0 24 24" width="20" xmlns="http://www.w3.org/2000/svg">
      <path d={PHONE_PATH} />
    </svg>
  );
}

const BADGE_ARCS = [
  'M58.73 91.08 A42 42 0 0 1 52.93 91.90', 'M47.80 91.94 A42 42 0 0 1 41.99 91.23', 'M37.02 89.94 A42 42 0 0 1 31.59 87.75',
  'M27.13 85.22 A42 42 0 0 1 22.45 81.70', 'M18.79 78.10 A42 42 0 0 1 15.18 73.49', 'M12.58 69.07 A42 42 0 0 1 10.29 63.67',
  'M8.92 58.73 A42 42 0 0 1 8.10 52.93',
];

function Badge24() {
  return (
    <svg aria-hidden="true" focusable="false" height="64" viewBox="0 0 100 100" width="64">
      <path d="M30.28 12.92 A42 42 0 1 1 67.75 88.06" fill="none" stroke="currentColor" strokeWidth="7" />
      <path d="M26.06 4.97 L15.18 26.51 L34.51 20.86 Z" fill="currentColor" />
      {BADGE_ARCS.map((d) => (
        <path key={d} d={d} fill="none" stroke="currentColor" strokeWidth="7" />
      ))}
      <text fill="currentColor" fontFamily="Industry,Arial,sans-serif" fontSize="38" fontWeight="700" textAnchor="middle" x="50" y="56">24</text>
      <text fill="currentColor" fontFamily="Industry,Arial,sans-serif" fontSize="13" fontWeight="700" letterSpacing=".5" textAnchor="middle" x="50" y="71">HOURS</text>
    </svg>
  );
}

function CheckCircle() {
  return (
    <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9.5" />
      <path d="m8 12.3 2.7 2.7L16.2 9.5" />
    </svg>
  );
}

/** Brief 229 — the v7 license callout's shield-check (the package's inline SVG). */
function ShieldIcon() {
  return (
    <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function GoogleG() {
  return (
    <svg aria-hidden="true" focusable="false" height="34" viewBox="0 0 48 48" width="34">
      <path d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" fill="#EA4335" />
      <path d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" fill="#4285F4" />
      <path d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" fill="#FBBC05" />
      <path d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" fill="#34A853" />
    </svg>
  );
}

function Avatar() {
  return (
    <span className="review-avatar">
      <svg aria-hidden="true" fill="none" height="20" stroke="#F9F3EC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="20" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    </span>
  );
}

function NdcCheck() {
  return (
    <span className="ndc-check">
      <svg aria-hidden="true" fill="none" height="12" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" width="12" xmlns="http://www.w3.org/2000/svg">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </span>
  );
}

function Stars({ label }: { label: string }) {
  return (
    <div aria-label={label} className="pv-stars" role="img">
      ★★★★★
    </div>
  );
}

function ReviewCaption({ name, url, SH }: { name: string; url: string | null; SH: CityHubShared }) {
  return (
    <div>
      <strong className="t-label" style={s('font-size:14px')}>{name}</strong>
      <div className="t-caption pv-cap">{SH.verified}</div>
      {url ? (
        <a className="hp-rev-link" href={url} rel="noreferrer" target="_blank">
          {SH.readOnGoogle}
        </a>
      ) : null}
    </div>
  );
}

/** The hero `<picture>`: this page's own photo, or the shared standard van photo. */
function HeroPicture({ photo, sizes = '(max-width:900px) 100vw, 62vw' }: { photo: HubPhoto; sizes?: string }) {
  return (
    <picture>
      <source media="(max-width:900px)" srcSet={photo.mobile} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt={photo.alt}
        className="hero-photo"
        fetchPriority="high"
        height={photo.height}
        sizes={sizes}
        src={photo.src}
        srcSet={photo.src1100 ? `${photo.src1100} 1100w, ${photo.src} ${photo.width}w` : undefined}
        width={photo.width}
      />
    </picture>
  );
}

/**
 * Brief 216 (Track C3): stops the full-bleed hero video's autoplay before its first frame on a hard
 * load when the visitor asked for reduced motion (HubHeroVideo's effect covers client navigations).
 */
const REDUCED_MOTION_GUARD =
  "(function(){try{var v=document.currentScript&&document.currentScript.previousElementSibling;if(v&&v.tagName==='VIDEO'&&window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches){v.autoplay=false;v.removeAttribute('autoplay');v.pause();}}catch(e){}})();";

const YT_WATCH = 'https://www.youtube.com/watch?v=';
const YT_EMBED = 'https://www.youtube.com/embed/';

const NDC_LINK_STYLE = s('color:#F9F3EC;text-decoration:underline;text-underline-offset:3px');

export default function CityHubView({
  hub,
  shared: SH,
  phone,
  aggregateRating = null,
}: {
  hub: CityHubRender;
  shared: CityHubShared;
  phone: CityHubPhone;
  /** Brief 221 (C1): the office's synced Google numbers for its Plumber node (`applyHubRatings`). */
  aggregateRating?: AggregateRatingNode | null;
}) {
  const L = SH.labels;
  const callNow = (
    <PhoneLink href={phone.href} display={phone.display} className="btn btn-hero-cta t-btn">
      <PhoneIcon />
      {L.callNow}
    </PhoneLink>
  );
  // Brief 217 (C3): a hub can pin its Google listing (`office.mapCid`) or search something else
  // (`office.mapQuery`); neither set = the address, exactly as before.
  const mapWhat = hub.office.mapCid ? `cid=${hub.office.mapCid}` : `q=${encodeURIComponent(hub.office.mapQuery || hub.office.address)}`;
  const mapSrc = `https://maps.google.com/maps?hl=en&${mapWhat}&z=15&ie=UTF8&output=embed`;
  // Brief 227: an office page's service links (the shared Why Us camera link included) go to its
  // service hub's pages; every other hub links to its own.
  const camera = `/${hub.serviceHub || hub.slug}/video-camera-sewer-inspections`;
  // Brief 227 — the office-page pieces. Each one renders in the JSX SLOT of the element it replaces
  // (`x ? <new/> : <old/>`, never a new `{x && …}` sibling), so a hub without them renders — HTML and
  // RSC payload — exactly as before.
  // Brief 229 (Track 0 step 6): a breadcrumb step the pilot redirects (German Village's
  // /locations/central-ohio) links to its final page — in the visible crumb and in its BreadcrumbList.
  const bc = hub.breadcrumb ? { ...hub.breadcrumb, trail: hub.breadcrumb.trail.map((st) => ({ ...st, href: pruneHref(st.href) })) } : undefined;
  const featured = hub.services.featured;
  const linkBar = hub.services.linkBar;
  const panel = hub.office.neighborhoods;
  const fin = hub.fin;
  const ndcBox = hub.ndcBox;
  // The service card grid (every hub's; an office page shows it under its featured tile).
  const cardGrid = (className: string) => (
    <div className={className}>
      {hub.services.cards.map((c) => (
        <article className="hub-card" key={c.href}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt={c.image.alt} className="hub-card-img" height={500} loading="lazy" src={c.image.src} width={800} />
          <h3 className="svc-title" style={s('margin:16px 0 8px')}>
            <a href={c.href}>{c.title}</a>
          </h3>
          <p className="svc-desc" style={s('margin:0 0 16px')}>{c.desc}</p>
          <a aria-label={fillPattern(SH.patterns.cardAria, { card: c.title, city: hub.name })} className="svc-cta" href={c.href}>
            {`${L.learnMore} `}<span aria-hidden="true">→</span>
          </a>
        </article>
      ))}
    </div>
  );
  const breadcrumbJsonLd = bc ?hubBreadcrumbJsonLd(bc.trail, bc.current, `https://jblantonplumbing.com/${hub.slug}`) : null;
  const total = SH.stripe.reduce((n, g) => n + g.items.length, 0);
  // Brief 227: an office page's "Explore all our plumbing services" dropdown lists its service hub's
  // pages (/columbus/…), so its links, count and label name that city. Every other hub: its own.
  const dirSlug = hub.serviceHub || hub.slug;
  const dirCity = hub.serviceHubName || hub.name;
  const [r1, r2, r3] = hub.reviews.items;
  const STARS = <Stars label={L.reviewStars} />;
  const city = hub.name;
  // Key order is the order production has always emitted (JSON.stringify keeps it).
  const videoJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: SH.videoSchema.name,
    description: SH.videoSchema.description,
    thumbnailUrl: SH.videoSchema.thumbnailUrl,
    uploadDate: SH.videoSchema.uploadDate,
    duration: SH.videoSchema.duration,
    contentUrl: `${YT_WATCH}${SH.video.youtubeId}`,
    embedUrl: `${YT_EMBED}${SH.video.youtubeId}`,
  };
  // Brief 216: derived at render, never stored (see the header).
  // Brief 229: a pilot hub's (and Joliet's) Plumber node carries its Google listing number.
  const plumberJsonLd = hubPlumberJsonLd(hub, phone.display, schemaPhone, aggregateRating, hub.office.schemaTelephone);
  // Brief 229 — the Tier 1 template v7 (the 3 pilot hubs only): its services and office sections each
  // render in the JSX slot of the section they replace, so every other hub renders exactly as before.
  const v7 = hub.tier1 === 'v7';
  const areasPanel = hub.office.serviceAreas;
  const faqJsonLd = hub.faq.items.length ? faqPageJsonLd(hub.faq.items) : null;
  const heroPhoto = hub.hero.photo === 'standard' ? SH.vanPhoto : hub.hero.photo;
  const fullBleed = hub.hero.layout === 'full-bleed';

  return (
    <CityHubRoot className={`city-hub city-hub--${hub.slug}${v7 ? ' pruned' : ''}`}>
      {breadcrumbJsonLd ? (
        <>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(videoJsonLd).replace(/</g, '\\u003c') }} />
          <script type="application/ld+json" dangerouslySetInnerHTML={ldJson(breadcrumbJsonLd)} />
        </>
      ) : (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(videoJsonLd).replace(/</g, '\\u003c') }} />
      )}
      {plumberJsonLd ? <script type="application/ld+json" dangerouslySetInnerHTML={ldJson(plumberJsonLd)} /> : null}
      {faqJsonLd ? <script type="application/ld+json" dangerouslySetInnerHTML={ldJson(faqJsonLd)} /> : null}

      {/* 1. HERO — 'split' (every hub but those that opt in) or Brief 216's 'full-bleed' */}
      <section
        className={
          fullBleed ? 'hub-hero hub-hero--full' : `hub-hero hub-hero--photo${hub.hero.crop === 'columbus' ? ' hub-hero--columbus' : ''}`
        }
      >
        {fullBleed && hub.hero.video ? (
          <>
            <HubHeroVideo video={hub.hero.video} />
            <script dangerouslySetInnerHTML={{ __html: REDUCED_MOTION_GUARD }} />
          </>
        ) : (
          <HeroPicture photo={heroPhoto} sizes={fullBleed ? '100vw' : undefined} />
        )}
        <div className="hub-hero-in">
          {bc ? (
            <>
              <nav aria-label="Breadcrumb" className="ss-crumb hub-crumb pv-in" style={s('--i:0')}>
                {bc.trail.map((step) => (
                  <Fragment key={step.href}>
                    <a href={step.href}>{step.label}</a>
                    <span aria-hidden="true">/</span>
                  </Fragment>
                ))}
                <span aria-current="page">{bc.current}</span>
              </nav>
              <span className="t-eyebrow pv-in" style={s('--i:0;color:#F9F3EC')}>{hub.hero.eyebrow}</span>
            </>
          ) : (
            <span className="t-eyebrow pv-in" style={s('--i:0;color:#F9F3EC')}>{hub.hero.eyebrow}</span>
          )}
          <h1 className="t-h1 hub-h1 pv-in" style={s('--i:1;color:#F9F3EC;margin:14px 0 16px')}>{hub.hero.h1}</h1>
          <p className="t-body pv-in" style={s('--i:2;color:#F9F3EC;margin:0 0 26px;max-width:56ch')}>{hub.hero.sub}</p>
          <div className="pv-in" style={s('--i:3')}>
            <div className="hero-cta">
              {callNow}
              <span aria-label={SH.badge24Label} className="badge24" role="img">
                <Badge24 />
              </span>
            </div>
          </div>
          <nav aria-label={SH.heroPillsLabel} className="hub-pills pv-in" style={s('--i:4')}>
            {SH.heroPills.map((p) => (
              <a key={p.href} href={p.href}>{p.label}</a>
            ))}
          </nav>
        </div>
      </section>

      {/* 2. TRUST BAR */}
      <section aria-label={SH.trustLabel} className="trust-stripe">
        <ul className="wrap trust-stripe-list">
          {/* Brief 227: a rating item with no rating row behind it renders empty — and is not shown. */}
          {hub.trust.filter((t) => t.trim() !== '').map((t) => (
            <li key={t}>
              <CheckCircle />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* 3. SERVICES */}
      <section className="sec hub-svc-sec" id="services" style={s('background:#F9F3EC')}>
        <div className="wrap">
          <div style={s('max-width:780px')}>
            <span className="t-eyebrow" style={s('color:#BC0E0E')}>{SH.servicesEyebrow}</span>
            <h2 className="hub-h2 t-h2" style={s('margin:12px 0 18px')}>{hub.services.h2}</h2>
            <p className="t-body pv-mute" style={s('margin:0 0 8px')}>{hub.services.intro}</p>
          </div>
          {v7 && featured && hub.services.list ? (
            <div className="sc-wrap">
              <article className="sc-f">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt={featured.image.alt} className="sc-fimg" height={500} src={featured.image.src} width={800} />
                <div className="sv-ftxt sc-ftxt">
                  <span className="t-eyebrow sv-eye sc-eye">{featured.eyebrow}</span>
                  <h3 className="sv-ft sc-ft">
                    <a href={featured.href}>{featured.title}</a>
                  </h3>
                  <p className="sv-fd sc-fd">{featured.intro}</p>
                  <a aria-label={`Learn more about ${featured.title}`} className="svc-cta-onred" href={featured.href}>
                    {`${featured.cta} `}<span aria-hidden="true">→</span>
                  </a>
                </div>
              </article>
              <nav aria-label={`More plumbing services in ${city}`} className="sc-list">
                <ul>
                  {hub.services.list.map((r) => (
                    <li key={r.href}>
                      <a className="sc-row" href={r.href}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img alt="" height={500} loading="lazy" src={r.image?.src ?? ''} width={800} />
                        <span className="sc-rt">
                          <span className="sc-rh">{r.title}</span>
                          <span className="sc-rd">{r.desc}</span>
                        </span>
                        <span aria-hidden="true" className="sc-arr">→</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
          ) : featured ? (
            <div className="hub-svc-office">
              <article className="hub-feat">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt={featured.image.alt} className="hub-feat-img" height={500} loading="lazy" src={featured.image.src} width={800} />
                <div>
                  <span className="t-eyebrow" style={s('color:#BC0E0E')}>{featured.eyebrow}</span>
                  <h3 className="svc-title hub-feat-title" style={s('margin:12px 0 12px')}>
                    <a href={featured.href}>{featured.title}</a>
                  </h3>
                  <p className="svc-desc" style={s('margin:0 0 24px')}>{featured.intro}</p>
                  <a className="svc-cta" href={featured.href}>
                    {`${featured.cta} `}<span aria-hidden="true">→</span>
                  </a>
                </div>
              </article>
              {/* Under the featured tile: the row list (when the page has one), else the card grid. */}
              {hub.services.list ? (
                <nav aria-label={hub.services.h2} className="hub-svc-rows">
                  <ul>
                    {hub.services.list.map((r) => (
                      <li key={r.href}>
                        <a href={r.href}>
                          <span className="svc-title">{r.title}</span>
                          <span className="svc-desc">{r.desc}</span>
                          <span aria-hidden="true" className="hub-svc-rows-arrow">→</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
              ) : (
                cardGrid('hub-grid hub-grid--after-feat')
              )}
            </div>
          ) : (
            cardGrid('hub-grid hub-grid--flat')
          )}
          {linkBar ? (
            <a className="svc-dir hub-linkbar" href={linkBar.href}>
              <span className="svc-dir-head">
                <span className="svc-dir-t">{linkBar.label}</span>
                <span aria-hidden="true" className="svc-dir-arrow">→</span>
              </span>
            </a>
          ) : (
          <details className="svc-dir">
            <summary className="svc-dir-head">
              <span className="svc-dir-t">{SH.stripeTitle}</span>
              <span className="svc-dir-meta">
                <span className="svc-dir-n">{fillPattern(SH.patterns.stripeCount, { n: total, city: dirCity })}</span>
                <span aria-hidden="true" className="svc-dir-arrow">→</span>
              </span>
            </summary>
            <nav aria-label={fillPattern(SH.patterns.directoryAria, { city: dirCity })}>
              <div className="svc-dir-grid">
                {SH.stripe.map(({ group, items }) => (
                  <details className="svc-grp" open key={group}>
                    <summary>
                      <span className="svc-grp-t">
                        {group}
                        <span className="svc-grp-n">({items.length})</span>
                      </span>
                      <span aria-hidden="true" className="svc-grp-i">+</span>
                    </summary>
                    <ul>
                      {items.map(({ label, slug }) => (
                        <li key={slug}>
                          {/* Brief 229: a pilot hub's fold slugs link to the page they live on (they 301); every other hub: unchanged. */}
                          <a href={pilotServiceHref(dirSlug, slug)}>{label}</a>
                        </li>
                      ))}
                    </ul>
                  </details>
                ))}
              </div>
            </nav>
          </details>
          )}
        </div>
      </section>

      {/* 4. OFFICE — Brief 229: a v7 hub's map band + office card + service-areas panel in this slot */}
      {v7 && areasPanel ? (
      <section className="sec" id="office" style={s('background:#F1E8DC')}>
        <div className="wrap">
          <div className="cc-band">
            <iframe
              allowFullScreen
              className="cc-map"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={mapSrc}
              title={hub.office.mapTitle || fillPattern(SH.patterns.mapTitle, { city })}
            />
            <div className="cc-card">
              <span className="t-eyebrow" style={s('color:#BC0E0E')}>{hub.office.eyebrow}</span>
              <h2 className="hub-h2 t-h2" style={s('margin:12px 0 18px')}>{hub.office.h2}</h2>
              <p className="t-body pv-mute" style={s('margin:0 0 20px')}>{hub.office.body}</p>
              <div className="hp-addr">
                <PinIcon />
                <div>
                  <strong>{fillPattern(SH.patterns.addressName, { city })}</strong>
                  <span className="t-body-sm pv-mute">{hub.office.address}</span>
                </div>
              </div>
              {hub.office.license ? (
                <div className="hp-addr cc-license">
                  <ShieldIcon />
                  <div>
                    <strong>{hub.office.license}</strong>
                  </div>
                </div>
              ) : null}
              <div className="hero-btns">
                {callNow}
                <ScheduleTrigger as="button" className="btn btn-outline t-btn" label={SH.officeSchedule} />
              </div>
            </div>
          </div>
          <div className="cb-panel" data-phone-href={phone.href} data-state-name={areasPanel.stateName} data-state-url={areasPanel.stateUrl} id="service-areas">
            <div className="cb-top">
              <div>
                <h3 className="t-h4" style={s(areasPanel.intro ? 'margin:0 0 6px' : 'margin:0')}>{areasPanel.h3}</h3>
                {areasPanel.intro ? <p className="t-body-sm pv-mute" style={s('margin:0')}>{areasPanel.intro}</p> : null}
              </div>
              {areasPanel.towns.length >= 12 ? <SearchBox /> : null}
            </div>
            <ul className="cb-list" data-cb-list="">
              {areasPanel.towns.map((t) => (
                <li key={t.label}>{t.href ? <a href={t.href}>{t.label}</a> : t.label}</li>
              ))}
            </ul>
            <p aria-live="polite" className="t-body-sm cb-empty" data-cb-empty="" hidden />
            <p className="t-body-sm pv-mute cb-foot">{areasPanel.closing}</p>
          </div>
        </div>
      </section>
      ) : (
      <section className="sec" id="office" style={s('background:#F1E8DC')}>
        <div className="wrap hp-office">
          <div className="hp-office-map">
            <iframe allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={mapSrc} title={hub.office.mapTitle || fillPattern(SH.patterns.mapTitle, { city })} />
          </div>
          <div>
            <span className="t-eyebrow" style={s('color:#BC0E0E')}>{hub.office.eyebrow}</span>
            <h2 className="hub-h2 t-h2" style={s('margin:12px 0 18px')}>{hub.office.h2}</h2>
            <p className="t-body pv-mute" style={s('margin:0 0 24px')}>{hub.office.body}</p>
            <div className="hp-addr">
              <PinIcon />
              <div>
                <strong>{fillPattern(SH.patterns.addressName, { city })}</strong>
                {hub.office.license ? (
                  <>
                    <span className="t-body-sm pv-mute">{hub.office.address}</span>
                    <span className="t-body-sm hub-license">{hub.office.license}</span>
                  </>
                ) : (
                  <span className="t-body-sm pv-mute">{hub.office.address}</span>
                )}
              </div>
            </div>
            <div className="hero-btns">
              {callNow}
              <ScheduleTrigger as="button" className="btn btn-outline t-btn" label={SH.officeSchedule} />
            </div>
            {panel ? (
            <div className="hp-areas hub-nbhd" data-state-name={panel.stateName} data-state-url={pruneHref(panel.stateUrl)} id="service-areas">
              <h3 className="t-h4" style={s('margin:0 0 14px')}>{panel.h3}</h3>
              <ul className="hub-nbhd-list">
                {panel.names.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
              <p className="t-body-sm pv-mute" style={s('margin:16px 0 0')}>{panel.closing}</p>
            </div>
            ) : (
            <div className="hp-areas">
              <h3 className="t-h4" style={s('margin:0 0 10px')}>{hub.office.areasH3}</h3>
              <p className="t-body-sm pv-mute" style={s('margin:0')}>
                {hub.office.areas.map((a, i) => (
                  <Fragment key={a.href}>
                    {/* Brief 229 (Track F): a community the pilot redirects links to its final page. */}
                    <a href={pruneHref(a.href)}>{a.label}</a>
                    {i < hub.office.areas.length - 1 ? ', ' : L.and}
                  </Fragment>
                ))}
                <a href={pruneHref(hub.office.more)}>{L.more}</a>.
              </p>
            </div>
            )}
          </div>
        </div>
      </section>
      )}

      {/* 5. LOCAL DEPTH */}
      <section className="sec" style={s('background:#F9F3EC')}>
        <div className="wrap hub-split">
          <div className="hub-sticky">
            <span className="t-eyebrow" style={s('color:#BC0E0E')}>{SH.depthEyebrow}</span>
            <h2 className="hub-h2 t-h2" style={s('margin:12px 0 18px')}>{hub.depth.h2}</h2>
            <p className="t-body pv-mute" style={s('margin:0')}>{hub.depth.intro}</p>
          </div>
          <div className="hub-tiles">
            {hub.depth.tiles.map((t, i) => (
              <div className="hub-tile hub-tile--text" key={t.title}>
                <span className="hp-num">{`0${i + 1}`}</span>
                <div>
                  <h3 className="t-label" style={s('color:#BC0E0E;margin:0 0 10px')}>{t.title}</h3>
                  <p className="t-body-sm pv-mute" style={s('margin:0')}>
                    <Rich text={t.body} />
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. MID CTA (financing) */}
      <section className="hub-fin">
        <div className="wrap hub-fin-in">
          {fin ? (
            <>
              <p className="hub-fin-rate">
                <span className="hub-fin-rate-top">{fin.labelTop}</span>
                <span className="hub-fin-rate-val">{fin.labelValue}</span>
              </p>
              <div className="hub-fin-copy">
                <span className="t-eyebrow" style={s('color:#F9F3EC')}>{SH.fin.eyebrow}</span>
                {/* One H2 element: the mobile wording swaps in by CSS (≤640px), never a second heading. */}
                <h2 className="t-h2" style={s('color:#F9F3EC;margin:12px 0 10px;max-width:440px')}>
                  <span className="hub-swap-d">{fin.h2}</span>
                  <span className="hub-swap-m">{fin.h2Mobile}</span>
                </h2>
                <p className="t-body-sm" style={s('color:#F9F3EC;margin:0 0 8px;max-width:440px')}>{fin.body}</p>
                <p className="t-body-sm" style={s('color:#F9F3EC;opacity:.75;margin:0;max-width:440px;font-size:.8em')}>{SH.fin.disclaimer}</p>
              </div>
            </>
          ) : (
          <div className="hub-fin-copy">
            <span className="t-eyebrow" style={s('color:#F9F3EC')}>{SH.fin.eyebrow}</span>
            <h2 className="t-h2" style={s('color:#F9F3EC;margin:12px 0 10px;max-width:440px')}>{SH.fin.h2}</h2>
            <p className="t-body-sm" style={s('color:#F9F3EC;margin:0 0 8px;max-width:440px')}>{SH.fin.body}</p>
            <p className="t-body-sm" style={s('color:#F9F3EC;opacity:.75;margin:0;max-width:440px;font-size:.8em')}>{SH.fin.disclaimer}</p>
          </div>
          )}
          <PhoneLink href={phone.href} display={phone.display} className="btn btn-onred t-btn hub-fin-cta">
            {SH.fin.cta}
          </PhoneLink>
        </div>
      </section>

      {/* 7. WHY US */}
      <section className="sec" id="why-us" style={s('background:#F9F3EC')}>
        <div className="wrap hp-why">
          <div>
            <span className="t-eyebrow" style={s('color:#BC0E0E')}>{SH.why.eyebrow}</span>
            <h2 className="hub-h2 t-h2" style={s('margin:12px 0 18px')}>{hub.whyH2}</h2>
            <p className="t-body pv-mute" style={s('margin:0 0 32px')}>{SH.why.intro}</p>
            <div className="hp-why-list">
              {(hub.whyItems ?? SH.why.items).map((w) => (
                <div className="hp-why-item" key={w.h3}>
                  <h3 className="t-h4" style={s('margin:0 0 8px')}>{w.h3}</h3>
                  <p className="t-body-sm pv-mute" style={s('margin:0')}>
                    <Rich text={w.body.replace('{camera}', camera)} />
                  </p>
                </div>
              ))}
            </div>
            {callNow}
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt={SH.why.image.alt} className="hp-why-img" height={1350} loading="lazy" src={SH.why.image.src} width={1080} />
        </div>
      </section>

      {/* 8. VIDEO */}
      <section className="sec" style={s('background:#F1E8DC')}>
        <div className="wrap">
          <div style={s('max-width:780px')}>
            <span className="t-eyebrow" style={s('color:#BC0E0E')}>{SH.video.eyebrow}</span>
            <h2 className="hub-h2 t-h2" style={s('margin:12px 0 18px')}>{SH.video.h2}</h2>
            <p className="t-body pv-mute" style={s('margin:0')}>{SH.video.intro}</p>
          </div>
          <div className="hp-video">
            <div className="hp-video-frame">
              <iframe
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                src={`https://www.youtube-nocookie.com/embed/${SH.video.youtubeId}?rel=0`}
                title={SH.video.title}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 9. REVIEWS */}
      <section className="sec" style={s('background:#F9F3EC')}>
        <div className="wrap">
          <div className="hub-rev-head">
            <div style={s('max-width:780px')}>
              <span className="t-eyebrow" style={s('color:#BC0E0E')}>{hub.reviews.eyebrow}</span>
              <h2 className="hub-h2 t-h2" style={s('margin:12px 0 18px')}>{hub.reviews.h2}</h2>
              {/* Brief 227: an intro / rating that renders empty (no rating row) is not shown. */}
              {hub.reviews.intro.trim() !== '' ? <p className="t-body pv-mute" style={s('margin:0 0 40px')}>{hub.reviews.intro}</p> : null}
            </div>
            <aside aria-label={SH.reviewsProofLabel} className="hub-proof">
              {hub.reviews.rating.trim() !== '' ? (
              <div className="hub-proof-row">
                <GoogleG />
                <div>
                  <div className="hub-proof-score">
                    <strong>{hub.reviews.rating}</strong>
                    <span aria-label={`${hub.reviews.rating} out of 5 stars`} className="pv-stars" role="img">★★★★★</span>
                  </div>
                  <span className="hub-proof-sub">{hub.reviews.ratingSub}</span>
                </div>
              </div>
              ) : null}
              <a className="hub-proof-row hub-proof-bbb" href={SH.bbb.href} rel="noreferrer" target="_blank">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt={SH.bbb.alt} height={36} src={SH.bbb.src} width={92} />
                <span className="hub-proof-sub">{SH.bbb.label}</span>
              </a>
            </aside>
          </div>
          <div className="hub-reviews">
            <div className="hp-rev-main">
              <figure className="hub-quote pv-reveal" style={s('--i:0')}>
                {STARS}
                <blockquote>{`“${r1.text}”`}</blockquote>
                <figcaption>
                  <div className="review-author">
                    <Avatar />
                    <ReviewCaption name={r1.name} url={r1.url} SH={SH} />
                  </div>
                </figcaption>
              </figure>
              <div className="hp-rev-ctas">
                {callNow}
                <ScheduleTrigger as="button" className="btn btn-outline t-btn" label={SH.officeSchedule} />
              </div>
            </div>
            <div className="hub-side">
              {[r2, r3].map((r, i) => (
                <div className="hub-rev pv-reveal" key={r.name} style={s(`--i:${i + 1}`)}>
                  {STARS}
                  <p className="t-body-sm" style={s('margin:0 0 14px')}>{`“${r.text}”`}</p>
                  <div className="review-author">
                    <Avatar />
                    <ReviewCaption name={r.name} url={r.url} SH={SH} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 10. FAQ */}
      <section className="sec" style={s('background:#F1E8DC')}>
        <div className="wrap hub-split">
          <div className="hub-sticky">
            <span className="t-eyebrow" style={s('color:#BC0E0E')}>{SH.faqEyebrow}</span>
            <h2 className="hub-h2 t-h2" style={s('margin:12px 0 0')}>{hub.faq.h2}</h2>
          </div>
          <div style={s('display:flex;flex-direction:column;gap:12px')}>
            {hub.faq.items.map((f) => (
              <div className="faq-item2" key={f.q}>
                <button aria-expanded="false" className="faq-q" type="button">
                  <span className="faq-q-text">{f.q}</span>
                  <span aria-hidden="true" className="faq-plus">+</span>
                </button>
                <div className="faq-panel">
                  <p className="faq-preview">{f.preview}</p>
                  <p className="faq-full">
                    <Rich text={f.a} />
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 11. NO DRIP CLUB */}
      <section className="ndc ndc--band" id="no-drip-club">
        <div className="wrap">
          <div className="ndc-grid">
            <div className="ndc-text">
              {ndcBox ? (
                <p className="t-eyebrow ndc-eyebrow">
                  <span className="hub-swap-d">{ndcBox.eyebrow}</span>
                  <span className="hub-swap-m">{ndcBox.eyebrowMobile}</span>
                </p>
              ) : (
                <p className="t-eyebrow ndc-eyebrow">{SH.ndc.eyebrow}</p>
              )}
              <h2 className="t-h2 ndc-h2">{ndcBox ? ndcBox.h2 : SH.ndc.h2}</h2>
              <p className="ndc-body">
                <Rich text={hub.ndc} linkStyle={NDC_LINK_STYLE} />
              </p>
              <ul className="ndc-list">
                {(ndcBox ? ndcBox.benefits : SH.ndc.benefits).map((b) => (
                  <li key={b}>
                    <NdcCheck />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <a className="btn btn-primary t-btn ndc-btn" href={SH.ndc.href}>{ndcBox ? ndcBox.cta : SH.ndc.cta}</a>
            </div>
            <div className="ndc-figure">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt={SH.ndc.mascot.alt} height={1604} loading="lazy" src={SH.ndc.mascot.src} width={1180} />
            </div>
          </div>
        </div>
      </section>

      {/* 12. FINAL CTA */}
      <section className="sec final-cta" id="book">
        <div className="wrap hub-final">
          <div>
            <span className="t-eyebrow" style={s('color:#BC0E0E')}>{hub.final.eyebrow}</span>
            <h2 className="hub-h2 t-h2" style={s('margin:12px 0 16px')}>{hub.final.h2}</h2>
            <p className="t-body pv-mute" style={s('margin:0')}>{hub.final.body}</p>
          </div>
          <div className="hub-final-btns" style={s('display:flex;flex-wrap:wrap;gap:14px')}>
            <PhoneLink href={phone.href} display={phone.display} className="btn btn-hero-cta t-btn">
              {L.callNowPrefix}<PhoneNumber value={phone.display} />
            </PhoneLink>
            <ScheduleTrigger as="button" className="btn btn-outline t-btn" label={SH.finalSchedule} />
          </div>
        </div>
      </section>
    </CityHubRoot>
  );
}
