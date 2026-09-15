/**
 * Static copy + defaults for the /consumer-rights "Home Repair: Know Your
 * Consumer Rights" utility page (Brief 176).
 *
 * The page is a plain-language on-ramp to the Office of the Illinois Attorney
 * General's two-page fact sheet, "Home Repair: Know Your Consumer Rights"
 * (Rev. 04/2023). Under the Illinois Home Repair and Remodeling Act
 * (815 ILCS 513/) a contractor must hand that pamphlet to the consumer before
 * starting work above the statutory threshold, so **the PDF download is the
 * compliance artifact** — which is why it is the page's only CTA and why the
 * prose around it is free to be readable.
 *
 * ── Where the copy comes from ──────────────────────────────────────────────
 * Every string in this file is transcribed from the approved copy document
 * (`New Pages/Consumer Rights page/consumer-rights-copy.md`, approved by
 * Marketing 2026-09-14). Nothing here is written, trimmed, re-ordered or
 * summarized. If a layout needs copy that is not in that document, request it —
 * do not invent it (design.md, "Copy and claims").
 *
 * ── The body implementation (Brief 176, C1 — Option A, hybrid) ─────────────
 * The shared CMS sanitizer (`src/lib/cms/sanitize.ts`, the Brief 73 allow-list)
 * admits NO table tags — no `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`,
 * `<td>`, `<caption>`, and no `scope`/`colspan` attributes. It was built for
 * marketing prose. Widening it for one page would widen a security allow-list
 * shared by every page on the site, so we did not: **prose is CMS rich text,
 * and the three tables plus the six-card grid are React components fed by the
 * structured data below.** Marketing edits prose in /admin/consumer-rights;
 * changing a table row or a card is a code change here.
 *
 * ── What is deliberately NOT CMS-editable ──────────────────────────────────
 *  • The two VERBATIM statutory blocks (see below) — statutory text that must
 *    not be casually edited, including the asterisk disclaimer the source
 *    document states is *required* to appear.
 *  • The H2/H3 headings — three of them are also `FAQPage` JSON-LD `name`
 *    values, and the schema requires a character-for-character match with the
 *    visible heading. Both render from the ONE constant in `HEADINGS`, so they
 *    cannot drift.
 *  • The table rows, the hotline numbers and the six fraud cards — structured
 *    data, per Option A above.
 *  • The CTA label, meta line and href.
 */

/* ── Headings ───────────────────────────────────────────────────────────────
 *
 * THE single source for every heading on the page. `FAQ_ENTRIES` below points
 * at three of these by reference, and `ConsumerRightsTemplate` renders the same
 * constants as visible <h2>/<h3> text — which is what makes the "JSON-LD name
 * matches the visible H3 character for character" rule structurally true rather
 * than something a future edit can quietly break.
 *
 * NOTE on the apostrophe in `CANCEL_Q`: Brief 176 (Track E) warns that it is a
 * typographic apostrophe (U+2019). It is NOT — the approved copy document uses
 * a straight ASCII apostrophe (U+0027) in "I've", as it does everywhere else
 * (the document contains zero U+2019 characters). The copy document is the
 * content source of truth, so the straight form is what ships. The schema match
 * holds either way because both sides read this constant.
 */
export const HEADINGS = {
  H1: 'Home Repair: Know Your Consumer Rights',
  BEFORE_SIGN: 'Before You Sign a Contract',
  CANCEL_Q: "Can I cancel a home repair contract after I've signed it?",
  CONTRACT_REQUIREMENTS: 'What Illinois Law Requires in Your Contract',
  LIENS: 'Liens, Sworn Statements & Subcontractors',
  SWORN_STATEMENT: 'What a Sworn Statement Is',
  WHY_LIENS: 'Why Liens Matter to You',
  FRAUD: 'Warning Signs of Home Repair Fraud',
  FRAUD_Q: 'What are some examples of deceptive practices in home repair?',
  COMPLAINT: 'How to File a Complaint in Illinois',
  HOTLINES: 'Illinois Consumer Fraud Hotlines',
  COMPLAINT_Q: 'How do I file a complaint against a contractor in Illinois?',
  ROOFING: 'Roofing complaints',
  DOWNLOAD: 'Download the Full Fact Sheet',
} as const;

/* ── The single CTA ─────────────────────────────────────────────────────────
 *
 * One CTA, rendered twice — once in the Midnight hero and once in the Midnight
 * closing band — identical both times, on the same surface. It is the ONLY call
 * to action on the page: no booking button, no financing banner, no phone CTA,
 * and (since the Marketing revision of 2026-09-14) no inherited city-template
 * hero with a Local Office phone button either.
 */
export const CONSUMER_RIGHTS_CTA = {
  /**
   * Marketing revision 2026-09-15: shortened from "Download the Official Fact
   * Sheet". The trailing period in the review note ("CTA: Download Official
   * Sheet.") is read as sentence punctuation, not part of the label — button
   * labels on this site carry none.
   * ⚠️ consumer-rights-copy.md still carries the long form — update it there too.
   */
  label: 'Download Official Sheet',
  /**
   * Marketing revision 2026-09-14: trimmed from the copy document's
   * "PDF, 2 pages · Office of the Illinois Attorney General · Rev. 04/2023" to
   * the source attribution alone. The page-count and revision are still stated
   * in the page footnote, so nothing is lost.
   * ⚠️ consumer-rights-copy.md still carries the long form — update it there too.
   */
  meta: 'Office of the Illinois Attorney General',
  href: '/downloads/il-home-repair-consumer-rights-2023.pdf',
  /** The file name the browser saves as (the `download` attribute's value). */
  fileName: 'il-home-repair-consumer-rights-2023.pdf',
} as const;

/* ── Table 1 — cancellation deadlines ───────────────────────────────────────
 *
 * EVERY DEADLINE IS EXACT: 3 / 15 / 5 / 30 / 10 business days. Never rounded,
 * never softened, never reworded. These are the most-scanned values on the page
 * and they are rendered in Carmine/Industry for that reason.
 */
export interface CancellationRow {
  situation: string;
  deadline: string;
  clockStarts: string;
}

export const CANCELLATION_ROWS: readonly CancellationRow[] = [
  {
    situation: 'Contract signed at your home',
    deadline: '3 business days',
    clockStarts: 'When you sign',
  },
  {
    situation: 'Age 65 or older, signed with an uninvited solicitor in your home',
    deadline: '15 business days',
    clockStarts: 'When you sign',
  },
  {
    situation: 'Your insurer denies the claim',
    deadline: '5 business days',
    clockStarts: 'When you receive written notice of denial',
  },
  {
    situation: 'You filed an insurance claim',
    deadline: '30 days',
    clockStarts: 'When you sent the claim',
  },
  {
    situation: 'Refund owed to you after you cancel',
    deadline: '10 business days',
    clockStarts: 'When the contractor receives your notice',
  },
];

export const CANCELLATION_TABLE_CAPTION = 'Cancellation deadlines under Illinois law';

/* ── Table 2 — what the contract must contain ───────────────────────────────
 *
 * `note` is the parenthetical that the copy document italicizes — "(roofing work
 * only)". It is carried as its own field so the italics are markup rather than
 * an asterisk baked into the string.
 */
export interface ContractRequirementRow {
  requirement: string;
  note?: string;
  why: string;
}

export const CONTRACT_REQUIREMENT_ROWS: readonly ContractRequirementRow[] = [
  {
    requirement: "Contractor's full name, address, and telephone number",
    why: 'If the business name or address changes before the agreed start or completion date, Illinois law requires the contractor to notify you.',
  },
  {
    requirement: 'Description of the work to be performed',
    why: 'Vague scope is where most disputes begin.',
  },
  {
    requirement: 'Starting and estimated completion dates',
    why: 'Without dates, you have no basis to act if the work stalls.',
  },
  {
    requirement: 'Total cost of the work',
    why: 'Should match the written estimate you agreed to.',
  },
  {
    requirement: 'Schedule and method of payment',
    why: 'Including down payment, subsequent payments, and final payment.',
  },
  {
    requirement: 'Grounds for termination by either party',
    why: 'You still owe for work completed. But if the contractor fails to commence or complete the work within the contracted time period, you may cancel and may be entitled to a refund of your down payment or other payments — request it in writing, by certified mail.',
  },
  {
    requirement: 'Insurance-claim cancellation provision',
    why: 'The verbatim language quoted above.',
  },
  {
    requirement: 'Roofing license name and number',
    note: '(roofing work only)',
    why: 'Illinois law requires contractors who offer roofing work to include their Illinois state roofing license name and number on contracts and bids.',
  },
];

export const CONTRACT_TABLE_CAPTION = 'Use this as a checklist before you sign';

/* ── Table 3 — Illinois Consumer Fraud Hotlines ─────────────────────────────
 *
 * Three columns, one row. `href` is the exact `tel:` target from the copy
 * document — do not re-derive it from the display string.
 */
export interface Hotline {
  office: string;
  number: string;
  href: string;
}

export const HOTLINES: readonly Hotline[] = [
  { office: 'Springfield', number: '1-800-243-0618', href: 'tel:+18002430618' },
  { office: 'Chicago', number: '1-800-386-5438', href: 'tel:+18003865438' },
  { office: 'Carbondale', number: '1-800-243-0607', href: 'tel:+18002430607' },
];

export const HOTLINES_TABLE_CAPTION = 'Illinois Consumer Fraud Hotlines';

/* ── The six warning-sign cards ─────────────────────────────────────────────*/
export interface FraudCard {
  number: number;
  title: string;
  body: string;
}

export const FRAUD_CARDS: readonly FraudCard[] = [
  {
    number: 1,
    title: 'Prices far below market',
    body: 'Door-to-door salespeople with no local connections offering to do the work for substantially less than the market price.',
  },
  {
    number: 2,
    title: 'No real address',
    body: 'A company reachable only by telephone number or post office box — particularly an out-of-state company.',
  },
  {
    number: 3,
    title: 'No references',
    body: 'A contractor who fails to provide references when you request them.',
  },
  {
    number: 4,
    title: 'Free inspection offers',
    body: "Don't admit anyone into your home unless they present authentic identification establishing their business status. When in doubt, call the worker's employer to verify their identity.",
  },
  {
    number: 5,
    title: 'Cash-only demands',
    body: 'A contractor who demands cash payment for a job, or asks you to make a check payable to a person other than the owner or company name.',
  },
  {
    number: 6,
    title: 'A ride to the bank',
    body: 'An offer from a contractor to drive you to the bank to withdraw funds to pay for the work.',
  },
];

/* ── VERBATIM STATUTORY BLOCKS — ship character-for-character ───────────────
 *
 * ⚠️ DO NOT EDIT, PARAPHRASE, "CLEAN UP", RE-WRAP OR ABRIDGE EITHER BLOCK, AND
 * DO NOT MAKE THEM CMS-EDITABLE. They are statutory text. Block 2's trailing
 * asterisk ties to `disclaimer`, which the source document states is REQUIRED
 * to appear in the pamphlet — dropping it is a compliance defect, not a style
 * choice. Both were diffed character-for-character against the source PDF by
 * Marketing on 2026-09-14 and transcribed from the approved copy document here.
 *
 * `paragraphs` are rendered as plain text nodes (never `dangerouslySetInnerHTML`),
 * so nothing in the sanitize pipeline can touch them.
 */
export interface VerbatimBlock {
  /** Callout header-bar title. */
  title: string;
  paragraphs: readonly string[];
  /** Required smaller-type disclaimer rendered inside the same callout. */
  disclaimer?: string;
  /** Caption-type attribution line, inside the callout. */
  attribution: string;
}

/**
 * VERBATIM BLOCK 1 — the insurance-claim cancellation provision. Model statutory
 * contract language; your contract must contain it. The `(name of contractor)` /
 * `(address of contractor's place of business)` placeholders are italicized in
 * the source and are carried as their own segments so the italics are markup.
 */
export const VERBATIM_INSURANCE_CANCELLATION = {
  title: 'Required contract provision — quoted in full',
  /**
   * Rendered in order; `em: true` segments are wrapped in <em>. Concatenating
   * every `text` in order reproduces the source sentence exactly, including the
   * enclosing quotation marks.
   */
  segments: [
    {
      text: '"If you are notified by your insurer that all or any part of the claim or contract is not a covered loss under the insurance policy, you may cancel the contract by mailing or delivering written notice to ',
    },
    { text: '(name of contractor)', em: true },
    { text: ' at ' },
    { text: "(address of contractor's place of business)", em: true },
    {
      text: ' at any time prior to the earlier of midnight on the fifth business day after you have received such notice from your insurer or the thirtieth business day after receipt of a properly executed proof of loss by the insurer from the insured."',
    },
  ] as ReadonlyArray<{ text: string; em?: boolean }>,
  attribution:
    "Quoted verbatim from the Illinois Attorney General's fact sheet. Your contract must contain this provision.",
} as const;

/**
 * VERBATIM BLOCK 2 — the Mechanics Lien Act / Sworn Statement passage AND its
 * asterisk disclaimer. The source document states the disclaimer is REQUIRED to
 * be placed in the pamphlet. Do not drop it.
 */
export const VERBATIM_LIEN_WAIVERS: VerbatimBlock = {
  title: 'Protect Yourself with Lien Waivers for all Subcontractors',
  paragraphs: [
    'Before you pay your contractor, understand that the Mechanics Lien Act requires that you shall request and the contractor shall give you a signed and notarized written statement (known as a "Sworn Statement") that lists all the persons or companies your contractor hired to work on your home, their addresses along with the amounts about to be paid, and the total amount owed after the payment to those persons or companies.',
    'Suppliers and subcontractors have a right to file a lien against your home if they do not get paid for their labor or materials. To protect yourself against liens, you should demand that your contractor provide you with a Sworn Statement before you pay the contractor.',
    'You should also obtain lien waivers from all contractors and subcontractors if appropriate. You should consult with an attorney to learn more about your rights and obligations under the Mechanics Lien Act.*',
  ],
  disclaimer:
    '*Disclaimer: The contents of this paragraph are required to be placed in the pamphlet for consumer guidance and information only. The contents of this paragraph are not substantive enforceable provisions of the Home Repair and Remodeling Act and are not intended to affect the substantive law of the Mechanics Lien Act.',
  attribution: "Quoted verbatim from the Illinois Attorney General's fact sheet.",
};

/* ── The external Attorney General link ─────────────────────────────────────
 *
 * Rendered as JSX rather than as part of a CMS rich-text field. The shared
 * sanitizer's `transformTags` forces `rel="noopener noreferrer"` onto every
 * `<a>` it processes, which would overwrite the `rel="noopener nofollow"` the
 * copy document specifies for this link. Splitting it out at the paragraph
 * boundary (it is its own paragraph in the copy document) keeps the exact
 * attributes without touching the shared allow-list.
 */
export const AG_LINK = {
  lead: 'More information is available at ',
  label: 'IllinoisAttorneyGeneral.gov',
  href: 'https://www.illinoisattorneygeneral.gov',
  trail: '.',
} as const;

/* ── FAQPage structured data ────────────────────────────────────────────────
 *
 * Brief 176, Track E. Brief 167 (site-wide structured data) is still unstarted,
 * so THIS IS THE REFERENCE IMPLEMENTATION for FAQ markup on the site — copy it.
 *
 * The rules it encodes:
 *  1. `question` is a REFERENCE to the same `HEADINGS` constant the visible
 *     <h3> renders, never a second copy of the string. Google requires the
 *     `name` to match the visible question; two copies drift, one cannot.
 *  2. `answer` is plain text. It summarizes the visible section beneath the
 *     heading — an answer must be genuinely present on the page.
 *  3. Exactly ONE FAQPage node per page. `/consumer-rights` deliberately omits
 *     the shared `FaqAccordion` (which renders `WATER_TESTING_FAQS`) so nothing
 *     else on the page can emit a second one.
 */
export interface FaqEntry {
  question: string;
  answer: string;
}

export const FAQ_ENTRIES: readonly FaqEntry[] = [
  {
    question: HEADINGS.CANCEL_Q,
    answer:
      'In Illinois, if you signed the contract at your home you have three business days to cancel. Homeowners age 65 or older who signed with an uninvited solicitor in the home have up to 15 business days. If you are filing an insurance claim to pay for the work, you may cancel within five business days after receiving written notice from your insurer denying the claim, or within 30 days after you sent the claim to the insurer, whichever occurs first. A contractor cannot deprive you of this right by starting work, selling your contract to a lender, or any other tactic. If you cancel, payments you made must be returned within 10 business days of the contractor receiving your notice.',
  },
  {
    question: HEADINGS.FRAUD_Q,
    answer:
      "The Illinois Attorney General's office identifies six warning signs of a potential home repair scam: door-to-door salespeople with no local connections offering work for substantially less than market price; solicitations from a company that lists only a phone number or P.O. box, particularly out-of-state companies; contractors who fail to provide references when requested; people who offer to inspect your home for free; contractors who demand cash payment or ask you to make a check payable to someone other than the owner or company; and offers to drive you to the bank to withdraw funds to pay for the work.",
  },
  {
    question: HEADINGS.COMPLAINT_Q,
    answer:
      "Bring your concerns to your state's attorney or the Illinois Attorney General's Office. The Consumer Fraud Hotlines are 1-800-243-0618 (Springfield), 1-800-386-5438 (Chicago), and 1-800-243-0607 (Carbondale). Individuals with hearing or speech disabilities can use the 7-1-1 relay service. To file a complaint specifically against a roofing contractor, contact the Illinois Department of Financial and Professional Regulation at 312-814-6910 or file directly on its website.",
  },
];

/* ── CMS-editable prose ─────────────────────────────────────────────────────
 *
 * Every field below is a rich-text field (registered in
 * `src/lib/cms/rich-text-fields.ts`), sanitized on write through the shared
 * Brief 73 allow-list and rendered as block HTML by `renderCmsBlock`. The DB
 * value is merged over these defaults, so an un-seeded environment renders the
 * approved copy unchanged.
 */
export interface ConsumerRightsContent {
  meta: { title: string; description: string };
  hero: {
    /** H1 (CityHero CSS uppercases it). */
    heading: string;
    /**
     * OPTIONAL hero image (CMS-editable, ImageUploaderField). Blank by default:
     * this template has no stock-photo slot and the copy document specifies no
     * image — a photo of a plumber beside consumer-fraud warnings is exactly the
     * city-template inheritance Marketing removed on 2026-09-14. Setting it in
     * the CMS splits the hero into two columns; leaving it blank keeps the hero
     * a single clean column. It is wired end to end rather than left inert,
     * because a CMS field with no render path is the shadowed-field defect
     * Brief 149 existed to fix.
     */
    image: string;
  };
  prose: {
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
  };
}

export const CONSUMER_RIGHTS: ConsumerRightsContent = {
  meta: {
    // No brand suffix — `pageTitle()` strips one and the root layout's title
    // template appends it exactly once (lib/seo.ts).
    title: 'Home Repair: Know Your Consumer Rights',
    description:
      "Your rights as an Illinois homeowner hiring a contractor: contract requirements, cancellation deadlines, lien protections, and how to file a complaint. Download the Illinois Attorney General's official fact sheet.",
  },
  hero: {
    heading: HEADINGS.H1,
    /*
     * Marketing supplied a hero photo on 2026-09-15 (a technician going through
     * paperwork with a homeowner at the kitchen counter) for the side-by-side
     * hero. Save it at this path — or upload it at /admin/consumer-rights →
     * Hero Image, which overrides this without a code change.
     *
     * Until the file exists, `CityPageImage`'s onError swaps in the shared city
     * fallback, so the hero never renders a broken image.
     */
    image: '/images/consumer-rights-hero.webp',
  },
  prose: {
    /*
     * Marketing revision 2026-09-15 — replaces the copy document's two-paragraph
     * hero block (which ended "This page summarizes it. The full document is
     * below."). Supplied verbatim by Marketing; the brand now speaks in the
     * first person here rather than describing the document neutrally.
     * ⚠️ consumer-rights-copy.md still carries the old version — update it there.
     */
    intro:
      "<p>We take your consumer rights seriously, and we want you to be informed before you hire anyone to work on your home. That is why we encourage you to read this page and download the Office of the Illinois Attorney General's two-page fact sheet, which covers contracts, cancellation rights, and more.</p>",
    scopeNote:
      "<p>This page and the fact sheet cover <strong>Illinois law</strong>. If your home is outside Illinois, contact your state's attorney general for the equivalent guidance.</p>",
    beforeSignIntro:
      "<p>The Attorney General's office recommends ten precautions. They come down to one idea: get it in writing, and don't let anyone rush you.</p>",
    precautions: [
      '<ol>',
      '<li><strong>Get every estimate in writing.</strong></li>',
      "<li><strong>Don't let high-pressure sales tactics push you into signing.</strong></li>",
      "<li><strong>Never sign a contract with blank spaces</strong>, or one you don't fully understand. If you're financing the work with a loan, wait for your lender's approval before you sign.</li>",
      '<li><strong>Know your cancellation window.</strong> See the table below.</li>',
      '<li><strong>Check that the business is real.</strong> If a contractor operates under a name other than their own, that business must either be incorporated or registered under the Assumed Business Name Act. Verify incorporation with the Illinois Secretary of State, or registration with your county clerk.</li>',
      '<li><strong>Ask about permits.</strong> Check with your local and county units of government to find out whether permits or inspections are required.</li>',
      '<li><strong>Ask whether the contractor guarantees</strong> their work and their products.</li>',
      '<li><strong>Confirm the contractor carries proper insurance.</strong></li>',
      "<li><strong>Don't sign a certificate of completion or make the final payment</strong> until the work is done to your satisfaction.</li>",
      '<li><strong>Ask for lien waivers</strong> for any and all subcontractors.</li>',
      '</ol>',
    ].join('\n'),
    cancellationIntro:
      '<p>If you sign at home, you get time to reconsider. A contractor cannot take that right away from you — not by starting work early, not by selling your contract to a lender, not by any other tactic.</p>',
    cancellationAfterTable:
      '<p>Whichever of the two insurance deadlines comes first is the one that applies. Cancel in writing.</p>',
    cancellationAfterCallout:
      '<p>One exception to the refund rule: if the contractor already supplied goods or services related to a catastrophe that you agreed to in writing as necessary to prevent damage to the premises, they are entitled to the reasonable value of that work.</p>',
    contractAfterTable: '<p>Keep a copy of the signed contract somewhere safe.</p>',
    swornStatementBody:
      '<p>Before you pay your contractor, you have the right to a signed and notarized written statement — a <strong>"Sworn Statement"</strong> — listing everyone your contractor hired to work on your home, their addresses, the amounts about to be paid to each, and the total still owed after your payment.</p>',
    liensBody:
      "<p>Suppliers and subcontractors can file a lien against your home if they don't get paid for their labor or materials — including in cases where you have already paid your contractor. Requesting a Sworn Statement before you pay, and collecting lien waivers, is how you protect yourself.</p>",
    fraudIntro: '<p>Use extreme caution if you encounter any of the following.</p>',
    complaintIntro:
      "<p>If you think you've been defrauded by a contractor, bring your concerns to your state's attorney or the Illinois Attorney General's Office.</p>",
    // The second paragraph of this answer (the IllinoisAttorneyGeneral.gov link)
    // is rendered as JSX from `AG_LINK` — see the note there.
    fileComplaintBody:
      "<p>Call the Consumer Fraud Hotline for your region using the numbers above, or contact your state's attorney. Individuals with hearing or speech disabilities can reach the Attorney General's Office using the <strong>7-1-1 relay service</strong>.</p>",
    roofingBody:
      '<p>To file a complaint against a roofing contractor, contact the <strong>Illinois Department of Financial and Professional Regulation</strong> at <a href="tel:+13128146910">312-814-6910</a>, or file a complaint directly on its website.</p>',
    downloadBody:
      '<p>Everything on this page is a summary. The official two-page document contains the complete text.</p>',
    /*
     * Marketing revision 2026-09-15 — split from two italic paragraphs into
     * three bullets. The wording is unchanged; the first paragraph simply broke
     * at its own sentence boundary (source citation / disclaimer) and the second
     * became the third bullet. The italic treatment is kept, since only the
     * structure was asked for.
     * ⚠️ consumer-rights-copy.md still carries the two-paragraph form.
     */
    footnote: [
      '<ul>',
      '<li><em>Source: Office of the Illinois Attorney General, "Home Repair: Know Your Consumer Rights," Rev. 04/2023.</em></li>',
      '<li><em>This page is provided for general information, is not legal advice, and does not replace the official document.</em></li>',
      '<li><em>J. Blanton Plumbing is licensed, bonded and insured in Illinois.</em></li>',
      '</ul>',
    ].join('\n'),
  },
};

/**
 * Flat `main_pages.content` JSONB keys for the CMS editor + seed. Kept in sync
 * with the CMS editor (`/admin/consumer-rights`), the seed script
 * (`scripts/seed-consumer-rights-page.ts`) and the rich-text registry
 * (`src/lib/cms/rich-text-fields.ts`).
 *
 * Note what is ABSENT and why: the headings, the table rows, the hotline
 * numbers, the six fraud cards, the CTA and the two verbatim statutory blocks.
 * See the header of this file.
 */
export const CONSUMER_RIGHTS_CMS_FIELDS = {
  hero_heading: CONSUMER_RIGHTS.hero.heading,
  hero_image: CONSUMER_RIGHTS.hero.image,
  intro_body: CONSUMER_RIGHTS.prose.intro,
  scope_note: CONSUMER_RIGHTS.prose.scopeNote,
  before_sign_intro: CONSUMER_RIGHTS.prose.beforeSignIntro,
  precautions_html: CONSUMER_RIGHTS.prose.precautions,
  cancellation_intro: CONSUMER_RIGHTS.prose.cancellationIntro,
  cancellation_after_table: CONSUMER_RIGHTS.prose.cancellationAfterTable,
  cancellation_after_callout: CONSUMER_RIGHTS.prose.cancellationAfterCallout,
  contract_after_table: CONSUMER_RIGHTS.prose.contractAfterTable,
  sworn_statement_body: CONSUMER_RIGHTS.prose.swornStatementBody,
  liens_body: CONSUMER_RIGHTS.prose.liensBody,
  fraud_intro: CONSUMER_RIGHTS.prose.fraudIntro,
  complaint_intro: CONSUMER_RIGHTS.prose.complaintIntro,
  file_complaint_body: CONSUMER_RIGHTS.prose.fileComplaintBody,
  roofing_body: CONSUMER_RIGHTS.prose.roofingBody,
  download_body: CONSUMER_RIGHTS.prose.downloadBody,
  footnote_html: CONSUMER_RIGHTS.prose.footnote,
} as const;

/** Every CMS rich-text key on this page — the registry and the editor both read it. */
export const CONSUMER_RIGHTS_RICH_TEXT_FIELDS: readonly string[] = [
  'intro_body',
  'scope_note',
  'before_sign_intro',
  'precautions_html',
  'cancellation_intro',
  'cancellation_after_table',
  'cancellation_after_callout',
  'contract_after_table',
  'sworn_statement_body',
  'liens_body',
  'fraud_intro',
  'complaint_intro',
  'file_complaint_body',
  'roofing_body',
  'download_body',
  'footnote_html',
];
