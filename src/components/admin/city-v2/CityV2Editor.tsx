'use client';

/**
 * City v2 editor (Brief 209 CMS wiring, 2026-10-14) — the 145 City Service Pages V2
 * (`/admin/city-service/{city}/{service}`) and the 5 City Hubs V2 (`/admin/city/{city}`: the hub, its
 * template sections, and the parts the city's 29 service pages share).
 *
 * Built from the Sewer v2 editor's parts (Brief 204) and with its rules: every edit goes through
 * VERSIONS (Save writes the open version, Preview shows it under the preview cookie, Publish in the
 * sidebar puts it live through publishDraft); the layout is locked — words, links, photos and list
 * items change, panels never; an old-shaped version (the "Pre-v2 archive (2026-10)", a legacy draft)
 * opens read-only and the server refuses to save or publish it on these pages.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import PageAttributesSidebar, { SIDEBAR_WIDTH_PX } from '@/components/admin/PageAttributesSidebar';
import { usePageAttributesOpen } from '@/components/admin/PageAttributesSidebar/usePageAttributesOpen';
import { useDraftVersions } from '@/components/admin/PageAttributesSidebar/useDraftVersions';
import { useVersionStatusControl } from '@/components/admin/PageAttributesSidebar/useVersionStatusControl';
import { ADMIN_COLORS } from '@/lib/admin/theme';
import { SITE } from '@/lib/site';
import type { CityServiceStored } from '@/lib/content/city-services-v2/types';
import type { CityHubStored } from '@/lib/content/city-hubs/stored';
import { CITY_V2_LABEL, CITY_V2_TEMPLATE, isCityV2DraftContent, OLD_SHAPE_MESSAGE, type CityV2DraftContent } from '@/lib/city-v2-cms/model';
import { NodeList, panelTitle } from '@/components/admin/sewer-v2/TreeEditor';
import { ValueEditor } from '@/components/admin/sewer-v2/ValueEditor';
import { BRAND, Group, Notice, TextInput } from '@/components/admin/sewer-v2/ui';

type Kind = 'service' | 'hub';

interface Load {
  exists: boolean;
  status: string | null;
  version: number;
  updatedAt: string | null;
  content: CityV2DraftContent;
  source: 'row' | 'code';
}

/** Rich-text keys of the hub and shared sections (the service pages' rich text lives in the panels). */
const RICH = new Set(['body', 'a', 'ndc']);

const CITY_NAMES: Record<string, string> = {
  northbrook: 'Northbrook', columbus: 'Columbus', 'tinley-park': 'Tinley Park', joliet: 'Joliet', naperville: 'Naperville',
};

/** Words of an old-shaped version, for the read-only view (every string, labelled by its path). */
function legacyLines(v: unknown, path = '', out: [string, string][] = []): [string, string][] {
  if (typeof v === 'string' && v.trim()) out.push([path, v]);
  else if (Array.isArray(v)) v.forEach((x, i) => legacyLines(x, `${path}[${i}]`, out));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) legacyLines(x, path ? `${path}.${k}` : k, out);
  return out;
}

export default function CityV2Editor({ kind, city, service }: { kind: Kind; city: string; service?: string }) {
  const pageType = kind === 'hub' ? 'city' : 'city-service';
  const slug = kind === 'hub' ? city : `${city}/${service}`;
  const publicPath = `/${slug}`;
  const cityName = CITY_NAMES[city] ?? city;
  const [load, setLoad] = useState<Load | null>(null);
  const [loadError, setLoadError] = useState('');
  const [content, setContent] = useState<CityV2DraftContent | null>(null);
  /** The open version's content when it is old-shaped (read-only); null when it is a v2 version. */
  const [legacy, setLegacy] = useState<unknown>(null);
  const [formKey, setFormKey] = useState(0);
  const [attrsOpen, setAttrsOpen] = usePageAttributesOpen();
  const contentRef = useRef<unknown>(null);
  contentRef.current = legacy ?? (content ? { ...content, templateType: CITY_V2_TEMPLATE } : null);

  const dv = useDraftVersions(pageType, slug, () => contentRef.current, {
    onLoadContent: (c) => {
      if (isCityV2DraftContent(c)) {
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
    fetch(`/api/cms/city-v2?type=${pageType}&slug=${encodeURIComponent(slug)}`)
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
    return () => {
      cancelled = true;
    };
  }, [pageType, slug]);

  const activeRow = dv.versions.find((v) => v.id === dv.activeId) ?? null;
  // A version is v2 when it was saved by this editor (template_type 'city-v2'); anything else is old-shaped.
  const activeIsOld = !!activeRow && activeRow.template_type !== CITY_V2_TEMPLATE;
  const readOnly = legacy !== null;

  const [localNotice, setLocalNotice] = useState('');
  const save = useCallback(async () => {
    setLocalNotice('');
    if (readOnly) {
      setLocalNotice(OLD_SHAPE_MESSAGE);
      return;
    }
    // The open version is old-shaped (e.g. the live legacy snapshot, before the seed ran): v2 content
    // can't be written into it, so the edit is saved as a NEW version instead.
    if (activeIsOld || dv.activeId === null) await dv.saveAsNew(await dv.nextVersionName());
    else await dv.save();
  }, [readOnly, activeIsOld, dv]);
  const preview = useCallback(async () => {
    setLocalNotice('');
    if (readOnly) {
      setLocalNotice(OLD_SHAPE_MESSAGE);
      return;
    }
    if (activeIsOld) await dv.saveAsNew(await dv.nextVersionName());
    await dv.preview();
  }, [readOnly, activeIsOld, dv]);

  if (loadError) {
    return (
      <main style={{ padding: '2rem', fontFamily: 'var(--font-nunito), system-ui, sans-serif', color: ADMIN_COLORS.error }}>
        {loadError === 'not-found' ? `"${slug}" is not a City v2 page.` : `Failed to load (${loadError}). Please refresh.`}
      </main>
    );
  }
  if (!load || !content) return <main style={{ padding: '2rem', color: ADMIN_COLORS.onSurfaceVariant }}>Loading…</main>;

  const set = (patch: Partial<CityV2DraftContent>) => setContent((c) => (c ? { ...c, ...patch } : c));
  const title = kind === 'hub' ? `${cityName} (city hub)` : (content.cityV2 as CityServiceStored).hero?.heading ?? slug;
  const hubLink = `/admin/city/${city}#shared`;

  return (
    <>
      <AdminPageHeader
        title={title}
        templateName={CITY_V2_LABEL}
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
            <>
              This is the <strong>{cityName} city hub</strong> (<a href={publicPath} target="_blank" rel="noreferrer" style={{ color: BRAND.cream }}>{publicPath}</a>) and, further down, the sections{' '}
              <strong>shared across {cityName}&rsquo;s 29 service pages</strong>.{' '}
            </>
          ) : (
            <>
              Editing <a href={publicPath} target="_blank" rel="noreferrer" style={{ color: BRAND.cream }}>{publicPath}</a>.{' '}
            </>
          )}
          Words, links, photos and list items are editable; the layout is fixed. Save writes the open version; Preview shows it before anyone else sees it; Publish (Status in the
          sidebar) puts it live. Type {'{{phone}}'} wherever the phone number should appear.
          {!load.exists && (
            <>
              {' '}
              <strong>This page has no CMS row yet</strong> — the deploy seed creates it; until then the live page shows the built-in copy.
            </>
          )}
        </Notice>

        {readOnly ? (
          <>
            <Notice tone="warn">
              <strong>{OLD_SHAPE_MESSAGE}</strong> It is kept for reference: pick a {CITY_V2_LABEL} version from <em>Version</em> in the sidebar to edit the page.
            </Notice>
            <Group title={`Read-only: “${activeRow?.label ?? 'old version'}”`} note="Every piece of text this old version holds, as stored.">
              {legacyLines(legacy)
                .slice(0, 400)
                .map(([p, v], i) => (
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
              <ServiceFields value={content.cityV2 as CityServiceStored} onChange={(cityV2) => set({ cityV2 })} hubLink={hubLink} cityName={cityName} />
            ) : (
              <HubFields value={content.cityV2 as CityHubStored} onChange={(cityV2) => set({ cityV2 })} cityName={cityName} />
            )}
          </div>
        )}
      </div>

      {statusCtl.modal}
      <PageAttributesSidebar
        title={title}
        updatedAt={load.updatedAt ?? undefined}
        template={{ value: CITY_V2_TEMPLATE, label: CITY_V2_LABEL, options: [{ value: CITY_V2_TEMPLATE, label: CITY_V2_LABEL }] }}
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
        parent={{ label: kind === 'hub' ? 'Locations' : cityName, editable: false, value: kind === 'hub' ? 'locations' : city, options: [], onChange: () => {} }}
        open={attrsOpen}
        onClose={() => setAttrsOpen(false)}
      />
    </>
  );
}

// ── a service page ────────────────────────────────────────────────────────────────

function ServiceFields({
  value,
  onChange,
  hubLink,
  cityName,
}: {
  value: CityServiceStored;
  onChange: (v: CityServiceStored) => void;
  hubLink: string;
  cityName: string;
}) {
  return (
    <>
      <Group title="Hero">
        <ValueEditor value={value.hero} keyName="hero" label="" onChange={(hero) => onChange({ ...value, hero: hero as CityServiceStored['hero'] })} />
      </Group>
      {value.sections.map((s, i) => {
        if (s.kind === 'ndc') {
          return (
            <Group
              key={s.id}
              title="No Drip Club"
              note={
                <>
                  The No Drip Club box is <strong>shared by all of {cityName}&rsquo;s service pages</strong> (this page uses its{' '}
                  {s.variant === 'sewer' ? 'sewer' : 'general'} wording) — edit it in{' '}
                  <a href={hubLink} style={{ color: BRAND.cream }}>
                    the {cityName} hub editor
                  </a>
                  .
                </>
              }
            />
          );
        }
        return (
          <Group key={s.id} title={`Panel: ${panelTitle(s.body) || s.id}`} note={s.cls.includes('ss-tint') ? 'Tinted panel — layout locked.' : 'Layout locked.'}>
            <NodeList
              nodes={s.body}
              onChange={(body) => onChange({ ...value, sections: value.sections.map((x, y) => (y === i && x.kind === 'panel' ? { ...x, body } : x)) })}
            />
          </Group>
        );
      })}
      <Group title="Service details for Google (schema.org Service)" note="Describes this service to search engines. The page address and the phone number are filled in automatically.">
        <ValueEditor
          value={value.serviceSchema}
          keyName="serviceSchema"
          label=""
          onChange={(serviceSchema) => onChange({ ...value, serviceSchema: serviceSchema as CityServiceStored['serviceSchema'] })}
        />
      </Group>
      <Group
        title="Shared sections"
        note={
          <>
            The breadcrumb parent, quick links, contact rail (call box, trust list, financing card), mobile sticky bar and No Drip Club box are{' '}
            <strong>shared across {cityName}&rsquo;s 29 service pages</strong>: edit them once in{' '}
            <a href={hubLink} style={{ color: BRAND.cream }}>
              the {cityName} hub editor
            </a>
            .
          </>
        }
      />
    </>
  );
}

// ── the hub + its template sections + the shared service-page parts ────────────────

const HUB_GROUPS: [keyof CityHubStored['hub'], string][] = [
  ['hero', 'Hero'],
  ['trust', 'Trust stripe'],
  ['services', 'Services'],
  ['office', 'Office'],
  ['depth', 'Local knowledge'],
  ['reviews', 'Reviews (exactly three: one featured, two beside it)'],
  ['faq', 'Frequently asked questions'],
  ['ndc', 'No Drip Club sentence'],
  ['final', 'Final call to action'],
];

const HUB_SHARED_GROUPS: [keyof CityHubStored['hubShared'], string][] = [
  ['heroPills', 'Hero quick links'],
  ['fin', 'Financing band'],
  ['why', 'Why J. Blanton'],
  ['video', 'Video section'],
  ['videoJsonLd', 'Video details for Google (VideoObject)'],
  ['bbb', 'BBB box beside the reviews'],
  ['ndc', 'No Drip Club box'],
  ['stripe', 'Service directory ("Explore all our plumbing services")'],
];

const HUB_SHARED_LABELS: (keyof CityHubStored['hubShared'])[] = [
  'heroPillsLabel', 'badge24Label', 'trustLabel', 'servicesEyebrow', 'officeSchedule', 'depthEyebrow', 'reviewsProofLabel', 'verified', 'readOnGoogle',
  'faqEyebrow', 'finalSchedule', 'stripeTitle',
];

const SHARED_GROUPS: [keyof CityHubStored['shared'], string, string?][] = [
  ['crumbParent', 'Breadcrumb parent'],
  ['quickLinks', 'Quick-links bar'],
  ['rail', 'Contact rail', 'The call box (dials the Global Settings number), the trust list and the financing card beside every service page.'],
  ['sticky', 'Mobile sticky call bar', 'Shown at the bottom of the service pages on phones and tablets. {{phone}} in the screen-reader label is replaced with the phone number.'],
  ['ndc', 'No Drip Club box', 'The general wording shows on most service pages; the sewer wording on the 8 sewer service pages.'],
];

function HubFields({ value, onChange, cityName }: { value: CityHubStored; onChange: (v: CityHubStored) => void; cityName: string }) {
  const hub = value.hub;
  const hs = value.hubShared;
  const shared = value.shared;
  return (
    <>
      {HUB_GROUPS.map(([k, label]) => (
        <Group key={k} title={label}>
          <ValueEditor value={hub[k]} keyName={k} label="" rich={RICH} onChange={(n) => onChange({ ...value, hub: { ...hub, [k]: n } as CityHubStored['hub'] })} />
        </Group>
      ))}

      <div style={{ borderTop: `3px solid ${BRAND.cerulean}`, paddingTop: '1.5rem', marginTop: '2rem' }}>
        <h2 style={{ fontFamily: 'var(--font-outfit), system-ui, sans-serif', fontSize: '20px', color: ADMIN_COLORS.onSurface, margin: '0 0 0.75rem' }}>
          Hub template sections
        </h2>
        <Notice>These are the hub-template sections (financing band, Why J. Blanton, video, service directory…). Changes here affect the {cityName} hub only.</Notice>
        {HUB_SHARED_GROUPS.map(([k, label]) => (
          <Group key={k} title={label}>
            <ValueEditor value={hs[k]} keyName={k} label="" rich={RICH} onChange={(n) => onChange({ ...value, hubShared: { ...hs, [k]: n } as CityHubStored['hubShared'] })} />
          </Group>
        ))}
        <Group title="Small labels">
          {HUB_SHARED_LABELS.map((k) => (
            <ValueEditor key={k} value={hs[k]} keyName={k} rich={RICH} onChange={(n) => onChange({ ...value, hubShared: { ...hs, [k]: n } as CityHubStored['hubShared'] })} />
          ))}
        </Group>
      </div>

      <div id="shared" style={{ borderTop: `3px solid ${BRAND.carmine}`, paddingTop: '1.5rem', marginTop: '2rem' }}>
        <h2 style={{ fontFamily: 'var(--font-outfit), system-ui, sans-serif', fontSize: '20px', color: ADMIN_COLORS.onSurface, margin: '0 0 0.75rem' }}>
          Shared across {cityName}&rsquo;s 29 service pages
        </h2>
        <Notice tone="warn">
          Changes here go live on <strong>every {cityName} service page</strong> when this hub is published. They do not affect any other city or page.
        </Notice>
        {SHARED_GROUPS.map(([k, label, note]) => (
          <Group key={k} title={label} note={note}>
            <ValueEditor value={shared[k]} keyName={k} label="" rich={RICH} onChange={(n) => onChange({ ...value, shared: { ...shared, [k]: n } as CityHubStored['shared'] })} />
          </Group>
        ))}
        <Group title="Small shared labels">
          <ValueEditor
            value={shared.badge24Label}
            keyName="badge24Label"
            rich={RICH}
            onChange={(n) => onChange({ ...value, shared: { ...shared, badge24Label: n as string } })}
          />
        </Group>
      </div>
    </>
  );
}
