'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ADMIN_COLORS } from '@/lib/admin/theme';
import { SERVICE_CATEGORY_SLUGS, getService } from '@/lib/services';
import SubServiceTable from '@/components/admin/SubServiceTable';

interface SubServiceRow {
  slug: string;
  parent_slug: string | null;
}

/**
 * Category card config — Brief 83. Icons reuse the same per-category SVG assets
 * already defined in `src/lib/services.ts` (`SERVICES[].iconUrl`) — the same
 * icons used elsewhere on the public site — rather than a separate icon set.
 */
const CATEGORY_CARDS: { slug: string; title: string }[] = [
  { slug: 'plumbing',       title: 'Plumbing' },
  { slug: 'sewer',          title: 'Sewer' },
  { slug: 'drain',          title: 'Drain' },
  { slug: 'water-heater',   title: 'Water Heater' },
  { slug: 'water-quality',  title: 'Water Quality' },
  { slug: 'commercial',     title: 'Commercial' },
];

const EMERGENCY_CARD = { slug: 'emergency-plumbing', title: 'Emergency Plumbing' };

function formatDate(iso?: string | null): string {
  if (!iso) return 'Not yet saved';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'Not yet saved';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface CardData {
  slug: string;
  title: string;
  iconUrl: string | undefined;
  href: string;
  stat: string;
  status: string;
}

function CategoryCard({ card }: { card: CardData }) {
  return (
    <Link
      href={card.href}
      className="group relative block h-40 overflow-hidden rounded-admin-3xl bg-admin-surface-container-low p-8 shadow-admin-elegant transition-transform hover:-translate-y-0.5"
    >
      {card.iconUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={card.iconUrl}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-6 -right-6 h-32 w-32 object-contain opacity-[0.06] transition-opacity duration-200 group-hover:opacity-[0.16]"
        />
      )}
      <div className="relative flex h-full flex-col justify-between">
        <h3 className="font-admin-headline text-lg font-bold text-admin-on-surface">{card.title}</h3>
        <div>
          <p className="font-admin-body text-sm font-semibold text-admin-on-surface-variant">{card.stat}</p>
          <p className="font-admin-body text-xs text-admin-on-surface-variant/60">{card.status}</p>
        </div>
      </div>
    </Link>
  );
}

export default function ServicePagesLandingPage() {
  const [subServiceCounts, setSubServiceCounts] = useState<Record<string, number>>({});
  const [categoryUpdatedAt, setCategoryUpdatedAt] = useState<Record<string, string | null>>({});
  const [emergencyUpdatedAt, setEmergencyUpdatedAt] = useState<string | null>(null);
  const [loadStatus, setLoadStatus] = useState<'loading' | 'error' | 'done'>('loading');

  useEffect(() => {
    Promise.all([
      fetch('/api/cms/sub-service-pages').then(r => r.json()),
      Promise.all(
        CATEGORY_CARDS.map(c =>
          fetch(`/api/cms/${c.slug}`)
            .then(r => (r.ok ? r.json() : null))
            .catch(() => null)
        )
      ),
      fetch('/api/cms/emergency-plumbing').then(r => (r.ok ? r.json() : null)).catch(() => null),
    ])
      .then(([subRows, categoryResults, emergency]) => {
        const counts: Record<string, number> = {};
        if (Array.isArray(subRows)) {
          for (const row of subRows as SubServiceRow[]) {
            if (!row.parent_slug) continue;
            counts[row.parent_slug] = (counts[row.parent_slug] ?? 0) + 1;
          }
        }
        setSubServiceCounts(counts);

        const updatedMap: Record<string, string | null> = {};
        categoryResults.forEach((res, i) => {
          const slug = CATEGORY_CARDS[i].slug;
          updatedMap[slug] = res?.page?.updated_at ?? null;
        });
        setCategoryUpdatedAt(updatedMap);

        setEmergencyUpdatedAt(emergency?.updatedAt ?? null);
        setLoadStatus('done');
      })
      .catch(() => setLoadStatus('error'));
  }, []);

  const cards: CardData[] = [
    ...CATEGORY_CARDS.map(c => ({
      slug: c.slug,
      title: c.title,
      iconUrl: getService(c.slug)?.iconUrl,
      href: `/admin/${c.slug}`,
      stat: loadStatus === 'done' ? `${subServiceCounts[c.slug] ?? 0} sub-service pages` : ' ',
      status: loadStatus === 'done' ? `Updated ${formatDate(categoryUpdatedAt[c.slug])}` : ' ',
    })),
    {
      slug: EMERGENCY_CARD.slug,
      title: EMERGENCY_CARD.title,
      iconUrl: getService(EMERGENCY_CARD.slug)?.iconUrl,
      href: '/admin/emergency-plumbing',
      stat: 'Standalone page',
      status: loadStatus === 'done' ? `Updated ${formatDate(emergencyUpdatedAt)}` : ' ',
    },
  ];

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
        Service Category pages
      </h1>
      <p
        style={{
          fontFamily: 'var(--font-nunito), system-ui, sans-serif',
          color: `${ADMIN_COLORS.onSurfaceVariant}99`,
          fontSize: '0.875rem',
          marginBottom: '1.5rem',
        }}
      >
        Quick access to the {SERVICE_CATEGORY_SLUGS.length} service categories, Emergency Plumbing, and every sub-service page.
      </p>

      {loadStatus === 'error' && (
        <p style={{ color: ADMIN_COLORS.error, marginBottom: '1.5rem' }}>
          Some card data failed to load. Sub-service counts or last-updated dates below may be incomplete.
        </p>
      )}

      <div className="mb-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(card => (
          <CategoryCard key={card.slug} card={card} />
        ))}
      </div>

      <div
        style={{
          borderTop: `1px solid ${ADMIN_COLORS.outlineVariant}1A`,
          paddingTop: '2rem',
        }}
      >
        <SubServiceTable />
      </div>
    </main>
  );
}
