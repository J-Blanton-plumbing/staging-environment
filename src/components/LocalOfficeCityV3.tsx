import FaqAccordion from '@/components/FaqAccordion';
import HeroNav from '@/components/HeroNav';
import { SERVICES } from '@/lib/services';
import { formatOfficeAddress, type CmsOffice } from '@/lib/cms/offices';
import { CANONICAL_BASE } from '@/lib/seo';
import { withPhone } from '@/lib/content/cities/v3';
import type { CityV3Content, CopySegment } from '@/types/city-v3';
/*
 * ⚠ THIS IMPORT LOADS ON EVERY `/{city}` PAGE, NOT JUST V3 ONES — measured, not
 * assumed (Brief 181, Track G3).
 *
 * The App Router hoists a component's CSS import into its ROUTE's stylesheet
 * bundle at build time. `[city]/page.tsx` imports this component statically, so
 * the `[city]` route carries this file whether the request resolves to V3,
 * Coverage Area, V1 or V2. The other 248 city pages therefore gain one
 * `<link rel="stylesheet">` they do not use.
 *
 * That cost is accepted, for want of a better option. Every rule in the file is
 * scoped under `.local-office-v3`, so nothing MATCHES on a non-V3 page and no
 * page's rendering changes — only its head. The alternatives were worse: folding
 * the rules into `globals.css` would ship them on every page of the site rather
 * than every city page, and inlining them in a `<style>` tag would make the
 * stylesheet uncacheable and contradict Brief 181 B1, which names this file.
 * Conditional CSS imports do not exist in the App Router.
 *
 * Brief 182 should revisit this: once V3 is a CMS template rather than one page,
 * the honest fix is a route segment that only V3 cities resolve into.
 */
import './local-office-city-v3.css';

/**
 * Local Office City V3 — ALL the page markup.
 *
 * Brief 180 built this as `/hanover-park-test`, a noindex review URL, through
 * five Marketing revision rounds on 2026-09-17. Brief 181 promoted it to a real
 * city template: same markup, rendered by the shared `[city]` builder for any
 * city whose `city_pages.template_type` is `local-office-v3`.
 *
 * Copy source of truth:
 * `New Pages/Hanover Park city page/Hanover Park_CityPage_Copy_Rewrite.md`.
 *
 * ── WHAT BRIEF 181 CHANGED HERE ────────────────────────────────────────────
 * Hard rule 1 was "the approved copy, section order and layout ship unchanged",
 * so the JSX below is the review page's, with four edits and no others:
 *   • PROPS. Was `{ phoneDisplay, phoneHref, offices }` off a bespoke route; now
 *     `{ city, content, settings }` off the `[city]` builder.
 *   • The root class is `.local-office-v3` (was `.hanover-park-test`).
 *   • The 7 service cards read `card.href` instead of deriving a destination
 *     from whichever body segment happened to carry one (D4).
 *   • A `BreadcrumbList` JSON-LD block, and `questionHeadingLevel="h3"` on the
 *     FAQ accordion (D2/D6). Both are invisible — see their own notes below.
 * The office address lookup was generalised from a hardcoded "hanover park" to
 * `content.officeCity`, which is the same lookup with the city as data.
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
 * Both are imported and rendered as-is. `FaqAccordion` gained ONE optional prop
 * in Brief 181 (`questionHeadingLevel`), whose default reproduces today's markup
 * exactly, so no other page that renders it moved. One cosmetic override lives
 * in `local-office-city-v3.css`, scoped under `.local-office-v3` so it cannot
 * leak: the accordion's hardcoded margins are zeroed so the page keeps ONE
 * spacing scale.
 *
 * ⚠ `CityServicesMenu` (the red OUR SERVICES dropdown) was consumed here in
 * round 1 and REMOVED AGAIN in round 2. Marketing's reason is SEO: the menu is a
 * link list and cannot carry an `<h3>` per service category, and those headings
 * are the signal that the page covers those services. The 7 copy cards are back,
 * each titled with a real `<h3>`. Do not swap them for the menu again without
 * that trade-off being re-decided.
 *
 * ⚠ THE "COST OF THE REVERT" NOTE THAT USED TO SIT HERE WAS WRONG, and Brief 181
 * measured it: it claimed the menu carried "41 internal links to
 * `/hanover-park/{service}`". The live Coverage Area `/hanover-park` carried
 * ZERO — `[city]/page.tsx` passes `slug` to `CityServicesMenu` only for Ohio
 * cities, so every Illinois page's menu points at the NATIONAL `/services/*`
 * pages. The 6 city-scoped card links below are the first this page has ever
 * had; D4 introduced them, it did not restore them.
 *
 * `@/lib/services` IS imported, but it is a lib DATA module, not a component —
 * it is where the homepage's card icons live, so the two share one source.
 *
 * ── What this file still deliberately does NOT do ──────────────────────────
 * TEXT FIRST, LAYOUT SECOND, CMS THIRD. The CMS step is Brief 182 — do not
 * "helpfully" wire any of it up early:
 *
 *   • NO CMS content of any kind — no `getCityCmsContent`, no `renderCmsBlock`,
 *     no `rich-text-fields` entry. Every string comes from the content module.
 *     The ONLY live values are the phone number and the office address, both off
 *     the SAME `getGlobalSettingsCached()` object the builder already fetched,
 *     and that getter falls back to `site.ts` and never throws — so THIS PAGE
 *     RENDERS WITH THE DATABASE DOWN. Keep it that way.
 *   • NO shared component beyond `FaqAccordion` and `HeroNav` is imported — not
 *     `SiteShell`, `CityHero`, `CityServicesMenu`, `CityLocationsGrid`,
 *     `ArticleGrid`, `NoDripClubSection`, `ServiceCard`, `GoogleReviews`,
 *     `CityPageImage`, `Breadcrumbs`. The hero, the mid CTA, the reviews and the
 *     No Drip Club block are LOCAL static markup. The navbar and footer come
 *     from the root layout / SiteShell and are consumed, not touched.
 *   • NO other site furniture: no locations grid, no article grid, no Elfsight
 *     reviews pill, and NO page-scoped NAP block. The V3 page states the office
 *     in prose ("our office on Greenbrook Blvd.") and pins it on the map; the
 *     full street address reaches crawlers through the footer's sitewide
 *     `PlumbingBusiness` `@graph` and the store locator. Marketing weighed that
 *     and chose approved copy over adding a NAP line (Brief 181, decision 5).
 *   • NO `FAQPage`, `AggregateRating`, `Review` or `SearchAction` schema — Brief
 *     164 forbids the first (FAQ rich results stopped rendering 2026-05-07) and
 *     Brief 167 owns sitewide structured data. `BreadcrumbList` ONLY.
 *   • NO `LocalBusiness` / `Plumber` node of the page's own. The footer's
 *     `LocalBusinessSchema` already emits one per office; a second here would
 *     fork the graph ahead of Brief 167.
 *
 * ── Heading semantics ──────────────────────────────────────────────────────
 * Exactly ONE `<h1>` (the hero). EIGHT H2s in published order — it was ten
 * until the Video section was pulled on 2026-09-17. H3s in THREE places now:
 * the 7 service-card titles (section 2), the 3 why-points (section 4), and —
 * since Brief 181 (D2) — the 6 FAQ questions, which used to be `<p>` inside a
 * `<button>` and so appeared in no outline at all. No level is skipped.
 *
 * ⚠ The FAQ level is H3 HERE and H2 EVERYWHERE ELSE (Brief 164), and that is not
 * an inconsistency. On every other page nothing labels the accordion, so H2 is
 * the level that skips nothing; here the accordion sits under a real
 * `Frequently Asked Questions` H2, so H3 is. The level follows the context.
 *
 * The reviews stay `<blockquote>` + `<figcaption>` rather than headings — a
 * reviewer's name is an attribution, not a section of the document.
 *
 * ── Brief 179, Defect 2 ────────────────────────────────────────────────────
 * `globals.css` sets `h1..h5 { … text-navy-800 }` inside `@layer base`, ON THE
 * ELEMENT. An inherited colour from a parent box always loses to that. So every
 * heading on a Carmine / Midnight band here carries its own `hp-h2--on-dark`
 * class, and `local-office-city-v3.css` is UNLAYERED so those rules win. Never
 * set a heading colour only on the section wrapper.
 */

/**
 * The page's content container. `hp-w` is the hook for its ONE vertical rhythm
 * rule (`local-office-city-v3.css`, "THE SPACING SCALE") — blocks carry no
 * margins of their own, so there is only ever one rule to change.
 */
const CONTAINER = 'mx-auto w-[90%] lg:w-[81%] max-w-[1200px] hp-w';

/**
 * A run of copy with inline links.
 *
 * Brief 181 (D3) replaced each href with the destination it used to 301 to, so
 * every one of these now resolves as a direct 200. The words are untouched.
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
 * The city's office address, for the map query (revision round 3, item 4).
 *
 * Read from the SAME global-settings object the phone number comes from, so the
 * page cannot disagree with the NAP the rest of the site renders. The record is
 * matched on city NAME rather than slug on purpose: the live rows store their
 * slug with a leading slash (`/hanover-park`), a data quirk no template should
 * depend on.
 *
 * Brief 181 turned the hardcoded `'hanover park'` into `content.officeCity`, and
 * the hardcoded fallback into `content.officeAddressFallback` — same lookup,
 * city as data. The fallback keeps the map pinning correctly when the DB is
 * unreachable, matching the fail-open posture `getGlobalSettingsCached()` takes.
 */
function officeAddress(offices: CmsOffice[], content: CityV3Content): string {
  const wanted = content.officeCity.toLowerCase();
  const o = offices.find((x) => x.city?.toLowerCase() === wanted);
  return o ? formatOfficeAddress(o) : content.officeAddressFallback;
}

/**
 * The page's BreadcrumbList (Brief 181, D6).
 *
 * ⚠ JSON-LD ONLY — no visible trail. `Breadcrumbs.tsx` (the sub-service /
 * locations implementation) renders BOTH a visible `<nav>` and this schema, and
 * dropping it in would have added a visible element the approved layout does not
 * have. Hard rule 1 said the layout ships unchanged, hard rule 3 forbade
 * splitting the shared component in two, and Marketing chose the invisible
 * option on 2026-09-18. So the OBJECT below is `Breadcrumbs.tsx`'s, field for
 * field — same `@context`, same `ListItem` shape, same absolute `item` URLs —
 * emitted without the markup that would have changed the page.
 *
 * Two crumbs, Home → the city. Exactly one `BreadcrumbList` in the document: the
 * footer's `LocalBusinessSchema` emits a `PlumbingBusiness` `@graph` and nothing
 * else, and this template imports no other schema component.
 */
function breadcrumbJsonLd(city: { name: string; slug: string }) {
  const items = [
    { label: 'Home', href: '/' },
    { label: city.name, href: `/${city.slug}` },
  ];
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.label,
      // `CANONICAL_BASE` is the production origin with no trailing slash, so the
      // Home crumb is `https://jblantonplumbing.com/` and the city crumb has no
      // double slash. Never derived from the request host (Brief 127).
      item: it.href === '/' ? `${CANONICAL_BASE}/` : `${CANONICAL_BASE}${it.href}`,
    })),
  };
}

export default function LocalOfficeCityV3({
  city,
  content,
  settings,
}: {
  /** Registry identity — the breadcrumb label and its URL. */
  city: { name: string; slug: string };
  /** Every user-visible string on the page. */
  content: CityV3Content;
  /**
   * `getGlobalSettingsCached()`, fetched once by the `[city]` builder. The ONLY
   * live data this template reads: the phone number (never hardcoded —
   * design.md, "Copy and claims") and the office address for the map. That
   * getter falls back to `site.ts` and never throws, so the page renders with
   * the database down.
   */
  settings: { phoneDisplay: string; phoneHref: string; offices: CmsOffice[] };
}) {
  const C = content;
  const { phoneDisplay, phoneHref, offices } = settings;

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
      officeAddress(offices, C),
    )}&t=&z=${C.whyUs.map.zoom}&ie=UTF8&iwloc=B&output=embed`;

  return (
    <div className="local-office-v3">
      {/*
        BreadcrumbList (Brief 181, D6). Invisible by design — see
        `breadcrumbJsonLd` above for why this is schema without a visible trail.
        Rendered first so it is in the document head-ward of the content it
        describes; position in the body is irrelevant to Google.
      */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(city)) }}
      />

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
          {/* <!-- Brief 181 D5: final alt, pending Marketing's sign-off. --> */}
          <img
            className="hp-hero-image"
            src={C.hero.image.src}
            alt={C.hero.image.alt}
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
          `ServiceIcon`). */}
      <section className="hp-band hp-band--cream">
        <div className={CONTAINER}>
          <p className="hp-eyebrow hp-eyebrow--on-light">{C.services.eyebrow}</p>
          <h2 className="hp-h2">{C.services.h2}</h2>
          <p className="hp-lead">{C.services.intro}</p>
          <div className="hp-cards">
            {C.services.cards.map((card) => (
              /*
                Revision round 3, item 2: the WHOLE CARD is the link, not a run of
                words inside the sentence. All seven are clickable.

                Brief 181 (D4) made the destination EXPLICIT DATA (`card.href`).
                It used to be derived — the first body segment that happened to
                carry an href, falling back to a service-category hub keyed off
                the card title — which produced a grid where two cards could point
                at different levels of the site, and made the destination a side
                effect of how a sentence had been marked up. Six now point at the
                city-scoped `/{city}/{service}` page; Commercial keeps the
                national hub because no city-scoped commercial page exists.

                The body renders as PLAIN TEXT: an `<a>` inside an `<a>` is
                invalid HTML, and the whole card is the link. The words are the
                rewrite's, unchanged — only the markup around them is gone.
              */
              <a className="hp-card hp-card--link" href={card.href} key={card.title}>
                <ServiceIcon name={card.title} />
                {/* The Commercial card carries the copy document's own flag:
                    <!-- Marketing flag: fixed template copy, off-persona for a
                    homeowners-only page. Swap decision pending. --> */}
                <h3 className="hp-card-title">{card.title}</h3>
                <p className="hp-card-body">{card.body.map((seg) => seg.text).join('')}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ══ 3. FEATURED SERVICE — White #FFFFFF ════════════════════════════
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
              <p className="hp-eyebrow hp-eyebrow--on-light">{C.featuredService.eyebrow}</p>
              <h2 className="hp-h2">{C.featuredService.h2}</h2>
              {/* Two paragraphs (Marketing, 2026-09-17) — a readability break
                  only; no word of the approved copy changes. */}
              {C.featuredService.body.map((para, i) => (
                <p className="hp-body" key={i}>
                  <Copy segments={para} />
                </p>
              ))}
            </div>
            <div className="hp-split-media">
              {/* <!-- Brief 181 D5: final alt, pending Marketing's sign-off. --> */}
              <img
                className="hp-split-photo"
                src={C.featuredService.image.src}
                alt={C.featuredService.image.alt}
                width={C.featuredService.image.width}
                height={C.featuredService.image.height}
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
          {/*
            Brief 181 (D2) — the questions become real headings.

            By default `FaqAccordion` renders each question as a `<p>` inside its
            `<button>`, so the six questions on this page appeared in NO heading
            outline at all. `questionHeadingLevel` is an OPTIONAL prop whose
            default reproduces that markup byte for byte; only this template
            passes it, so no other page that renders the accordion moved.

            H3, not H2, because the `Frequently Asked Questions` H2 directly above
            labels the set — see the heading-semantics note in this file's header
            for why that differs from Brief 164's sitewide H2 rule.
          */}
          <FaqAccordion faqs={C.faq.items} questionHeadingLevel="h3" />
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
