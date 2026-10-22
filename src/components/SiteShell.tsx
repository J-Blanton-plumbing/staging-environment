'use client';

import { usePathname } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import type { ReactNode } from 'react';
import type { GlobalSettings } from '@/lib/cms/global-settings';
import { isReviewPath } from '@/lib/review-route';

export default function SiteShell({
  children,
  settings,
  officeGraphOffPath,
}: {
  children: ReactNode;
  settings: GlobalSettings;
  /**
   * Brief 217 (Track C): the path, if this request's page is a City Hub / City Service V2 render
   * (decided server-side by the root layout from the template, never a city list). On that path the
   * footer emits no all-offices PlumbingBusiness graph — the page carries its own office's node. It is
   * compared with the CURRENT pathname because the root layout is not re-rendered on client navigation.
   */
  officeGraphOffPath?: string;
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
  //
  // Brief 156 generalised the single HOA check into this list: /bathrooms is the
  // same shape — a paid-traffic landing page with its own header (logo + one CTA
  // + phone, no nav links, deliberately no escape routes) that must not also get
  // the site Navbar, and that keeps the shared Footer for the same CMS-backed
  // office addresses. Adding another landing page is one entry here.
  const LANDING_ROUTES = ['/hoa-pipe-lining', '/bathrooms'];
  const isLandingRoute = LANDING_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );

  if (isAdmin) return <>{children}</>;

  return (
    <>
      {!isLandingRoute && <Navbar settings={settings} />}
      <main className="flex-1">{children}</main>
      {/* Brief 195: no JSON-LD on the password-protected /review copies. Brief 217: no office graph
          on a City Hub / City Service V2 page (one location per city page). */}
      <Footer settings={settings} schema={!isReviewPath(pathname) && pathname !== officeGraphOffPath} />
    </>
  );
}
