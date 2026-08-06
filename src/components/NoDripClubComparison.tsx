/**
 * Brief 141 (Track B / Track F) — the `comparison` No Drip Club template
 * variant's body: the `membershipComparison` block, then the redesigned
 * HOW IT WORKS on a full-bleed Carmine hex-pattern band with large numerals and
 * the two-line closing callout.
 *
 * Only genuinely variant-specific sections live here. The header, hero, hero-nav
 * strip, Elfsight reviews mount, "WHAT ARE YOU WAITING FOR?" closer and footer
 * are identical in both variants and stay in the shared shell
 * (`app/no-drip-club/page.tsx`) — both templates are permanent, so duplicated
 * markup would be a permanent maintenance cost.
 *
 * HOW IT WORKS copy is NOT forked: the heading and the three steps arrive as
 * props from the shell, from the same source the `classic` variant reads
 * (`content.how_heading` over `NDC.how`). Only the presentation differs.
 *
 * Reads ONLY `content.membership_comparison` (via the `data` prop); it must never
 * read or write the `classic` variant's `content.benefits_card`.
 */

import MembershipComparison from '@/components/MembershipComparison';
import type { GlobalSettings } from '@/lib/cms/global-settings';
import { resolveTokens } from '@/lib/cms/tokens';
import type { HowStep, InvolveMeConfig } from '@/lib/content/ndc';
import type { MembershipComparisonData } from '@/lib/cms/membership-comparison';

export default function NoDripClubComparison({
  data,
  settings,
  involveMe,
  howHeading,
  howSteps,
  callout,
}: {
  data: MembershipComparisonData;
  settings: GlobalSettings;
  involveMe: InvolveMeConfig;
  /** Shared with the `classic` variant — same copy, different presentation. */
  howHeading: string;
  howSteps: readonly HowStep[];
  /** Two-line closing callout on the Carmine band. */
  callout: readonly string[];
}) {
  return (
    <>
      <MembershipComparison data={data} settings={settings} involveMe={involveMe} />

      {/* HOW IT WORKS — full-bleed Carmine band, hex pattern from
          `/images/ndc-red-pattern.webp` (applied in ndc.css, the convention this
          codebase uses for pattern backgrounds). */}
      <section className="ndc-band">
        <div className="w81">
          <div className="ndc-band-inner">
            <p className="ndc-band-title">{howHeading}</p>
            <div className="ndc-band-steps">
              {howSteps.map((step, i) => (
                <div className="ndc-band-step" key={step.label}>
                  <p className="ndc-band-num" aria-hidden="true">{i + 1}</p>
                  <div>
                    <p className="ndc-band-step-label">{step.label}</p>
                    <p className="ndc-band-step-text">{step.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="ndc-band-callout">
              {callout.map((line) => (
                <p key={line}>{resolveTokens(line, settings)}</p>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
