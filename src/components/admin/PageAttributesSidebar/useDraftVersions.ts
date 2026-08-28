'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface DraftVersionRow {
  id: number;
  label: string;
  version: number;
  /**
   * Brief 116 — the template the draft was authored for (page_drafts.template_type;
   * null for page types without a template concept). Lets editors detect drafts
   * that mismatch the live page's template and offer reconciliation.
   */
  template_type: string | null;
  creator_name: string;
  created_by: number;
  created_at: string;
  published_at: string | null;
  /**
   * Brief 159 (Track A1) — is THIS the version whose content is live? Exactly one
   * row in this list can carry it, guaranteed by a partial unique index rather
   * than by anything on the client. Every Draft/Published badge and the sidebar's
   * Status row read this field and nothing else — no hard-coded literals, which
   * is what made the old sidebar say "Published" about every version of every
   * page (Brief 85 §4).
   */
  is_published: boolean;
}

/**
 * Brief 147 (Track B) / Brief 159 (Track C).
 */
export interface UseDraftVersionsOptions {
  /**
   * Brief 147 (Track B) — optional wiring so an editor's LIVE-row optimistic-lock
   * token and this hook's draft state stay in sync with each other.
   *
   * Called with the live row's new `version` whenever this hook causes the live
   * row to move (i.e. a publish). Every editor holds that version in its own
   * state and echoes it back on a direct save; when a publish bumped it behind
   * the editor's back, the next save 409'd with "changed by someone else" —
   * about the editor's own publish — until a full browser reload.
   */
  onLiveVersionChange?: (version: number) => void;
  /**
   * Brief 159 (Track C1) — REQUIRED for correctness, optional only so an editor
   * can be migrated in isolation.
   *
   * Selecting a version in the Version popover must load THAT VERSION'S STORED
   * CONTENT into the editor form. Before this brief `switchTo` moved the active
   * pointer and nothing else: the form kept whatever was on screen, so every
   * version appeared to contain the edit you had just made to a different one
   * ("when I make a change in version 2 and save it, it also appears in version
   * 1" — marketing, 2026-08-28), and the next Save wrote that content into
   * whichever version was then active, making the display bug a data bug.
   *
   * The editor supplies the reverse of its own `getContent()`: take a stored
   * draft payload, put it in the form.
   */
  onLoadContent?: (content: unknown) => void;
}

/**
 * Single source of truth for a page's saved versions — replaces the old split
 * between AdminPageHeader's "Version N" picker (DraftControls) and the separate
 * "Drafts" table panel (DraftManager). One hook, one API surface, consumed by the
 * header's Save/Preview buttons and the sidebar's Version popover (Brief 85 iter. 2).
 *
 * Brief 159 adds the publication pointer to that surface: `activeIsPublished`
 * (what the sidebar's Status row shows), `liveVersion` (what the "Live on the
 * site" line names), and `setStatus` (the one control that publishes and
 * unpublishes). The Status row and the Version popover are two views of ONE
 * piece of state — they read from this hook and nowhere else, so they cannot
 * disagree.
 */
export function useDraftVersions(
  pageType: string,
  pageSlug: string,
  getContent: () => unknown,
  options: UseDraftVersionsOptions = {}
) {
  // Held in refs so callbacks always see the caller's latest closures without
  // making every consumer memoize them.
  const onLiveVersionChangeRef = useRef(options.onLiveVersionChange);
  onLiveVersionChangeRef.current = options.onLiveVersionChange;
  const onLoadContentRef = useRef(options.onLoadContent);
  onLoadContentRef.current = options.onLoadContent;
  const getContentRef = useRef(getContent);
  getContentRef.current = getContent;

  const storageKey = `jbp-cms-active-draft:${pageType}:${pageSlug}`;
  const activeIdRef = useRef<number | null>(null);
  const activeVersionRef = useRef<number | null>(null);
  /**
   * Brief 159 (Track C1) — the serialized content as of the last time the form
   * and the active version were known to agree (load, save, switch). Compared
   * against the live form on a version switch so unsaved work is never dropped
   * silently. Kept here rather than asking 15 editors each to implement dirty
   * tracking, which is 15 chances to implement it differently.
   */
  const syncedContentRef = useRef<string | null>(null);

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

  const snapshotContent = useCallback(() => {
    try {
      syncedContentRef.current = JSON.stringify(getContentRef.current());
    } catch {
      syncedContentRef.current = null;
    }
  }, []);

  /** True when the form has diverged from the active version since it was loaded. */
  const hasUnsavedChanges = useCallback((): boolean => {
    if (syncedContentRef.current === null) return false;
    try {
      return JSON.stringify(getContentRef.current()) !== syncedContentRef.current;
    } catch {
      return false;
    }
  }, []);

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

  /**
   * The ONE helper that moves the active-version pointer. It updates the refs,
   * the React state AND the `jbp-cms-active-draft:*` localStorage key together,
   * so the pointer the next Save writes to can never disagree with the row the
   * popover highlights. Everything that changes the active version goes through
   * here — there is deliberately no second path.
   */
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
      if (rows.length === 0) { setActive(null, '', null); return; }

      /*
       * Brief 159 (Track C1) — WHICH VERSION IS OPEN WHEN THE PAGE LOADS.
       *
       * On mount the editor seeds its form from the LIVE ROW (its own
       * `fetch('/api/cms/…')`), so the only version the sidebar can honestly name
       * is the live one. Before this brief the remembered
       * `jbp-cms-active-draft:*` pointer was restored instead, which produced the
       * reported bug in its most damaging form: reload the page and the sidebar
       * said "Version 2 / Draft" while the form held the live content, and the
       * next Save wrote the live content straight over Version 2's stored copy.
       * Nothing on screen said that was about to happen.
       *
       * So the pointer is honoured ONLY when it already names the live version;
       * otherwise it is dropped and the live version is opened. A stale pointer
       * is not silently obeyed. Reaching another version is one click in the
       * Version popover, and THAT path now loads its content (`switchTo`), so no
       * work is lost — it just is not restored automatically across a reload.
       *
       * The alternative — seeding the form from the remembered version on mount —
       * races the editor's own load effect, which resolves independently and
       * would non-deterministically win. Deferred: it needs every editor to
       * signal when its load has settled. See the Brief 159 report's follow-ups.
       */
      const live = rows.find(r => r.is_published);
      const stored = readStored();
      const storedRow = stored ? rows.find(r => r.id === stored.id) : undefined;

      const open = live ?? storedRow ?? rows[0];
      setActive(open.id, open.label, open.version);
      if (live && storedRow && storedRow.id !== live.id) {
        setNotice(`Opened "${live.label}" — the version that is live. Pick another from Version to keep editing it.`);
        setNoticeIsError(false);
        setTimeout(() => setNotice(''), 6000);
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
      body: JSON.stringify({ pageType, pageSlug, label, content: getContentRef.current() }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? 'Failed to save');
    return { id: json.id, version: json.version ?? 0 };
  }

  async function updateDraft(): Promise<void> {
    const res = await fetch(`/api/cms/drafts/${activeIdRef.current}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: getContentRef.current(), version: activeVersionRef.current ?? 0 }),
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
        snapshotContent();
        flash('Saved ✓');
      } else {
        const label = await nextVersionName();
        const { id, version } = await createDraft(label);
        setActive(id, label, version);
        snapshotContent();
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
      snapshotContent();
      await refresh();
      // Brief 159 (Track A1): a new version is ALWAYS a Draft — createDraft has
      // no parameter that could make it anything else. Say so, so the editor is
      // never left guessing whether they just changed the live page.
      flash(`Saved as "${label}" — Draft ✓`);
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
        snapshotContent();
        await refresh();
        flash(`Saved as "${label}" ✓`);
      } else {
        await updateDraft();
        snapshotContent();
      }
      window.open(`/api/preview?draftId=${activeIdRef.current}`, 'jbp-preview');
    } catch (err) {
      flashError(err instanceof Error ? err.message : 'Preview failed');
    } finally {
      setBusy(false);
    }
  }

  /**
   * Brief 116 — re-read a draft's row (fresh optimistic-lock version) and make it
   * the active draft. Used after an out-of-band mutation like the re-template
   * endpoint bumps the draft's version: without this the next save would 409.
   */
  async function reloadAndActivate(id: number): Promise<DraftVersionRow | null> {
    const rows = await refresh();
    const row = rows.find(r => r.id === id) ?? null;
    if (row) setActive(row.id, row.label, row.version);
    return row;
  }

  /**
   * Brief 159 (Track C1) — select a version AND load its stored content into the
   * editor form.
   *
   * The content is re-read from the server rather than taken from the list rows,
   * so the form is seeded from what is actually stored and the optimistic-lock
   * version comes from the same read. Unsaved work is confirmed before it is
   * replaced — losing an edit on a version switch would be worse than the bug
   * this replaces.
   */
  async function switchTo(id: number) {
    const target = versions.find(d => d.id === id);
    if (!target) return;
    if (id === activeIdRef.current) return;

    if (hasUnsavedChanges() && typeof window !== 'undefined') {
      const leaving = activeLabel || 'the current version';
      const ok = window.confirm(
        `You have unsaved changes in "${leaving}". Switching to "${target.label}" will discard them.\n\n` +
        `Click Cancel to go back and save "${leaving}" first.`
      );
      if (!ok) return;
    }

    setBusy(true);
    try {
      const res = await fetch(`/api/cms/drafts/${id}`);
      if (!res.ok) throw new Error(`Could not load "${target.label}" (${res.status})`);
      const draft: { content?: unknown; version?: number; label?: string } = await res.json();

      if (onLoadContentRef.current && draft.content !== undefined) {
        onLoadContentRef.current(draft.content);
      }
      setActive(id, draft.label ?? target.label, typeof draft.version === 'number' ? draft.version : target.version);
      // Snapshot AFTER the form has been re-seeded, on the next tick — React has
      // not applied the editor's setState by the time onLoadContent returns, so
      // reading getContent() synchronously here would snapshot the OLD form and
      // make the page look permanently dirty.
      setTimeout(snapshotContent, 0);
      flash(`Switched to "${target.label}"`);
    } catch (err) {
      flashError(err instanceof Error ? err.message : 'Could not switch version');
    } finally {
      setBusy(false);
    }
  }

  /**
   * Brief 147 (Track B) — call this after a DIRECT save of the live row landed
   * (the editor's own "Save Page" button). That save bumps the live row's
   * `version`, which used to leave the author's own active draft looking stale to
   * the publish guard forever after: Publish reported "The live page has changed
   * since this draft was created" about a change made seconds earlier in the same
   * tab, and no amount of reloading cleared it (the baseline lives on the draft
   * row). Moving the baseline forward is safe here precisely because the direct
   * save passed the optimistic lock — a foreign session's edit would have failed
   * that save with a 409 instead, leaving the real warning in place.
   *
   * Fire-and-forget by design: a failure here must never turn a successful save
   * into a visible error, and the next save retries it.
   */
  const syncAfterLiveSave = useCallback(async () => {
    const id = activeIdRef.current;
    if (id === null) return;
    try {
      await fetch(`/api/cms/drafts/${id}/rebaseline`, { method: 'POST' });
    } catch {
      /* non-fatal — the draft is simply left on its old baseline */
    }
  }, []);

  /**
   * Publish a version: its content goes live and every sibling drops to Draft.
   *
   * `confirmFirst` is false when the caller has already run its own confirmation
   * (the sidebar's Status row shows the URL-bearing copy from Track C3) — two
   * dialogs for one action reads as a bug.
   */
  async function publish(id: number, confirmFirst = true): Promise<boolean> {
    const draft = versions.find(d => d.id === id);
    if (!draft) return false;
    if (confirmFirst && typeof window !== 'undefined' &&
        !window.confirm(`Publish "${draft.label}"? This will update the live page.`)) return false;
    setBusy(true);
    try {
      const res = await fetch(`/api/cms/drafts/${id}/publish`, { method: 'POST' });
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error ?? 'Failed to publish'); }
      // Brief 147 (Track B): publishing moved the live row on. Push its new
      // version back into the editor's own optimistic-lock token, and re-read this
      // draft's row so its own version ref is fresh too — otherwise the next
      // direct save AND the next draft save both 409 until a browser reload.
      const j: { liveVersion?: number | null; publishedDraftId?: number } = await res.json().catch(() => ({}));
      if (typeof j.liveVersion === 'number') onLiveVersionChangeRef.current?.(j.liveVersion);

      // Brief 159 (Track C2): repaint every badge from the ONE id the server says
      // is now published, without waiting on a refetch. Exactly one row can be
      // Published, so this is a complete answer, not an optimistic guess.
      const publishedId = j.publishedDraftId ?? id;
      setVersions(prev => prev.map(v => ({ ...v, is_published: v.id === publishedId })));

      await reloadAndActivate(id);
      flash('Published successfully.');
      return true;
    } catch (err) {
      flashError(err instanceof Error ? err.message : 'Publish failed');
      return false;
    } finally {
      setBusy(false);
    }
  }

  /**
   * Brief 159 (Track E) — take the live version back to Draft, which (nothing
   * else being Published) takes the page off the site.
   *
   * The caller owns the confirmation: this is reached only from the Status row's
   * typed-slug modal, which names the URL and the 404. Every guardrail is
   * enforced server-side regardless — a 409 here is the server refusing, and its
   * message is shown verbatim because it names the specific redirect or core page
   * that blocked it.
   */
  async function unpublish(id: number): Promise<{ ok: boolean; error?: string }> {
    setBusy(true);
    try {
      const res = await fetch(`/api/cms/drafts/${id}/unpublish`, { method: 'POST' });
      const j: { error?: string } = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? 'Failed to unpublish');
      setVersions(prev => prev.map(v => (v.id === id ? { ...v, is_published: false } : v)));
      flash('Page unpublished — it now returns 404.');
      return { ok: true };
    } catch (err) {
      // The message is returned as well as flashed: the caller (the typed-slug
      // modal) shows it in the dialog, and reading it back off `notice` would be
      // a stale-closure race.
      const msg = err instanceof Error ? err.message : 'Unpublish failed';
      flashError(msg);
      return { ok: false, error: msg };
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    const draft = versions.find(d => d.id === id);
    if (!draft) return;
    // Brief 159 (Track C2): deleting the live version would unpublish the page
    // through the Delete button, bypassing every Track E guardrail. Blocked here
    // AND server-side in deleteDraft — the client check exists to give a better
    // message, not to be the enforcement.
    if (draft.is_published) {
      flashError('This is the version currently live. Publish another version first.');
      return;
    }
    if (typeof window !== 'undefined' && !window.confirm(`Delete "${draft.label}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/cms/drafts/${id}`, { method: 'DELETE' });
      if (res.status === 403) { flashError('You can only delete your own drafts.'); return; }
      if (res.status === 409) {
        const j = await res.json().catch(() => ({}));
        flashError(j.error ?? 'This is the version currently live. Publish another version first.');
        return;
      }
      if (!res.ok) throw new Error('Failed to delete');
      if (activeIdRef.current === id) setActive(null, '', null);
      await refresh();
    } catch (err) {
      flashError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  /** The version whose content the public is seeing, if any. */
  const liveVersion = useMemo(() => versions.find(v => v.is_published) ?? null, [versions]);
  /** What the sidebar's Status row shows: the status of the version OPEN in the editor. */
  const activeIsPublished = activeId !== null && liveVersion?.id === activeId;

  return {
    activeId, activeLabel, versions, busy, notice, noticeIsError, currentUserId,
    refresh, save, saveAsNew, preview, switchTo, publish, unpublish, remove, nextVersionName,
    reloadAndActivate, syncAfterLiveSave, snapshotContent, hasUnsavedChanges,
    liveVersion, activeIsPublished,
  };
}

export type UseDraftVersions = ReturnType<typeof useDraftVersions>;
