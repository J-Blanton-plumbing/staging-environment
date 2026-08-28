import BathroomsGtm from '@/components/bathrooms/BathroomsGtm';
import BathroomsHeader from '@/components/bathrooms/BathroomsHeader';
import BeforeAfterGallery from '@/components/bathrooms/BeforeAfterGallery';
import Hero from '@/components/bathrooms/Hero';
import { LeadModalProvider } from '@/components/bathrooms/LeadModal';
import Materials from '@/components/bathrooms/Materials';
import Process from '@/components/bathrooms/Process';
import Team from '@/components/bathrooms/Team';
import Testimonials from '@/components/bathrooms/Testimonials';
import TrustBar from '@/components/bathrooms/TrustBar';
import WhyUs from '@/components/bathrooms/WhyUs';

/**
 * /bathrooms — Brief 156.
 *
 * A faithful clone of the Bathrooms division's Webflow landing page
 * (jblantonbathrooms.com), brought in-house so it lives in our stack, our repo
 * and our analytics. Nothing redirects to it yet: the Webflow site is still live
 * and running the paid traffic, so this ships `noindex` and out of the sitemap
 * (see layout.tsx) until Marketing and the Bathrooms team agree the cutover.
 *
 * STATIC BY DESIGN. No CMS wiring, no admin editor, no block-catalogue entries
 * — Brief 156 puts all of that explicitly out of scope. The copy lives as typed
 * module constants inside each section component.
 *
 * The page renders its OWN header and no navigation. `SiteShell` suppresses the
 * site Navbar on this route (Brief 156 §5.2, following Brief 127's HOA cluster)
 * while still rendering the shared <Footer>, so office addresses stay
 * CMS-maintained with one source of truth — that is the entire reason this is a
 * real route rather than another static file.
 *
 * `LeadModalProvider` wraps everything because there is no form on the page:
 * all seven consultation CTAs open one shared iframe modal.
 *
 * `force-dynamic` matches every other top-level page — the root layout's
 * generateMetadata reads the `x-pathname` request header to emit this page's
 * canonical (Brief 127), which a static prerender would drop.
 */

export const dynamic = 'force-dynamic';

export default function BathroomsPage() {
  return (
    <LeadModalProvider>
      <BathroomsGtm />
      <BathroomsHeader />
      <Hero />
      <TrustBar />
      <Testimonials />
      <WhyUs />
      <BeforeAfterGallery />
      <Materials />
      <Process />
      <Team />
    </LeadModalProvider>
  );
}
