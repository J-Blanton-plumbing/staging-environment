import FaqAccordion from '@/components/FaqAccordion';
import HeroNav from '@/components/HeroNav';
import { SERVICES } from '@/lib/services';
import { formatOfficeAddress, type CmsOffice } from '@/lib/cms/offices';
import {
  HANOVER_PARK_TEST,
  withPhone,
  type CopySegment,
  type PlaceholderSlot,
} from '@/lib/content/hanover-park-test';

/**
 * /hanover-park-test — ALL the page markup (Brief 180, Track D + Marketing
 * revision round 1, 2026-09-17).
 *
 * ⚠ TEMPORARY REVIEW BUILD. Noindex on purpose, zero inbound links, reachable
 * only by typing the URL. Copy source of truth:
 * `New Pages/Hanover Park city page/Hanover Park_CityPage_Copy_Rewrite.md`.
 *
 * ── Marketing revisions, rounds 1 and 2, 2026-09-17 ────────────────────────
 * Brief 180 hard rule 6 said "do not import a shared component" and Track B
 * excluded the sub-nav band. Marketing reviewed the build and REVERSED both, on
 * the principle "we don't need to create all components from scratch, we need to
 * be coherent with the website". So this file CONSUMES two shared components,
 * unmodified:
 *
 *   • `FaqAccordion`  — the site's Carmine ＋/－ accordion (as used on the city
 *     pages, /privacy-policy and /j-blanton-is-hiring), replacing the static
 *     definition list. Brief 180 D3 banned this on the grounds that "hidden copy
 *     cannot be proofread"; that concern is now covered by the automated copy
 *     diff instead, which reads the DOM and so sees every answer whether or not
 *     a panel is open.
 *   • `HeroNav`       — the shared white 4-link sub-nav strip that sits directly
 *     below the hero on every page (round 1, item 9). Chrome, not content: it
 *     carries no page copy, so it is not in the content module.
 *
 * Both are imported and rendered as-is. NEITHER IS EDITED. One cosmetic override
 * lives in `hanover-park-test.css`, scoped under `.hanover-park-test` so it
 * cannot leak: the accordion's hardcoded margins are zeroed so the page keeps
 * ONE spacing scale.
 *
 * ⚠ `CityServicesMenu` (the red OUR SERVICES dropdown) was consumed here in
 * round 1 and REMOVED AGAIN in round 2. Marketing's reason is SEO: the menu is a
 * link list and cannot carry an `<h3>` per service category, and those headings
 * are the signal that the page covers those services. The 7 copy cards are back,
 * each titled with a real `<h3>`. Do not swap them for the menu again without
 * that trade-off being re-decided. Cost of the revert: the menu's 41 internal
 * links to `/hanover-park/{service}` are gone with it.
 *
 * `@/lib/services` IS imported, but it is a lib DATA module, not a component —
 * it is where the homepage's card icons live, so the two share one source.
 *
 * ── What this file still deliberately does NOT do ──────────────────────────
 * The point of the experiment is TEXT FIRST, LAYOUT SECOND, CMS THIRD. Do not
 * "helpfully" wire any of this up early — the absence is the thing being tested:
 *
 *   • NO CMS of any kind — no `main_pages`/`city_pages` row, no seed, no
 *     `/admin` editor, no `getMainPageContent` / `getCityCmsContent` /
 *     `renderCmsBlock` / `isPageLive` / preview banner, no `rich-text-fields`
 *     entry. The only live read on the page is `getGlobalSettingsCached()`, for
 *     the phone number, and that getter already falls back to `site.ts` so the
 *     page renders with the database down.
 *   • NO shared component is MODIFIED, and none beyond the three named above is
 *     imported — not `SiteShell`, `CityHero`, `CityLocationsGrid`,
 *     `ArticleGrid`, `NoDripClubSection`, `ServiceCard`, `GoogleReviews`,
 *     `CityPageImage`. The hero, the mid CTA, the reviews and the No Drip Club
 *     block are LOCAL static markup. The navbar and footer come from the root
 *     layout / SiteShell and are consumed, not touched.
 *   • NO other site furniture: no locations grid, no article grid, no Elfsight
 *     reviews pill. (A Google map DID arrive in revision round 3 — one embedded
 *     iframe pinned on the Hanover Park office, in the Why Us section.)
 *   • NO JSON-LD. Structured data on a noindex test page is pointless and would
 *     risk a duplicate-schema collision when this copy is merged to the real URL.
 *
 * ── Heading semantics ──────────────────────────────────────────────────────
 * Exactly ONE `<h1>` (the hero). EIGHT H2s in published order — it was ten
 * until the Video section was pulled on 2026-09-17. H3s in TWO places:
 * the 7 service-card titles (section 2) and the 3 why-points (section 4). Brief
 * 180 hard rule 10 restricted H3s to section 4; revision round 2 overrode that
 * for the service cards specifically, because the H3 is the SEO signal for each
 * service category. No level is skipped anywhere.
 *
 * The reviews stay `<blockquote>` + `<figcaption>` rather than headings — a
 * reviewer's name is an attribution, not a section of the document.
 *
 * ── Brief 179, Defect 2 ────────────────────────────────────────────────────
 * `globals.css` sets `h1..h5 { … text-navy-800 }` inside `@layer base`, ON THE
 * ELEMENT. An inherited colour from a parent box always loses to that. So every
 * heading on a Carmine / Midnight band here carries its own `hp-h2--on-dark`
 * class, and `hanover-park-test.css` is UNLAYERED so those rules win. Never set
 * a heading colour only on the section wrapper.
 */

/**
 * The brief's content container. `hp-w` is the hook for the page's ONE vertical
 * rhythm rule (`hanover-park-test.css`, "THE SPACING SCALE") — blocks carry no
 * margins of their own, so there is only ever one rule to change.
 */
const CONTAINER = 'mx-auto w-[90%] lg:w-[81%] max-w-[1200px] hp-w';

/**
 * A run of copy with inline links. The `href`s are the copy document's own,
 * trailing slashes included — every one resolves through a single 301 today
 * (see the Brief 180 report). Not silently rewritten.
 */
function Copy({ segments }: { segments: CopySegment[] }) {
  return (
    <>
      {segments.map((seg, i) =>
        seg.href ? (
          <a key={i} className="hp-link" href={seg.href}>
            {seg.text}
          </a>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </>
  );
}

/**
 * A visibly labelled empty slot — NOT a stock image, not a gradient, not an AI
 * render. It reserves its real space at every breakpoint so spacing and rhythm
 * are reviewable now, before any asset exists.
 *
 * `role="img"` + `aria-label` names the pending asset. The visible label is
 * inside an element that `role="img"` makes presentational, so it is announced
 * once, not twice. There is no `alt` text because none exists yet — the copy
 * document leaves Image and Alt text blank on purpose for the creative workflow.
 */
function Placeholder({
  slot,
  className = '',
  caption,
}: {
  slot: PlaceholderSlot;
  className?: string;
  /** Extra approved copy shown under the label (the video thumbnail title). */
  caption?: string;
}) {
  return (
    <div
      role="img"
      aria-label={slot.ariaLabel}
      className={`hp-placeholder ${className}`}
      style={{ aspectRatio: String(slot.ratio) }}
    >
      <span className="hp-placeholder-label">{slot.label}</span>
      {caption && <span className="hp-placeholder-caption">{caption}</span>}
    </div>
  );
}

/**
 * Service-card icon (revision round 2, item 1 — "use the same ones we use for
 * the homepage, but in a size that fits your cards").
 *
 * The lookup is by card title against `SERVICES`, which is the SAME registry the
 * homepage `ServiceCard` reads — a lib data module, not a component, so there is
 * one source of truth for the artwork and no shared component is imported. Card
 * titles match `SERVICES[].name` exactly (Emergency, Plumbing, Sewer, Drain,
 * Water Heater, Water Quality, Commercial).
 *
 * Commercial is the one special case, exactly as on the homepage: the local icon
 * set has no building icon, so `SERVICES` points it at the Plumbing tube — which
 * would render a duplicate icon on this grid. `ServiceCard` solves that with an
 * inline building SVG lifted from the live theme (`front-page.php`); the same
 * artwork is reproduced below rather than imported, because that component is
 * not one this page may pull in.
 *
 * Sized 64px here against the homepage's 100px, and left-aligned to match the
 * card's own text alignment.
 */
const SERVICE_ICON_BY_NAME = new Map(SERVICES.map((s) => [s.name, s.iconUrl]));

/**
 * The service-category HUB for a card title (revision round 4).
 *
 * Used only for the three cards the copy rewrite leaves unlinked. Its editorial
 * notes say Emergency has "no Emergency Plumbing category page in current site
 * structure" and Plumbing is "too generic for a single accurate destination" —
 * **both are stale against this build.** Marketing corrected it on 2026-09-17:
 * they are the main service category hubs, and all three routes exist and serve
 * 200 directly (`src/app/emergency-plumbing`, `src/app/services/plumbing`,
 * `src/app/services/commercial`; none is a redirect source).
 *
 * The rule is `ServiceCard`'s own, so these three cards land exactly where the
 * homepage's cards land — `/services/{slug}`, with `emergency-plumbing` the one
 * special case that lives at the root. Derived from `SERVICES` rather than typed
 * out, so it cannot drift from the homepage.
 */
const SERVICE_SLUG_BY_NAME = new Map(SERVICES.map((s) => [s.name, s.slug]));

function categoryHubHref(name: string): string | undefined {
  const slug = SERVICE_SLUG_BY_NAME.get(name);
  if (!slug) return undefined;
  return slug === 'emergency-plumbing' ? '/emergency-plumbing' : `/services/${slug}`;
}

function ServiceIcon({ name }: { name: string }) {
  if (name === 'Commercial') {
    return (
      <svg
        className="hp-card-icon hp-card-icon--inline"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 512 512"
        aria-hidden="true"
      >
        <path
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="32"
          d="M176 416v64M80 32h192a32 32 0 0 1 32 32v412a4 4 0 0 1-4 4H48h0V64a32 32 0 0 1 32-32m240 160h112a32 32 0 0 1 32 32v256h0h-160h0V208a16 16 0 0 1 16-16"
        />
        <path
          fill="currentColor"
          d="M98.08 431.87a16 16 0 1 1 13.79-13.79a16 16 0 0 1-13.79 13.79m0-80a16 16 0 1 1 13.79-13.79a16 16 0 0 1-13.79 13.79m0-80a16 16 0 1 1 13.79-13.79a16 16 0 0 1-13.79 13.79m0-80a16 16 0 1 1 13.79-13.79a16 16 0 0 1-13.79 13.79m0-80a16 16 0 1 1 13.79-13.79a16 16 0 0 1-13.79 13.79m80 240a16 16 0 1 1 13.79-13.79a16 16 0 0 1-13.79 13.79m0-80a16 16 0 1 1 13.79-13.79a16 16 0 0 1-13.79 13.79m0-80a16 16 0 1 1 13.79-13.79a16 16 0 0 1-13.79 13.79m0-80a16 16 0 1 1 13.79-13.79a16 16 0 0 1-13.79 13.79m80 320a16 16 0 1 1 13.79-13.79a16 16 0 0 1-13.79 13.79m0-80a16 16 0 1 1 13.79-13.79a16 16 0 0 1-13.79 13.79m0-80a16 16 0 1 1 13.79-13.79a16 16 0 0 1-13.79 13.79"
        />
        <ellipse
          cx="256"
          cy="176"
          fill="currentColor"
          rx="15.95"
          ry="16.03"
          transform="rotate(-45 255.99 175.996)"
        />
        <path
          fill="currentColor"
          d="M258.08 111.87a16 16 0 1 1 13.79-13.79a16 16 0 0 1-13.79 13.79M400 400a16 16 0 1 0 16 16a16 16 0 0 0-16-16m0-80a16 16 0 1 0 16 16a16 16 0 0 0-16-16m0-80a16 16 0 1 0 16 16a16 16 0 0 0-16-16m-64 160a16 16 0 1 0 16 16a16 16 0 0 0-16-16m0-80a16 16 0 1 0 16 16a16 16 0 0 0-16-16m0-80a16 16 0 1 0 16 16a16 16 0 0 0-16-16"
        />
      </svg>
    );
  }
  const src = SERVICE_ICON_BY_NAME.get(name);
  if (!src) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="hp-card-icon" src={src} alt="" aria-hidden="true" width={64} height={64} />;
}

/**
 * Five Carmine stars on a review card (revision round 2, item 5 — match the
 * reference card layout).
 *
 * All three reviews on this page ARE 5-star: the page brief's Section 6 records
 * each as 5⭐. This is not a decorative flourish standing in for unknown data.
 * Decorative in the markup, though — the rating is stated in the section intro
 * and repeating "5 out of 5 stars" three times adds nothing for a screen reader.
 */
function Stars() {
  return (
    <span className="hp-review-stars" aria-hidden="true">
      ★★★★★
    </span>
  );
}

/**
 * The benefit tick (revision round 2, item 4) — a Carmine disc with a white
 * check, replacing the small square markers, to match the reference. Decorative:
 * the `<ul>`/`<li>` semantics already carry "this is a list of benefits".
 */
function CheckMark() {
  return (
    <span className="hp-check" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" focusable="false">
        <path d="M5 12.5 10 17.5 19 7" />
      </svg>
    </span>
  );
}

/**
 * Reviewer avatar (Marketing revision round 1, item 4).
 *
 * The same head-and-shoulders silhouette the site's own review cards use
 * (`ReviewerIcon` in `LocalOfficeCityV2.tsx`), rebuilt here because that one is
 * a private function in a component this page must not import — same artwork,
 * same visual language. Set in a Midnight disc so it reads as an avatar rather
 * than a loose glyph. Decorative: the reviewer's name is right beside it.
 */
function ReviewerAvatar() {
  return (
    <span className="hp-review-avatar" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="currentColor" focusable="false">
        <circle cx="12" cy="7" r="4" />
        <path d="M12 13c-4.42 0-8 2.46-8 5.5V21h16v-2.5c0-3.04-3.58-5.5-8-5.5Z" />
      </svg>
    </span>
  );
}

/**
 * The Hanover Park office address, for the map query (revision round 3, item 4).
 *
 * Read from the SAME global-settings object the phone number comes from, so the
 * page cannot disagree with the NAP the rest of the site renders. The record is
 * matched on city name rather than slug on purpose: the live row stores its slug
 * as `/hanover-park`, with a leading slash, which is a data quirk this page
 * should not depend on.
 *
 * The static fallback is the address on the live page today, so the map still
 * pins correctly when the DB is unreachable — the same fail-open posture
 * `getGlobalSettingsCached()` itself takes.
 */
const OFFICE_FALLBACK = '1300 Greenbrook Blvd, Suite B5, Hanover Park, IL 60133';

function hanoverParkAddress(offices: CmsOffice[]): string {
  const o = offices.find((x) => x.city?.toLowerCase() === 'hanover park');
  return o ? formatOfficeAddress(o) : OFFICE_FALLBACK;
}

export default function HanoverParkTestTemplate({
  phoneDisplay,
  phoneHref,
  offices,
}: {
  /** From `getGlobalSettingsCached()`. Never hardcoded on this page. */
  phoneDisplay: string;
  phoneHref: string;
  /** From the same settings object — used only for the map query. */
  offices: CmsOffice[];
}) {
  const C = HANOVER_PARK_TEST;

  /*
   * Keyless classic embed, built exactly as `StoreLocatorPanel` builds it for a
   * SINGLE selected office: `q` is the formatted office address on its own, `z`
   * is the zoom, and no `ll` — the classic embed centres on the query itself.
   *
   * ⚠ DO NOT prepend the business name to the address. That was tried first
   * ("J. Blanton Plumbing, Sewer & Drain, 1300 Greenbrook Blvd, Suite B5,
   * Hanover Park, IL 60133") and Google resolved the combined string to
   * LOMBARD — roughly 20 km from the office — with no J. Blanton pin at all.
   * The business name works as a `q` when it is the WHOLE query (that is how the
   * all-offices locator map pins every branch); mixed with a street address it
   * confuses the match. Address alone is the shape the store locator uses per
   * office, and it is the shape that lands.
   */
  const mapSrc =
    `https://maps.google.com/maps?hl=en&q=${encodeURIComponent(
      hanoverParkAddress(offices),
    )}&t=&z=${C.whyUs.map.zoom}&ie=UTF8&iwloc=B&output=embed`;

  return (
    <div className="hanover-park-test">
      {/* ══ 1. HERO — image half / Carmine half ════════════════════════════
          Same shape as the `localOfficeV2Hero` case in LocalOfficeCityV2.tsx,
          rebuilt locally under `hp-` class names so nothing shared is imported
          or depended on. Below 901px it stacks with the image on top; the CSS
          clears the fixed 70px navbar in both layouts. */}
      <section className="hp-hero">
        <div className="hp-hero-media">
          {/*
            The ONE real asset on the page. Plain <img> with explicit
            width/height so the hero reserves its space before load (no CLS) —
            deliberately not `CityPageImage`, whose fallback logic belongs to the
            city templates this page imports nothing from.
          */}
          {/* <!-- Provisional alt text. Final alt pending Marketing. --> */}
          <img
            className="hp-hero-image"
            src={C.hero.image.src}
            alt={C.hero.image.provisionalAlt}
            width={C.hero.image.width}
            height={C.hero.image.height}
            loading="eager"
          />
        </div>
        <div className="hp-hero-contents">
          <div className="hp-hero-w">
            {/* The page's only <h1>. Colour declared on the element — see the
                Brief 179 note in this file's header. */}
            <h1 className="hp-h1">{C.hero.h1}</h1>
            <p className="hp-hero-sub">{C.hero.subText}</p>
            {/* <!-- Marketing: the copy document's hero CTA field is literally
                 `[Phone Number]`, so the button label is the bare number. If you
                 want the site's usual "Call {number}" wording, supply it. --> */}
            <a className="hp-btn hp-btn--on-red" href={phoneHref}>
              {withPhone(C.hero.cta, phoneDisplay)}
            </a>
          </div>
        </div>
      </section>

      {/* ══ SUB-NAV — the shared 4-link strip that sits directly below the hero
          on every page (Marketing revision round 1, item 9).

          Brief 180 Track B explicitly excluded this band; Marketing reversed
          that on 2026-09-17. Imported and rendered as-is, second element after
          the hero, exactly where `LocalOfficeCityV2` puts it. Chrome, not a
          content block — it carries no page copy, so it is not in the content
          module. Note it is `hidden md:grid`: the strip does not render below
          768px, which is the shared component's own behaviour, not this page's. */}
      <HeroNav />

      {/* ══ 2. PLUMBING SERVICES — Cream #F9F3EC ═══════════════════════════
          Revision round 2, item 1: the 7 copy cards are BACK, replacing the red
          OUR SERVICES dropdown menu that round 1 put here. Marketing's reason is
          SEO — a link menu cannot carry an `<h3>` per service category, and
          those headings are the signal. Each card title is a real `<h3>` now, so
          this section and section 4 both contain H3s.

          Icons are the homepage set, looked up from `@/lib/services` (see
          `ServiceIcon`). Emergency and Plumbing stay UNLINKED plain text — no
          destination exists for either (content gap flagged in the rewrite). */}
      <section className="hp-band hp-band--cream">
        <div className={CONTAINER}>
          <p className="hp-eyebrow hp-eyebrow--on-light">{C.services.eyebrow}</p>
          <h2 className="hp-h2">{C.services.h2}</h2>
          <p className="hp-lead">{C.services.intro}</p>
          <div className="hp-cards">
            {C.services.cards.map((card) => {
              /*
                Revision round 3, item 2: the WHOLE CARD is the link, not a run of
                words inside the sentence. The href is the one the copy document
                already put on that card, taken verbatim — nothing is invented and
                nothing is retargeted.

                ALL SEVEN are clickable since revision round 4. Four take the href
                the copy document already put in their sentence, verbatim. The
                three the rewrite left unlinked — Emergency, Plumbing, Commercial —
                take their service-category HUB instead (see `categoryHubHref`):
                the rewrite's "no destination exists" notes are stale against this
                build, and Marketing confirmed these are the category hubs.

                ⚠ So the grid runs on a MIXED href system: 4 rewrite links (two of
                which are sub-pages, one a 301 to a category) + 3 category hubs.
                That is deliberate — the rewrite's own hrefs are approved copy and
                are not overridden — but it means two cards in the same grid can
                point at different levels of the site. Flagged for Marketing in the
                Brief 180 report; pointing all seven at the hubs is a one-line
                change if that is preferred.

                A linked card renders its body as PLAIN TEXT: an `<a>` inside an
                `<a>` is invalid HTML, and the whole card is now the link, so the
                inline link styling has nothing left to do. The words are unchanged.
              */
              const href = card.body.find((seg) => seg.href)?.href ?? categoryHubHref(card.title);
              const text = card.body.map((seg) => seg.text).join('');
              const inner = (
                <>
                  <ServiceIcon name={card.title} />
                  {/* The Commercial card carries the copy document's own flag:
                      <!-- Marketing flag: fixed template copy, off-persona for a
                      homeowners-only page. Swap decision pending. --> */}
                  <h3 className="hp-card-title">{card.title}</h3>
                  <p className="hp-card-body">{href ? text : <Copy segments={card.body} />}</p>
                </>
              );
              return href ? (
                <a className="hp-card hp-card--link" href={href} key={card.title}>
                  {inner}
                </a>
              ) : (
                <div className="hp-card" key={card.title}>
                  {inner}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══ 3. SUMP PUMP & BASEMENT FLOODING — White #FFFFFF ═══════════════
          Revision round 2, items 2/3: the eyebrow + H2 + body all live in the
          LEFT column, so the heading's top edge lines up with the top of the
          image on the right. Only this section and the Video section use this
          shape — Why Us deliberately keeps its full-width heading, because its
          three H3 sub-topics need the heading to span them. */}
      <section className="hp-band hp-band--white">
        <div className={CONTAINER}>
          <div className="hp-split">
            <div className="hp-split-text">
              {/* <!-- Marketing: "Most Common Service" is PROVISIONAL, not
                   approved copy. The rewrite contains no eyebrow for this
                   section — please supply the final wording. --> */}
              <p className="hp-eyebrow hp-eyebrow--on-light">{C.sumpPump.eyebrow}</p>
              <h2 className="hp-h2">{C.sumpPump.h2}</h2>
              {/* Two paragraphs (Marketing, 2026-09-17) — a readability break
                  only; no word of the approved copy changes. */}
              {C.sumpPump.body.map((para, i) => (
                <p className="hp-body" key={i}>
                  <Copy segments={para} />
                </p>
              ))}
            </div>
            <div className="hp-split-media">
              {/* <!-- Provisional alt text. Final alt pending Marketing. --> */}
              <img
                className="hp-split-photo"
                src={C.sumpPump.image.src}
                alt={C.sumpPump.image.provisionalAlt}
                width={C.sumpPump.image.width}
                height={C.sumpPump.image.height}
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ══ 4. WHY HANOVER PARK HOMEOWNERS CALL US FIRST — #F1E8DC ═════════
          The only section on the page that contains H3s. */}
      <section className="hp-band hp-band--warm">
        <div className={CONTAINER}>
          <p className="hp-eyebrow hp-eyebrow--on-light">{C.whyUs.eyebrow}</p>
          <h2 className="hp-h2">{C.whyUs.h2}</h2>
          <div className="hp-split">
            <div className="hp-split-text">
              {C.whyUs.points.map((pt) => (
                <div className="hp-why-point" key={pt.label}>
                  <h3 className="hp-h3">{pt.label}</h3>
                  <p className="hp-body">{pt.body}</p>
                </div>
              ))}
              <a className="hp-btn hp-btn--primary" href={phoneHref}>
                {withPhone(C.whyUs.cta, phoneDisplay)}
              </a>
            </div>
            <div className="hp-split-media">
              {/*
                Revision round 3, item 4 — the Hanover Park office, pinned by
                Google itself. Keyless classic embed; `mapQuery` is built from the
                exact GBP name plus the office address read from global settings,
                so this frame can never disagree with the NAP elsewhere on the site.
              */}
              <iframe
                className="hp-map"
                src={mapSrc}
                title={C.whyUs.map.title}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ══ 5. MID CTA — Carmine #BC0E0E ═══════════════════════════════════
          Marketing revision round 1, item 2: Carmine (was Midnight), copy
          LEFT-ALIGNED at the page's one container width (was a centred 820px
          block, which read as a centred section and broke the page's rhythm). */}
      <section className="hp-band hp-band--carmine hp-midcta-band">
        {/*
          Revision round 3, item 5 + round 4 revision.

          FIRST ATTEMPT (rejected): the photo was a full-bleed background across
          the whole band. The source is 1376 × 768, so at 1440px+ the band both
          UPSCALED it and cropped to the middle third — the visible result was a
          heavy zoom on an already-soft AI render, and it read as pixelated. (The
          compression was not the cause: the 60 KB re-encode is indistinguishable
          from the 259 KB source at 1:1.)

          NOW: the photo occupies the right ~45% of the band at full band height,
          so it is DOWNSCALED rather than blown up, and a horizontal gradient
          dissolves it leftward into solid Carmine. The copy sits on that solid
          red. Decorative — a CSS background, so it has no alt and is invisible
          to assistive tech by construction; the band's own Carmine sits beneath
          it, so a failed image degrades to a plain red band, not a hole.
        */}
        <div
          className="hp-midcta-media"
          aria-hidden="true"
          style={{ backgroundImage: `url('${C.midCta.backgroundImage}')` }}
        />
        <div className={CONTAINER}>
          <p className="hp-eyebrow">{C.midCta.eyebrow}</p>
          <h2 className="hp-h2 hp-h2--on-dark">{C.midCta.h2}</h2>
          <p className="hp-body hp-body--on-dark">{C.midCta.body}</p>
          {/* Disclaimer ABOVE the button, which is the copy document's own field
              order (H2 → Body → Disclaimer → CTA). Financing fine print more
              often sits under the button, but "do not re-order" outranks the
              convention and no semantics force the other way here. */}
          <p className="hp-disclaimer">{C.midCta.disclaimer}</p>
          <a className="hp-btn hp-btn--on-red" href={phoneHref}>
            {withPhone(C.midCta.cta, phoneDisplay)}
          </a>
        </div>
      </section>

      {/* ══ 6. VIDEO — REMOVED 2026-09-17 ═══════════════════════════════════
          Marketing: "take the video section out completely FOR NOW".

          TEMPORARY, so the approved copy stays in the content module under
          `video` (H2, intro, thumbnail title) rather than being deleted —
          restoring the section is a template change only. Three approved
          strings therefore do not render today; the copy diff reports them
          separately rather than absorbing the absence into a pass.

          Band pacing after the removal: Why Us (warm) → Mid CTA (Carmine) →
          Reviews (warm). Still no two identical surfaces adjacent.
      */}

      {/* ══ 7. REVIEWS — #F1E8DC ═══════════════════════════════════════════
          Three static quote cards. No Elfsight widget, no star graphics, no
          review schema. The intro is the site-wide fallback figure.

          Marketing revision round 1, item 4: the "View on Google" button is
          gone; the reviewer's NAME carries the Google link, beside a rounded
          avatar. */}
      <section className="hp-band hp-band--warm">
        <div className={CONTAINER}>
          <p className="hp-eyebrow hp-eyebrow--on-light">{C.reviews.eyebrow}</p>
          <h2 className="hp-h2">{C.reviews.h2}</h2>
          <p className="hp-lead">{C.reviews.intro}</p>
          <div className="hp-reviews">
            {C.reviews.items.map((rev) => (
              <figure className="hp-review" key={rev.name}>
                <Stars />
                {/* Straight quotes are part of the card treatment, not the copy —
                    the quoted string itself is still the rewrite's, verbatim. */}
                <blockquote className="hp-review-text">&ldquo;{rev.text}&rdquo;</blockquote>
                <figcaption className="hp-review-meta">
                  <ReviewerAvatar />
                  <span className="hp-review-id">
                    <a
                      className="hp-review-name"
                      href={rev.gbpUrl}
                      target="_blank"
                      rel="nofollow noopener"
                    >
                      {rev.name}
                    </a>
                    {/* <!-- Marketing: the reference card puts "Chicago Resident"
                         here. These three reviews are the SITE-WIDE fallback set
                         and nothing on record says where any of these people
                         live, so a residency claim would be invented. This slot
                         renders a verifiable statement instead — supply approved
                         copy or say to drop the line. --> */}
                    <span className="hp-review-source">{C.reviews.sourceLabel}</span>
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ══ 8. FAQ — White #FFFFFF ═════════════════════════════════════════
          <!-- Marketing: the copy document supplies six Q&A pairs but NO H2 for
          this section. "Frequently Asked Questions" below is a working
          placeholder, not approved copy — please supply the final heading. -->
          Marketing revision round 1, item 5: the site's own `FaqAccordion`,
          replacing the static definition list Brief 180 D3 specified. */}
      <section className="hp-band hp-band--white">
        <div className={CONTAINER}>
          <p className="hp-eyebrow hp-eyebrow--on-light">{C.faq.eyebrow}</p>
          <h2 className="hp-h2">{C.faq.h2}</h2>
          <FaqAccordion faqs={C.faq.items} />
        </div>
      </section>

      {/* ══ 9. NO DRIP CLUB — Midnight #0A1B2E ═════════════════════════════
          Local static markup, NOT the shared NoDripClubSection.
          Marketing revision round 1, item 6: dark navy (was Rosewood) and the
          benefits stacked in ONE column (was two). */}
      <section className="hp-band hp-band--midnight">
        <div className={`${CONTAINER} hp-ndc`}>
          <div className="hp-ndc-text">
            {/* An eyebrow LABEL above the real H2 — not a styled <p> standing in
                for a heading. The copy document supplies it as its own field. */}
            <p className="hp-eyebrow">{C.ndc.eyebrow}</p>
            <h2 className="hp-h2 hp-h2--on-dark">
              <Copy segments={C.ndc.h2} />
            </h2>
            <p className="hp-body hp-body--on-dark">{C.ndc.body}</p>
            <ul className="hp-benefits">
              {C.ndc.benefits.map((b) => (
                <li key={b}>
                  <CheckMark />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <a className="hp-btn hp-btn--on-navy" href={C.ndc.cta.href}>
              {C.ndc.cta.label}
            </a>
          </div>
          {/*
            Revision round 2, item 4 — the J character, on the RIGHT, facing the
            copy on his left. `jbcharacter.webp` faces the viewer's right, so
            this is a MIRRORED derivative: `public/images/hanover-park/j-ndc.webp`.

            ⚠ It is not a plain CSS `scaleX(-1)` of the shared asset, and must not
            be replaced by one. J wears the "J. Blanton PLUMBING" script wordmark
            on his chest, and a flipped wordmark is a logo violation. The asset was
            built by mirroring the figure and then flipping the logo patch back —
            the shirt is flat colour there, so the repair leaves no seam. If the
            pose is ever changed, redo the same repair; see the Brief 180 report.

            Decorative: everything it communicates is in the copy beside it, so it
            carries an empty alt and is hidden from assistive tech.
          */}
          <div className="hp-ndc-figure">
            <img
              className="hp-ndc-character"
              src="/images/hanover-park/j-ndc.webp"
              alt=""
              aria-hidden="true"
              width={1180}
              height={1604}
              loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* ══ 10. FINAL CTA — warm tint #E8DCCC ══════════════════════════════
          Marketing revision round 1, item 7: the deepest of the approved cream
          tints instead of Carmine, which ran straight into the Carmine footer
          with no seam, and the block is CENTRED — the one centred section on the
          page, deliberately, because it is the closing call to action. */}
      <section className="hp-band hp-band--deep-cream">
        <div className={`${CONTAINER} hp-center`}>
          <p className="hp-eyebrow hp-eyebrow--on-light">{C.finalCta.eyebrow}</p>
          <h2 className="hp-h2">{C.finalCta.h2}</h2>
          <p className="hp-body">{C.finalCta.text}</p>
          <a className="hp-btn hp-btn--primary" href={phoneHref}>
            {withPhone(C.finalCta.cta, phoneDisplay)}
          </a>
        </div>
      </section>
    </div>
  );
}
