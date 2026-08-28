'use client';

import { useCallback, useState } from 'react';
import { SITE } from '@/lib/site';
import UnpublishConfirmModal from './UnpublishConfirmModal';
import type { UseDraftVersions } from './useDraftVersions';

/**
 * Brief 159 (Track C3) — the shared wiring behind the sidebar's Status row.
 *
 * Every editor needs the same three things to make Status real: the publish
 * confirmation (which has to name the page's URL), the typed-slug unpublish
 * modal (Track E2 item 1), and the props the sidebar's `version` block expects.
 * Fifteen editors implementing that independently is fifteen chances to word the
 * warning differently or forget a guardrail, so it lives here once and each
 * editor's change is prop wiring only.
 *
 * Usage in an editor:
 *
 *     const statusCtl = useVersionStatusControl(dv, { path: `/${slug}` });
 *     …
 *     {statusCtl.modal}
 *     <PageAttributesSidebar version={{ …dv wiring…, ...statusCtl.versionProps }} … />
 *
 * The modal is a UX guardrail, not the enforcement point: `unpublishDraft`
 * refuses server-side on the home page, the service categories and any redirect
 * target regardless, and its message is surfaced verbatim in the modal when it
 * does.
 */
export interface UseVersionStatusControlOptions {
  /** Public path of the page being edited, e.g. `/columbus` or `/services/drain`. */
  path: string;
}

export function useVersionStatusControl(
  dv: UseDraftVersions,
  { path }: UseVersionStatusControlOptions
) {
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState('');

  const url = path === '/' ? `${SITE.baseUrl}/` : `${SITE.baseUrl}${path}`;
  // The whole path (minus the leading slash) rather than just the last segment:
  // `bonnie-brae/catch-basin` is unambiguous where `catch-basin` is not.
  const confirmToken = path === '/' ? 'home' : path.replace(/^\//, '');

  const onSetStatus = useCallback(
    async (next: 'draft' | 'published') => {
      const id = dv.activeId;
      if (id === null) return;

      if (next === 'published') {
        // Exact copy from Track C3 — it has to say where the content goes AND
        // that the currently-live version is demoted, because that second half is
        // the part editors do not expect.
        const ok =
          typeof window === 'undefined' ||
          window.confirm(
            `Publish this version? Its content goes live at ${url}, and the version that is live now becomes a Draft.`
          );
        if (!ok) return;
        // `false` — the confirmation above already ran; two dialogs for one
        // action reads as a bug.
        await dv.publish(id, false);
        return;
      }

      // Published → Draft. Only reachable on the version that IS live (the
      // StatusPopover disables it otherwise, because on any other version it
      // would be inert), so this is always the unpublish path.
      setError('');
      setModalOpen(true);
    },
    [dv, url]
  );

  const confirmUnpublish = useCallback(async () => {
    const id = dv.activeId;
    if (id === null) return;
    const { ok, error: err } = await dv.unpublish(id);
    if (ok) {
      setModalOpen(false);
      setError('');
    } else {
      // The server's refusal names the specific redirect or core page that
      // blocked it — show it inside the modal rather than making the editor
      // close the dialog to read the toast behind it.
      setError(err ?? 'Unpublish failed. Please try again.');
    }
  }, [dv]);

  const modal = (
    <UnpublishConfirmModal
      open={modalOpen}
      path={path}
      url={url}
      confirmToken={confirmToken}
      versionLabel={dv.activeLabel || 'this version'}
      busy={dv.busy}
      error={error}
      onCancel={() => { setModalOpen(false); setError(''); }}
      onConfirm={confirmUnpublish}
    />
  );

  /** Spread into the sidebar's `version` prop alongside the plain dv wiring. */
  const versionProps = {
    activeIsPublished: dv.activeIsPublished,
    onSetStatus,
    statusBusy: dv.busy,
  };

  return { modal, onSetStatus, versionProps };
}
