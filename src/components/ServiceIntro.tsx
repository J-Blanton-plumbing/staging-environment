import { getGlobalSettingsCached } from '@/lib/cms/global-settings';
import { renderCmsInline } from '@/lib/cms/sanitize';
import { resolveTokens } from '@/lib/cms/tokens';
import type { ServiceContent } from '@/types/service';

/**
 * §3 — "Experts You Should Call" intro (brief-11 §3 / brief-61 Track B).
 * Live `.f` two-column pattern on a Cream `#F9F3EC` background: heading + copy
 * in the left column with the service photo embedded for mobile, and the same
 * photo as the right column on desktop. Heading is Carmine H2; body paragraphs
 * are Midnight Nunito 16/24.
 *
 * `image1` is the single service photo, rendered twice (mobile inside the text
 * column, desktop as the right column) to mirror the WordPress `.f` markup.
 * When it is empty the slot renders a Cream placeholder rather than a broken
 * image (brief-11 §1 note).
 *
 * Brief 86 (item 3): `paragraphs` entries are rendered through `renderCmsInline`
 * (sanitized against the Brief 73 allow-list) instead of as plain text, so a
 * DB-backed sub-service's RichTextField-authored intro body (bold/lists/links)
 * renders correctly. Legacy plain-text paragraphs from the static content
 * files still render identically — `renderCmsInline` escapes and converts
 * newlines for non-HTML input.
 */
export default async function ServiceIntro({
  expert,
}: {
  expert: ServiceContent['expertSection'];
}) {
  const settings = await getGlobalSettingsCached();
  return (
    <section className="bg-cream-100 py-[70px] md:py-[100px]">
      <div className="w-[90%] lg:w-[81%] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-[60px] items-center">
          {/* Left — heading, mobile-only photo, body paragraphs */}
          <div>
            <h2 className="font-display font-bold text-brand-600 text-[28px] md:text-[32px] leading-tight tracking-tight mb-8">
              {resolveTokens(expert.heading, settings)}
            </h2>

            {/* Mobile: photo inside the text column (hidden on desktop) */}
            <ServiceImage
              src={expert.image1}
              className="aspect-[4/3] w-full mb-8 lg:hidden"
            />

            <div className="text-navy-800 space-y-5">
              {expert.paragraphs.map((p, i) => (
                <p
                  key={i}
                  className="font-sans text-[16px] leading-[24px]"
                  dangerouslySetInnerHTML={{ __html: renderCmsInline(p, settings) }}
                />
              ))}
            </div>
          </div>

          {/* Right — desktop-only photo column (hidden on mobile) */}
          <ServiceImage
            src={expert.image1}
            className="aspect-[4/3] w-full hidden lg:block"
          />
        </div>
      </div>
    </section>
  );
}

/**
 * Service photo with a Cream placeholder fallback. Used across the template's
 * Cream sections until the CDN filenames are confirmed (brief-11 §1 / flag 3).
 * Plain `<img>` — the CDN host isn't in next/image's remotePatterns.
 */
export function ServiceImage({
  src,
  className = '',
}: {
  src: string;
  className?: string;
}) {
  if (!src) {
    // Placeholder: Cream block (no broken image, no #000)
    return (
      <div
        className={`rounded-[5px] bg-cream-200 ${className}`}
        aria-hidden="true"
      />
    );
  }
  return (
    <img
      src={src}
      alt=""
      className={`rounded-[5px] object-cover ${className}`}
    />
  );
}
