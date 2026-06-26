'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import MetaSection from '@/components/admin/MetaSection';

interface ArticleData {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  image: string;
  status: string;
  metaTitle: string;
  metaDescription: string;
}

const EMPTY: ArticleData = {
  slug: '',
  title: '',
  excerpt: '',
  body: '',
  image: '',
  status: 'draft',
  metaTitle: '',
  metaDescription: '',
};

const LABEL: React.CSSProperties = {
  display: 'block',
  fontFamily: 'Nunito, sans-serif',
  fontSize: '13px',
  fontWeight: 700,
  color: '#0A1B2E',
  marginBottom: '0.25rem',
};

const INPUT: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '0.5rem',
  border: '1px solid rgba(10,27,46,0.2)',
  borderRadius: '6px',
  fontFamily: 'Nunito, sans-serif',
  fontSize: '0.9rem',
  color: '#0A1B2E',
  boxSizing: 'border-box',
};

export default function ArticleAdminPage() {
  const { slug } = useParams<{ slug: string }>();
  const [form, setForm] = useState<ArticleData>(EMPTY);
  const [loadStatus, setLoadStatus] = useState<'loading' | 'not-found' | 'error' | 'done'>('loading');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveMsg, setSaveMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/cms/article/${slug}`);
      if (res.status === 404) { setLoadStatus('not-found'); return; }
      if (!res.ok) { setLoadStatus('error'); return; }
      const data = await res.json();
      setForm({
        slug: data.slug ?? slug,
        title: data.title ?? '',
        excerpt: data.excerpt ?? '',
        body: typeof data.body === 'string' ? data.body : '',
        image: data.image ?? '',
        status: data.status ?? 'draft',
        metaTitle: data.meta_title ?? '',
        metaDescription: data.meta_description ?? '',
      });
      setLoadStatus('done');
    } catch {
      setLoadStatus('error');
    }
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  function set(field: keyof ArticleData, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
    setSaveStatus('idle');
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaveStatus('saving');
    setSaveMsg('');
    try {
      const res = await fetch(`/api/cms/article/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          excerpt: form.excerpt,
          body: form.body,
          image: form.image,
          status: form.status,
          metaTitle: form.metaTitle || null,
          metaDescription: form.metaDescription || null,
        }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error ?? 'Save failed');
      }
      setSaveStatus('saved');
      setSaveMsg('Saved');
    } catch (err: unknown) {
      setSaveStatus('error');
      setSaveMsg(err instanceof Error ? err.message : 'Save failed');
    }
  }

  const field = (label: string, key: keyof ArticleData, opts?: { placeholder?: string; type?: string }) => (
    <div style={{ marginBottom: '1.25rem' }}>
      <label style={LABEL}>{label}</label>
      <input
        type={opts?.type ?? 'text'}
        value={form[key] as string}
        onChange={e => set(key, e.target.value)}
        placeholder={opts?.placeholder}
        style={INPUT}
      />
    </div>
  );

  if (loadStatus === 'loading') {
    return <main style={{ padding: '2rem', fontFamily: 'Nunito, sans-serif' }}>Loading…</main>;
  }

  if (loadStatus === 'not-found') {
    return (
      <main style={{ padding: '2rem', fontFamily: 'Nunito, sans-serif' }}>
        <p style={{ color: '#BC0E0E' }}>Article &ldquo;{slug}&rdquo; not found in the database. Run the Brief 45 migration first.</p>
      </main>
    );
  }

  if (loadStatus === 'error') {
    return (
      <main style={{ padding: '2rem', fontFamily: 'Nunito, sans-serif' }}>
        <p style={{ color: '#BC0E0E' }}>Failed to load article. The cms_articles table may not exist — run the Brief 45 migration.</p>
      </main>
    );
  }

  return (
    <main style={{ padding: '2rem', maxWidth: '800px', fontFamily: 'system-ui, sans-serif' }}>
      <AdminPageHeader
        title={form.title || slug}
        pageType="article"
        pageSlug={slug}
        templateName="Article"
        getContent={() => ({
          title: form.title,
          excerpt: form.excerpt,
          body: form.body,
          image: form.image,
          status: form.status,
          metaTitle: form.metaTitle,
          metaDescription: form.metaDescription,
        })}
      />

      <form onSubmit={handleSave}>
        {field('Title', 'title', { placeholder: 'Article title' })}
        {field('Excerpt', 'excerpt', { placeholder: 'One or two sentences summarising the article' })}

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={LABEL}>Body</label>
          <p style={{ fontSize: '12px', color: '#5a6a7a', fontFamily: 'Nunito, sans-serif', margin: '0 0 0.35rem' }}>
            Separate paragraphs with a blank line.
          </p>
          <textarea
            value={form.body}
            onChange={e => set('body', e.target.value)}
            rows={16}
            style={{ ...INPUT, resize: 'vertical', lineHeight: 1.6 }}
          />
        </div>

        {field('Hero Image URL', 'image', { placeholder: 'https://…' })}

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={LABEL}>Status</label>
          <select
            value={form.status}
            onChange={e => set('status', e.target.value)}
            style={INPUT}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>

        <MetaSection
          metaTitle={form.metaTitle}
          metaDescription={form.metaDescription}
          onMetaTitleChange={v => set('metaTitle', v)}
          onMetaDescriptionChange={v => set('metaDescription', v)}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>
          <button
            type="submit"
            disabled={saveStatus === 'saving'}
            style={{
              background: '#BC0E0E', border: 'none', borderRadius: '6px',
              padding: '0.6rem 1.5rem', color: '#F9F3EC',
              fontFamily: 'Industry, sans-serif', fontWeight: 600, fontSize: '14px',
              cursor: saveStatus === 'saving' ? 'not-allowed' : 'pointer',
              opacity: saveStatus === 'saving' ? 0.7 : 1,
            }}
          >
            {saveStatus === 'saving' ? 'Saving…' : 'Save Article'}
          </button>
          {saveMsg && (
            <span style={{
              fontFamily: 'Nunito, sans-serif',
              fontSize: '13px',
              color: saveStatus === 'error' ? '#BC0E0E' : '#15803d',
            }}>
              {saveMsg}
            </span>
          )}
        </div>
      </form>
    </main>
  );
}
