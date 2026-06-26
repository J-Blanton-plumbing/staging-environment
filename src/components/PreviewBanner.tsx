'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const BANNER_H = 44; // px — must match globals.css [data-preview] header offset

interface DraftOption {
  id: number;
  label: string;
  published_at: string | null;
}

interface Props {
  label: string;
  creatorName: string;
  /** Admin editor URL — where "Return to edit" lands */
  editorUrl: string;
  /** Live public URL — where "Publish" lands after writing to DB */
  liveUrl: string;
  draftId: number;
  /** Optional — enables the version dropdown when provided */
  pageType?: string;
  pageSlug?: string;
}

export default function PreviewBanner({ label, creatorName, editorUrl, liveUrl, draftId, pageType, pageSlug }: Props) {
  const router = useRouter();
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [drafts, setDrafts] = useState<DraftOption[]>([]);

  useEffect(() => {
    document.documentElement.setAttribute('data-preview', 'true');
    return () => document.documentElement.removeAttribute('data-preview');
  }, []);

  useEffect(() => {
    if (!pageType || !pageSlug) return;
    fetch(`/api/cms/drafts?pageType=${encodeURIComponent(pageType)}&pageSlug=${encodeURIComponent(pageSlug)}`)
      .then(r => r.ok ? r.json() : [])
      .then((rows: DraftOption[]) => setDrafts(rows))
      .catch(() => {});
  }, [pageType, pageSlug]);

  const exitHref = `/api/preview/exit?returnTo=${encodeURIComponent(editorUrl)}`;

  async function handlePublish() {
    setPublishing(true);
    setError('');
    try {
      const res = await fetch(`/api/cms/drafts/${draftId}/publish`, { method: 'POST' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? 'Publish failed');
      }
      router.push(`/api/preview/exit?returnTo=${encodeURIComponent(liveUrl)}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Publish failed');
      setPublishing(false);
    }
  }

  function handleVersionChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    if (id) window.location.href = `/api/preview?draftId=${id}`;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        height: `${BANNER_H}px`,
        background: '#0A1B2E',
        color: '#F9F3EC',
        padding: '0 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontFamily: 'Nunito, sans-serif',
        fontSize: '0.8rem',
        gap: '1rem',
        boxSizing: 'border-box',
      }}
    >
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.85, flexShrink: 1, minWidth: 0 }}>
        Draft preview — <strong style={{ color: '#F9F3EC' }}>&ldquo;{label}&rdquo;</strong> by {creatorName}
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
        {error && (
          <span style={{ color: '#fca5a5', fontSize: '0.75rem' }}>{error}</span>
        )}

        {/* Version dropdown */}
        {drafts.length > 1 && (
          <select
            value={draftId}
            onChange={handleVersionChange}
            style={{
              background: 'rgba(249,243,236,0.1)',
              border: '1px solid rgba(249,243,236,0.25)',
              color: '#F9F3EC',
              padding: '0.2rem 0.4rem',
              borderRadius: '4px',
              fontSize: '0.78rem',
              fontFamily: 'Nunito, sans-serif',
              cursor: 'pointer',
              maxWidth: '160px',
            }}
          >
            {drafts.map(d => (
              <option key={d.id} value={d.id} style={{ background: '#0A1B2E', color: '#F9F3EC' }}>
                {d.label}{d.published_at ? ' ✓' : ''}
              </option>
            ))}
          </select>
        )}

        {/* Return to editor */}
        <a
          href={exitHref}
          style={{
            background: 'rgba(249,243,236,0.12)',
            border: '1px solid rgba(249,243,236,0.25)',
            color: '#F9F3EC',
            padding: '0.25rem 0.75rem',
            borderRadius: '4px',
            fontWeight: 600,
            fontSize: '0.78rem',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          ← Return to edit
        </a>

        {/* Publish */}
        <button
          onClick={handlePublish}
          disabled={publishing}
          style={{
            background: '#BC0E0E',
            border: 'none',
            color: '#F9F3EC',
            padding: '0.25rem 0.85rem',
            borderRadius: '4px',
            fontWeight: 700,
            fontSize: '0.78rem',
            cursor: publishing ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
            opacity: publishing ? 0.6 : 1,
            fontFamily: 'Industry, sans-serif',
          }}
        >
          {publishing ? 'Publishing…' : 'Publish'}
        </button>
      </div>
    </div>
  );
}
