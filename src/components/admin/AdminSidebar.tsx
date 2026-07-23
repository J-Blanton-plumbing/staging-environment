'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import CreatePageModal from '@/components/admin/CreatePageModal';

// ─── Nav data ────────────────────────────────────────────────────────────────

// ─── Components ───────────────────────────────────────────────────────────────

const NAV_LINK_ACTIVE_CLASS = 'bg-admin-surface-container-highest text-admin-on-surface font-semibold';

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
          <Image
            src="/images/admin/cms-admin-logo.png"
            alt="J. Blanton CMS Admin"
            width={600}
            height={388}
            className="h-20 w-auto self-start"
            priority
          />
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

          <div className="border-t border-admin-outline-variant/10 pt-2">
            <TopLink
              href="/admin/utility-pages"
              label="Utility Pages"
              icon="home"
              active={pathname === '/admin/utility-pages'}
            />
          </div>

          <div className="border-t border-admin-outline-variant/10 pt-2">
            <TopLink
              href="/admin/service-pages"
              label="Service Pages"
              icon="plumbing"
              active={pathname === '/admin/service-pages'}
            />
          </div>

          <div className="border-t border-admin-outline-variant/10 pt-2">
            <TopLink href="/admin/articles" label="Knowledge Hub" icon="article" active={pathname === '/admin/articles'} />
          </div>

          <div className="border-t border-admin-outline-variant/10 pt-2">
            <TopLink href="/admin/cities" label="City Pages" icon="location_city" active={pathname === '/admin/cities'} />
          </div>

          <div className="border-t border-admin-outline-variant/10 pt-2">
            <TopLink href="/admin/users" label="Users" icon="group" active={pathname === '/admin/users'} />
          </div>

          <div className="border-t border-admin-outline-variant/10 pt-2">
            <TopLink
              href="/admin/global-settings"
              label="Global Settings"
              icon="settings"
              active={pathname === '/admin/global-settings'}
            />
          </div>

          {/* Brief 90 (Track C): block library — opens the /admin/blocks landing. */}
          <div className="border-t border-admin-outline-variant/10 pt-2">
            <TopLink href="/admin/blocks" label="Blocks" icon="widgets" active={pathname === '/admin/blocks'} />
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
