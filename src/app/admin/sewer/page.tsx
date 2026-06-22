'use client';

import { useState, useEffect } from 'react';

interface SubcategoryField {
  label: string;
  href: string;
  description: string;
  sort_order: number;
}

interface FormState {
  hero_heading: string;
  hero_intro: string;
  hero_image: string;
  intro_heading: string;
  intro_body: string;
  f_image: string;
  problems_heading: string;
  problems_items: string;
  subcategories_heading: string;
  preventative_heading: string;
  preventative_body: string;
  final_pitch_tagline: string;
  final_pitch_body: string;
  f3_image: string;
  articles_featured_slugs: string;
  service_area_heading: string;
  service_area_body: string;
  tiktok_headline: string;
  subcategories: SubcategoryField[];
}

const EMPTY: FormState = {
  hero_heading: '',
  hero_intro: '',
  hero_image: '',
  intro_heading: '',
  intro_body: '',
  f_image: '',
  problems_heading: '',
  problems_items: '',
  subcategories_heading: '',
  preventative_heading: '',
  preventative_body: '',
  final_pitch_tagline: '',
  final_pitch_body: '',
  f3_image: '',
  articles_featured_slugs: '',
  service_area_heading: '',
  service_area_body: '',
  tiktok_headline: '',
  subcategories: [],
};

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
    const password = sessionStorage.getItem('cms_auth') ?? '';
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch('/api/cms/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${password}` },
        body: fd,
      });
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

export default function AdminSewerPage() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [status, setStatus] = useState<'idle' | 'loading' | 'saving' | 'saved' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetch('/api/cms/sewer')
      .then(r => r.json())
      .then(data => {
        const { page, subcategories, global: g } = data;
        setForm({
          hero_heading: page.hero_heading,
          hero_intro: page.hero_intro,
          hero_image: page.hero_image ?? '',
          intro_heading: page.intro_heading,
          intro_body: page.intro_body,
          f_image: page.f_image ?? '',
          problems_heading: page.problems_heading,
          problems_items: (page.problems_items as string[]).join('\n'),
          subcategories_heading: page.subcategories_heading,
          preventative_heading: page.preventative_heading,
          preventative_body: page.preventative_body,
          final_pitch_tagline: page.final_pitch_tagline,
          final_pitch_body: page.final_pitch_body,
          f3_image: page.f3_image ?? '',
          articles_featured_slugs: (page.articles_featured_slugs as string[]).join('\n'),
          service_area_heading: g.service_area_heading,
          service_area_body: g.service_area_body,
          tiktok_headline: g.tiktok_headline,
          subcategories: subcategories.map((s: SubcategoryField) => ({ ...s })),
        });
        setStatus('idle');
      })
      .catch(() => {
        setStatus('error');
        setErrorMsg('Failed to load content from database.');
      });
  }, []);

  function set(key: keyof Omit<FormState, 'subcategories'>, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function setSub(i: number, key: keyof Omit<SubcategoryField, 'sort_order'>, value: string) {
    setForm(f => {
      const subs = f.subcategories.map((s, idx) => idx === i ? { ...s, [key]: value } : s);
      return { ...f, subcategories: subs };
    });
  }

  function addSub() {
    setForm(f => ({
      ...f,
      subcategories: [...f.subcategories, { label: '', href: '', description: '', sort_order: f.subcategories.length }],
    }));
  }

  function removeSub(i: number) {
    setForm(f => ({
      ...f,
      subcategories: f.subcategories.filter((_, idx) => idx !== i),
    }));
  }

  async function handleSave() {
    setStatus('saving');
    const password = sessionStorage.getItem('cms_auth') ?? '';
    try {
      const res = await fetch('/api/cms/sewer', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${password}`,
        },
        body: JSON.stringify({
          hero_heading: form.hero_heading,
          hero_intro: form.hero_intro,
          hero_image: form.hero_image,
          intro_heading: form.intro_heading,
          intro_body: form.intro_body,
          f_image: form.f_image,
          problems_heading: form.problems_heading,
          problems_items: form.problems_items.split('\n').map(s => s.trim()).filter(Boolean),
          subcategories_heading: form.subcategories_heading,
          preventative_heading: form.preventative_heading,
          preventative_body: form.preventative_body,
          final_pitch_tagline: form.final_pitch_tagline,
          final_pitch_body: form.final_pitch_body,
          f3_image: form.f3_image,
          articles_featured_slugs: form.articles_featured_slugs.split('\n').map(s => s.trim()).filter(Boolean),
          service_area_heading: form.service_area_heading,
          service_area_body: form.service_area_body,
          tiktok_headline: form.tiktok_headline,
          subcategories: form.subcategories,
        }),
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
  const labelStyle: React.CSSProperties = { display: 'block', fontWeight: 600, marginBottom: '0.25rem', fontSize: '0.85rem', color: '#374151' };
  const section: React.CSSProperties = { marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid #e5e7eb' };

  if (status === 'loading') return <div style={{ padding: '2rem' }}>Loading...</div>;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontWeight: 700, fontSize: '1.5rem', marginBottom: '0.25rem' }}>Sewer Page — CMS Editor</h1>
      <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '2rem' }}>Edit text and images. Subcategory card images and article images are managed automatically.</p>

      <div style={section}>
        <h2 style={{ fontWeight: 700, marginBottom: '1rem' }}>Hero</h2>
        <label style={labelStyle}>Heading</label>
        <input style={s} value={form.hero_heading} onChange={e => set('hero_heading', e.target.value)} />
        <label style={labelStyle}>Intro</label>
        <textarea style={{ ...s, minHeight: '80px' }} value={form.hero_intro} onChange={e => set('hero_intro', e.target.value)} />
        <ImageField label="Background Image" value={form.hero_image} onChange={v => set('hero_image', v)} labelStyle={labelStyle} />
      </div>

      <div style={section}>
        <h2 style={{ fontWeight: 700, marginBottom: '1rem' }}>Intro Section</h2>
        <label style={labelStyle}>Heading</label>
        <input style={s} value={form.intro_heading} onChange={e => set('intro_heading', e.target.value)} />
        <label style={labelStyle}>Body</label>
        <textarea style={{ ...s, minHeight: '100px' }} value={form.intro_body} onChange={e => set('intro_body', e.target.value)} />
        <ImageField label="Section Image" value={form.f_image} onChange={v => set('f_image', v)} labelStyle={labelStyle} />
      </div>

      <div style={section}>
        <h2 style={{ fontWeight: 700, marginBottom: '1rem' }}>Problems Panel</h2>
        <label style={labelStyle}>Heading</label>
        <input style={s} value={form.problems_heading} onChange={e => set('problems_heading', e.target.value)} />
        <label style={labelStyle}>Items (one per line)</label>
        <textarea style={{ ...s, minHeight: '120px' }} value={form.problems_items} onChange={e => set('problems_items', e.target.value)} />
      </div>

      <div style={section}>
        <h2 style={{ fontWeight: 700, marginBottom: '1rem' }}>Subcategories</h2>
        <label style={labelStyle}>Section Heading</label>
        <input style={s} value={form.subcategories_heading} onChange={e => set('subcategories_heading', e.target.value)} />
        {form.subcategories.map((sub, i) => (
          <div key={i} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '1rem', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <p style={{ fontWeight: 700, fontSize: '0.85rem', color: '#374151', margin: 0 }}>Card {i + 1}</p>
              <button
                onClick={() => removeSub(i)}
                style={{ background: 'none', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: '4px', padding: '0.2rem 0.6rem', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}
              >
                Remove
              </button>
            </div>
            <label style={labelStyle}>Label</label>
            <input style={s} value={sub.label} onChange={e => setSub(i, 'label', e.target.value)} />
            <label style={labelStyle}>Href</label>
            <input style={s} value={sub.href} onChange={e => setSub(i, 'href', e.target.value)} />
            <label style={labelStyle}>Description</label>
            <textarea style={{ ...s, minHeight: '70px' }} value={sub.description} onChange={e => setSub(i, 'description', e.target.value)} />
          </div>
        ))}
        <button
          onClick={addSub}
          style={{ background: '#fff', border: '1px dashed #9ca3af', color: '#374151', borderRadius: '6px', padding: '0.6rem 1.25rem', fontSize: '0.875rem', cursor: 'pointer', fontWeight: 600, width: '100%' }}
        >
          + Add card
        </button>
      </div>

      <div style={section}>
        <h2 style={{ fontWeight: 700, marginBottom: '1rem' }}>Service Area (Global)</h2>
        <label style={labelStyle}>Heading</label>
        <input style={s} value={form.service_area_heading} onChange={e => set('service_area_heading', e.target.value)} />
        <label style={labelStyle}>Body</label>
        <textarea style={{ ...s, minHeight: '70px' }} value={form.service_area_body} onChange={e => set('service_area_body', e.target.value)} />
      </div>

      <div style={section}>
        <h2 style={{ fontWeight: 700, marginBottom: '1rem' }}>TikTok Feed (Global)</h2>
        <label style={labelStyle}>Headline</label>
        <input style={s} value={form.tiktok_headline} onChange={e => set('tiktok_headline', e.target.value)} />
      </div>

      <div style={section}>
        <h2 style={{ fontWeight: 700, marginBottom: '1rem' }}>Preventative Section</h2>
        <label style={labelStyle}>Heading</label>
        <input style={s} value={form.preventative_heading} onChange={e => set('preventative_heading', e.target.value)} />
        <label style={labelStyle}>Body</label>
        <textarea style={{ ...s, minHeight: '80px' }} value={form.preventative_body} onChange={e => set('preventative_body', e.target.value)} />
      </div>

      <div style={section}>
        <h2 style={{ fontWeight: 700, marginBottom: '1rem' }}>Final Pitch</h2>
        <label style={labelStyle}>Tagline</label>
        <input style={s} value={form.final_pitch_tagline} onChange={e => set('final_pitch_tagline', e.target.value)} />
        <label style={labelStyle}>Body</label>
        <textarea style={{ ...s, minHeight: '80px' }} value={form.final_pitch_body} onChange={e => set('final_pitch_body', e.target.value)} />
        <ImageField label="Section Image" value={form.f3_image} onChange={v => set('f3_image', v)} labelStyle={labelStyle} />
      </div>

      <div style={section}>
        <h2 style={{ fontWeight: 700, marginBottom: '1rem' }}>Featured Article Slugs</h2>
        <label style={labelStyle}>Slugs (one per line)</label>
        <textarea style={{ ...s, minHeight: '80px' }} value={form.articles_featured_slugs} onChange={e => set('articles_featured_slugs', e.target.value)} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
  );
}
