'use client';

import { useState, useEffect } from 'react';

interface ServiceDescState {
  emergency: string;
  plumbing: string;
  sewer: string;
  drain: string;
  'water-heater': string;
  'water-quality': string;
  commercial: string;
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

const EMPTY: FormState = {
  phoneDisplay: '',
  phoneHref: '',
  headerPhone: '',
  ctaPrimaryLabel: '',
  taglineTurning: '',
  hoursLabel: '',
  ndcPrice: '',
  serviceDesc: { ...EMPTY_SERVICE_DESC },
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

const s: React.CSSProperties = {
  display: 'block', width: '100%', padding: '0.4rem 0.5rem',
  border: '1px solid #d1d5db', borderRadius: '4px', marginBottom: '1rem',
  fontFamily: 'inherit', fontSize: '0.9rem', boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontWeight: 600, marginBottom: '0.25rem',
  fontSize: '0.85rem', color: '#374151',
};

const sectionStyle: React.CSSProperties = {
  marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid #e5e7eb',
};

export default function GlobalSettingsPage() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [status, setStatus] = useState<'loading' | 'idle' | 'saving' | 'saved' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetch('/api/cms/global-settings')
      .then(r => r.json())
      .then(data => {
        setForm({
          phoneDisplay: data.phoneDisplay ?? '',
          phoneHref: data.phoneHref ?? '',
          headerPhone: data.headerPhone ?? '',
          ctaPrimaryLabel: data.ctaPrimaryLabel ?? '',
          taglineTurning: data.taglineTurning ?? '',
          hoursLabel: data.hoursLabel ?? '',
          ndcPrice: data.ndcPrice ?? '',
          serviceDesc: { ...EMPTY_SERVICE_DESC, ...(data.serviceDesc ?? {}) },
        });
        setStatus('idle');
      })
      .catch(() => {
        setStatus('error');
        setErrorMsg('Failed to load settings. Ensure the migration script has been run.');
      });
  }, []);

  function set(key: keyof Omit<FormState, 'serviceDesc'>, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function setServiceDesc(key: keyof ServiceDescState, value: string) {
    setForm(f => ({ ...f, serviceDesc: { ...f.serviceDesc, [key]: value } }));
  }

  async function handleSave() {
    setStatus('saving');
    setErrorMsg('');
    try {
      const res = await fetch('/api/cms/global-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
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

  if (status === 'loading') return <div style={{ padding: '2rem' }}>Loading…</div>;

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontFamily: 'Industry, sans-serif', fontWeight: 700, fontSize: '1.5rem', color: '#0A1B2E', marginBottom: '0.25rem' }}>
        Global Settings
      </h1>
      <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '2rem' }}>
        Site-wide values. Changes save to the database and are read live by the
        front-end (navbar, page heroes, and CTAs). Allow a moment for cached pages to refresh.
      </p>

      {status === 'error' && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '6px', padding: '0.85rem 1rem', marginBottom: '1.5rem', color: '#dc2626', fontSize: '0.875rem' }}>
          {errorMsg}
        </div>
      )}

      {/* Contact */}
      <div style={sectionStyle}>
        <h2 style={{ fontWeight: 700, fontSize: '1rem', color: '#0A1B2E', marginBottom: '1rem' }}>Contact</h2>
        <label style={labelStyle}>Phone Number (displayed to users)</label>
        <input style={s} value={form.phoneDisplay} onChange={e => set('phoneDisplay', e.target.value)} placeholder="773-724-9272" />
        <label style={labelStyle}>Phone Link (e.g. tel:773-724-9272)</label>
        <input style={s} value={form.phoneHref} onChange={e => set('phoneHref', e.target.value)} placeholder="tel:773-724-9272" />
        <label style={labelStyle}>Header Phone (call-tracking number — navbar only)</label>
        <input style={s} value={form.headerPhone} onChange={e => set('headerPhone', e.target.value)} placeholder="773-900-8690" />
      </div>

      {/* CTAs */}
      <div style={sectionStyle}>
        <h2 style={{ fontWeight: 700, fontSize: '1rem', color: '#0A1B2E', marginBottom: '1rem' }}>CTAs</h2>
        <label style={labelStyle}>Primary CTA Button Label</label>
        <input style={s} value={form.ctaPrimaryLabel} onChange={e => set('ctaPrimaryLabel', e.target.value)} placeholder="MAKE A GOOD CALL" />
      </div>

      {/* Taglines */}
      <div style={sectionStyle}>
        <h2 style={{ fontWeight: 700, fontSize: '1rem', color: '#0A1B2E', marginBottom: '1rem' }}>Taglines</h2>
        <label style={labelStyle}>Turning Bad Calls Tagline</label>
        <input style={s} value={form.taglineTurning} onChange={e => set('taglineTurning', e.target.value)} placeholder="J Blanton Plumbing - Turning Bad Calls to Good Calls" />
      </div>

      {/* Hours */}
      <div style={sectionStyle}>
        <h2 style={{ fontWeight: 700, fontSize: '1rem', color: '#0A1B2E', marginBottom: '1rem' }}>Hours</h2>
        <label style={labelStyle}>Hours Label (e.g. &quot;24 hours&quot;)</label>
        <input style={s} value={form.hoursLabel} onChange={e => set('hoursLabel', e.target.value)} placeholder="24 hours" />
      </div>

      {/* No Drip Club */}
      <div style={sectionStyle}>
        <h2 style={{ fontWeight: 700, fontSize: '1rem', color: '#0A1B2E', marginBottom: '1rem' }}>No Drip Club</h2>
        <label style={labelStyle}>Membership Price Line (shown on the No Drip Club page)</label>
        <input style={s} value={form.ndcPrice} onChange={e => set('ndcPrice', e.target.value)} placeholder="All for just $29.97/month**" />
      </div>

      {/* Service Category Descriptions (Brief 67) */}
      <div style={sectionStyle}>
        <h2 style={{ fontWeight: 700, fontSize: '1rem', color: '#0A1B2E', marginBottom: '0.35rem' }}>Service Category Descriptions</h2>
        <p style={{ color: '#6b7280', fontSize: '0.8rem', marginBottom: '1rem', marginTop: 0 }}>
          Shown under each category card in the Local Office V2 city Services Grid. Keep each under {DESC_MAX} characters.
        </p>
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
              <span style={{ fontSize: '0.75rem', color: over ? '#BC0E0E' : '#9ca3af' }}>
                {value.length}/{DESC_MAX}
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          onClick={handleSave}
          disabled={status === 'saving'}
          style={{ background: '#BC0E0E', color: '#fff', border: 'none', padding: '0.7rem 2rem', borderRadius: '4px', fontWeight: 700, fontSize: '1rem', cursor: status === 'saving' ? 'not-allowed' : 'pointer', opacity: status === 'saving' ? 0.7 : 1 }}
        >
          {status === 'saving' ? 'Saving…' : 'Save'}
        </button>
        {status === 'saved' && <span style={{ color: '#16a34a', fontWeight: 600 }}>Saved.</span>}
      </div>
    </div>
  );
}
