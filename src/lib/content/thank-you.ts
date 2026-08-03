import { ELFSIGHT_WIDGETS } from '@/lib/widgets';

/**
 * Copy + config for the post-submission Thank You page (`app/thank-you/page.tsx`).
 *
 * Brief 129. Unlike the rest of this migration, this page is NOT a fidelity
 * clone: the live `/thank-you` is a boilerplate SEO-template page (generic
 * confirmation line + a large services/areas-served link dump). Marketing
 * approved the purpose-built replacement below, so every string here is final
 * approved copy — do not paraphrase or expand it.
 *
 * Two deliberate constraints baked into this shape:
 *  - NO personalization. There are no fields for job type, name, or service
 *    date, because the involve.me scheduling flow lands the browser on a bare
 *    `/thank-you` with no query parameters. The page's message must not depend
 *    on that changing later.
 *  - ONE next action. The No Drip Club link is the page's only CTA; this is a
 *    plain internal page visit, not an involve.me popup.
 *
 * Same typed-data pattern as `lib/content/ndc.ts` — no prose lives in the JSX.
 */

/** A single "What happens next" step. */
export interface ThankYouStep {
  label: string;
  text: string;
}

export interface ThankYouContent {
  meta: {
    /** Root layout appends " | J. Blanton Plumbing" — do not duplicate it here. */
    title: string;
    description: string;
  };
  confirmation: {
    /** H1 — the only content in section 1. No subheading, no body prose. */
    heading: string;
  };
  whatHappensNext: {
    heading: string;
    steps: ThankYouStep[];
  };
  trust: {
    /** Same "Why J. Blanton" embed used on the homepage and /why-j-blanton. */
    videoSrc: string;
    videoTitle: string;
    /** Elfsight Google Reviews app id (platform script loads globally in layout). */
    reviewsWidgetId: string;
  };
  secondaryCta: {
    text: string;
    buttonLabel: string;
    buttonHref: string;
  };
}

export const THANK_YOU: ThankYouContent = {
  meta: {
    title: 'Thank You',
    description: "Your service request has been received. Here's what happens next.",
  },
  confirmation: {
    heading: 'Thank you for scheduling with J. Blanton Plumbing!',
  },
  whatHappensNext: {
    heading: 'WHAT HAPPENS NEXT',
    steps: [
      { label: 'STEP 1', text: 'A technician reviews your request' },
      { label: 'STEP 2', text: 'We call to confirm your appointment window' },
      { label: 'STEP 3', text: 'We show up ready to help' },
    ],
  },
  trust: {
    videoSrc: 'https://www.youtube-nocookie.com/embed/ZDFzUtjBUCk?controls=0&rel=0&fs=0',
    videoTitle: 'Why J. Blanton',
    reviewsWidgetId: ELFSIGHT_WIDGETS.googleReviews,
  },
  secondaryCta: {
    text: 'While you wait: Join the No Drip Club for priority service and annual savings.',
    buttonLabel: 'JOIN THE NO DRIP CLUB',
    buttonHref: '/no-drip-club',
  },
};
