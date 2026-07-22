import { getGlobalSettingsCached } from '@/lib/cms/global-settings';
import { resolveTokens } from '@/lib/cms/tokens';
import ServiceProblemsView from '@/components/ServiceProblemsView';
import type { ResolvedBlockStyle } from '@/lib/cms/sub-service-blocks';
import type { ServiceContent } from '@/types/service';

/**
 * §4 — common-problems block (brief-11 §4 / brief-61 fix). Thin async wrapper:
 * it resolves Global Settings + `{{tokens}}` on the server, then hands the fully
 * resolved copy to the client-safe <ServiceProblemsView>, which owns the markup
 * (the shared "Problems We Solve" character-panel treatment). The View is the same
 * component the admin live preview renders (Brief 91, Track D), so the two paths
 * can't drift.
 *
 * Brief 91: an optional per-instance `style` (background / character pose / side)
 * flows through to the View. When absent the View renders the historical Carmine
 * panel with white copy and the shared `jbcharacter.webp`, unchanged.
 */
export default async function ServiceProblems({
  problems,
  style,
}: {
  problems: ServiceContent['problemsSection'];
  style?: ResolvedBlockStyle | null;
}) {
  const settings = await getGlobalSettingsCached();
  return (
    <ServiceProblemsView
      heading={resolveTokens(problems.heading, settings)}
      items={problems.problems.map((item) => resolveTokens(item, settings))}
      phoneHref={settings.phoneHref}
      ctaLabel={settings.ctaPrimaryLabel}
      style={style}
    />
  );
}
