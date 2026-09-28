import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { Check } from '@/components/kh/v2-blocks/V2Blocks';
import { khTopicHref } from '@/lib/cms/kh-taxonomy-types';
import type { FeaturedArticle } from '@/lib/cms/kh-featured';

/**
 * Brief 193 — the Knowledge Hub "Featured Article" card (hub page 1 only).
 *
 * Previews the article the way its V2 masthead does: hero image, title, dek,
 * Key Takeaways (at most 3), byline + read time, "READ ARTICLE". Layout, motion
 * and responsive rules live in knowledge-hub.css under `.kh-page .kh-featured`
 * (CSS only — no framer-motion). The caller renders this only when
 * `getFeaturedArticle` returned an article, so there is never an empty box.
 *
 * Three links share one URL; the image link is `tabIndex={-1}` + `aria-hidden`,
 * so keyboard and screen-reader users meet the title and the button only.
 */

const UI = {
  eyebrow: 'FEATURED ARTICLE',
  takeaways: 'Key takeaways',
  by: 'By',
  minRead: 'min read',
  cta: 'READ ARTICLE',
} as const;

export default function FeaturedArticleCard({ article }: { article: FeaturedArticle }) {
  const title = (
    <h3 className="kh-featured-title font-display font-bold text-navy-800 tracking-normal">
      <Link href={article.href} className="hover:text-brand-600 transition-colors">
        {article.title}
      </Link>
    </h3>
  );
  return (
    <div className="kh-featured">
      <p className="kh-featured-eyebrow font-display font-bold uppercase">{UI.eyebrow}</p>
      <article className="kh-featured-card bg-white shadow-soft overflow-hidden">
        <Link href={article.href} className="kh-featured-media bg-cream-200" tabIndex={-1} aria-hidden="true">
          <Image src={article.image} alt={article.imageAlt} fill sizes="(min-width:1024px) 45vw, 100vw" className="object-cover" />
        </Link>
        <div className="kh-featured-body">
          {/* Same one-slot ternary as ArticleCard: an untagged article renders
              no empty chip slot (and no `$undefined` in the RSC payload). */}
          {article.topic ? (
            <>
              <Link href={khTopicHref(article.topic.slug)} className="kh-chip kh-chip--primary kh-featured-chip">
                {article.topic.name}
              </Link>
              {title}
            </>
          ) : (
            title
          )}
          {article.dek ? <p className="kh-featured-dek font-sans text-navy-800">{article.dek}</p> : null}
          {article.takeaways.length > 0 ? (
            <div className="kh-featured-takeaways">
              <p className="kh-featured-takeaways-label font-display font-bold uppercase">{UI.takeaways}</p>
              <ul>
                {article.takeaways.map((t, i) => (
                  <li key={i}>
                    <Check size={18} />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="kh-featured-footer border-t border-cream-200">
            <div className="kh-featured-byline font-sans">
              <span className="kh-featured-avatar font-display font-bold" aria-hidden="true">
                {article.bylineInitials}
              </span>
              <span>
                {UI.by} <strong>{article.bylineName}</strong>
              </span>
              {/* The dot travels with the read time, so a narrow wrap never strands it. */}
              <span className="kh-featured-read">
                <span aria-hidden="true">·</span> {article.readMinutes} {UI.minRead}
              </span>
            </div>
            <Link href={article.href} className="btn-cta kh-featured-cta font-sans text-base">
              {UI.cta} <ArrowRight className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </article>
    </div>
  );
}
