import SewerV2Root from '@/components/sewer-v2/SewerV2Root';
import type { WhPage, WhSection, WhSharedContent } from '@/lib/content/water-heater-v2/types';
import { WhNode, type WhPhone } from '@/components/water-heater-v2/WhNodes';
import { WhFaqSection, WhReviewsSection, WhStickyBar, type WhRatingTexts } from '@/components/water-heater-v2/WhParts';
import WhBehaviors from '@/components/water-heater-v2/WhBehaviors';
import { EmHubHero, EmLocations } from './EmParts';
// The package's base stylesheet is the Sewer v2 stylesheet (scoped #sewer-v2); emergency-v2.css adds the
// package's page styles, scoped #sewer-v2.em-v2 so they can never reach a sewer or water heater page.
// Deliberately NOT water-heater-v2.css: the two blocks this page shares with the water heater hub (trust
// stripe, business block) came with the package's own copy of their rules.
import '@/components/sewer-v2/sewer-v2.css';
import './emergency-v2.css';

/**
 * Brief 225 — the Emergency Hub (`/emergency-plumbing`) inside the live site shell (the shared Navbar —
 * with its page-level "Call Now" variant, SiteShell — Footer and services menu: the package's own header,
 * drawer and footer are not ported).
 *
 * Section order (locked by the code module): Hero → Trust stripe → Reviews → Is Your Situation an
 * Emergency? → What to Do While You Wait → Why Homeowners Call Us → Financing → Emergency Plumbing Near
 * You → Commercial → No Drip Club → FAQ → Final CTA, then the mobile sticky call bar (decision 0.2).
 * Exactly ONE <h1> (the hero's, visible). Structured data is one @graph (src/lib/schema/emergency.ts).
 */

export interface EmViewProps {
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
    case 'locations':
      return <EmLocations section={section} />;
    default:
      return null;
  }
}

function sectionKey(sec: WhSection, i: number): string {
  if (sec.kind === 'panel') {
    const el = sec.el as { attrs?: Record<string, string | true>; cls?: string };
    return `panel:${String(el.attrs?.id ?? el.cls ?? i)}`;
  }
  return sec.kind;
}

export function EmHubView({ page, shared, phone, ratings, jsonLd }: EmViewProps) {
  return (
    <SewerV2Root className="sewer-v2 sewer-v2--hub em-v2 em-v2--hub">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <EmHubHero hero={page.hero} shared={shared} phone={phone} />
      {page.sections.map((sec, i) => (
        <Section key={sectionKey(sec, i)} section={sec} shared={shared} phone={phone} ratings={ratings} />
      ))}
      <WhStickyBar shared={shared} phone={phone} />
      <WhBehaviors root="em" />
    </SewerV2Root>
  );
}
