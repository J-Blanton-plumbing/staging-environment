import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Script from 'next/script';
import localFont from 'next/font/local';
import { Nunito } from 'next/font/google';
import './globals.css';
import SiteShell from '@/components/SiteShell';
import InvolveMeScript from '@/components/InvolveMeScript';
import InvolveMePopupBinder from '@/components/InvolveMePopupBinder';
import SiteAnalytics from '@/components/analytics/SiteAnalytics';
import { getGlobalSettingsCached } from '@/lib/cms/global-settings';
import { getCanonicalOverridesCached } from '@/lib/cms/canonical-overrides';
import { BRAND_SUFFIX, CANONICAL_BASE, TITLE_TEMPLATE, canonicalUrlFor, normalizePath } from '@/lib/seo';

// Industry — the J. Blanton brand display font, self-hosted from public/fonts/Industry/.
// Medium (500) → H3 subheadings, Demi (600) → nav/labels, Bold (700) → H1/H2,
// Black (900) → oversized display lockups (e.g. the "NO DRIP CLUB" wordmark).
const industry = localFont({
  src: [
    { path: '../../public/fonts/Industry/IMedium.otf', weight: '500', style: 'normal' },
    { path: '../../public/fonts/Industry/IDemi.otf', weight: '600', style: 'normal' },
    { path: '../../public/fonts/Industry/IBold.otf', weight: '700', style: 'normal' },
    { path: '../../public/fonts/Industry/IBlack.otf', weight: '900', style: 'normal' },
  ],
  variable: '--font-industry',
  display: 'swap',
});

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-nunito',
  display: 'swap',
});

const BASE_METADATA: Metadata = {
  metadataBase: new URL(CANONICAL_BASE),
  // The template is the ONE place the brand is appended to a page title. Every
  // title source normalizes through `pageTitle()` (or is a suffix-free literal)
  // so it can never be composed twice — see the note in @/lib/seo.
  title: {
    default: `${BRAND_SUFFIX} | Chicago & Suburbs`,
    template: TITLE_TEMPLATE,
  },
  description:
    'Trusted plumbing experts serving Chicago and the surrounding suburbs for over 30 years. Emergency, residential, commercial, sewer, drain, and water heater service.',
  keywords: [
    'plumber Chicago',
    'emergency plumber Chicago',
    'drain cleaning Chicago',
    'sewer repair Chicago',
    'water heater Chicago',
    'J. Blanton Plumbing',
  ],
  icons: { icon: '/images/favicon.ico' },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'J. Blanton Plumbing',
  },
};

/**
 * Brief 127 (Track A): every public page gets a self-referencing
 * <link rel="canonical"> built from the env-configured PRODUCTION origin plus
 * the request's normalized pathname (via the x-pathname header set in
 * middleware — layouts can't read the URL any other way). A page whose CMS row
 * has a non-blank canonical_url override renders that instead. Child-page
 * metadata merges over this, but no page defines `alternates`, so the
 * canonical always survives.
 */
export async function generateMetadata(): Promise<Metadata> {
  const pathname = headers().get('x-pathname');
  // No header (e.g. static prerender of error shells) or non-indexable
  // sections: emit no canonical rather than a wrong one.
  if (!pathname || pathname.startsWith('/admin') || pathname.startsWith('/api')) {
    return BASE_METADATA;
  }
  const overrides = await getCanonicalOverridesCached();
  const canonical =
    overrides.get(normalizePath(pathname)) ?? canonicalUrlFor(pathname);
  return { ...BASE_METADATA, alternates: { canonical } };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Sitewide phone/CTA values — DB-backed with a site.ts fallback (Brief 66, Track C).
  // Passed down to the client SiteShell → Navbar, which can't read the DB itself.
  const settings = await getGlobalSettingsCached();

  return (
    <html lang="en" className={`${industry.variable} ${nunito.variable}`}>
      <body className="flex min-h-screen flex-col">
        <SiteShell settings={settings}>{children}</SiteShell>
        {/* Scroll entrance animations — adds .in-view once elements cross viewport.
            Runs after page load; respects prefers-reduced-motion (CSS handles that). */}
        <Script id="scroll-animations" strategy="lazyOnload">{`
          (function(){
            if(!('IntersectionObserver' in window)) return;
            var obs = new IntersectionObserver(function(entries){
              entries.forEach(function(e){
                if(e.isIntersecting){ e.target.classList.add('in-view'); obs.unobserve(e.target); }
              });
            },{threshold:0.12});
            document.querySelectorAll('.animate-on-scroll').forEach(function(el){ obs.observe(el); });
          })();
        `}</Script>
        {/* Elfsight platform (Google Reviews / TikTok / Locations Map widgets) */}
        <Script src="https://static.elfsight.com/platform/platform.js" strategy="lazyOnload" />
        {/* TikTok embed */}
        <Script src="https://www.tiktok.com/embed.js" strategy="lazyOnload" />
        {/* involve.me popup ("schedule-service-new") + UTM tracker */}
        <InvolveMeScript />
        {/* Brief 108 (Group B): re-binds involve.me CTAs that mount after a
            client-side navigation, which the embed script's one-time scan misses. */}
        <InvolveMePopupBinder />
        {/* Brief 128: GA4 + Google Ads + Meta Pixel + Bing UET base tags,
            client-side route-change pageviews, and the element_1_click tracker.
            Every ID is env-gated — blank env var = that tag never loads, which is
            how staging stays out of the production analytics accounts. */}
        <SiteAnalytics />
      </body>
    </html>
  );
}
