/**
 * Brief 228 — the /contact-us form's contract with Mainline, and the ONE set of
 * validation rules the client form and the server proxy both run.
 *
 * DB-free and React-free on purpose: `ContactUsForm.tsx` (client) and
 * `src/app/api/contact-us/route.ts` (server) import the same functions, so the
 * browser and the proxy can never disagree about what is valid.
 *
 * Every Mainline value below was read from Mainline itself (Brief 228 Track 0),
 * not from the prototype's `name=` attributes:
 *   - jblantonplumbing/mainline `supabase/migrations/1057_contact_us_form.sql`
 *     (the published `forms` row `/api/leads` validates against), and
 *   - `src/app/contact-us/constants.ts` + `ContactUsForm.tsx` (Mainline's own
 *     page, which posts the same `{ formSlug, values, tracking }` shape).
 * If Mainline changes that form definition, change this file with it.
 */

/** `forms.slug` of Mainline's Contact Us form (migration 1057). */
export const CONTACT_US_FORM_SLUG = 'contact-us';

/**
 * Service request options: the label is the prototype's visible text (final
 * copy), the value is Mainline's option value. Same 8 options, same order, same
 * labels on both sides (verified Track 0).
 */
export const CONTACT_US_SERVICE_OPTIONS = [
  { label: 'Plumbing repair', value: 'plumbing' },
  { label: 'Drain cleaning', value: 'drains' },
  { label: 'Sewer repair & lining', value: 'sewer' },
  { label: 'Water heater', value: 'water_heater' },
  { label: 'Sump pump', value: 'sump_pump' },
  { label: 'Bathroom remodeling', value: 'bathrooms' },
  { label: 'Water damage restoration', value: 'water_damage' },
  { label: 'Something else', value: 'other' },
] as const;

export type ContactUsServiceValue = (typeof CONTACT_US_SERVICE_OPTIONS)[number]['value'];

/**
 * The two SMS consent disclosures. LEGAL TEXT — verbatim, character for
 * character, from the prototype (which matches Mainline's option labels, the
 * wording Mainline stores with each answer). Never edit one without Legal and
 * without changing Mainline's form definition in the same breath.
 */
export const SMS_SERVICE_TITLE = 'Appointment & Service Texts';
export const SMS_SERVICE_TEXT =
  'I agree to receive recurring automated text messages from J. Blanton Plumbing regarding appointments and service updates at the number provided. Message frequency varies. Msg & data rates may apply. Reply STOP to opt out or HELP for help.';
export const SMS_MARKETING_TITLE = 'Marketing & Promotional Texts';
export const SMS_MARKETING_TEXT =
  'I agree to receive recurring automated marketing and promotional text messages from J. Blanton Plumbing at the number provided. Message frequency varies. Msg & data rates may apply. Reply STOP to opt out or HELP for help. Consent is not a condition of purchase.';

/** What the visitor typed, as the client sends it to our proxy. */
export interface ContactUsInput {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  service_category: string;
  message: string;
  sms_service_consent: boolean;
  sms_marketing_consent: boolean;
}

export type ContactUsField = 'first_name' | 'last_name' | 'email' | 'phone' | 'service_category';
export type ContactUsErrors = Partial<Record<ContactUsField, string>>;

/** Order the fields appear in — focus goes to the first invalid one in this order. */
export const CONTACT_US_FIELD_ORDER: readonly ContactUsField[] = [
  'first_name',
  'last_name',
  'email',
  'phone',
  'service_category',
];

/** Length caps (server + client). Generous for real input, small enough to stay under the 10 KB body cap. */
export const MAX_LEN = { name: 100, email: 254, phone: 40, message: 5000 } as const;

/**
 * The email rule Mainline's server applies (`z.string().email()`, zod v4) —
 * the same regex here, so nothing we accept is rejected one hop later.
 */
const EMAIL_RE = /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9-]*\.)+[A-Za-z]{2,}$/;

/** Only digits and the usual separators: `(555) 555-5555`, `555-555-5555`, `5555555555`, `+1 555 555 5555`. */
const PHONE_CHARS_RE = /^[\d\s().+-]+$/;

/**
 * The 10 national digits of a US number, or null. A leading country code `1`
 * on an 11-digit entry is dropped (Mainline accepts the same).
 */
export function phoneDigits(raw: string): string | null {
  const s = raw.trim();
  if (!s || !PHONE_CHARS_RE.test(s)) return null;
  let d = s.replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('1')) d = d.slice(1);
  return d.length === 10 ? d : null;
}

/** `7735551234` → `(773) 555-1234`. */
export function formatUsPhone(tenDigits: string): string {
  return `(${tenDigits.slice(0, 3)}) ${tenDigits.slice(3, 6)}-${tenDigits.slice(6)}`;
}

export function isServiceValue(v: string): v is ContactUsServiceValue {
  return CONTACT_US_SERVICE_OPTIONS.some((o) => o.value === v);
}

/** Inline error messages (shown under each field and listed in the summary). */
export const CONTACT_US_ERROR_TEXT: Record<ContactUsField, string> = {
  first_name: 'Enter your first name.',
  last_name: 'Enter your last name.',
  email: 'Enter a valid email address, like name@example.com.',
  phone: 'Enter a 10-digit phone number, like (555) 555-5555.',
  service_category: 'Choose a service.',
};

/** Validates one submission. Same rules on the client and the server. */
export function validateContactUs(input: ContactUsInput): ContactUsErrors {
  const e: ContactUsErrors = {};
  const first = input.first_name.trim();
  const last = input.last_name.trim();
  const email = input.email.trim();
  if (!first || first.length > MAX_LEN.name) e.first_name = CONTACT_US_ERROR_TEXT.first_name;
  if (!last || last.length > MAX_LEN.name) e.last_name = CONTACT_US_ERROR_TEXT.last_name;
  if (!email || email.length > MAX_LEN.email || !EMAIL_RE.test(email)) e.email = CONTACT_US_ERROR_TEXT.email;
  if (input.phone.length > MAX_LEN.phone || !phoneDigits(input.phone)) e.phone = CONTACT_US_ERROR_TEXT.phone;
  if (!isServiceValue(input.service_category)) e.service_category = CONTACT_US_ERROR_TEXT.service_category;
  return e;
}

/** Coerces an untrusted JSON body into a ContactUsInput (wrong types → empty / false). */
export function toContactUsInput(raw: unknown): ContactUsInput {
  const o = (raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}) as Record<string, unknown>;
  const s = (k: string) => (typeof o[k] === 'string' ? (o[k] as string) : '');
  return {
    first_name: s('first_name'),
    last_name: s('last_name'),
    email: s('email'),
    phone: s('phone'),
    service_category: s('service_category'),
    message: s('message'),
    sms_service_consent: o.sms_service_consent === true,
    sms_marketing_consent: o.sms_marketing_consent === true,
  };
}
