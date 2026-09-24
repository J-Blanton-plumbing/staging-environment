/**
 * Brief 188 (Track E) — "Need help with this?" link from a topic to its service
 * page. Rendered on articles (for the article's PRIMARY topic) and on topic
 * pages. Hidden unless BOTH the link and its text are set on the topic, so an
 * editor hides it by clearing either field.
 *
 * Styled as the brand's secondary text link (brand-rules.md "Secondary / Text
 * Link": Nunito, arrow, underline on hover) in Cerulean on Cream — deliberately
 * NOT a button and NOT Carmine, so it never competes with the closing CTA.
 */
export default function TopicServiceLink({ href, text }: { href: string | null | undefined; text: string | null | undefined }) {
  if (!href || !text?.trim()) return null;
  return (
    <aside className="kh-service-link" aria-label="Related service">
      <a href={href}>
        {text.trim()} <span aria-hidden="true">&rarr;</span>
      </a>
    </aside>
  );
}
