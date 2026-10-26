import Link from 'next/link';
import Image from 'next/image';

/**
 * No Drip Club band — extracted verbatim from the homepage (brief-07 §11) so
 * it can be shared by the homepage and every sub-service page (brief-11 §8).
 *
 * Markup + positioning are ported from the live theme; all styling lives in
 * `globals.css` under `.no-drip-club` (Carmine background, wrench pattern at
 * 0.78 opacity, skewed labels, white 266×45 pill in Industry Medium). Only the
 * body copy and CTA label/href vary per caller — everything visual is fixed.
 *
 * Renders just the `.no-drip-club` card; the caller supplies the surrounding
 * Cream-width wrapper (homepage already does, the service template adds one).
 *
 * Brief 115: this is a shared component (homepage, Services index, and every
 * City V2 city all render it), so it does NOT call the renderer itself — each
 * caller renders its own `bodyHtml` (via `renderCmsBlock`) and hands this
 * component a ready-to-inject string. That way a change to one consumer's
 * render path can never regress the others. `bodyHtml` is injected via
 * `dangerouslySetInnerHTML` so block markup (real `<ul>`/`<li>`, `<h2>`/`<h3>`)
 * survives instead of being escaped — fixes the Algonquin City V2 bug where
 * raw `<ul>`/`&amp;` leaked into the page as visible text.
 */
export default function NoDripClubSection({
  bodyHtml,
  ctaLabel = 'JOIN THE NO DRIP CLUB',
  ctaHref = '/no-drip-club',
  label = 'NO DRIP CLUB',
  image = '/images/jbcharacter.webp',
  imageAlt = 'J. Blanton Character',
}: {
  bodyHtml: string;
  ctaLabel?: string;
  ctaHref?: string;
  /**
   * Brief 219: the band label (rendered twice by the design), the character image and its alt. Only
   * the homepage passes them (from /admin/home); every other caller keeps these defaults.
   */
  label?: string;
  image?: string;
  imageAlt?: string;
}) {
  return (
    <div className="no-drip-club">
      <Image
        src={image}
        alt={imageAlt}
        width={350}
        height={450}
        className="character"
      />
      <div className="no-drip-red" />
      <div className="no-drip-labels">
        <p>{label}</p>
        <p>{label}</p>
      </div>
      <div className="no-drip-content">
        <div className="no-drip-body" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
        <Link href={ctaHref}>{ctaLabel}</Link>
      </div>
    </div>
  );
}
