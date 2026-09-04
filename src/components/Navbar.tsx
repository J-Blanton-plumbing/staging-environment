'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X, Phone, CalendarDays, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import ScheduleButton from './ScheduleButton';
import { useWhatConvertsNumber } from '@/lib/useWhatConvertsNumber';
import { REGIONS } from '@/lib/content/locations-regions';
import type { GlobalSettings } from '@/lib/cms/global-settings';

interface NavLink {
  href: string;
  label: string;
  children?: { href: string; label: string }[];
}

/**
 * Columbus Integration Brief 03, Track C — the LOCATIONS dropdown's children.
 *
 * Derived from `REGIONS`, so the nav, the hub's region cards and the region
 * pages themselves cannot name the regions differently or point at a path that
 * does not exist. Declared ONCE and referenced from both nav arrays below: the
 * desktop and mobile menus are two separate lists in this file, and the whole
 * reason the brief calls that out is that updating one and not the other is the
 * default failure mode here.
 */
const LOCATION_CHILDREN = REGIONS.map((r) => ({ href: r.href, label: r.label.toUpperCase() }));

/**
 * The LOCATIONS entry.
 *
 * The parent stays a real link to `/locations`. A parent that only opens a menu
 * would cost the hub its sitewide nav link — and `/locations` is the page that
 * ranks, so that is not a cosmetic detail.
 */
const LOCATIONS_NAV: NavLink = {
  href: '/locations',
  label: 'LOCATIONS',
  children: LOCATION_CHILDREN,
};

const TOP_NAV: NavLink[] = [
  { href: '/why-j-blanton', label: 'WHY J. BLANTON' },
  { href: '/services', label: 'SERVICES' },
  { href: '/no-drip-club', label: 'NO DRIP CLUB' },
  { href: '/customer-stories', label: 'CUSTOMER STORIES' },
  LOCATIONS_NAV,
];

const MOBILE_NAV: NavLink[] = [
  { href: '/services', label: 'SERVICES' },
  { href: '/why-j-blanton', label: 'WHY J. BLANTON' },
  { href: '/knowledge-hub', label: 'KNOWLEDGE HUB' },
  { href: '/customer-stories', label: 'CUSTOMER STORIES' },
  { href: '/emergency-plumbing', label: 'EMERGENCY PLUMBING' },
  { href: '/no-drip-club', label: 'NO DRIP CLUB' },
  { href: '/help-and-support', label: 'HELP & SUPPORT' },
  { href: '/financing', label: 'FINANCING' },
  LOCATIONS_NAV,
];

const DESKTOP_LINK_CLASS =
  'flex items-center px-[15px] min-[1525px]:px-[30px] font-display font-medium text-brand-600 ' +
  'hover:text-brand-700 hover:bg-brand-50 text-[1.05vw] min-[1525px]:text-[16px] ' +
  'transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600';

/**
 * Desktop LOCATIONS dropdown (Brief 03, Track C).
 *
 * Opens on hover AND on keyboard focus — `onFocus`/`onBlur` bubble in React, so
 * tabbing onto the parent link opens the panel and tabbing past the last child
 * closes it. That is what makes the menu reachable without a mouse while the
 * parent stays a plain link rather than a button. `Escape` closes the panel and
 * returns focus to the parent, so a keyboard user is never stranded inside it.
 *
 * `hidden`/`flex` rather than opacity: an invisible-but-present panel would keep
 * its links in the tab order (and in the accessibility tree) while closed.
 */
function LocationsDropdown({ link }: { link: NavLink }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const parentRef = useRef<HTMLAnchorElement>(null);

  return (
    <div
      ref={wrapRef}
      className="relative flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={(e) => {
        // Only close when focus actually leaves the group — moving from the
        // parent link to a child fires blur too.
        if (!wrapRef.current?.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
      onKeyDown={(e) => {
        // No `if (open)` guard. The handler only fires while focus is already
        // inside this group, so returning focus to the parent is always the
        // right thing — and reading `open` here made Escape a no-op whenever a
        // pending open had not been committed yet, which left the panel stuck
        // open after the very keystroke meant to close it.
        if (e.key !== 'Escape') return;
        setOpen(false);
        parentRef.current?.focus();
      }}
    >
      <Link
        ref={parentRef}
        href={link.href}
        aria-haspopup="true"
        aria-expanded={open}
        className={cn(DESKTOP_LINK_CLASS, 'gap-1.5')}
      >
        {link.label}
        <ChevronDown
          className={cn('h-4 w-4 transition-transform duration-150', open && 'rotate-180')}
          strokeWidth={2.5}
          aria-hidden="true"
        />
      </Link>

      <div
        className={cn(
          'absolute left-0 top-full min-w-[220px] flex-col bg-cream-100 shadow-[0_6px_14px_rgba(10,27,46,0.25)]',
          open ? 'flex' : 'hidden'
        )}
      >
        {link.children?.map((child) => (
          <Link
            key={child.href}
            href={child.href}
            onClick={() => setOpen(false)}
            className="px-[22px] py-[14px] font-display font-medium text-[15px] text-brand-600 hover:text-brand-700 hover:bg-brand-50 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-600"
          >
            {child.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

/**
 * Mobile LOCATIONS group (Brief 03, Track C).
 *
 * An expandable group, not a hover dropdown — there is no hover on a phone. The
 * parent label is still the link to `/locations`; the chevron is a SEPARATE
 * button so tapping the label navigates and tapping the chevron expands. One
 * control that did both would make the hub unreachable from the mobile drawer.
 */
function MobileLocationsGroup({
  link,
  onNavigate,
}: {
  link: NavLink;
  onNavigate: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const panelId = 'mobile-nav-locations';

  return (
    <div className="border-b border-white/20">
      <div className="flex items-center justify-between">
        <Link
          href={link.href}
          onClick={onNavigate}
          className="block flex-1 py-3.5 font-sans font-normal text-2xl text-white"
        >
          {link.label}
        </Link>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls={panelId}
          aria-label={expanded ? 'Collapse Locations menu' : 'Expand Locations menu'}
          className="flex h-11 w-11 items-center justify-center text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <ChevronDown
            className={cn('h-6 w-6 transition-transform duration-150', expanded && 'rotate-180')}
            strokeWidth={2.5}
          />
        </button>
      </div>
      {expanded && (
        <div id={panelId} className="pb-3">
          {link.children?.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              onClick={onNavigate}
              className="block py-2.5 pl-5 font-sans font-normal text-lg text-white/90"
            >
              {child.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Navbar({ settings }: { settings: GlobalSettings }) {
  const [open, setOpen] = useState(false);

  // React renders the WhatConverts tracking number itself instead of letting the
  // vendor script patch it in afterwards. The header's icon-only call button was
  // confirmed on iOS to DIAL the default number while the page displayed the
  // tracking one: React reclaims an href it owns, and on iOS the dial target is
  // resolved from the touch gesture, so no after-the-fact repair can win. Owning
  // the value here means the href is already correct before any tap and a
  // re-render re-renders the correct number rather than reverting it.
  // Null until the pool number is known (or when none is assigned), in which
  // case the canonical number below is the right thing to show.
  const swapped = useWhatConvertsNumber(settings.phoneDisplay);
  const phoneHref = swapped?.href ?? settings.phoneHref;
  const phoneDisplay = swapped?.display ?? settings.phoneDisplay;

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

        {/* Cream navbar — full width, red text.
            This 70px is mirrored by `--site-header-h` in globals.css (Brief 160,
            Track D), which every hero's top clearance is derived from. Change
            one and change the other. */}
        <div className="w-full h-[70px] bg-cream-100 text-brand-600 flex">
          {/* Desktop: right-aligned nav */}
          <div className="hidden nav:flex w-full h-full justify-end pl-[240px]">
            {TOP_NAV.map((link) =>
              link.children ? (
                <LocationsDropdown key={link.href} link={link} />
              ) : (
                <Link key={link.href} href={link.href} className={DESKTOP_LINK_CLASS}>
                  {link.label}
                </Link>
              )
            )}

            {/* Phone — the canonical number, same as everywhere else on the site.
                This used to render the hardcoded `headerPhone` tracking line; now
                that WhatConverts does dynamic number insertion, a second static
                number here would just be a number DNI never swaps. */}
            <Link
              href={phoneHref}
              className="flex items-center px-[25px] text-brand-600 hover:text-brand-700 hover:bg-brand-50 font-display font-medium text-[1.05vw] min-[1525px]:text-[16px] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
            >
              <Phone className="h-[22px] w-[22px] mr-1.5" strokeWidth={2.5} />
              {phoneDisplay}
            </Link>

            {/* SCHEDULE A SERVICE — schedule popup trigger (Brief 169), BLUE */}
            <ScheduleButton
              variant="blue"
              size="md"
              className="rounded-none px-[15px] xl:px-[30px] h-full text-[1vw] tracking-normal font-medium"
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
                href={phoneHref}
                aria-label="Call"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-white"
              >
                <Phone className="h-4 w-4" strokeWidth={2.5} />
              </Link>
              {/* Schedule-a-service popup trigger styled as an icon (Brief 169).
                  Left as an inline element rather than <ScheduleTrigger> because of
                  the aria-label — that component takes no extra attributes. */}
              <div
                role="button"
                tabIndex={0}
                aria-label="Schedule a service"
                className="schedule-popup flex h-10 w-10 items-center justify-center rounded-full bg-accent-500 text-white cursor-pointer"
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
            {MOBILE_NAV.map((link) =>
              link.children ? (
                <MobileLocationsGroup
                  key={link.href}
                  link={link}
                  onNavigate={() => setOpen(false)}
                />
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block py-3.5 font-sans font-normal text-2xl text-white border-b border-white/20"
                >
                  {link.label}
                </Link>
              )
            )}
            {/* Phone CTA — inverted (white on Carmine) so it reads on the red drawer.
                Uses the canonical `phone`, not the header tracking line. */}
            <Link
              href={phoneHref}
              className="mt-5 w-full flex items-center justify-center gap-2 bg-white text-brand-600 font-display font-bold py-3.5 rounded text-sm tracking-wide"
            >
              <Phone className="h-4 w-4" /> {phoneDisplay}
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
