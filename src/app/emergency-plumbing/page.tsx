import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import CategoryHero from '@/components/CategoryHero';
import HeroNav from '@/components/HeroNav';
import GoogleReviews from '@/components/GoogleReviews';
import TikTokFeed from '@/components/TikTokFeed';
import LocationsSection from '@/components/LocationsSection';
import { getGlobalSettingsCached } from '@/lib/cms/global-settings';
import { EMERGENCY_PLUMBING } from '@/lib/content/emergency-plumbing';
import { getEpCmsContent } from '@/lib/cms/emergency-plumbing';
import { getEpPreview } from '@/lib/cms/preview';
import { isPageLive } from '@/lib/cms/page-status';
import PreviewBanner from '@/components/PreviewBanner';
import type { Metadata } from 'next';
import { pageTitle } from '@/lib/seo';
import './emergency-plumbing.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: pageTitle(EMERGENCY_PLUMBING.meta.title),
  description: EMERGENCY_PLUMBING.meta.description,
};

function CheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M21.546 5.111a1.5 1.5 0 0 1 0 2.121L10.303 18.475a1.6 1.6 0 0 1-2.263 0L2.454 12.89a1.5 1.5 0 1 1 2.121-2.121l4.596 4.596L19.424 5.111a1.5 1.5 0 0 1 2.122 0" />
    </svg>
  );
}

export default async function EmergencyPlumbingPage() {
  const settings = await getGlobalSettingsCached();
  const preview = await getEpPreview();
  const previewDraft = preview ? preview.meta : null;

  // Brief 159 (Track D / E1): the render gate — one indexed column read on the
  // live row, no join to page_drafts. The preview cookie wins so an editor can
  // still see an unpublished page; isPageLive fails OPEN on a DB error.
  if (!preview && !(await isPageLive('emergency-plumbing', 'emergency-plumbing'))) notFound();

  let db = preview ? preview.db : await getEpCmsContent().catch(() => null);

  // Text — DB wins over static when non-null
  const hero = {
    heading:     db?.heroHeading     ?? EMERGENCY_PLUMBING.hero.heading,
    description: db?.heroDescription ?? EMERGENCY_PLUMBING.hero.description,
  };
  const ready = {
    heading: db?.fHeading ?? EMERGENCY_PLUMBING.ready.heading,
    body:    db?.fBody    ?? EMERGENCY_PLUMBING.ready.body,
  };
  const card = {
    heading: db?.cardHeading ?? EMERGENCY_PLUMBING.card.heading,
    items:   db?.cardItems   ?? EMERGENCY_PLUMBING.card.items,
  };
  const map = {
    heading: db?.mapHeading ?? EMERGENCY_PLUMBING.map.heading,
    body:    db?.mapBody    ?? EMERGENCY_PLUMBING.map.body,
  };
  const ndcCta = {
    heading: db?.f2Heading ?? EMERGENCY_PLUMBING.ndcCta.heading,
    body:    db?.f2Body    ?? EMERGENCY_PLUMBING.ndcCta.body,
  };
  const finalPitch = {
    heading: db?.f3Heading ?? EMERGENCY_PLUMBING.finalPitch.heading,
    body:    db?.f3Body    ?? EMERGENCY_PLUMBING.finalPitch.body,
  };

  // Images — DB URL wins when non-empty string; otherwise fall back to static asset
  const heroImageSrc = db?.heroImage  || '/images/img_emergency-plumbing.webp';
  const fImageSrc    = db?.fImage     || '/images/emergency-h2.webp';
  const f2ImageSrc   = db?.f2Image    || '/images/preventative.webp';
  const f3ImageSrc   = db?.f3Image    || '/images/plumbing-hero.jpg';

  return (
    <>
      {previewDraft && (
        <PreviewBanner
          label={previewDraft.label}
          creatorName={previewDraft.creator_name}
          editorUrl="/admin/emergency-plumbing"
          liveUrl="/emergency-plumbing"
          draftId={previewDraft.id}
          pageType="emergency-plumbing"
          pageSlug="emergency-plumbing"
        />
      )}
    <main className="ep-page">
      {/* ============== HERO ============== */}
      <CategoryHero
        image={heroImageSrc}
        heading={hero.heading}
        intro={hero.description}
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
                <p className="red-text">{ready.heading}</p>
                <Image src={fImageSrc} alt="Emergency Plumbing" width={470} height={320} />
                <p>{ready.body}</p>
              </div>
              <Image src={fImageSrc} alt="Emergency Plumbing" width={470} height={320} />
            </div>

            {/* ---- .ep-card — EMERGENCIES WE FIX ---- */}
            <div className="ep-card">
              <Image className="ndc" src="/images/no-drip-club.webp" alt="" aria-hidden fill />
              <div>
                <Image className="char" src="/images/jbcharacter.webp" alt="J. Blanton Character" width={400} height={451} />
                <div className="a">
                  <div className="l" />
                  <div className="r">
                    <p className="label">{card.heading}</p>
                    <Image src="/images/preventative.webp" alt="Plumbing" width={470} height={320} />
                    {card.items.map((item) => (
                      <div className="service" key={item}>
                        <div><CheckIcon /></div>
                        <p>{item}</p>
                      </div>
                    ))}
                    <Link className="link-button" href={settings.phoneHref}>{settings.ctaPrimaryLabel}</Link>
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
              heading={map.heading}
              body={[map.body]}
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
                <p className="red-text">{ndcCta.heading}</p>
                <Image src={f2ImageSrc} alt="No Drip Club" width={470} height={320} />
                <p>{ndcCta.body}</p>
                <Link className="link-button" href="/no-drip-club">JOIN NOW</Link>
              </div>
              <Image src={f2ImageSrc} alt="No Drip Club" width={470} height={320} />
            </div>

            {/* ---- .f3 — TURN A BAD SITUATION INTO A GOOD CALL ---- */}
            <div className="f3">
              <Image src={f3ImageSrc} alt="J. Blanton Plumbing" width={470} height={320} />
              <div>
                <p className="red-text">{finalPitch.heading}</p>
                <Image src={f3ImageSrc} alt="J. Blanton Plumbing" width={470} height={320} />
                <p>{finalPitch.body}</p>
                <Link className="link-button button1" href={settings.phoneHref}>{settings.ctaPrimaryLabel}</Link>
              </div>
            </div>

          </div>
        </div>
      </div>
    </main>
    </>
  );
}
