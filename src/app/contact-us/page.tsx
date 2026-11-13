import type { Metadata } from 'next';
import Link from 'next/link';
import ContactUsForm from '@/components/contact-us/ContactUsForm';
import { PhoneLink, PhoneNumber } from '@/components/PhoneLink';
import { getTrackingIds } from '@/lib/analytics';
import { getGlobalSettingsCached } from '@/lib/cms/global-settings';
import { formatUsPhone, phoneDigits } from '@/lib/contact-us/form';
import { breadcrumbListJsonLd } from '@/lib/schema/breadcrumb-list';
import { ORG_ID } from '@/lib/schema/organization-ref';
import { CANONICAL_BASE } from '@/lib/seo';
import './contact-us.css';

/**
 * Brief 228 — /contact-us: intro + 3 info cards + the "Send Us a Message" form
 * (proxied to Mainline by /api/contact-us).
 *
 * Ported from the approved prototype (New Pages/Contact Us page/
 * JBP_Contact_Us_Prototype2.html): its <main> sections 1–3 and its `ct-`
 * stylesheet only. The prototype's header, drawer, footer and script are not
 * ported — the production shell renders the real ones — and neither is its
 * entrance animation (`pv-in`), which the brief keeps only where /locations
 * already ships it (it does not).
 *
 * Hard-coded copy (Marketing 2026-11-13: no CMS wiring in Brief 228). The
 * phone and the Corporate Office address come from Global Settings, so neither
 * can drift from the footer. `/contact` (Brief 49) is a separate page and is
 * untouched — do not redirect one to the other.
 *
 * Title: 'Contact Us' + the root layout's template → "Contact Us | J. Blanton
 * Plumbing". Canonical: the root layout's self-canonical (x-pathname).
 */

export const dynamic = 'force-dynamic';

const PAGE_PATH = '/contact-us';

export const metadata: Metadata = {
  title: 'Contact Us',
  description:
    'Contact J. Blanton Plumbing to schedule service, get a quote or ask a question. Call (773) 724-9272. Available 24/7 for plumbing emergencies.',
};

function IconPhone() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.68 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.32 1.85.55 2.81.68A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function IconPin() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export default async function ContactUsPage() {
  const settings = await getGlobalSettingsCached();

  // The site's canonical number (Global Settings → SITE.phone fallback), shown
  // in the prototype's "(773) 724-9272" form. PhoneLink/PhoneNumber let
  // WhatConverts swap it like every other phone CTA.
  const digits = phoneDigits(settings.phoneDisplay);
  const phoneDisplay = digits ? formatUsPhone(digits) : settings.phoneDisplay;
  const phoneHref = settings.phoneHref;

  // Corporate Office card: the Northbrook office from Global Settings (the same
  // list the footer prints; it falls back to the static office list when the DB
  // is unreachable), so the address can't drift from the footer.
  const northbrook = settings.offices.find((o) => o.slug === 'northbrook');

  const pageUrl = `${CANONICAL_BASE}${PAGE_PATH}`;
  const contactPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: 'Contact Us',
    url: pageUrl,
    about: { '@id': ORG_ID },
  };
  const breadcrumbJsonLd = breadcrumbListJsonLd(
    [
      { label: 'Home', href: '/' },
      { label: 'Contact Us', href: PAGE_PATH },
    ],
    CANONICAL_BASE,
  );

  return (
    <div className="contact-us-page">
      {/* 1. INTRO */}
      <section className="ct-intro">
        <div className="wrap">
          <nav aria-label="Breadcrumb">
            <ol className="lc-crumbs">
              <li>
                <Link href="/">Home</Link>
              </li>
              <li aria-current="page">Contact Us</li>
            </ol>
          </nav>
          <h1 className="t-h1 hub-h1">Contact Us</h1>
          <p className="ct-sub">We&rsquo;re here to help. Reach out anytime.</p>
          <p className="t-body pv-mute">
            Whether you need to schedule a service, get a quote, or just have a question, the J. Blanton Plumbing team is
            ready to help. We&rsquo;re available 24/7 for plumbing emergencies and during business hours for everything
            else. Call us or send a message below and we&rsquo;ll get back to you within 1 business day.
          </p>

          {/* 2. INFO CARDS */}
          <ul className="ct-cards">
            <li className="ct-card">
              <span className="ct-ico">
                <IconPhone />
              </span>
              <div>
                <span className="t-eyebrow">Call Us</span>
                <p className="ct-val">
                  <PhoneLink href={phoneHref} display={phoneDisplay}>
                    <PhoneNumber value={phoneDisplay} />
                  </PhoneLink>
                </p>
                <p className="ct-note">24/7 for emergencies</p>
              </div>
            </li>
            {northbrook ? (
              <li className="ct-card">
                <span className="ct-ico">
                  <IconPin />
                </span>
                <div>
                  <span className="t-eyebrow">Corporate Office</span>
                  <p className="ct-val">{northbrook.streetAddress}</p>
                  <p className="ct-note">{`${northbrook.city}, ${northbrook.state} ${northbrook.zip}`}</p>
                </div>
              </li>
            ) : null}
            <li className="ct-card">
              <span className="ct-ico">
                <IconClock />
              </span>
              <div>
                <span className="t-eyebrow">Response Time</span>
                <p className="ct-val">Within 1 business day</p>
                <p className="ct-note">Emergencies answered 24/7</p>
              </div>
            </li>
          </ul>
        </div>
      </section>

      {/* 3. FORM — id="message" so /contact-us#message deep-links to it */}
      <section className="ct-form-sec" id="message">
        <ContactUsForm phoneDisplay={phoneDisplay} phoneHref={phoneHref} ga4Id={getTrackingIds().ga4} />
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(contactPageJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
    </div>
  );
}
