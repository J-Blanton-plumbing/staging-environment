import type { Metadata } from 'next';
import Script from 'next/script';
import localFont from 'next/font/local';
import { Nunito } from 'next/font/google';
import './globals.css';
import SiteShell from '@/components/SiteShell';
import InvolveMeScript from '@/components/InvolveMeScript';
import { getGlobalSettingsCached } from '@/lib/cms/global-settings';

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

export const metadata: Metadata = {
  title: {
    default: 'J. Blanton Plumbing | Chicago & Suburbs',
    template: '%s | J. Blanton Plumbing',
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
      </body>
    </html>
  );
}
