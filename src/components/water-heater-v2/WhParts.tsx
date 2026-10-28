import { PhoneLink, PhoneNumber } from '@/components/PhoneLink';
import { parseStyle as s } from '@/components/sewer-v2/SewerNodes';
import type { SewerFaq } from '@/lib/content/sewer-v2/types';
import type { WhGallery, WhHero, WhReview, WhSection, WhSharedContent } from '@/lib/content/water-heater-v2/types';
import { WH_UI } from '@/lib/content/water-heater-v2/ui';
import { WhIcon } from './WhIcon';
import { phoneLabel, WhRichText, type WhPhone } from './WhNodes';

/**
 * Brief 222 — the structured parts of the water heater pages, markup element for element as the
 * package: heroes, the rating card, reviews (hub + spoke, with the optional job-photo gallery), FAQs,
 * the "Other Water Heater Services" rows, the in-content financing panel and the mobile sticky bar.
 */

/** The rating card's three texts with Brief 221's company tokens resolved; null = no company row yet. */
export interface WhRatingTexts {
  rating: string;
  starsLabel: string;
  sub: string;
}

/** `Fix It With Financing As Low As 0%` → the last two spaces non-breaking (the package's no-widow heading). */
export function noWidow(text: string): string {
  const i = text.lastIndexOf(' ');
  const j = i > 0 ? text.lastIndexOf(' ', i - 1) : -1;
  if (j < 0) return text;
  return `${text.slice(0, j)} ${text.slice(j + 1, i)} ${text.slice(i + 1)}`;
}

// ── heroes ────────────────────────────────────────────────────────────────────────

function Rotator({ hero }: { hero: WhHero }) {
  return (
    <span className="wh-rot" data-rotate="">
      {hero.words.map((w, i) => (
        <span key={`${i}:${w}`} className={i === 0 ? 'wh-rot-accent is-on' : 'wh-rot-accent'}>
          {w}
        </span>
      ))}
    </span>
  );
}

function HeroCall({ phone, badge24Label }: { phone: WhPhone; badge24Label: string }) {
  return (
    <>
      <PhoneLink href={phone.href} display={phone.display} className="btn btn-hero-cta t-btn">
        <WhIcon name="phone20" />
        <PhoneNumber value={phone.display} />
      </PhoneLink>
      <span className="badge24" role="img" aria-label={badge24Label}>
        <WhIcon name="badge24" />
      </span>
    </>
  );
}

export function WhSpokeHero({ hero, shared, phone }: { hero: WhHero; shared: WhSharedContent; phone: WhPhone }) {
  return (
    <section className="ss-hero">
      <div className="hero-pattern" />
      <div className="ss-hero-in">
        <div className="ss-hero-copy">
          <nav className="ss-crumb pv-in" style={s('--i:0')} aria-label={WH_UI.breadcrumb}>
            <a href={shared.crumbParent.href}>{shared.crumbParent.label}</a>
            <span aria-hidden="true">/</span>
            <span>{hero.crumb}</span>
          </nav>
          <span className="t-eyebrow hero-eyebrow pv-in" style={s('--i:1')}>{hero.eyebrow}</span>
          <h1 className="sr-only">{hero.h1}</h1>
          <p className="t-h1 pv-in" data-rotate-host="" aria-hidden="true" style={s('--i:2;color:var(--c-cream);margin:0')}>
            {hero.lead}
            <Rotator hero={hero} />
          </p>
          <p className="t-body pv-in" style={s('--i:3;color:var(--c-cream);margin:0;max-width:56ch')}>{hero.intro}</p>
          <div className="hero-cta pv-in" style={s('--i:4')}>
            <HeroCall phone={phone} badge24Label={shared.badge24Label} />
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="ss-hero-img pv-in" style={s('--i:3')} src={hero.image.src} alt={hero.image.alt} fetchPriority="high" />
      </div>
    </section>
  );
}

export function WhHubHero({ hero, shared, phone }: { hero: WhHero; shared: WhSharedContent; phone: WhPhone }) {
  return (
    <section className="hub-hero">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={hero.image.src} alt={hero.image.alt} fetchPriority="high" />
      <div className="hub-hero-in">
        <span className="t-eyebrow pv-in" style={s('--i:0;color:#F9F3EC')}>{hero.eyebrow}</span>
        <h1 className="sr-only">{hero.h1}</h1>
        <p className="t-h1 hub-h1 pv-in" data-rotate-host="" aria-hidden="true" style={s('--i:1;color:#F9F3EC;margin:14px 0 16px')}>
          {hero.lead}
          <Rotator hero={hero} />
        </p>
        <p className="t-body pv-in" style={s('--i:2;color:#F9F3EC;margin:0 0 26px;max-width:60ch')}>{hero.intro}</p>
        <div className="pv-in" style={s('--i:3')}>
          <div className="hero-cta">
            <HeroCall phone={phone} badge24Label={shared.badge24Label} />
          </div>
        </div>
        <nav className="hub-pills pv-in" style={s('--i:4')} aria-label={shared.quickLinks.ariaLabel}>
          {shared.quickLinks.links.map((l) => (
            <a key={l.href} href={l.href}>{l.label}</a>
          ))}
        </nav>
      </div>
    </section>
  );
}

// ── rating card ───────────────────────────────────────────────────────────────────

export function WhProof({ shared, ratings, spoke }: { shared: WhSharedContent; ratings: WhRatingTexts | null; spoke: boolean }) {
  const p = shared.proof;
  return (
    <aside className={spoke ? 'hub-proof ss-proof' : 'hub-proof'} aria-label={p.ariaLabel}>
      {ratings ? (
        <div className="hub-proof-row">
          <WhIcon name="googleG" />
          <div>
            <div className="hub-proof-score">
              <strong>{ratings.rating}</strong>
              <span className="pv-stars" role="img" aria-label={ratings.starsLabel}>
                {shared.review.stars}
              </span>
            </div>
            <span className="hub-proof-sub">{ratings.sub}</span>
          </div>
        </div>
      ) : null}
      <a className="hub-proof-row hub-proof-bbb" href={p.bbb.href} target="_blank" rel="noreferrer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.bbb.seal} alt={p.bbb.sealAlt} width={92} height={36} />
        <span className="hub-proof-sub">{p.bbb.label}</span>
      </a>
    </aside>
  );
}

// ── reviews ───────────────────────────────────────────────────────────────────────

function caption(shared: WhSharedContent, r: WhReview) {
  return r.location ? `${shared.review.caption} · ${r.location}` : shared.review.caption;
}

function Stars({ shared, hub }: { shared: WhSharedContent; hub?: boolean }) {
  return hub ? (
    <div aria-label={shared.review.starsLabel} className="pv-stars" role="img">
      {shared.review.stars}
    </div>
  ) : (
    <div className="pv-stars" role="img" aria-label={shared.review.starsLabel}>
      {shared.review.stars}
    </div>
  );
}

function SpokeAuthor({ r, shared }: { r: WhReview; shared: WhSharedContent }) {
  const name = (
    <strong className="t-label" style={s('font-size:14px')}>
      {r.name}
    </strong>
  );
  return (
    <div className="review-author">
      <span className="review-avatar">
        <WhIcon name="avatar" />
      </span>
      <div>
        {r.href ? (
          <a href={r.href} rel="noreferrer" target="_blank">
            {name}
          </a>
        ) : (
          name
        )}
        <div className="t-caption" style={s('color:var(--c-slate)')}>{caption(shared, r)}</div>
      </div>
    </div>
  );
}

function HubAuthor({ r, shared }: { r: WhReview; shared: WhSharedContent }) {
  return (
    <div className="review-author">
      <span className="review-avatar">
        <WhIcon name="avatar" />
      </span>
      <div>
        {r.href ? (
          <a className="t-label" style={s('font-size:14px;color:inherit;text-decoration:none')} href={r.href} target="_blank" rel="noreferrer">
            {r.name}
          </a>
        ) : (
          <strong className="t-label" style={s('font-size:14px')}>{r.name}</strong>
        )}
        <div className="t-caption pv-cap">{caption(shared, r)}</div>
      </div>
    </div>
  );
}

/** `/_next/image` thumbnail of a site image (the Next image pipeline); other hosts use the photo itself. */
function thumbSrc(src: string): string {
  return src.startsWith('/') && !src.startsWith('//') ? `/_next/image?url=${encodeURIComponent(src)}&w=256&q=70` : src;
}

function JobReview({ r, gallery, shared }: { r: WhReview; gallery: WhGallery; shared: WhSharedContent }) {
  const n = gallery.photos.length;
  const first = gallery.photos[0];
  return (
    <article className="ss-rev ss-rev--job" aria-label={gallery.label}>
      <div className="rj-gallery" data-rj-gallery="">
        <div className="rj-stage">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="rj-main" src={first.src} alt={first.alt} width={1200} height={800} loading="lazy" decoding="async" />
          <button className="rj-nav rj-prev" type="button" aria-label={WH_UI.galleryPrev}>
            <WhIcon name="chevronLeft" />
          </button>
          <button className="rj-nav rj-next" type="button" aria-label={WH_UI.galleryNext}>
            <WhIcon name="chevronRight" />
          </button>
          <span className="rj-count" aria-live="polite">
            <span data-rj-n="">1</span>
            {WH_UI.galleryCount(n)}
          </span>
        </div>
        <div className="rj-thumbs">
          {gallery.photos.map((p, i) => (
            <button
              key={`${i}:${p.src}`}
              className="rj-thumb"
              type="button"
              data-src={p.src}
              data-alt={p.alt}
              aria-label={WH_UI.galleryThumb(i + 1, n)}
              aria-current={i === 0 ? 'true' : undefined}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumbSrc(p.src)} alt="" width={120} height={80} loading="lazy" decoding="async" />
            </button>
          ))}
        </div>
      </div>
      <div className="rj-body">
        <Stars shared={shared} />
        <p className="t-body-sm" style={s('margin:0 0 14px')}>{r.quote}</p>
        <SpokeAuthor r={r} shared={shared} />
      </div>
    </article>
  );
}

export function WhReviewsSection({
  section,
  shared,
  ratings,
}: {
  section: Extract<WhSection, { kind: 'reviews' }>;
  shared: WhSharedContent;
  ratings: WhRatingTexts | null;
}) {
  if (section.layout === 'hub') {
    const [featured, ...side] = section.items;
    return (
      <section className={section.cls} id="reviews" style={s(section.style)}>
        <div className="wrap">
          <div className="hub-rev-head">
            <div style={s('max-width:780px')}>
              <span className="t-eyebrow" style={s('color:#BC0E0E')}>{section.eyebrow}</span>
              <h2 className="hub-h2 t-h2" style={s('margin:12px 0 40px')}>{section.heading}</h2>
            </div>
            <WhProof shared={shared} ratings={ratings} spoke={false} />
          </div>
          <div className="hub-reviews">
            {featured ? (
              <figure className="hub-quote pv-reveal" style={s('--i:0')}>
                <Stars shared={shared} hub />
                <blockquote>{featured.quote}</blockquote>
                <figcaption>
                  <HubAuthor r={featured} shared={shared} />
                </figcaption>
              </figure>
            ) : null}
            <div className="hub-side">
              {side.map((r, i) => (
                <div className="hub-rev pv-reveal" style={s(`--i:${i + 1}`)} key={`${i}:${r.name}`}>
                  <Stars shared={shared} hub />
                  <p className="t-body-sm" style={s('margin:0 0 14px')}>{r.quote}</p>
                  <HubAuthor r={r} shared={shared} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }
  const gallery = section.gallery && section.gallery.photos.length > 0 ? section.gallery : null;
  return (
    <section className={section.cls} id="reviews" style={s(section.style)}>
      <div className="ss-head ss-head--proof">
        <div>
          <span className="t-eyebrow" style={s('color:var(--c-carmine)')}>{section.eyebrow}</span>
          <h2 className="t-h2" style={s('margin:10px 0 0')}>{section.heading}</h2>
        </div>
        <WhProof shared={shared} ratings={ratings} spoke />
      </div>
      <div className="ss-revs">
        {section.items.map((r, i) =>
          i === 0 && gallery ? (
            <JobReview key={`${i}:${r.name}`} r={r} gallery={gallery} shared={shared} />
          ) : (
            <div className="ss-rev" key={`${i}:${r.name}`}>
              <Stars shared={shared} />
              <p className="t-body-sm" style={s('margin:0 0 14px')}>{r.quote}</p>
              <SpokeAuthor r={r} shared={shared} />
            </div>
          )
        )}
      </div>
    </section>
  );
}

// ── FAQ ───────────────────────────────────────────────────────────────────────────

function FaqList({ items, phone }: { items: readonly SewerFaq[]; phone: WhPhone }) {
  return (
    <div style={s('display:flex;flex-direction:column;gap:12px')}>
      {items.map((f, i) => (
        <div className="faq-item2" key={`${i}:${f.q}`}>
          <button className="faq-q" type="button" aria-expanded="false" aria-controls={`faq-p${i + 1}`}>
            <span className="faq-q-text">{f.q}</span>
            <span className="faq-plus" aria-hidden="true">
              +
            </span>
          </button>
          <div className="faq-panel" id={`faq-p${i + 1}`}>
            <p className="faq-preview">
              <WhRichText value={f.preview} phone={phone} />
            </p>
            <p className="faq-full">
              <WhRichText value={f.full} phone={phone} />
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function WhFaqSection({ section, phone }: { section: Extract<WhSection, { kind: 'faq' }>; phone: WhPhone }) {
  if (section.layout === 'hub') {
    return (
      <section className={section.cls} id="faq" style={s(section.style)}>
        <div className="wrap hub-split">
          <div className="hub-sticky">
            <span className="t-eyebrow" style={s('color:#BC0E0E')}>{section.eyebrow}</span>
            <h2 className="hub-h2 t-h2" style={s('margin:12px 0 0')}>{section.heading}</h2>
          </div>
          <FaqList items={section.items} phone={phone} />
        </div>
      </section>
    );
  }
  return (
    <section className={section.cls} id="faq" style={s(section.style)}>
      <div className="ss-head">
        <span className="t-eyebrow" style={s('color:var(--c-carmine)')}>{section.eyebrow}</span>
        <h2 className="t-h2" style={s('margin:10px 0 0')}>{section.heading}</h2>
      </div>
      <FaqList items={section.items} phone={phone} />
    </section>
  );
}

// ── "Other Water Heater Services" rows ────────────────────────────────────────────

export function WhServicesSection({ section, phone }: { section: Extract<WhSection, { kind: 'services' }>; phone: WhPhone }) {
  const e = section.emergency;
  return (
    <section className={section.cls} id="services" style={s(section.style)}>
      <div className="ss-head">
        <span className="t-eyebrow" style={s('color:var(--c-carmine)')}>{section.eyebrow}</span>
        <h2 className="t-h2" style={s('margin:10px 0 0')}>{section.heading}</h2>
      </div>
      <div className="ss-rows">
        {section.items.map((r, i) => (
          <article className="ss-row" key={`${i}:${r.href}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="pv-img ss-thumb" src={r.image} alt={r.alt} loading="lazy" />
            <div>
              <h3 className="svc-title">{r.title}</h3>
              <p className="svc-desc">{r.desc}</p>
            </div>
            <a className="svc-cta" href={r.href} aria-label={WH_UI.learnMoreAbout(r.title)}>
              {`${WH_UI.learnMore} `}
              <span aria-hidden="true">&rarr;</span>
            </a>
          </article>
        ))}
        <article className="ss-row ss-row--emergency">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="pv-img ss-thumb" src={e.image} alt={e.alt} loading="lazy" />
          <div>
            <h3 className="svc-title">{e.title}</h3>
            <p className="svc-desc">{e.desc}</p>
          </div>
          <PhoneLink href={phone.href} display={phone.display} className="svc-cta-onred">
            {e.cta}
          </PhoneLink>
        </article>
      </div>
    </section>
  );
}

// ── financing ─────────────────────────────────────────────────────────────────────

/** Index pages: the in-content financing panel (the hub's red band, as a panel). Fixed shared copy. */
export function WhFinancingPanel({ section, shared, phone }: { section: Extract<WhSection, { kind: 'financing' }>; shared: WhSharedContent; phone: WhPhone }) {
  if (!section.enabled) return null;
  const f = shared.financing;
  return (
    <section className="ss-panel ss-finp" id="financing" style={s(section.style)} aria-labelledby="financing-h">
      <div className="ss-finp-copy">
        <span className="t-eyebrow" style={s('color:#F9F3EC')}>{f.eyebrow}</span>
        <h2 className="t-h2" id="financing-h" style={s('color:#F9F3EC;margin:12px 0 10px')}>{noWidow(f.heading)}</h2>
        <p className="t-body-sm" style={s('color:#F9F3EC;margin:0 0 8px')}>{f.body}</p>
        <p className="t-caption" style={s('color:#F9F3EC;opacity:.75;margin:0 0 20px;font-size:13px;line-height:1.5')}>{f.note}</p>
        <PhoneLink href={phone.href} display={phone.display} className="btn btn-onred t-btn">
          {f.cta}
        </PhoneLink>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="ss-finp-img" loading="lazy" decoding="async" width={560} height={373} src={f.image} alt={f.alt} />
    </section>
  );
}

/** Standard pages: the rail's financing card. */
export function WhFinancingCard({ order, shared, phone }: { order: number; shared: WhSharedContent; phone: WhPhone }) {
  const f = shared.financing;
  return (
    <div className="ss-fin" style={s(`--o:${order}`)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={f.image}
        alt={f.alt}
        style={s('width:calc(100% + 40px);height:140px;object-fit:cover;border-radius:14px 14px 0 0;margin:-20px -20px 16px -20px;display:block')}
      />
      <h2 className="t-h4">{f.heading}</h2>
      <p className="t-body-sm">{f.body}</p>
      <p className="t-caption fin-note">{f.note}</p>
      <PhoneLink href={phone.href} display={phone.display} className="btn btn-hero-cta t-btn">
        {f.cta}
      </PhoneLink>
    </div>
  );
}

/** The Emergency card (rail). On Index pages it shows only on screens at least 880px tall (CSS). */
export function WhCallCard({ shared, phone, optional }: { shared: WhSharedContent; phone: WhPhone; optional: boolean }) {
  return (
    <div className={optional ? 'ss-call ss-call--opt' : 'ss-call'}>
      <h2 className="t-label" style={s('font-size:20px;margin:0')}>{shared.call.heading}</h2>
      <p className="t-body-sm" style={s('margin:0;color:var(--c-cream)')}>{shared.call.body}</p>
      <PhoneLink href={phone.href} display={phone.display} className="btn btn-hero-cta t-btn">
        <WhIcon name="phone20" />
        {shared.call.cta}
      </PhoneLink>
    </div>
  );
}

export function WhStickyBar({ shared, phone }: { shared: WhSharedContent; phone: WhPhone }) {
  return (
    <div className="ss-sticky-cta">
      <div className="ss-sticky-cta-text">
        <strong>{shared.sticky.title}</strong>
        <span>{shared.sticky.sub}</span>
      </div>
      <PhoneLink href={phone.href} display={phone.display} className="btn btn-hero-cta t-btn" aria-label={phoneLabel(shared.sticky.ariaLabel, phone)}>
        <WhIcon name="phone18" />
        {shared.sticky.cta}
      </PhoneLink>
    </div>
  );
}
