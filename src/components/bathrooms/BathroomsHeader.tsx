/**
 * Brief 156 — the /bathrooms landing page's own header.
 *
 * Logo left, consultation CTA + phone right. NO navigation links: this is a paid
 * traffic landing page and the absence of escape routes is deliberate, not an
 * omission. `SiteShell` suppresses the site `Navbar` on this route (Brief 156
 * §5.2) precisely so this can be the only header — do not substitute the site
 * nav here.
 *
 * Sticky, white, 92px tall at desktop — the hero below pulls itself up under it
 * by exactly that amount (see Hero.tsx), as the live page does.
 *
 * The responsive visibility sits on a wrapper <div>, not on the button itself:
 * the button's `display` comes from `.btnBase` in the CSS module, and a Tailwind
 * `hidden` on the same element would be a coin-flip on source order.
 */

import Image from 'next/image';
import { ConsultationCtaButton, PhoneCtaButton } from './LeadModal';

export default function BathroomsHeader() {
  return (
    <header
      className="sticky top-0 z-[5] flex items-center justify-center bg-white px-5 py-5 md:px-[30px]"
      style={{ boxShadow: '0 2px 5px rgba(23, 23, 20, 0.08)' }}
    >
      <div className="mx-auto flex w-full max-w-[1240px] items-center justify-between gap-4">
        {/* Not a link: there is nowhere else on this landing page to go. */}
        <Image
          src="/bathrooms/logo/bathrooms-by-jblanton-logo.png"
          alt="Bathrooms by J. Blanton"
          width={351}
          height={183}
          priority
          className="h-[50px] w-auto object-contain"
        />

        <div className="flex items-center gap-2">
          {/* Hidden on the narrowest widths, as on the live page (`.mobile-hidden`),
              where the phone button carries the action alone. */}
          <div className="hidden sm:block">
            <ConsultationCtaButton variant="header" />
          </div>
          <PhoneCtaButton variant="header" />
        </div>
      </div>
    </header>
  );
}
