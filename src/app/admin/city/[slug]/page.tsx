'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import MetaSection from '@/components/admin/MetaSection';
import ImageUploaderField from '@/components/admin/ImageUploaderField';
import TemplateSwitcher from '@/components/admin/TemplateSwitcher';
import PageAttributesSidebar from '@/components/admin/PageAttributesSidebar';
import { usePageAttributesOpen } from '@/components/admin/PageAttributesSidebar/usePageAttributesOpen';
import { useDraftVersions } from '@/components/admin/PageAttributesSidebar/useDraftVersions';
import { useVersionStatusControl } from '@/components/admin/PageAttributesSidebar/useVersionStatusControl';
import BlockShell from '@/components/admin/BlockShell';
import BlockInserter from '@/components/admin/BlockInserter';
import BlockField from '@/components/admin/BlockField';
import { BLOCK_CATALOGUE, defaultDataFor, type BlockType } from '@/lib/cms/block-catalogue';
import {
  type CityV2BlockInstance,
  CITY_V2_BLOCK_ORDER,
  normalizeCityV2Blocks,
  newCityV2BlockId,
} from '@/lib/cms/city-v2-blocks';
import { ADMIN_COLORS, ADMIN_SHADOWS } from '@/lib/admin/theme';
import { SITE } from '@/lib/site';

const CITY_TEMPLATES = ['coverage-area', 'local-office', 'local-office-v2'];

interface FaqField {
  question: string;
  answer: string;
}

interface FormState {
  templateType: string;
  heroImage: string;
  heroHeadingLine1: string;
  heroHeadingLine2: string;
  heroCallout: string;
  heroDescription: string;
  // Dual meaning by template (Brief 95, A.2): on `local-office` this is the
  // rendered "Why J. Blanton" heading; on `coverage-area` it is a legacy/unused
  // column — that template's heading is intentionally hard-coded, see
  // `CoverageAreaCityFields` above.
  contentHeading: string;
  contentBody: string;
  f2Heading: string;
  f2Body: string;
  faqs: FaqField[];
  metaTitle: string;
  metaDescription: string;
  // Brief 99 (Track D): City V2's fixed-position flat fields (trustBarStars,
  // mostRequestedServices, whyPoints, videoHeading, reviews, ndcIntro,
  // finalCtaHeading, etc.) are replaced by this per-instance block array —
  // the same `{id,type,data}` model Brief 90 gave sub-service. Only meaningful
  // when `templateType === 'local-office-v2'`; empty for V1 templates.
  blocks: CityV2BlockInstance[];
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
  blocks: [],
};

/** Form keys that hold a plain string value (excludes arrays + templateType). */
type StringFieldKey = keyof Omit<FormState, 'faqs' | 'templateType' | 'blocks'>;

// ── Shared styles ────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  display: 'block', width: '100%', padding: '0.4rem 0.5rem',
  border: `1px solid ${ADMIN_COLORS.outlineVariant}66`, borderRadius: '0.5rem', marginBottom: '1rem',
  fontFamily: 'inherit', fontSize: '0.9rem', boxSizing: 'border-box',
  background: ADMIN_COLORS.surfaceContainerLow, color: ADMIN_COLORS.onSurface,
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontWeight: 600, marginBottom: '0.25rem',
  fontSize: '13px', color: ADMIN_COLORS.onSurface,
};

const sectionStyle: React.CSSProperties = {
  marginBottom: '1.5rem', padding: '1.5rem', borderRadius: '1.5rem',
  background: ADMIN_COLORS.surfaceContainerLow, border: `1px solid ${ADMIN_COLORS.outlineVariant}33`,
  boxShadow: ADMIN_SHADOWS.elegant,
};

const h2Style: React.CSSProperties = {
  fontWeight: 700, fontSize: '14px', marginBottom: '1rem', color: ADMIN_COLORS.onSurface,
  fontFamily: 'var(--font-outfit), system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.1em',
};

// Shared repeater-card style — the FAQs section (below, all templates).
const repeaterCardStyle: React.CSSProperties = {
  background: ADMIN_COLORS.surfaceContainer, border: `1px solid ${ADMIN_COLORS.outlineVariant}33`, borderRadius: '1rem',
  padding: '1rem', marginBottom: '0.75rem', boxShadow: ADMIN_SHADOWS.sm,
};

// ── Missing field indicator ──────────────────────────────────────────────────

function MissingIndicator() {
  return (
    <span style={{ color: ADMIN_COLORS.error, fontWeight: 600, fontSize: '0.8rem', marginLeft: '0.4rem' }}>
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
      {note && <span style={{ fontWeight: 400, color: ADMIN_COLORS.onSurfaceVariant }}> {note}</span>}
      {isMissing && <MissingIndicator />}
    </label>
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
        <ImageUploaderField label="Hero Image" value={form.heroImage} onChange={v => setField('heroImage', v)} />
        <FieldLabel label="Hero Heading — Line 1" fieldKey="hero_heading_line1" missing={missing} />
        <input style={inputStyle} value={form.heroHeadingLine1} onChange={e => setField('heroHeadingLine1', e.target.value)} />
        <FieldLabel label="Hero Callout" fieldKey="hero_callout" missing={missing} note="(italic text below the heading)" />
        <textarea style={{ ...inputStyle, minHeight: '60px' }} value={form.heroCallout} onChange={e => setField('heroCallout', e.target.value)} />
      </div>

      <div style={sectionStyle}>
        <h2 style={h2Style}>We&rsquo;ve Got You Covered</h2>
        {/* Brief 95 (A.2): no Heading field here on purpose — the "WE'VE GOT YOU
            COVERED, {City}" heading is a templated SEO/geo pattern, not editable
            copy. The `content_heading` column this template's Heading field used
            to write to is the SAME column `LocalOfficeCityFields` uses for its
            Why-J.-Blanton heading below, so wiring a Coverage-Area heading here
            would collide with that unrelated meaning. If a per-city editable
            heading is wanted, add a new template-specific column instead. */}
        <FieldLabel label="Body" fieldKey="content_body" missing={missing} />
        <textarea style={{ ...inputStyle, minHeight: '120px' }} value={form.contentBody} onChange={e => setField('contentBody', e.target.value)} />
      </div>

      <div style={sectionStyle}>
        <h2 style={h2Style}>Second Content Block</h2>
        <p style={{ fontSize: '12px', color: `${ADMIN_COLORS.onSurfaceVariant}99`, marginBottom: '1rem', marginTop: '-0.5rem' }}>
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
        <ImageUploaderField label="Hero Image" value={form.heroImage} onChange={v => setField('heroImage', v)} />
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

// ── Local Office V2 — block-based editor (Brief 99) ─────────────────────────
// Reuses the sub-service builder's shared components (BlockShell, BlockInserter,
// BlockField) rather than forking them (Brief 99 hard rule). Hero is core:
// pinned first, never removable, and its box carries no "+" inserter above it
// — the gap-0 inserter is simply never rendered, so nothing can be inserted
// ahead of the hero and `moveCityV2Block` (below, in AdminCityPage) refuses
// any move that would displace it from index 0.

const CITY_V2_DEFAULT_RECENT: BlockType[] = ['mostRequestedServices', 'whyPoints', 'reviews', 'faqAccordion'];
const CITY_V2_RECENT_KEY = 'jbp:recent-blocks:city-v2';

function CityV2BlockBox({ block }: { block: CityV2BlockInstance }) {
  const def = BLOCK_CATALOGUE[block.type];
  return (
    <h2 style={{ ...h2Style, marginBottom: '1rem' }}>{def.label}</h2>
  );
}

function LocalOfficeCityV2Fields({
  blocks,
  openGap,
  selectedBlockId,
  onOpenGap,
  onCloseGap,
  onInsert,
  onMove,
  onRemove,
  onSelect,
  onUpdateData,
  recent,
}: {
  blocks: CityV2BlockInstance[];
  openGap: number | null;
  selectedBlockId: string | null;
  onOpenGap: (gap: number) => void;
  onCloseGap: () => void;
  onInsert: (gapIndex: number, type: BlockType) => void;
  onMove: (index: number, dir: -1 | 1) => void;
  onRemove: (index: number) => void;
  onSelect: (id: string) => void;
  onUpdateData: (id: string, key: string, value: unknown) => void;
  recent: BlockType[];
}) {
  const presentTypes = new Set<BlockType>(blocks.map((b) => b.type));

  return (
    <>
      {blocks.map((block, i) => {
        const def = BLOCK_CATALOGUE[block.type];
        return (
          <div key={block.id}>
            <BlockShell
              index={i}
              total={blocks.length}
              removable={def.removable}
              selected={block.id === selectedBlockId}
              onMove={onMove}
              onRemove={onRemove}
              onSelect={() => onSelect(block.id)}
            >
              <div style={sectionStyle}>
                <CityV2BlockBox block={block} />
                {def.fields.length === 0 ? (
                  <p style={{ fontSize: '12px', color: `${ADMIN_COLORS.onSurfaceVariant}99` }}>
                    This block has no editable fields.
                  </p>
                ) : (
                  def.fields.map((field) => (
                    <BlockField
                      key={field.key}
                      field={field}
                      data={block.data}
                      onChange={(key, value) => onUpdateData(block.id, key, value)}
                    />
                  ))
                )}
              </div>
            </BlockShell>
            {/* The gap directly above block[0] (hero) is never rendered — hero
                is core (decisions-log 2026-07-21 #3) — so gap 1 (right after
                hero) is the first real insertion point. */}
            <BlockInserter
              pageType="city-v2"
              open={openGap === i + 1}
              onOpen={() => onOpenGap(i + 1)}
              onClose={onCloseGap}
              onInsert={(type) => onInsert(i + 1, type)}
              presentTypes={presentTypes}
              recent={recent}
              defaultRecent={CITY_V2_DEFAULT_RECENT}
            />
          </div>
        );
      })}
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
  const [attrsOpen, setAttrsOpen] = usePageAttributesOpen();
  // Brief 75 (DP-1): the row version this editor loaded, sent back on save so a
  // concurrent direct edit is rejected (409) rather than silently overwritten.
  const [version, setVersion] = useState<number>(0);
  const dv = useDraftVersions('city', slug, () => buildCityPayload(form), {
    // Brief 147 (Track B): publishing bumps the live row's version, so the token
    // this editor loaded goes stale the instant a publish succeeds. Take the fresh
    // one from the publish response instead of forcing a full browser reload.
    onLiveVersionChange: setVersion,
    // Brief 159 (Track C1): selecting a version in the sidebar loads THAT version's
    // stored content into this form — including its templateType, so a V1-authored
    // draft opens on the V1 template rather than inheriting whatever is on screen.
    // Without this the form kept the previous version's content and the next Save
    // wrote it into the newly-selected version for real.
    onLoadContent: (content) =>
      setForm((f) => formFromApi((content ?? {}) as Record<string, unknown>, f.templateType)),
  });
  // Brief 159 (Track C3): the Status row's publish / unpublish wiring, incl. the
  // typed-slug confirmation for taking the page off the site.
  const statusCtl = useVersionStatusControl(dv, { path: `/${slug}` });
  // Brief 85 (iter. 3): the sidebar's Template popover triggers this modal (kept
  // as-is, archive/warning flow intact) instead of reimplementing template
  // switching behind a plain radio picker.
  const [templateSwitcherOpen, setTemplateSwitcherOpen] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState('');
  // Brief 116 (Track C): draft-reconciliation UI state — which draft a "Move
  // draft" call is in flight for, and any error it produced.
  const [movingDraftId, setMovingDraftId] = useState<number | null>(null);
  const [reconcileError, setReconcileError] = useState('');

  // Brief 99 (Track D): City V2 block-editor UI state — mirrors the
  // sub-service editor (Briefs 90/91), scoped to this page's `form.blocks`.
  const [cityV2OpenGap, setCityV2OpenGap] = useState<number | null>(null);
  const [cityV2SelectedId, setCityV2SelectedId] = useState<string | null>(null);
  const [cityV2SidebarTab, setCityV2SidebarTab] = useState<'page' | 'block'>('page');
  const [cityV2Recent, setCityV2Recent] = useState<BlockType[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CITY_V2_RECENT_KEY);
      const parsed = raw ? (JSON.parse(raw) as unknown) : null;
      if (Array.isArray(parsed)) setCityV2Recent(parsed.filter((t): t is BlockType => typeof t === 'string'));
    } catch { /* ignore corrupt localStorage */ }
  }, []);

  function pushCityV2Recent(type: BlockType) {
    setCityV2Recent((prev) => {
      const next = [type, ...prev.filter((t) => t !== type)].slice(0, 4);
      try { localStorage.setItem(CITY_V2_RECENT_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }

  function moveCityV2Block(index: number, dir: -1 | 1) {
    setForm((f) => {
      // Hero is core (decisions-log 2026-07-21 #3) — pinned first, never moves,
      // and nothing may displace it from index 0.
      if (f.blocks[index]?.type === 'localOfficeV2Hero') return f;
      const j = index + dir;
      if (j < 0 || j >= f.blocks.length || j === 0) return f;
      const next = [...f.blocks];
      [next[index], next[j]] = [next[j], next[index]];
      return { ...f, blocks: next };
    });
    setStatus('idle');
  }

  function removeCityV2Block(index: number) {
    setForm((f) => {
      const target = f.blocks[index];
      if (!target || !BLOCK_CATALOGUE[target.type].removable) return f;
      return { ...f, blocks: f.blocks.filter((_, i) => i !== index) };
    });
    setStatus('idle');
  }

  function insertCityV2Block(gapIndex: number, type: BlockType) {
    setForm((f) => {
      const def = BLOCK_CATALOGUE[type];
      if (f.blocks.some((b) => b.type === type) && !def.allowMultiple) return f; // guard
      const instance: CityV2BlockInstance = { id: newCityV2BlockId(type), type: type as CityV2BlockInstance['type'], data: defaultDataFor(type, 'city-v2') };
      const next = [...f.blocks];
      next.splice(Math.max(1, Math.min(gapIndex, next.length)), 0, instance);
      return { ...f, blocks: next };
    });
    pushCityV2Recent(type);
    setCityV2OpenGap(null);
    setStatus('idle');
  }

  function updateCityV2BlockData(id: string, key: string, value: unknown) {
    setForm((f) => ({
      ...f,
      blocks: f.blocks.map((b) => (b.id === id ? { ...b, data: { ...b.data, [key]: value } } : b)),
    }));
    setStatus('idle');
  }

  function selectCityV2Block(id: string) {
    setCityV2SelectedId(id);
    setCityV2SidebarTab('block');
    setAttrsOpen(true);
  }

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
    // Brief 99: a block selected under the old template is meaningless under
    // the new one — clear the block-editor selection/tab on every switch.
    setCityV2SelectedId(null);
    setCityV2SidebarTab('page');
    setCityV2OpenGap(null);
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

  // Brief 116 (Track C): re-stamp + migrate a mismatched draft to the live page's
  // template via the Track A endpoint, then re-read it (fresh content + new
  // optimistic-lock version) so the form shows the migrated draft and the next
  // save doesn't 409.
  async function handleMoveDraft(draftId: number) {
    setMovingDraftId(draftId);
    setReconcileError('');
    try {
      const res = await fetch(`/api/cms/drafts/${draftId}/retemplate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toTemplate: form.templateType }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? 'Failed to move draft');

      const dRes = await fetch(`/api/cms/drafts/${draftId}`);
      if (dRes.ok) {
        const draft = await dRes.json();
        if (draft?.content && typeof draft.content === 'object') {
          setForm(formFromApi(draft.content as Record<string, unknown>, form.templateType));
        }
      }
      await dv.reloadAndActivate(draftId);

      // A block selected under the old template is meaningless under the new one.
      setCityV2SelectedId(null);
      setCityV2SidebarTab('page');
      setCityV2OpenGap(null);

      const missing: string[] = Array.isArray(json.missingFields) ? json.missingFields : [];
      const restoredCount = Array.isArray(json.restoredFields) ? json.restoredFields.length : 0;
      setMissingFields(missing);
      const templateLabel = TEMPLATE_DISPLAY_NAMES[form.templateType] ?? form.templateType;
      setSwitchToast(
        `Draft moved to ${templateLabel}.` +
        (restoredCount > 0 ? ` ${restoredCount} field${restoredCount === 1 ? '' : 's'} restored from this page's previous ${templateLabel} content.` : '') +
        (missing.length > 0
          ? ` ${missing.length} field${missing.length === 1 ? '' : 's'} need${missing.length === 1 ? 's' : ''} your attention — ${missing.length === 1 ? 'it\'s' : 'they\'re'} highlighted below.`
          : ' It can now be published.')
      );
      setTimeout(() => setSwitchToast(''), 8000);
    } catch (err: unknown) {
      setReconcileError(err instanceof Error ? err.message : 'Failed to move draft');
    } finally {
      setMovingDraftId(null);
    }
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
      // Brief 147 (Track B): this save moved the live row on, so the active draft's
      // publish baseline has to move with it — otherwise Publish reports "the live
      // page has changed since this draft was created" about this very save.
      void dv.syncAfterLiveSave();
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err: unknown) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Save failed.');
    }
  }

  const cityLabel = slug ? slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '';

  if (status === 'loading') return <div style={{ padding: '2rem', color: ADMIN_COLORS.onSurfaceVariant }}>Loading...</div>;

  if (status === 'not-found') {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
        <h1 style={{ fontWeight: 700, fontSize: '1.5rem', marginBottom: '1rem', color: ADMIN_COLORS.onSurface, fontFamily: 'var(--font-outfit), system-ui, sans-serif' }}>{cityLabel} — CMS Editor</h1>
        <div style={{ background: `${ADMIN_COLORS.warning}1a`, border: `1px solid ${ADMIN_COLORS.warning}66`, borderRadius: '1rem', padding: '1.25rem', color: ADMIN_COLORS.warning }}>
          <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>No CMS content found for &lsquo;{slug}&rsquo;.</p>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>This city uses its static content file. Only Evanston and Elgin have been seeded into the CMS.</p>
        </div>
      </div>
    );
  }

  // Brief 99 (Track D): the sidebar's Block tab body. No City V2 block type
  // declares `styleOptions` in this rollout (the message below is shown for
  // every one, matching the sub-service editor's own no-style-options state) —
  // `noDripClub`'s style pickers are deliberately not surfaced for the v1
  // variant used here (no visual remix exists for the Carmine character-card
  // look; see the registry's `fieldsByPageType` comment).
  // Brief 116 (Track C): drafts stamped for a different template than the live
  // page can't publish (DP-4) until they're moved — surface them, don't strand them.
  const mismatchedDrafts = dv.versions.filter(
    (v) => v.template_type != null && v.template_type !== form.templateType
  );
  const liveTemplateLabel = TEMPLATE_DISPLAY_NAMES[form.templateType] ?? form.templateType;

  const cityV2SelectedBlock = form.blocks.find((b) => b.id === cityV2SelectedId) ?? null;
  const cityV2BlockTab: React.ReactNode = !cityV2SelectedBlock ? (
    <p style={{ fontSize: '13px', color: `${ADMIN_COLORS.onSurfaceVariant}cc`, margin: 0, lineHeight: 1.6 }}>
      Select a block to see its options.
    </p>
  ) : (
    <>
      <h3 style={{ ...h2Style, marginBottom: '0.5rem' }}>{BLOCK_CATALOGUE[cityV2SelectedBlock.type].label}</h3>
      <p style={{ fontSize: '13px', color: `${ADMIN_COLORS.onSurfaceVariant}cc`, margin: 0, lineHeight: 1.6 }}>
        This block type doesn&rsquo;t have style options yet.
      </p>
    </>
  );

  return (
    <div className="admin-city-editor" style={{ fontFamily: 'system-ui, sans-serif' }}>
      <style>{`
        .admin-city-editor input:focus, .admin-city-editor textarea:focus, .admin-city-editor select:focus {
          outline: none; border-color: ${ADMIN_COLORS.cerulean}; box-shadow: 0 0 0 2px ${ADMIN_COLORS.cerulean}66;
        }
        .admin-cta-btn { transition: box-shadow 0.2s ease, filter 0.2s ease; }
        .admin-cta-btn:hover { box-shadow: ${ADMIN_SHADOWS.glowCerulean}; filter: brightness(1.05); }
        .admin-editor-content { transition: margin-right 0.2s ease; }
        @media (min-width: 768px) {
          .admin-editor-content.attrs-open { margin-right: 280px; }
        }
      `}</style>
      <AdminPageHeader
        title={`${cityLabel} — CMS Editor`}
        pageAttributesOpen={attrsOpen}
        onTogglePageAttributes={() => setAttrsOpen(!attrsOpen)}
        draftVersions={{
          busy: dv.busy,
          notice: dv.notice,
          noticeIsError: dv.noticeIsError,
          onSave: dv.save,
          onPreview: dv.preview,
          onSaveAsNew: dv.saveAsNew,
          nextVersionName: dv.nextVersionName,
        }}
        compact
      />

      {/* Hidden-trigger: opened by the sidebar's Template popover. Same archive/
          missing-fields flow as before, just triggered from the sidebar now. */}
      <TemplateSwitcher
        pageType="city"
        pageSlug={slug}
        currentTemplate={form.templateType}
        availableTemplates={CITY_TEMPLATES}
        onSwitched={handleSwitched}
        getContent={() => buildCityPayload(form)}
        hideTrigger
        open={templateSwitcherOpen}
        onOpenChange={setTemplateSwitcherOpen}
        initialSelectedTemplate={pendingTemplate}
        drafts={dv.versions.map(v => ({ label: v.label, templateType: v.template_type }))}
      />

    <div className={`admin-editor-content${attrsOpen ? ' attrs-open' : ''}`} style={{ padding: '2rem' }}>
      <p style={{ color: ADMIN_COLORS.onSurfaceVariant, fontSize: '0.875rem', marginBottom: '2rem' }}>
        Edit hero copy, content sections, and FAQs. Office address, services list, video, and partner logos come from the static data file.
      </p>

      {/* Brief 116 (Track C): draft-reconciliation banner — a draft authored for a
          different template can't publish until it's moved to the live template. */}
      {mismatchedDrafts.length > 0 && (
        <div
          style={{
            background: `${ADMIN_COLORS.warning}1a`,
            border: `1px solid ${ADMIN_COLORS.warning}66`,
            borderRadius: '1rem',
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
          }}
        >
          <p style={{ margin: '0 0 0.75rem', fontWeight: 600, color: ADMIN_COLORS.onSurface, fontSize: '0.9rem' }}>
            This page is now on <strong>{liveTemplateLabel}</strong>. You have{' '}
            {mismatchedDrafts.length === 1 ? '1 draft' : `${mismatchedDrafts.length} drafts`} authored for a
            different template that can&rsquo;t be published until {mismatchedDrafts.length === 1 ? 'it\'s' : 'they\'re'} moved to this template.
          </p>
          {mismatchedDrafts.map((d) => (
            <div
              key={d.id}
              style={{
                display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem',
                padding: '0.6rem 0.75rem', borderRadius: '0.75rem', marginBottom: '0.5rem',
                background: ADMIN_COLORS.surfaceContainer,
                border: `1px solid ${ADMIN_COLORS.outlineVariant}33`,
              }}
            >
              <span style={{ flex: 1, minWidth: '200px', fontSize: '0.875rem', color: ADMIN_COLORS.onSurface }}>
                <strong>&ldquo;{d.label}&rdquo;</strong>
                <span style={{ color: ADMIN_COLORS.onSurfaceVariant }}>
                  {' '}— authored for {TEMPLATE_DISPLAY_NAMES[d.template_type ?? ''] ?? d.template_type}
                </span>
              </span>
              <button
                className="admin-cta-btn"
                onClick={() => handleMoveDraft(d.id)}
                disabled={movingDraftId !== null}
                style={{
                  background: ADMIN_COLORS.cerulean, color: '#fff', border: 'none',
                  padding: '0.45rem 1rem', borderRadius: '9999px', fontWeight: 600, fontSize: '0.85rem',
                  cursor: movingDraftId !== null ? 'not-allowed' : 'pointer',
                  opacity: movingDraftId !== null && movingDraftId !== d.id ? 0.6 : 1,
                }}
              >
                {movingDraftId === d.id ? 'Moving…' : `Move draft to ${liveTemplateLabel}`}
              </button>
              <button
                onClick={() => dv.remove(d.id)}
                disabled={movingDraftId !== null}
                style={{
                  background: 'transparent', border: `1px solid ${ADMIN_COLORS.outlineVariant}66`,
                  padding: '0.45rem 1rem', borderRadius: '9999px', fontWeight: 600, fontSize: '0.85rem',
                  color: ADMIN_COLORS.onSurfaceVariant, cursor: movingDraftId !== null ? 'not-allowed' : 'pointer',
                }}
              >
                Discard draft
              </button>
            </div>
          ))}
          {reconcileError && (
            <p style={{ margin: '0.5rem 0 0', color: ADMIN_COLORS.error, fontSize: '0.875rem' }}>{reconcileError}</p>
          )}
        </div>
      )}

      {/* Switch toast */}
      {switchToast && (
        <div style={{ background: ADMIN_COLORS.surfaceContainerHigh, color: ADMIN_COLORS.onSurface, borderRadius: '0.75rem', padding: '0.85rem 1.25rem', marginBottom: '1.5rem', fontSize: '0.9rem', fontWeight: 500, borderLeft: `3px solid ${ADMIN_COLORS.cerulean}` }}>
          {switchToast}
        </div>
      )}

      {/* Template-conditional fields */}
      {form.templateType === 'local-office-v2' ? (
        <LocalOfficeCityV2Fields
          blocks={form.blocks}
          openGap={cityV2OpenGap}
          selectedBlockId={cityV2SelectedId}
          onOpenGap={setCityV2OpenGap}
          onCloseGap={() => setCityV2OpenGap(null)}
          onInsert={insertCityV2Block}
          onMove={moveCityV2Block}
          onRemove={removeCityV2Block}
          onSelect={selectCityV2Block}
          onUpdateData={updateCityV2BlockData}
          recent={cityV2Recent}
        />
      ) : form.templateType === 'local-office' ? (
        <LocalOfficeCityFields form={form} setField={setField} missing={missingFields} />
      ) : (
        <CoverageAreaCityFields form={form} setField={setField} missing={missingFields} />
      )}

      {/* FAQs — for City V2 this is its own reorderable `faqAccordion` block
          (Brief 99, Track A) instead of this fixed shared section. */}
      {form.templateType !== 'local-office-v2' && (
        <div style={sectionStyle}>
          <h2 style={h2Style}>FAQs</h2>
          {form.faqs.map((faq, i) => (
            <div key={i} style={repeaterCardStyle}>
              <p style={{ fontWeight: 700, fontSize: '0.85rem', color: `${ADMIN_COLORS.onSurfaceVariant}99`, margin: '0 0 0.75rem' }}>FAQ {i + 1}</p>
              <label style={labelStyle}>Question</label>
              <textarea style={{ ...inputStyle, minHeight: '60px' }} value={faq.question} onChange={e => setFaq(i, 'question', e.target.value)} />
              <label style={labelStyle}>Answer</label>
              <textarea style={{ ...inputStyle, minHeight: '80px' }} value={faq.answer} onChange={e => setFaq(i, 'answer', e.target.value)} />
            </div>
          ))}
          {form.faqs.length === 0 && <p style={{ color: `${ADMIN_COLORS.onSurfaceVariant}99`, fontSize: '12px' }}>No FAQs loaded.</p>}
        </div>
      )}

      <MetaSection
        metaTitle={form.metaTitle}
        metaDescription={form.metaDescription}
        onMetaTitleChange={v => setForm(f => ({ ...f, metaTitle: v }))}
        onMetaDescriptionChange={v => setForm(f => ({ ...f, metaDescription: v }))}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
        <button
          className="admin-cta-btn"
          onClick={handleSave}
          disabled={status === 'saving'}
          style={{ background: ADMIN_COLORS.cerulean, color: '#fff', border: 'none', padding: '0.7rem 2rem', borderRadius: '9999px', fontWeight: 700, fontSize: '1rem', cursor: status === 'saving' ? 'not-allowed' : 'pointer', opacity: status === 'saving' ? 0.7 : 1, boxShadow: ADMIN_SHADOWS.xl }}
        >
          {status === 'saving' ? 'Saving...' : 'Save'}
        </button>
        {status === 'saved' && <span style={{ color: ADMIN_COLORS.success, fontWeight: 600 }}>Saved.</span>}
        {status === 'error' && <span style={{ color: ADMIN_COLORS.error }}>{errorMsg}</span>}
      </div>

    </div>

      {statusCtl.modal}


      <PageAttributesSidebar
        title={cityLabel}
        updatedAt={pageMeta.updatedAt}
        template={{
          value: form.templateType,
          label: TEMPLATE_DISPLAY_NAMES[form.templateType] ?? form.templateType,
          options: CITY_TEMPLATES.map(t => ({ value: t, label: TEMPLATE_DISPLAY_NAMES[t] ?? t })),
          onChange: (newTemplate) => { setPendingTemplate(newTemplate); setTemplateSwitcherOpen(true); },
        }}
        version={{
          activeId: dv.activeId,
          activeLabel: dv.activeLabel,
          versions: dv.versions,
          busy: dv.busy,
          currentUserId: dv.currentUserId,
          onSwitch: dv.switchTo,
          onPublish: dv.publish,
          onDelete: dv.remove,
          onSaveAsNew: dv.saveAsNew,
          nextVersionName: dv.nextVersionName,
        ...statusCtl.versionProps,
        }}
        slug={{ value: slug, editable: false, disabledNote: "This page's URL is fixed at creation and can't be changed here.", permalink: `${SITE.baseUrl}/${slug}` }}
        parent={{ label: 'None', editable: false }}
        open={attrsOpen}
        onClose={() => setAttrsOpen(false)}
        {...(form.templateType === 'local-office-v2'
          ? { blockTab: cityV2BlockTab, activeTab: cityV2SidebarTab, onTabChange: setCityV2SidebarTab }
          : {})}
      />
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
    // Brief 99 (Track D): City V2's authoritative per-instance blocks. The
    // reader already normalizes/synthesizes this for a V2 row (see
    // `getCityCmsContent`); re-normalized here too for safety.
    blocks: normalizeCityV2Blocks(data.blocks),
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
    // Brief 99 (Track D): only City V2 saves carry `blocks` — the writer
    // treats its presence as "this save is authoritative for the V2 block
    // model," so a V1 template save must never include even an empty array.
    ...(form.templateType === 'local-office-v2' ? { blocks: form.blocks } : {}),
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
