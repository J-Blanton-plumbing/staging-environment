import CharacterPanel from '@/components/CharacterPanel';
import CityPageImage from '@/components/CityPageImage';
import {
  AG_LINK,
  CANCELLATION_ROWS,
  CANCELLATION_TABLE_CAPTION,
  CONSUMER_RIGHTS_CTA,
  CONTRACT_REQUIREMENT_ROWS,
  CONTRACT_TABLE_CAPTION,
  FRAUD_CARDS,
  HEADINGS,
  HOTLINES,
  HOTLINES_TABLE_CAPTION,
  VERBATIM_INSURANCE_CANCELLATION,
  VERBATIM_LIEN_WAIVERS,
  type VerbatimBlock,
} from '@/lib/content/consumer-rights';

/**
 * The /consumer-rights UTILITY PAGE TEMPLATE (Brief 176 + Marketing revision,
 * 2026-09-14).
 *
 * ── Why this is not the city shell ─────────────────────────────────────────
 * The brief's Track B specified the /privacy-policy shell, which is the Coverage
 * Area city template with the body swapped out. Marketing reviewed the result and
 * rejected that inheritance: a service-area Google map, a Google-reviews pill and
 * a Local Office NAP box in the hero, a 40-link "OUR SERVICES" sales menu, three
 * unrelated Knowledge Hub articles and a ~150-city areas-served grid are all
 * location/conversion furniture with nothing to say about Illinois consumer law.
 * On a page whose own copy document puts "Brand presence: Neutral" on the record,
 * they actively undercut the trust the page exists to build.
 *
 * So this is a real utility template: navbar, hero, document, closing CTA,
 * footer. Nothing else. The navbar and footer still come from the shared
 * SiteShell (design.md, "Shared shells" — restyling within tokens is fine,
 * restructuring is not), so the page is never orphaned; the footer already
 * carries the full site nav and the office directory.
 *
 * ── The shape ──────────────────────────────────────────────────────────────
 *   Carmine hero    H1 + lead + the one CTA           ← the copy document's own
 *   Cream document  scope note, 6 sections              "hero" block, finally
 *   Closing panel   the shared CharacterPanel:          rendered AS a hero
 *                   J on the left, H2 + CTA on the right
 *   Page footnote   small type, on the cream surface
 *
 * The hero is the site's standard Carmine + `Wrench Filled Red BG.png` treatment
 * (globals.css `.hero .hero-contents`), so this page looks like the rest of the
 * site rather than like a one-off.
 *
 * ⚠️ BOTH CTAs are Cerulean with a 10px radius and a Midnight hover, per
 * Marketing 2026-09-15 — and both sit on Carmine surfaces, which design.md's
 * "never red on blue … and not the reverse either" bans. Measured, Cerulean on
 * Carmine is 1.20:1, so the button carries a 2px Cream border to bring its edge
 * back to 5.94:1. The departure is deliberate and on record in the report; do
 * not silently "fix" it back to the on-red token. They stay identical to each
 * other, which is what the brief requires.
 *
 * The closing section is the shared `CharacterPanel` (the same component behind
 * "Problems We Solve" and the homepage No Drip Club block), so the page ends in
 * a contained brand panel instead of a second full-width dark band that read as
 * a double footer.
 *
 * ── Two rules this file must keep ──────────────────────────────────────────
 * 1. Headings render from the `HEADINGS` constant, which the `FAQPage` JSON-LD
 *    also reads. Never inline a heading string here — the schema's `name` has to
 *    match the visible heading character for character.
 * 2. The two verbatim statutory blocks render as TEXT NODES from
 *    `VERBATIM_INSURANCE_CANCELLATION` / `VERBATIM_LIEN_WAIVERS` — never through
 *    `dangerouslySetInnerHTML`, and never from a CMS field. Block 2's disclaimer
 *    is REQUIRED to appear.
 *
 * The three tables and the six-card grid are components fed by structured data
 * rather than CMS rich text, because the shared Brief 73 allow-list admits no
 * table tags — see `@/lib/content/consumer-rights` (Brief 176, C1, Option A).
 *
 * Styling: `./consumer-rights.css`, unlayered so it beats the `@layer base`
 * heading rule in globals.css.
 */

export interface ConsumerRightsProse {
  intro: string;
  scopeNote: string;
  beforeSignIntro: string;
  precautions: string;
  cancellationIntro: string;
  cancellationAfterTable: string;
  cancellationAfterCallout: string;
  contractAfterTable: string;
  swornStatementBody: string;
  liensBody: string;
  fraudIntro: string;
  complaintIntro: string;
  fileComplaintBody: string;
  roofingBody: string;
  downloadBody: string;
  footnote: string;
}

/** Sanitized CMS rich text injected into the reading column. */
function Prose({ html, className }: { html: string; className?: string }) {
  return (
    <div
      className={className ? `cr-prose ${className}` : 'cr-prose'}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/**
 * The page's ONE call to action, rendered twice — once in the hero, once in the
 * closing panel — and identical both times: same markup, same classes, and a
 * Carmine surface behind it in both places, which is why it uses design.md's
 * on-red button (white fill, Carmine text) rather than the Cerulean primary.
 * `download` makes the browser save the PDF rather than open it in the viewer.
 */
function DownloadCta() {
  return (
    <div className="cr-cta-block">
      <a
        className="cr-cta"
        href={CONSUMER_RIGHTS_CTA.href}
        download={CONSUMER_RIGHTS_CTA.fileName}
      >
        {CONSUMER_RIGHTS_CTA.label}
      </a>
      {/*
        The source meta line ("Office of the Illinois Attorney General") was
        removed on Marketing's instruction, 2026-09-15. The attribution is not
        lost — the page footnote still names the office, the document and its
        revision date. `CONSUMER_RIGHTS_CTA.meta` is kept in the content module
        for that reason; delete it only if the footnote changes too.
      */}
    </div>
  );
}

/**
 * A horizontally scrollable table shell. `role="region"` + `tabIndex` make the
 * overflow area reachable and scrollable by keyboard (and announced), which a
 * bare `overflow-x: auto` div is not. The page body itself never scrolls
 * sideways — only this container does.
 */
function TableScroller({ label, children }: { label: string; children: React.ReactNode }) {
  // Two elements, not one: the inner div is the scroller, the outer is the
  // positioning context for the right-edge fade. The fade cannot live on the
  // scroller itself — it would scroll away with the content instead of staying
  // pinned to the visible edge.
  return (
    <div className="cr-table-scroll">
      <div className="cr-table-wrap" role="region" aria-label={label} tabIndex={0}>
        {children}
      </div>
    </div>
  );
}

/** TABLE 1 — cancellation deadlines. The deadline column is the emphasized one. */
function CancellationTable() {
  return (
    <TableScroller label={CANCELLATION_TABLE_CAPTION}>
      <table className="cr-table cr-table--deadlines">
        <caption>{CANCELLATION_TABLE_CAPTION}</caption>
        <thead>
          <tr>
            <th scope="col">Your situation</th>
            <th scope="col">You have</th>
            <th scope="col">Clock starts</th>
          </tr>
        </thead>
        <tbody>
          {CANCELLATION_ROWS.map((row) => (
            <tr key={row.situation}>
              <th scope="row">{row.situation}</th>
              {/* Exact deadlines — 3 / 15 / 5 / 30 / 10. Never rounded or reworded. */}
              <td className="cr-deadline">{row.deadline}</td>
              <td>{row.clockStarts}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableScroller>
  );
}

/** TABLE 2 — what Illinois law requires the contract to contain. */
function ContractRequirementsTable() {
  return (
    <TableScroller label={CONTRACT_TABLE_CAPTION}>
      <table className="cr-table">
        <caption>{CONTRACT_TABLE_CAPTION}</caption>
        <thead>
          <tr>
            <th scope="col">Required in the contract</th>
            <th scope="col">Why it matters to you</th>
          </tr>
        </thead>
        <tbody>
          {CONTRACT_REQUIREMENT_ROWS.map((row) => (
            <tr key={row.requirement}>
              <th scope="row">
                {row.requirement}
                {row.note && <em className="cr-note"> {row.note}</em>}
              </th>
              <td>{row.why}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableScroller>
  );
}

/** TABLE 3 — the three Consumer Fraud Hotlines. Numbers are `tel:` links. */
function HotlinesTable() {
  return (
    <TableScroller label={HOTLINES_TABLE_CAPTION}>
      <table className="cr-table cr-table--hotlines">
        <caption>{HOTLINES_TABLE_CAPTION}</caption>
        <thead>
          <tr>
            {HOTLINES.map((h) => (
              <th key={h.office} scope="col">
                {h.office}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {HOTLINES.map((h) => (
              <td key={h.office}>
                <a className="cr-tel" href={h.href}>
                  {h.number}
                </a>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </TableScroller>
  );
}

/**
 * A verbatim statutory callout: solid Midnight header bar with the block title,
 * quoted body beneath, required disclaimer (block 2 only) and the attribution
 * line in caption type — mirroring the source pamphlet's own treatment, and
 * sharing the Midnight surface with the hero and the closing band so the page
 * reads one visual language: Midnight = official, Carmine = warning, Cerulean =
 * action.
 *
 * Midnight, never Cerulean: these sit next to Carmine headings and "never red on
 * blue" applies in reverse too.
 */
function VerbatimCallout({ block }: { block: VerbatimBlock }) {
  return (
    <figure className="cr-verbatim">
      <h4 className="cr-verbatim-title">{block.title}</h4>
      <blockquote className="cr-verbatim-body">
        {block.paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
        {block.disclaimer && <p className="cr-verbatim-disclaimer">{block.disclaimer}</p>}
      </blockquote>
      <figcaption className="cr-verbatim-attr">{block.attribution}</figcaption>
    </figure>
  );
}

/**
 * VERBATIM BLOCK 1 — the insurance-claim cancellation provision. Rendered from
 * `segments` so the two italicized placeholders are markup; concatenating the
 * segments in order reproduces the source sentence exactly.
 */
function InsuranceCancellationCallout() {
  const b = VERBATIM_INSURANCE_CANCELLATION;
  return (
    <figure className="cr-verbatim">
      <h4 className="cr-verbatim-title">{b.title}</h4>
      <blockquote className="cr-verbatim-body">
        <p>
          {b.segments.map((seg, i) => (seg.em ? <em key={i}>{seg.text}</em> : <span key={i}>{seg.text}</span>))}
        </p>
      </blockquote>
      <figcaption className="cr-verbatim-attr">{b.attribution}</figcaption>
    </figure>
  );
}

/** The six warning-sign cards — 3×2 desktop → 2-up at ~900px → 1-up on mobile. */
function FraudCardGrid() {
  return (
    <ol className="cr-cards">
      {FRAUD_CARDS.map((card) => (
        <li className="cr-card" key={card.number}>
          <span className="cr-card-num" aria-hidden="true">
            {card.number}
          </span>
          <h4 className="cr-card-title">{card.title}</h4>
          <p className="cr-card-body">{card.body}</p>
        </li>
      ))}
    </ol>
  );
}

export interface ConsumerRightsTemplateProps {
  heading: string;
  /**
   * Optional hero image (CMS `hero_image`). Blank by DEFAULT and blank in the
   * seed: this template has no stock-photo slot, and the page's copy document
   * specifies no image. When Marketing does upload one the hero splits into two
   * columns; until then it stays a single clean column. The field is wired
   * end-to-end rather than left in the editor doing nothing — a CMS field with
   * no render path is the "shadowed field" defect Brief 149 existed to fix.
   */
  heroImage: string;
  prose: ConsumerRightsProse;
}

export default function ConsumerRightsTemplate({
  heading,
  heroImage,
  prose,
}: ConsumerRightsTemplateProps) {
  return (
    <article className="consumer-rights">
      {/* ── HERO — the site's standard side-by-side ──────────────────────────
             Photo left, Carmine + wrench-pattern content column right, mirroring
             `.city-page-hero` in globals.css: 45/55, 50/50 at ≤1550px, 55/45 at
             ≤1280px, stacking to content-over-image at ≤1050px. Its own `cr-`
             classes rather than the theme's, so the shared city rules are not
             touched — and without the theme's `text-transform: uppercase`, since
             the approved H1 is sentence case.

             `CityPageImage` (not next/image) is the site's defensive <img>: its
             onError swaps in the shared city fallback, so a missing or dead
             hero URL can never render a broken image here.

             Content: the copy document's own hero block — H1, lead, and the one
             CTA. No NAP box, no reviews widget, no map. ───────────────────── */}
      <header className="cr-hero">
        <div className="cr-hero-media">
          {/* Decorative: the H1 beside it already names the page. */}
          <CityPageImage className="cr-hero-image" src={heroImage} alt="" loading="eager" />
        </div>
        <div className="cr-hero-contents">
          <div className="cr-hero-w">
            <h1>{heading}</h1>
            <Prose html={prose.intro} className="cr-prose--lead" />
            <DownloadCta />
          </div>
        </div>
      </header>

      {/* ── THE DOCUMENT ─────────────────────────────────────────────────────
             Full-bleed bands alternating white / cream, the rhythm the newest
             site template (`LocalOfficeCityV2`) uses. Every band holds the SAME
             `.cr-container`, and every block inside it is 100% of that container
             — one right edge for headings, prose, tables, callouts, cards and
             the footnote alike. See the "one width" note in consumer-rights.css. */}

      <section className="cr-band cr-band--white cr-band--overlap cr-section">
        <div className="cr-container">
          {/*
            The scope note STRADDLES the hero/section seam rather than sitting in
            a band of its own — it is a note about the page, not a section of it.
            The hero and this band meet edge to edge; the callout is pulled up
            into the red by a fixed overlap (see `.cr-band--overlap` in the CSS),
            so the seam runs straight through it. Text length is free to grow:
            the overlap is fixed and the callout simply extends further down onto
            the white.
          */}
          <aside className="cr-scope-note" aria-label="Scope of this page">
            <Prose html={prose.scopeNote} />
          </aside>

          <h2>{HEADINGS.BEFORE_SIGN}</h2>
          <Prose html={prose.beforeSignIntro} />
          <Prose html={prose.precautions} className="cr-precautions" />

          <h3>{HEADINGS.CANCEL_Q}</h3>
          <Prose html={prose.cancellationIntro} />
          <CancellationTable />
          <Prose html={prose.cancellationAfterTable} />
          <InsuranceCancellationCallout />
          <Prose html={prose.cancellationAfterCallout} />
        </div>
      </section>

      <section className="cr-band cr-band--cream cr-section">
        <div className="cr-container">
          <h2>{HEADINGS.CONTRACT_REQUIREMENTS}</h2>
          <ContractRequirementsTable />
          <Prose html={prose.contractAfterTable} />
        </div>
      </section>

      <section className="cr-band cr-band--white cr-section">
        <div className="cr-container">
          <h2>{HEADINGS.LIENS}</h2>
          <h3>{HEADINGS.SWORN_STATEMENT}</h3>
          <Prose html={prose.swornStatementBody} />
          <h3>{HEADINGS.WHY_LIENS}</h3>
          <Prose html={prose.liensBody} />
          <VerbatimCallout block={VERBATIM_LIEN_WAIVERS} />
        </div>
      </section>

      <section className="cr-band cr-band--cream cr-section">
        <div className="cr-container">
          <h2>{HEADINGS.FRAUD}</h2>
          <h3>{HEADINGS.FRAUD_Q}</h3>
          <Prose html={prose.fraudIntro} />
          <FraudCardGrid />
        </div>
      </section>

      <section className="cr-band cr-band--white cr-section">
        <div className="cr-container">
          <h2>{HEADINGS.COMPLAINT}</h2>
          <Prose html={prose.complaintIntro} />

          <h3>{HEADINGS.HOTLINES}</h3>
          <HotlinesTable />

          <h3>{HEADINGS.COMPLAINT_Q}</h3>
          <Prose html={prose.fileComplaintBody} />
          {/*
            Rendered here rather than inside the CMS field above: the shared
            sanitizer forces `rel="noopener noreferrer"` onto every <a> it
            processes, which would overwrite the `rel="noopener nofollow"` the
            approved copy specifies for this link. Split at the copy document's
            own paragraph boundary, so no sentence is broken up.
          */}
          <div className="cr-prose">
            <p>
              {AG_LINK.lead}
              <a href={AG_LINK.href} target="_blank" rel="noopener nofollow">
                {AG_LINK.label}
              </a>
              {AG_LINK.trail}
            </p>
          </div>

          <h3>{HEADINGS.ROOFING}</h3>
          <Prose html={prose.roofingBody} />
        </div>
      </section>

      {/* ── CLOSING — the shared CharacterPanel: J on the left, heading + copy +
             the CTA repeat on the right. The page footnote sits in the SAME band
             directly beneath it, so panel and footnote share one surface and one
             width — they used to read as two unrelated elements. ───────────── */}
      <section className="cr-band cr-band--cream cr-closing">
        <div className="cr-container">
          <CharacterPanel
            className="cr-final-panel"
            characterClassName="hidden lg:block relative lg:w-[400px] lg:h-[520px] flex-shrink-0 self-end"
          >
            <div className="cr-final-content">
              <h2>{HEADINGS.DOWNLOAD}</h2>
              <Prose html={prose.downloadBody} />
              <DownloadCta />
            </div>
          </CharacterPanel>

          <Prose html={prose.footnote} className="cr-footnote" />
        </div>
      </section>
    </article>
  );
}
