import { CANONICAL_BASE } from '@/lib/seo';
import { organizationNode, organizationRef, type OrganizationNode } from '@/lib/schema/organization-ref';

/**
 * Brief 188 (Track F1/F2) — the `BlogPosting` node for one Knowledge Hub article.
 * Pure (no DB, no React) so the prebuild JSON-LD check can run it on fixtures.
 *
 * 🔴 The rule (Brief 167): schema never states a fact the site doesn't hold.
 *   • image          — the article's own hero only; OMITTED when it has none.
 *                      Never the card fallback photo.
 *   • description    — meta description, else excerpt; omitted when both empty.
 *   • author         — the Organization by @id. No invented person byline.
 *   • datePublished / dateModified — OMITTED for WordPress imports
 *     (`wpPostId` set): all 812 share one import timestamp inside a 33-second
 *     window (Brief 122), and their version rows carry the Brief 159 seed time.
 *     Neither is a publish date. For CMS-created articles only:
 *       datePublished = first EDITORIAL publish, else created_at
 *       dateModified  = latest editorial publish, only if later
 *     where "editorial" excludes the Brief 159 baseline version.
 */

/** Google truncates Article headlines past 110 characters; the visible H1 is never touched. */
export const HEADLINE_MAX = 110;

export function schemaHeadline(title: string): string {
  const t = title.trim();
  if (t.length <= HEADLINE_MAX) return t;
  const cut = t.slice(0, HEADLINE_MAX + 1);
  const at = cut.lastIndexOf(' ');
  return (at > 40 ? cut.slice(0, at) : t.slice(0, HEADLINE_MAX)).replace(/[\s,;:–—-]+$/, '');
}

export interface BlogPostingInput {
  title: string;
  metaDescription: string;
  excerpt: string;
  /** The stored hero image (absolute CDN URL or site-relative path), or ''. */
  image: string;
  /** The page's canonical URL — the same one the <link rel="canonical"> carries. */
  canonical: string;
  wpPostId: number | null;
  createdAt: Date | null;
  firstPublishedAt: Date | null;
  lastPublishedAt: Date | null;
}

export interface BlogPostingNode {
  '@context': 'https://schema.org';
  '@type': 'BlogPosting';
  headline: string;
  description?: string;
  image?: string[];
  url: string;
  mainEntityOfPage: { '@type': 'WebPage'; '@id': string };
  author: { '@id': string };
  publisher: OrganizationNode;
  datePublished?: string;
  dateModified?: string;
}

function absoluteImage(src: string): string | null {
  const s = src.trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith('//')) return `https:${s}`;
  if (s.startsWith('/')) return `${CANONICAL_BASE}${encodeURI(s)}`;
  return null;
}

export function buildBlogPosting(a: BlogPostingInput): BlogPostingNode {
  const node: BlogPostingNode = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: schemaHeadline(a.title),
    url: a.canonical,
    mainEntityOfPage: { '@type': 'WebPage', '@id': a.canonical },
    author: organizationRef(),
    publisher: organizationNode(),
  };
  const description = a.metaDescription.trim() || a.excerpt.trim();
  if (description) node.description = description;
  const image = absoluteImage(a.image);
  if (image) node.image = [image];

  if (a.wpPostId === null) {
    const published = a.firstPublishedAt ?? a.createdAt;
    if (published) {
      node.datePublished = published.toISOString();
      if (a.lastPublishedAt && a.lastPublishedAt.getTime() > published.getTime()) {
        node.dateModified = a.lastPublishedAt.toISOString();
      }
    }
  }
  return node;
}
