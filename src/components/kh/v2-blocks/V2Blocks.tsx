import Link from 'next/link';
import type { ArticleV2Component, V2ComponentItem } from '@/lib/cms/article-v2';
import { isExternalUrl, isSafeComponentUrl } from '@/lib/cms/article-v2';
import { escapeHtml } from '@/lib/cms/tokens';

/**
 * Brief 192 (Track B) — Article V2's three reusable content components.
 *
 * Each renders the approved prototype's EXACT markup and classes
 * (02_dev-source/jbp-columbus-v3.dev.html; the Brief 185 test page, retired by Brief 191):
 *   Promise list   ul.promises > li > b + span
 *   Service rows   ul.svc      > li > b + span (+ a.more)
 *   Feature cards  div.same    > div > h3 + p (+ ul.benefits > li > svg + text) (+ a.more)
 *   Image + text   div.v2-media-text > div + figure (Brief 201; no prototype, see MediaText)
 * so the rules ported into article-v2.css apply unchanged. Content arrives
 * already sanitized (sanitizeArticleV2Content): plain strings are rendered as
 * React text; the one inline field (card text) is injected as HTML after it has
 * been through the inline allow-list AND token resolution (`renderInline`).
 *
 * An empty component renders nothing. These are not in block-catalogue.ts on
 * purpose (verify-brief-97 asserts that catalogue's fixed count).
 */

export const V2_BLOCK_UI = {
  newTab: ' (opens in a new tab)',
} as const;

/** The prototype's check icon (Carmine, 3px stroke) — shared by the rail NDC card and Feature cards. */
export function Check({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#BC0E0E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

/** a.more — internal paths as client-side links, external URLs in a new tab (as the prototype's "Get directions"). */
function MoreLink({ item }: { item: V2ComponentItem }) {
  if (!item.link_label || !isSafeComponentUrl(item.link_url)) return null;
  if (isExternalUrl(item.link_url)) {
    return (
      <a className="more" href={item.link_url} target="_blank" rel="noopener">
        {item.link_label}
        <span className="visually-hidden">{V2_BLOCK_UI.newTab}</span>
      </a>
    );
  }
  return (
    <Link className="more" href={item.link_url}>
      {item.link_label}
    </Link>
  );
}

function PromiseList({ items }: { items: V2ComponentItem[] }) {
  return (
    <ul className="promises">
      {items.map((i, n) => (
        <li key={n}>
          {i.title && <b>{i.title}</b>}
          {i.text && <span>{i.text}</span>}
        </li>
      ))}
    </ul>
  );
}

function ServiceRows({ items }: { items: V2ComponentItem[] }) {
  return (
    <ul className="svc">
      {items.map((i, n) => (
        <li key={n}>
          {i.title && <b>{i.title}</b>}
          {i.text && <span>{i.text}</span>}
          <MoreLink item={i} />
        </li>
      ))}
    </ul>
  );
}

function FeatureCards({ items, renderInline }: { items: V2ComponentItem[]; renderInline: (html: string) => string }) {
  return (
    <div className="same">
      {items.map((i, n) => (
        <div key={n}>
          {i.title && <h3>{i.title}</h3>}
          {i.text && <p dangerouslySetInnerHTML={{ __html: renderInline(i.text) }} />}
          {i.checklist.length > 0 && (
            <ul className="benefits">
              {i.checklist.map((b, k) => (
                <li key={k}>
                  <Check size={14} />
                  {b}
                </li>
              ))}
            </ul>
          )}
          <MoreLink item={i} />
        </div>
      ))}
    </div>
  );
}

/**
 * Brief 201 (Track A) — Image + text: div.v2-media-text > div.v2-media-text-body + figure.
 * The TEXT comes first in source order (reading order); article-v2.css puts the
 * figure left or right, and above the text on phones. The figure is the body's
 * own in-article photo shape (figure > img + figcaption), so it picks up the
 * existing V2 image and caption styles. Each item is `<strong>title</strong> text`
 * inside a <p> / <li>, the same markup as a body list item.
 */
function MediaText({ component, renderInline }: { component: ArticleV2Component; renderInline: (html: string) => string }) {
  const m = component.media;
  if (!m || !isSafeComponentUrl(m.image_url)) return null;
  const itemHtml = (i: V2ComponentItem) =>
    (i.title ? `<strong>${escapeHtml(i.title)}</strong>${i.text ? ' ' : ''}` : '') + (i.text ? renderInline(i.text) : '');
  const List = m.text_style === 'numbered' ? 'ol' : 'ul';
  return (
    <div className={m.image_side === 'left' ? 'v2-media-text v2-media-text--left' : 'v2-media-text'}>
      <div className="v2-media-text-body">
        {m.text_style === 'paragraphs' ? (
          component.items.map((i, n) => <p key={n} dangerouslySetInnerHTML={{ __html: itemHtml(i) }} />)
        ) : (
          <List>
            {component.items.map((i, n) => (
              <li key={n} dangerouslySetInnerHTML={{ __html: itemHtml(i) }} />
            ))}
          </List>
        )}
      </div>
      <figure>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={m.image_url}
          alt={m.image_alt}
          {...(m.image_width && m.image_height ? { width: m.image_width, height: m.image_height } : {})}
          loading="lazy"
        />
        {m.image_caption && <figcaption>{m.image_caption}</figcaption>}
      </figure>
    </div>
  );
}

export default function V2Block({
  component,
  renderInline,
}: {
  component: ArticleV2Component | undefined;
  /** Sanitize (inline subset) + resolve {{tokens}} for the one rich field. */
  renderInline: (html: string) => string;
}) {
  if (!component || component.items.length === 0) return null;
  switch (component.type) {
    case 'promises':
      return <PromiseList items={component.items} />;
    case 'services':
      return <ServiceRows items={component.items} />;
    case 'cards':
      return <FeatureCards items={component.items} renderInline={renderInline} />;
    case 'media-text':
      return <MediaText component={component} renderInline={renderInline} />;
    default:
      return null;
  }
}
