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
  // Brief 127 (HOA cluster app-routes migration) — the three HOA pipe-lining
  // landing pages (/hoa-pipe-lining, /team, /reserve-studies) ship their own
  // custom landing header (cream bar + burger drawer) in the page body and must
  // NOT also get the site's top Navbar. They DO keep the shared Footer — that's
  // the entire point of moving them off static public/ files (Brief 125/126)
  // onto real routes: office addresses now read live from the CMS instead of
  // being hand-copied into a static footer.
  const isHoaLanding = pathname === '/hoa-pipe-lining' || pathname.startsWith('/hoa-pipe-lining/');

  if (isAdmin) return <>{children}</>;

  return (
    <>
      {!isHoaLanding && <Navbar settings={settings} />}
      <main className="flex-1">{children}</main>
      <Footer settings={settings} />
    </>
  );
}
