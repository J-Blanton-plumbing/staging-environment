/**
 * Brief 141 (Track B) — the `classic` No Drip Club template variant's body.
 *
 * A PURE MOVE of the variant-specific markup that used to sit inline in
 * `app/no-drip-club/page.tsx`: the Brief 121 benefits card, the standalone
 * "SIGN UP" pill, and today's cream-background HOW IT WORKS. No restyling, no
 * cleanup, no reordering — the served HTML is byte-identical to the pre-Brief-141
 * page (verified by diffing the served output, not by eye).
 *
 * Returns a FRAGMENT on purpose: the shared shell owns the `.cream > .w81`
 * wrapper as well as the reviews mount and the "WHAT ARE YOU WAITING FOR?"
 * closer that follow this markup inside it, so the DOM nesting is unchanged.
 *
 * The `classic` variant is permanent and first-class — not deprecated, not
 * frozen. It reads ONLY `content.benefits_card`; it must never read or write the
 * `comparison` variant's `content.membership_comparison`.
 */

import BenefitsCard from '@/components/BenefitsCard';
import InvolveMePopup from '@/components/InvolveMePopup';
import { NDC, type HowStep, type InvolveMeConfig } from '@/lib/content/ndc';
import type { GlobalSettings } from '@/lib/cms/global-settings';
import type { BenefitsCardData } from '@/lib/cms/benefits-card';

export default function NoDripClubClassic({
  benefitsCard,
  settings,
  involveMe,
  howHeading,
  howSteps,
}: {
  benefitsCard: BenefitsCardData;
  settings: GlobalSettings;
  involveMe: InvolveMeConfig;
  /** Shared with the `comparison` variant — same copy, different presentation. */
  howHeading: string;
  howSteps: readonly HowStep[];
}) {
  return (
    <>
      {/* NDC benefits card — Brief 121 `benefitsCard` block */}
      <BenefitsCard data={benefitsCard} settings={settings} />

      {/* SIGN UP — Cerulean pill, involve.me popup */}
      <InvolveMePopup label={NDC.signUpCta} className="ndc-blue-button link-button" cfg={involveMe} />

      {/* HOW IT WORKS */}
      <p className="red-text ndc-red-text-center">{howHeading}</p>
      <div className="ndc-how-it-works">
        {howSteps.map((step) => (
          <div key={step.label}>
            <p className="label">{step.label}</p>
            <p className="text">{step.text}</p>
          </div>
        ))}
      </div>
    </>
  );
}
