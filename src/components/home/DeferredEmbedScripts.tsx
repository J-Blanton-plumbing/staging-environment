'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';

/**
 * Brief 220 — stands in for the root layout's Elfsight platform + TikTok embed scripts when the
 * document was first loaded on Homepage 2026, which must load NO Elfsight code (Marketing D2).
 *
 * The root layout is not re-rendered on a client-side navigation, so a visitor who lands on Homepage
 * 2026 and then clicks through to a page WITH an Elfsight widget (reviews, TikTok, map) would get a
 * dead widget if the scripts were simply left out. This mounts the same two scripts, with the same
 * strategy, as soon as the path is anything but `/` — the widgets' mount divs are then initialised
 * exactly as on a hard load. On `/` it renders nothing.
 */
export default function DeferredEmbedScripts() {
  const pathname = usePathname();
  if (!pathname || pathname === '/') return null;
  return (
    <>
      <Script src="https://static.elfsight.com/platform/platform.js" strategy="lazyOnload" />
      <Script src="https://www.tiktok.com/embed.js" strategy="lazyOnload" />
    </>
  );
}
