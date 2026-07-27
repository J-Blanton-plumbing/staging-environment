'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ADMIN_COLORS } from '@/lib/admin/theme';

/**
 * Card config — Brief 84. Merges the former "Main Pages" and "Standalone Pages"
 * sidebar sections into one landing page, following the Brief 83 CategoryCard
 * pattern (`src/app/admin/service-pages/page.tsx`) minus the icon.
 */
const UTILITY_PAGE_CARDS: { slug: string; title: string; href: string }[] = [
  { slug: 'home',              title: 'Home',              href: '/admin/home' },
  { slug: 'why-j-blanton',     title: 'Why J. Blanton',     href: '/admin/why-j-blanton' },
  { slug: 'no-drip-club',      title: 'No Drip Club',       href: '/admin/no-drip-club' },
  { slug: 'knowledge-hub',     title: 'Knowledge Hub',      href: '/admin/knowledge-hub' },
  { slug: 'customer-stories',  title: 'Customer Stories',   href: '/admin/customer-stories' },
  { slug: 'financing',         title: 'Financing',          href: '/admin/financing' },
  { slug: 'locations',         title: 'Locations',          href: '/admin/locations' },
  { slug: 'help-and-support',  title: 'Help & Support',     href: '/admin/help-and-support' },
  // Brief 109: the /j-blanton-is-hiring "Join Our Team" recruiting page.
  { slug: 'j-blanton-is-hiring', title: 'Join Our Team',    href: '/admin/j-blanton-is-hiring' },
  // Brief 110: the /privacy-policy "Terms of Use & Privacy Policy" legal page.
  { slug: 'privacy-policy',    title: 'Privacy Policy',     href: '/admin/privacy-policy' },
];

function formatDate(iso?: string | null): string {
  if (!iso) return 'Not yet saved';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'Not yet saved';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface CardData {
  slug: string;
  title: string;
  href: string;
  status: string;
}

function UtilityPageCard({ card }: { card: CardData }) {
  return (
    <div className="group relative block h-40 overflow-hidden rounded-admin-3xl bg-admin-surface-container-low p-8 shadow-admin-elegant transition-transform hover:-translate-y-0.5">
      <Link href={card.href} className="absolute inset-0" aria-label={`Edit ${card.title}`} />
      <div className="relative flex h-full flex-col justify-between">
        <h3 className="font-admin-headline text-lg font-bold text-admin-on-surface">{card.title}</h3>
        <div className="flex flex-col items-start gap-2">
          <p className="font-admin-body text-xs text-admin-on-surface-variant/60">{card.status}</p>
          <Link
            href={card.href}
            className="relative z-10 rounded-admin-full bg-admin-cerulean px-4 py-1.5 font-admin-headline text-xs font-semibold text-white shadow-lg transition-all hover:brightness-110"
          >
            Edit page
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function UtilityPagesLandingPage() {
  const [updatedAtMap, setUpdatedAtMap] = useState<Record<string, string | null>>({});
  const [loadStatus, setLoadStatus] = useState<'loading' | 'error' | 'done'>('loading');

  useEffect(() => {
    Promise.all(
      UTILITY_PAGE_CARDS.map(c =>
        fetch(`/api/cms/main/${c.slug}`)
          .then(r => (r.ok ? r.json() : null))
          .catch(() => null)
      )
    )
      .then(results => {
        const map: Record<string, string | null> = {};
        results.forEach((res, i) => {
          map[UTILITY_PAGE_CARDS[i].slug] = res?.updated_at ?? null;
        });
        setUpdatedAtMap(map);
        setLoadStatus('done');
      })
      .catch(() => setLoadStatus('error'));
  }, []);

  const cards: CardData[] = UTILITY_PAGE_CARDS.map(c => ({
    slug: c.slug,
    title: c.title,
    href: c.href,
    status: loadStatus === 'done' ? `Updated ${formatDate(updatedAtMap[c.slug])}` : ' ',
  }));

  return (
    <main style={{ padding: '2rem', maxWidth: '1400px', fontFamily: 'system-ui, sans-serif' }}>
      <h1
        style={{
          fontFamily: 'var(--font-outfit), system-ui, sans-serif',
          fontWeight: 700,
          fontSize: '1.875rem',
          letterSpacing: '-0.025em',
          color: ADMIN_COLORS.onSurface,
          marginBottom: '0.25rem',
        }}
      >
        Utility Pages
      </h1>
      <p
        style={{
          fontFamily: 'var(--font-nunito), system-ui, sans-serif',
          color: `${ADMIN_COLORS.onSurfaceVariant}99`,
          fontSize: '0.875rem',
          marginBottom: '1.5rem',
        }}
      >
        Quick access to the {UTILITY_PAGE_CARDS.length} standalone site pages.
      </p>

      {loadStatus === 'error' && (
        <p style={{ color: ADMIN_COLORS.error, marginBottom: '1.5rem' }}>
          Some card data failed to load. Last-updated dates below may be incomplete.
        </p>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(card => (
          <UtilityPageCard key={card.slug} card={card} />
        ))}
      </div>
    </main>
  );
}
