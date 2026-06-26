import Link from 'next/link';
import { cn } from '@/lib/utils';

// Navigation config for the white 4-link strip below the hero.
// Shared on the home page and every category page. Default hrefs use the live slugs.
const HERO_NAV = [
  { href: '/emergency-plumbing', label: 'EMERGENCY PLUMBING' },
  { href: '/knowledge-hub', label: 'KNOWLEDGE HUB' },
  { href: '/financing', label: 'FINANCING' },
  { href: '/help-and-support', label: 'HELP & SUPPORT' },
];

interface HeroNavProps {
  /**
   * Per-instance override for the HELP & SUPPORT link. The shared default is
   * `/help-and-support`; the homepage passes `/no-drip-club` to match an
   * inconsistency on the live site (brief-07 §10).
   */
  helpHref?: string;
}

/** The white 4-link strip that sits directly below the hero on every page. */
export default function HeroNav({ helpHref }: HeroNavProps) {
  const items = HERO_NAV.map((item) =>
    helpHref && item.label === 'HELP & SUPPORT' ? { ...item, href: helpHref } : item
  );

  return (
    <nav className="hero-nav bg-white w-full h-20 shadow-[0_0_10px_rgba(0,0,0,0.23)] hidden md:grid md:grid-cols-4 relative z-10">
      {items.map((item, i) => (
        <Link
          key={item.label}
          href={item.href}
          className={cn(
            'flex items-center justify-center text-center font-display font-semibold text-[14px] tracking-wide text-brand-600 hover:bg-brand-600 hover:text-white transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-600',
            i > 0 && 'md:border-l border-cream-200'
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
