'use client';

/**
 * Brief 204 — the Sewer v2 editor: `/admin/sub-service/<one of the 9 sewer slugs>` and `/admin/sewer`
 * (the hub + "Shared across all 10 sewer pages").
 *
 * Every edit goes through VERSIONS (Brief 159): Save writes the open version, Preview opens it under
 * the preview cookie with the PreviewBanner, Publish (sidebar) makes it live through publishDraft.
 * There is no direct "Save Page" write. The layout is locked: editors change words, links, photos
 * and list items, never panels (Marketing decision 1, 2026-10-12).
 *
 * An OLD-SHAPED version (the "Pre-v2 archive (2026-10)", a pre-v2 live snapshot, a legacy draft)
 * opens read-only with a notice; the server refuses to save or publish it on these pages.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import PageAttributesSidebar, { SIDEBAR_WIDTH_PX } from '@/components/admin/PageAttributesSidebar';
import { usePageAttributesOpen } from '@/components/admin/PageAttributesSidebar/usePageAttributesOpen';
import { useDraftVersions } from '@/components/admin/PageAttributesSidebar/useDraftVersions';
import { useVersionStatusControl } from '@/components/admin/PageAttributesSidebar/useVersionStatusControl';
import { ADMIN_COLORS } from '@/lib/admin/theme';
import { SITE } from '@/lib/site';
import type { SewerSection, SewerServiceStored, SewerSharedContent } from '@/lib/content/sewer-v2/types';
import { isSewerV2DraftContent, OLD_SHAPE_MESSAGE, SEWER_V2_TEMPLATE, type SewerHubStored, type SewerV2DraftContent } from '@/lib/sewer-v2-cms/model';
import { NodeList, panelTitle } from './TreeEditor';
import { humanize, ValueEditor } from './ValueEditor';
import { BRAND, Group, Notice, Repeater, Select, TextInput } from './ui';

type Kind = 'service' | 'hub';

interface Load {
  exists: boolean;
  status: string | null;
  version: number;
  updatedAt: string | null;
  content: SewerV2DraftContent;
  source: 'row' | 'code';
}

/** Words of an old-shaped version, for the read-only view (every string, labelled by its path). */
function legacyLines(v: unknown, path = '', out: [string, string][] = []): [string, string][] {
  if (typeof v === 'string' && v.trim()) out.push([path, v]);
  else if (Array.isArray(v)) v.forEach((x, i) => legacyLines(x, `${path}[${i}]`, out));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) legacyLines(x, path ? `${path}.${k}` : k, out);
  return out;
}

export default function SewerV2Editor({ kind, slug }: { kind: Kind; slug: string }) {
  const pageType = kind === 'hub' ? 'service' : 'sub-service';
  const publicPath = kind === 'hub' ? '/services/sewer' : `/${slug}`;
  const [load, setLoad] = useState<Load | null>(null);
  const [loadError, setLoadError] = useState('');
  const [content, setContent] = useState<SewerV2DraftContent | null>(null);
  /** The open version's content when it is old-shaped (read-only); null when it is a v2 version. */
  const [legacy, setLegacy] = useState<unknown>(null);
  const [formKey, setFormKey] = useState(0);
  const [attrsOpen, setAttrsOpen] = usePageAttributesOpen();
  const contentRef = useRef<unknown>(null);
  contentRef.current = legacy ?? (content ? { ...content, templateType: SEWER_V2_TEMPLATE } : null);

  const dv = useDraftVersions(pageType, slug, () => contentRef.current, {
    onLoadContent: (c) => {
      if (isSewerV2DraftContent(c)) {
        setLegacy(null);
        setContent(c);
      } else {
        setLegacy(c ?? {});
      }
      setFormKey((k) => k + 1);
    },
  });
  const statusCtl = useVersionStatusControl(dv, { path: publicPath });

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/cms/sewer-v2/${slug}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(r.status === 404 ? 'not-found' : `HTTP ${r.status}`);
        return (await r.json()) as Load;
      })
      .then((d) => {
        if (cancelled) return;
        setLoad(d);
        setContent(d.content);
        setFormKey((k) => k + 1);
      })
      .catch((e: Error) => !cancelled && setLoadError(e.message));
    return () => { cancelled = true; };
  }, [slug]);

  const activeRow = dv.versions.find((v) => v.id === dv.activeId) ?? null;
  // A version is v2 when it was saved by this editor (template_type 'sewer-v2'); anything else is old-shaped.
  const activeIsOld = !!activeRow && activeRow.template_type !== SEWER_V2_TEMPLATE;
  const readOnly = legacy !== null;

  const [localNotice, setLocalNotice] = useState('');
  const save = useCallback(async () => {
    setLocalNotice('');
    if (readOnly) { setLocalNotice(OLD_SHAPE_MESSAGE); return; }
    // The open version is old-shaped (e.g. the live pre-v2 snapshot, before the seed ran): v2 content
    // can't be written into it, so the edit is saved as a NEW version instead.
    if (activeIsOld || dv.activeId === null) await dv.saveAsNew(await dv.nextVersionName());
    else await dv.save();
  }, [readOnly, activeIsOld, dv]);
  const preview = useCallback(async () => {
    setLocalNotice('');
    if (readOnly) { setLocalNotice(OLD_SHAPE_MESSAGE); return; }
    if (activeIsOld) await dv.saveAsNew(await dv.nextVersionName());
    await dv.preview();
  }, [readOnly, activeIsOld, dv]);

  if (loadError) {
    return (
      <main style={{ padding: '2rem', fontFamily: 'var(--font-nunito), system-ui, sans-serif', color: ADMIN_COLORS.error }}>
        {loadError === 'not-found' ? `"${slug}" is not a Sewer v2 page.` : `Failed to load (${loadError}). Please refresh.`}
      </main>
    );
  }
  if (!load || !content) return <main style={{ padding: '2rem', color: ADMIN_COLORS.onSurfaceVariant }}>Loading…</main>;

  const set = (patch: Partial<SewerV2DraftContent>) => setContent((c) => (c ? { ...c, ...patch } : c));
  const body = content.sewerV2;
  const title = kind === 'hub' ? 'Sewer Services (hub)' : (body as SewerServiceStored).hero?.heading ?? slug;

  return (
    <>
      <AdminPageHeader
        title={title}
        templateName="Sewer v2"
        status={dv.liveVersion ? 'published' : 'draft'}
        pageAttributesOpen={attrsOpen}
        onTogglePageAttributes={() => setAttrsOpen(!attrsOpen)}
        draftVersions={{
          busy: dv.busy,
          notice: localNotice || dv.notice,
          noticeIsError: !!localNotice || dv.noticeIsError,
          onSave: save,
          onPreview: preview,
          onSaveAsNew: (label: string) => (readOnly ? setLocalNotice(OLD_SHAPE_MESSAGE) : dv.saveAsNew(label)),
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

        <Notice>
          {kind === 'hub' ? (
            <>This is the <strong>Sewer Services hub</strong> (<a href="/services/sewer" target="_blank" rel="noreferrer" style={{ color: BRAND.cream }}>/services/sewer</a>) and, further down, the sections <strong>shared across all 10 sewer pages</strong>. </>
          ) : (
            <>Editing <a href={publicPath} target="_blank" rel="noreferrer" style={{ color: BRAND.cream }}>{publicPath}</a>. </>
          )}
          Words, links, photos and list items are editable; the layout is fixed. Save writes the open version; Preview shows it before anyone else sees it; Publish (Status in the sidebar) puts it live.
          {!load.exists && <> <strong>This page has no CMS row yet</strong> — it is created by the deploy seed; until then the live page shows the built-in copy.</>}
        </Notice>

        {readOnly ? (
          <>
            <Notice tone="warn">
              <strong>{OLD_SHAPE_MESSAGE}</strong> It is kept for reference: pick a Sewer v2 version from <em>Version</em> in the sidebar to edit the page.
            </Notice>
            <Group title={`Read-only: “${activeRow?.label ?? 'old version'}”`} note="Every piece of text this old version holds, as stored.">
              {legacyLines(legacy).slice(0, 400).map(([p, v], i) => (
                <TextInput key={i} label={p} value={v} onChange={() => {}} multiline={v.length > 90} readOnly />
              ))}
            </Group>
          </>
        ) : (
          <div key={formKey}>
            <Group title="SEO (Google)" note="The page title Google shows (the site adds “ | J. Blanton Plumbing” once, automatically) and the description under it.">
              <TextInput label="SEO title (Google)" value={content.metaTitle} onChange={(v) => set({ metaTitle: v })} limit={60} />
              <TextInput label="SEO description (Google)" value={content.metaDescription} onChange={(v) => set({ metaDescription: v })} limit={160} multiline />
            </Group>
            {kind === 'service' ? (
              <ServiceFields value={body as SewerServiceStored} onChange={(sewerV2) => set({ sewerV2 })} />
            ) : (
              <HubFields value={body as SewerHubStored} onChange={(sewerV2) => set({ sewerV2 })} />
            )}
          </div>
        )}
      </div>

      {statusCtl.modal}
      <PageAttributesSidebar
        title={title}
        updatedAt={load.updatedAt ?? undefined}
        template={{ value: 'sewer-v2', label: 'Sewer v2', options: [{ value: 'sewer-v2', label: 'Sewer v2' }] }}
        version={{
          activeId: dv.activeId,
          activeLabel: dv.activeLabel,
          versions: dv.versions,
          busy: dv.busy,
          currentUserId: dv.currentUserId,
          onSwitch: dv.switchTo,
          onPublish: dv.publish,
          onDelete: dv.remove,
          onSaveAsNew: (label: string) => (readOnly ? setLocalNotice(OLD_SHAPE_MESSAGE) : dv.saveAsNew(label)),
          nextVersionName: dv.nextVersionName,
          ...statusCtl.versionProps,
        }}
        slug={{ value: slug, editable: false, disabledNote: "This page's URL is fixed.", permalink: `${SITE.baseUrl}${publicPath}` }}
        parent={{ label: 'Sewer Services', editable: false, value: 'sewer', options: [], onChange: () => {} }}
        open={attrsOpen}
        onClose={() => setAttrsOpen(false)}
      />
    </>
  );
}

// ── a service page ────────────────────────────────────────────────────────────────

function ServiceFields({ value, onChange }: { value: SewerServiceStored; onChange: (v: SewerServiceStored) => void }) {
  const setSection = (i: number, s: SewerSection) => onChange({ ...value, sections: value.sections.map((x, y) => (y === i ? s : x)) });
  return (
    <>
      <Group title="Hero">
        <ValueEditor value={value.hero} keyName="hero" label="" onChange={(hero) => onChange({ ...value, hero: hero as SewerServiceStored['hero'] })} />
      </Group>
      {value.sections.map((s, i) => {
        switch (s.kind) {
          case 'panel':
            return (
              <Group key={i} title={`Panel: ${panelTitle(s.body) || s.id}`} note={s.tint ? 'Tinted panel — layout locked.' : 'Layout locked.'}>
                <NodeList nodes={s.body} onChange={(body) => setSection(i, { ...s, body })} />
              </Group>
            );
          case 'reviews':
            return (
              <Group key={i} title="Reviews (this page only)" note="Each review has its own Google Maps review link.">
                <TextInput label="Eyebrow" value={s.eyebrow} onChange={(eyebrow) => setSection(i, { ...s, eyebrow })} />
                <TextInput label="Heading" value={s.heading} onChange={(heading) => setSection(i, { ...s, heading })} />
                <ValueEditor value={s.items} keyName="items" label="Reviews" onChange={(items) => setSection(i, { ...s, items: items as typeof s.items })} />
              </Group>
            );
          case 'faq':
            return (
              <Group key={i} title="Frequently asked questions">
                <TextInput label="Eyebrow" value={s.eyebrow} onChange={(eyebrow) => setSection(i, { ...s, eyebrow })} />
                <TextInput label="Heading" value={s.heading} onChange={(heading) => setSection(i, { ...s, heading })} />
                <ValueEditor value={s.items} keyName="items" label="Questions" onChange={(items) => setSection(i, { ...s, items: items as typeof s.items })} />
              </Group>
            );
          case 'ndc':
            return (
              <Group key={i} title="No Drip Club" note={<>The No Drip Club box is <strong>shared by all sewer pages</strong> — edit it in <a href="/admin/sewer#shared" style={{ color: BRAND.cream }}>/admin/sewer</a>. Only this page&rsquo;s sentence can differ.</>}>
                <TextInput
                  label="This page's sentence (optional)"
                  value={s.body ?? ''}
                  onChange={(body) => setSection(i, body ? { ...s, body } : { kind: 'ndc', order: s.order })}
                  multiline
                  hint="Leave blank to use the shared sentence."
                />
              </Group>
            );
          case 'services':
            return (
              <Group key={i} title="Sewer services list" note={<>Shared by all sewer pages (this page is left out of its own list automatically) — edit it in <a href="/admin/sewer#shared" style={{ color: BRAND.cream }}>/admin/sewer</a>.</>} />
            );
          case 'final':
            return (
              <Group key={i} title="Final call to action" note="The eyebrow, “Call Now:” and “Schedule a Service” are shared (in /admin/sewer).">
                <TextInput label="Heading" value={s.heading} onChange={(heading) => setSection(i, { ...s, heading })} />
                <TextInput label="Text" value={s.body} onChange={(body) => setSection(i, { ...s, body })} multiline />
              </Group>
            );
        }
      })}
      {value.video && (
        <Group title="Video details for Google (VideoObject)" note="Describes the page's YouTube video to search engines. The video address is built from the YouTube id in the panel above.">
          <ValueEditor value={value.video} keyName="video" label="" onChange={(video) => onChange({ ...value, video: video as SewerServiceStored['video'] })} />
        </Group>
      )}
      <Group
        title="Shared sections"
        note={<>The breadcrumb parent, quick links, contact rail (call box, trust list, financing card), mobile sticky bar, No Drip Club box and services list are <strong>shared across all 10 sewer pages</strong>: edit them once in <a href="/admin/sewer#shared" style={{ color: BRAND.cream }}>/admin/sewer</a>.</>}
      />
    </>
  );
}

// ── the hub + the shared sections ─────────────────────────────────────────────────

const HUB_GROUPS: [keyof SewerHubStored['hub'], string][] = [
  ['hero', 'Hero'], ['trust', 'Trust stripe'], ['services', 'Services intro'], ['understanding', 'Understanding Sewer Work'], ['whyUs', 'Why Choose Us (chart)'],
  ['financing', 'Financing band'], ['map', 'Where We Work (map)'], ['reviews', 'Reviews'], ['faq', 'Frequently asked questions'], ['final', 'Final call to action'],
];

function HubFields({ value, onChange }: { value: SewerHubStored; onChange: (v: SewerHubStored) => void }) {
  const hub = value.hub;
  const shared = value.shared;
  const setShared = (patch: Partial<SewerSharedContent>) => onChange({ ...value, shared: { ...shared, ...patch } });
  const options = shared.services.map((e) => ({ value: e.href.replace(/^\//, ''), label: e.hub.title || e.row.title || e.href }));
  return (
    <>
      {HUB_GROUPS.map(([k, label]) => (
        <Group key={k} title={label}>
          <ValueEditor value={hub[k]} keyName={k} label="" onChange={(n) => onChange({ ...value, hub: { ...hub, [k]: n } as SewerHubStored['hub'] })} />
        </Group>
      ))}

      <div id="shared" style={{ borderTop: `3px solid ${BRAND.carmine}`, paddingTop: '1.5rem', marginTop: '2rem' }}>
        <h2 style={{ fontFamily: 'var(--font-outfit), system-ui, sans-serif', fontSize: '20px', color: ADMIN_COLORS.onSurface, margin: '0 0 0.75rem' }}>
          Shared across all 10 sewer pages
        </h2>
        <Notice tone="warn">
          Changes here go live on <strong>every sewer page</strong> (the hub and all 9 service pages) when the Sewer hub is published. They do not affect any other page on the site.
        </Notice>
        <Group title="Sewer services list" note="The list's order is the order of the rows on every service page (each page leaves itself out). The hub uses its own featured service and grid order, below.">
          <ValueEditor value={shared.services} keyName="services" label="Services" onChange={(n) => setShared({ services: n as SewerSharedContent['services'] })} />
          <Select label="Hub: featured service" value={shared.hubFeatured} options={options} onChange={(hubFeatured) => setShared({ hubFeatured })} />
          <Repeater<string>
            label="Hub: grid order"
            items={shared.hubOrder}
            onChange={(hubOrder) => setShared({ hubOrder })}
            newItem={() => options[0]?.value ?? ''}
            itemLabel={(_, i) => `Position ${i + 1}`}
            renderItem={(item, update) => <Select label="Service" value={item} options={options} onChange={update} />}
            addLabel="Add a service to the grid"
          />
          <ValueEditor value={shared.servicesHead} keyName="servicesHead" label="Service pages: heading above the rows" onChange={(n) => setShared({ servicesHead: n as SewerSharedContent['servicesHead'] })} />
          <ValueEditor value={shared.emergencyRow} keyName="emergencyRow" label="Service pages: the red Emergency row (its button dials the Global Settings number)" onChange={(n) => setShared({ emergencyRow: n as SewerSharedContent['emergencyRow'] })} />
          <TextInput label={humanize('learnMore')} value={shared.learnMore} onChange={(learnMore) => setShared({ learnMore })} />
        </Group>
        <Group title="No Drip Club box">
          <ValueEditor value={shared.ndc} keyName="ndc" label="" onChange={(n) => setShared({ ndc: n as SewerSharedContent['ndc'] })} />
        </Group>
        <Group title="Mobile sticky call bar" note="Shown at the bottom of the service pages on phones and tablets. {{phone}} in the screen-reader label is replaced with the phone number.">
          <ValueEditor value={shared.sticky} keyName="sticky" label="" onChange={(n) => setShared({ sticky: n as SewerSharedContent['sticky'] })} />
        </Group>
        <Group title="Service pages: contact rail" note="The call box (dials the Global Settings number), the trust list and the financing card beside every service page.">
          <ValueEditor value={shared.rail} keyName="rail" label="" onChange={(n) => setShared({ rail: n as SewerSharedContent['rail'] })} />
        </Group>
        <Group title="Service pages: quick links and breadcrumb">
          <ValueEditor value={shared.quickLinks} keyName="quickLinks" label="Quick-links bar" onChange={(n) => setShared({ quickLinks: n as SewerSharedContent['quickLinks'] })} />
          <ValueEditor value={shared.crumbParent} keyName="crumbParent" label="Breadcrumb parent" onChange={(n) => setShared({ crumbParent: n as SewerSharedContent['crumbParent'] })} />
        </Group>
        <Group title="Small shared labels">
          <TextInput label={humanize('badge24Label')} value={shared.badge24Label} onChange={(badge24Label) => setShared({ badge24Label })} />
          <ValueEditor value={shared.final} keyName="final" label="Final call to action (all pages)" onChange={(n) => setShared({ final: n as SewerSharedContent['final'] })} />
          <ValueEditor value={shared.review} keyName="review" label="Review cards (all pages)" onChange={(n) => setShared({ review: n as SewerSharedContent['review'] })} />
        </Group>
      </div>
    </>
  );
}

