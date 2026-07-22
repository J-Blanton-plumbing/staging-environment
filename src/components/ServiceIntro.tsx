import { getGlobalSettingsCached } from '@/lib/cms/global-settings';
import { renderCmsInline } from '@/lib/cms/sanitize';
import { resolveTokens } from '@/lib/cms/tokens';
import TwoColumnSectionView from '@/components/TwoColumnSectionView';
import type { BlockPosition } from '@/lib/cms/sub-service-blocks';
import type { ServiceContent } from '@/types/service';

/**
 * §3 — "Experts You Should Call" intro (brief-11 §3 / brief-61 Track B).
 *
 * Brief 93 (Track A/B/C): the Intro block was generalized into the reusable
 * "2 Column Section". This is now a thin async wrapper — it resolves Global
 * Settings + `{{tokens}}` and sanitizes the body on the server, then hands the
 * resolved values to the client-safe <TwoColumnSectionView> (the same markup the
 * admin live preview renders, so the two can't drift).
 *
 * An optional `position` (which side the image sits on, desktop only) and an
 * optional `button` flow through. With neither set — the case for every existing
 * intro instance and every static-content service page — the View renders exactly
 * the historical `.f` two-column intro: text left, image right, no button, mobile
 * text-first.
 *
 * `image1` is the single service photo, rendered twice by the View (mobile inside
 * the text column, desktop as the image column) to mirror the WordPress `.f`
 * markup. Body paragraphs render through `renderCmsInline` (sanitized against the
 * Brief 73 allow-list) so RichTextField-authored HTML (bold/lists/links) renders
 * correctly; legacy plain-text paragraphs render identically.
 */
export default async function ServiceIntro({
  expert,
  position,
  button,
}: {
  expert: ServiceContent['expertSection'];
  /** Brief 93: desktop image side. Omitted → the historical intro default ('right'). */
  position?: BlockPosition;
  /** Brief 93: optional CTA button. Omitted/null → no button (historical intro). */
  button?: { label: string; href: string } | null;
}) {
  const settings = await getGlobalSettingsCached();
  return (
    <TwoColumnSectionView
      heading={resolveTokens(expert.heading, settings)}
      paragraphs={expert.paragraphs.map((p) => renderCmsInline(p, settings))}
      image={expert.image1}
      position={position}
      button={button ? { label: resolveTokens(button.label, settings), href: button.href } : null}
    />
  );
}

/**
 * Service photo with a Cream placeholder fallback. Still exported here because
 * other sections (ServiceRelatedCards, …) import it; the 2 Column render uses its
 * own equivalent inside <TwoColumnSectionView>. Plain `<img>` — the CDN host isn't
 * in next/image's remotePatterns.
 */
export function ServiceImage({
  src,
  className = '',
}: {
  src: string;
  className?: string;
}) {
  if (!src) {
    // Placeholder: Cream block (no broken image, no #000)
    return (
      <div
        className={`rounded-[5px] bg-cream-200 ${className}`}
        aria-hidden="true"
      />
    );
  }
  return (
    <img
      src={src}
      alt=""
      className={`rounded-[5px] object-cover ${className}`}
    />
  );
}
