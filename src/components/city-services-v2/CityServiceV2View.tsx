import type { CSSProperties } from 'react';
import { PhoneLink, PhoneNumber } from '@/components/PhoneLink';
import { SITE } from '@/lib/site';
import { breadcrumbListJsonLd } from '@/lib/schema/breadcrumb-list';
import { SewerNodes, SewerRichText } from '@/components/sewer-v2/SewerNodes';
import type { CityServiceShared, CityServiceStored } from '@/lib/content/city-services-v2/types';
import { CsIcon } from './icons';
import CityServiceV2Root from './CityServiceV2Root';

/**
 * City Service Pages V2 (Brief 209) — ALL the markup of one V2 `/{city}/{service}` page
 * (Northbrook, Columbus, Tinley Park, Joliet, Naperville × 29 services).
 *
 * The approved Brief 209 package (the Highland Park service-page template, `aside.ss-rail` variant)
 * element for element. Since the CMS wiring the page comes from its `city_service_pages` row and the
 * city's shared parts from its `city_pages` row (src/lib/cms/city-v2.ts), with the code module as the
 * fallback — the markup is identical either way:
 *   • the main column's blocks are locked `SewerNode` panels (the Brief 204 format), rendered by the
 *     Sewer v2 node renderer; the No Drip Club box is the city's shared one, general or sewer wording;
 *   • hero, breadcrumb parent, quick links, contact rail and sticky bar are structured fields;
 *   • the package's own header, drawer and footer are gone — the live shell supplies them;
 *   • every phone position renders the Global Settings phone (Columbus: the Central Ohio phone,
 *     Brief 192) through PhoneLink/PhoneNumber, so WhatConverts can swap it;
 *   • structured data: Service + BreadcrumbList. No FAQPage — forbidden sitewide (Brief 164).
 */

export interface CsPhone {
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

/** `773-724-9272` → `+1-773-724-9272` (the approved schema's telephone format). */
function schemaPhone(display: string): string {
  const d = display.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
  return d.length === 10 ? `+1-${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` : display;
}

function Ndc({ shared, variant, phone }: { shared: CityServiceShared; variant: 'general' | 'sewer'; phone: CsPhone }) {
  const n = shared.ndc;
  const v = n[variant];
  return (
    <div className="ndc-grid">
      <div className="ndc-text">
        <p className="t-eyebrow ndc-eyebrow">{n.eyebrow}</p>
        <h2 className="t-h2 ndc-h2">
          <a href={n.href}>{n.headingLink}</a>
          {v.headingRest || null}
        </h2>
        <p className="ndc-body">
          <SewerRichText value={v.body} phone={phone} />
        </p>
        <ul className="ndc-list">
          {n.benefits.map((x) => (
            <li key={x}>
              <span className="ndc-check">
                <CsIcon name="ndcCheck" />
              </span>
              <span>{x}</span>
            </li>
          ))}
        </ul>
        <a className="btn btn-primary t-btn ndc-btn" href={n.href}>
          <CsIcon name="ndcBtn" />
          {n.cta}
        </a>
      </div>
      <div className="ndc-figure">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt={n.alt} height={1604} loading="lazy" src={n.image} width={1180} />
      </div>
    </div>
  );
}

export default function CityServiceV2View({
  city,
  service,
  stored,
  shared,
  phone,
}: {
  city: string;
  service: string;
  stored: CityServiceStored;
  shared: CityServiceShared;
  phone: CsPhone;
}) {
  const canonical = `${SITE.baseUrl}/${city}/${service}`;
  const sch = stored.serviceSchema;
  const serviceLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: sch.name,
    serviceType: sch.serviceType,
    url: canonical,
    description: sch.description,
    provider: {
      '@type': 'Plumber',
      name: sch.provider.name,
      telephone: schemaPhone(phone.display),
      url: sch.provider.url,
      address: { '@type': 'PostalAddress', ...sch.provider.address },
    },
    areaServed: sch.areaServed,
  };
  const crumbs = breadcrumbListJsonLd(
    [
      { label: 'Home', href: '/' },
      { label: shared.crumbParent.label, href: shared.crumbParent.href },
      { label: stored.hero.crumb, href: `/${city}/${service}` },
    ],
    SITE.baseUrl
  );
  const ld = (o: unknown) => ({ __html: JSON.stringify(o).replace(/</g, '\\u003c') });
  const rail = shared.rail;
  const sticky = shared.sticky;

  return (
    <CityServiceV2Root>
      <script type="application/ld+json" dangerouslySetInnerHTML={ld(serviceLd)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={ld(crumbs)} />

      <section className="ss-hero">
        <div className="hero-pattern" />
        <div className="ss-hero-in">
          <div className="ss-hero-copy">
            <nav aria-label="Breadcrumb" className="ss-crumb pv-in" style={s('--i:0')}>
              <a href={shared.crumbParent.href}>{shared.crumbParent.label}</a>
              <span aria-hidden="true">/</span>
              <span>{stored.hero.crumb}</span>
            </nav>
            <span className="t-eyebrow hero-eyebrow pv-in" style={s('--i:1')}>
              {stored.hero.eyebrow}
            </span>
            <h1 className="t-h1 pv-in" style={s('--i:2;color:var(--c-cream);margin:0')}>
              {stored.hero.heading}
            </h1>
            <p className="t-body pv-in" style={s('--i:3;color:var(--c-cream);margin:0;max-width:56ch')}>
              {stored.hero.intro}
            </p>
            <div className="hero-cta pv-in" style={s('--i:4')}>
              <PhoneLink href={phone.href} display={phone.display} className="btn btn-hero-cta t-btn">
                <CsIcon name="phone20" />
                <PhoneNumber value={phone.display} />
              </PhoneLink>
              <span aria-label={shared.badge24Label} className="badge24" role="img">
                <CsIcon name="badge24" />
              </span>
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt={stored.hero.image.alt} className="ss-hero-img pv-in" src={stored.hero.image.src} style={s('--i:3')} />
        </div>
      </section>

      <nav aria-label={shared.quickLinks.ariaLabel} className="jbp-subnav">
        {shared.quickLinks.links.map((l) => (
          <a href={l.href} key={l.href}>
            {l.label}
          </a>
        ))}
      </nav>

      <div className="ss-shell">
        <div className="ss-main">
          {stored.sections.map((sec) => (
            <section className={sec.cls} id={sec.id} key={sec.id} style={s(`--o:${sec.order}`)}>
              {sec.kind === 'ndc' ? <Ndc shared={shared} variant={sec.variant} phone={phone} /> : <SewerNodes nodes={sec.body} phone={phone} />}
            </section>
          ))}
        </div>
        <aside aria-label={rail.ariaLabel} className="ss-rail">
          <div className="ss-call">
            <h2 className="t-label" style={s('font-size:20px;margin:0')}>
              {rail.call.heading}
            </h2>
            <p className="t-body-sm" style={s('margin:0;color:var(--c-cream)')}>
              <SewerRichText value={rail.call.body} phone={phone} />
            </p>
            <PhoneLink href={phone.href} display={phone.display} className="btn btn-hero-cta t-btn">
              <CsIcon name="phone20" />
              {rail.call.cta}
            </PhoneLink>
          </div>
          <div className="ss-trust">
            {rail.trust.map((t) => (
              <div className="ss-trust-item" key={t}>
                <CsIcon name="trust" />
                <span className="t-label">{t}</span>
              </div>
            ))}
          </div>
          <div className="ss-fin" style={s('--o:25')}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt={rail.financing.alt}
              src={rail.financing.image}
              style={s('width:calc(100% + 40px);height:140px;object-fit:cover;border-radius:14px 14px 0 0;margin:-20px -20px 16px -20px;display:block')}
            />
            <h2 className="t-h4">{rail.financing.heading}</h2>
            <p className="t-body-sm">
              <SewerRichText value={rail.financing.body} phone={phone} />
            </p>
            <p className="t-caption fin-note">{rail.financing.note}</p>
            <PhoneLink href={phone.href} display={phone.display} className="btn btn-hero-cta t-btn">
              {rail.financing.cta}
            </PhoneLink>
          </div>
        </aside>
      </div>

      <div className="ss-sticky-cta">
        <div className="ss-sticky-cta-text">
          <strong>{sticky.title}</strong>
          <span>{sticky.sub}</span>
        </div>
        <PhoneLink
          href={phone.href}
          display={phone.display}
          className="btn btn-hero-cta t-btn"
          aria-label={sticky.ariaLabel.split('{{phone}}').join(phone.display)}
        >
          <CsIcon name="phone18" />
          {sticky.cta}
        </PhoneLink>
      </div>
    </CityServiceV2Root>
  );
}
