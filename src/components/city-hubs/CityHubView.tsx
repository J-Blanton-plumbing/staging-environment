import { Fragment, type CSSProperties, type ReactNode } from 'react';
import { PhoneLink, PhoneNumber } from '@/components/PhoneLink';
import ScheduleTrigger from '@/components/schedule/ScheduleTrigger';
import type { CityHubContent } from '@/lib/content/city-hubs/types';
import { CITY_HUB_SHARED as SH } from '@/lib/content/city-hubs/shared';
import CityHubRoot from './CityHubRoot';

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
 *   • Structured data: the VideoObject only. No FAQPage (Brief 164) and no page-level Plumber
 *     node (the footer's per-office PlumbingBusiness graph covers it) — Marketing, 2026-10-12.
 *   • `noindex` is gone (the package was a review prototype).
 * Copy lives in src/lib/content/city-hubs — this file holds none.
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
    parts.push(
      <a key={m.index} href={m[2]} style={linkStyle}>
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

const STARS = (
  <div aria-label="5 out of 5 stars" className="pv-stars" role="img">
    ★★★★★
  </div>
);

function ReviewCaption({ name, url }: { name: string; url: string | null }) {
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

const NDC_LINK_STYLE = s('color:#F9F3EC;text-decoration:underline;text-underline-offset:3px');

export default function CityHubView({ hub, phone }: { hub: CityHubContent; phone: CityHubPhone }) {
  const callNow = (
    <PhoneLink href={phone.href} display={phone.display} className="btn btn-hero-cta t-btn">
      <PhoneIcon />
      Call Now
    </PhoneLink>
  );
  const mapSrc = `https://maps.google.com/maps?hl=en&q=${encodeURIComponent(hub.office.address)}&z=15&ie=UTF8&output=embed`;
  const camera = `/${hub.slug}/video-camera-sewer-inspections`;
  const total = SH.stripe.reduce((n, [, items]) => n + items.length, 0);
  const [r1, r2, r3] = hub.reviews.items;

  return (
    <CityHubRoot className={`city-hub city-hub--${hub.slug}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SH.videoJsonLd).replace(/</g, '\\u003c') }} />

      {/* 1. HERO */}
      <section className={`hub-hero hub-hero--photo${hub.hero.variant === 'columbus' ? ' hub-hero--columbus' : ''}`}>
        {hub.hero.variant === 'columbus' ? (
          <picture>
            <source media="(max-width:900px)" srcSet="/images/city-hubs/jbp-columbus-skyline-team-mobile.webp" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="Two J. Blanton Plumbing team members in red company polos in front of the downtown Columbus skyline"
              className="hero-photo"
              fetchPriority="high"
              height={1334}
              sizes="(max-width:900px) 100vw, 62vw"
              src="/images/city-hubs/jbp-columbus-skyline-team-2000.webp"
              srcSet="/images/city-hubs/jbp-columbus-skyline-team-1100.webp 1100w, /images/city-hubs/jbp-columbus-skyline-team-2000.webp 2000w"
              width={2000}
            />
          </picture>
        ) : (
          <picture>
            <source media="(max-width:900px)" srcSet="/images/city-hubs/jbp-van-residential-street-mobile.webp" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="J. Blanton Plumbing van parked on a residential street in front of a two-story home"
              className="hero-photo"
              fetchPriority="high"
              height={1189}
              sizes="(max-width:900px) 100vw, 62vw"
              src="/images/city-hubs/jbp-van-residential-street-2000.webp"
              srcSet="/images/city-hubs/jbp-van-residential-street-1100.webp 1100w, /images/city-hubs/jbp-van-residential-street-2000.webp 2000w"
              width={2000}
            />
          </picture>
        )}
        <div className="hub-hero-in">
          <span className="t-eyebrow pv-in" style={s('--i:0;color:#F9F3EC')}>{hub.hero.eyebrow}</span>
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
          {hub.trust.map((t) => (
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
          <div className="hub-grid hub-grid--flat">
            {hub.services.cards.map((c) => (
              <article className="hub-card" key={c.href}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt={c.image.alt} className="hub-card-img" height={500} loading="lazy" src={c.image.src} width={800} />
                <h3 className="svc-title" style={s('margin:16px 0 8px')}>
                  <a href={c.href}>{c.title}</a>
                </h3>
                <p className="svc-desc" style={s('margin:0 0 16px')}>{c.desc}</p>
                <a aria-label={`Learn more about ${c.title} in ${hub.name}`} className="svc-cta" href={c.href}>
                  Learn More <span aria-hidden="true">→</span>
                </a>
              </article>
            ))}
          </div>
          <details className="svc-dir">
            <summary className="svc-dir-head">
              <span className="svc-dir-t">{SH.stripeTitle}</span>
              <span className="svc-dir-meta">
                <span className="svc-dir-n">{`${total} services in ${hub.name}`}</span>
                <span aria-hidden="true" className="svc-dir-arrow">→</span>
              </span>
            </summary>
            <nav aria-label={`All plumbing services in ${hub.name}`}>
              <div className="svc-dir-grid">
                {SH.stripe.map(([group, items]) => (
                  <details className="svc-grp" open key={group}>
                    <summary>
                      <span className="svc-grp-t">
                        {group}
                        <span className="svc-grp-n">({items.length})</span>
                      </span>
                      <span aria-hidden="true" className="svc-grp-i">+</span>
                    </summary>
                    <ul>
                      {items.map(([label, slug]) => (
                        <li key={slug}>
                          <a href={`/${hub.slug}/${slug}`}>{label}</a>
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

      {/* 4. OFFICE */}
      <section className="sec" id="office" style={s('background:#F1E8DC')}>
        <div className="wrap hp-office">
          <div className="hp-office-map">
            <iframe allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={mapSrc} title={`Google Map of our ${hub.name} office`} />
          </div>
          <div>
            <span className="t-eyebrow" style={s('color:#BC0E0E')}>{hub.office.eyebrow}</span>
            <h2 className="hub-h2 t-h2" style={s('margin:12px 0 18px')}>{hub.office.h2}</h2>
            <p className="t-body pv-mute" style={s('margin:0 0 24px')}>{hub.office.body}</p>
            <div className="hp-addr">
              <PinIcon />
              <div>
                <strong>{`J. Blanton Plumbing, ${hub.name}`}</strong>
                <span className="t-body-sm pv-mute">{hub.office.address}</span>
              </div>
            </div>
            <div className="hero-btns">
              {callNow}
              <ScheduleTrigger as="button" className="btn btn-outline t-btn" label={SH.officeSchedule} />
            </div>
            <div className="hp-areas">
              <h3 className="t-h4" style={s('margin:0 0 10px')}>{hub.office.areasH3}</h3>
              <p className="t-body-sm pv-mute" style={s('margin:0')}>
                {hub.office.areas.map((a, i) => (
                  <Fragment key={a.href}>
                    <a href={a.href}>{a.label}</a>
                    {i < hub.office.areas.length - 1 ? ', ' : ' and '}
                  </Fragment>
                ))}
                <a href={hub.office.more}>more</a>.
              </p>
            </div>
          </div>
        </div>
      </section>

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
          <div className="hub-fin-copy">
            <span className="t-eyebrow" style={s('color:#F9F3EC')}>{SH.fin.eyebrow}</span>
            <h2 className="t-h2" style={s('color:#F9F3EC;margin:12px 0 10px;max-width:440px')}>{SH.fin.h2}</h2>
            <p className="t-body-sm" style={s('color:#F9F3EC;margin:0 0 8px;max-width:440px')}>{SH.fin.body}</p>
            <p className="t-body-sm" style={s('color:#F9F3EC;opacity:.75;margin:0;max-width:440px;font-size:.8em')}>{SH.fin.disclaimer}</p>
          </div>
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
            <h2 className="hub-h2 t-h2" style={s('margin:12px 0 18px')}>{`Why ${hub.name} Homeowners Choose J. Blanton`}</h2>
            <p className="t-body pv-mute" style={s('margin:0 0 32px')}>{SH.why.intro}</p>
            <div className="hp-why-list">
              {SH.why.items.map((w) => (
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
                src={SH.video.embed}
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
              <p className="t-body pv-mute" style={s('margin:0 0 40px')}>{hub.reviews.intro}</p>
            </div>
            <aside aria-label={SH.reviewsProofLabel} className="hub-proof">
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
                    <ReviewCaption name={r1.name} url={r1.url} />
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
                    <ReviewCaption name={r.name} url={r.url} />
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
              <p className="t-eyebrow ndc-eyebrow">{SH.ndc.eyebrow}</p>
              <h2 className="t-h2 ndc-h2">{SH.ndc.h2}</h2>
              <p className="ndc-body">
                <Rich text={hub.ndc} linkStyle={NDC_LINK_STYLE} />
              </p>
              <ul className="ndc-list">
                {SH.ndc.benefits.map((b) => (
                  <li key={b}>
                    <NdcCheck />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <a className="btn btn-primary t-btn ndc-btn" href={SH.ndc.href}>{SH.ndc.cta}</a>
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
              Call Now: <PhoneNumber value={phone.display} />
            </PhoneLink>
            <ScheduleTrigger as="button" className="btn btn-outline t-btn" label={SH.finalSchedule} />
          </div>
        </div>
      </section>
    </CityHubRoot>
  );
}
