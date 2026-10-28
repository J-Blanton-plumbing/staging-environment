import SewerV2Root from '@/components/sewer-v2/SewerV2Root';
import type { WhPage, WhSection, WhSharedContent } from '@/lib/content/water-heater-v2/types';
import { WH_UI } from '@/lib/content/water-heater-v2/ui';
import { WhNode, type WhPhone } from './WhNodes';
import { WhIcon } from './WhIcon';
import {
  WhCallCard,
  WhFaqSection,
  WhFinancingCard,
  WhFinancingPanel,
  WhHubHero,
  WhReviewsSection,
  WhServicesSection,
  WhSpokeHero,
  WhStickyBar,
  type WhRatingTexts,
} from './WhParts';
import WhBehaviors from './WhBehaviors';
// The package's base stylesheet is the Sewer v2 stylesheet (scoped #sewer-v2); water-heater-v2.css adds
// the package's water-heater.css, scoped #sewer-v2.wh-v2 so it can never reach a sewer page.
import '@/components/sewer-v2/sewer-v2.css';
import './water-heater-v2.css';

/**
 * Brief 222 — the Water Heater Cluster v1 pages inside the live site shell (the shared Navbar, Footer
 * and services menu: the package's own header, drawer and footer are not ported).
 *
 *   WhServiceView — WH Service Page, Standard (Repair, Installation, Maintenance) and Index (Tankless,
 *                   Commercial): hero, quick links, the main column, the rail, the mobile sticky bar;
 *   WhHubView     — the WH Hub (`/services/water-heater`).
 *
 * Exactly ONE <h1> (the sr-only one); the visible headline is an aria-hidden <p> whose market name
 * WhBehaviors rotates. Structured data is one @graph (src/lib/schema/water-heater.ts), passed in.
 */

export interface WhViewProps {
  page: WhPage;
  shared: WhSharedContent;
  phone: WhPhone;
  ratings: WhRatingTexts | null;
  jsonLd: Record<string, unknown>;
}

function Section({ section, shared, phone, ratings }: { section: WhSection; shared: WhSharedContent; phone: WhPhone; ratings: WhRatingTexts | null }) {
  switch (section.kind) {
    case 'panel':
      return <WhNode node={section.el} phone={phone} />;
    case 'reviews':
      return <WhReviewsSection section={section} shared={shared} ratings={ratings} />;
    case 'faq':
      return <WhFaqSection section={section} phone={phone} />;
    case 'services':
      return <WhServicesSection section={section} phone={phone} />;
    case 'financing':
      return <WhFinancingPanel section={section} shared={shared} phone={phone} />;
  }
}

function sectionKey(sec: WhSection, i: number): string {
  if (sec.kind === 'panel') {
    const el = sec.el as { attrs?: Record<string, string | true>; cls?: string };
    return `panel:${String(el.attrs?.id ?? el.cls ?? i)}`;
  }
  return sec.kind;
}

function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

export function WhServiceView({ page, shared, phone, ratings, jsonLd }: WhViewProps) {
  const rail = page.rail;
  const index = page.template === 'wh-index';
  return (
    <SewerV2Root className={`sewer-v2 sewer-v2--service wh-v2 wh-v2--${index ? 'index' : 'standard'}`}>
      <JsonLd data={jsonLd} />
      <WhSpokeHero hero={page.hero} shared={shared} phone={phone} />

      <nav className="jbp-subnav" aria-label={shared.quickLinks.ariaLabel}>
        {shared.quickLinks.links.map((l) => (
          <a key={l.href} href={l.href}>{l.label}</a>
        ))}
      </nav>

      <div className="ss-shell">
        <div className="ss-main">
          {page.sections.map((sec, i) => (
            <Section key={sectionKey(sec, i)} section={sec} shared={shared} phone={phone} ratings={ratings} />
          ))}
        </div>
        {rail ? (
          index ? (
            <aside className="ss-rail ss-rail--toc" aria-label={WH_UI.railIndexLabel}>
              {rail.toc ? (
                <details className="ss-toc" data-toc="" open>
                  <summary className="ss-toc-sum">
                    <span className="t-eyebrow">{rail.toc.label}</span>
                    <WhIcon name="chevronDown" />
                  </summary>
                  <nav aria-label={rail.toc.label}>
                    <ol className="ss-toc-list">
                      {rail.toc.items.map((t) => (
                        <li key={t.href}>
                          <a href={t.href}>{t.label}</a>
                        </li>
                      ))}
                    </ol>
                  </nav>
                </details>
              ) : null}
              <WhNode node={rail.trust} phone={phone} />
              <WhCallCard shared={shared} phone={phone} optional />
            </aside>
          ) : (
            <aside className="ss-rail" aria-label={WH_UI.railStandardLabel}>
              <WhCallCard shared={shared} phone={phone} optional={false} />
              <WhNode node={rail.trust} phone={phone} />
              <WhFinancingCard order={rail.financingOrder} shared={shared} phone={phone} />
            </aside>
          )
        ) : null}
      </div>

      <WhStickyBar shared={shared} phone={phone} />
      <WhBehaviors />
    </SewerV2Root>
  );
}

export function WhHubView({ page, shared, phone, ratings, jsonLd }: WhViewProps) {
  return (
    <SewerV2Root className="sewer-v2 sewer-v2--hub wh-v2 wh-v2--hub">
      <JsonLd data={jsonLd} />
      <WhHubHero hero={page.hero} shared={shared} phone={phone} />
      {page.sections.map((sec, i) => (
        <Section key={sectionKey(sec, i)} section={sec} shared={shared} phone={phone} ratings={ratings} />
      ))}
      <WhStickyBar shared={shared} phone={phone} />
      <WhBehaviors />
    </SewerV2Root>
  );
}

