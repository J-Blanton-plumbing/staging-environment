import { khTopicHref, type KhTermRef } from '@/lib/cms/kh-taxonomy-types';

/**
 * Brief 187 (C3) — "All" + one link per topic, above the article grid.
 *
 * Real `<a href>` links to the topic pages (crawlable, work without JS), never
 * client-side filtering. Topics with zero published articles are left out by
 * the caller (`getTopicFilterRow`), and when NO topic has any the row is not
 * rendered at all — a lone "All" pill would be noise.
 *
 * Wraps onto as many lines as it needs (flex-wrap), so it never scrolls
 * sideways at 375px.
 */
export default function TopicFilterRow({
  topics,
  activeSlug,
}: {
  topics: KhTermRef[];
  /** The current topic's slug; null on the hub ("All" active). */
  activeSlug: string | null;
}) {
  if (topics.length === 0) return null;
  const cls = (active: boolean) => `kh-filter${active ? ' kh-filter--active' : ''}`;
  return (
    <nav className="kh-filter-row" aria-label="Browse articles by topic">
      <ul className="kh-chip-list">
        <li>
          <a href="/knowledge-hub" className={cls(activeSlug === null)} aria-current={activeSlug === null ? 'page' : undefined}>
            All
          </a>
        </li>
        {topics.map((t) => (
          <li key={t.slug}>
            <a
              href={khTopicHref(t.slug)}
              className={cls(activeSlug === t.slug)}
              aria-current={activeSlug === t.slug ? 'page' : undefined}
            >
              {t.name}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
