import Link from 'next/link';
import { Phone } from 'lucide-react';
import { getGlobalSettingsCached } from '@/lib/cms/global-settings';
import { resolveTokens } from '@/lib/cms/tokens';
import { ServiceImage } from '@/components/ServiceIntro';
import type { ServiceContent } from '@/types/service';

/**
 * §11 — closing CTA band (brief-11 §11 / brief-61 Track J). Live `.f3.f3-left`
 * pattern: Cream `#F9F3EC` background, two columns — the `manplumber.webp`
 * photo on the left and, on the right, the Carmine tagline, body copy, and the
 * white "MAKE A GOOD CALL" phone pill (Carmine text). This replaces the earlier
 * centered full-Carmine band, which did not match the live page.
 *
 * On mobile the photo is embedded inside the right column (below the tagline)
 * and the left column is hidden; on desktop the photo is the left column.
 * Copy comes from the data file; the phone number comes from `site.ts`.
 */
export default async function ServiceClosingCTA({
  cta,
}: {
  cta: ServiceContent['closingCTA'];
}) {
  const settings = await getGlobalSettingsCached();
  return (
    <section className="bg-cream-100 py-[70px] md:py-[100px]">
      <div className="w-[90%] lg:w-[81%] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-[60px] items-center">
          {/* Left — desktop-only photo column (hidden on mobile) */}
          <ServiceImage src={cta.image} className="aspect-[4/3] w-full hidden lg:block" />

          {/* Right — tagline, mobile-only photo, body, MAKE A GOOD CALL */}
          <div>
            <p className="red-text font-display font-bold text-brand-600 text-[28px] md:text-[32px] leading-tight tracking-tight mb-8">
              {resolveTokens(cta.heading, settings)}
            </p>

            {/* Mobile: photo inside the text column (hidden on desktop) */}
            <ServiceImage src={cta.image} className="aspect-[4/3] w-full mb-8 lg:hidden" />

            <p className="font-sans text-navy-800 text-[16px] leading-[24px] mb-7">
              {resolveTokens(cta.body, settings)}
            </p>

            <Link
              href={settings.phoneHref}
              className="link-button inline-flex items-center gap-2 bg-accent-500 hover:bg-brand-600 text-white font-display font-bold text-sm tracking-wider px-6 py-3.5 rounded-full transition-colors duration-150"
            >
              <Phone className="h-4 w-4" strokeWidth={2.5} />
              {settings.ctaPrimaryLabel}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
