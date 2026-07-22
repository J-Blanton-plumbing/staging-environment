/**
 * Flat field set for a sub-service page, shared by published rows, preview drafts
 * and the block helpers. Kept in its own pure module (no DB import) so both
 * client and server code can reference the shape (Brief 89, Track B).
 */
export interface SubServiceFields {
  slug: string;
  title?: string | null;
  heroHeading?: string | null;
  heroIntro?: string | null;
  heroImage?: string | null;
  introHeading?: string | null;
  introBody?: string | null;
  fImage?: string | null; // intro/expert section photo (expertSection.image1)
  problemsHeading?: string | null;
  problemsItems?: string[];
  ctaHeading?: string | null;
  ctaBody?: string | null;
  f3Image?: string | null; // closing-CTA photo (closingCTA.image)
  ndcTitle?: string | null; // No Drip Club selling point (noDropClubSection.title)
  ndcBody?: string | null; // No Drip Club body copy (noDropClubSection.body)
  metaTitle?: string | null;
  metaDescription?: string | null;
}
