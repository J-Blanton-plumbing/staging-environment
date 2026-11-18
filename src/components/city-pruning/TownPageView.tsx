import type { CSSProperties, ReactNode } from 'react';
import { PhoneLink, PhoneNumber } from '@/components/PhoneLink';
import ScheduleTrigger from '@/components/schedule/ScheduleTrigger';
import CityHubRoot from '@/components/city-hubs/CityHubRoot';
import type { CityHubRender, CityHubShared } from '@/lib/city-hub-cms/model';
import { fillPattern } from '@/lib/city-hub-cms/model';
import { faqPreviewFromAnswer } from '@/lib/city-hub-cms/model';
import { faqPageJsonLd, hubBreadcrumbJsonLd, ldJson } from '@/lib/schema/city-pages';
import { renderRatingField, type RatingTokenContext } from '@/lib/cms/tokens';
import type { TownPage } from '@/lib/city-pruning/towns';
import { FIN2, NDC2 } from '@/lib/city-pruning/towns';
import { pilotServiceHref } from '@/lib/city-pruning/phase1';
// Plain server markup: CityHubRoot (on its `.pruned` root) links pruning.css and wires the carousel and
// the town search — no new client component on the [city] route, so every other city page keeps its chunks.
import SearchBox from './SearchBox';
import { Avatar, Badge24, CheckCircle, GoogleG, NdcCheck, PhoneIcon, PinIcon, ShieldIcon } from './icons';

/**
 * Brief 229 (Track B) — a Tier 3 TOWN PAGE (City Pruning Phase 1 Pilot): the package's
 * `Tier 3 - Town Page (Wilmette)/index.html` v4, section for section, with the town's copy from its MD.
 *
 *   1 Hero (crumbs Locations / Illinois / {Town}) · 2 Trust stripe · 3 Services carousel + the red
 *   "Explore all our plumbing services" dropdown (the Nov 13 rule — every link goes to the HUB's page) ·
 *   4 "Plumbers Near You in {Town}" (the town map, no JBP pin; the hub's address card; the nearby
 *   communities panel) · 5 Financing (shared sections v2) · 6 Why Us · 7 Video · 8 Reviews · 9 FAQ ·
 *   10 No Drip Club (shared sections v2) · 11 Final CTA.
 *
 * What changed on the way in: the prototype's own header/drawer/footer/banner and its `noindex` are
 * gone (the live shell supplies the chrome; the page is indexable); every phone renders through
 * PhoneLink so WhatConverts can swap it; "Schedule" is the site's schedule-popup trigger; the carousel
 * and the town search run as client components (an inline <script> would not run after a client-side
 * navigation). Structured data (README §2): Service (provider = the hub's `#office` @id only) +
 * BreadcrumbList + FAQPage (derived from the visible FAQ) + VideoObject. NO Plumber with an address and
 * NO AggregateRating — the reviews and the rating belong to the hub's Google profile.
 */

export interface TownPhone {
  href: string;
  display: string;
}

const SITE = 'https://jblantonplumbing.com';
const YT_WATCH = 'https://www.youtube.com/watch?v=';
const YT_EMBED = 'https://www.youtube.com/embed/';

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

/** `[label](href)` → <a>. An external link (the MDs' research citations) opens in a new tab. */
function Rich({ text, linkStyle }: { text: string; linkStyle?: CSSProperties }) {
  const parts: ReactNode[] = [];
  const re = /\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const external = /^https?:\/\//.test(m[2]);
    parts.push(
      external ? (
        <a key={m.index} href={m[2]} rel="noopener" style={linkStyle} target="_blank">
          {m[1]}
        </a>
      ) : (
        <a key={m.index} href={m[2]} style={linkStyle}>
          {m[1]}
        </a>
      )
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

/** "Learn more about …" phrase → the service slug the card's href names. */
const slugOf = (href: string) => href.split('/').filter(Boolean)[1] ?? '';

const NDC_LINK_STYLE = s('color:#F9F3EC;text-decoration:underline;text-underline-offset:3px');

export default function TownPageView({
  slug,
  town,
  hub,
  shared: SH,
  phone,
  ratings,
}: {
  slug: string;
  town: TownPage;
  /** The town's hub as it renders (its card photos and trust stripe). */
  hub: CityHubRender;
  shared: CityHubShared;
  phone: TownPhone;
  /** The company total only — a town page never shows (or marks up) the hub office's own numbers. */
  ratings: RatingTokenContext;
}) {
  const name = town.town;
  const hubSlug = town.hubUrl.replace(/^\//, '');
  const pageUrl = `${SITE}/${slug}`;
  const callNow = (
    <PhoneLink href={phone.href} display={phone.display} className="btn btn-hero-cta t-btn">
      <PhoneIcon />
      {SH.labels.callNow}
    </PhoneLink>
  );

  // Card photos: the hub's own card photo for the same service page (the Brief 227 rule).
  const hubCards = [
    ...(hub.services.featured ? [{ href: hub.services.featured.href, image: hub.services.featured.image }] : []),
    ...(hub.services.list ?? []).map((r) => ({ href: r.href, image: r.image })),
    ...hub.services.cards.map((c) => ({ href: c.href, image: c.image })),
  ];
  const photoFor = (href: string) => hubCards.find((c) => c.href === href && c.image?.src)?.image ?? null;

  const company = { office: null, company: ratings.company };
  const ratingValue = renderRatingField('{{company_rating}}', company);
  const ratingSub = renderRatingField('{{company_review_count}} Google reviews across all locations', company);
  const ratingIntro = renderRatingField('{{company_rating}} stars from {{company_review_count}} Google reviews across all locations.', company);
  const trust = hub.trust.map((t) => renderRatingField(t, company, hub.ratingFallbacks)).filter((t) => t.trim() !== '');

  const crumbs = [
    { label: 'Locations', href: '/locations' },
    { label: 'Illinois', href: '/locations/illinois' },
  ];
  const benefits = SH.ndc.benefits.filter((b) => b !== NDC2.promoted[town.ndc.h2]);
  const ndcBody = town.ndc.body.replace('No Drip Club', `[No Drip Club](${NDC2.href})`);
  const total = SH.stripe.reduce((n, g) => n + g.items.length, 0);
  const smallPanel = town.office.communities.length < 12;
  const [r1, ...rest] = town.reviews.items;

  // ── Structured data ─────────────────────────────────────────────────────────────────────────────
  const serviceLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: `Plumbing Services in ${name}, IL`,
    serviceType: 'Plumbing',
    url: pageUrl,
    areaServed: { '@type': 'City', name: `${name}, IL` },
    provider: { '@id': `${SITE}/${hubSlug}#office` },
  };
  const breadcrumbLd = hubBreadcrumbJsonLd(crumbs, name, pageUrl);
  const faqLd = faqPageJsonLd(town.faq);
  const videoLd = {
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
  const mapSrc = `https://www.google.com/maps?q=${encodeURIComponent(`${name}, IL`).replace(/%20/g, '+')}&z=13&output=embed`;
  const van = SH.vanPhoto;

  return (
    <CityHubRoot className={`city-hub town-page town-page--${slug} pruned`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={ldJson(serviceLd)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={ldJson(breadcrumbLd)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={ldJson(faqLd)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={ldJson(videoLd)} />

      {/* 1. HERO */}
      <section className="hub-hero hub-hero--photo">
        <picture>
          <source media="(max-width:900px)" srcSet={van.mobile} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={van.alt}
            className="hero-photo"
            fetchPriority="high"
            height={van.height}
            sizes="(max-width:900px) 100vw, 62vw"
            src={van.src}
            srcSet={van.src1100 ? `${van.src1100} 1100w, ${van.src} ${van.width}w` : undefined}
            width={van.width}
          />
        </picture>
        <div className="hub-hero-in">
          <nav aria-label="Breadcrumb">
            <ol className="t2-crumbs pv-in" style={s('--i:0')}>
              {crumbs.map((c) => (
                <li key={c.href}>
                  <a href={c.href}>{c.label}</a>
                </li>
              ))}
              <li aria-current="page">{name}</li>
            </ol>
          </nav>
          <span className="t-eyebrow pv-in" style={s('--i:0;color:#F9F3EC')}>{town.hero.eyebrow}</span>
          <h1 className="t-h1 hub-h1 pv-in" style={s('--i:1;color:#F9F3EC;margin:14px 0 16px')}>{town.hero.h1}</h1>
          <p className="t-body pv-in" style={s('--i:2;color:#F9F3EC;margin:0 0 26px;max-width:56ch')}>{town.hero.intro}</p>
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
          {trust.map((t) => (
            <li key={t}>
              <CheckCircle />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* 3. SERVICES CAROUSEL */}
      <section className="sec t3s" id="services" style={s('background:#F9F3EC')}>
        <div className="wrap">
          <div style={s('max-width:780px')}>
            <span className="t-eyebrow" style={s('color:#BC0E0E')}>{town.services.eyebrow}</span>
            <h2 className="hub-h2 t-h2" style={s('margin:12px 0 18px')}>{town.services.h2}</h2>
            <p className="t-body pv-mute" style={s('margin:0')}>{town.services.intro}</p>
          </div>
          <div aria-label={`Plumbing services in ${name}`} aria-roledescription="carousel" className="t3d" role="region">
            <div className="t3d-bar">
              <ul className="t3d-tags">
                {town.services.cards.map((c, i) => (
                  <li key={c.href}>
                    <a className={i === 0 ? 't3d-tag is-on' : 't3d-tag'} data-i={i} href={`#svc-${slugOf(c.href)}`}>
                      {c.tag}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div className="t3d-stage">
              <div className="t3d-arrows">
                <button aria-label="Previous service" className="t3d-arr" data-t3d-prev="" type="button">
                  <svg aria-hidden="true" fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="20">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                </button>
                <button aria-label="Next service" className="t3d-arr" data-t3d-next="" type="button">
                  <svg aria-hidden="true" fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="20">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              <div className="t3d-track" data-t3d-track="">
                {town.services.cards.map((c, i) => {
                  const img = photoFor(c.href);
                  const n = town.services.cards.length;
                  return (
                    <article aria-label={`${i + 1} of ${n}`} aria-roledescription="slide" className="t3d-card" id={`svc-${slugOf(c.href)}`} key={c.href}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img alt={img?.alt ?? ''} className="t3-img" height={500} loading="lazy" src={img?.src ?? van.src} width={800} />
                      <div className="t3d-txt">
                        <span className="t-eyebrow t3d-n">{`${String(i + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}`}</span>
                        <h3 className="t3d-h">{c.h3}</h3>
                        <p className="t-body pv-mute t3d-p">
                          <Rich text={c.paragraph} />
                        </p>
                        <a className="svc-cta t3d-cta" href={c.href}>
                          {`${c.cta} `}<span aria-hidden="true">→</span>
                        </a>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>

          <details className="svc-dir t3-hub">
            <summary className="svc-dir-head">
              <span className="svc-dir-t">{SH.stripeTitle}</span>
              <span className="svc-dir-meta">
                <span className="svc-dir-n">{fillPattern(SH.patterns.stripeCount, { n: total, city: name })}</span>
                <span aria-hidden="true" className="svc-dir-arrow">→</span>
              </span>
            </summary>
            <nav aria-label={fillPattern(SH.patterns.directoryAria, { city: name })}>
              <div className="svc-dir-grid">
                {SH.stripe.map(({ group, items }) => (
                  <details className="svc-grp" key={group} open>
                    <summary>
                      <span className="svc-grp-t">
                        {group}
                        <span className="svc-grp-n">({items.length})</span>
                      </span>
                      <span aria-hidden="true" className="svc-grp-i">+</span>
                    </summary>
                    <ul>
                      {items.map(({ label, slug: svc }) => (
                        <li key={svc}>
                          <a href={pilotServiceHref(hubSlug, svc)}>{label}</a>
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

      {/* 4. PLUMBERS NEAR YOU (map band + hub office card + nearby communities) */}
      <section className="sec" id="office" style={s('background:#F1E8DC')}>
        <div className="wrap">
          <div className="cc-band">
            <iframe allowFullScreen className="cc-map" loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={mapSrc} title={`Map of ${name}, IL`} />
            <div className="cc-card">
              <span className="t-eyebrow" style={s('color:#BC0E0E')}>{town.office.eyebrow}</span>
              <h2 className="hub-h2 t-h2" style={s('margin:12px 0 18px')}>{town.office.h2}</h2>
              <p className="t-body pv-mute" style={s('margin:0 0 20px')}>{town.office.body}</p>
              <div className="hp-addr">
                <PinIcon />
                <div>
                  <strong>{town.office.addressName}</strong>
                  <span className="t-body-sm pv-mute">{town.office.address}</span>
                </div>
              </div>
              <div className="hp-addr cc-license">
                <ShieldIcon />
                <div>
                  <strong>{town.office.license}</strong>
                </div>
              </div>
              <div className="hero-btns">
                {callNow}
                <ScheduleTrigger as="button" className="btn btn-outline t-btn" label={SH.officeSchedule} />
              </div>
            </div>
          </div>
          <div className="cb-panel" data-phone-href={phone.href} data-state-name="Illinois" data-state-url="/locations/illinois" id="service-areas">
            <div className="cb-top">
              <div>
                <h3 className="t-h4" style={s('margin:0')}>{town.office.panelHeading}</h3>
              </div>
              {smallPanel ? null : <SearchBox />}
            </div>
            <ul className={smallPanel ? 'cb-list is-short' : 'cb-list'} data-cb-list="">
              {town.office.communities.map((c) => (
                <li key={c.label}>{c.href ? <a href={c.href}>{c.label}</a> : c.label}</li>
              ))}
            </ul>
            <p aria-live="polite" className="t-body-sm cb-empty" data-cb-empty="" hidden />
            <p className="t-body-sm pv-mute cb-foot">{town.office.closing}</p>
          </div>
        </div>
      </section>

      {/* 5. FINANCING (shared sections v2) */}
      <section className="fin2">
        <div className="fin2-in">
          <p className="fin2-stat">
            <small>{FIN2.labelTop}</small>
            <span className="fin2-num">{FIN2.labelValue}</span>
          </p>
          <div className="fin2-copy">
            <span className="t-eyebrow fin2-eyebrow">{FIN2.eyebrow}</span>
            <h2 className="t-h2 fin2-h">
              <span className="fin2-h-d">{FIN2.h2Desktop}</span>
              <span className="fin2-h-m">{FIN2.h2Mobile}</span>
            </h2>
            <p className="fin2-body">{FIN2.body}</p>
            <div className="fin2-row">
              <PhoneLink href={phone.href} display={phone.display} className="btn btn-onred t-btn hub-fin-cta">
                {FIN2.cta}
              </PhoneLink>
              <p className="fin2-fine">{FIN2.fine}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. WHY US */}
      <section className="sec" id="why-us" style={s('background:#F9F3EC')}>
        <div className="wrap hp-why">
          <div>
            <span className="t-eyebrow" style={s('color:#BC0E0E')}>{SH.why.eyebrow}</span>
            <h2 className="hub-h2 t-h2" style={s('margin:12px 0 18px')}>{town.why.h2}</h2>
            <p className="t-body pv-mute" style={s('margin:0 0 32px')}>{town.why.intro}</p>
            <div className="hp-why-list">
              {town.why.items.map((w) => (
                <div className="hp-why-item" key={w.h3}>
                  <h3 className="t-h4" style={s('margin:0 0 8px')}>{w.h3}</h3>
                  <p className="t-body-sm pv-mute" style={s('margin:0')}>
                    <Rich text={w.body} />
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

      {/* 7. VIDEO */}
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

      {/* 8. REVIEWS (hub reviews; the rating is the company total, never shown as the town's) */}
      <section className="sec" style={s('background:#F9F3EC')}>
        <div className="wrap">
          <div className="hub-rev-head">
            <div style={s('max-width:780px')}>
              <span className="t-eyebrow" style={s('color:#BC0E0E')}>What Our Customers Say</span>
              <h2 className="hub-h2 t-h2" style={s('margin:12px 0 18px')}>{town.reviews.h2}</h2>
              {ratingIntro ? <p className="t-body pv-mute" style={s('margin:0 0 40px')}>{ratingIntro}</p> : null}
            </div>
            <aside aria-label={SH.reviewsProofLabel} className="hub-proof">
              {ratingValue ? (
                <div className="hub-proof-row">
                  <GoogleG />
                  <div>
                    <div className="hub-proof-score">
                      <strong>{ratingValue}</strong>
                      <span aria-label={`${ratingValue} out of 5 stars`} className="pv-stars" role="img">★★★★★</span>
                    </div>
                    <span className="hub-proof-sub">{ratingSub}</span>
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
              {r1 ? (
                <figure className="hub-quote pv-reveal" style={s('--i:0')}>
                  <div aria-label={SH.labels.reviewStars} className="pv-stars" role="img">★★★★★</div>
                  <blockquote>{`“${r1.text}”`}</blockquote>
                  <figcaption>
                    <div className="review-author">
                      <Avatar />
                      <div>
                        <strong className="t-label" style={s('font-size:14px')}>{r1.name}</strong>
                        <div className="t-caption pv-cap">{SH.verified}</div>
                      </div>
                    </div>
                  </figcaption>
                </figure>
              ) : null}
              <div className="hp-rev-ctas">
                {callNow}
                <ScheduleTrigger as="button" className="btn btn-outline t-btn" label={SH.officeSchedule} />
              </div>
            </div>
            <div className="hub-side">
              {rest.map((r, i) => (
                <div className="hub-rev pv-reveal" key={r.name} style={s(`--i:${i + 1}`)}>
                  <div aria-label={SH.labels.reviewStars} className="pv-stars" role="img">★★★★★</div>
                  <p className="t-body-sm" style={s('margin:0 0 14px')}>{`“${r.text}”`}</p>
                  <div className="review-author">
                    <Avatar />
                    <div>
                      <strong className="t-label" style={s('font-size:14px')}>{r.name}</strong>
                      <div className="t-caption pv-cap">{SH.verified}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 9. FAQ */}
      <section className="sec" style={s('background:#F1E8DC')}>
        <div className="wrap hub-split">
          <div className="hub-sticky">
            <span className="t-eyebrow" style={s('color:#BC0E0E')}>{SH.faqEyebrow}</span>
            <h2 className="hub-h2 t-h2" style={s('margin:12px 0 0')}>{`Plumbing Questions From ${name} Homeowners`}</h2>
          </div>
          <div style={s('display:flex;flex-direction:column;gap:12px')}>
            {town.faq.map((f) => (
              <div className="faq-item2" key={f.q}>
                <button aria-expanded="false" className="faq-q" type="button">
                  <span className="faq-q-text">{f.q}</span>
                  <span aria-hidden="true" className="faq-plus">+</span>
                </button>
                <div className="faq-panel">
                  <p className="faq-preview">{faqPreviewFromAnswer(f.a)}</p>
                  <p className="faq-full">
                    <Rich text={f.a} />
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 10. NO DRIP CLUB (shared sections v2) */}
      <section className="ndc ndc--band ndc--lockup" id="no-drip-club">
        <div className="wrap">
          <div className="ndc-grid">
            <div className="ndc-text">
              <p className="t-eyebrow ndc-eyebrow">
                <span className="ndc-eb-d">{NDC2.eyebrowDesktop}</span>
                <span className="ndc-eb-m">{NDC2.eyebrowMobile}</span>
              </p>
              <h2 className="t-h2 ndc-h2">{town.ndc.h2}</h2>
              <p className="ndc-body">
                <Rich linkStyle={NDC_LINK_STYLE} text={ndcBody} />
              </p>
              <ul className="ndc-list">
                {benefits.map((b) => (
                  <li key={b}>
                    <NdcCheck />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <a className="btn btn-primary t-btn ndc-btn" href={NDC2.href}>{NDC2.cta}</a>
            </div>
            <div className="ndc-lockup">
              <p className="ndc-mark">
                <span>No</span> <span>Drip</span> <span>Club</span>
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="" className="ndc-lockup-jay" height={1604} loading="lazy" src="/images/hanover-park/j-ndc.webp" width={1180} />
            </div>
          </div>
        </div>
      </section>

      {/* 11. FINAL CTA */}
      <section className="sec final-cta" id="book">
        <div className="wrap hub-final">
          <div>
            <span className="t-eyebrow" style={s('color:#BC0E0E')}>Ready When You Are</span>
            <h2 className="hub-h2 t-h2" style={s('margin:12px 0 16px')}>{town.final.h2}</h2>
            <p className="t-body pv-mute" style={s('margin:0')}>{town.final.body}</p>
          </div>
          <div className="hub-final-btns" style={s('display:flex;flex-wrap:wrap;gap:14px')}>
            <PhoneLink href={phone.href} display={phone.display} className="btn btn-hero-cta t-btn">
              {SH.labels.callNowPrefix}<PhoneNumber value={phone.display} />
            </PhoneLink>
            <ScheduleTrigger as="button" className="btn btn-outline t-btn" label={SH.finalSchedule} />
          </div>
        </div>
      </section>
    </CityHubRoot>
  );
}

