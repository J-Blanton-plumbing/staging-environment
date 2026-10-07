import { PhoneLink, PhoneNumber } from '@/components/PhoneLink';
import ScheduleTrigger from '@/components/schedule/ScheduleTrigger';
import { SEWER_HUB } from '@/lib/content/sewer-v2/hub';
import { SEWER_BADGE24_LABEL, SEWER_FINAL, SEWER_REVIEW } from '@/lib/content/sewer-v2/shared';
import { SewerIcon } from './icons';
import { parseStyle as s, type SewerPhone } from './SewerNodes';
import SewerV2Root from './SewerV2Root';
import { SewerHubServices } from './SewerServices';
import SewerNdc from './SewerNdc';
import SewerFaqList from './SewerFaqList';
import './sewer-v2.css';

/**
 * Brief 200 — `/services/sewer`, the Sewer Services hub (approved package `index.html`).
 *
 * Markup, classes and inline styles follow the approved page element for element; the package's own
 * header, drawer, footer, fonts and meta are gone (the live shell supplies them). Copy comes from
 * lib/content/sewer-v2 — this file holds none. Every phone position renders through PhoneLink /
 * PhoneNumber with the site's number (Track D), and "Schedule a Service" is the site's schedule
 * popup trigger (Brief 169).
 */
export default function SewerHubView({ phone }: { phone: SewerPhone }) {
  const h = SEWER_HUB;
  return (
    <SewerV2Root className="sewer-v2 sewer-v2--hub">
      <section className="hub-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={h.hero.image.src} alt={h.hero.image.alt} />
        <div className="hub-hero-in">
          <span className="t-eyebrow pv-in" style={s('--i:0;color:#F9F3EC')}>{h.hero.eyebrow}</span>
          <h1 className="t-h1 hub-h1 pv-in" style={s('--i:1;color:#F9F3EC;margin:14px 0 16px')}>{h.hero.heading}</h1>
          <p className="t-body pv-in" style={s('--i:2;color:#F9F3EC;margin:0 0 26px;max-width:56ch')}>{h.hero.intro}</p>
          <div className="pv-in" style={s('--i:3')}>
            <div className="hero-cta">
              <PhoneLink href={phone.href} display={phone.display} className="btn btn-hero-cta t-btn">
                <SewerIcon name="phone20" />
                <PhoneNumber value={phone.display} />
              </PhoneLink>
              <span className="badge24" role="img" aria-label={SEWER_BADGE24_LABEL}>
                <SewerIcon name="badge24" />
              </span>
            </div>
          </div>
          <nav className="hub-pills pv-in" style={s('--i:4')} aria-label={h.hero.pillsLabel}>
            {h.hero.pills.map((p) => (
              <a key={p.href} href={p.href}>{p.label}</a>
            ))}
          </nav>
        </div>
      </section>

      <section aria-label={h.trust.ariaLabel} className="trust-stripe">
        <ul className="wrap trust-stripe-list">
          {h.trust.items.map((t) => (
            <li key={t}>
              <SewerIcon name="checkCircle" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="sec hub-svc-sec" id="services" style={s('background:#F9F3EC')}>
        <div className="wrap">
          <div style={s('max-width:780px')}>
            <span className="t-eyebrow" style={s('color:#BC0E0E')}>{h.services.eyebrow}</span>
            <h2 className="hub-h2 t-h2" style={s('margin:12px 0 18px')}>{h.services.heading}</h2>
            <p className="t-body pv-mute" style={s('margin:0 0 8px')}>{h.services.intro}</p>
          </div>
          <SewerHubServices />
        </div>
      </section>

      <section className="sec" style={s('background:#F1E8DC')}>
        <div className="wrap hub-split">
          <div className="hub-sticky">
            <span className="t-eyebrow " style={s('color:#BC0E0E')}>{h.understanding.eyebrow}</span>
            <h2 className="hub-h2 t-h2" style={s('margin:12px 0 18px')}>{h.understanding.heading}</h2>
            <p className="t-body pv-mute" style={s('margin:0')}>{h.understanding.intro}</p>
          </div>
          <div className="hub-tiles">
            {h.understanding.tiles.map((t) => (
              <div className="hub-tile" key={t.heading}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="pv-img hub-tile-img" src={t.image} alt={t.alt} loading="lazy" />
                <div>
                  <h3 className="t-label" style={s('color:#BC0E0E;margin:0 0 10px')}>{t.heading}</h3>
                  <p className="t-body-sm pv-mute" style={s('margin:0')}>{t.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="sec" id="why-us" style={s('background:#F9F3EC')}>
        <div className="wrap">
          <div style={s('max-width:780px')}>
            <span className="t-eyebrow" style={s('color:#BC0E0E')}>{h.whyUs.eyebrow}</span>
            <h2 className="hub-h2 t-h2" style={s('margin:12px 0 18px')}>{h.whyUs.heading}</h2>
            <p className="t-body pv-mute" style={s('margin:0 0 40px')}>{h.whyUs.intro}</p>
          </div>
          <div className="hub-why">
            <figure className="hub-chart" data-chart="" role="img" aria-label={h.whyUs.chart.ariaLabel}>
              <figcaption className="hub-chart-title">
                <span className="c-t1">{h.whyUs.chart.titleLine1}</span>
                <span className="c-t2">{h.whyUs.chart.titleLine2}</span>
              </figcaption>
              <div className="hc" aria-hidden="true">
                <div className="hc-ylabel">{h.whyUs.chart.yLabel}</div>
                <div className="hc-plot">
                  {h.whyUs.chart.ticks.map((y) => (
                    <div key={y} className={y === 0 ? 'hc-tick z' : 'hc-tick'} style={s(`--y:${y}`)}>
                      <b>{y}</b>
                    </div>
                  ))}
                  <div className="hc-cols">
                    {h.whyUs.chart.bars.map((b, i) => (
                      <div key={b.label} className={b.highlight ? 'hc-col hi' : 'hc-col'} style={s(`--v:${b.value};--i:${i};--c:${b.color}`)}>
                        <span className="hc-val">
                          <span data-count={String(b.value)}>{b.value}</span>%
                        </span>
                        <span className="hc-bar" />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="hc-xs">
                  {h.whyUs.chart.bars.map((b) => (
                    <span key={b.label}>{b.label}</span>
                  ))}
                </div>
              </div>
            </figure>
            <div>
              <h3 className="t-h4" style={s('margin:0 0 10px')}>{h.whyUs.subheading}</h3>
              <p className="t-body-sm pv-mute" style={s('margin:0 0 20px')}>{h.whyUs.body}</p>
              <p className="hub-stat">
                <span data-count={String(h.whyUs.stat)} data-count-solo="">{h.whyUs.stat}</span>%
              </p>
              <p className="t-label" style={s('margin:0 0 24px')}>{h.whyUs.statLabel}</p>
              <div className="hub-since">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={h.whyUs.sinceIcon} alt="" aria-hidden="true" height={48} style={s('height:48px;width:auto')} />
                <div>
                  <p className="t-label" style={s('color:#BC0E0E;margin:0;line-height:1.3')}>{h.whyUs.sinceLine1}</p>
                  <p className="t-label" style={s('margin:0;line-height:1.3')}>{h.whyUs.sinceLine2}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="hub-fin">
        <div className="wrap hub-fin-in">
          <div className="hub-fin-copy">
            <span className="t-eyebrow" style={s('color:#F9F3EC')}>{h.financing.eyebrow}</span>
            <h2 className="t-h2" style={s('color:#F9F3EC;margin:12px 0 10px;max-width:440px')}>{h.financing.heading}</h2>
            <p className="t-body-sm" style={s('color:#F9F3EC;margin:0 0 8px;max-width:440px')}>{h.financing.body}</p>
            <p className="t-body-sm" style={s('color:#F9F3EC;opacity:.75;margin:0;max-width:440px;font-size:.8em')}>{h.financing.note}</p>
          </div>
          <PhoneLink href={phone.href} display={phone.display} className="btn btn-onred t-btn hub-fin-cta">
            {h.financing.cta}
          </PhoneLink>
        </div>
      </section>

      <section className="hub-map" id="locations" style={s('background:#F1E8DC')}>
        <div className="hub-map-frame">
          <iframe title={h.map.iframeTitle} src={h.map.iframeSrc} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
        </div>
        <div className="hub-map-copy">
          <span className="t-eyebrow" style={s('color:#BC0E0E')}>{h.map.eyebrow}</span>
          <h2 className="hub-h2 t-h2" style={s('margin:12px 0 16px')}>
            {h.map.headingLine1}
            <br className="map-h2-br" />
            {h.map.headingLine2}
          </h2>
          <p className="t-body pv-mute" style={s('margin:0 0 22px')}>{h.map.body}</p>
          <div className="hub-map-links">
            <a className="svc-cta" href={h.map.link.href}>
              {h.map.link.label} <span aria-hidden="true">&rarr;</span>
            </a>
          </div>
        </div>
      </section>

      <section className="sec" style={s('background:#F9F3EC')}>
        <div className="wrap">
          <div className="hub-rev-head">
            <div style={s('max-width:780px')}>
              <span className="t-eyebrow" style={s('color:#BC0E0E')}>{h.reviews.eyebrow}</span>
              <h2 className="hub-h2 t-h2" style={s('margin:12px 0 18px')}>{h.reviews.heading}</h2>
              <p className="t-body pv-mute" style={s('margin:0 0 40px')}>{h.reviews.intro}</p>
            </div>
            <aside className="hub-proof" aria-label={h.reviews.proofLabel}>
              <div className="hub-proof-row">
                <SewerIcon name="googleG" />
                <div>
                  <div className="hub-proof-score">
                    <strong>{h.reviews.rating}</strong>
                    <span className="pv-stars" role="img" aria-label={h.reviews.ratingStarsLabel}>
                      {SEWER_REVIEW.stars}
                    </span>
                  </div>
                  <span className="hub-proof-sub">{h.reviews.ratingSub}</span>
                </div>
              </div>
              <a className="hub-proof-row hub-proof-bbb" href={h.reviews.bbb.href} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={h.reviews.bbb.seal} alt={h.reviews.bbb.sealAlt} width={92} height={36} />
                <span className="hub-proof-sub">{h.reviews.bbb.label}</span>
              </a>
            </aside>
          </div>
          <div className="hub-reviews">
            <figure className="hub-quote pv-reveal" style={s('--i:0')}>
              <div aria-label={SEWER_REVIEW.starsLabel} className="pv-stars" role="img">
                {SEWER_REVIEW.stars}
              </div>
              <blockquote>{h.reviews.featured.quote}</blockquote>
              <figcaption>
                <HubReviewAuthor name={h.reviews.featured.name} />
              </figcaption>
            </figure>
            <div className="hub-side">
              {h.reviews.side.map((r, i) => (
                <div className="hub-rev pv-reveal" style={s(`--i:${i + 1}`)} key={r.name}>
                  <div aria-label={SEWER_REVIEW.starsLabel} className="pv-stars" role="img">
                    {SEWER_REVIEW.stars}
                  </div>
                  <p className="t-body-sm" style={s('margin:0 0 14px')}>{r.quote}</p>
                  <HubReviewAuthor name={r.name} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <SewerNdc context="band" />

      <section className="sec" style={s('background:#F9F3EC')}>
        <div className="wrap hub-split">
          <div className="hub-sticky">
            <span className="t-eyebrow " style={s('color:#BC0E0E')}>{h.faq.eyebrow}</span>
            <h2 className="hub-h2 t-h2" style={s('margin:12px 0 0')}>{h.faq.heading}</h2>
          </div>
          <SewerFaqList items={h.faq.items} phone={phone} />
        </div>
      </section>

      <section id="book" className="sec final-cta">
        <div className="wrap hub-final">
          <div>
            <span className="t-eyebrow " style={s('color:#BC0E0E')}>{h.final.eyebrow}</span>
            <h2 className="hub-h2 t-h2" style={s('margin:12px 0 16px')}>{h.final.heading}</h2>
            <p className="t-body pv-mute" style={s('margin:0')}>{h.final.body}</p>
          </div>
          <div className="hub-final-btns" style={s('display:flex;flex-wrap:wrap;gap:14px')}>
            <PhoneLink href={phone.href} display={phone.display} className="btn btn-hero-cta t-btn">
              {SEWER_FINAL.callPrefix}
              <PhoneNumber value={phone.display} />
            </PhoneLink>
            <ScheduleTrigger as="button" className="btn btn-outline t-btn" label={SEWER_FINAL.schedule} />
          </div>
        </div>
      </section>
    </SewerV2Root>
  );
}

function HubReviewAuthor({ name }: { name: string }) {
  return (
    <div className="review-author">
      <span className="review-avatar">
        <SewerIcon name="avatar" />
      </span>
      <div>
        <strong className="t-label" style={s('font-size:14px')}>{name}</strong>
        <div className="t-caption pv-cap">{SEWER_REVIEW.caption}</div>
      </div>
    </div>
  );
}
