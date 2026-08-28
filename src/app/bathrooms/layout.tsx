import type { Metadata } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import type { ReactNode } from 'react';
import styles from '@/components/bathrooms/bathrooms.module.css';

/**
 * Brief 156 — route layout for the /bathrooms landing page clone.
 *
 * FONT SCOPING (§4.1) — the single biggest risk in this brief.
 *
 * This page keeps the Webflow site's own typography (Plus Jakarta Sans for
 * display, Inter for body) rather than the site standard of Industry + Nunito.
 * That is Marketing's decision for the clone, to be revisited with the Bathrooms
 * team after they review it.
 *
 * The two families are therefore loaded HERE, in this route's layout, never in
 * the root layout and never in globals.css. Their CSS variables are attached to
 * the <div> below rather than to <body>, so they exist only inside this route's
 * subtree. `SiteShell` renders the shared <Footer> as a SIBLING of this layout's
 * children, outside that div, which is what keeps the footer in Industry/Nunito.
 * Nothing in this route sets a bare `font-family` — the type scale in
 * `bathrooms.module.css` names `var(--font-jakarta)` or `var(--font-inter)` on
 * every class, so there is nothing to inherit even if the wrapper were moved.
 *
 * Montserrat is NOT imported. The live page loads it and never renders it.
 */

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

/**
 * Title matches the live page exactly. Deliberately NOT run through
 * `pageTitle()` — that helper appends the "J. Blanton Plumbing" brand suffix,
 * and this is the Bathrooms division's own landing page. The root layout's
 * title template is overridden by using the absolute form.
 */
export const metadata: Metadata = {
  title: { absolute: 'J. Blanton Bathrooms' },
  /**
   * noindex until the Bathrooms PPC redirect is agreed — Brief 156. Flip to
   * index when marketing confirms.
   *
   * jblantonbathrooms.com is live and running paid traffic. Two identical pages
   * in the index is a duplicate-content problem and could affect the Bathrooms
   * division's Quality Score. `follow` is kept so the page's links are not
   * stranded — the same shape /thank-you uses (Brief 129).
   *
   * The page is also absent from the sitemap, which needs no code: the sitemap
   * builds from the explicit list in `src/lib/sitemap-pages.ts` and /bathrooms
   * is deliberately not in it. Both flips are required at cutover.
   */
  robots: { index: false, follow: true },
};

export default function BathroomsLayout({ children }: { children: ReactNode }) {
  // styles.page carries this page's colour tokens (--bx-*). They are declared on
  // a class, not :root, so a CSS module keeps them off every other page — and the
  // button/type classes that consume them all render inside this wrapper.
  return (
    <div className={`${styles.page} ${jakarta.variable} ${inter.variable}`}>{children}</div>
  );
}
