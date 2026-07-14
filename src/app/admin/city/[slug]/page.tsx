'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import MetaSection from '@/components/admin/MetaSection';

interface FaqField {
  question: string;
  answer: string;
}

// Brief 67 — V2 repeater item shapes.
interface MostRequestedField { title: string; body: string }
interface WhyPointField { heading: string; body: string }
interface ReviewField { name: string; text: string; gbp_url: string }

interface FormState {
  templateType: string;
  heroImage: string;
  heroHeadingLine1: string;
  heroHeadingLine2: string;
  heroCallout: string;
  heroDescription: string;
  contentHeading: string;
  contentBody: string;
  f2Heading: string;
  f2Body: string;
  faqs: FaqField[];
  metaTitle: string;
  metaDescription: string;
  // ── Brief 67 — Local Office V2 fields ──
  trustBarStars: string;
  trustBarReviewCount: string;
  servicesIntro: string;
  mostRequestedServices: MostRequestedField[];
  midCtaText: string;
  whyPoints: WhyPointField[];
  videoHeading: string;
  videoIntro: string;
  videoScript: string;
  reviews: ReviewField[];
  ndcIntro: string;
  finalCtaHeading: string;
  finalCtaBody: string;
}

const EMPTY: FormState = {
  templateType: 'coverage-area',
  heroImage: '',
  heroHeadingLine1: '',
  heroHeadingLine2: '',
  heroCallout: '',
  heroDescription: '',
  contentHeading: '',
  contentBody: '',
  f2Heading: '',
  f2Body: '',
  faqs: [],
  metaTitle: '',
  metaDescription: '',
  trustBarStars: '',
  trustBarReviewCount: '',
  servicesIntro: '',
  mostRequestedServices: [],
  midCtaText: '',
  whyPoints: [],
  videoHeading: '',
  videoIntro: '',
  videoScript: '',
  reviews: [],
  ndcIntro: '',
  finalCtaHeading: '',
  finalCtaBody: '',
};

/** Form keys that hold a plain string value (excludes arrays + templateType). */
type StringFieldKey = keyof Omit<
  FormState,
  'faqs' | 'templateType' | 'mostRequestedServices' | 'whyPoints' | 'reviews'
>;

// ── Shared styles ────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
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

const h2Style: React.CSSProperties = {
  fontWeight: 700, fontSize: '1.1rem', marginBottom: '1rem', color: '#111827',
};

// ── Missing field indicator ──────────────────────────────────────────────────

function MissingIndicator() {
  return (
    <span style={{ color: '#BC0E0E', fontWeight: 600, fontSize: '0.8rem', marginLeft: '0.4rem' }}>
      ⚠ Required — not yet filled in
    </span>
  );
}

function FieldLabel({
  label: text,
  fieldKey,
  missing,
  note,
}: {
  label: string;
  fieldKey: string;
  missing: string[];
  note?: string;
}) {
  const isMissing = missing.includes(fieldKey);
  return (
    <label style={labelStyle}>
      {text}
      {note && <span style={{ fontWeight: 400, color: '#9ca3af' }}> {note}</span>}
      {isMissing && <MissingIndicator />}
    </label>
  );
}

// ── Image upload field ───────────────────────────────────────────────────────

function ImageField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
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
      <label style={labelStyle}>Hero Image</label>
      {value && (
        <img
          src={value}
          alt="current"
          style={{ display: 'block', maxHeight: '140px', maxWidth: '100%', objectFit: 'cover', borderRadius: '4px', border: '1px solid #e5e7eb', marginBottom: '0.5rem' }}
        />
      )}
      <input
        style={{ ...inputStyle, marginBottom: '0.25rem' }}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="https://... or leave empty to use default image"
      />
      <label style={{ display: 'inline-block', cursor: uploading ? 'not-allowed' : 'pointer' }}>
        <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleFile} disabled={uploading} />
        <span style={{ display: 'inline-block', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '4px', padding: '0.35rem 0.85rem', fontSize: '0.85rem', fontWeight: 600, color: '#374151', opacity: uploading ? 0.6 : 1 }}>
          {uploading ? 'Uploading…' : value ? 'Replace image' : 'Upload image'}
        </span>
      </label>
      <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: '#9ca3af' }}>JPEG, PNG or WebP · max 10 MB</span>
      {uploadError && <p style={{ color: '#BC0E0E', fontSize: '0.85rem', marginTop: '0.25rem' }}>{uploadError}</p>}
    </div>
  );
}

// ── Template-specific field groups ───────────────────────────────────────────

function CoverageAreaCityFields({
  form,
  setField,
  missing,
}: {
  form: FormState;
  setField: (k: StringFieldKey, v: string) => void;
  missing: string[];
}) {
  return (
    <>
      <div style={sectionStyle}>
        <h2 style={h2Style}>Hero</h2>
        <ImageField value={form.heroImage} onChange={v => setField('heroImage', v)} />
        <FieldLabel label="Hero Heading — Line 1" fieldKey="hero_heading_line1" missing={missing} />
        <input style={inputStyle} value={form.heroHeadingLine1} onChange={e => setField('heroHeadingLine1', e.target.value)} />
        <FieldLabel label="Hero Callout" fieldKey="hero_callout" missing={missing} note="(italic text below the heading)" />
        <textarea style={{ ...inputStyle, minHeight: '60px' }} value={form.heroCallout} onChange={e => setField('heroCallout', e.target.value)} />
      </div>

      <div style={sectionStyle}>
        <h2 style={h2Style}>We&rsquo;ve Got You Covered</h2>
        <FieldLabel label="Heading" fieldKey="content_heading" missing={missing} />
        <input style={inputStyle} value={form.contentHeading} onChange={e => setField('contentHeading', e.target.value)} />
        <FieldLabel label="Body" fieldKey="content_body" missing={missing} />
        <textarea style={{ ...inputStyle, minHeight: '120px' }} value={form.contentBody} onChange={e => setField('contentBody', e.target.value)} />
      </div>

      <div style={sectionStyle}>
        <h2 style={h2Style}>Second Content Block</h2>
        <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: '1rem', marginTop: '-0.5rem' }}>
          The &ldquo;manplumber&rdquo; section.
        </p>
        <FieldLabel label="Heading" fieldKey="f2_heading" missing={missing} />
        <input style={inputStyle} value={form.f2Heading} onChange={e => setField('f2Heading', e.target.value)} />
        <FieldLabel label="Body" fieldKey="f2_body" missing={missing} />
        <textarea style={{ ...inputStyle, minHeight: '120px' }} value={form.f2Body} onChange={e => setField('f2Body', e.target.value)} />
      </div>
    </>
  );
}

function LocalOfficeCityFields({
  form,
  setField,
  missing,
}: {
  form: FormState;
  setField: (k: StringFieldKey, v: string) => void;
  missing: string[];
}) {
  return (
    <>
      <div style={sectionStyle}>
        <h2 style={h2Style}>Hero</h2>
        <ImageField value={form.heroImage} onChange={v => setField('heroImage', v)} />
        <FieldLabel label="Hero Heading — Line 1" fieldKey="hero_heading_line1" missing={missing} />
        <input style={inputStyle} value={form.heroHeadingLine1} onChange={e => setField('heroHeadingLine1', e.target.value)} />
        <FieldLabel label="Hero Heading — Line 2" fieldKey="hero_heading_line2" missing={missing} />
        <input style={inputStyle} value={form.heroHeadingLine2} onChange={e => setField('heroHeadingLine2', e.target.value)} />
        <FieldLabel label="Hero Description" fieldKey="hero_description" missing={missing} note="(intro paragraph in the right column)" />
        <textarea style={{ ...inputStyle, minHeight: '80px' }} value={form.heroDescription} onChange={e => setField('heroDescription', e.target.value)} />
      </div>

      <div style={sectionStyle}>
        <h2 style={h2Style}>Why J. Blanton</h2>
        <FieldLabel label="Heading" fieldKey="content_heading" missing={missing} />
        <input style={inputStyle} value={form.contentHeading} onChange={e => setField('contentHeading', e.target.value)} />
        <FieldLabel label="Body" fieldKey="content_body" missing={missing} />
        <textarea style={{ ...inputStyle, minHeight: '120px' }} value={form.contentBody} onChange={e => setField('contentBody', e.target.value)} />
      </div>
    </>
  );
}

// ── Local Office V2 fields (Brief 67) ─────────────────────────────────────────

const repeaterCardStyle: React.CSSProperties = {
  background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px',
  padding: '1rem', marginBottom: '0.75rem',
};

const addBtnStyle: React.CSSProperties = {
  background: '#fff', border: '1px dashed #9ca3af', borderRadius: '4px',
  padding: '0.45rem 1rem', fontWeight: 600, fontSize: '0.85rem',
  color: '#374151', cursor: 'pointer',
};

const removeBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', color: '#BC0E0E', fontWeight: 600,
  fontSize: '0.8rem', cursor: 'pointer', padding: 0,
};

function LocalOfficeCityV2Fields({
  form,
  setField,
  setForm,
}: {
  form: FormState;
  setField: (k: StringFieldKey, v: string) => void;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  // ── Repeater helpers ──────────────────────────────────────────────────────
  function updateMostRequested(i: number, key: keyof MostRequestedField, value: string) {
    setForm(f => ({
      ...f,
      mostRequestedServices: f.mostRequestedServices.map((it, idx) => idx === i ? { ...it, [key]: value } : it),
    }));
  }
  function addMostRequested() {
    setForm(f => ({ ...f, mostRequestedServices: [...f.mostRequestedServices, { title: '', body: '' }] }));
  }
  function removeMostRequested(i: number) {
    setForm(f => ({ ...f, mostRequestedServices: f.mostRequestedServices.filter((_, idx) => idx !== i) }));
  }

  function updateWhyPoint(i: number, key: keyof WhyPointField, value: string) {
    setForm(f => ({
      ...f,
      whyPoints: f.whyPoints.map((it, idx) => idx === i ? { ...it, [key]: value } : it),
    }));
  }
  function addWhyPoint() {
    setForm(f => ({ ...f, whyPoints: [...f.whyPoints, { heading: '', body: '' }] }));
  }
  function removeWhyPoint(i: number) {
    setForm(f => ({ ...f, whyPoints: f.whyPoints.filter((_, idx) => idx !== i) }));
  }

  function updateReview(i: number, key: keyof ReviewField, value: string) {
    setForm(f => ({
      ...f,
      reviews: f.reviews.map((it, idx) => idx === i ? { ...it, [key]: value } : it),
    }));
  }
  function addReview() {
    setForm(f => ({ ...f, reviews: [...f.reviews, { name: '', text: '', gbp_url: '' }] }));
  }
  function removeReview(i: number) {
    setForm(f => ({ ...f, reviews: f.reviews.filter((_, idx) => idx !== i) }));
  }

  return (
    <>
      <div style={sectionStyle}>
        <h2 style={h2Style}>Hero</h2>
        <ImageField value={form.heroImage} onChange={v => setField('heroImage', v)} />
        <label style={labelStyle}>Hero Heading — Line 1</label>
        <input style={inputStyle} value={form.heroHeadingLine1} onChange={e => setField('heroHeadingLine1', e.target.value)} />
        <label style={labelStyle}>Hero Description</label>
        <textarea style={{ ...inputStyle, minHeight: '80px' }} value={form.heroDescription} onChange={e => setField('heroDescription', e.target.value)} />
      </div>

      <div style={sectionStyle}>
        <h2 style={h2Style}>Trust Bar</h2>
        <label style={labelStyle}>Stars <span style={{ fontWeight: 400, color: '#9ca3af' }}>(e.g. &quot;4.8&quot;)</span></label>
        <input style={inputStyle} value={form.trustBarStars} onChange={e => setField('trustBarStars', e.target.value)} />
        <label style={labelStyle}>Review Count <span style={{ fontWeight: 400, color: '#9ca3af' }}>(e.g. &quot;300+&quot;)</span></label>
        <input style={inputStyle} value={form.trustBarReviewCount} onChange={e => setField('trustBarReviewCount', e.target.value)} />
      </div>

      <div style={sectionStyle}>
        <h2 style={h2Style}>Services Grid</h2>
        <label style={labelStyle}>Intro Text</label>
        <textarea style={{ ...inputStyle, minHeight: '80px' }} value={form.servicesIntro} onChange={e => setField('servicesIntro', e.target.value)} />
      </div>

      <div style={sectionStyle}>
        <h2 style={h2Style}>Most Requested Services</h2>
        {form.mostRequestedServices.map((item, i) => (
          <div key={i} style={repeaterCardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontWeight: 700, fontSize: '0.8rem', color: '#374151' }}>Service {i + 1}</span>
              <button type="button" style={removeBtnStyle} onClick={() => removeMostRequested(i)}>Remove</button>
            </div>
            <label style={labelStyle}>Title</label>
            <input style={inputStyle} value={item.title} onChange={e => updateMostRequested(i, 'title', e.target.value)} />
            <label style={labelStyle}>Body</label>
            <textarea style={{ ...inputStyle, minHeight: '90px' }} value={item.body} onChange={e => updateMostRequested(i, 'body', e.target.value)} />
          </div>
        ))}
        <button type="button" style={addBtnStyle} onClick={addMostRequested}>+ Add service</button>
      </div>

      <div style={sectionStyle}>
        <h2 style={h2Style}>Mid CTA</h2>
        <label style={labelStyle}>Text</label>
        <textarea style={{ ...inputStyle, minHeight: '70px' }} value={form.midCtaText} onChange={e => setField('midCtaText', e.target.value)} />
      </div>

      <div style={sectionStyle}>
        <h2 style={h2Style}>Why Section Points</h2>
        {form.whyPoints.map((item, i) => (
          <div key={i} style={repeaterCardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontWeight: 700, fontSize: '0.8rem', color: '#374151' }}>Point {i + 1}</span>
              <button type="button" style={removeBtnStyle} onClick={() => removeWhyPoint(i)}>Remove</button>
            </div>
            <label style={labelStyle}>Heading</label>
            <input style={inputStyle} value={item.heading} onChange={e => updateWhyPoint(i, 'heading', e.target.value)} />
            <label style={labelStyle}>Body</label>
            <textarea style={{ ...inputStyle, minHeight: '90px' }} value={item.body} onChange={e => updateWhyPoint(i, 'body', e.target.value)} />
          </div>
        ))}
        <button type="button" style={addBtnStyle} onClick={addWhyPoint}>+ Add point</button>
      </div>

      <div style={sectionStyle}>
        <h2 style={h2Style}>Video Section <span style={{ fontWeight: 400, fontSize: '0.8rem', color: '#9ca3af' }}>(text only — no embed)</span></h2>
        <label style={labelStyle}>Heading</label>
        <input style={inputStyle} value={form.videoHeading} onChange={e => setField('videoHeading', e.target.value)} />
        <label style={labelStyle}>Intro</label>
        <textarea style={{ ...inputStyle, minHeight: '70px' }} value={form.videoIntro} onChange={e => setField('videoIntro', e.target.value)} />
        <label style={labelStyle}>Script</label>
        <textarea style={{ ...inputStyle, minHeight: '180px' }} value={form.videoScript} onChange={e => setField('videoScript', e.target.value)} />
      </div>

      <div style={sectionStyle}>
        <h2 style={h2Style}>Reviews</h2>
        {form.reviews.map((item, i) => (
          <div key={i} style={repeaterCardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontWeight: 700, fontSize: '0.8rem', color: '#374151' }}>Review {i + 1}</span>
              <button type="button" style={removeBtnStyle} onClick={() => removeReview(i)}>Remove</button>
            </div>
            <label style={labelStyle}>Reviewer Name</label>
            <input style={inputStyle} value={item.name} onChange={e => updateReview(i, 'name', e.target.value)} />
            <label style={labelStyle}>Review Text</label>
            <textarea style={{ ...inputStyle, minHeight: '90px' }} value={item.text} onChange={e => updateReview(i, 'text', e.target.value)} />
            <label style={labelStyle}>Google Business Profile URL</label>
            <input style={inputStyle} value={item.gbp_url} onChange={e => updateReview(i, 'gbp_url', e.target.value)} />
          </div>
        ))}
        {form.reviews.length < 5 && (
          <button type="button" style={addBtnStyle} onClick={addReview}>+ Add review</button>
        )}
      </div>

      <div style={sectionStyle}>
        <h2 style={h2Style}>No Drip Club</h2>
        <label style={labelStyle}>City Intro <span style={{ fontWeight: 400, color: '#9ca3af' }}>(shown above the standard NDC block)</span></label>
        <textarea style={{ ...inputStyle, minHeight: '120px' }} value={form.ndcIntro} onChange={e => setField('ndcIntro', e.target.value)} />
      </div>

      <div style={sectionStyle}>
        <h2 style={h2Style}>Final CTA</h2>
        <label style={labelStyle}>Heading</label>
        <input style={inputStyle} value={form.finalCtaHeading} onChange={e => setField('finalCtaHeading', e.target.value)} />
        <label style={labelStyle}>Body</label>
        <textarea style={{ ...inputStyle, minHeight: '90px' }} value={form.finalCtaBody} onChange={e => setField('finalCtaBody', e.target.value)} />
      </div>
    </>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function AdminCityPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [form, setForm] = useState<FormState>(EMPTY);
  const [status, setStatus] = useState<'loading' | 'not-found' | 'idle' | 'saving' | 'saved' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [switchToast, setSwitchToast] = useState('');
  const [pageMeta, setPageMeta] = useState<{ updatedBy?: string; updatedAt?: string; createdBy?: string; createdAt?: string }>({});
  // Brief 75 (DP-1): the row version this editor loaded, sent back on save so a
  // concurrent direct edit is rejected (409) rather than silently overwritten.
  const [version, setVersion] = useState<number>(0);

  useEffect(() => {
    if (!slug) return;
    setStatus('loading');
    setForm(EMPTY);
    setMissingFields([]);
    fetch(`/api/cms/city/${slug}`)
      .then(async r => {
        if (r.status === 404) { setStatus('not-found'); return; }
        const data = await r.json();
        setForm(formFromApi(data, 'coverage-area'));
        setVersion(typeof data.version === 'number' ? data.version : 0);
        setPageMeta({
          updatedBy: data.updatedBy ?? undefined,
          updatedAt: data.updatedAt ?? undefined,
          createdBy: data.createdBy ?? undefined,
          createdAt: data.createdAt ?? undefined,
        });
        setStatus('idle');
      })
      .catch(() => { setStatus('error'); setErrorMsg('Failed to load content from database.'); });
  }, [slug]);

  function setField(key: StringFieldKey, value: string) {
    setForm(f => {
      const updated = { ...f, [key]: value };
      // Dismiss missing indicator once the field is filled
      const dbKey = camelToDbKey(key);
      if (missingFields.includes(dbKey) && value !== '') {
        setMissingFields(prev => prev.filter(k => k !== dbKey));
      }
      return updated;
    });
  }

  function setFaq(i: number, key: keyof FaqField, value: string) {
    setForm(f => {
      const faqs = f.faqs.map((faq, idx) => idx === i ? { ...faq, [key]: value } : faq);
      return { ...f, faqs };
    });
  }

  function handleSwitched(newTemplate: string, missing: string[]) {
    // Reload the form from the DB to get the post-switch values
    setStatus('loading');
    setMissingFields(missing);
    fetch(`/api/cms/city/${slug}`)
      .then(async r => {
        const data = await r.json();
        setForm(formFromApi(data, newTemplate));
        setVersion(typeof data.version === 'number' ? data.version : 0);
        setStatus('idle');
        if (missing.length > 0) {
          setSwitchToast(`Template switched. ${missing.length} field${missing.length === 1 ? '' : 's'} need your attention — ${missing.length === 1 ? 'it\'s' : 'they\'re'} highlighted below.`);
          setTimeout(() => setSwitchToast(''), 8000);
        }
      })
      .catch(() => { setStatus('error'); setErrorMsg('Failed to reload content after switch.'); });
  }

  async function handleSave() {
    setStatus('saving');
    try {
      const res = await fetch(`/api/cms/city/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...buildCityPayload(form), version }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? 'Unknown error');
      }
      const j = await res.json().catch(() => ({}));
      if (typeof j.version === 'number') setVersion(j.version);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err: unknown) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Save failed.');
    }
  }

  const cityLabel = slug ? slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '';

  if (status === 'loading') return <div style={{ padding: '2rem' }}>Loading...</div>;

  if (status === 'not-found') {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
        <h1 style={{ fontWeight: 700, fontSize: '1.5rem', marginBottom: '1rem' }}>{cityLabel} — CMS Editor</h1>
        <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '6px', padding: '1.25rem', color: '#92400e' }}>
          <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>No CMS content found for &lsquo;{slug}&rsquo;.</p>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>This city uses its static content file. Only Evanston and Elgin have been seeded into the CMS.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>
      <AdminPageHeader
        title={`${cityLabel} — CMS Editor`}
        pageType="city"
        pageSlug={slug}
        getContent={() => buildCityPayload(form)}
        currentTemplate={form.templateType}
        availableTemplates={['coverage-area', 'local-office', 'local-office-v2']}
        onTemplateSwitched={handleSwitched}
        updatedBy={pageMeta.updatedBy}
        updatedAt={pageMeta.updatedAt}
        createdBy={pageMeta.createdBy}
        createdAt={pageMeta.createdAt}
        templateName={TEMPLATE_DISPLAY_NAMES[form.templateType] ?? 'Coverage Area City'}
        previewBaseUrl={`/${slug}`}
      />
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '2rem' }}>
        Edit hero copy, content sections, and FAQs. Office address, services list, video, and partner logos come from the static data file.
      </p>

      {/* Switch toast */}
      {switchToast && (
        <div style={{ background: '#0A1B2E', color: '#F9F3EC', borderRadius: '6px', padding: '0.85rem 1.25rem', marginBottom: '1.5rem', fontSize: '0.9rem', fontWeight: 500 }}>
          {switchToast}
        </div>
      )}

      {/* Template-conditional fields */}
      {form.templateType === 'local-office-v2' ? (
        <LocalOfficeCityV2Fields form={form} setField={setField} setForm={setForm} />
      ) : form.templateType === 'local-office' ? (
        <LocalOfficeCityFields form={form} setField={setField} missing={missingFields} />
      ) : (
        <CoverageAreaCityFields form={form} setField={setField} missing={missingFields} />
      )}

      {/* FAQs (shared by both templates) */}
      <div style={sectionStyle}>
        <h2 style={h2Style}>FAQs</h2>
        {form.faqs.map((faq, i) => (
          <div key={i} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '1rem', marginBottom: '0.75rem' }}>
            <p style={{ fontWeight: 700, fontSize: '0.85rem', color: '#374151', margin: '0 0 0.75rem' }}>FAQ {i + 1}</p>
            <label style={labelStyle}>Question</label>
            <textarea style={{ ...inputStyle, minHeight: '60px' }} value={faq.question} onChange={e => setFaq(i, 'question', e.target.value)} />
            <label style={labelStyle}>Answer</label>
            <textarea style={{ ...inputStyle, minHeight: '80px' }} value={faq.answer} onChange={e => setFaq(i, 'answer', e.target.value)} />
          </div>
        ))}
        {form.faqs.length === 0 && <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>No FAQs loaded.</p>}
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
        {status === 'error' && <span style={{ color: '#BC0E0E' }}>{errorMsg}</span>}
      </div>

    </div>
    </div>
  );
}

// Display label per template type (Brief 67 adds Local Office V2).
const TEMPLATE_DISPLAY_NAMES: Record<string, string> = {
  'coverage-area': 'Coverage Area City',
  'local-office': 'Local Office City',
  'local-office-v2': 'Local Office V2',
};

// Map an API/DB response into the editor FormState (Brief 67 V2 fields included).
function formFromApi(data: Record<string, unknown>, fallbackTemplate: string): FormState {
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
  return {
    templateType: str(data.templateType) || fallbackTemplate,
    heroImage: str(data.heroImage),
    heroHeadingLine1: str(data.heroHeadingLine1),
    heroHeadingLine2: str(data.heroHeadingLine2),
    heroCallout: str(data.heroCallout),
    heroDescription: str(data.heroDescription),
    contentHeading: str(data.contentHeading),
    contentBody: str(data.contentBody),
    f2Heading: str(data.f2Heading),
    f2Body: str(data.f2Body),
    faqs: arr<FaqField>(data.faqs),
    metaTitle: str(data.metaTitle),
    metaDescription: str(data.metaDescription),
    trustBarStars: str(data.trustBarStars),
    trustBarReviewCount: str(data.trustBarReviewCount),
    servicesIntro: str(data.servicesIntro),
    mostRequestedServices: arr<MostRequestedField>(data.mostRequestedServices),
    midCtaText: str(data.midCtaText),
    whyPoints: arr<WhyPointField>(data.whyPoints),
    videoHeading: str(data.videoHeading),
    videoIntro: str(data.videoIntro),
    videoScript: str(data.videoScript),
    reviews: arr<ReviewField>(data.reviews),
    ndcIntro: str(data.ndcIntro),
    finalCtaHeading: str(data.finalCtaHeading),
    finalCtaBody: str(data.finalCtaBody),
  };
}

// Build the save/draft payload. `templateType` rides along so drafts record the
// template they were authored for (Brief 67 Track A); the city update ignores it.
function buildCityPayload(form: FormState) {
  return {
    templateType: form.templateType,
    heroImage: form.heroImage,
    heroHeadingLine1: form.heroHeadingLine1,
    heroHeadingLine2: form.heroHeadingLine2 || null,
    heroCallout: form.heroCallout,
    heroDescription: form.heroDescription,
    contentHeading: form.contentHeading,
    contentBody: form.contentBody,
    f2Heading: form.f2Heading,
    f2Body: form.f2Body,
    faqs: form.faqs,
    metaTitle: form.metaTitle || null,
    metaDescription: form.metaDescription || null,
    trustBarStars: form.trustBarStars,
    trustBarReviewCount: form.trustBarReviewCount,
    servicesIntro: form.servicesIntro,
    mostRequestedServices: form.mostRequestedServices,
    midCtaText: form.midCtaText,
    whyPoints: form.whyPoints,
    videoHeading: form.videoHeading,
    videoIntro: form.videoIntro,
    videoScript: form.videoScript,
    reviews: form.reviews,
    ndcIntro: form.ndcIntro,
    finalCtaHeading: form.finalCtaHeading,
    finalCtaBody: form.finalCtaBody,
  };
}

// Convert camelCase form key to DB column name for missing-field comparison
function camelToDbKey(key: string): string {
  const MAP: Record<string, string> = {
    heroImage: 'hero_image',
    heroHeadingLine1: 'hero_heading_line1',
    heroHeadingLine2: 'hero_heading_line2',
    heroCallout: 'hero_callout',
    heroDescription: 'hero_description',
    contentHeading: 'content_heading',
    contentBody: 'content_body',
    f2Heading: 'f2_heading',
    f2Body: 'f2_body',
  };
  return MAP[key] ?? key;
}
