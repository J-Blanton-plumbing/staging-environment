import Link from 'next/link';
import Image from 'next/image';
import { MapPin } from 'lucide-react';
import { SITE } from '@/lib/site';
import { formatOfficeAddress } from '@/lib/cms/offices';
import type { GlobalSettings } from '@/lib/cms/global-settings';
import LocalBusinessSchema from '@/components/LocalBusinessSchema';

// Footer nav — 3 columns, order/grouping per the live theme (brief-06 §3).
// Mixed case (no uppercase transform), live slugs (brief-06 §4/§5).
const NAV_COL_1 = [
  { href: '/services',         label: 'Services' },
  { href: '/why-j-blanton',    label: 'Why J. Blanton' },
  { href: '/knowledge-hub',    label: 'Knowledge Hub' },
];
const NAV_COL_2 = [
  { href: '/customer-stories',  label: 'Customer Stories' },
  { href: '/emergency-plumbing', label: 'Emergency Plumbing' },
  { href: '/no-drip-club',      label: 'No Drip Club' },
];
const NAV_COL_3 = [
  { href: '/help-and-support', label: 'Help & Support' },
  { href: '/financing',        label: 'Financing' },
  { href: '/locations',        label: 'Locations' },
];

const NAV_COLUMNS = [NAV_COL_1, NAV_COL_2, NAV_COL_3];

/**
 * Brief 102 (Track C/D): `settings` is fetched once by the root layout (a
 * Server Component) and threaded down through `SiteShell` — Footer itself is
 * imported by the 'use client' SiteShell, so it can't fetch the DB directly
 * (mirrors how Navbar already receives `settings` for the same reason).
 */
export default function Footer({ settings }: { settings: GlobalSettings }) {
  return (
    <footer className="bottom relative bg-brand-600 text-cream-100 py-[80px] font-sans">
      <div className="w-[90%] lg:w-[81%] mx-auto flex flex-col lg:flex-row justify-between gap-12">
        {/* LEFT — Logo + review badges */}
        <div className="l lg:w-1/2">
          <Link href="/" className="i flex justify-center lg:justify-start mb-6">
            <Image
              src="/images/logo-white.webp"
              alt="J. Blanton Plumbing"
              width={370}
              height={195}
              className="w-[280px] lg:w-[370px] h-auto max-h-[195px] object-contain"
            />
          </Link>

          {/* Google badge */}
          <div className="google flex items-center justify-center lg:justify-start mb-[30px]">
            <Image
              src="/images/google-badge.webp"
              alt="Google"
              width={90}
              height={90}
              className="w-[90px] h-[90px] object-contain"
            />
            <Link
              href={SITE.reviewLinks.google}
              target="_blank"
              rel="noreferrer"
              className="ml-[45px] border border-cream-100 rounded-md px-3 py-2 text-sm font-display font-semibold hover:bg-cream-100 hover:text-navy-800"
            >
              Leave a Review
            </Link>
          </div>

          {/* Yelp badge */}
          <div className="yelp flex items-center justify-center lg:justify-start mb-[30px]">
            <Image
              src="/images/yelp-badge.webp"
              alt="Yelp"
              width={125}
              height={48}
              className="w-[125px] h-[48px] object-contain"
            />
            <Link
              href={SITE.reviewLinks.yelp}
              target="_blank"
              rel="noreferrer"
              className="ml-[10px] border border-cream-100 rounded-md px-3 py-2 text-sm font-display font-semibold hover:bg-cream-100 hover:text-navy-800"
            >
              Leave a Review
            </Link>
          </div>

          {/* BBB badge */}
          <Link
            href={SITE.reviewLinks.bbb}
            target="_blank"
            rel="noreferrer"
            className="bbb flex justify-center lg:justify-start"
          >
            <Image
              src="/images/bbb-badge.webp"
              alt="BBB Accredited"
              width={280}
              height={80}
              className="w-[280px] h-[80px] object-contain"
            />
          </Link>
        </div>

        {/* RIGHT — Nav + Locations */}
        <div className="r lg:w-1/2">
          {/* bottom-navs: 3-column flex with center column margin 0 100px */}
          <div className="bottom-navs flex flex-col items-center text-center lg:flex-row lg:items-start lg:text-left mb-[50px] gap-y-6">
            {NAV_COLUMNS.map((column, i) => (
              <div key={i} className={i === 1 ? 'lg:mx-[60px] xl:mx-[100px]' : undefined}>
                {column.map((n) => (
                  <Link
                    key={n.href}
                    href={n.href}
                    className="block mb-[15px] font-display font-semibold text-sm tracking-wide hover:opacity-80 last:mb-0"
                  >
                    {n.label}
                  </Link>
                ))}
              </div>
            ))}
          </div>

          {/* divider */}
          <div className="div h-px bg-cream-100/30 w-full mb-[30px]" />

          {/* bottom-locations */}
          <div className="bottom-locations mb-[50px]">
            <p className="label font-display font-bold text-[28px] md:text-[34px] mb-[30px]">
              Our Office Locations
            </p>
            <div className="offices grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-[30px]">
              {settings.offices.filter((office) => office.showInFooter !== false).map((office) => (
                <div key={office.slug} className="office">
                  <div className="flex items-center gap-[7px] mb-[7px]">
                    <MapPin className="h-5 w-5 flex-shrink-0" strokeWidth={2} />
                    <Link
                      href={`/${office.slug}`}
                      className="font-display font-semibold uppercase text-sm tracking-wide hover:opacity-80 leading-tight"
                    >
                      {office.name}
                    </Link>
                  </div>
                  <p className="text-sm leading-snug">{formatOfficeAddress(office)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* bottom-socials: absolute centered */}
      <div className="bottom-socials absolute left-1/2 -translate-x-1/2 bottom-4 lg:bottom-[30px] flex items-center gap-4">
        <p className="text-xs">
          Copyright © {new Date().getFullYear()} J. Blanton Plumbing - All Rights Reserved -{' '}
          <Link href="/privacy-policy" className="hover:opacity-80">
            Privacy Policy
          </Link>
        </p>
        <div className="flex gap-3">
          {/* brief-06 §6: branded icon assets pending in /public/images/social/ — markup is
              ready, renders alt text until the .webp files land. Do NOT use a lucide bird for X. */}
          {SITE.social.map((s) => (
            <Link
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noreferrer"
              aria-label={s.label}
              className="hover:opacity-80"
            >
              {/* 16×16 to match the theme's uniform social-icon size (theme uses object-fit: fill). */}
              <Image src={s.icon} alt={s.label} width={16} height={16} className="w-4 h-4" />
            </Link>
          ))}
        </div>
      </div>

      {/* Brief 102 (Track D) — LocalBusiness JSON-LD, one graph node per office.
          Mounted here (present on every page) so it never duplicates. */}
      <LocalBusinessSchema
        offices={settings.offices}
        phoneDisplay={settings.phoneDisplay}
        phoneHref={settings.phoneHref}
        hoursLabel={settings.hoursLabel}
      />
    </footer>
  );
}
