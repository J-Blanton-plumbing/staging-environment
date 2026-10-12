import { PhoneLink } from '@/components/PhoneLink';
import type { SewerServiceEntry, SewerSharedContent } from '@/lib/content/sewer-v2/types';
import { parseStyle as s, type SewerPhone } from './SewerNodes';

/**
 * Brief 200 (Track C) — the two services components that replace the old red OUR SERVICES menu
 * (CityServicesMenu) on the sewer pages. Both read the ONE shared list (`shared.services`), so no
 * page carries its own copy of it, and every link is a live URL.
 *
 * Brief 204: the list is the sewer-shared content (edited once in /admin/sewer; code fallback
 * SEWER_SERVICES). Its order is the service-page rows' order; the hub keeps its own featured
 * service + grid order (Marketing 2026-10-12), so reordering one never moves the other.
 */

function LearnMore({ title, href, label }: { title: string; href: string; label: string }) {
  return (
    <a className="svc-cta" href={href} aria-label={`${label} about ${title}`}>
      {label} <span aria-hidden="true">&rarr;</span>
    </a>
  );
}

/** Hub: the featured service, then the grid. A slug the list no longer has is skipped, not fatal. */
export function SewerHubServices({ shared }: { shared: SewerSharedContent }) {
  const bySlug = (slug: string): SewerServiceEntry | undefined => shared.services.find((e) => e.slug === slug);
  const feat = bySlug(shared.hubFeatured);
  const grid = shared.hubOrder.map(bySlug).filter((e): e is SewerServiceEntry => !!e);
  return (
    <>
      {feat && (
        <article className="hub-feat">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="pv-img hub-feat-img" src={feat.image} alt={feat.hub.alt} loading="lazy" />
          <div className="hub-feat-copy">
            <h3 className="t-h2 hub-h3" style={s('margin:0 0 14px')}>{feat.hub.title}</h3>
            <p className="t-body pv-mute" style={s('margin:0 0 22px;max-width:44ch')}>{feat.hub.desc}</p>
            <LearnMore title={feat.hub.title} href={feat.href} label={shared.learnMore} />
          </div>
        </article>
      )}
      <div className="hub-grid">
        {grid.map((e) => (
          <article className="hub-card" key={e.slug}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="pv-img hub-card-img" src={e.image} alt={e.hub.alt} loading="lazy" />
            <h3 className="svc-title" style={s('margin:16px 0 8px')}>{e.hub.title}</h3>
            <p className="svc-desc" style={s('margin:0 0 16px')}>{e.hub.desc}</p>
            <LearnMore title={e.hub.title} href={e.href} label={shared.learnMore} />
          </article>
        ))}
      </div>
    </>
  );
}

/** Service pages: the sibling services (the page's own is left out), then the Emergency row. */
export function SewerServiceRows({
  shared,
  currentSlug,
  order,
  phone,
}: {
  shared: SewerSharedContent;
  currentSlug: string;
  order: number;
  phone: SewerPhone;
}) {
  const rows = shared.services.filter((e) => e.slug !== currentSlug);
  const em = shared.emergencyRow;
  return (
    <section className="ss-panel" id="services" style={s(`--o:${order}`)}>
      <div className="ss-head">
        <span className="t-eyebrow" style={s('color:var(--c-carmine)')}>{shared.servicesHead.eyebrow}</span>
        <h2 className="t-h2" style={s('margin:10px 0 0')}>{shared.servicesHead.heading}</h2>
      </div>
      <div className="ss-rows">
        {rows.map((e) => (
          <article className="ss-row" key={e.slug}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="pv-img ss-thumb" src={e.image} alt={e.row.alt} loading="lazy" />
            <div>
              <h3 className="svc-title">{e.row.title}</h3>
              <p className="svc-desc">{e.row.short}</p>
            </div>
            <LearnMore title={e.row.title} href={e.href} label={shared.learnMore} />
          </article>
        ))}
        <article className="ss-row ss-row--emergency">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="pv-img ss-thumb" src={em.image} alt={em.alt} loading="lazy" />
          <div>
            <h3 className="svc-title">{em.title}</h3>
            <p className="svc-desc">{em.short}</p>
          </div>
          <PhoneLink href={phone.href} display={phone.display} className="svc-cta-onred">
            {em.cta}
          </PhoneLink>
        </article>
      </div>
    </section>
  );
}
