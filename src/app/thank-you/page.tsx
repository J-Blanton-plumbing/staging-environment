import Link from 'next/link';
import type { Metadata } from 'next';
import GoogleReviews from '@/components/GoogleReviews';
import ThankYouConversion from '@/components/analytics/ThankYouConversion';
import { getTrackingIds } from '@/lib/analytics';
import { THANK_YOU } from '@/lib/content/thank-you';
import { pageTitle } from '@/lib/seo';
import './thank-you.css';

/**
 * /thank-you — the post-submission landing page for every form and scheduling
 * flow on the site (Brief 129).
 *
 * WHY THIS EXISTS: the route did not exist in the Node build and 404'd (found
 * in Brief 128, §5.2). Google Ads / GA4 conversions defined against a
 * `/thank-you` pageview counted zero because the pageview never fired.
 *
 * NOT A FIDELITY CLONE — the only page in this project deliberately exempt from
 * the "no redesign" rule. The live page is the generic SEO template (boilerplate
 * confirmation line + a services/areas-served link dump); Marketing approved the
 * shorter replacement whose copy lives in `@/lib/content/thank-you`.
 *
 * HOW VISITORS GET HERE (updated 2026-09-07, Brief 174 — the comments below used
 * to describe involve.me, which no longer serves the scheduling flow):
 *  - The "Schedule a Service" popup is the Mainline app
 *    (`https://mainline.jblantonplumbing.com/schedule-service`) in a
 *    first-party iframe modal since Brief 169. On submit it renders its own
 *    inline "Thanks, we got it!" panel INSIDE the frame and navigates nothing.
 *    `ScheduleServiceModal` will bring the visitor here with
 *    `router.push('/thank-you')` — a CLIENT-SIDE navigation — as soon as
 *    Mainline emits the `jbp:form_submitted` postMessage it was asked for on
 *    2026-09-07. Until then this route sees almost no scheduling traffic.
 *  - involve.me survives only for the `no-drip-club` and `contact-us` projects,
 *    which still navigate the top-level window here on completion.
 *
 * Deliberately absent, do not "fix" later without Marketing:
 *  - No personalization. Neither arrival path carries any query parameters —
 *    Mainline's handoff message is a bare `{ type, data.form_slug }` and
 *    involve.me lands on a bare `/thank-you` — so there is nothing to read; the
 *    copy must never depend on that being wired up.
 *  - No `.hero` split panel. This is a confirmation page, not a marketing page.
 *  - Exactly one CTA (No Drip Club), and it is a plain internal <Link>, not a
 *    popup trigger — the visitor has already submitted a form.
 *
 * Navbar + Footer render from the root layout via SiteShell; no action here.
 *
 * `force-dynamic` matches every other top-level page: the root layout's
 * generateMetadata reads the `x-pathname` request header to emit this page's
 * self-referencing canonical (Brief 127), which a static prerender would drop.
 */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: pageTitle(THANK_YOU.meta.title),
  description: THANK_YOU.meta.description,
  /**
   * `noindex, follow` — Marketing's call (Brief 129 follow-up).
   *
   * This is a post-submission confirmation page, not a landing page. Two
   * reasons it must stay out of the index:
   *  1. Entered cold from a search result it reads as broken — it confirms a
   *     request the visitor never made.
   *  2. It is the tracking target for the Google Ads / GA4 conversion, so an
   *     organic arrival would fire a conversion that never happened.
   *
   * `follow` is deliberate: the No Drip Club CTA is the page's only link, and
   * there is no reason to strand its equity. The self-referencing canonical
   * from the root layout (Brief 127) still renders and is not in conflict —
   * noindex governs indexing, the canonical only governs which URL is the
   * duplicate-set representative.
   *
   * The page is also absent from sitemap.xml, which needs no code: the sitemap
   * builds from the explicit page list in `src/lib/sitemap-pages.ts` (fed into
   * `src/lib/sitemap/manifest.ts` since Brief 153) and this route is not in it.
   */
  robots: { index: false, follow: true },
};

export default function ThankYouPage() {
  const { confirmation, whatHappensNext, trust, secondaryCta } = THANK_YOU;

  /**
   * Brief 174 (Track B) — the Google Ads "Schedule Service Form Submit"
   * conversion. Read here in the server component and passed down, rather than
   * read from `process.env` inside the client component, so validation and the
   * off switch live in one place (`src/lib/analytics.ts`) for every tag on the
   * site. Blank/invalid → nothing rendered, no client chunk requested, no
   * conversion code in the page at all.
   */
  const { googleAdsConversionThankYou } = getTrackingIds();

  return (
    <div className="thank-you-page">
      {googleAdsConversionThankYou ? (
        <ThankYouConversion sendTo={googleAdsConversionThankYou} />
      ) : null}

      {/* ============== 1. CONFIRMATION HEADLINE (H1 only) ============== */}
      <section className="ty-confirm">
        <div className="ty-w">
          <h1>{confirmation.heading}</h1>
        </div>
      </section>

      {/* ============== 2. WHAT HAPPENS NEXT (3 steps) ============== */}
      <section className="ty-next">
        <div className="ty-w">
          <h2 className="ty-section-heading">{whatHappensNext.heading}</h2>
          {/* Flex/responsive pattern ported from `.ndc-how-it-works` */}
          <div className="ty-steps">
            {whatHappensNext.steps.map((step) => (
              <div key={step.label}>
                <p className="label">{step.label}</p>
                <p className="text">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============== 3. TRUST BLOCK (video + reviews) ============== */}
      <section>
        <div className="ty-w ty-trust">
          <div className="ty-video">
            <iframe
              src={trust.videoSrc}
              title={trust.videoTitle}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
          {/* Elfsight Google Reviews — platform script is loaded globally in the
              root layout, so no extra <Script> tag is needed here. Renders
              "something went wrong" on localhost (origin-restricted widget). */}
          <div className="ty-reviews">
            <GoogleReviews widgetId={trust.reviewsWidgetId} />
          </div>
        </div>
      </section>

      {/* ============== 4. SECONDARY CTA — NO DRIP CLUB ============== */}
      <section className="ty-cta">
        <div className="ty-w">
          <p className="ty-cta-text">{secondaryCta.text}</p>
          <Link href={secondaryCta.buttonHref} className="ty-cta-button">
            {secondaryCta.buttonLabel}
          </Link>
        </div>
      </section>
    </div>
  );
}
