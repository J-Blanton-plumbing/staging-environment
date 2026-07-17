import Link from 'next/link';
import { ServiceImage } from '@/components/ServiceIntro';
import { getGlobalSettingsCached } from '@/lib/cms/global-settings';
import { renderCmsInline } from '@/lib/cms/sanitize';
import { resolveTokens } from '@/lib/cms/tokens';

/**
 * §8 — No Drip Club, simple `.f2` variant (brief-61 Track G).
 *
 * The live sub-service pages use a plain two-column band — red label + copy +
 * a white "JOIN NOW" pill on the left, the `preventative.webp` photo on the
 * right — NOT the character/red-panel treatment in <NoDripClubSection />. That
 * component stays for the homepage + pages that use the character variant; this
 * one mirrors the `.f2` markup so the service template matches live fidelity.
 *
 * Cream `#F9F3EC` background. On mobile the photo is embedded inside the left
 * column (below the label) and the right column is hidden; on desktop the left
 * column is text-only and the photo becomes the right column.
 *
 * Brief 86 (item 5): `body` is rendered through `renderCmsInline` (sanitized
 * against the Brief 73 allow-list) since the admin's NDC Body field is now a
 * `RichTextField`. The generic default copy below is plain text and renders
 * identically through the same path.
 */
export default async function NoDripClubSimple({
  title = 'Premium Protection with Our No Drip Club',
  body = 'Our No Drip Club offers premium plumbing protection and added peace of mind for homeowners. Members enjoy priority scheduling and routine inspections to catch small issues before they become costly repairs.',
  image = 'https://d1rplazj5a80fb.cloudfront.net/images/preventative.webp',
}: {
  title?: string;
  body?: string;
  image?: string;
}) {
  const settings = await getGlobalSettingsCached();
  return (
    <section className="bg-cream-100 py-[70px] md:py-[100px]">
      <div className="w-[90%] lg:w-[81%] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-[60px] items-center">
          {/* Left — red label, mobile-only photo, copy, JOIN NOW */}
          <div>
            <p className="red-text font-display font-bold text-brand-600 text-[28px] md:text-[32px] leading-tight tracking-tight mb-8">
              {resolveTokens(title, settings)}
            </p>

            {/* Mobile: photo inside the text column (hidden on desktop) */}
            <ServiceImage src={image} className="aspect-[4/3] w-full mb-8 lg:hidden" />

            <p
              className="font-sans text-navy-800 text-[16px] leading-[24px] mb-7"
              dangerouslySetInnerHTML={{ __html: renderCmsInline(body, settings) }}
            />

            <Link
              href="/no-drip-club"
              className="link-button inline-flex items-center gap-2 bg-accent-500 hover:bg-brand-600 text-white font-display font-bold text-sm tracking-wider px-6 py-3.5 rounded-full transition-colors duration-150"
            >
              JOIN NOW
            </Link>
          </div>

          {/* Right — desktop-only photo column (hidden on mobile) */}
          <ServiceImage src={image} className="aspect-[4/3] w-full hidden lg:block" />
        </div>
      </div>
    </section>
  );
}
