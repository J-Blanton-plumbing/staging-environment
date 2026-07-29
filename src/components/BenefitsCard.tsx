/**
 * Brief 121 — the reusable Benefits Card render (registry type `benefitsCard`).
 *
 * A 1:1 port of the No Drip Club page's hardcoded "MEMBERS GET:" card
 * (Brief 12 §3 / `ndc.css`), driven by `BenefitsCardData` instead of the static
 * `NDC.card` object. The markup — `.ndc-card` wrapper, 30%-opacity
 * `no-drip-club.webp` overlay, `.i`/`.label`/`.f`/`.l`/`.r` structure, the
 * checkmark SVG, and the `sub-label` / `sub-label mt` heading rhythm — is
 * byte-identical to the previous JSX for the default 2-column case, so the
 * seeded instance renders exactly what the page rendered before this brief.
 *
 * Styling stays in `src/app/no-drip-club/ndc.css` (scoped under `.ndc-page`,
 * per the brief's "reuse ndc.css, do not rewrite" rule) — a template that
 * adopts this block later must port that card CSS to its own scope. The only
 * CSS additions are the `cols-1`/`cols-3` width overrides; `columns: 2`
 * renders the bare `.f` class exactly as before.
 *
 * Pure view, client-safe (no DB/server imports): `{{tokens}}` — e.g. the
 * price's `{{ndc_price}}` — resolve through `resolveTokens` (Brief 77) against
 * the `settings` the caller passes in, and every string renders as a plain JSX
 * text node (React escapes; no sanitizer needed).
 */

import Image from 'next/image';
import type { GlobalSettings } from '@/lib/cms/global-settings';
import { resolveTokens } from '@/lib/cms/tokens';
import {
  assignBenefitsCardColumns,
  type BenefitsCardData,
  type BenefitsCardGroup,
} from '@/lib/cms/benefits-card';

/** Fixed template art — the Carmine card's 30%-opacity overlay (Brief 12). */
const OVERLAY_IMAGE = '/images/no-drip-club.webp';
const OVERLAY_ALT = 'NDC';

/** Inline checkmark icon (matches the theme SVG used on every benefit line). */
function Check() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="m5 13l4 4L19 7"
      />
    </svg>
  );
}

/** One column's benefit groups: sub-headings + checkmark lines. */
function ColumnGroups({ groups, settings }: { groups: BenefitsCardGroup[]; settings: GlobalSettings }) {
  return (
    <>
      {groups.map((group, gi) => (
        <BenefitGroupView
          key={gi}
          group={group}
          settings={settings}
          // First group in a column sits flush; the rest get the 30px `mt` gap
          // (the exact rhythm of the original left column).
          headingClassName={gi === 0 ? 'sub-label' : 'sub-label mt'}
        />
      ))}
    </>
  );
}

/** A sub-heading followed by its checkmark benefit lines. */
function BenefitGroupView({
  group,
  settings,
  headingClassName,
}: {
  group: BenefitsCardGroup;
  settings: GlobalSettings;
  headingClassName: string;
}) {
  return (
    <>
      {group.heading && <p className={headingClassName}>{resolveTokens(group.heading, settings)}</p>}
      {group.items.map((item, i) => (
        <div className="item" key={i}>
          <div>
            <Check />
          </div>
          <p>{resolveTokens(item, settings)}</p>
        </div>
      ))}
    </>
  );
}

export default function BenefitsCard({
  data,
  settings,
}: {
  data: BenefitsCardData;
  settings: GlobalSettings;
}) {
  const columns = assignBenefitsCardColumns(data.groups, data.columns);
  // Price + footnotes close out the LAST column (the original right column).
  const last = columns.length - 1;
  // `columns: 2` must render the bare `.f` class — byte-identical to the
  // pre-block markup. The modifier class only appears for the new 1/3 layouts.
  const fClass = data.columns === 2 ? 'f' : `f cols-${data.columns}`;

  const tail = (
    <>
      {data.price.enabled && (
        <>
          <p className="sub-label mt">{resolveTokens(data.price.amount, settings)}</p>
          {data.price.caption && <p>{resolveTokens(data.price.caption, settings)}</p>}
        </>
      )}
      {data.footnotes.map((note, i) => (
        <p key={i}>{resolveTokens(note, settings)}</p>
      ))}
    </>
  );

  return (
    <div className="ndc-card">
      <Image src={OVERLAY_IMAGE} alt={OVERLAY_ALT} fill sizes="81vw" />
      <div className="i">
        {data.title && <p className="label">{resolveTokens(data.title, settings)}</p>}
        <div className={fClass}>
          {columns.map((groups, ci) =>
            ci === 0 ? (
              // First column: groups sit directly in `.l` (original markup).
              <div className="l" key={ci}>
                <ColumnGroups groups={groups} settings={settings} />
                {last === 0 && tail}
              </div>
            ) : (
              // Later columns: `.r` wraps an inner div (original markup).
              <div className="r" key={ci}>
                <div>
                  <ColumnGroups groups={groups} settings={settings} />
                  {ci === last && tail}
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
