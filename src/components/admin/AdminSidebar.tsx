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

// ─── Components ───────────────────────────────────────────────────────────────

const NAV_LINK_CLASS =
  'flex items-center py-3 rounded-admin-xl px-4 ml-3 mr-3 font-admin-body text-sm text-admin-on-surface-variant whitespace-nowrap overflow-hidden text-ellipsis transition-colors hover:bg-admin-surface-container-high';
const NAV_LINK_ACTIVE_CLASS = 'bg-admin-surface-container-highest text-admin-on-surface font-semibold';

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link href={href} className={`${NAV_LINK_CLASS} ${active ? NAV_LINK_ACTIVE_CLASS : ''}`}>
      {label}
    </Link>
  );
}

function ManageLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 py-3 rounded-admin-xl px-4 ml-3 mr-3 font-admin-headline text-xs font-semibold tracking-wide text-admin-on-surface-variant transition-colors hover:bg-admin-surface-container-high ${active ? NAV_LINK_ACTIVE_CLASS : ''}`}
    >
      <span className="material-symbols-outlined text-[16px] leading-none">list</span>
      {label}
    </Link>
  );
}

function TopLink({ href, label, icon, active }: { href: string; label: string; icon: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 py-3 rounded-admin-xl px-4 mx-3 font-admin-body text-sm text-admin-on-surface-variant transition-colors hover:bg-admin-surface-container-high ${active ? `${NAV_LINK_ACTIVE_CLASS} shadow-sm` : ''}`}
    >
      <span
        className={`material-symbols-outlined text-[20px] ${active ? 'text-admin-secondary-container' : ''}`}
        style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
      >
        {icon}
      </span>
      <span>{label}</span>
    </Link>
  );
}

function CollapsibleSection({
  label,
  icon,
  items,
  open,
  onToggle,
  pathname,
  manageLink,
}: {
  label: string;
  icon: string;
  items: { label: string; href: string }[];
  open: boolean;
  onToggle: () => void;
  pathname: string;
  manageLink?: { label: string; href: string };
}) {
  return (
    <div className="border-t border-admin-outline-variant/10 pt-2 pb-1">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 rounded-admin-xl mx-3 px-4 py-3 font-admin-body text-sm text-admin-on-surface-variant transition-colors hover:bg-admin-surface-container-high"
        style={{ width: 'calc(100% - 1.5rem)' }}
      >
        <span className="flex items-center gap-3">
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
          {label}
        </span>
        <span className="material-symbols-outlined text-[18px] text-admin-on-surface-variant/50">
          {open ? 'expand_more' : 'chevron_right'}
        </span>
      </button>
      {open && (
        <div className="mt-1 space-y-1">
          {manageLink && <ManageLink href={manageLink.href} label={manageLink.label} active={pathname === manageLink.href} />}
          {items.map(({ label: lbl, href }) => (
            <NavLink key={href} href={href} label={lbl} active={pathname === href} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main sidebar ─────────────────────────────────────────────────────────────

export default function AdminSidebar({
  userName,
  mobileOpen,
  onCloseMobile,
}: {
  userName: string;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [serviceItems, setServiceItems] = useState<{ label: string; href: string }[]>(SERVICE_STATIC);

  const [mainOpen, setMainOpen] = useState(() => MAIN_PAGES.some(p => p.href === pathname));
  const [serviceCatOpen, setServiceCatOpen] = useState(() => SERVICE_CATEGORY.some(p => p.href === pathname));
  const [serviceOpen, setServiceOpen] = useState(() =>
    pathname.startsWith('/admin/sub-service/') || pathname === '/admin/sub-services' || SERVICE_STATIC.some(p => p.href === pathname)
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

  // Close the mobile drawer on route change.
  useEffect(() => {
    onCloseMobile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  }

  return (
    <>
      <aside
        className={`fixed left-0 top-0 z-20 flex h-full w-64 flex-col bg-admin-surface-container-lowest transition-transform duration-300 ease-in-out md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex flex-col gap-1 p-8">
          <h1 className="font-admin-headline text-xl font-bold leading-none tracking-tight text-admin-on-surface">
            J. Blanton
          </h1>
          <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-admin-on-surface-variant/50">CMS Admin</p>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto pb-4">
          {/* + Create New Page */}
          <div className="px-3 pb-2">
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-admin-2xl bg-admin-secondary-container font-admin-headline text-xs font-semibold tracking-wide text-white shadow-lg transition-all hover:brightness-110"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Create New Page
            </button>
          </div>

          <CollapsibleSection
            label="Main Pages"
            icon="home"
            items={MAIN_PAGES}
            open={mainOpen}
            onToggle={() => setMainOpen(o => !o)}
            pathname={pathname}
          />

          <CollapsibleSection
            label="Service Category"
            icon="category"
            items={SERVICE_CATEGORY}
            open={serviceCatOpen}
            onToggle={() => setServiceCatOpen(o => !o)}
            pathname={pathname}
          />

          <CollapsibleSection
            label="Service"
            icon="plumbing"
            items={serviceItems}
            open={serviceOpen}
            onToggle={() => setServiceOpen(o => !o)}
            pathname={pathname}
            manageLink={{ label: 'All Sub-Services', href: '/admin/sub-services' }}
          />

          <div className="border-t border-admin-outline-variant/10 pt-2">
            <TopLink href="/admin/articles" label="Articles" icon="article" active={pathname === '/admin/articles'} />
          </div>

          <div className="border-t border-admin-outline-variant/10 pt-2">
            <TopLink href="/admin/cities" label="City Pages" icon="location_city" active={pathname === '/admin/cities'} />
          </div>

          <CollapsibleSection
            label="Standalone Pages"
            icon="inventory_2"
            items={UTILITY_PAGES}
            open={utilityOpen}
            onToggle={() => setUtilityOpen(o => !o)}
            pathname={pathname}
          />

          <div className="border-t border-admin-outline-variant/10 pt-2">
            <TopLink href="/admin/users" label="Users" icon="group" active={pathname === '/admin/users'} />
          </div>
        </nav>

        {/* Footer */}
        <div className="mt-auto space-y-3 border-t border-admin-outline-variant/10 p-6">
          <p className="truncate text-xs text-admin-on-surface-variant/60">
            Logged in as <span className="font-semibold text-admin-on-surface">{userName}</span>
          </p>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center justify-center gap-2 rounded-admin-xl border border-admin-secondary-container/25 bg-admin-secondary-container/10 py-2 text-xs font-semibold text-admin-secondary-container transition-colors hover:bg-admin-secondary-container/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[16px]">logout</span>
            {loggingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </aside>

      {createOpen && <CreatePageModal onClose={() => setCreateOpen(false)} />}
    </>
  );
}
