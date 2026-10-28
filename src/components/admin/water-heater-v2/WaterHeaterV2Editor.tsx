'use client';

/**
 * Brief 222 — the water heater editor: `/admin/sub-service/<one of the 5 water heater slugs>` and
 * `/admin/water-heater` (the hub + "Shared across all 6 water heater pages").
 *
 * The Brief 204 model: every edit goes through VERSIONS — Save writes the open version, Preview opens it
 * under the preview cookie, Publish (sidebar) puts it live. Every word, link, image + alt, review, FAQ,
 * trust item, table cell and list item is editable; the LAYOUT is locked (the server refuses a change
 * with a 422). An OLD-SHAPED version (the "Pre-v2 archive (2026-10)", a legacy draft) opens read-only.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import PageAttributesSidebar, { SIDEBAR_WIDTH_PX } from '@/components/admin/PageAttributesSidebar';
import { usePageAttributesOpen } from '@/components/admin/PageAttributesSidebar/usePageAttributesOpen';
import { useDraftVersions } from '@/components/admin/PageAttributesSidebar/useDraftVersions';
import { useVersionStatusControl } from '@/components/admin/PageAttributesSidebar/useVersionStatusControl';
import { NodeList, panelTitle } from '@/components/admin/sewer-v2/TreeEditor';
import { ValueEditor } from '@/components/admin/sewer-v2/ValueEditor';
import { BRAND, Group, ImageInput, Notice, Repeater, TextInput } from '@/components/admin/sewer-v2/ui';
import { ADMIN_COLORS } from '@/lib/admin/theme';
import { SITE } from '@/lib/site';
import { COMPANY_RATING_TOKEN_HELP } from '@/lib/cms/tokens';
import type { SewerNode } from '@/lib/content/sewer-v2/types';
import type { WhHubStored, WhSection, WhSharedContent, WhStored, WhTreeNode } from '@/lib/content/water-heater-v2/types';
import {
  isWhV2DraftContent,
  whPathFor,
  whTemplateOf,
  WH_OLD_SHAPE_MESSAGE,
  WH_TEMPLATES,
  WH_TEMPLATE_LABEL,
  WH_V2_HUB_SLUG,
  type WhV2DraftContent,
} from '@/lib/water-heater-v2-cms/model';

interface Load {
  exists: boolean;
  status: string | null;
  version: number;
  updatedAt: string | null;
  content: WhV2DraftContent;
  source: 'row' | 'code';
}

const RHYTHM_NOTE = 'Layout locked. Sections alternate backgrounds (white / beige, with red and navy accent breaks), so sections can’t be added, removed or reordered.';

function legacyLines(v: unknown, path = '', out: [string, string][] = []): [string, string][] {
  if (typeof v === 'string' && v.trim()) out.push([path, v]);
  else if (Array.isArray(v)) v.forEach((x, i) => legacyLines(x, `${path}[${i}]`, out));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) legacyLines(x, path ? `${path}.${k}` : k, out);
  return out;
}

/** One node tree (a panel, the trust box) edited with the sewer tree editor. */
function Tree({ node, onChange }: { node: WhTreeNode; onChange: (n: WhTreeNode) => void }) {
  return <NodeList nodes={[node as unknown as SewerNode]} onChange={(next) => onChange(next[0] as unknown as WhTreeNode)} />;
}

function treeTitle(node: WhTreeNode): string {
  const n = node as unknown as SewerNode;
  return typeof n === 'object' && 'tag' in n ? panelTitle(n.kids ?? []) : '';
}

export default function WaterHeaterV2Editor({ slug }: { slug: string }) {
  const hub = slug === WH_V2_HUB_SLUG;
  const pageType = hub ? 'service' : 'sub-service';
  const publicPath = whPathFor(slug);
  const [load, setLoad] = useState<Load | null>(null);
  const [loadError, setLoadError] = useState('');
  const [content, setContent] = useState<WhV2DraftContent | null>(null);
  const [legacy, setLegacy] = useState<unknown>(null);
  const [formKey, setFormKey] = useState(0);
  const [attrsOpen, setAttrsOpen] = usePageAttributesOpen();
  const contentRef = useRef<unknown>(null);
  contentRef.current = legacy ?? (content ? { ...content, templateType: whTemplateOf(content) } : null);

  const dv = useDraftVersions(pageType, slug, () => contentRef.current, {
    onLoadContent: (c) => {
      if (isWhV2DraftContent(c)) {
        setLegacy(null);
        setContent(c);
      } else setLegacy(c ?? {});
      setFormKey((k) => k + 1);
    },
  });
  const statusCtl = useVersionStatusControl(dv, { path: publicPath });

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/cms/water-heater-v2/${slug}`)
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
  }, [slug]);

  const activeRow = dv.versions.find((v) => v.id === dv.activeId) ?? null;
  const activeIsOld = !!activeRow && !(WH_TEMPLATES as readonly (string | null)[]).includes(activeRow.template_type);
  const readOnly = legacy !== null;

  const [localNotice, setLocalNotice] = useState('');
  const save = useCallback(async () => {
    setLocalNotice('');
    if (readOnly) return setLocalNotice(WH_OLD_SHAPE_MESSAGE);
    if (activeIsOld || dv.activeId === null) await dv.saveAsNew(await dv.nextVersionName());
    else await dv.save();
  }, [readOnly, activeIsOld, dv]);
  const preview = useCallback(async () => {
    setLocalNotice('');
    if (readOnly) return setLocalNotice(WH_OLD_SHAPE_MESSAGE);
    if (activeIsOld) await dv.saveAsNew(await dv.nextVersionName());
    await dv.preview();
  }, [readOnly, activeIsOld, dv]);

  if (loadError) {
    return (
      <main style={{ padding: '2rem', fontFamily: 'var(--font-nunito), system-ui, sans-serif', color: ADMIN_COLORS.error }}>
        {loadError === 'not-found' ? `"${slug}" is not a water heater page.` : `Failed to load (${loadError}). Please refresh.`}
      </main>
    );
  }
  if (!load || !content) return <main style={{ padding: '2rem', color: ADMIN_COLORS.onSurfaceVariant }}>Loading…</main>;

  const set = (patch: Partial<WhV2DraftContent>) => setContent((c) => (c ? { ...c, ...patch } : c));
  const body = content.whV2;
  const template = whTemplateOf(content);
  const title = hub ? 'Water Heater Services (hub)' : body.hero.crumb || slug;
  const setBody = (next: WhStored | WhHubStored) => set({ whV2: next });

  return (
    <>
      <AdminPageHeader
        title={title}
        templateName={WH_TEMPLATE_LABEL[template]}
        status={dv.liveVersion ? 'published' : 'draft'}
        pageAttributesOpen={attrsOpen}
        onTogglePageAttributes={() => setAttrsOpen(!attrsOpen)}
        draftVersions={{
          busy: dv.busy,
          notice: localNotice || dv.notice,
          noticeIsError: !!localNotice || dv.noticeIsError,
          onSave: save,
          onPreview: preview,
          onSaveAsNew: (label: string) => (readOnly ? setLocalNotice(WH_OLD_SHAPE_MESSAGE) : dv.saveAsNew(label)),
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
          {hub ? (
            <>This is the <strong>Water Heater Services hub</strong> (<a href={publicPath} target="_blank" rel="noreferrer" style={{ color: BRAND.cream }}>{publicPath}</a>) and, further down, the sections <strong>shared across all 6 water heater pages</strong>. </>
          ) : (
            <>Editing <a href={publicPath} target="_blank" rel="noreferrer" style={{ color: BRAND.cream }}>{publicPath}</a> — {WH_TEMPLATE_LABEL[template]}. </>
          )}
          Words, links, photos and list items are editable; the layout is fixed. Save writes the open version; Preview shows it before anyone else sees it; Publish (Status in the sidebar) puts it live. Phone numbers are always {'{{phone}}'}.
          {!load.exists && <> <strong>This page has no CMS row yet</strong> — the deploy seed creates it; until then the live page shows the built-in copy.</>}
        </Notice>

        {readOnly ? (
          <>
            <Notice tone="warn">
              <strong>{WH_OLD_SHAPE_MESSAGE}</strong> It is kept for reference: pick a water heater version from <em>Version</em> in the sidebar to edit the page.
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
            <PageFields value={body} onChange={setBody} hub={hub} />
            {hub && <SharedFields value={(body as WhHubStored).shared} onChange={(shared) => setBody({ ...(body as WhHubStored), shared })} />}
          </div>
        )}
      </div>

      {statusCtl.modal}
      <PageAttributesSidebar
        title={title}
        updatedAt={load.updatedAt ?? undefined}
        template={{ value: template, label: WH_TEMPLATE_LABEL[template], options: [{ value: template, label: WH_TEMPLATE_LABEL[template] }] }}
        version={{
          activeId: dv.activeId,
          activeLabel: dv.activeLabel,
          versions: dv.versions,
          busy: dv.busy,
          currentUserId: dv.currentUserId,
          onSwitch: dv.switchTo,
          onPublish: dv.publish,
          onDelete: dv.remove,
          onSaveAsNew: (label: string) => (readOnly ? setLocalNotice(WH_OLD_SHAPE_MESSAGE) : dv.saveAsNew(label)),
          nextVersionName: dv.nextVersionName,
          ...statusCtl.versionProps,
        }}
        slug={{ value: slug, editable: false, disabledNote: "This page's URL is fixed.", permalink: `${SITE.baseUrl}${publicPath}` }}
        parent={{ label: 'Water Heater Services', editable: false, value: WH_V2_HUB_SLUG, options: [], onChange: () => {} }}
        open={attrsOpen}
        onClose={() => setAttrsOpen(false)}
      />
    </>
  );
}

// ── the page ──────────────────────────────────────────────────────────────────────

function PageFields({ value, onChange, hub }: { value: WhStored; onChange: (v: WhStored) => void; hub: boolean }) {
  const h = value.hero;
  const setHero = (patch: Partial<WhStored['hero']>) => onChange({ ...value, hero: { ...h, ...patch } });
  const setSection = (i: number, s: WhSection) => onChange({ ...value, sections: value.sections.map((x, y) => (y === i ? s : x)) });
  const rail = value.rail;
  return (
    <>
      <Group title="Hero" note="The page has ONE heading for Google and screen readers (the hidden H1 below). The visible headline is the lead text followed by the market names, which rotate.">
        {!hub && <TextInput label="Breadcrumb label" value={h.crumb} onChange={(crumb) => setHero({ crumb })} />}
        <TextInput label="Eyebrow" value={h.eyebrow} onChange={(eyebrow) => setHero({ eyebrow })} />
        <TextInput label="H1 (hidden heading Google reads)" value={h.h1} onChange={(h1) => setHero({ h1 })} />
        <TextInput label="Visible headline — lead (ends with a space)" value={h.lead} onChange={(lead) => setHero({ lead })} />
        <Repeater<string>
          label="Visible headline — rotating market names"
          items={h.words}
          onChange={(words) => setHero({ words })}
          newItem={() => ''}
          itemLabel={(w, i) => `${i + 1}${w ? ` — ${w}` : ''}`}
          renderItem={(w, update) => <TextInput label="Market name" value={w} onChange={update} />}
          max={4}
          addLabel="Add a market name"
        />
        <TextInput label="Intro" value={h.intro} onChange={(intro) => setHero({ intro })} multiline />
        <ImageInput label="Hero photo" src={h.image.src} alt={h.image.alt} onSrc={(src) => setHero({ image: { ...h.image, src } })} onAlt={(alt) => setHero({ image: { ...h.image, alt } })} />
      </Group>

      {value.sections.map((s, i) => (
        <SectionFields key={i} section={s} onChange={(n) => setSection(i, n)} />
      ))}

      {rail && (
        <Group title="Side rail (this page)" note="The Emergency card and the financing copy are shared (edit them on the hub). The trust box is this page’s: the first item is the service-specific review count.">
          {rail.toc && (
            <>
              <TextInput label="“On this page” title" value={rail.toc.label} onChange={(label) => onChange({ ...value, rail: { ...rail, toc: { ...rail.toc!, label } } })} />
              {rail.toc.items.map((t, i) => (
                <TextInput
                  key={t.href}
                  label={`Link ${i + 1} (goes to ${t.href})`}
                  value={t.label}
                  onChange={(label) => onChange({ ...value, rail: { ...rail, toc: { ...rail.toc!, items: rail.toc!.items.map((x, y) => (y === i ? { ...x, label } : x)) } } })}
                />
              ))}
            </>
          )}
          <Tree node={rail.trust} onChange={(trust) => onChange({ ...value, rail: { ...rail, trust } })} />
        </Group>
      )}

      <Group title="Structured data for Google (Service)" note="Describes this page’s service to search engines. The FAQ structured data is built from the visible FAQ automatically.">
        <TextInput label="Service name" value={value.service.name} onChange={(name) => onChange({ ...value, service: { ...value.service, name } })} />
        <TextInput label="Service type" value={value.service.serviceType} onChange={(serviceType) => onChange({ ...value, service: { ...value.service, serviceType } })} />
        <TextInput label="Description" value={value.service.description} onChange={(description) => onChange({ ...value, service: { ...value.service, description } })} multiline />
        <TextInput label="Audience" value={value.service.audienceType} onChange={(audienceType) => onChange({ ...value, service: { ...value.service, audienceType } })} />
        {value.service.catalog && (
          <>
            <TextInput label="Catalog name" value={value.service.catalog.name} onChange={(name) => onChange({ ...value, service: { ...value.service, catalog: { ...value.service.catalog!, name } } })} />
            {value.service.catalog.items.map((it, i) => (
              <TextInput
                key={it.url}
                label={`Catalog item ${i + 1} (${it.url})`}
                value={it.name}
                onChange={(name) => onChange({ ...value, service: { ...value.service, catalog: { ...value.service.catalog!, items: value.service.catalog!.items.map((x, y) => (y === i ? { ...x, name } : x)) } } })}
              />
            ))}
          </>
        )}
      </Group>
    </>
  );
}

function SectionFields({ section, onChange }: { section: WhSection; onChange: (s: WhSection) => void }) {
  switch (section.kind) {
    case 'panel':
      return (
        <Group title={`Section: ${treeTitle(section.el) || 'untitled'}`} note={RHYTHM_NOTE}>
          <Tree node={section.el} onChange={(el) => onChange({ ...section, el })} />
        </Group>
      );
    case 'reviews':
      return (
        <Group title="Reviews (this page only)" note={<>The rating card beside the heading is shared (on the hub) and shows the live Google rating. Leave a reviewer’s link blank until a real Google review link exists — the name is then not linked.</>}>
          <TextInput label="Eyebrow" value={section.eyebrow} onChange={(eyebrow) => onChange({ ...section, eyebrow })} />
          <TextInput label="Heading" value={section.heading} onChange={(heading) => onChange({ ...section, heading })} />
          <ValueEditor value={section.items} keyName="items" label="Reviews" onChange={(items) => onChange({ ...section, items: items as typeof section.items })} />
          {section.layout === 'spoke' &&
            (section.gallery ? (
              <div style={{ borderLeft: `2px solid ${BRAND.carmine}55`, paddingLeft: '0.75rem', marginTop: '1rem' }}>
                <TextInput label="Photo gallery on the first review — screen-reader label" value={section.gallery.label} onChange={(label) => onChange({ ...section, gallery: { ...section.gallery!, label } })} />
                <Repeater<{ src: string; alt: string }>
                  label="Photos from this job (2 to 12)"
                  items={section.gallery.photos}
                  onChange={(photos) => onChange({ ...section, gallery: { ...section.gallery!, photos } })}
                  newItem={() => ({ src: '', alt: '' })}
                  itemLabel={(p, i) => `${i + 1}${p.alt ? ` — ${p.alt.slice(0, 48)}` : ''}`}
                  renderItem={(p, update) => <ImageInput label="Photo" src={p.src} alt={p.alt} onSrc={(src) => update({ ...p, src })} onAlt={(alt) => update({ ...p, alt })} />}
                  min={2}
                  max={12}
                  addLabel="Add a photo"
                />
                <button type="button" onClick={() => onChange({ ...section, gallery: null })} style={{ marginTop: '0.5rem', background: 'none', border: `1px solid ${ADMIN_COLORS.outlineVariant}`, color: ADMIN_COLORS.onSurface, borderRadius: 6, padding: '0.35rem 0.75rem', cursor: 'pointer' }}>
                  Remove the photo gallery
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onChange({ ...section, gallery: { label: 'Review with photos from this job', photos: [{ src: '', alt: '' }, { src: '', alt: '' }] } })}
                style={{ marginTop: '0.75rem', background: 'none', border: `1px solid ${ADMIN_COLORS.outlineVariant}`, color: ADMIN_COLORS.onSurface, borderRadius: 6, padding: '0.35rem 0.75rem', cursor: 'pointer' }}
              >
                Add a photo gallery to the first review
              </button>
            ))}
        </Group>
      );
    case 'faq':
      return (
        <Group title="Frequently asked questions" note="Google’s FAQ structured data is built from these questions and their full answers, so the two always match.">
          <TextInput label="Eyebrow" value={section.eyebrow} onChange={(eyebrow) => onChange({ ...section, eyebrow })} />
          <TextInput label="Heading" value={section.heading} onChange={(heading) => onChange({ ...section, heading })} />
          <ValueEditor value={section.items} keyName="items" label="Questions" onChange={(items) => onChange({ ...section, items: items as typeof section.items })} />
        </Group>
      );
    case 'services':
      return (
        <Group title="Other Water Heater Services (this page)" note="The red Emergency row is always last; its button dials the Global Settings number.">
          <TextInput label="Eyebrow" value={section.eyebrow} onChange={(eyebrow) => onChange({ ...section, eyebrow })} />
          <TextInput label="Heading" value={section.heading} onChange={(heading) => onChange({ ...section, heading })} />
          <ValueEditor value={section.items} keyName="items" label="Service rows" onChange={(items) => onChange({ ...section, items: items as typeof section.items })} />
          <ValueEditor value={section.emergency} keyName="emergency" label="Emergency row" onChange={(emergency) => onChange({ ...section, emergency: emergency as typeof section.emergency })} />
        </Group>
      );
    case 'financing':
      return (
        <Group title="Financing panel" note="The copy is the shared, fixed financing copy (edit it on the hub). Never name a lender.">
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: ADMIN_COLORS.onSurface, fontFamily: 'var(--font-nunito), system-ui, sans-serif' }}>
            <input type="checkbox" checked={section.enabled} onChange={(e) => onChange({ ...section, enabled: e.target.checked })} />
            Show the financing panel on this page
          </label>
        </Group>
      );
  }
}

// ── shared ────────────────────────────────────────────────────────────────────────

function SharedFields({ value, onChange }: { value: WhSharedContent; onChange: (v: WhSharedContent) => void }) {
  const set = (patch: Partial<WhSharedContent>) => onChange({ ...value, ...patch });
  return (
    <div id="shared" style={{ borderTop: `3px solid ${BRAND.carmine}`, paddingTop: '1.5rem', marginTop: '2rem' }}>
      <h2 style={{ fontFamily: 'var(--font-outfit), system-ui, sans-serif', fontSize: '20px', color: ADMIN_COLORS.onSurface, margin: '0 0 0.75rem' }}>Shared across all 6 water heater pages</h2>
      <Notice tone="warn">
        Changes here go live on <strong>every water heater page</strong> (the hub and all 5 service pages) when the hub is published. They do not affect any other page — not even the sewer pages.
      </Notice>
      <Group title="Rating card" note={<>The rating and review count come from Google every day (Brief 221). {COMPANY_RATING_TOKEN_HELP} Never type the numbers.</>}>
        <ValueEditor value={value.proof} keyName="proof" label="" onChange={(proof) => set({ proof: proof as WhSharedContent['proof'] })} />
      </Group>
      <Group title="Emergency card (service pages’ rail)">
        <ValueEditor value={value.call} keyName="call" label="" onChange={(call) => set({ call: call as WhSharedContent['call'] })} />
      </Group>
      <Group title="Financing copy (rail card and in-page panel)" note="Fixed copy: never name a lender. Commercial has no financing.">
        <ValueEditor value={value.financing} keyName="financing" label="" onChange={(financing) => set({ financing: financing as WhSharedContent['financing'] })} />
      </Group>
      <Group title="Mobile sticky call bar" note="{{phone}} in the screen-reader label is replaced with the phone number.">
        <ValueEditor value={value.sticky} keyName="sticky" label="" onChange={(sticky) => set({ sticky: sticky as WhSharedContent['sticky'] })} />
      </Group>
      <Group title="Quick links and breadcrumb">
        <ValueEditor value={value.quickLinks} keyName="quickLinks" label="Quick links (hub pills / service-page bar)" onChange={(quickLinks) => set({ quickLinks: quickLinks as WhSharedContent['quickLinks'] })} />
        <TextInput label="Breadcrumb parent label" value={value.crumbParent.label} onChange={(label) => set({ crumbParent: { ...value.crumbParent, label } })} />
      </Group>
      <Group title="Small shared labels">
        <TextInput label="“24 hours” badge — screen-reader label" value={value.badge24Label} onChange={(badge24Label) => set({ badge24Label })} />
        <ValueEditor value={value.review} keyName="review" label="Review cards" onChange={(review) => set({ review: review as WhSharedContent['review'] })} />
      </Group>
    </div>
  );
}
