'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import MetaSection from '@/components/admin/MetaSection';

interface FaqField {
  question: string;
  answer: string;
}

interface ServiceCategory {
  slug: string;
  title: string;
}

interface FormState {
  serviceIntroHeading: string;
  serviceIntroText: string;
  serviceIntroImage: string;
  secondaryHeading: string;
  secondaryText: string;
  secondaryImage: string;
  faqs: FaqField[];
  metaTitle: string;
  metaDescription: string;
  parentSlug: string | null;
}

const EMPTY: FormState = {
  serviceIntroHeading: '',
  serviceIntroText: '',
  serviceIntroImage: '',
  secondaryHeading: '',
  secondaryText: '',
  secondaryImage: '',
  faqs: [],
  metaTitle: '',
  metaDescription: '',
  parentSlug: null,
};

function slugToTitle(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function ImageField({
  label: labelText,
  value,
  onChange,
  labelStyle,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  labelStyle: React.CSSProperties;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError('');
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch('/api/cms/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Upload failed');
      onChange(json.url);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <label style={labelStyle}>{labelText}</label>
      {value && (
        <img
          src={value}
          alt="current"
          style={{ display: 'block', maxHeight: '140px', maxWidth: '100%', objectFit: 'cover', borderRadius: '4px', border: '1px solid #e5e7eb', marginBottom: '0.5rem' }}
        />
      )}
      <label style={{ display: 'inline-block', cursor: uploading ? 'not-allowed' : 'pointer' }}>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: 'none' }}
          onChange={handleFile}
          disabled={uploading}
        />
        <span style={{ display: 'inline-block', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '4px', padding: '0.35rem 0.85rem', fontSize: '0.85rem', fontWeight: 600, color: '#374151', opacity: uploading ? 0.6 : 1 }}>
          {uploading ? 'Uploading…' : value ? 'Replace image' : 'Upload image'}
        </span>
      </label>
      <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: '#9ca3af' }}>JPEG, PNG or WebP · max 10 MB</span>
      {uploadError && <p style={{ color: '#dc2626', fontSize: '0.85rem', marginTop: '0.25rem' }}>{uploadError}</p>}
    </div>
  );
}

export default function AdminCityServicePage() {
  const params = useParams();
  const city = params?.city as string;
  const service = params?.service as string;

  const [form, setForm] = useState<FormState>(EMPTY);
  const [status, setStatus] = useState<'idle' | 'loading' | 'not-found' | 'saving' | 'saved' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);

  const cityTitle = city ? slugToTitle(city) : '';
  const serviceTitle = service ? slugToTitle(service) : '';
  const pageTitle = `${cityTitle} — ${serviceTitle} Admin`;

  useEffect(() => {
    if (!city || !service) return;
    setStatus('loading');
    Promise.all([
      fetch(`/api/cms/city-service/${city}/${service}`),
      fetch('/api/cms/service-categories'),
    ])
      .then(async ([pageRes, catsRes]) => {
        if (pageRes.status === 404) { setStatus('not-found'); return; }
        if (!pageRes.ok) throw new Error('Failed to load');
        const data = await pageRes.json();
        const cats = catsRes.ok ? await catsRes.json() : [];
        setServiceCategories(Array.isArray(cats) ? cats : []);
        const introParagraphs: string[] = data.serviceIntroParagraphs ?? [];
        const secondaryParagraphs: string[] = data.secondaryParagraphs ?? [];
        setForm({
          serviceIntroHeading: data.serviceIntroHeading ?? '',
          serviceIntroText: introParagraphs.join('\n\n'),
          serviceIntroImage: data.serviceIntroImage ?? '',
          secondaryHeading: data.secondaryHeading ?? '',
          secondaryText: secondaryParagraphs.join('\n\n'),
          secondaryImage: data.secondaryImage ?? '',
          faqs: data.faqs ?? [],
          metaTitle: data.metaTitle ?? '',
          metaDescription: data.metaDescription ?? '',
          parentSlug: data.parentSlug ?? null,
        });
        setStatus('idle');
      })
      .catch((err) => {
        // Brief 64 follow-up: surface the underlying load error so future failures
        // (e.g. the two-dev-server / stale-.next case in CLAUDE.md gotcha #4) are
        // diagnosable instead of silently swallowed.
        console.error(`[admin/city-service/${city}/${service}] load failed`, err);
        setStatus('error');
        setErrorMsg('Failed to load content from database.');
      });
  }, [city, service]);

  function setFaq(i: number, key: keyof FaqField, value: string) {
    setForm(f => {
      const faqs = f.faqs.map((faq, idx) => idx === i ? { ...faq, [key]: value } : faq);
      return { ...f, faqs };
    });
  }

  function addFaq() {
    setForm(f => ({ ...f, faqs: [...f.faqs, { question: '', answer: '' }] }));
  }

  function removeFaq(i: number) {
    setForm(f => ({ ...f, faqs: f.faqs.filter((_, idx) => idx !== i) }));
  }

  function buildPayload() {
    return {
      serviceIntroHeading: form.serviceIntroHeading,
      serviceIntroParagraphs: form.serviceIntroText.split('\n\n').map(s => s.trim()).filter(Boolean),
      serviceIntroImage: form.serviceIntroImage,
      secondaryHeading: form.secondaryHeading,
      secondaryParagraphs: form.secondaryText.split('\n\n').map(s => s.trim()).filter(Boolean),
      secondaryImage: form.secondaryImage,
      faqs: form.faqs,
      metaTitle: form.metaTitle || null,
      metaDescription: form.metaDescription || null,
      parentSlug: form.parentSlug || null,
    };
  }

  async function handleSave() {
    setStatus('saving');
    setErrorMsg('');
    try {
      const res = await fetch(`/api/cms/city-service/${city}/${service}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
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

  const s: React.CSSProperties = {
    display: 'block', width: '100%', padding: '0.4rem 0.5rem',
    border: '1px solid #d1d5db', borderRadius: '4px', marginBottom: '1rem',
    fontFamily: 'inherit', fontSize: '0.9rem', boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontWeight: 600, marginBottom: '0.25rem',
    fontSize: '0.85rem', color: '#374151',
  };
  const section: React.CSSProperties = {
    marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid #e5e7eb',
  };

  if (status === 'loading') return <div style={{ padding: '2rem' }}>Loading...</div>;

  if (status === 'not-found') {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
        <h1 style={{ fontWeight: 700, fontSize: '1.5rem', marginBottom: '1rem' }}>{pageTitle}</h1>
        <p style={{ color: '#6b7280' }}>
          No CMS content found for {city}/{service}. This page uses its static content file.
        </p>
      </div>
    );
  }

  const parentCategory = serviceCategories.find(c => c.slug === form.parentSlug);

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>
      <AdminPageHeader
        title={pageTitle}
        pageType="city-service"
        pageSlug={`${city}/${service}`}
        getContent={buildPayload}
        previewBaseUrl={`/${city}/${service}`}
      />

      {/* ── Parent page indicator bar ─────────────────────────────────────── */}
      <div style={{
        background: '#F9F3EC',
        borderBottom: '1px solid rgba(10,27,46,0.1)',
        padding: '0.45rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        fontFamily: 'Nunito, sans-serif',
        fontSize: '12px',
      }}>
        <span style={{ color: 'rgba(10,27,46,0.55)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Parent page:
        </span>
        {parentCategory ? (
          <a
            href={`/admin/${parentCategory.slug}`}
            style={{ color: '#1560E6', fontWeight: 600, textDecoration: 'none' }}
          >
            {parentCategory.title}
          </a>
        ) : (
          <span style={{ color: 'rgba(10,27,46,0.4)', fontStyle: 'italic' }}>None assigned</span>
        )}
      </div>

    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '2rem' }}>
        Edit city-service page content. Separate paragraphs with a blank line. Changes are saved to the database and applied immediately.
      </p>

      {/* Service Intro */}
      <div style={section}>
        <h2 style={{ fontWeight: 700, marginBottom: '1rem' }}>Service Intro</h2>
        <label style={labelStyle}>Intro Heading</label>
        <input style={s} value={form.serviceIntroHeading} onChange={e => setForm(f => ({ ...f, serviceIntroHeading: e.target.value }))} />
        <label style={labelStyle}>Introduction</label>
        <p style={{ fontSize: '0.78rem', color: '#9ca3af', margin: '-0.75rem 0 0.5rem' }}>Separate paragraphs with a blank line (double Enter).</p>
        <textarea
          rows={10}
          style={{ ...s, minHeight: '200px' }}
          value={form.serviceIntroText}
          onChange={e => setForm(f => ({ ...f, serviceIntroText: e.target.value }))}
        />
        <ImageField label="Intro Image" value={form.serviceIntroImage} onChange={v => setForm(f => ({ ...f, serviceIntroImage: v }))} labelStyle={labelStyle} />
      </div>

      {/* Secondary Section */}
      <div style={section}>
        <h2 style={{ fontWeight: 700, marginBottom: '1rem' }}>Secondary Section</h2>
        <label style={labelStyle}>Secondary Heading</label>
        <input style={s} value={form.secondaryHeading} onChange={e => setForm(f => ({ ...f, secondaryHeading: e.target.value }))} />
        <label style={labelStyle}>Body</label>
        <p style={{ fontSize: '0.78rem', color: '#9ca3af', margin: '-0.75rem 0 0.5rem' }}>Separate paragraphs with a blank line (double Enter).</p>
        <textarea
          rows={6}
          style={{ ...s, minHeight: '140px' }}
          value={form.secondaryText}
          onChange={e => setForm(f => ({ ...f, secondaryText: e.target.value }))}
        />
        <ImageField label="Secondary Image" value={form.secondaryImage} onChange={v => setForm(f => ({ ...f, secondaryImage: v }))} labelStyle={labelStyle} />
      </div>

      {/* FAQs */}
      <div style={section}>
        <h2 style={{ fontWeight: 700, marginBottom: '1rem' }}>FAQs</h2>
        {form.faqs.map((faq, i) => (
          <div key={i} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '1rem', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <p style={{ fontWeight: 700, fontSize: '0.8rem', color: '#6b7280', margin: 0 }}>FAQ {i + 1}</p>
              <button
                onClick={() => removeFaq(i)}
                style={{ background: 'none', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: '4px', padding: '0.2rem 0.6rem', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}
              >
                Remove
              </button>
            </div>
            <label style={labelStyle}>Question</label>
            <input style={s} value={faq.question} onChange={e => setFaq(i, 'question', e.target.value)} />
            <label style={labelStyle}>Answer</label>
            <textarea rows={3} style={{ ...s, minHeight: '70px' }} value={faq.answer} onChange={e => setFaq(i, 'answer', e.target.value)} />
          </div>
        ))}
        <button
          onClick={addFaq}
          style={{ background: '#fff', border: '1px dashed #9ca3af', color: '#374151', borderRadius: '6px', padding: '0.6rem 1.25rem', fontSize: '0.875rem', cursor: 'pointer', fontWeight: 600, width: '100%' }}
        >
          + Add FAQ
        </button>
      </div>

      {/* ── Settings ── */}
      <div style={{ ...section }}>
        <h2 style={{ fontWeight: 700, marginBottom: '1rem' }}>Settings</h2>
        <label style={labelStyle}>Parent Page</label>
        <p style={{ fontSize: '0.78rem', color: '#9ca3af', margin: '-0.5rem 0 0.5rem' }}>
          The service category this page belongs to. Used for breadcrumbs and internal linking.
        </p>
        <select
          value={form.parentSlug ?? ''}
          onChange={e => setForm(f => ({ ...f, parentSlug: e.target.value || null }))}
          style={{
            ...s,
            appearance: 'none',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%235a6a7a'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 10px center',
            paddingRight: '2rem',
            cursor: 'pointer',
            marginBottom: 0,
          }}
        >
          <option value="">None</option>
          {serviceCategories.map(cat => (
            <option key={cat.slug} value={cat.slug}>{cat.title}</option>
          ))}
        </select>
      </div>

      <MetaSection
        metaTitle={form.metaTitle}
        metaDescription={form.metaDescription}
        onMetaTitleChange={v => setForm(f => ({ ...f, metaTitle: v }))}
        onMetaDescriptionChange={v => setForm(f => ({ ...f, metaDescription: v }))}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
        <button
          onClick={handleSave}
          disabled={status === 'saving'}
          style={{ background: '#BC0E0E', color: '#fff', border: 'none', padding: '0.7rem 2rem', borderRadius: '4px', fontWeight: 700, fontSize: '1rem', cursor: status === 'saving' ? 'not-allowed' : 'pointer', opacity: status === 'saving' ? 0.7 : 1 }}
        >
          {status === 'saving' ? 'Saving...' : 'Save'}
        </button>
        {status === 'saved' && <span style={{ color: '#16a34a', fontWeight: 600 }}>Saved.</span>}
        {status === 'error' && <span style={{ color: '#dc2626' }}>{errorMsg}</span>}
      </div>

    </div>
    </div>
  );
}
