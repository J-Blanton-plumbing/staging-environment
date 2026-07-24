'use client';

import { useState, useEffect } from 'react';
import { ADMIN_COLORS, ADMIN_SHADOWS } from '@/lib/admin/theme';

interface ServiceDescState {
  emergency: string;
  plumbing: string;
  sewer: string;
  drain: string;
  'water-heater': string;
  'water-quality': string;
  commercial: string;
}

/** Form-state shape for one office card — lat/lng are strings here (blank = not set yet)
 * and are converted to number|null on save (see `toCmsOffice`). */
interface OfficeFormState {
  slug: string;
  name: string;
  streetAddress: string;
  city: string;
  state: string;
  zip: string;
  mapUrl: string;
  lat: string;
  lng: string;
  /** Brief 107 (Track B) — whether this office appears in the public footer directory. */
  showInFooter: boolean;
}

interface FormState {
  phoneDisplay: string;
  phoneHref: string;
  headerPhone: string;
  ctaPrimaryLabel: string;
  taglineTurning: string;
  hoursLabel: string;
  ndcPrice: string;
  serviceDesc: ServiceDescState;
  offices: OfficeFormState[];
}

const EMPTY_SERVICE_DESC: ServiceDescState = {
  emergency: '',
  plumbing: '',
  sewer: '',
  drain: '',
  'water-heater': '',
  'water-quality': '',
  commercial: '',
};

const EMPTY_OFFICE: OfficeFormState = {
  slug: '', name: '', streetAddress: '', city: '', state: '', zip: '', mapUrl: '', lat: '', lng: '',
  showInFooter: true,
};

const EMPTY: FormState = {
  phoneDisplay: '',
  phoneHref: '',
  headerPhone: '',
  ctaPrimaryLabel: '',
  taglineTurning: '',
  hoursLabel: '',
  ndcPrice: '',
  serviceDesc: { ...EMPTY_SERVICE_DESC },
  offices: [],
};

// Service categories in display order, with editor labels.
const SERVICE_DESC_FIELDS: Array<{ key: keyof ServiceDescState; label: string }> = [
  { key: 'emergency', label: 'Emergency' },
  { key: 'plumbing', label: 'Plumbing' },
  { key: 'sewer', label: 'Sewer' },
  { key: 'drain', label: 'Drain' },
  { key: 'water-heater', label: 'Water Heater' },
  { key: 'water-quality', label: 'Water Quality' },
  { key: 'commercial', label: 'Commercial' },
];

const DESC_MAX = 120;

// Office-card sub-fields, in the order they render within each card.
const OFFICE_FIELDS: Array<{ key: keyof Omit<OfficeFormState, 'lat' | 'lng' | 'showInFooter'>; label: string; placeholder?: string }> = [
  { key: 'name', label: 'Office Name', placeholder: 'Northbrook (Corporate)' },
  { key: 'slug', label: 'Page Slug', placeholder: 'northbrook' },
  { key: 'streetAddress', label: 'Street Address', placeholder: '1945 Techny Road, #11' },
  { key: 'city', label: 'City', placeholder: 'Northbrook' },
  { key: 'state', label: 'State', placeholder: 'IL' },
  { key: 'zip', label: 'ZIP', placeholder: '60062' },
  { key: 'mapUrl', label: 'Google Maps Link', placeholder: 'https://maps.app.goo.gl/…' },
];

function toNum(v: string): number | null {
  const trimmed = v.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

const s: React.CSSProperties = {
  display: 'block', width: '100%', padding: '0.4rem 0.5rem',
  border: `1px solid ${ADMIN_COLORS.outlineVariant}66`, borderRadius: '0.75rem', marginBottom: '1rem',
  fontFamily: 'inherit', fontSize: '0.9rem', boxSizing: 'border-box',
  background: ADMIN_COLORS.surfaceContainerLowest, color: ADMIN_COLORS.onSurface,
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontWeight: 600, marginBottom: '0.25rem',
  fontSize: '0.85rem', color: ADMIN_COLORS.onSurfaceVariant, fontFamily: 'var(--font-nunito), system-ui, sans-serif',
};

const sectionStyle: React.CSSProperties = {
  marginBottom: '2rem', paddingBottom: '2rem', border: `1px solid ${ADMIN_COLORS.outlineVariant}33`,
  background: ADMIN_COLORS.surfaceContainerLow, borderRadius: '1.5rem', padding: '1.5rem',
  boxShadow: ADMIN_SHADOWS.elegant,
};

const sectionTitleStyle: React.CSSProperties = {
  fontWeight: 700, fontSize: '1rem', color: ADMIN_COLORS.onSurface, marginBottom: '0.35rem',
  fontFamily: 'var(--font-outfit), system-ui, sans-serif',
};

const sectionDescStyle: React.CSSProperties = {
  color: ADMIN_COLORS.onSurfaceVariant, fontSize: '0.8rem', marginBottom: '1.25rem', marginTop: 0,
};

const officeCardStyle: React.CSSProperties = {
  background: ADMIN_COLORS.surfaceContainer, border: `1px solid ${ADMIN_COLORS.outlineVariant}33`,
  borderRadius: '1rem', padding: '1.25rem', marginBottom: '1rem', boxShadow: ADMIN_SHADOWS.sm,
};

const addBtnStyle: React.CSSProperties = {
  background: ADMIN_COLORS.cerulean, border: 'none', borderRadius: '9999px',
  padding: '0.5rem 1.25rem', fontWeight: 700, fontSize: '0.85rem',
  color: '#fff', cursor: 'pointer', boxShadow: ADMIN_SHADOWS.lg,
};

const removeBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', color: ADMIN_COLORS.error, fontWeight: 600,
  fontSize: '0.8rem', cursor: 'pointer', padding: '0.25rem 0.5rem',
};

// Brief 107 (Track B2) — no existing switch/toggle component was found anywhere
// in the admin (checked TemplateSwitcher.tsx, StatusPopover.tsx, the cities
// filter pills); built from the same ADMIN_COLORS tokens as everything else
// here rather than introducing a new visual language.
function switchTrackStyle(on: boolean): React.CSSProperties {
  return {
    position: 'relative', width: '40px', height: '22px', borderRadius: '9999px',
    border: 'none', cursor: 'pointer', flexShrink: 0, padding: 0,
    background: on ? ADMIN_COLORS.cerulean : `${ADMIN_COLORS.outlineVariant}66`,
    transition: 'background 0.15s ease',
  };
}

function switchThumbStyle(on: boolean): React.CSSProperties {
  return {
    position: 'absolute', top: '2px', left: on ? '20px' : '2px',
    width: '18px', height: '18px', borderRadius: '9999px', background: '#fff',
    transition: 'left 0.15s ease', boxShadow: ADMIN_SHADOWS.sm,
  };
}

function toCmsOffice(o: OfficeFormState) {
  return {
    slug: o.slug.trim(),
    name: o.name,
    streetAddress: o.streetAddress,
    city: o.city,
    state: o.state,
    zip: o.zip,
    mapUrl: o.mapUrl,
    lat: toNum(o.lat),
    lng: toNum(o.lng),
    showInFooter: o.showInFooter,
  };
}

export default function GlobalSettingsPage() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [status, setStatus] = useState<'loading' | 'idle' | 'saving' | 'saved' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetch('/api/cms/global-settings')
      .then(r => r.json())
      .then(data => {
        const offices: OfficeFormState[] = Array.isArray(data.offices)
          ? data.offices.map((o: Record<string, unknown>) => ({
              slug: typeof o.slug === 'string' ? o.slug : '',
              name: typeof o.name === 'string' ? o.name : '',
              streetAddress: typeof o.streetAddress === 'string' ? o.streetAddress : '',
              city: typeof o.city === 'string' ? o.city : '',
              state: typeof o.state === 'string' ? o.state : '',
              zip: typeof o.zip === 'string' ? o.zip : '',
              mapUrl: typeof o.mapUrl === 'string' ? o.mapUrl : '',
              lat: o.lat == null ? '' : String(o.lat),
              lng: o.lng == null ? '' : String(o.lng),
              showInFooter: o.showInFooter !== false,
            }))
          : [];
        setForm({
          phoneDisplay: data.phoneDisplay ?? '',
          phoneHref: data.phoneHref ?? '',
          headerPhone: data.headerPhone ?? '',
          ctaPrimaryLabel: data.ctaPrimaryLabel ?? '',
          taglineTurning: data.taglineTurning ?? '',
          hoursLabel: data.hoursLabel ?? '',
          ndcPrice: data.ndcPrice ?? '',
          serviceDesc: { ...EMPTY_SERVICE_DESC, ...(data.serviceDesc ?? {}) },
          offices,
        });
        setStatus('idle');
      })
      .catch(() => {
        setStatus('error');
        setErrorMsg('Failed to load settings. Ensure the migration script has been run.');
      });
  }, []);

  function set(key: keyof Omit<FormState, 'serviceDesc' | 'offices'>, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function setServiceDesc(key: keyof ServiceDescState, value: string) {
    setForm(f => ({ ...f, serviceDesc: { ...f.serviceDesc, [key]: value } }));
  }

  function setOffice(i: number, key: keyof Omit<OfficeFormState, 'showInFooter'>, value: string) {
    setForm(f => ({
      ...f,
      offices: f.offices.map((o, idx) => (idx === i ? { ...o, [key]: value } : o)),
    }));
  }

  function toggleOfficeShowInFooter(i: number) {
    setForm(f => ({
      ...f,
      offices: f.offices.map((o, idx) => (idx === i ? { ...o, showInFooter: !o.showInFooter } : o)),
    }));
  }

  function addOffice() {
    setForm(f => ({ ...f, offices: [...f.offices, { ...EMPTY_OFFICE }] }));
  }

  function removeOffice(i: number) {
    setForm(f => {
      if (f.offices.length <= 1) return f;
      return { ...f, offices: f.offices.filter((_, idx) => idx !== i) };
    });
  }

  async function handleSave() {
    setStatus('saving');
    setErrorMsg('');
    try {
      const payload = { ...form, offices: form.offices.map(toCmsOffice) };
      const res = await fetch('/api/cms/global-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error ?? 'Unknown error');
      }
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err: unknown) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Save failed.');
    }
  }

  if (status === 'loading') return <div style={{ padding: '2rem', background: ADMIN_COLORS.surface, color: ADMIN_COLORS.onSurface, minHeight: '100vh' }}>Loading…</div>;

  return (
    <div className="admin-editor-page" style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem', fontFamily: 'var(--font-nunito), system-ui, sans-serif', background: ADMIN_COLORS.surface, color: ADMIN_COLORS.onSurface, minHeight: '100vh' }}>
      <style>{`
        .admin-editor-page input:focus, .admin-editor-page textarea:focus, .admin-editor-page select:focus { outline: none; box-shadow: 0 0 0 2px ${ADMIN_COLORS.primary}66; }
        .admin-save-btn { transition: box-shadow 0.2s ease, filter 0.2s ease; }
        .admin-save-btn:hover { box-shadow: ${ADMIN_SHADOWS.glowCerulean}; filter: brightness(1.05); }
        .admin-add-btn { transition: box-shadow 0.2s ease, filter 0.2s ease; }
        .admin-add-btn:hover { box-shadow: ${ADMIN_SHADOWS.glowCerulean}; filter: brightness(1.05); }
        .admin-two-col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0 1.5rem;
        }
        .admin-two-col > * { min-width: 0; }
        .admin-span-2 { grid-column: 1 / -1; }
        @media (max-width: 899px) {
          .admin-two-col { grid-template-columns: 1fr; }
        }
      `}</style>
      <h1 style={{ fontFamily: 'var(--font-outfit), system-ui, sans-serif', fontWeight: 700, fontSize: '1.5rem', color: ADMIN_COLORS.onSurface, marginBottom: '0.25rem' }}>
        Global Settings
      </h1>
      <p style={{ color: ADMIN_COLORS.onSurfaceVariant, fontSize: '0.875rem', marginBottom: '2rem' }}>
        Site-wide values. Changes save to the database and are read live by the
        front-end (navbar, page heroes, footer, and CTAs). Allow a moment for cached pages to refresh.
      </p>

      {status === 'error' && (
        <div style={{ background: `${ADMIN_COLORS.error}1a`, border: `1px solid ${ADMIN_COLORS.error}66`, borderRadius: '1rem', padding: '0.85rem 1rem', marginBottom: '1.5rem', color: ADMIN_COLORS.error, fontSize: '0.875rem' }}>
          {errorMsg}
        </div>
      )}

      {/* ── Section 1: Variables ──────────────────────────────────────────── */}
      <div style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Variables</h2>
        <p style={sectionDescStyle}>
          Site-wide values used across the website — phone numbers, calls to action, taglines and hours.
        </p>
        <div className="admin-two-col">
          <div>
            <label style={labelStyle}>Phone Number — <code>{'{{phone}}'}</code></label>
            <input style={s} value={form.phoneDisplay} onChange={e => set('phoneDisplay', e.target.value)} placeholder="773-724-9272" />
          </div>
          <div>
            <label style={labelStyle}>No Drip Club Price — <code>{'{{ndc_price}}'}</code></label>
            <input style={s} value={form.ndcPrice} onChange={e => set('ndcPrice', e.target.value)} placeholder="$29.97" />
          </div>
          <div>
            <label style={labelStyle}>Phone Link (e.g. tel:773-724-9272)</label>
            <input style={s} value={form.phoneHref} onChange={e => set('phoneHref', e.target.value)} placeholder="tel:773-724-9272" />
          </div>
          <div>
            <label style={labelStyle}>Header Phone (call-tracking number — navbar only)</label>
            <input style={s} value={form.headerPhone} onChange={e => set('headerPhone', e.target.value)} placeholder="773-900-8690" />
          </div>
          <div>
            <label style={labelStyle}>Primary CTA Button Label</label>
            <input style={s} value={form.ctaPrimaryLabel} onChange={e => set('ctaPrimaryLabel', e.target.value)} placeholder="MAKE A GOOD CALL" />
          </div>
          <div>
            <label style={labelStyle}>Hours Label (e.g. &quot;24 hours&quot;)</label>
            <input style={s} value={form.hoursLabel} onChange={e => set('hoursLabel', e.target.value)} placeholder="24 hours" />
          </div>
          <div className="admin-span-2">
            <label style={labelStyle}>Turning Bad Calls Tagline</label>
            <input style={s} value={form.taglineTurning} onChange={e => set('taglineTurning', e.target.value)} placeholder="J Blanton Plumbing - Turning Bad Calls to Good Calls" />
          </div>
        </div>
      </div>

      {/* ── Section 2: Service Category Descriptions (Brief 67) ──────────── */}
      <div style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Service Category Descriptions</h2>
        <p style={sectionDescStyle}>
          Short blurbs shown for each service category. Keep each under ~{DESC_MAX} characters.
        </p>
        <div className="admin-two-col">
          {SERVICE_DESC_FIELDS.map(({ key, label }) => {
            const value = form.serviceDesc[key];
            const over = value.length > DESC_MAX;
            return (
              <div key={key} style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>{label}</label>
                <textarea
                  style={{ ...s, minHeight: '52px', marginBottom: '0.2rem' }}
                  value={value}
                  onChange={e => setServiceDesc(key, e.target.value)}
                />
                <span style={{ fontSize: '0.75rem', color: over ? ADMIN_COLORS.error : ADMIN_COLORS.onSurfaceVariant }}>
                  {value.length}/{DESC_MAX}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Section 3: Office Addresses (Brief 102, Track C) ──────────────── */}
      <div style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Office Addresses</h2>
        <p style={sectionDescStyle}>
          Manage the office locations shown in the footer and across the site. Edit an
          address or add a new office — changes apply everywhere the address appears.
        </p>

        {form.offices.map((office, i) => (
          <div key={i} style={officeCardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontWeight: 700, fontSize: '0.85rem', color: `${ADMIN_COLORS.onSurfaceVariant}` }}>
                {office.name || `Office ${i + 1}`}
              </span>
              {form.offices.length > 1 && (
                <button type="button" style={removeBtnStyle} onClick={() => removeOffice(i)}>Remove</button>
              )}
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem', cursor: 'pointer' }}>
              <button
                type="button"
                role="switch"
                aria-checked={office.showInFooter}
                style={switchTrackStyle(office.showInFooter)}
                onClick={() => toggleOfficeShowInFooter(i)}
              >
                <span style={switchThumbStyle(office.showInFooter)} />
              </button>
              <span style={{ fontWeight: 600, fontSize: '0.85rem', color: ADMIN_COLORS.onSurface }}>
                Show in footer
              </span>
            </label>

            <div className="admin-two-col">
              {OFFICE_FIELDS.map(({ key, label, placeholder }) => (
                <div key={key} className={key === 'mapUrl' ? 'admin-span-2' : undefined}>
                  <label style={labelStyle}>{label}</label>
                  <input
                    style={s}
                    value={office[key]}
                    onChange={e => setOffice(i, key, e.target.value)}
                    placeholder={placeholder}
                  />
                  {key === 'slug' && (
                    <p style={{ fontSize: '0.7rem', color: `${ADMIN_COLORS.onSurfaceVariant}99`, margin: '-0.75rem 0 1rem' }}>
                      Used for this office&apos;s page link (/{office.slug || 'slug'}). Renaming an
                      existing office&apos;s slug can break its city page link.
                    </p>
                  )}
                </div>
              ))}
            </div>

            <p style={{ ...labelStyle, marginTop: '0.5rem', marginBottom: '0.5rem' }}>
              Latitude / Longitude <span style={{ fontWeight: 400, color: `${ADMIN_COLORS.onSurfaceVariant}99` }}>(optional — used for SEO structured data)</span>
            </p>
            <div className="admin-two-col">
              <div>
                <label style={labelStyle}>Latitude</label>
                <input style={s} value={office.lat} onChange={e => setOffice(i, 'lat', e.target.value)} placeholder="42.1278" />
              </div>
              <div>
                <label style={labelStyle}>Longitude</label>
                <input style={s} value={office.lng} onChange={e => setOffice(i, 'lng', e.target.value)} placeholder="-87.8451" />
              </div>
            </div>
          </div>
        ))}

        <button type="button" className="admin-add-btn" style={addBtnStyle} onClick={addOffice}>
          + Add Office
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          className="admin-save-btn"
          onClick={handleSave}
          disabled={status === 'saving'}
          style={{ background: ADMIN_COLORS.cerulean, color: '#fff', border: 'none', padding: '0.7rem 2rem', borderRadius: '9999px', fontWeight: 700, fontSize: '1rem', cursor: status === 'saving' ? 'not-allowed' : 'pointer', opacity: status === 'saving' ? 0.7 : 1, boxShadow: ADMIN_SHADOWS.lg }}
        >
          {status === 'saving' ? 'Saving…' : 'Save'}
        </button>
        {status === 'saved' && <span style={{ color: ADMIN_COLORS.success, fontWeight: 600 }}>Saved.</span>}
        {/* The office list can run to 14+ cards, so the top error banner can be
            scrolled well out of view by the time someone clicks Save down here
            — repeat the error right next to the button that was just clicked. */}
        {status === 'error' && <span style={{ color: ADMIN_COLORS.error, fontWeight: 600 }}>{errorMsg || 'Save failed.'}</span>}
      </div>
    </div>
  );
}
