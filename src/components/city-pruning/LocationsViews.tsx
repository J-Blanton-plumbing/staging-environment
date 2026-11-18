import type { CSSProperties } from 'react';
import { PhoneLink, PhoneNumber } from '@/components/PhoneLink';
import ScheduleTrigger from '@/components/schedule/ScheduleTrigger';
import LocationsRoot from './LocationsRoot';
import { renderRatingField, type RatingTokenContext } from '@/lib/cms/tokens';
import { ldJson } from '@/lib/schema/city-pages';
import LocationsFinder, { type FinderOffice, type FinderTown } from './LocationsFinder';
import { AreasList, StateAreas, type AreaPlace, type StateCounty } from './AreasPanels';
import { Badge24, CheckCircle, PhoneIcon } from './icons';

/**
 * Brief 229 (Track D) — /locations, /locations/illinois and /locations/ohio, built from the package's
 * approved prototypes (Locations Index v1, State Page v1; their changes MDs). The prototypes' header,
 * drawer, footer and `noindex` are gone (the live shell supplies the chrome); every page-level phone
 * renders through PhoneLink (WhatConverts swaps it); the office phones in the finder are each listing's
 * own number and are left alone by call tracking. Data: src/lib/city-pruning/locations-data.json,
 * extracted from the prototypes with every link resolved through the link map (only the 13 pilot URLs
 * are new). Schema: BreadcrumbList + an ItemList of the offices as Plumber items (name, hub URL, phone,
 * address, geo) — the full Plumber stays on each hub.
 */

export interface LocPhone {
  href: string;
  display: string;
}

const SITE = 'https://jblantonplumbing.com';

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

const abs = (href: string) => (/^https?:/.test(href) ? href : `${SITE}${href}`);
const telE164 = (phone: string) => `+1-${phone.replace(/\D/g, '').slice(-10).replace(/^(\d{3})(\d{3})(\d{4})$/, '$1-$2-$3')}`;

function breadcrumbLd(steps: Array<{ name: string; href: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: steps.map((x, i) => ({ '@type': 'ListItem', position: i + 1, name: x.name, item: abs(x.href) })),
  };
}

function officesLd(name: string, offices: FinderOffice[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    itemListElement: offices.map((o, i) => {
      // The GBP address as the NAP sheet writes it: "street[, unit], City, ST 12345".
      const street = o.address.split(`, ${o.city}, ${o.st}`)[0];
      const zip = o.address.match(/(\d{5})$/)?.[1] ?? '';
      return {
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'Plumber',
          name: `J. Blanton Plumbing, Sewer & Drain - ${o.name}`,
          url: abs(o.url),
          telephone: telE164(o.phone),
          address: {
            '@type': 'PostalAddress',
            streetAddress: street,
            addressLocality: o.city,
            addressRegion: o.st,
            postalCode: zip,
            addressCountry: 'US',
          },
          geo: { '@type': 'GeoCoordinates', latitude: o.lat, longitude: o.lng },
        },
      };
    }),
  };
}

function Trust({ items }: { items: string[] }) {
  return (
    <section aria-label="Why homeowners trust J. Blanton" className="trust-stripe">
      <ul className="wrap trust-stripe-list">
        {items.filter((t) => t.trim() !== '').map((t) => (
          <li key={t}>
            <CheckCircle />
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function FinalCta({ phone }: { phone: LocPhone }) {
  return (
    <section className="sec final-cta" id="book">
      <div className="wrap hub-final">
        <div>
          <span className="t-eyebrow" style={s('color:#BC0E0E')}>Ready When You Are</span>
          <h2 className="hub-h2 t-h2" style={s('margin:12px 0 16px')}>Don’t See Your Town Listed?</h2>
          <p className="t-body pv-mute" style={s('margin:0')}>We may still serve it. Call us 24/7 and we’ll let you know.</p>
        </div>
        <div className="hub-final-btns" style={s('display:flex;flex-wrap:wrap;gap:14px')}>
          <PhoneLink href={phone.href} display={phone.display} className="btn btn-hero-cta t-btn">
            Call Now: <PhoneNumber value={phone.display} />
          </PhoneLink>
          <ScheduleTrigger as="button" className="btn btn-outline t-btn" label="Schedule a Service" />
        </div>
      </div>
    </section>
  );
}

/** "{rating} stars · {count} Google reviews across all locations" — the live company numbers only. */
function companyLine(ratings: RatingTokenContext, text: string) {
  return renderRatingField(text, { office: null, company: ratings.company });
}

// ── /locations ────────────────────────────────────────────────────────────────────────────────────
export function LocationsIndexView({
  data,
  phone,
  ratings,
}: {
  data: { offices: FinderOffice[]; towns: FinderTown[]; zips: Record<string, string[]>; areas: AreaPlace[] };
  phone: LocPhone;
  ratings: RatingTokenContext;
}) {
  const ordered = [...data.offices.filter((o) => o.st === 'IL'), ...data.offices.filter((o) => o.st !== 'IL')];
  return (
    <LocationsRoot className="city-hub locations-page pruned">
      <script type="application/ld+json" dangerouslySetInnerHTML={ldJson(breadcrumbLd([{ name: 'Home', href: '/' }, { name: 'Locations', href: '/locations' }]))} />
      <script type="application/ld+json" dangerouslySetInnerHTML={ldJson(officesLd('J. Blanton Plumbing offices', ordered))} />

      <section className="lc-intro">
        <div className="wrap">
          <nav aria-label="Breadcrumb">
            <ol className="lc-crumbs pv-in" style={s('--i:0')}>
              <li>
                <a href="/">Home</a>
              </li>
              <li aria-current="page">Locations</li>
            </ol>
          </nav>
          <span className="t-eyebrow pv-in" style={s('--i:1;color:#BC0E0E')}>Local Offices in Illinois &amp; Ohio</span>
          <h1 className="t-h1 hub-h1 pv-in" style={s('--i:2;margin:14px 0 16px')}>J. Blanton Plumbing Locations</h1>
          <p className="t-body pv-mute pv-in" style={s('--i:3;margin:0')}>
            We have local offices across Chicagoland and in Columbus, serving Central Ohio. Every office is staffed by plumbers who work in your area, not a call center routing you to a subcontractor.
          </p>
        </div>
      </section>

      <section aria-label="Find your closest office" className="lc-find" id="find">
        <div className="wrap">
          <LocationsFinder heading="Find Your Closest Office" offices={ordered} phoneHref={phone.href} tabs towns={data.towns} zips={data.zips} />
        </div>
      </section>

      <Trust
        items={[
          'In business since 1993',
          'Licensed in Illinois & Ohio',
          companyLine(ratings, '{{company_rating}} stars · {{company_review_count}} Google reviews across all locations'),
        ]}
      />

      <section aria-labelledby="lc-states-h" className="lc-states">
        <div className="wrap">
          <span className="t-eyebrow" style={s('color:#BC0E0E')}>Browse by State</span>
          <h2 className="hub-h2 t-h2" id="lc-states-h" style={s('margin:12px 0 28px')}>Our Locations by State</h2>
          <div className="lc-sc-grid">
            <a className="lc-sc" href="/locations/illinois">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="Aerial view of the Chicago skyline and the Lake Michigan shoreline at dusk" className="lc-sc-img" decoding="async" height={1686} loading="lazy" src="/images/locations/state-illinois.webp" width={3000} />
              <span className="lc-sc-txt">
                <span className="t-eyebrow lc-sc-eye">Chicagoland</span>
                <span className="lc-sc-h">Plumbers in Illinois</span>
                <span className="lc-sc-p">Chicago and the suburbs in Cook, Lake, DuPage, McHenry, Will and Kane counties.</span>
                <span className="lc-sc-go">
                  See Illinois locations <span aria-hidden="true">→</span>
                </span>
              </span>
            </a>
            <a className="lc-sc" href="/locations/ohio">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="The downtown Columbus skyline and a bridge over the Scioto River" className="lc-sc-img" decoding="async" height={4000} loading="lazy" src="/images/locations/state-ohio.webp" width={6000} />
              <span className="lc-sc-txt">
                <span className="t-eyebrow lc-sc-eye">Central Ohio</span>
                <span className="lc-sc-h">Plumbers in Ohio</span>
                <span className="lc-sc-p">Columbus and Central Ohio, including Westerville, Dublin and Hilliard.</span>
                <span className="lc-sc-go">
                  See Ohio locations <span aria-hidden="true">→</span>
                </span>
              </span>
            </a>
          </div>
        </div>
      </section>

      <section className="sec lc-areas" id="areas">
        <div className="wrap">
          <div className="lc-cap" style={s('max-width:820px')}>
            <span className="t-eyebrow" style={s('color:#BC0E0E')}>Areas We Serve</span>
            <h2 className="hub-h2 t-h2" style={s('margin:12px 0 18px')}>Every Town and Neighborhood We Cover</h2>
            <p className="t-body pv-mute" style={s('margin:0')}>
              J. Blanton Plumbing serves homeowners across{' '}
              <a className="lc-inl" href="/locations/illinois">
                Chicago and its suburbs
              </a>{' '}
              in Cook, Lake, DuPage, McHenry, Will and Kane counties, from the North Shore and the Fox Valley to the southwest suburbs. In Ohio, our Columbus office covers the city’s neighborhoods and{' '}
              <a className="lc-inl" href="/locations/ohio">
                Central Ohio
              </a>
              , including Westerville, Dublin and Hilliard. Search the list below to check your town.
            </p>
          </div>
          <AreasList phoneHref={phone.href} places={data.areas} />
        </div>
      </section>

      <FinalCta phone={phone} />
    </LocationsRoot>
  );
}

// ── State pages ───────────────────────────────────────────────────────────────────────────────────
export interface StatePageCopy {
  key: 'illinois' | 'ohio';
  name: string;
  crumb: string;
  eyebrow: string;
  h1: string;
  intro: string;
  photo: { src: string; width: number; height: number; alt: string };
  licensed: string;
  finderHeading: string;
  areasH2: string;
  /** The answer capsule, with ONE inline link (`[label](href)`). */
  capsule: string;
}

export function StatePageView({
  copy,
  data,
  phone,
  ratings,
}: {
  copy: StatePageCopy;
  data: { offices: FinderOffice[]; towns: FinderTown[]; zips: Record<string, string[]>; counties: StateCounty[]; chips: Array<{ key: string; label: string; count: number }> };
  phone: LocPhone;
  ratings: RatingTokenContext;
}) {
  const [before, label, href, after] = (() => {
    const m = copy.capsule.match(/^([\s\S]*)\[([^\]]+)\]\(([^)]+)\)([\s\S]*)$/);
    return m ? [m[1], m[2], m[3], m[4]] : [copy.capsule, '', '', ''];
  })();
  const ratingLine = companyLine(ratings, '{{company_rating}} stars from {{company_review_count}} Google reviews');
  return (
    <LocationsRoot className={`city-hub state-page state-page--${copy.key} pruned`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={ldJson(breadcrumbLd([{ name: 'Home', href: '/' }, { name: 'Locations', href: '/locations' }, { name: copy.crumb, href: `/locations/${copy.key}` }]))}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={ldJson(officesLd(`J. Blanton Plumbing offices in ${copy.name}`, data.offices))} />

      <section className={`hub-hero st-hero st-hero--${copy.key === 'illinois' ? 'il' : 'oh'}`}>
        <link as="image" href={copy.photo.src} rel="preload" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt={copy.photo.alt} fetchPriority="high" height={copy.photo.height} src={copy.photo.src} width={copy.photo.width} />
        <div className="hub-hero-in">
          <nav aria-label="Breadcrumb">
            <ol className="t2-crumbs pv-in" style={s('--i:0')}>
              <li>
                <a href="/">Home</a>
              </li>
              <li>
                <a href="/locations">Locations</a>
              </li>
              <li aria-current="page">{copy.crumb}</li>
            </ol>
          </nav>
          <span className="t-eyebrow pv-in" style={s('--i:0;color:#F9F3EC')}>{copy.eyebrow}</span>
          <h1 className="t-h1 hub-h1 pv-in" style={s('--i:1;color:#F9F3EC;margin:14px 0 16px')}>{copy.h1}</h1>
          <p className="t-body pv-in" style={s('--i:2;color:#F9F3EC;margin:0 0 26px;max-width:60ch')}>{copy.intro}</p>
          <div className="pv-in" style={s('--i:3')}>
            <div className="hero-cta">
              <PhoneLink href={phone.href} display={phone.display} className="btn btn-hero-cta t-btn">
                <PhoneIcon />
                <PhoneNumber value={phone.display} />
              </PhoneLink>
              <span aria-label="24 hours, 7 days a week emergency service" className="badge24" role="img">
                <Badge24 />
              </span>
            </div>
          </div>
          <nav aria-label="On this page" className="hub-pills pv-in" style={s('--i:4')}>
            <a href="#find">Find Your Office</a>
            <a href="#areas">Areas We Serve</a>
          </nav>
        </div>
      </section>

      <Trust items={['In business since 1993', copy.licensed, ratingLine]} />

      <section aria-label="Find your closest office" className="lc-find" id="find">
        <div className="wrap">
          <LocationsFinder heading={copy.finderHeading} offices={data.offices} phoneHref={phone.href} tabs={false} towns={data.towns} zips={data.zips} />
        </div>
      </section>

      <section className="sec lc-areas" id="areas">
        <div className="wrap">
          <div className="lc-cap" style={s('max-width:820px')}>
            <span className="t-eyebrow" style={s('color:#BC0E0E')}>Areas We Serve</span>
            <h2 className="hub-h2 t-h2" style={s('margin:12px 0 18px')}>{copy.areasH2}</h2>
            <p className="t-body pv-mute" style={s('margin:0')}>
              {before}
              {label ? (
                <a className="lc-inl" href={href}>
                  {label}
                </a>
              ) : null}
              {after}
            </p>
          </div>
          <StateAreas chips={data.chips} counties={data.counties} phoneHref={phone.href} stateName={copy.name} />
        </div>
      </section>

      <FinalCta phone={phone} />
    </LocationsRoot>
  );
}
