/**
 * Brief 141 (Track D) — the `membershipComparison` block render.
 *
 * A port of the approved design's §SECTION 3
 * (`claude-design-kit/ndc-redesign/ndc-redesign-flat.html`), driven by
 * `MembershipComparisonData`. The export carried 134 inline `style=` attributes
 * and almost no classes — a Claude Design export artifact, not a target — so
 * every value lives in `src/app/no-drip-club/ndc.css` as normal cascading rules
 * (no inline styles, no `!important`).
 *
 * Semantics (Brief 141, Track D — not optional):
 *  - A real `<table>`: column headings are `<th scope="col">`, every benefit
 *    label is `<th scope="row">`.
 *  - Each check/cross pairs an `aria-hidden` SVG with visually-hidden
 *    `Included` / `Not included` text, so the matrix is readable without sight
 *    of the icons.
 *  - The `<h2>` is rendered ABOVE the table, not inside a `<thead>` `<td>` as
 *    the export had it (Track G, correction 3). The table's first column header
 *    cell is empty apart from a visually-hidden "Benefit" label. CSS lifts the
 *    column-heading row back up alongside the title so the design is unchanged —
 *    see `--ndc-mc-colhead-h` in ndc.css.
 *
 * Pure view, client-safe (no DB/server imports): `{{tokens}}` — the price cards'
 * `{{ndc_price_1yr}}` / `{{ndc_price_2yr}}` — resolve through `resolveTokens`
 * (Brief 77) against the `settings` the caller passes in, and every string
 * renders as a plain JSX text node (React escapes; no sanitizer needed).
 */

import type { GlobalSettings } from '@/lib/cms/global-settings';
import { resolveTokens } from '@/lib/cms/tokens';
import InvolveMePopup from '@/components/InvolveMePopup';
import type { InvolveMeConfig } from '@/lib/content/ndc';
import type {
  MembershipComparisonData,
  ComparisonRowData,
} from '@/lib/cms/membership-comparison';

/** Visually-hidden text alternative for a mark cell. */
function MarkLabel({ included }: { included: boolean }) {
  return <span className="ndc-vh">{included ? 'Included' : 'Not included'}</span>;
}

/** Included mark — Cream-on-Medium-Blue check. */
function CheckMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="ndc-mc-icon ndc-mc-icon-check">
      <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.6" d="m5 13l4 4L19 7" />
    </svg>
  );
}

/** Not-included mark — a muted Midnight cross (never `#000000`). */
function CrossMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="ndc-mc-icon ndc-mc-icon-cross">
      <path fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.6" d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

/** One `<tbody>` row: label (+ optional caveat, + bullet when a child) and two marks. */
function ComparisonTableRow({
  row,
  settings,
}: {
  row: ComparisonRowData;
  settings: GlobalSettings;
}) {
  // A `child: true` row with no parent before it is not an error — it simply
  // renders indented (Brief 141, Track C).
  const label = <span className="ndc-mc-label">{resolveTokens(row.label, settings)}</span>;
  const caveat = row.caveat ? (
    <span className="ndc-mc-caveat">{resolveTokens(row.caveat, settings)}</span>
  ) : null;

  return (
    <tr className={row.child ? 'ndc-mc-row ndc-mc-row-child' : 'ndc-mc-row'}>
      <th scope="row" className="ndc-mc-rowhead">
        {row.child ? (
          <span className="ndc-mc-bullet-row">
            <span aria-hidden="true" className="ndc-mc-bullet" />
            <span className="ndc-mc-labelwrap">
              {label}
              {caveat}
            </span>
          </span>
        ) : (
          <>
            {label}
            {caveat}
          </>
        )}
      </th>
      <td className="ndc-mc-mark ndc-mc-mark-member">
        {row.member ? <CheckMark /> : <CrossMark />}
        <MarkLabel included={row.member} />
      </td>
      <td className="ndc-mc-mark ndc-mc-mark-nonmember">
        {row.nonMember ? <CheckMark /> : <CrossMark />}
        <MarkLabel included={row.nonMember} />
      </td>
    </tr>
  );
}

export default function MembershipComparison({
  data,
  settings,
  involveMe,
}: {
  data: MembershipComparisonData;
  settings: GlobalSettings;
  /** The page's existing involve.me project — every Join button fires it. */
  involveMe: InvolveMeConfig;
}) {
  // 1–3 cards are supported; the count drives `grid-template-columns` through a
  // data attribute so the layout stays entirely in CSS (no inline styles).
  const priceCount = Math.min(Math.max(data.prices.length, 1), 3);

  return (
    <section className="ndc-mc">
      <div className="w81 ndc-mc-w">
        <div className="ndc-mc-inner">
          <div className="ndc-mc-card">
            <div className="ndc-mc-tabwrap">
              {/* Member-column tab: overshoots the card top and bottom. Its
                  geometry comes from the SAME custom properties as the table's
                  column widths, so the two cannot drift apart. */}
              <div className="ndc-mc-tab" aria-hidden="true" />

              <div className="ndc-mc-head">
                <h2 className="ndc-mc-title">{resolveTokens(data.title, settings)}</h2>
                {data.subtitle && (
                  <p className="ndc-mc-subtitle">{resolveTokens(data.subtitle, settings)}</p>
                )}
              </div>

              <table className="ndc-mc-table">
                <thead>
                  <tr>
                    <th scope="col" className="ndc-mc-labelhead">
                      <span className="ndc-vh">Benefit</span>
                    </th>
                    <th scope="col" className="ndc-mc-colhead ndc-mc-colhead-member">
                      <span>{resolveTokens(data.memberColumnLabel, settings)}</span>
                    </th>
                    <th scope="col" className="ndc-mc-colhead">
                      <span>{resolveTokens(data.nonMemberColumnLabel, settings)}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row, i) => (
                    <ComparisonTableRow key={i} row={row} settings={settings} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {data.closingLine && (
            <p className="ndc-mc-closing">{resolveTokens(data.closingLine, settings)}</p>
          )}

          {data.prices.length > 0 && (
            <div className="ndc-mc-prices" data-count={priceCount}>
              {data.prices.map((price, i) => (
                <div
                  key={i}
                  className={price.emphasized ? 'ndc-mc-price ndc-mc-price-best' : 'ndc-mc-price'}
                >
                  <p className="ndc-mc-term">{resolveTokens(price.termLabel, settings)}</p>
                  <p className="ndc-mc-amount">{resolveTokens(price.amount, settings)}</p>
                  {/* Both cards fire the page's EXISTING `no-drip-club` involve.me
                      project — the 1-year vs 2-year distinction is not yet
                      reflected in the signup flow (open business decision). */}
                  <InvolveMePopup
                    as="button"
                    className="ndc-mc-join"
                    label={resolveTokens(price.buttonLabel, settings)}
                    cfg={involveMe}
                  />
                </div>
              ))}
            </div>
          )}

          {data.priceFootnote && (
            <p className="ndc-mc-footnote">{resolveTokens(data.priceFootnote, settings)}</p>
          )}
        </div>
      </div>
    </section>
  );
}
