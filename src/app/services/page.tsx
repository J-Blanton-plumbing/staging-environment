import ServiceCard from '@/components/ServiceCard';
import ServicesAccordion from '@/components/ServicesAccordion';
import { SERVICES } from '@/lib/services';
import HeroNav from '@/components/HeroNav';
import NoDripClubSection from '@/components/NoDripClubSection';
import GoogleReviews from '@/components/GoogleReviews';
import TikTokFeed from '@/components/TikTokFeed';
import ScheduleButton from '@/components/ScheduleButton';
import Image from 'next/image';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Plumbing Services',
  description:
    'J. Blanton Plumbing offers emergency, residential, commercial, sewer, drain, water heater, and water quality services throughout the Chicago metro.',
};

export default function ServicesPage() {
  return (
    <div className="services-overview">

      {/* ── 1. Hero ─────────────────────────────────────────────────────── */}
      <section className="flex" style={{ backgroundColor: '#BC0E0E' }}>
        {/* Left — hero photo at 45 % */}
        <div
          className="hidden md:block shrink-0 overflow-hidden"
          style={{ width: '45%', minHeight: '420px' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/clogged-drains.webp"
            alt="Clogged drain"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>

        {/* Right — 55 % Carmine panel with tiled wrench pattern */}
        <div
          className="flex-1 flex items-center"
          style={{
            backgroundImage: "url('/images/patterns/Wrench Filled Red BG.png')",
            backgroundRepeat: 'repeat',
          }}
        >
          {/* pt-28 clears the fixed navbar (~80 px); mx-auto centers within the panel */}
          <div className="relative z-10 pt-28 pb-16 px-8 mx-auto" style={{ maxWidth: '600px' }}>
            <h1
              className="font-display font-bold uppercase text-white mb-4"
              style={{ fontSize: '40px' }}
            >
              SERVICES
            </h1>
            <p className="text-white text-base mb-8 leading-relaxed">
              Whether you are remodeling your kitchen or bathroom or you have an emergency water
              leak, count on J. Blanton Plumbing to help you with all your plumbing needs.
            </p>
            <ScheduleButton variant="blue" size="lg" className="rounded-full font-bold text-base">
              SCHEDULE A SERVICE
            </ScheduleButton>
          </div>
        </div>
      </section>

      {/* ── 2. Secondary nav bar ────────────────────────────────────────── */}
      <HeroNav />

      {/* ── 3. Services Card Section ────────────────────────────────────── */}
      <section className="bg-[#F9F3EC] py-20">
        <div className="w-[81%] mx-auto">
          <p className="text-[#BC0E0E] font-display font-bold uppercase text-[32px] mb-2">
            SERVICES
          </p>
          <p className="text-[#0A1B2E] text-[19px] font-normal max-w-2xl mb-10 leading-snug">
            Our team of tenacious plumbers is always ready to leap into action to save your day,
            no matter how light or severe the situation
          </p>

          {/* Desktop — 4-col auto grid, matches services-overview.css `.so-image-grid` */}
          <div className="hidden min-[900px]:grid grid-cols-2 lg:grid-cols-4 gap-5">
            {SERVICES.map((service) => (
              <ServiceCard key={service.slug} service={service} />
            ))}
          </div>

          {/* Mobile — red collapsible accordion, matches .services-contents-mobile */}
          <ServicesAccordion />
        </div>
      </section>

      {/* ── 4. No Drip Club ─────────────────────────────────────────────── */}
      {/* .no-drip-club already carries margin-top via globals.css — no extra mt here */}
      {/* w-full on mobile (bleeds edge-to-edge), 81% centered on md+ */}
      <div className="w-full md:w-[81%] md:mx-auto">
        <NoDripClubSection
          body="There are Good Calls—and then there's the No Drip Club. Members enjoy significant annual savings on home checkups, emergency repairs, and unlock exclusive perks, including VIP treatment whenever they call for service."
        />
      </div>

      {/* ── 5. Reasons to Believe ───────────────────────────────────────── */}
      <section className="w-[81%] mx-auto mt-[70px] pb-[70px] flex flex-col-reverse md:flex-row justify-center items-center md:gap-8">

        {/* Left — text (desktop), bottom (mobile) */}
        <div className="w-full md:w-1/2 mt-6 md:mt-0">
          {/* Title: hidden on mobile (shown in image div instead), visible on desktop */}
          <p className="hidden md:block text-[#BC0E0E] font-display font-bold uppercase text-[32px] mb-[10px]">
            REASONS TO BELIEVE
          </p>
          <p className="text-[#0A1B2E] text-[19px] font-normal leading-relaxed w-full md:w-4/5">
            For over three decades, we have established ourselves as a trusted name in the
            plumbing industry. Our team is passionate about providing top-of-the-line technology
            and exceptional customer service to meet all your plumbing needs.
          </p>
        </div>

        {/* Right — image (desktop), top (mobile) */}
        <div className="relative w-full md:w-[470px] md:h-[320px] shrink-0">
          {/* Title: visible on mobile above image, hidden on desktop */}
          <p className="md:hidden text-[#BC0E0E] font-display font-bold uppercase text-[32px] mb-3">
            REASONS TO BELIEVE
          </p>
          <div className="relative w-full h-[260px] md:h-[320px]">
            <Image
              src="/images/plumbing-f3.webp"
              alt="J. Blanton Plumber"
              fill
              className="object-cover"
            />
          </div>
        </div>

      </section>

      {/* ── 6. Google Reviews Widget ────────────────────────────────────── */}
      <div className="overflow-hidden pb-[60px]">
        <GoogleReviews />
      </div>

      {/* ── 7. TikTok Social Proof Widget ───────────────────────────────── */}
      <div className="overflow-x-auto pb-[90px]">
        <TikTokFeed
          headline="J Blanton Plumbing - Turning Bad Calls to Good Calls"
          headlineClassName="px-[15px]"
        />
      </div>

    </div>
  );
}
