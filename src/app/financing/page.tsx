import Image from 'next/image';
import Link from 'next/link';
import HeroNav from '@/components/HeroNav';
import ArticleCard from '@/components/ArticleCard';
import { FINANCING } from '@/lib/content/financing';
import { getArticles } from '@/lib/articles';
import type { Metadata } from 'next';
import './financing.css';

export const metadata: Metadata = {
  title: 'Financing | J. Blanton Plumbing',
  description:
    "Flexible financing options for your plumbing needs. Don't let budget concerns stop essential repairs — easy payment plans and quick approval with J. Blanton Plumbing.",
};

function CheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M21.546 5.111a1.5 1.5 0 0 1 0 2.121L10.303 18.475a1.6 1.6 0 0 1-2.263 0L2.454 12.89a1.5 1.5 0 1 1 2.121-2.121l4.596 4.596L19.424 5.111a1.5 1.5 0 0 1 2.122 0" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

export default function FinancingPage() {
  const {
    hero,
    financingSolutionsReady,
    financingMadeSimple,
    coverage,
    surpriseBills,
    articleSlugs,
    bottomCta,
  } = FINANCING;

  const articles = getArticles([...articleSlugs]);

  return (
    <div className="financing-page">

      {/* ================================================================
          HERO
          ================================================================ */}
      <div className="hero">
        <Image
          className="img-s"
          src={hero.image}
          alt={hero.imageAlt}
          width={900}
          height={600}
          priority
        />
        {/* hero-contents avoids Tailwind .contents { display:contents } collision */}
        <div className="hero-contents">
          <div className="w">
            <h1>{hero.heading}</h1>
            <p className="hero-desc">{hero.description}</p>
            <a href={hero.ctaHref} className="link-button">
              <PhoneIcon />
              {hero.ctaLabel}
            </a>
          </div>
          <Image
            src={hero.patternImage}
            alt=""
            fill
            sizes="55vw"
          />
        </div>
      </div>

      {/* ================================================================
          HERO-NAV
          ================================================================ */}
      <HeroNav />

      {/* ================================================================
          Cream background wrapper
          ================================================================ */}
      <div className="cream">

        {/* ==============================================================
            FINANCING SOLUTIONS READY — .pv layout (full-width section,
            with its own .w81 inside — same pattern as why-j-blanton)
            ============================================================== */}
        <div className="pv">
          <div className="w81">
            {/* Desktop: label + body */}
            <div>
              <p className="red-text">{financingSolutionsReady.label}</p>
              <p>{financingSolutionsReady.body}</p>
            </div>
            {/* Mobile heading (hidden on desktop) */}
            <p className="red-text red-text-mobile">{financingSolutionsReady.label}</p>
            <Image
              src={financingSolutionsReady.image}
              alt={financingSolutionsReady.imageAlt}
              width={470}
              height={320}
              sizes="(max-width: 900px) 90vw, 470px"
            />
            {/* Mobile body (hidden on desktop) */}
            <div className="mobile-content">
              <p>{financingSolutionsReady.body}</p>
            </div>
          </div>
        </div>

        {/* ==============================================================
            EP sections — inside a single .w81 constraint
            ============================================================== */}
        <div className="w81">

          {/* ------------------------------------------------------------
              FINANCING MADE SIMPLE — .ep-card pattern
              ------------------------------------------------------------ */}
          <div className="ep-card">
            <Image
              className="ndc"
              src={financingMadeSimple.ndcImage}
              alt="NDC"
              fill
              sizes="100vw"
            />
            <div>
              <Image
                className="char"
                src={financingMadeSimple.characterImage}
                alt="Character"
                width={400}
                height={451}
              />
              <div className="a">
                <div className="l">
                  <Image
                    src={financingMadeSimple.leftImage}
                    alt={financingMadeSimple.leftImageAlt}
                    width={470}
                    height={320}
                  />
                </div>
                <div className="r">
                  <p className="label">{financingMadeSimple.label}</p>
                  {/* Mobile image — shown via CSS at ≤1000px */}
                  <Image
                    src={financingMadeSimple.leftImage}
                    alt={financingMadeSimple.leftImageAlt}
                    width={470}
                    height={320}
                  />
                  {financingMadeSimple.items.map((item) => (
                    <div className="service" key={item}>
                      <div><CheckIcon /></div>
                      <p>{item}</p>
                    </div>
                  ))}
                  <a href={financingMadeSimple.ctaHref} className="link-button">
                    {financingMadeSimple.ctaLabel}
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------------
              WE'RE ALMOST EVERYWHERE — .ep-map pattern
              ------------------------------------------------------------ */}
          <div className="ep-map">
            <div className="ep-contents">
              {/* map2: shown on mobile only */}
              <div className="map2">
                <div className={coverage.mapWidgetId} data-elfsight-app-lazy />
              </div>
              <p className="red-text">{coverage.heading}</p>
              <p>{coverage.body}</p>
            </div>
            {/* map1: shown on desktop only */}
            <div className="map1">
              <div className={coverage.mapWidgetId} data-elfsight-app-lazy />
            </div>
          </div>

          <p className="ep-tiktok-headline">{coverage.tikTokHeadline}</p>
          <div className="ep-tiktok">
            <div className={coverage.socialWidgetId} data-elfsight-app-lazy />
          </div>

          {/* ------------------------------------------------------------
              WE HATE SURPRISE BILLS TOO — .f2 pattern
              ------------------------------------------------------------ */}
          <div className="f2">
            <div>
              <p className="red-text">{surpriseBills.label}</p>
              {/* Mobile image (hidden on desktop) */}
              <Image
                src={surpriseBills.leftImage}
                alt={surpriseBills.leftImageAlt}
                width={470}
                height={320}
              />
              <p>{surpriseBills.body}</p>
              <Link href={surpriseBills.ctaHref} className="link-button">
                {surpriseBills.ctaLabel}
              </Link>
            </div>
            {/* Desktop right image */}
            <Image
              src={surpriseBills.rightImage}
              alt={surpriseBills.rightImageAlt}
              width={470}
              height={320}
            />
          </div>

          {/* ------------------------------------------------------------
              ARTICLES
              ------------------------------------------------------------ */}
          <div className="page-articles">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {articles.map((article) => (
                <ArticleCard key={article.slug} article={article} />
              ))}
            </div>
          </div>

          {/* ------------------------------------------------------------
              TURN A TIGHT SPOT INTO A SMART PLAN — .f3 pattern
              ------------------------------------------------------------ */}
          <div className="f3">
            {/* Desktop left image */}
            <Image
              src={bottomCta.leftImage}
              alt={bottomCta.leftImageAlt}
              width={470}
              height={320}
            />
            <div>
              <p className="red-text">{bottomCta.label}</p>
              {/* Mobile image (hidden on desktop) */}
              <Image
                src={bottomCta.innerImage}
                alt={bottomCta.innerImageAlt}
                width={470}
                height={320}
              />
              <p>{bottomCta.body}</p>
              <a href={bottomCta.ctaHref} className="link-button button1">
                {bottomCta.ctaLabel}
              </a>
            </div>
          </div>

        </div>{/* end .w81 */}
      </div>{/* end .cream */}

    </div>
  );
}
