import { getGlobalSettingsCached } from '@/lib/cms/global-settings';
import { renderCmsInline } from '@/lib/cms/sanitize';
import { resolveTokens } from '@/lib/cms/tokens';
import TwoColumnSectionView from '@/components/TwoColumnSectionView';
import type { ServiceContent } from '@/types/service';

/**
 * §11 — closing CTA band (brief-11 §11 / brief-61 Track J).
 *
 * Brief 93 (Track E): Final CTA is merged into the "2 Column Section". This
 * component is now the ALIAS render path for any legacy / not-yet-converted
 * `finalCta` block instance (and the static-content pages' closing CTA): it maps
 * the CTA fields onto <TwoColumnSectionView> so an un-converted Final CTA produces
 * the SAME 2 Column output as a converted one — the page is never in a broken
 * state before/after the one-time conversion.
 *
 * The button preserves the Final CTA's original link: the "MAKE A GOOD CALL"
 * label (`ctaPrimaryLabel`) pointing at the phone (`phoneHref`), both from Global
 * Settings. Note the layout change from the old centered `.f3.f3-left` band to the
 * 2 Column layout (flagged in the Brief 93 report).
 */
export default async function ServiceClosingCTA({
  cta,
}: {
  cta: ServiceContent['closingCTA'];
}) {
  const settings = await getGlobalSettingsCached();
  return (
    <TwoColumnSectionView
      heading={resolveTokens(cta.heading, settings)}
      paragraphs={cta.body ? [renderCmsInline(cta.body, settings)] : []}
      image={cta.image}
      // Default 2 Column layout (image right); the old `.f3-left` band is superseded.
      position="right"
      button={{ label: settings.ctaPrimaryLabel, href: settings.phoneHref }}
    />
  );
}
