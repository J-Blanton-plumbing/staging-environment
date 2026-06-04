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
 */
export default function NoDripClubSection({
  body,
  ctaLabel = 'JOIN THE NO DRIP CLUB',
  ctaHref = '/no-drip-club',
}: {
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  return (
    <div className="no-drip-club">
      <Image
        src="/images/jbcharacter.webp"
        alt="J. Blanton Character"
        width={350}
        height={450}
        className="character"
      />
      <div className="no-drip-red" />
      <div className="no-drip-labels">
        <p>NO DRIP CLUB</p>
        <p>NO DRIP CLUB</p>
      </div>
      <div className="no-drip-content">
        <p>{body}</p>
        <Link href={ctaHref}>{ctaLabel}</Link>
      </div>
    </div>
  );
}
