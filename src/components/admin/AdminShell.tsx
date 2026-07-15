'use client';

import { ReactNode, useState } from 'react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminTopBar from '@/components/admin/AdminTopBar';

export default function AdminShell({ userName, children }: { userName: string; children: ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-admin-surface font-admin-body">
      <AdminSidebar userName={userName} mobileOpen={mobileNavOpen} onCloseMobile={() => setMobileNavOpen(false)} />

      {/* Mobile scrim behind the slide-in sidebar */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-10 bg-black/50 md:hidden"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="flex min-h-screen flex-1 flex-col md:ml-64">
        <AdminTopBar userName={userName} onOpenMobileNav={() => setMobileNavOpen(true)} />
        <main className="flex-1 text-admin-on-surface">{children}</main>
      </div>
    </div>
  );
}
