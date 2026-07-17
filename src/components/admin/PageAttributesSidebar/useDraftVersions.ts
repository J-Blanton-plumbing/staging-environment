'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface DraftVersionRow {
  id: number;
  label: string;
  version: number;
  creator_name: string;
  created_by: number;
  created_at: string;
  published_at: string | null;
}

/**
 * Single source of truth for a page's saved versions — replaces the old split
 * between AdminPageHeader's "Version N" picker (DraftControls) and the separate
 * "Drafts" table panel (DraftManager). One hook, one API surface, consumed by the
 * header's Save/Preview buttons and the sidebar's Version popover (Brief 85 iter. 2).
 */
export function useDraftVersions(pageType: string, pageSlug: string, getContent: () => unknown) {
  const storageKey = `jbp-cms-active-draft:${pageType}:${pageSlug}`;
  const activeIdRef = useRef<number | null>(null);
  const activeVersionRef = useRef<number | null>(null);

  const [activeId, setActiveId] = useState<number | null>(null);
  const [activeLabel, setActiveLabel] = useState('');
  const [versions, setVersions] = useState<DraftVersionRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [noticeIsError, setNoticeIsError] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  function flash(msg: string) {
    setNoticeIsError(false);
    setNotice(msg);
    setTimeout(() => setNotice(''), 2500);
  }
  function flashError(msg: string) {
    setNoticeIsError(true);
    setNotice(msg);
  }

  class DraftConflictError extends Error {}

  const readStored = useCallback((): { id: number; label: string } | null => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return typeof parsed?.id === 'number' ? { id: parsed.id, label: parsed.label ?? '' } : null;
    } catch {
      return null;
    }
  }, [storageKey]);

  const setActive = useCallback((id: number | null, label: string, version: number | null) => {
    activeIdRef.current = id;
    activeVersionRef.current = id === null ? null : version;
    setActiveId(id);
    setActiveLabel(id === null ? '' : label);
    if (typeof window === 'undefined') return;
    if (id === null) window.localStorage.removeItem(storageKey);
    else window.localStorage.setItem(storageKey, JSON.stringify({ id, label }));
  }, [storageKey]);

  const refresh = useCallback(async (): Promise<DraftVersionRow[]> => {
    try {
      const res = await fetch(`/api/cms/drafts?pageType=${encodeURIComponent(pageType)}&pageSlug=${encodeURIComponent(pageSlug)}`);
      const rows: DraftVersionRow[] = res.ok ? await res.json() : [];
      setVersions(rows);
      return rows;
    } catch {
      return [];
    }
  }, [pageType, pageSlug]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rows = await refresh();
      if (cancelled) return;
      const stored = readStored();
      if (stored && rows.some(r => r.id === stored.id)) {
        const match = rows.find(r => r.id === stored.id)!;
        setActive(match.id, match.label, match.version);
      } else if (rows.length > 0) {
        setActive(rows[0].id, rows[0].label, rows[0].version);
      } else {
        setActive(null, '', null);
      }
    })();
    fetch('/api/auth/me')
      .then(r => (r.ok ? r.json() : null))
      .then(data => { if (data?.userId) setCurrentUserId(data.userId); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [refresh, readStored, setActive]);

  async function nextVersionName(): Promise<string> {
    const rows = await refresh();
    return `Version ${rows.length + 1}`;
  }

  async function createDraft(label: string): Promise<{ id: number; version: number }> {
    const res = await fetch('/api/cms/drafts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageType, pageSlug, label, content: getContent() }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? 'Failed to save');
    return { id: json.id, version: json.version ?? 0 };
  }

  async function updateDraft(): Promise<void> {
    const res = await fetch(`/api/cms/drafts/${activeIdRef.current}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: getContent(), version: activeVersionRef.current ?? 0 }),
    });
    let json: { error?: string; version?: number } = {};
    try { json = await res.json(); } catch { /* non-JSON error body */ }
    if (res.status === 409) {
      throw new DraftConflictError(json.error ?? 'Someone else changed this draft. Reload to get the latest version before saving.');
    }
    if (!res.ok) throw new Error(json.error ?? `Save failed (${res.status})`);
    if (typeof json.version === 'number') activeVersionRef.current = json.version;
  }

  async function save() {
    setBusy(true);
    try {
      if (activeIdRef.current !== null) {
        await updateDraft();
        flash('Saved ✓');
      } else {
        const label = await nextVersionName();
        const { id, version } = await createDraft(label);
        setActive(id, label, version);
        await refresh();
        flash(`Saved as "${label}" ✓`);
      }
    } catch (err) {
      flashError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function saveAsNew(label: string) {
    setBusy(true);
    try {
      const { id, version } = await createDraft(label);
      setActive(id, label, version);
      await refresh();
      flash(`Saved as "${label}" ✓`);
    } catch (err) {
      flashError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function preview() {
    setBusy(true);
    try {
      if (activeIdRef.current === null) {
        const label = await nextVersionName();
        const { id, version } = await createDraft(label);
        setActive(id, label, version);
        await refresh();
        flash(`Saved as "${label}" ✓`);
      } else {
        await updateDraft();
      }
      window.open(`/api/preview?draftId=${activeIdRef.current}`, 'jbp-preview');
    } catch (err) {
      flashError(err instanceof Error ? err.message : 'Preview failed');
    } finally {
      setBusy(false);
    }
  }

  function switchTo(id: number) {
    const draft = versions.find(d => d.id === id);
    if (!draft) return;
    setActive(draft.id, draft.label, draft.version);
    flash(`Switched to "${draft.label}"`);
  }

  async function publish(id: number) {
    const draft = versions.find(d => d.id === id);
    if (!draft) return;
    if (typeof window !== 'undefined' && !window.confirm(`Publish "${draft.label}"? This will update the live page.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/cms/drafts/${id}/publish`, { method: 'POST' });
      if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? 'Failed to publish'); }
      await refresh();
      flash('Published successfully.');
    } catch (err) {
      flashError(err instanceof Error ? err.message : 'Publish failed');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    const draft = versions.find(d => d.id === id);
    if (!draft) return;
    if (typeof window !== 'undefined' && !window.confirm(`Delete "${draft.label}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/cms/drafts/${id}`, { method: 'DELETE' });
      if (res.status === 403) { flashError('You can only delete your own drafts.'); return; }
      if (!res.ok) throw new Error('Failed to delete');
      if (activeIdRef.current === id) setActive(null, '', null);
      await refresh();
    } catch (err) {
      flashError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  return {
    activeId, activeLabel, versions, busy, notice, noticeIsError, currentUserId,
    refresh, save, saveAsNew, preview, switchTo, publish, remove, nextVersionName,
  };
}

export type UseDraftVersions = ReturnType<typeof useDraftVersions>;
