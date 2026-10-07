import { PhoneLink } from '@/components/PhoneLink';
import { SEWER_EMERGENCY_ROW, SEWER_HUB_FEATURED, SEWER_HUB_ORDER, SEWER_SERVICES, sewerService } from '@/lib/content/sewer-v2/services';
import { SEWER_LEARN_MORE, SEWER_SERVICES_HEAD } from '@/lib/content/sewer-v2/shared';
import type { SewerServiceEntry } from '@/lib/content/sewer-v2/types';
import { parseStyle as s, type SewerPhone } from './SewerNodes';

/**
 * Brief 200 (Track C) — the two services components that replace the old red OUR SERVICES menu
 * (CityServicesMenu) on the sewer pages. Both read the ONE shared list (SEWER_SERVICES), so no page
 * carries its own copy of it, and every link is a live URL.
 */

function LearnMore({ title, href }: { title: string; href: string }) {
  return (
    <a className="svc-cta" href={href} aria-label={`${SEWER_LEARN_MORE} about ${title}`}>
      {SEWER_LEARN_MORE} <span aria-hidden="true">&rarr;</span>
    </a>
  );
}

const byHubOrder = (): SewerServiceEntry[] =>
  SEWER_HUB_ORDER.map((slug) => {
    const e = sewerService(slug);
    if (!e) throw new Error(`[sewer-v2] SEWER_HUB_ORDER names an unknown service: ${slug}`);
    return e;
  });

/** Hub: the featured service, then the grid — all 9 services. */
export function SewerHubServices() {
  const feat = sewerService(SEWER_HUB_FEATURED);
  if (!feat) throw new Error(`[sewer-v2] unknown featured service: ${SEWER_HUB_FEATURED}`);
  return (
    <>
      <article className="hub-feat">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="pv-img hub-feat-img" src={feat.image} alt={feat.hub.alt} loading="lazy" />
        <div className="hub-feat-copy">
          <h3 className="t-h2 hub-h3" style={s('margin:0 0 14px')}>{feat.hub.title}</h3>
          <p className="t-body pv-mute" style={s('margin:0 0 22px;max-width:44ch')}>{feat.hub.desc}</p>
          <LearnMore title={feat.hub.title} href={feat.href} />
        </div>
      </article>
      <div className="hub-grid">
        {byHubOrder().map((e) => (
          <article className="hub-card" key={e.slug}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="pv-img hub-card-img" src={e.image} alt={e.hub.alt} loading="lazy" />
            <h3 className="svc-title" style={s('margin:16px 0 8px')}>{e.hub.title}</h3>
            <p className="svc-desc" style={s('margin:0 0 16px')}>{e.hub.desc}</p>
            <LearnMore title={e.hub.title} href={e.href} />
          </article>
        ))}
      </div>
    </>
  );
}

/** Service pages: the 8 sibling services (the page's own is left out), then the Emergency row. */
export function SewerServiceRows({ currentSlug, order, phone }: { currentSlug: string; order: number; phone: SewerPhone }) {
  const rows = SEWER_SERVICES.filter((e) => e.slug !== currentSlug);
  return (
    <section className="ss-panel" id="services" style={s(`--o:${order}`)}>
      <div className="ss-head">
        <span className="t-eyebrow" style={s('color:var(--c-carmine)')}>{SEWER_SERVICES_HEAD.eyebrow}</span>
        <h2 className="t-h2" style={s('margin:10px 0 0')}>{SEWER_SERVICES_HEAD.heading}</h2>
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
            <LearnMore title={e.row.title} href={e.href} />
          </article>
        ))}
        <article className="ss-row ss-row--emergency">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="pv-img ss-thumb" src={SEWER_EMERGENCY_ROW.image} alt={SEWER_EMERGENCY_ROW.alt} loading="lazy" />
          <div>
            <h3 className="svc-title">{SEWER_EMERGENCY_ROW.title}</h3>
            <p className="svc-desc">{SEWER_EMERGENCY_ROW.short}</p>
          </div>
          <PhoneLink href={phone.href} display={phone.display} className="svc-cta-onred">
            {SEWER_EMERGENCY_ROW.cta}
          </PhoneLink>
        </article>
      </div>
    </section>
  );
}
