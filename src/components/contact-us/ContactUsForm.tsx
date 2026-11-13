'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { PhoneLink, PhoneNumber } from '@/components/PhoneLink';
import {
  CONTACT_US_FIELD_ORDER,
  CONTACT_US_FORM_SLUG,
  CONTACT_US_SERVICE_OPTIONS,
  SMS_MARKETING_TEXT,
  SMS_MARKETING_TITLE,
  SMS_SERVICE_TEXT,
  SMS_SERVICE_TITLE,
  validateContactUs,
  type ContactUsErrors,
  type ContactUsField,
  type ContactUsInput,
} from '@/lib/contact-us/form';

/**
 * Brief 228 (Track B1) — the "Send Us a Message" form on /contact-us.
 *
 * Markup, classes, labels, options and the two SMS consent texts are the
 * approved prototype's (JBP_Contact_Us_Prototype2.html, section 3); only the
 * field `name`s changed, to Mainline's keys. It posts JSON to OUR
 * `/api/contact-us`, which validates again and forwards to Mainline — the
 * browser never calls Mainline.
 *
 * Validation rules live in `src/lib/contact-us/form.ts`, shared with the
 * server. `noValidate` keeps the browser's own bubbles from replacing our
 * messages; errors are inline (aria-invalid + aria-describedby), focus moves to
 * the first invalid field, and a summary is announced through an aria-live
 * region.
 *
 * Success swaps the card's contents for an inline thank-you panel (no redirect
 * to /thank-you — that page carries the Ads conversion, which a contact message
 * must not fire). Focus moves with setTimeout(0), never rAF (Brief 169: rAF is
 * suspended in a non-compositing tab).
 */

/** Prototype element ids, per field. */
const FIELD_ID: Record<ContactUsField, string> = {
  first_name: 'ct-fn',
  last_name: 'ct-ln',
  email: 'ct-em',
  phone: 'ct-ph',
  service_category: 'ct-sv',
};

const FIELD_LABEL: Record<ContactUsField, string> = {
  first_name: 'First name',
  last_name: 'Last name',
  email: 'Email',
  phone: 'Phone',
  service_category: 'Service request',
};

const EMPTY: ContactUsInput = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  service_category: '',
  message: '',
  sms_service_consent: false,
  sms_marketing_consent: false,
};

function newEventId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  } catch {
    /* insecure context — fall through */
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/**
 * Attribution sources, in Mainline's naming, each with the keys to try in order
 * — the same mapping as the schedule popup's `PARAM_SOURCES`
 * (src/lib/schedule/tracking.ts, Brief 169), limited to what Mainline's
 * /api/leads reads.
 */
const ATTRIBUTION_SOURCES: Array<[string, string[]]> = [
  ['utm_source', ['utm_source', 'source']],
  ['utm_medium', ['utm_medium', 'medium']],
  ['utm_campaign', ['utm_campaign', 'campaignname']],
  ['utm_term', ['utm_term', 'keyword']],
  ['utm_content', ['utm_content']],
  ['gclid', ['gclid']],
  ['fbclid', ['fbclid']],
  ['msclkid', ['msclkid']],
  ['fbp', ['fbp']],
  ['fbc', ['fbc']],
];

function readCookie(name: string): string {
  const m = document.cookie.match(new RegExp('(?:^|;\\s*)' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)'));
  if (!m) return '';
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
}

/**
 * Attribution for the lead. Same precedence as the schedule popup: the current
 * URL wins, the site's EXISTING first-touch store fills the gaps
 * (`sessionStorage.jb_utm_params`, written by InvolveMeScript on the landing
 * pageview — read, never written, here), and the Meta Pixel's `_fbp`/`_fbc`
 * cookies supply fbp/fbc.
 *
 * Deliberately NOT an import of `collectScheduleParams()`: that module (like
 * `@/lib/analytics`) is compiled INTO the root layout's client bundle, and
 * importing it from a page splits it out — changing the layout's JS on every
 * page of the site (Brief 228 byte-identical gate). This reader is the same
 * logic over the same store.
 */
function buildTracking(): Record<string, string> {
  const params: Record<string, string> = {};
  try {
    const raw = window.sessionStorage.getItem('jb_utm_params');
    const stored: unknown = raw ? JSON.parse(raw) : null;
    if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
      for (const [k, val] of Object.entries(stored as Record<string, unknown>)) if (typeof val === 'string' && val) params[k] = val;
    }
  } catch {
    /* private mode / hand-edited value — no stored attribution */
  }
  try {
    new URLSearchParams(window.location.search).forEach((val, k) => {
      if (k && val) params[k] = val; // URL wins, per key
    });
  } catch {
    /* malformed query string */
  }
  if (!params.fbp) params.fbp = readCookie('_fbp');
  if (!params.fbc) params.fbc = readCookie('_fbc');

  const out: Record<string, string> = {};
  for (const [target, keys] of ATTRIBUTION_SOURCES) {
    for (const k of keys) {
      const val = params[k];
      if (typeof val === 'string' && val.trim()) {
        out[target] = val.trim();
        break;
      }
    }
  }
  return { ...out, landing_url: window.location.href, event_id: newEventId() };
}

/**
 * Brief 228 (Track B6) — the one GA4 event, on a successful submit only.
 * `ga4Id` is resolved on the server by the Brief 128 helper (`getTrackingIds()`
 * in src/lib/analytics.ts: blank = tracking off → no-op). `send_to` keeps it
 * GA4-only: without it gtag fans the event out to every configured
 * destination, Google Ads included. Not a key event, not a conversion.
 */
function sendContactUsEvent(ga4Id: string) {
  if (!ga4Id || typeof window.gtag !== 'function') return;
  window.gtag('event', 'contact_us_submit', { form_slug: CONTACT_US_FORM_SLUG, send_to: ga4Id });
}

export default function ContactUsForm({
  phoneDisplay,
  phoneHref,
  ga4Id,
}: {
  phoneDisplay: string;
  phoneHref: string;
  ga4Id: string;
}) {
  const [v, setV] = useState<ContactUsInput>(EMPTY);
  const [website, setWebsite] = useState('');
  const [errors, setErrors] = useState<ContactUsErrors>({});
  const [summary, setSummary] = useState('');
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(0); // >0 → show the failure message; the count re-mounts it so it re-announces
  const [done, setDone] = useState(false);
  const inFlight = useRef(false);
  const doneHeading = useRef<HTMLHeadingElement>(null);

  const set = <K extends keyof ContactUsInput>(key: K, value: ContactUsInput[K]) => {
    setV((prev) => ({ ...prev, [key]: value }));
    if (key in FIELD_ID && errors[key as ContactUsField]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key as ContactUsField];
        return next;
      });
    }
  };

  async function onSubmit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (inFlight.current) return;

    const found = validateContactUs(v);
    const invalid = CONTACT_US_FIELD_ORDER.filter((f) => found[f]);
    setErrors(found);
    if (invalid.length > 0) {
      setFailed(0);
      setSummary(
        invalid.length === 1
          ? `Please fix 1 field: ${FIELD_LABEL[invalid[0]]}.`
          : `Please fix ${invalid.length} fields: ${invalid.map((f) => FIELD_LABEL[f]).join(', ')}.`,
      );
      const firstId = FIELD_ID[invalid[0]];
      window.setTimeout(() => document.getElementById(firstId)?.focus(), 0);
      return;
    }

    setSummary('');
    inFlight.current = true;
    setSending(true);
    let ok = false;
    try {
      const res = await fetch('/api/contact-us', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ values: v, tracking: buildTracking(), website }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: unknown } | null;
      ok = res.ok && data?.ok === true;
    } catch {
      ok = false;
    }
    inFlight.current = false;
    setSending(false);

    if (!ok) {
      // Everything the visitor typed stays in the fields.
      setFailed((n) => n + 1);
      return;
    }
    sendContactUsEvent(ga4Id);
    setDone(true);
  }

  // Focus the thank-you heading once the panel has COMMITTED (a timeout queued
  // straight after setDone can run before React renders it, leaving focus on
  // <body>). setTimeout(0), not rAF — Brief 169.
  useEffect(() => {
    if (!done) return;
    const t = window.setTimeout(() => doneHeading.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [done]);

  const phone = (
    <PhoneLink href={phoneHref} display={phoneDisplay}>
      <PhoneNumber value={phoneDisplay} />
    </PhoneLink>
  );

  if (done) {
    return (
      <div className="ct-form ct-done" role="status">
        <h2 className="t-h2" tabIndex={-1} ref={doneHeading}>
          Thanks, we got your message.
        </h2>
        <p className="t-body ct-done-p">
          We&rsquo;ll get back to you within 1 business day. For emergencies, call {phone}.
        </p>
      </div>
    );
  }

  const a11y = (f: ContactUsField) => ({
    id: FIELD_ID[f],
    'aria-invalid': errors[f] ? (true as const) : undefined,
    'aria-describedby': errors[f] ? `${FIELD_ID[f]}-err` : undefined,
  });
  const err = (f: ContactUsField) =>
    errors[f] ? (
      <p className="ct-err" id={`${FIELD_ID[f]}-err`}>
        {errors[f]}
      </p>
    ) : null;

  return (
    <form className="ct-form" method="post" noValidate onSubmit={onSubmit}>
      <h2 className="t-h2">Send Us a Message</h2>
      <p className="t-body-sm ct-req">
        Fields marked <b>*</b> are required.
      </p>
      <div className="ct-summary" aria-live="assertive" aria-atomic="true">
        {summary ? <p>{summary}</p> : null}
      </div>
      <div className="ct-grid">
        <div className="ct-f">
          <label htmlFor="ct-fn">
            First name <b>*</b>
          </label>
          <input
            className="ct-in"
            {...a11y('first_name')}
            name="first_name"
            autoComplete="given-name"
            required
            value={v.first_name}
            onChange={(e) => set('first_name', e.target.value)}
          />
          {err('first_name')}
        </div>
        <div className="ct-f">
          <label htmlFor="ct-ln">
            Last name <b>*</b>
          </label>
          <input
            className="ct-in"
            {...a11y('last_name')}
            name="last_name"
            autoComplete="family-name"
            required
            value={v.last_name}
            onChange={(e) => set('last_name', e.target.value)}
          />
          {err('last_name')}
        </div>
        <div className="ct-f">
          <label htmlFor="ct-em">
            Email <b>*</b>
          </label>
          <input
            className="ct-in"
            {...a11y('email')}
            name="email"
            type="email"
            autoComplete="email"
            required
            value={v.email}
            onChange={(e) => set('email', e.target.value)}
          />
          {err('email')}
        </div>
        <div className="ct-f">
          <label htmlFor="ct-ph">
            Phone <b>*</b>
          </label>
          <input
            className="ct-in"
            {...a11y('phone')}
            name="phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            placeholder="(555) 555-5555"
            required
            value={v.phone}
            onChange={(e) => set('phone', e.target.value)}
          />
          {err('phone')}
        </div>
        <div className="ct-f ct-f--full">
          <label htmlFor="ct-sv">
            Service request <b>*</b>
          </label>
          <select
            className="ct-in"
            {...a11y('service_category')}
            name="service_category"
            required
            value={v.service_category}
            onChange={(e) => set('service_category', e.target.value)}
          >
            <option value="" disabled>
              Choose a service
            </option>
            {CONTACT_US_SERVICE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {err('service_category')}
        </div>
        <div className="ct-f ct-f--full">
          <label htmlFor="ct-msg">How can we help?</label>
          <textarea
            className="ct-in"
            id="ct-msg"
            name="message"
            value={v.message}
            onChange={(e) => set('message', e.target.value)}
          />
        </div>
        <fieldset className="ct-sms">
          <legend className="ct-legend">
            Text message preferences <span>(optional)</span>
          </legend>
          <label className="ct-check">
            <input
              type="checkbox"
              name="sms_service_consent"
              checked={v.sms_service_consent}
              onChange={(e) => set('sms_service_consent', e.target.checked)}
            />
            <div>
              <strong>{SMS_SERVICE_TITLE}</strong>
              <span>{SMS_SERVICE_TEXT}</span>
            </div>
          </label>
          <label className="ct-check">
            <input
              type="checkbox"
              name="sms_marketing_consent"
              checked={v.sms_marketing_consent}
              onChange={(e) => set('sms_marketing_consent', e.target.checked)}
            />
            <div>
              <strong>{SMS_MARKETING_TITLE}</strong>
              <span>{SMS_MARKETING_TEXT}</span>
            </div>
          </label>
        </fieldset>
        {/* Honeypot: invisible to people and assistive tech, never in the tab order. */}
        <div className="ct-hp" aria-hidden="true">
          <label htmlFor="ct-website">Website</label>
          <input
            id="ct-website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </div>
        {failed > 0 ? (
          <p className="ct-fail" role="alert" key={failed}>
            Something went wrong sending your message. Please try again or call us at {phone}.
          </p>
        ) : null}
        <button className="btn btn-primary t-btn ct-submit" type="submit" disabled={sending} aria-disabled={sending || undefined}>
          {sending ? 'Sending…' : 'Submit'}
        </button>
      </div>
    </form>
  );
}
