import { PhoneLink, PhoneNumber } from '@/components/PhoneLink';
import ScheduleTrigger from '@/components/schedule/ScheduleTrigger';
import { SITE } from '@/lib/site';
import { breadcrumbListJsonLd } from '@/lib/schema/breadcrumb-list';
import {
  SEWER_BADGE24_LABEL,
  SEWER_CRUMB_PARENT,
  SEWER_FINAL,
  SEWER_QUICK_LINKS,
  SEWER_RAIL,
  SEWER_REVIEW,
  SEWER_STICKY,
} from '@/lib/content/sewer-v2/shared';
import type { SewerSection, SewerServicePage } from '@/lib/content/sewer-v2/types';
import { SewerIcon } from './icons';
import { parseStyle as s, SewerNodes, type SewerPhone } from './SewerNodes';
import SewerV2Root from './SewerV2Root';
import { SewerServiceRows } from './SewerServices';
import SewerNdc from './SewerNdc';
import SewerFaqList from './SewerFaqList';
import './sewer-v2.css';

/**
 * Brief 200 — one of the 9 Sewer Ecosystem v2 service pages (the approved package's "Dispatch"
 * sub-service template): hero with its visible breadcrumb, quick-links bar, the main column of
 * sections, the sticky contact rail, and the mobile sticky call bar.
 *
 * Markup, classes and inline styles follow the approved pages element for element; all copy comes
 * from the page's content module. Phones render through PhoneLink/PhoneNumber (Track D), the
 * Schedule buttons through the site's schedule popup trigger, and the old CityServicesMenu is
 * replaced by SewerServiceRows (Track C).
 *
 * Structured data: the page's VideoObject verbatim (7 of 9 pages) + a BreadcrumbList
 * Home › Sewer Services › {page} matching the visible crumb. No FAQPage (dead since 2026-05-07), no
 * page-level LocalBusiness (the footer graph owns that, Brief 167).
 */
export default function SewerServiceView({ page, phone }: { page: SewerServicePage; phone: SewerPhone }) {
  const crumbs = breadcrumbListJsonLd(
    [
      { label: 'Home', href: '/' },
      { label: SEWER_CRUMB_PARENT.label, href: SEWER_CRUMB_PARENT.href },
      { label: page.hero.crumb, href: `/${page.slug}` },
    ],
    SITE.baseUrl
  );

  return (
    <SewerV2Root className="sewer-v2 sewer-v2--service">
      {page.videoSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(page.videoSchema) }} />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />

      <section className="ss-hero">
        <div className="hero-pattern" />
        <div className="ss-hero-in">
          <div className="ss-hero-copy">
            <nav className="ss-crumb pv-in" style={s('--i:0')} aria-label="Breadcrumb">
              <a href={SEWER_CRUMB_PARENT.href}>{SEWER_CRUMB_PARENT.label}</a>
              <span aria-hidden="true">/</span>
              <span>{page.hero.crumb}</span>
            </nav>
            <span className="t-eyebrow hero-eyebrow pv-in" style={s('--i:1')}>{page.hero.eyebrow}</span>
            <h1 className="t-h1 pv-in" style={s('--i:2;color:var(--c-cream);margin:0')}>{page.hero.heading}</h1>
            <p className="t-body pv-in" style={s('--i:3;color:var(--c-cream);margin:0;max-width:56ch')}>{page.hero.intro}</p>
            <div className="hero-cta pv-in" style={s('--i:4')}>
              <PhoneLink href={phone.href} display={phone.display} className="btn btn-hero-cta t-btn">
                <SewerIcon name="phone20" />
                <PhoneNumber value={phone.display} />
              </PhoneLink>
              <span className="badge24" role="img" aria-label={SEWER_BADGE24_LABEL}>
                <SewerIcon name="badge24" />
              </span>
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="ss-hero-img pv-in" style={s('--i:3')} src={page.hero.image.src} alt={page.hero.image.alt} />
        </div>
      </section>

      <nav className="jbp-subnav" aria-label={SEWER_QUICK_LINKS.ariaLabel}>
        {SEWER_QUICK_LINKS.links.map((l) => (
          <a key={l.href} href={l.href}>{l.label}</a>
        ))}
      </nav>

      <div className="ss-shell">
        <div className="ss-main">
          {page.sections.map((sec) => (
            <ServiceSection key={sectionKey(sec)} section={sec} page={page} phone={phone} />
          ))}
        </div>
        <aside className="ss-rail" aria-label={SEWER_RAIL.ariaLabel}>
          <div className="ss-call">
            <h2 className="t-label" style={s('font-size:20px;margin:0')}>{SEWER_RAIL.call.heading}</h2>
            <p className="t-body-sm" style={s('margin:0;color:var(--c-cream)')}>{SEWER_RAIL.call.body}</p>
            <PhoneLink href={phone.href} display={phone.display} className="btn btn-hero-cta t-btn">
              <SewerIcon name="phone20" />
              {SEWER_RAIL.call.cta}
            </PhoneLink>
          </div>
          <div className="ss-trust">
            {SEWER_RAIL.trust.map((t) => (
              <div className="ss-trust-item" key={t.label}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={t.icon} alt="" aria-hidden="true" width={40} height={40} />
                <span className="t-label">{t.label}</span>
              </div>
            ))}
          </div>
          <div className="ss-fin" style={s(`--o:${page.rail.financingOrder}`)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={SEWER_RAIL.financing.image}
              alt={SEWER_RAIL.financing.alt}
              style={s('width:calc(100% + 40px);height:140px;object-fit:cover;border-radius:14px 14px 0 0;margin:-20px -20px 16px -20px;display:block')}
            />
            <h2 className="t-h4">{SEWER_RAIL.financing.heading}</h2>
            <p className="t-body-sm">{SEWER_RAIL.financing.body}</p>
            <p className="t-caption fin-note">{SEWER_RAIL.financing.note}</p>
            <PhoneLink href={phone.href} display={phone.display} className="btn btn-hero-cta t-btn">
              {SEWER_RAIL.financing.cta}
            </PhoneLink>
          </div>
        </aside>
      </div>

      <div className="ss-sticky-cta">
        <div className="ss-sticky-cta-text">
          <strong>{SEWER_STICKY.title}</strong>
          <span>{SEWER_STICKY.sub}</span>
        </div>
        <PhoneLink
          href={phone.href}
          display={phone.display}
          className="btn btn-hero-cta t-btn"
          aria-label={SEWER_STICKY.ariaLabel.replace('{phone}', phone.display)}
        >
          <SewerIcon name="phone18" />
          {SEWER_STICKY.cta}
        </PhoneLink>
      </div>
    </SewerV2Root>
  );
}

function sectionKey(sec: SewerSection): string {
  return sec.kind === 'panel' ? `panel:${sec.id}` : sec.kind;
}

function ServiceSection({ section, page, phone }: { section: SewerSection; page: SewerServicePage; phone: SewerPhone }) {
  switch (section.kind) {
    case 'panel':
      return (
        <section className={section.tint ? 'ss-panel ss-tint' : 'ss-panel'} id={section.id} style={s(`--o:${section.order}`)}>
          <SewerNodes nodes={section.body} phone={phone} />
        </section>
      );
    case 'reviews':
      return (
        <section className="ss-panel ss-tint" id="reviews" style={s(`--o:${section.order}`)}>
          <div className="ss-head">
            <span className="t-eyebrow" style={s('color:var(--c-carmine)')}>{section.eyebrow}</span>
            <h2 className="t-h2" style={s('margin:10px 0 0')}>{section.heading}</h2>
          </div>
          <div className="ss-revs">
            {section.items.map((r) => (
              <div className="ss-rev" key={r.name}>
                <div className="pv-stars" role="img" aria-label={SEWER_REVIEW.starsLabel}>
                  {SEWER_REVIEW.stars}
                </div>
                <p className="t-body-sm" style={s('margin:0 0 14px')}>{r.quote}</p>
                <div className="review-author">
                  <span className="review-avatar">
                    <SewerIcon name="avatar" />
                  </span>
                  <div>
                    <a
                      href={r.href}
                      target="_blank"
                      rel="noreferrer"
                      style={section.variant === 'plain' ? s('text-decoration:none;color:inherit') : undefined}
                    >
                      <strong className="t-label" style={s('font-size:14px')}>{r.name}</strong>
                    </a>
                    {section.variant === 'cap' ? (
                      <div className="t-caption pv-cap">{SEWER_REVIEW.caption}</div>
                    ) : (
                      <div className="t-caption" style={s('color:var(--c-slate)')}>{SEWER_REVIEW.caption}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      );
    case 'faq':
      return (
        <section className="ss-panel" id="faq" style={s(`--o:${section.order}`)}>
          <div className="ss-head">
            <span className="t-eyebrow" style={s('color:var(--c-carmine)')}>{section.eyebrow}</span>
            <h2 className="t-h2" style={s('margin:10px 0 0')}>{section.heading}</h2>
          </div>
          <SewerFaqList items={section.items} phone={phone} />
        </section>
      );
    case 'ndc':
      return <SewerNdc context="panel" order={section.order} body={section.body} />;
    case 'services':
      return <SewerServiceRows currentSlug={page.slug} order={section.order} phone={phone} />;
    case 'final':
      return (
        <section id="book" className="ss-panel ss-final" style={s(`--o:${section.order}`)}>
          <div style={s('max-width:620px;margin:0 auto;text-align:center')}>
            <span className="t-eyebrow" style={s('color:var(--c-carmine)')}>{SEWER_FINAL.eyebrow}</span>
            <h2 className="t-h2" style={s('margin:12px 0 14px')}>{section.heading}</h2>
            <p className="t-body-sm pv-mute" style={s('margin:0 0 22px')}>{section.body}</p>
            <div className="final-cta-row" style={s('display:flex;flex-wrap:wrap;gap:14px;justify-content:center')}>
              <PhoneLink href={phone.href} display={phone.display} className="btn btn-hero-cta t-btn">
                {SEWER_FINAL.callPrefix}
                <PhoneNumber value={phone.display} />
              </PhoneLink>
              <ScheduleTrigger as="button" className="btn btn-outline t-btn" label={SEWER_FINAL.schedule} />
            </div>
          </div>
        </section>
      );
  }
}
