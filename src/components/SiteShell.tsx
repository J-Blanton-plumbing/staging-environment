'use client';

import { usePathname } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import type { ReactNode } from 'react';
import type { GlobalSettings } from '@/lib/cms/global-settings';

export default function SiteShell({
  children,
  settings,
}: {
  children: ReactNode;
  settings: GlobalSettings;
}) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith('/admin');

  if (isAdmin) return <>{children}</>;

  return (
    <>
      <Navbar settings={settings} />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
