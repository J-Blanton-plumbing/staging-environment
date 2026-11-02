import { Fragment } from 'react';
import { parseStyle as s } from '@/components/sewer-v2/SewerNodes';
import { HeroCall } from '@/components/water-heater-v2/WhParts';
import type { WhPhone } from '@/components/water-heater-v2/WhNodes';
import type { WhHero, WhSection, WhSharedContent } from '@/lib/content/water-heater-v2/types';

/**
 * Brief 225 — the Emergency Hub's own structured parts, markup element for element as the package
 * (Build/index.html): the hero (a VISIBLE <h1> — no rotating headline on this page) and the locations
 * section (map + offices by state). Everything else on the page reuses the water heater parts.
 */

export function EmHubHero({ hero, shared, phone }: { hero: WhHero; shared: WhSharedContent; phone: WhPhone }) {
  return (
    <section className="hub-hero">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={hero.image.src} alt={hero.image.alt} width={hero.image.width} height={hero.image.height} fetchPriority="high" />
      <div className="hub-hero-in">
        <span className="t-eyebrow pv-in" style={s('--i:0;color:#F9F3EC')}>{hero.eyebrow}</span>
        <h1 className="t-h1 hub-h1 pv-in" style={s('--i:1;color:#F9F3EC;margin:14px 0 16px')}>{hero.h1}</h1>
        <p className="t-body pv-in" style={s('--i:2;color:#F9F3EC;margin:0 0 26px;max-width:56ch')}>{hero.intro}</p>
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

/** "Emergency Plumbing Near You": an office without a link (its city page is not live, §1 #8) is plain text. */
export function EmLocations({ section }: { section: Extract<WhSection, { kind: 'locations' }> }) {
  return (
    <section className="hub-map" id="locations" style={s(section.style)}>
      <div className="hub-map-frame">
        <iframe title={section.map.title} src={section.map.src} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
      </div>
      <div className="hub-map-copy">
        <span className="t-eyebrow" style={s('color:#BC0E0E')}>{section.eyebrow}</span>
        <h2 className="hub-h2 t-h2" style={s('margin:12px 0 16px')}>{section.heading}</h2>
        <p className="t-body pv-mute" style={s('margin:0 0 22px')}>{section.intro}</p>
        {section.states.map((st, i) => (
          <Fragment key={`${i}:${st.name}`}>
            <h3 className="em-state">{st.name}</h3>
            <ul className="em-offices">
              {st.offices.map((o, j) => (
                <li key={`${j}:${o.label}`}>{o.href ? <a href={o.href}>{o.label}</a> : <span>{o.label}</span>}</li>
              ))}
            </ul>
          </Fragment>
        ))}
        <p className="t-body-sm pv-mute" style={s('margin:0')}>{section.close}</p>
      </div>
    </section>
  );
}
