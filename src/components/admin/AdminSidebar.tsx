'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import CreatePageModal from '@/components/admin/CreatePageModal';

// ─── Nav data ────────────────────────────────────────────────────────────────

const MAIN_PAGES = [
  { label: 'Home',           href: '/admin/home' },
  { label: 'Why J. Blanton', href: '/admin/why-j-blanton' },
  { label: 'No Drip Club',   href: '/admin/no-drip-club' },
  { label: 'Knowledge Hub',  href: '/admin/knowledge-hub' },
];

const SERVICE_CATEGORY = [
  { label: 'Emergency Plumbing', href: '/admin/emergency-plumbing' },
  { label: 'Plumbing',           href: '/admin/plumbing' },
  { label: 'Sewer',              href: '/admin/sewer' },
  { label: 'Drain',              href: '/admin/drain' },
  { label: 'Water Heater',       href: '/admin/water-heater' },
  { label: 'Water Quality',      href: '/admin/water-quality' },
  { label: 'Commercial',         href: '/admin/commercial' },
];

// Loaded dynamically from /api/cms/sub-services
const SERVICE_STATIC: { label: string; href: string }[] = [];

const UTILITY_PAGES = [
  { label: 'Customer Stories', href: '/admin/customer-stories' },
  { label: 'Financing',        href: '/admin/financing' },
  { label: 'Locations',        href: '/admin/locations' },
  { label: 'Help & Support',   href: '/admin/help-and-support' },
];

// ─── Style constants ──────────────────────────────────────────────────────────

const SECTION_HEADING: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 16px',
  height: '40px',
  fontFamily: 'Industry, sans-serif',
  fontWeight: 700,
  fontSize: '11px',
  color: '#0A1B2E',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  userSelect: 'none',
  cursor: 'pointer',
  boxSizing: 'border-box',
};

const NAV_LINK_BASE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '0 16px 0 28px',
  height: '32px',
  fontFamily: 'Nunito, sans-serif',
  fontSize: '13px',
  fontWeight: 400,
  color: '#0A1B2E',
  textDecoration: 'none',
  boxSizing: 'border-box',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const TOP_LINK_BASE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '0 16px',
  height: '36px',
  fontFamily: 'Industry, sans-serif',
  fontSize: '13px',
  fontWeight: 600,
  color: '#0A1B2E',
  textDecoration: 'none',
  boxSizing: 'border-box',
};

const ACTIVE_STYLE: React.CSSProperties = {
  background: '#F9F3EC',
  color: '#BC0E0E',
  fontWeight: 700,
};

const DIVIDER: React.CSSProperties = {
  borderTop: '1px solid rgba(0,0,0,0.08)',
  margin: 0,
};

// ─── Components ───────────────────────────────────────────────────────────────

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      style={{ ...NAV_LINK_BASE, ...(active ? ACTIVE_STYLE : {}) }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.04)'; }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = ''; }}
    >
      {label}
    </Link>
  );
}

function TopLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      style={{ ...TOP_LINK_BASE, ...(active ? ACTIVE_STYLE : {}) }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.04)'; }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = ''; }}
    >
      {label}
    </Link>
  );
}

function CollapsibleSection({
  label,
  items,
  open,
  onToggle,
  pathname,
}: {
  label: string;
  items: { label: string; href: string }[];
  open: boolean;
  onToggle: () => void;
  pathname: string;
}) {
  return (
    <>
      <div style={DIVIDER} />
      <div
        style={SECTION_HEADING}
        onClick={onToggle}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.04)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; }}
      >
        <span>{label}</span>
        <span style={{ fontSize: '13px' }}>{open ? '▾' : '▸'}</span>
      </div>
      {open && items.map(({ label: lbl, href }) => (
        <NavLink key={href} href={href} label={lbl} active={pathname === href} />
      ))}
    </>
  );
}

// ─── Main sidebar ─────────────────────────────────────────────────────────────

export default function AdminSidebar({ userName }: { userName: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [serviceItems, setServiceItems] = useState<{ label: string; href: string }[]>(SERVICE_STATIC);

  const [mainOpen, setMainOpen] = useState(() => MAIN_PAGES.some(p => p.href === pathname));
  const [serviceCatOpen, setServiceCatOpen] = useState(() => SERVICE_CATEGORY.some(p => p.href === pathname));
  const [serviceOpen, setServiceOpen] = useState(() =>
    pathname.startsWith('/admin/sub-service/') || SERVICE_STATIC.some(p => p.href === pathname)
  );
  const [utilityOpen, setUtilityOpen] = useState(() => UTILITY_PAGES.some(p => p.href === pathname));

  useEffect(() => {
    fetch('/api/cms/sub-services')
      .then(r => r.json())
      .then((data: { slug: string; title: string }[]) => {
        if (!Array.isArray(data)) return;
        const items = data.map(s => ({
          label: s.title,
          href: `/admin/sub-service/${s.slug}`,
        }));
        setServiceItems(items);
        if (pathname.startsWith('/admin/sub-service/')) setServiceOpen(true);
      })
      .catch(() => {});
  }, [pathname]);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  }

  return (
    <>
      <nav
        style={{
          width: '210px',
          flexShrink: 0,
          background: '#fff',
          borderRight: '1px solid rgba(0,0,0,0.08)',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          overflowY: 'auto',
        }}
      >
        {/* Logo */}
        <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
          <span style={{ fontFamily: 'Industry, sans-serif', fontSize: '13px', fontWeight: 700, color: '#0A1B2E', letterSpacing: '0.03em' }}>
            JBP Admin
          </span>
        </div>

        {/* [+] Create New Page */}
        <button
          onClick={() => setCreateOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
            width: '100%', height: '40px',
            background: '#BC0E0E', border: 'none', borderBottom: '1px solid rgba(0,0,0,0.08)',
            fontFamily: 'Industry, sans-serif', fontWeight: 600, fontSize: '13px',
            color: '#F9F3EC', cursor: 'pointer',
            letterSpacing: '0.03em',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#a00c0c'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#BC0E0E'; }}
        >
          + Create New Page
        </button>

        {/* MAIN PAGES */}
        <CollapsibleSection
          label="Main Pages"
          items={MAIN_PAGES}
          open={mainOpen}
          onToggle={() => setMainOpen(o => !o)}
          pathname={pathname}
        />

        {/* SERVICE CATEGORY */}
        <CollapsibleSection
          label="Service Category"
          items={SERVICE_CATEGORY}
          open={serviceCatOpen}
          onToggle={() => setServiceCatOpen(o => !o)}
          pathname={pathname}
        />

        {/* SERVICE */}
        <CollapsibleSection
          label="Service"
          items={serviceItems}
          open={serviceOpen}
          onToggle={() => setServiceOpen(o => !o)}
          pathname={pathname}
        />

        {/* ARTICLES */}
        <div style={DIVIDER} />
        <TopLink href="/admin/articles" label="Articles" active={pathname === '/admin/articles'} />

        {/* CITIES */}
        <div style={DIVIDER} />
        <TopLink href="/admin/cities" label="Cities" active={pathname === '/admin/cities'} />

        {/* STANDALONE PAGES */}
        <CollapsibleSection
          label="Standalone Pages"
          items={UTILITY_PAGES}
          open={utilityOpen}
          onToggle={() => setUtilityOpen(o => !o)}
          pathname={pathname}
        />

        {/* USERS */}
        <div style={DIVIDER} />
        <TopLink href="/admin/users" label="Users" active={pathname === '/admin/users'} />

        {/* Footer */}
        <div style={{ marginTop: 'auto', padding: '1rem', borderTop: '1px solid rgba(0,0,0,0.08)' }}>
          <p style={{ color: '#5a6a7a', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
            Logged in as <span style={{ color: '#0A1B2E', fontWeight: 600 }}>{userName}</span>
          </p>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            style={{
              background: 'rgba(188,14,14,0.08)',
              color: '#BC0E0E',
              border: '1px solid rgba(188,14,14,0.25)',
              padding: '0.35rem 0.75rem',
              borderRadius: '4px',
              fontSize: '0.8rem',
              cursor: loggingOut ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              width: '100%',
            }}
          >
            {loggingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </nav>

      {createOpen && <CreatePageModal onClose={() => setCreateOpen(false)} />}
    </>
  );
}
