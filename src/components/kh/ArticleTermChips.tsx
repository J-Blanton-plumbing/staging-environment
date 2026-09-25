import { khAreaHref, khTopicHref, type ArticleTermsDisplay } from '@/lib/cms/kh-taxonomy-types';

/**
 * Brief 187 (C2) — an article's tags, directly under the hero nav.
 *
 * Order: primary topic (emphasised: solid Carmine), then secondary topics, then
 * locations. Every chip is a real link to its topic / area page.
 *
 * Renders NOTHING — no wrapper, no spacing — when the article has no terms, so an
 * untagged article's HTML is exactly what it was before this brief.
 */
/** True when there is at least one chip to show. Callers use it to leave the chip slot out entirely. */
export function hasArticleTerms(terms: ArticleTermsDisplay): boolean {
  return !!terms.primary || terms.secondary.length > 0 || terms.locations.length > 0;
}

/**
 * Brief 190: `onRed` adds the `kh-chip-list--on-red` MODIFIER for a Carmine
 * background (the Article V2 masthead), styled only in article-v2.css. The base
 * chips are unchanged, and without the prop the markup is byte-identical to
 * Brief 187's.
 */
export default function ArticleTermChips({ terms, onRed = false }: { terms: ArticleTermsDisplay; onRed?: boolean }) {
  const { primary, secondary, locations } = terms;
  if (!hasArticleTerms(terms)) return null;
  return (
    <nav className="article-terms" aria-label="Article topics and locations">
      <ul className={onRed ? 'kh-chip-list kh-chip-list--on-red' : 'kh-chip-list'}>
        {primary && (
          <li>
            <a href={khTopicHref(primary.slug)} className="kh-chip kh-chip--primary">{primary.name}</a>
          </li>
        )}
        {secondary.map((t) => (
          <li key={`t-${t.slug}`}>
            <a href={khTopicHref(t.slug)} className="kh-chip kh-chip--secondary">{t.name}</a>
          </li>
        ))}
        {locations.map((l) => (
          <li key={`l-${l.slug}`}>
            <a href={khAreaHref(l.slug)} className="kh-chip kh-chip--location">{l.name}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
