/**
 * Static copy + defaults for the /privacy-policy "Terms of Use & Privacy Policy"
 * page.
 *
 * Brief 110: the legal/compliance page (indexed, `index, follow`, linked from the
 * footer on every page) 404'd in the Node clone because no template rendered the
 * route. It is now rebuilt from the LIVE page
 * (https://jblantonplumbing.com/privacy-policy) using the shared Coverage Area
 * building blocks, and registered in the CMS under Utility Pages.
 *
 * This file is the STATIC FALLBACK / seed source. The live page merges the
 * `main_pages` row (slug `privacy-policy`) over these defaults, so an un-seeded
 * environment still renders faithfully. Only two fields are page-specific and
 * CMS-editable: the H1 (`hero_heading`) and the long-form legal body
 * (`body_html`, a rich-text field). Every other block (nav, hero NAP box,
 * services menu, articles, areas-served, FAQ, footer) is a shared component that
 * follows its own global/CMS behaviour.
 *
 * ⚠️ LEGAL-COPY FIDELITY NOTE (Brief 110):
 * The live page's Privacy Policy body is itself TRUNCATED at the source — the
 * rendered DOM and the raw server HTML both end the final paragraph mid-sentence
 * with a dangling "This" ("...discloses the privacy practices for
 * www.jblantonplumbing.com. This"), after which the content container simply
 * closes. There is no further privacy-policy text anywhere on the live page.
 * Per Brief 110 ("Mirror live verbatim + flag") this fallback reproduces exactly
 * what is live — including the truncated sentence — VERBATIM, with no invented or
 * paraphrased legal text. Marketing should paste the complete, correct privacy
 * policy into the CMS `body_html` field once legal supplies it.
 */

export interface PrivacyPolicyContent {
  meta: { title: string; description: string };
  hero: {
    /** H1 (CityHero CSS uppercases it). */
    heading: string;
  };
  body: {
    /** Long-form Terms of Use + Privacy Policy, verbatim from the live page. */
    html: string;
  };
}

/**
 * The legal body, reproduced VERBATIM from the live page's rendered DOM + raw
 * server HTML. Headings are `<h2>`, clauses are `<p>` (the live markup). The
 * final privacy-policy paragraph is truncated exactly as it is on the live site
 * (see the fidelity note above) — do not "complete" it here.
 */
const BODY_HTML = `<h2>Welcome to our website</h2>
<p>If you continue to browse and use this website, you are agreeing to comply with and be bound by the following terms and conditions of use, which together with our privacy policy govern J. Blanton’s relationship with you in relation to this website. If you disagree with any part of these terms and conditions, please do not use our website.</p>
<p>The term ‘J. Blanton’ or ‘us’ or ‘we’ refers to the owner of the website whose registered office is in the Chicagoland area. Our IL License number is available upon request. The term ‘you’ refers to the user or viewer of our website.</p>
<p>The use of this website is subject to the following terms of use:</p>
<p>The content of the pages of this website is for your general information and use only. It is subject to change without notice.</p>
<p>Neither we nor any third parties provide any warranty or guarantee as to the accuracy, timeliness, performance, completeness, or suitability of the information and materials found or offered on this website for any particular purpose. You acknowledge that such information and materials may contain inaccuracies or errors and we expressly exclude liability for any such inaccuracies or errors to the fullest extent permitted by law.</p>
<p>Your use of any information or materials on this website is entirely at your own risk, for which we shall not be liable. It shall be your own responsibility to ensure that any products, services, or information available through this website meet your specific requirements.</p>
<p>This website contains material which is owned by or licensed to us. This material includes, but is not limited to, the design, layout, look, appearance, and graphics. Reproduction is prohibited other than in accordance with the copyright notice, which forms part of these terms and conditions.</p>
<p>All trademarks reproduced in this website, which are not the property of, or licensed to the operator, are acknowledged on the website.</p>
<p>Unauthorized use of this website may give rise to a claim for damages and/or be a criminal offense.</p>
<p>From time to time, this website may also include links to other websites. These links are provided for your convenience to provide further information. They do not signify that we endorse the website(s). We have no responsibility for the content of the linked website(s).</p>
<p>Your use of this website and any dispute arising out of such use of the website is subject to the laws of the United States of America, IL.</p>
<h2>Privacy Policy for J. Blanton</h2>
<p>This privacy notice discloses the privacy practices for www.jblantonplumbing.com. This</p>`;

export const PRIVACY_POLICY: PrivacyPolicyContent = {
  meta: {
    title: 'Terms of Use & Privacy Policy | J. Blanton Plumbing',
    description:
      'The Terms of Use and Privacy Policy governing your use of the J. Blanton Plumbing website (www.jblantonplumbing.com).',
  },
  hero: {
    heading: 'Terms of Use & Privacy Policy – J. Blanton Plumbing Plumber',
  },
  body: {
    html: BODY_HTML,
  },
};

/**
 * Flat `main_pages.content` JSONB keys for the CMS editor + seed. Kept in sync
 * with the CMS editor (`/admin/privacy-policy`) and the seed script
 * (`scripts/seed-privacy-policy-page.ts`). `body_html` is registered as a
 * rich-text field (see `@/lib/cms/rich-text-fields`) so it is sanitized on write
 * and rendered as block HTML on the public page.
 */
export const PRIVACY_POLICY_CMS_FIELDS = {
  hero_heading: PRIVACY_POLICY.hero.heading,
  body_html: PRIVACY_POLICY.body.html,
} as const;
