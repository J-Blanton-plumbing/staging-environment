import type { CSSProperties, ReactNode } from 'react';
import { PhoneLink, PhoneNumber } from '@/components/PhoneLink';
import ScheduleTrigger from '@/components/schedule/ScheduleTrigger';
import { SITE } from '@/lib/site';
import { breadcrumbListJsonLd } from '@/lib/schema/breadcrumb-list';
import { faqPageJsonLd, schemaPhone } from '@/lib/schema/city-pages';
import type { hubPlumberJsonLd } from '@/lib/city-hub-cms/model';
import type { CityServiceV2Page, CsBlock, Rich } from '@/lib/content/city-services-v2';
import { CsIcon } from './icons';
import CityServiceV2Root from './CityServiceV2Root';

/**
 * City Service Pages V2 (Brief 209) — ALL the markup of one V2 `/{city}/{service}` page
 * (Northbrook, Columbus, Tinley Park, Joliet, Naperville × 29 services).
 *
 * The approved Brief 209 package (the Highland Park service-page template, `aside.ss-rail`
 * variant) element for element: same section order, classes and inline styles. What changed on the
 * way in, and nothing else:
 *   • The package's own header, drawer and footer are gone — the live shell (Navbar, Footer,
 *     schedule modal, analytics, call tracking) supplies them.
 *   • Every phone position renders through PhoneLink/PhoneNumber with the Global Settings phone
 *     (Columbus: the Central Ohio phone, Brief 192), so WhatConverts can swap it.
 *   • "Schedule a Service" is the site's schedule-popup trigger (Brief 169).
 *   • Links are production paths (`/{city}/{service}#anchor`, `/{city}`), not the package's
 *     relative files.
 *   • Structured data: Service + BreadcrumbList, then (Brief 216, Marketing 2026-10-21) ONE FAQPage
 *     derived at render from the page's visible FAQ (src/lib/schema/city-pages.ts). FAQPage is
 *     allowed on the City Hub + City Service V2 templates only; every other page type stays free of it.
 *     Brief 217 (one location per city page): + the city hub's office node (the same Plumber node,
 *     same `@id`, the hub emits), with the Service `provider` pointing at it; the footer's sitewide
 *     PlumbingBusiness graph is off on these pages (SiteShell, by template).
 *   • `noindex` is gone (the package was a review prototype).
 * Copy lives in src/lib/content/city-services-v2 — this file holds none beyond the template's
 * fixed labels (rail, quick links, sticky bar, NDC), which are identical on all 145 pages.
 */

export interface CsPhone {
  href: string;
  display: string;
}

/** Brief 217: the hub's office node (the Brief 216 Plumber shape). */
type OfficeNode = NonNullable<ReturnType<typeof hubPlumberJsonLd>>;

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

const LINK_RE = /\[([^\]]+)\]\(([^)\s]+)\)/g;

/** `[label](/href)` → <a>; everything else is text. The only markup the content carries. */
function R({ text }: { text: Rich }) {
  const parts: ReactNode[] = [];
  const re = new RegExp(LINK_RE.source, 'g');
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const at = m.index;
    if (at > last) parts.push(text.slice(last, at));
    parts.push(
      <a key={at} href={m[2]}>
        {m[1]}
      </a>
    );
    last = at + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}
const plain = (text: Rich) => text.replace(LINK_RE, '$1');

/* ── Template constants (identical on every approved page) ─────────────────────────────────── */
const IMG = '/images/city-services-v2/';
const QUICK_LINKS = [
  { href: '/emergency-plumbing', label: 'Emergency Plumbing' },
  { href: '/knowledge-hub', label: 'Knowledge Hub' },
  { href: '/financing', label: 'Financing' },
  { href: '/help-and-support', label: 'Help & Support' },
];
const NDC_BENEFITS = [
  'Two Free Professional Maintenance Visits per Year',
  '10% Discount on All General Plumbing & Sewer Services',
  '5-Year Parts and Labor Warranty on Approved Projects',
  'VIP Priority Scheduling Status (Skip the Queue)',
];
const NDC_BODY = {
  general:
    'Most plumbing problems start small. The No Drip Club brings a J. Blanton plumber to your home for regular maintenance, so small issues get caught before they turn into big repairs.',
  sewer:
    'Prevent catastrophes before they disrupt your life. The No Drip Club ensures your waste and sewer lines are monitored and serviced regularly by J. Blanton’s absolute best.',
};

const EB = ({ children }: { children: ReactNode }) => (
  <span className="t-eyebrow" style={s('color:var(--c-carmine)')}>
    {children}
  </span>
);
const H2 = ({ children }: { children: ReactNode }) => (
  <h2 className="t-h2" style={s('margin:12px 0 16px;max-width:66ch')}>
    {children}
  </h2>
);
const P = ({ margin, text }: { margin: string; text: Rich }) => (
  <p className="t-body-sm" style={s(`color:var(--c-slate);margin:${margin};max-width:66ch`)}>
    <R text={text} />
  </p>
);
const Head = ({ eyebrow, h2, children }: { eyebrow: string; h2: string; children?: ReactNode }) => (
  <div className="ss-head">
    <EB>{eyebrow}</EB>
    <h2 className="t-h2" style={s('margin:10px 0 0')}>
      {h2}
    </h2>
    {children}
  </div>
);
// eslint-disable-next-line @next/next/no-img-element
const BlockImg = ({ src, alt }: { src: string; alt: string }) => <img alt={alt} loading="lazy" src={src} style={s('width:100%;height:auto;display:block;border-radius:14px')} />;

function PhoneButton({ phone }: { phone: CsPhone }) {
  return (
    <PhoneLink href={phone.href} display={phone.display} className="btn btn-primary t-btn">
      <CsIcon name="phone20" />
      <PhoneNumber value={phone.display} />
    </PhoneLink>
  );
}

function Block({ b, phone }: { b: CsBlock; phone: CsPhone }) {
  switch (b.type) {
    case 'split': {
      const text = (
        <>
          <EB>{b.eyebrow}</EB>
          <H2>{b.h2}</H2>
          <P margin="0" text={b.body} />
        </>
      );
      return b.img ? (
        <div className="ss-split">
          <div>
            <BlockImg {...b.img} />
          </div>
          <div>{text}</div>
        </div>
      ) : (
        text
      );
    }
    case 'fold': {
      const text = (
        <>
          <EB>{b.eyebrow}</EB>
          <H2>{b.h2}</H2>
          {b.bodies.map((t, i) => (
            <P key={i} margin="0 0 14px" text={t} />
          ))}
        </>
      );
      return b.img ? (
        <div className="ss-split">
          <div>
            <BlockImg {...b.img} />
          </div>
          <div>{text}</div>
        </div>
      ) : (
        text
      );
    }
    case 'tiles':
      return (
        <>
          <EB>{b.eyebrow}</EB>
          <H2>{b.h2}</H2>
          <P margin="0 0 28px" text={b.intro} />
          <div className="csp-tiles" style={s(`display:grid;grid-template-columns:repeat(auto-fit,minmax(min(${b.minCol}px,100%),1fr));gap:24px`)}>
            {b.tiles.map((t) => (
              <div className="bento-tile" key={t.h3}>
                <h3 className="t-label" style={s('color:var(--c-carmine);margin:0 0 12px')}>
                  {t.h3}
                </h3>
                {t.bullets ? (
                  <ul style={s('margin:0;padding-left:18px;display:flex;flex-direction:column;gap:8px')}>
                    {t.bullets.map((x, i) => (
                      <li className="t-body-sm" key={i} style={s('color:var(--c-slate)')}>
                        <R text={x} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="t-body-sm" style={s('color:var(--c-slate);margin:0')}>
                    <R text={t.body ?? ''} />
                  </p>
                )}
              </div>
            ))}
          </div>
          {b.note != null && (
            <p className="t-body-sm" style={s('color:var(--c-midnight);font-weight:700;margin:24px 0 0;max-width:66ch')}>
              <R text={b.note} />
            </p>
          )}
        </>
      );
    case 'steps': {
      const items = b.steps.map((st) => (
        <div key={st.h3}>
          <h3 className="t-h4" style={s('margin:0 0 6px')}>
            {st.h3}
          </h3>
          <p className="t-body-sm" style={s('color:var(--c-slate);margin:0')}>
            <R text={st.body} />
          </p>
        </div>
      ));
      const head = (
        <>
          <EB>{b.eyebrow}</EB>
          <H2>{b.h2}</H2>
          <P margin="0 0 24px" text={b.intro} />
        </>
      );
      return b.img ? (
        <div className="ss-split rev">
          <div>
            {head}
            <div style={s('display:flex;flex-direction:column;gap:20px;margin-bottom:28px')}>{items}</div>
            <PhoneButton phone={phone} />
          </div>
          <div>
            <BlockImg {...b.img} />
          </div>
        </div>
      ) : (
        <>
          {head}
          <div style={s('display:grid;grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr));gap:20px;margin-bottom:28px')}>{items}</div>
          <PhoneButton phone={phone} />
        </>
      );
    }
    case 'local':
      return (
        <>
          <EB>{b.eyebrow}</EB>
          <H2>{b.h2}</H2>
          <p className="t-body" style={s('color:var(--c-slate);margin:0 0 28px;max-width:66ch')}>
            <R text={b.intro} />
          </p>
          <div style={s('display:flex;flex-direction:column;gap:24px;margin-bottom:28px')}>
            {b.items.map((it) => (
              <div key={it.h3}>
                <h3 className="t-h4" style={s('margin:0 0 8px')}>
                  {it.h3}
                </h3>
                <P margin="0" text={it.body} />
              </div>
            ))}
          </div>
          {b.proof && (
            <figure style={s('margin:0;background:#FDFAF6;border-left:5px solid var(--c-carmine);border-radius:10px;padding:18px 22px')}>
              <blockquote className="t-body-sm" style={s('margin:0 0 8px;color:var(--c-midnight)')}>
                &quot;{b.proof.quote}&quot;
              </blockquote>
              <figcaption className="t-caption" style={s('color:var(--c-slate)')}>
                {b.proof.name}, J. Blanton customer
              </figcaption>
            </figure>
          )}
        </>
      );
    case 'table':
      return (
        <>
          <EB>{b.eyebrow}</EB>
          <H2>{b.h2}</H2>
          <P margin="0 0 20px" text={b.intro} />
          <div>
            <table className="csp-table" style={s('width:100%;border-collapse:collapse')}>
              <thead>
                <tr>
                  {b.head.map((h, i) => (
                    <th className="t-label" key={i} style={s('text-align:left;padding:12px 14px;border-bottom:2px solid var(--c-carmine)')}>
                      <R text={h} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {b.rows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((c, ci) => (
                      <td
                        className="t-body-sm"
                        data-label={plain(b.head[ci] ?? '')}
                        key={ci}
                        style={s('padding:12px 14px;border-bottom:1px solid rgba(10,27,46,.12);vertical-align:top;color:var(--c-slate)')}
                      >
                        <R text={c} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {b.note != null && <P margin="16px 0 0" text={b.note} />}
        </>
      );
    case 'reviews':
      return (
        <>
          <Head eyebrow={b.eyebrow} h2={b.h2}>
            <p className="t-body-sm" style={s('color:var(--c-slate);margin:10px 0 0')}>
              {b.rating}
            </p>
          </Head>
          <div className="ss-revs">
            {b.reviews.map((r) => {
              const name = (
                <strong className="t-label" style={s('font-size:14px')}>
                  {r.name}
                </strong>
              );
              return (
                <div className="ss-rev" key={r.name}>
                  <div aria-label="5 out of 5 stars" className="pv-stars" role="img">
                    ★★★★★
                  </div>
                  <p className="t-body-sm" style={s('margin:0 0 14px')}>
                    &quot;{r.text}&quot;
                  </p>
                  <div className="review-author">
                    <span className="review-avatar">
                      <CsIcon name="avatar" />
                    </span>
                    <div>
                      {r.url ? (
                        <a href={r.url} rel="noreferrer" style={s('text-decoration:none;color:inherit')} target="_blank">
                          {name}
                        </a>
                      ) : (
                        name
                      )}
                      <div className="t-caption" style={s('color:var(--c-slate)')}>
                        Verified Customer
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      );
    case 'faq':
      return (
        <>
          <Head eyebrow={b.eyebrow} h2={b.h2} />
          <div style={s('display:flex;flex-direction:column;gap:12px')}>
            {b.items.map((f) => (
              <div className="faq-item2" key={f.q}>
                <button aria-expanded="false" className="faq-q" type="button">
                  <span className="faq-q-text">{f.q}</span>
                  <span aria-hidden="true" className="faq-plus">
                    +
                  </span>
                </button>
                <div className="faq-panel">
                  <p className="faq-preview">
                    <R text={f.preview} />
                  </p>
                  <p className="faq-full">
                    <R text={f.answer} />
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      );
    case 'ndc':
      return (
        <div className="ndc-grid">
          <div className="ndc-text">
            <p className="t-eyebrow ndc-eyebrow">Annual Protection Plan</p>
            <h2 className="t-h2 ndc-h2">
              <a href="/no-drip-club">Join the No Drip Club</a>
              {b.variant === 'sewer' ? ' for Year-Round Sewer Protection' : null}
            </h2>
            <p className="ndc-body">{NDC_BODY[b.variant]}</p>
            <ul className="ndc-list">
              {NDC_BENEFITS.map((x) => (
                <li key={x}>
                  <span className="ndc-check">
                    <CsIcon name="ndcCheck" />
                  </span>
                  <span>{x}</span>
                </li>
              ))}
            </ul>
            <a className="btn btn-primary t-btn ndc-btn" href="/no-drip-club">
              <CsIcon name="ndcBtn" />
              Learn More About the No Drip Club
            </a>
          </div>
          <div className="ndc-figure">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="No Drip Club mascot: an illustrated J. Blanton plumber holding a red pipe wrench"
              height={1604}
              loading="lazy"
              src={`${IMG}no-drip-club-mascot.webp`}
              width={1180}
            />
          </div>
        </div>
      );
    case 'services':
      return (
        <>
          <Head eyebrow={b.eyebrow} h2={b.h2} />
          <div className="ss-rows">
            {b.cards.map((c) => {
              // eslint-disable-next-line @next/next/no-img-element
              const img = <img alt={c.img.alt} className="pv-img ss-thumb" loading="lazy" src={c.img.src} />;
              return c.emergency ? (
                <article className="ss-row ss-row--emergency" key={c.href}>
                  {img}
                  <div>
                    <h3 className="svc-title">
                      <a href={c.href} style={s('color:inherit')}>
                        {c.title}
                      </a>
                    </h3>
                    <p className="svc-desc">
                      <R text={c.desc} />
                    </p>
                  </div>
                  <PhoneLink href={phone.href} display={phone.display} className="svc-cta-onred">
                    Call Now
                  </PhoneLink>
                </article>
              ) : (
                <article className="ss-row" key={c.href}>
                  {img}
                  <div>
                    <h3 className="svc-title">{c.title}</h3>
                    <p className="svc-desc">
                      <R text={c.desc} />
                    </p>
                  </div>
                  <a aria-label={`Learn More about ${c.title}`} className="svc-cta" href={c.href}>
                    Learn More <span aria-hidden="true">→</span>
                  </a>
                </article>
              );
            })}
          </div>
        </>
      );
    case 'final':
      return (
        <div style={s('max-width:620px;margin:0 auto;text-align:center')}>
          <EB>{b.eyebrow}</EB>
          <h2 className="t-h2" style={s('margin:12px 0 14px')}>
            {b.h2}
          </h2>
          <p className="t-body-sm pv-mute" style={s('margin:0 0 12px')}>
            <R text={b.body} />
          </p>
          <p className="t-body-sm pv-mute" style={s('margin:0 0 22px')}>
            <R text={b.communities} />
          </p>
          <div className="final-cta-row" style={s('display:flex;flex-wrap:wrap;gap:14px;justify-content:center')}>
            <PhoneLink href={phone.href} display={phone.display} className="btn btn-hero-cta t-btn">
              Call Now: <PhoneNumber value={phone.display} />
            </PhoneLink>
            <ScheduleTrigger as="button" className="btn btn-outline t-btn" label="Schedule a Service" />
          </div>
        </div>
      );
  }
}

export default function CityServiceV2View({
  page,
  cityName,
  phone,
  office = null,
}: {
  page: CityServiceV2Page;
  cityName: string;
  phone: CsPhone;
  /**
   * Brief 217 (Track C): the city hub's office node (`hubPlumberJsonLd` — built from the HUB's office
   * data, never stored per page). When set, the page emits it once, after its other JSON-LD, and the
   * Service `provider` becomes a reference to it (`{"@id": …#office}`), so the page carries exactly one
   * office node. Null (a hub without a GBP link, or no live hub) → the stored provider, as before.
   */
  office?: OfficeNode | null;
}) {
  const provider = office ? { '@id': office['@id'] } : { ...page.serviceSchema.provider, telephone: schemaPhone(phone.display) };
  const service = { ...page.serviceSchema, provider };
  const crumbs = breadcrumbListJsonLd(
    [
      { label: 'Home', href: '/' },
      { label: cityName, href: `/${page.city}` },
      { label: page.hero.crumb, href: `/${page.city}/${page.service}` },
    ],
    SITE.baseUrl
  );
  const ld = (o: unknown) => ({ __html: JSON.stringify(o).replace(/</g, '\\u003c') });
  // Brief 216: one FAQPage from the visible FAQ, after the existing JSON-LD (never stored).
  const faq = page.blocks.find((b): b is Extract<CsBlock, { type: 'faq' }> => b.type === 'faq');
  const faqLd = faq && faq.items.length ? faqPageJsonLd(faq.items.map((f) => ({ q: f.q, a: f.answer }))) : null;

  return (
    <CityServiceV2Root>
      <script type="application/ld+json" dangerouslySetInnerHTML={ld(service)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={ld(crumbs)} />
      {faqLd ? <script type="application/ld+json" dangerouslySetInnerHTML={ld(faqLd)} /> : null}
      {office ? <script type="application/ld+json" dangerouslySetInnerHTML={ld(office)} /> : null}

      <section className="ss-hero">
        <div className="hero-pattern" />
        <div className="ss-hero-in">
          <div className="ss-hero-copy">
            <nav aria-label="Breadcrumb" className="ss-crumb pv-in" style={s('--i:0')}>
              <a href={`/${page.city}`}>{cityName}</a>
              <span aria-hidden="true">/</span>
              <span>{page.hero.crumb}</span>
            </nav>
            <span className="t-eyebrow hero-eyebrow pv-in" style={s('--i:1')}>
              {page.hero.eyebrow}
            </span>
            <h1 className="t-h1 pv-in" style={s('--i:2;color:var(--c-cream);margin:0')}>
              {page.hero.h1}
            </h1>
            <p className="t-body pv-in" style={s('--i:3;color:var(--c-cream);margin:0;max-width:56ch')}>
              <R text={page.hero.sub} />
            </p>
            <div className="hero-cta pv-in" style={s('--i:4')}>
              <PhoneLink href={phone.href} display={phone.display} className="btn btn-hero-cta t-btn">
                <CsIcon name="phone20" />
                <PhoneNumber value={phone.display} />
              </PhoneLink>
              <span aria-label="24 hours, 7 days a week emergency service" className="badge24" role="img">
                <CsIcon name="badge24" />
              </span>
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt={page.hero.img.alt} className="ss-hero-img pv-in" src={page.hero.img.src} style={s('--i:3')} />
        </div>
      </section>

      <nav aria-label="Quick links" className="jbp-subnav">
        {QUICK_LINKS.map((l) => (
          <a href={l.href} key={l.href}>
            {l.label}
          </a>
        ))}
      </nav>

      <div className="ss-shell">
        <div className="ss-main">
          {page.blocks.map((b) => (
            <section className={b.cls} id={b.id} key={b.id} style={s(`--o:${b.order}`)}>
              <Block b={b} phone={phone} />
            </section>
          ))}
        </div>
        <aside aria-label="Contact and trust" className="ss-rail">
          <div className="ss-call">
            <h2 className="t-label" style={s('font-size:20px;margin:0')}>
              24/7 Emergency Service
            </h2>
            <p className="t-body-sm" style={s('margin:0;color:var(--c-cream)')}>
              Dispatched nights, weekends, and holidays.
            </p>
            <PhoneLink href={phone.href} display={phone.display} className="btn btn-hero-cta t-btn">
              <CsIcon name="phone20" />
              Call Now
            </PhoneLink>
          </div>
          <div className="ss-trust">
            {page.trust.map((t) => (
              <div className="ss-trust-item" key={t}>
                <CsIcon name="trust" />
                <span className="t-label">{t}</span>
              </div>
            ))}
          </div>
          <div className="ss-fin" style={s('--o:25')}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="J. Blanton Plumbing technician reviewing financing options with a homeowner couple at their kitchen table"
              src={`${IMG}financing-consultation-homeowners.webp`}
              style={s('width:calc(100% + 40px);height:140px;object-fit:cover;border-radius:14px 14px 0 0;margin:-20px -20px 16px -20px;display:block')}
            />
            <h2 className="t-h4">Fix It With Financing As Low As 0%</h2>
            <p className="t-body-sm">We&apos;ve partnered with trusted lenders, so you can get the service you need now and pay on your terms.</p>
            <p className="t-caption fin-note">Subject to credit approval. Rates and terms vary.</p>
            <PhoneLink href={phone.href} display={phone.display} className="btn btn-hero-cta t-btn">
              Ask about your options
            </PhoneLink>
          </div>
        </aside>
      </div>

      <div className="ss-sticky-cta">
        <div className="ss-sticky-cta-text">
          <strong>Need a Plumber?</strong>
          <span>Call our {cityName} Office</span>
        </div>
        <PhoneLink
          href={phone.href}
          display={phone.display}
          className="btn btn-hero-cta t-btn"
          aria-label={`Call J. Blanton Plumbing now, ${phone.display}`}
        >
          <CsIcon name="phone18" />
          Call Now
        </PhoneLink>
      </div>
    </CityServiceV2Root>
  );
}
