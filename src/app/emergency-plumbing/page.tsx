import Link from 'next/link';
import Image from 'next/image';
import CategoryHero from '@/components/CategoryHero';
import HeroNav from '@/components/HeroNav';
import GoogleReviews from '@/components/GoogleReviews';
import TikTokFeed from '@/components/TikTokFeed';
import LocationsSection from '@/components/LocationsSection';
import { SITE } from '@/lib/site';
import { EMERGENCY_PLUMBING } from '@/lib/content/emergency-plumbing';
import type { Metadata } from 'next';
import './emergency-plumbing.css';

export const metadata: Metadata = {
  title: EMERGENCY_PLUMBING.meta.title,
  description: EMERGENCY_PLUMBING.meta.description,
};

/** Checkmark SVG — matches the theme's service checklist icon. */
function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M21.546 5.111a1.5 1.5 0 0 1 0 2.121L10.303 18.475a1.6 1.6 0 0 1-2.263 0L2.454 12.89a1.5 1.5 0 1 1 2.121-2.121l4.596 4.596L19.424 5.111a1.5 1.5 0 0 1 2.122 0"
      />
    </svg>
  );
}

export default function EmergencyPlumbingPage() {
  return (
    <main className="ep-page">
      {/* ============== HERO ============== */}
      <CategoryHero
        image="/images/img_emergency-plumbing.webp"
        heading={EMERGENCY_PLUMBING.hero.heading}
        intro={EMERGENCY_PLUMBING.hero.description}
      />

      {/* ============== HERO-NAV ============== */}
      <HeroNav />

      {/* ============== CREAM BLOCK ============== */}
      <div className="cream">
        <div className="w81">
          <div className="emergency-plumbing">

            {/* ---- .f — PLUMBERS AT THE READY ---- */}
            <div className="f">
              <div>
                <p className="red-text">{EMERGENCY_PLUMBING.ready.heading}</p>
                {/* Inline image — hidden at desktop, shown at ≤900px */}
                <Image
                  src="/images/emergency-h2.webp"
                  alt="Emergency Plumbing"
                  width={470}
                  height={320}
                />
                <p>{EMERGENCY_PLUMBING.ready.body}</p>
              </div>
              {/* Side image — shown at desktop, hidden at ≤900px */}
              <Image
                src="/images/emergency-h2.webp"
                alt="Emergency Plumbing"
                width={470}
                height={320}
              />
            </div>

            {/* ---- .ep-card — EMERGENCIES WE FIX ---- */}
            <div className="ep-card">
              {/* NDC watermark */}
              <Image
                className="ndc"
                src="/images/no-drip-club.webp"
                alt=""
                aria-hidden
                fill
              />
              <div>
                {/* Character — left column at desktop */}
                <Image
                  className="char"
                  src="/images/jbcharacter.webp"
                  alt="J. Blanton Character"
                  width={400}
                  height={451}
                />
                <div className="a">
                  <div className="l" />
                  <div className="r">
                    <p className="label">{EMERGENCY_PLUMBING.card.heading}</p>
                    {/* Inline image — hidden at desktop, shown at ≤1000px */}
                    <Image
                      src="/images/preventative.webp"
                      alt="Plumbing"
                      width={470}
                      height={320}
                    />
                    {EMERGENCY_PLUMBING.card.items.map((item) => (
                      <div className="service" key={item}>
                        <div><CheckIcon /></div>
                        <p>{item}</p>
                      </div>
                    ))}
                    <Link className="link-button" href={SITE.phoneHref}>
                      MAKE A GOOD CALL
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* ---- .ep-map — WE'RE ALMOST EVERYWHERE ---- */}
            <LocationsSection
              className="ep-map"
              contentClassName="ep-contents"
              headingClassName="leading-tight uppercase"
              bodyClassName="text-[#0A1B2E] leading-relaxed"
              heading={EMERGENCY_PLUMBING.map.heading}
              body={[EMERGENCY_PLUMBING.map.body]}
              showButton={false}
            />

            {/* ---- .ep-gr — Google Reviews ---- */}
            <div className="ep-gr">
              <GoogleReviews />
            </div>

            {/* ---- TikTok ---- */}
            <TikTokFeed
              headline={EMERGENCY_PLUMBING.tiktok.headline}
              headlineClassName="ep-tiktok-headline"
              className="ep-tiktok"
            />

            {/* ---- .f2 — WE HATE EMERGENCIES TOO (NDC CTA) ---- */}
            <div className="f2">
              <div>
                <p className="red-text">{EMERGENCY_PLUMBING.ndcCta.heading}</p>
                {/* Inline image — hidden at desktop, shown at ≤900px */}
                <Image
                  src="/images/preventative.webp"
                  alt="No Drip Club"
                  width={470}
                  height={320}
                />
                <p>{EMERGENCY_PLUMBING.ndcCta.body}</p>
                <Link className="link-button" href="/no-drip-club">
                  JOIN NOW
                </Link>
              </div>
              {/* Side image — shown at desktop, hidden at ≤900px */}
              <Image
                src="/images/preventative.webp"
                alt="No Drip Club"
                width={470}
                height={320}
              />
            </div>

            {/* ---- .f3 — TURN A BAD SITUATION INTO A GOOD CALL ---- */}
            <div className="f3">
              {/* Side image — shown at desktop, hidden at ≤900px */}
              <Image
                src="/images/plumbing-hero.jpg"
                alt="J. Blanton Plumbing"
                width={470}
                height={320}
              />
              <div>
                <p className="red-text">{EMERGENCY_PLUMBING.finalPitch.heading}</p>
                {/* Inline image — hidden at desktop, shown at ≤900px */}
                <Image
                  src="/images/plumbing-hero.jpg"
                  alt="J. Blanton Plumbing"
                  width={470}
                  height={320}
                />
                <p>{EMERGENCY_PLUMBING.finalPitch.body}</p>
                <Link className="link-button button1" href={SITE.phoneHref}>
                  MAKE A GOOD CALL
                </Link>
              </div>
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}
