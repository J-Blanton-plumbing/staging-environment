/**
 * Static copy + defaults for the /j-blanton-is-hiring "Join Our Team" page.
 *
 * Brief 109: the recruiting page (indexed, `index, follow`) 404'd in production
 * because no template rendered the route. It is now rebuilt from the LIVE page
 * (https://jblantonplumbing.com/j-blanton-is-hiring) using the shared Coverage
 * Area building blocks, and registered in the CMS under Utility Pages.
 *
 * This file is the STATIC FALLBACK / seed source. The live page merges the
 * `main_pages` row (slug `j-blanton-is-hiring`) over these defaults, so an
 * un-seeded environment still renders faithfully. The DB stores the three lists
 * as newline-delimited strings (one item per line) — the public page and the
 * CMS editor split/join on `\n`. See `HIRING_CMS_FIELDS` for the flat key map.
 *
 * The hero "JOIN US" CTA links OUT to the external application portal
 * (i.jblantonplumbing.com/careers) exactly as the live site — that portal is
 * out of scope. The CTA is intentionally NOT CMS-editable (fixed external link).
 */

export interface HiringContent {
  meta: { title: string; description: string };
  hero: {
    /** H1. */
    heading: string;
    /** Primary CTA — external application portal (fixed, not CMS-editable). */
    cta: { label: string; href: string };
  };
  body: {
    heading: string;
    intro: string;
    paragraph: string;
    benefitsLabel: string;
    benefits: string[];
    candidatesLabel: string;
    candidates: string[];
    signingBonus: string;
    readyParagraph: string;
    positionsLabel: string;
    positions: string[];
  };
}

export const IS_HIRING: HiringContent = {
  meta: {
    // Bare title — the root layout applies the `%s | J. Blanton Plumbing`
    // template, so this must NOT repeat the brand suffix.
    title: 'Join Our Team: Careers for Skilled Plumbers',
    description:
      'J. Blanton Plumbing is hiring licensed, residential-experienced plumbers across Chicagoland. Competitive benefits, a signing bonus for qualified candidates, and room to grow.',
  },
  hero: {
    heading:
      'Join Our Team: Exciting Opportunities at JBP for Skilled Plumbers – Benefits & Signing Bonus Included!',
    cta: { label: 'JOIN US', href: 'https://i.jblantonplumbing.com/careers' },
  },
  body: {
    heading: 'We Are Hiring!',
    intro: 'Grow with us! Submit your application to join the JBP team!',
    paragraph:
      'We are a third-generation company with a family-oriented, teamwork-focused culture. We value one another and constantly work to improve our relationships, work, and knowledge. We strive every day to give our employees the best working environment possible and provide our customers with 5-star service every time we knock on their door. Members of the J. Blanton team receive ongoing education in sales, leadership, and mechanical techniques, as well as the advantage of using technology to assist you throughout your daily tasks.',
    benefitsLabel: 'Employees Receive:',
    benefits: [
      'Hourly Pay',
      'Commission on Sales',
      '401k',
      'Health Insurance',
      'Paid Vacation',
      'Paid Sick Days',
      'Paid Personal Days',
      'Company Truck',
      'Gas Card',
      'iPhone & iPad',
      'Brand New Uniforms',
      'Bonuses',
    ],
    candidatesLabel: 'Candidates must have:',
    candidates: [
      'State of Illinois or City of Chicagoland Plumbing License',
      'Residential plumbing experience',
      "Valid Driver's License",
      'Clean background check and drug test',
    ],
    signingBonus: 'SIGNING BONUS FOR QUALIFIED CANDIDATES',
    readyParagraph:
      'Ready to join the J. Blanton family? Fill out the form below or contact us to schedule a meet and greet.',
    positionsLabel: 'Current Positions:',
    positions: ['Service Plumber – 5 years of experience required'],
  },
};

/**
 * Flat `main_pages.content` JSONB keys for the CMS editor + seed. Kept in sync
 * with the CMS editor (`/admin/j-blanton-is-hiring`) and the seed script
 * (`scripts/seed-hiring-page.ts`). Lists are newline-delimited strings.
 */
export const HIRING_CMS_FIELDS = {
  hero_heading: IS_HIRING.hero.heading,
  body_heading: IS_HIRING.body.heading,
  body_intro: IS_HIRING.body.intro,
  body_paragraph: IS_HIRING.body.paragraph,
  benefits_label: IS_HIRING.body.benefitsLabel,
  benefits: IS_HIRING.body.benefits.join('\n'),
  candidates_label: IS_HIRING.body.candidatesLabel,
  candidates: IS_HIRING.body.candidates.join('\n'),
  signing_bonus: IS_HIRING.body.signingBonus,
  ready_paragraph: IS_HIRING.body.readyParagraph,
  positions_label: IS_HIRING.body.positionsLabel,
  positions: IS_HIRING.body.positions.join('\n'),
} as const;

/** Split a newline-delimited CMS list value into trimmed, non-empty items. */
export function splitHiringList(value: unknown, fallback: string[]): string[] {
  if (typeof value !== 'string') return fallback;
  const items = value
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  return items.length > 0 ? items : fallback;
}
