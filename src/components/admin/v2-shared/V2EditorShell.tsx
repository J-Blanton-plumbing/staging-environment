'use client';

/**
 * Brief 212 — the editor shell shared by the City Hub, "Shared across all City Hubs" and City Service
 * V2 editors (the Brief 204 SewerV2Editor flow, extracted rather than copied a fourth time).
 *
 * Every edit goes through VERSIONS (Brief 159): Save writes the open version, Preview opens it under
 * the preview cookie with the PreviewBanner, Publish (sidebar Status) makes it live through
 * publishDraft. There is no direct "Save Page" write. An OLD-SHAPED version (a pre-template archive,
 * a legacy snapshot or draft) opens read-only with every stored string listed; an archive version
 * also offers "Restore this page" (Brief 212 D3).
 */
import { useCallback, useRef, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import PageAttributesSidebar, { SIDEBAR_WIDTH_PX } from '@/components/admin/PageAttributesSidebar';
import { usePageAttributesOpen } from '@/components/admin/PageAttributesSidebar/usePageAttributesOpen';
import { useDraftVersions } from '@/components/admin/PageAttributesSidebar/useDraftVersions';
import { useVersionStatusControl } from '@/components/admin/PageAttributesSidebar/useVersionStatusControl';
import { SITE } from '@/lib/site';
import { BRAND, Group, Notice, TextInput } from '@/components/admin/sewer-v2/ui';
import RestoreArchiveButton from './RestoreArchiveButton';

/** Every string of an old-shaped version, labelled by its path (the read-only view). */
function legacyLines(v: unknown, path = '', out: [string, string][] = []): [string, string][] {
  if (typeof v === 'string' && v.trim()) out.push([path, v]);
  else if (Array.isArray(v)) v.forEach((x, i) => legacyLines(x, `${path}[${i}]`, out));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) legacyLines(x, path ? `${path}.${k}` : k, out);
  return out;
}

export interface V2EditorShellProps<C> {
  pageType: string;
  slug: string;
  publicPath: string | null;
  title: string;
  templateName: string;
  /** The version template stamp this editor writes ('city-hub' …). */
  template: string;
  isOwnContent: (c: unknown) => c is C;
  initial: C;
  oldShapeMessage: string;
  /** Labels of versions that offer "Restore this page". */
  archiveLabels?: readonly string[];
  updatedAt?: string | null;
  intro: React.ReactNode;
  renderFields: (content: C, set: (next: C) => void) => React.ReactNode;
  /** The sidebar Template popover; omit for a fixed template. */
  templateControl?: { value: string; label: string; options: { value: string; label: string }[]; onChange: (v: string) => void };
  parentLabel?: string;
  extra?: React.ReactNode;
}

export default function V2EditorShell<C>(p: V2EditorShellProps<C>) {
  const [content, setContent] = useState<C>(p.initial);
  const [legacy, setLegacy] = useState<unknown>(null);
  const [formKey, setFormKey] = useState(0);
  const [attrsOpen, setAttrsOpen] = usePageAttributesOpen();
  const contentRef = useRef<unknown>(null);
  contentRef.current = legacy ?? content;

  const dv = useDraftVersions(p.pageType, p.slug, () => contentRef.current, {
    onLoadContent: (c) => {
      if (p.isOwnContent(c)) {
        setLegacy(null);
        setContent(c);
      } else {
        setLegacy(c ?? {});
      }
      setFormKey((k) => k + 1);
    },
  });
  const statusCtl = useVersionStatusControl(dv, { path: p.publicPath ?? '' });
  const activeRow = dv.versions.find((v) => v.id === dv.activeId) ?? null;
  const activeIsOld = !!activeRow && activeRow.template_type !== p.template;
  const readOnly = legacy !== null;
  const [localNotice, setLocalNotice] = useState('');

  const save = useCallback(async () => {
    setLocalNotice('');
    if (readOnly) { setLocalNotice(p.oldShapeMessage); return; }
    // The open version is old-shaped: new-template content is saved as a NEW version instead.
    if (activeIsOld || dv.activeId === null) await dv.saveAsNew(await dv.nextVersionName());
    else await dv.save();
  }, [readOnly, activeIsOld, dv, p.oldShapeMessage]);
  const preview = useCallback(async () => {
    setLocalNotice('');
    if (readOnly) { setLocalNotice(p.oldShapeMessage); return; }
    if (activeIsOld) await dv.saveAsNew(await dv.nextVersionName());
    await dv.preview();
  }, [readOnly, activeIsOld, dv, p.oldShapeMessage]);
  const saveAsNew = (label: string) => (readOnly ? setLocalNotice(p.oldShapeMessage) : dv.saveAsNew(label));
  const isArchive = !!activeRow && (p.archiveLabels ?? []).includes(activeRow.label);

  return (
    <>
      <AdminPageHeader
        title={p.title}
        templateName={p.templateName}
        status={dv.liveVersion ? 'published' : 'draft'}
        pageAttributesOpen={attrsOpen}
        onTogglePageAttributes={() => setAttrsOpen(!attrsOpen)}
        draftVersions={{
          busy: dv.busy,
          notice: localNotice || dv.notice,
          noticeIsError: !!localNotice || dv.noticeIsError,
          onSave: save,
          onPreview: preview,
          onSaveAsNew: saveAsNew,
          nextVersionName: dv.nextVersionName,
        }}
        compact
      />
      <div className={`admin-editor-content${attrsOpen ? ' attrs-open' : ''}`} style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', maxWidth: 1100 }}>
        <style>{`
          .field { transition: box-shadow 0.15s ease, border-color 0.15s ease; }
          .field:focus { outline: none; border-color: ${BRAND.cerulean}; box-shadow: 0 0 0 2px ${BRAND.cerulean}66; }
          .admin-editor-content { transition: margin-right 0.2s ease; }
          @media (min-width: 768px) { .admin-editor-content.attrs-open { margin-right: ${SIDEBAR_WIDTH_PX}px; } }
        `}</style>
        <Notice>{p.intro}</Notice>
        {p.extra}
        {readOnly ? (
          <>
            <Notice tone="warn">
              <strong>{p.oldShapeMessage}</strong> It is kept for reference: pick a {p.templateName} version from <em>Version</em> in the sidebar to edit the page.
            </Notice>
            {isArchive && activeRow && <RestoreArchiveButton draftId={activeRow.id} onRestored={() => window.location.reload()} />}
            <Group title={`Read-only: “${activeRow?.label ?? 'old version'}”`} note="Every piece of text this old version holds, as stored.">
              {legacyLines(legacy).slice(0, 500).map(([path, v], i) => (
                <TextInput key={i} label={path} value={v} onChange={() => {}} multiline={v.length > 90} readOnly />
              ))}
            </Group>
          </>
        ) : (
          <div key={formKey}>{p.renderFields(content, setContent)}</div>
        )}
      </div>
      {statusCtl.modal}
      <PageAttributesSidebar
        title={p.title}
        updatedAt={p.updatedAt ?? undefined}
        template={p.templateControl ?? { value: p.template, label: p.templateName, options: [{ value: p.template, label: p.templateName }] }}
        version={{
          activeId: dv.activeId,
          activeLabel: dv.activeLabel,
          versions: dv.versions,
          busy: dv.busy,
          currentUserId: dv.currentUserId,
          onSwitch: dv.switchTo,
          onPublish: dv.publish,
          onDelete: dv.remove,
          onSaveAsNew: saveAsNew,
          nextVersionName: dv.nextVersionName,
          ...statusCtl.versionProps,
        }}
        slug={{ value: p.slug, editable: false, disabledNote: "This page's URL is fixed.", permalink: p.publicPath ? `${SITE.baseUrl}${p.publicPath}` : '' }}
        parent={{ label: p.parentLabel ?? '', editable: false, value: '', options: [], onChange: () => {} }}
        open={attrsOpen}
        onClose={() => setAttrsOpen(false)}
      />
    </>
  );
}
