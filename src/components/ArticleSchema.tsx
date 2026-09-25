import { buildBlogPosting, type BlogPostingInput } from '@/lib/schema/blog-posting';

/**
 * Brief 188 (Track F1) — the one `BlogPosting` block on /knowledge-hub/[slug].
 * All the rules live in `buildBlogPosting` (src/lib/schema/blog-posting.ts).
 * `<` is escaped so an article title can never close the script element.
 */
export default function ArticleSchema(props: BlogPostingInput) {
  const json = JSON.stringify(buildBlogPosting(props)).replace(/</g, '\u003c');
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
