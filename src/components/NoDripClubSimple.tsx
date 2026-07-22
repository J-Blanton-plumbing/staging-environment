import { getGlobalSettingsCached } from '@/lib/cms/global-settings';
import { renderCmsInline } from '@/lib/cms/sanitize';
import { resolveTokens } from '@/lib/cms/tokens';
import NoDripClubView from '@/components/NoDripClubView';
import type { ResolvedBlockStyle } from '@/lib/cms/sub-service-blocks';

/**
 * §8 — No Drip Club, simple `.f2` variant (brief-61 Track G).
 *
 * The live sub-service pages use a plain two-column band — red label + copy +
 * a white "JOIN NOW" pill on the left, the `preventative.webp` photo on the
 * right — NOT the character/red-panel treatment in <NoDripClubSection />. That
 * component stays for the homepage + pages that use the character variant.
 *
 * Brief 86 (item 5): `body` is rendered through `renderCmsInline` (sanitized
 * against the Brief 73 allow-list) since the admin's NDC Body field is a
 * `RichTextField`. The generic default copy below is plain text and renders
 * identically through the same path.
 *
 * Brief 91: thin async wrapper — it resolves Global Settings + `{{tokens}}` and
 * sanitizes the body on the server, then hands the resolved values to the
 * client-safe <NoDripClubView> (the same markup the admin live preview renders,
 * so the two can't drift). An optional per-instance `style` (background /
 * character pose / image side) flows through; when absent the View renders the
 * historical Cream band with the `preventative.webp` photo, unchanged.
 */
export default async function NoDripClubSimple({
  title = 'Premium Protection with Our No Drip Club',
  body = 'Our No Drip Club offers premium plumbing protection and added peace of mind for homeowners. Members enjoy priority scheduling and routine inspections to catch small issues before they become costly repairs.',
  image = 'https://d1rplazj5a80fb.cloudfront.net/images/preventative.webp',
  style,
}: {
  title?: string;
  body?: string;
  image?: string;
  style?: ResolvedBlockStyle | null;
}) {
  const settings = await getGlobalSettingsCached();
  return (
    <NoDripClubView
      title={resolveTokens(title, settings)}
      bodyHtml={renderCmsInline(body, settings)}
      image={image}
      style={style}
    />
  );
}
