'use client';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function AdminTopBar({
  userName,
  onOpenMobileNav,
}: {
  userName: string;
  onOpenMobileNav: () => void;
}) {
  return (
    <header className="sticky top-0 z-[5] flex h-20 w-full items-center justify-between gap-4 bg-admin-surface px-4 md:px-10">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="rounded-admin-xl p-2 text-admin-on-surface-variant hover:bg-admin-surface-container-high hover:text-admin-on-surface transition-colors md:hidden"
          aria-label="Open navigation"
        >
          <span className="material-symbols-outlined text-[22px]">menu</span>
        </button>
        <div className="relative hidden w-full max-w-sm sm:block">
          <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[18px] text-admin-on-surface-variant/40">
            search
          </span>
          <input
            type="text"
            placeholder="Search…"
            className="w-full rounded-admin-3xl border-none bg-admin-surface-container-low py-2.5 pl-12 pr-4 text-xs text-admin-on-surface placeholder:text-admin-on-surface-variant/30 focus:outline-none focus:ring-1 focus:ring-admin-primary/20 transition-all"
            readOnly
            title="Search — coming soon"
          />
        </div>
      </div>

      <div className="flex items-center gap-4 md:gap-8">
        <div className="hidden items-center gap-4 sm:flex">
          <button
            type="button"
            className="relative p-2 text-admin-on-surface-variant/60 transition-colors hover:text-admin-primary"
            title="Notifications — coming soon"
          >
            <span className="material-symbols-outlined text-[22px]">notifications</span>
          </button>
          <button
            type="button"
            className="p-2 text-admin-on-surface-variant/60 transition-colors hover:text-admin-primary"
            title="History — coming soon"
          >
            <span className="material-symbols-outlined text-[22px]">history</span>
          </button>
        </div>
        <div className="flex items-center gap-3 rounded-admin-full border border-admin-outline-variant/10 bg-admin-surface-container-low py-1.5 pl-4 pr-1.5">
          <div className="hidden text-right sm:block">
            <p className="font-admin-body text-xs font-bold text-admin-on-surface">{userName}</p>
            <p className="text-[9px] uppercase tracking-widest text-admin-on-surface-variant/50">Administrator</p>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-admin-secondary-container text-[11px] font-bold text-white">
            {initials(userName)}
          </div>
        </div>
      </div>
    </header>
  );
}
