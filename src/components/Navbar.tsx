'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X, Phone, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SITE } from '@/lib/site';
import ScheduleButton from './ScheduleButton';

const TOP_NAV = [
  { href: '/why-j-blanton', label: 'WHY J. BLANTON' },
  { href: '/services', label: 'SERVICES' },
  { href: '/no-drip-club', label: 'NO DRIP CLUB' },
  { href: '/customer-stories', label: 'CUSTOMER STORIES' },
  { href: '/locations', label: 'LOCATIONS' },
];

const MOBILE_NAV = [
  { href: '/services', label: 'SERVICES' },
  { href: '/why-j-blanton', label: 'WHY J. BLANTON' },
  { href: '/knowledge-hub', label: 'KNOWLEDGE HUB' },
  { href: '/customer-stories', label: 'CUSTOMER STORIES' },
  { href: '/emergency-plumbing', label: 'EMERGENCY PLUMBING' },
  { href: '/no-drip-club', label: 'NO DRIP CLUB' },
  { href: '/help-and-support', label: 'HELP & SUPPORT' },
  { href: '/financing', label: 'FINANCING' },
  { href: '/locations', label: 'LOCATIONS' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* FIXED header — sits over hero. shadow on bottom. */}
      <header className="fixed top-0 left-0 right-0 z-40 flex w-full shadow-[0_0_10px_rgba(0,0,0,0.3)]">
        {/* Logo block with red rectangle backdrop */}
        <div className="absolute z-20 w-[225px] h-[158px] pointer-events-none nav:block hidden">
          <Image
            src="/images/rectangle.webp"
            alt=""
            width={225}
            height={158}
            priority
            className="absolute inset-0 w-full h-full"
          />
          <Link
            href="/"
            className="absolute z-30 pointer-events-auto"
            style={{ width: 168, height: 87, marginTop: 20, left: '40%', transform: 'translateX(-40%)' }}
          >
            <Image
              src="/images/logo-text.webp"
              alt="J. Blanton Plumbing"
              width={168}
              height={87}
              priority
              className="w-full h-full object-contain"
            />
          </Link>
        </div>

        {/* Cream navbar — full width, red text */}
        <div className="w-full h-[70px] bg-cream-100 text-brand-600 flex">
          {/* Desktop: right-aligned nav */}
          <div className="hidden nav:flex w-full h-full justify-end pl-[240px]">
            {TOP_NAV.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center px-[24px] xl:px-[30px] font-display font-medium text-brand-600 hover:text-brand-700 text-[14px] tracking-wide"
              >
                {link.label}
              </Link>
            ))}

            {/* Phone — uses the call-tracking headerPhone (see src/lib/site.ts) */}
            <Link
              href={SITE.headerPhoneHref}
              className="flex items-center px-[25px] text-brand-600 hover:text-brand-700 font-display font-semibold"
            >
              <Phone className="h-[20px] w-[20px] mr-1.5" strokeWidth={2.5} />
              {SITE.headerPhone}
            </Link>

            {/* SCHEDULE A SERVICE — involve.me popup trigger, BLUE */}
            <ScheduleButton
              variant="blue"
              size="md"
              className="rounded-none px-8 h-full text-[14px] tracking-wide font-semibold"
            />

          </div>

          {/* Mobile bar */}
          <div className="flex nav:hidden w-full items-center justify-between px-4">
            <Link href="/" className="flex items-center">
              <Image
                src="/images/logo-text.webp"
                alt="J. Blanton Plumbing"
                width={135}
                height={50}
                priority
                className="h-[42px] w-auto"
              />
            </Link>
            <div className="flex items-center gap-2">
              <Link
                href={SITE.headerPhoneHref}
                aria-label="Call"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-white"
              >
                <Phone className="h-4 w-4" strokeWidth={2.5} />
              </Link>
              {/* involve.me popup trigger styled as icon */}
              <div
                role="button"
                tabIndex={0}
                aria-label="Schedule a service"
                className="involveme_popup flex h-10 w-10 items-center justify-center rounded-full bg-accent-500 text-white cursor-pointer"
                data-params="source=,campaignname=,utm_campaign=,utm_adgroup=,keyword=,network=,device=,medium=,gclid=,msclkid="
                data-project="schedule-service-new"
                data-embed-mode="popup"
                data-trigger-event="button"
                data-popup-size="medium"
                data-organization-url="https://jblantonplumbing.involve.me"
              >
                <CalendarDays className="h-4 w-4" strokeWidth={2} />
              </div>
              <button
                onClick={() => setOpen(true)}
                aria-label="Open menu"
                className="flex h-10 w-10 items-center justify-center text-brand-600"
              >
                <Menu className="h-7 w-7" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      <div
        className={cn(
          'fixed inset-0 z-50 transition-opacity nav:hidden',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
      >
        <div className="absolute inset-0 bg-navy-900/60" onClick={() => setOpen(false)} />
        {/* Solid Carmine drawer (#BC0E0E = brand-600) with white text — matches live. */}
        <aside
          className={cn(
            'absolute top-0 right-0 h-full w-[85%] max-w-sm bg-brand-600 shadow-2xl flex flex-col transition-transform duration-300',
            open ? 'translate-x-0' : 'translate-x-full'
          )}
        >
          <div className="flex items-center justify-between p-5 border-b border-white/20">
            <Image src="/images/logo-white.webp" alt="J. Blanton" width={140} height={40} className="h-9 w-auto" />
            <button onClick={() => setOpen(false)} aria-label="Close menu" className="text-white">
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto px-5 py-4">
            {MOBILE_NAV.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="block py-3.5 font-sans font-normal text-2xl text-white border-b border-white/20"
              >
                {link.label}
              </Link>
            ))}
            {/* Phone CTA — inverted (white on Carmine) so it reads on the red drawer.
                Uses the canonical `phone`, not the header tracking line. */}
            <Link
              href={SITE.phoneHref}
              className="mt-5 w-full flex items-center justify-center gap-2 bg-white text-brand-600 font-display font-bold py-3.5 rounded text-sm tracking-wide"
            >
              <Phone className="h-4 w-4" /> {SITE.phone}
            </Link>
            <ScheduleButton
              variant="blue"
              size="md"
              className="mt-3 w-full py-3.5 text-sm tracking-wide font-bold"
            />

          </nav>
        </aside>
      </div>
    </>
  );
}
