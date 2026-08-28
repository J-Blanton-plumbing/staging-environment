'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import MetaSection from '@/components/admin/MetaSection';
import {
  type SubServiceBlockType,
  type SubServiceBlockInstance,
  type BlockStyle,
  type BlockPosition,
  SUB_SERVICE_BLOCK_ORDER,
  SUB_SERVICE_BLOCK_TYPES,
  normalizeBlocks,
  assembleBlocks,
  newBlockId,
  hasStyleOptions,
  normalizeBlockStyle,
  defaultBlockStyle,
} from '@/lib/cms/sub-service-blocks';
import BlockStylePanel from '@/components/admin/BlockStylePanel';
import TwoColumnBlockPanel from '@/components/admin/TwoColumnBlockPanel';
import BlockSelectionPanel from '@/components/admin/BlockSelectionPanel';
import RelatedArticlesBlockFields from '@/components/admin/RelatedArticlesBlockFields';
import type { ResolvableArticle } from '@/lib/cms/related-articles';
import BlockShell from '@/components/admin/BlockShell';
import BlockInserter from '@/components/admin/BlockInserter';
import BlockField from '@/components/admin/BlockField';
import {
  BLOCK_CATALOGUE,
  defaultDataFor,
} from '@/lib/cms/block-catalogue';
import PageAttributesSidebar, { SIDEBAR_WIDTH_PX } from '@/components/admin/PageAttributesSidebar';
import { usePageAttributesOpen } from '@/components/admin/PageAttributesSidebar/usePageAttributesOpen';
import { useDraftVersions } from '@/components/admin/PageAttributesSidebar/useDraftVersions';
import { useVersionStatusControl } from '@/components/admin/PageAttributesSidebar/useVersionStatusControl';
import { ADMIN_COLORS, ADMIN_SHADOWS } from '@/lib/admin/theme';
import { SITE } from '@/lib/site';

interface ServiceCategory {
  slug: string;
  title: string;
}

// Brief 90 (Track B/D): a block INSTANCE held in editor state. Content lives in
// `data` (per-instance), so the same type may appear more than once on a page.
type EditorBlock = SubServiceBlockInstance;

interface MetaState {
  title: string;
  status: string;
  metaTitle: string;
  metaDescription: string;
  parentSlug: string | null;
  version: number;
  updatedByName?: string;
  updatedAt?: string;
  createdByName?: string;
  createdAt?: string;
}

const EMPTY_META: MetaState = {
  title: '', status: 'draft', metaTitle: '', metaDescription: '', parentSlug: null, version: 0,
};

const RECENT_BLOCKS_KEY = 'jbp:recent-blocks';
// Brief 93: finalCta is no longer insertable (merged into the 2 Column Section),
// so it's dropped from the default recents (the inserter filters non-insertable
// types anyway). Coverage Map takes its slot.
const DEFAULT_RECENT: SubServiceBlockType[] = ['intro', 'listSection', 'noDripClub', 'map'];

const LABEL: React.CSSProperties = {
  display: 'block', fontFamily: 'var(--font-nunito), system-ui, sans-serif',
  fontSize: '13px', fontWeight: 600, color: ADMIN_COLORS.onSurface, marginBottom: '0.25rem',
};
const INPUT: React.CSSProperties = {
  display: 'block', width: '100%', padding: '0.5rem',
  border: `1px solid ${ADMIN_COLORS.outlineVariant}66`, borderRadius: '0.5rem',
  fontFamily: 'var(--font-nunito), system-ui, sans-serif', fontSize: '0.9rem', color: ADMIN_COLORS.onSurface,
  background: ADMIN_COLORS.surfaceContainerLow,
  boxSizing: 'border-box',
};
const SECTION: React.CSSProperties = {
  background: ADMIN_COLORS.surfaceContainerLow,
  border: `1px solid ${ADMIN_COLORS.outlineVariant}33`,
  borderRadius: '1.5rem',
  padding: '1.5rem',
  marginBottom: '0',
  boxShadow: ADMIN_SHADOWS.elegant,
};
const SECTION_HEADING: React.CSSProperties = {
  fontFamily: 'var(--font-outfit), system-ui, sans-serif', color: ADMIN_COLORS.onSurface,
  fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
  margin: '0 0 1rem',
};

const asStr = (v: unknown): string => (typeof v === 'string' ? v : '');

// ── Read-only placeholder box (Brief 88) ───────────────────────────────────────
// Blocks that render on the live page but have no editor controls (shared Elfsight
// embeds / auto-generated). Visually distinct from the editable boxes.

function ReadOnlyBlock({ header, description, badge }: { header: React.ReactNode; description: string; badge: string }) {
  return (
    <div style={{ ...SECTION, border: `1px dashed ${ADMIN_COLORS.outlineVariant}66`, boxShadow: 'none' }}>
      {header}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
        <span
          style={{
            fontFamily: 'var(--font-nunito), system-ui, sans-serif', fontSize: '11px', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.05em', color: ADMIN_COLORS.onSurfaceVariant,
            background: ADMIN_COLORS.surfaceContainerHigh, border: `1px solid ${ADMIN_COLORS.outlineVariant}66`,
            borderRadius: '9999px', padding: '0.15rem 0.65rem',
          }}
        >
          {badge}
        </span>
      </div>
      <p style={{ fontFamily: 'var(--font-nunito), system-ui, sans-serif', fontSize: '13px', color: `${ADMIN_COLORS.onSurfaceVariant}cc`, margin: 0, lineHeight: 1.5 }}>
        {description}
      </p>
    </div>
  );
}

// ── Brief 93 (Track D): per-instance admin label ───────────────────────────────
// Shown at the top of every block's box: an editable, admin-only name (data.label)
// with the block TYPE shown alongside it (e.g. "Final CTA" (2 Column Section)).
// Never rendered on the public page. Empty → the placeholder shows just the type
// name, which is what keeps the editor legible now that multiple instances can
// share the "2 Column Section" type.
function BlockBoxHeader({
  label, typeLabel, onChange,
}: {
  label: string; typeLabel: string; onChange: (value: string) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '1rem', paddingRight: '150px', flexWrap: 'wrap' }}>
      <input
        className="block-label-input"
        type="text"
        value={label}
        placeholder={typeLabel}
        aria-label="Block label (admin only)"
        title="Admin-only label — not shown on the public page"
        onChange={(e) => onChange(e.target.value)}
        style={{
          ...SECTION_HEADING,
          margin: 0,
          padding: '0.15rem 0.4rem',
          border: '1px solid transparent',
          borderRadius: '0.4rem',
          background: 'transparent',
          minWidth: '10rem',
          maxWidth: '100%',
          boxSizing: 'border-box',
        }}
      />
      {label.trim() !== '' && (
        <span style={{ fontFamily: 'var(--font-nunito), system-ui, sans-serif', fontSize: '12px', fontWeight: 600, color: `${ADMIN_COLORS.onSurfaceVariant}99` }}>
          ({typeLabel})
        </span>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SubServiceAdminPage() {
  const { slug } = useParams<{ slug: string }>();
  const [meta, setMeta] = useState<MetaState>(EMPTY_META);
  const [blocks, setBlocks] = useState<EditorBlock[]>([]);
  const [loadStatus, setLoadStatus] = useState<'loading' | 'not-found' | 'error' | 'done'>('loading');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveMsg, setSaveMsg] = useState('');
  const [publishBusy, setPublishBusy] = useState(false);
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);
  // Brief 92: the article pool for the Related Articles block's pickers + preview.
  const [articlePool, setArticlePool] = useState<ResolvableArticle[]>([]);
  const [attrsOpen, setAttrsOpen] = usePageAttributesOpen();
  const [openGap, setOpenGap] = useState<number | null>(null);
  const [recent, setRecent] = useState<SubServiceBlockType[]>([]);
  // Brief 91 (Track A/B): the selected block + which sidebar tab is active.
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState<'page' | 'block'>('page');
  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;

  // Load recently-used block types (Track D). localStorage; falls back to a
  // sensible default set when empty.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_BLOCKS_KEY);
      const parsed = raw ? (JSON.parse(raw) as unknown) : null;
      if (Array.isArray(parsed)) {
        // Brief 139: the full valid-type set, not the default seed order — an
        // opt-in block (servicesMenu) is still legitimately "recently used".
        const valid = new Set<string>(SUB_SERVICE_BLOCK_TYPES);
        setRecent(parsed.filter((t): t is SubServiceBlockType => typeof t === 'string' && valid.has(t)));
      }
    } catch { /* ignore corrupt localStorage */ }
  }, []);

  function pushRecent(type: SubServiceBlockType) {
    setRecent((prev) => {
      const next = [type, ...prev.filter((t) => t !== type)].slice(0, 4);
      try { localStorage.setItem(RECENT_BLOCKS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }

  // Serialize editor blocks for a write: trim list-field blanks per instance.
  const serializeBlocks = useCallback((source: EditorBlock[]): EditorBlock[] =>
    source.map((b) => {
      const listKeys = BLOCK_CATALOGUE[b.type].fields.filter((f) => f.type === 'list').map((f) => f.key);
      if (listKeys.length === 0) return b;
      const data = { ...b.data };
      for (const key of listKeys) {
        if (Array.isArray(data[key])) {
          data[key] = (data[key] as string[]).map((s) => (typeof s === 'string' ? s.trim() : s)).filter(Boolean);
        }
      }
      return { ...b, data };
    }), []);

  const dv = useDraftVersions(
    'sub-service',
    slug,
    () => ({
      title: meta.title,
      // Brief 159 (Track A2): `status` is NO LONGER part of a version's content.
      // It is derived from which version is published, has exactly one writer,
      // and carrying it in the payload would let a draft publish re-decide
      // whether the page is live — a second door onto the one field this brief
      // consolidated.
      metaTitle: meta.metaTitle,
      metaDescription: meta.metaDescription,
      // Brief 90 (Track B/D): the draft carries the authoritative per-instance blocks.
      blocks: serializeBlocks(blocksRef.current),
    }),
    {
      // Brief 147 (Track B): publishing bumps sub_service_pages.version, so the
      // token this editor loaded goes stale the moment a publish succeeds. Take
      // the fresh one straight from the publish response instead of making the
      // editor reload the whole page to get it.
      onLiveVersionChange: (version) => setMeta((p) => ({ ...p, version })),
      // Brief 159 (Track C1): selecting a version loads THAT version's stored
      // content — title, SEO fields and the full per-instance block array —
      // through the same `normalizeBlocks` the initial load uses, so a switch and
      // a page load land on identical editor state.
      onLoadContent: (content) => {
        const c = (content ?? {}) as Record<string, unknown>;
        setMeta((p) => ({
          ...p,
          title: typeof c.title === 'string' ? c.title : '',
          metaTitle: typeof c.metaTitle === 'string' ? c.metaTitle : '',
          metaDescription: typeof c.metaDescription === 'string' ? c.metaDescription : '',
        }));
        setBlocks(normalizeBlocks(c.blocks));
        // A block selected in the outgoing version's array has no meaning in the
        // incoming one — its instance id may not exist there at all.
        setSelectedBlockId(null);
        setSidebarTab('page');
      },
    }
  );

  // Brief 159 (Track C3): the Status row's publish / unpublish wiring, incl. the
  // typed-slug confirmation for taking the page off the site.
  const statusCtl = useVersionStatusControl(dv, { path: `/${slug}` });

  const load = useCallback(async () => {
    try {
      const [pageRes, catsRes, articlesRes] = await Promise.all([
        fetch(`/api/cms/sub-service/${slug}`),
        fetch('/api/cms/service-categories'),
        fetch('/api/cms/articles'),
      ]);
      if (pageRes.status === 404) { setLoadStatus('not-found'); return; }
      if (!pageRes.ok) { setLoadStatus('error'); return; }
      const d = await pageRes.json();
      const cats = catsRes.ok ? await catsRes.json() : [];
      setServiceCategories(Array.isArray(cats) ? cats : []);
      // Brief 92: build the resolver pool for the Related Articles block. The
      // articles list API merges DB + static articles (newest-first) and now
      // returns image/href, so preview + pickers share the public shape.
      const rawArticles = articlesRes.ok ? await articlesRes.json() : [];
      setArticlePool(
        Array.isArray(rawArticles)
          ? rawArticles.map((a: Record<string, unknown>): ResolvableArticle => ({
              slug: asStr(a.slug),
              title: asStr(a.title),
              excerpt: asStr(a.excerpt),
              image: asStr(a.image),
              href: asStr(a.href),
              category: Array.isArray(a.category) ? (a.category as string[]) : [],
              status: asStr(a.status) || 'published',
            }))
          : []
      );
      setMeta({
        title: d.title ?? '',
        status: d.status ?? 'draft',
        metaTitle: d.meta_title ?? '',
        metaDescription: d.meta_description ?? '',
        parentSlug: d.parent_slug ?? null,
        version: d.version ?? 0,
        updatedByName: d.updated_by_name ?? undefined,
        updatedAt: d.updated_at ?? undefined,
        createdByName: d.created_by_name ?? undefined,
        createdAt: d.created_at ?? undefined,
      });
      // Prefer the per-instance blocks; fall back to synthesising one instance per
      // type from the named columns for any un-migrated row.
      const loaded = normalizeBlocks(d.blocks);
      setBlocks(loaded.length > 0 ? loaded : assembleBlocks({
        slug,
        heroImage: d.hero_image ?? null, heroHeading: d.hero_heading ?? null, heroIntro: d.hero_intro ?? null,
        introHeading: d.intro_heading ?? null, introBody: d.intro_body ?? null, fImage: d.f_image ?? null,
        problemsHeading: d.problems_heading ?? null, problemsItems: Array.isArray(d.problems_items) ? d.problems_items : [],
        ndcTitle: d.ndc_title ?? null, ndcBody: d.ndc_body ?? null,
        ctaHeading: d.cta_heading ?? null, ctaBody: d.cta_body ?? null, f3Image: d.f3_image ?? null,
      }, SUB_SERVICE_BLOCK_ORDER));
      setLoadStatus('done');
    } catch {
      setLoadStatus('error');
    }
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  function setMetaField(k: keyof MetaState, v: string | null) {
    setMeta((p) => ({ ...p, [k]: v }));
    setSaveStatus('idle');
  }

  function updateBlockData(id: string, key: string, value: unknown) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, data: { ...b.data, [key]: value } } : b)));
    setSaveStatus('idle');
  }

  // Brief 91 (Track B): select a block and open its Block tab.
  function selectBlock(id: string) {
    setSelectedBlockId(id);
    setSidebarTab('block');
    setAttrsOpen(true);
  }

  // Brief 91 (Track C): merge a style patch into the block's `data.style`,
  // seeding from the block type's default the first time a choice is made so the
  // saved object is always complete.
  function updateBlockStyle(id: string, patch: Partial<BlockStyle>) {
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b;
        const base = normalizeBlockStyle(b.type, b.data.style) ?? defaultBlockStyle(b.type);
        if (!base) return b; // type has no style options — no-op
        const nextStyle: BlockStyle = { ...base, ...patch };
        return { ...b, data: { ...b.data, style: nextStyle } };
      })
    );
    setSaveStatus('idle');
  }

  // Brief 91 fix: drop the `style` key entirely so the block reverts to its
  // hard-coded default look (works for List Section and No Drip Club alike).
  function resetBlockStyle(id: string) {
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== id || !('style' in b.data)) return b;
        const { style: _drop, ...rest } = b.data;
        void _drop;
        return { ...b, data: rest };
      })
    );
    setSaveStatus('idle');
  }

  // Brief 93 (Track D): the per-instance admin label (data.label). Admin-only,
  // never rendered on the public page; persists via the existing Save Page PUT.
  function updateBlockLabel(id: string, label: string) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, data: { ...b.data, label } } : b)));
    setSaveStatus('idle');
  }

  // Brief 93 (Track B): the 2 Column Section's image-side alignment, stored at
  // data.style.position (the same key the Brief 91 style system reads).
  function updateTwoColumnPosition(id: string, position: BlockPosition) {
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b;
        const style = (b.data.style ?? {}) as Record<string, unknown>;
        return { ...b, data: { ...b.data, style: { ...style, position } } };
      })
    );
    setSaveStatus('idle');
  }

  // Brief 93 (Track C): the 2 Column Section's button on/off toggle (sidebar). The
  // label + href live inside the block box and are edited via updateButtonField.
  function toggleTwoColumnButton(id: string, enabled: boolean) {
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b;
        const button = (b.data.button ?? {}) as Record<string, unknown>;
        return { ...b, data: { ...b.data, button: { ...button, enabled } } };
      })
    );
    setSaveStatus('idle');
  }

  // Brief 93 (Track C): a single field of the 2 Column Section button object.
  function updateButtonField(id: string, field: 'label' | 'href', value: string) {
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b;
        const button = (b.data.button ?? {}) as Record<string, unknown>;
        return { ...b, data: { ...b.data, button: { ...button, [field]: value } } };
      })
    );
    setSaveStatus('idle');
  }

  // Reset the 2 Column Section's layout to its default look: drop BOTH `style`
  // (→ alignment reverts to the historical intro default) and `button` (→ turns
  // off and clears any label/link) entirely, mirroring resetBlockStyle's
  // drop-the-key approach for List Section / No Drip Club.
  function resetTwoColumnLayout(id: string) {
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b;
        const { style: _style, button: _button, ...rest } = b.data;
        void _style; void _button;
        return { ...b, data: rest };
      })
    );
    setSaveStatus('idle');
  }

  function moveBlock(index: number, dir: -1 | 1) {
    setBlocks((prev) => {
      const next = [...prev];
      const j = index + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
    setSaveStatus('idle');
  }

  function removeBlock(index: number) {
    setBlocks((prev) => {
      const target = prev[index];
      if (!target || !BLOCK_CATALOGUE[target.type].removable) return prev;
      return prev.filter((_, i) => i !== index);
    });
    setSaveStatus('idle');
  }

  // Insert a new instance at gap `gapIndex` (0 = before first block, N = after last).
  function insertBlock(gapIndex: number, type: SubServiceBlockType) {
    setBlocks((prev) => {
      const def = BLOCK_CATALOGUE[type];
      if (!def.allowMultiple && prev.some((b) => b.type === type)) return prev; // guard
      const instance: EditorBlock = { id: newBlockId(type), type, data: defaultDataFor(type) };
      const next = [...prev];
      next.splice(Math.max(0, Math.min(gapIndex, next.length)), 0, instance);
      return next;
    });
    pushRecent(type);
    setOpenGap(null);
    setSaveStatus('idle');
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaveStatus('saving');
    setSaveMsg('');
    try {
      const res = await fetch(`/api/cms/sub-service/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: meta.title,
          metaTitle: meta.metaTitle || null,
          metaDescription: meta.metaDescription || null,
          parentSlug: meta.parentSlug || null,
          // Brief 90 (Track B/D): the full per-instance block array is authoritative.
          blocks: serializeBlocks(blocks),
          // Brief 75 (DP-1): optimistic-concurrency guard for direct edits.
          version: meta.version,
        }),
      });
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error ?? 'Save failed'); }
      const j = await res.json().catch(() => ({}));
      if (typeof j.version === 'number') setMeta((p) => ({ ...p, version: j.version }));
      // Brief 147 (Track B): this save moved the live row, so the active draft's
      // publish baseline has to move with it — otherwise Publish reports "the live
      // page has changed since this draft was created" about this very save.
      void dv.syncAfterLiveSave();
      setSaveStatus('saved');
      setSaveMsg('Page saved');
    } catch (err: unknown) {
      setSaveStatus('error');
      setSaveMsg(err instanceof Error ? err.message : 'Save failed');
    }
  }

  /*
   * Brief 159 (Track C3 / E4) — `handleStatusChange` is GONE.
   *
   * It PATCHed `sub_service_pages.status` directly, which made this editor the
   * one place with a page-level status switch competing with the sidebar's
   * Status row. Under Brief 159 the live row's `status` is DERIVED from which
   * version is published and has exactly one writer (`setLiveStatusInTx`, called
   * only from publish/unpublish). Two controls for one field is precisely how
   * the reported bug class returns, so this one was removed rather than
   * re-pointed. `/api/cms/sub-service/[slug]` PATCH now refuses for the same
   * reason. Status is set here: the sidebar's Status row, via `statusCtl`.
   */

  if (loadStatus === 'loading') return <main style={{ padding: '2rem', color: ADMIN_COLORS.onSurfaceVariant }}>Loading…</main>;
  if (loadStatus === 'not-found') return (
    <main style={{ padding: '2rem', fontFamily: 'var(--font-nunito), system-ui, sans-serif' }}>
      <p style={{ color: ADMIN_COLORS.error }}>Sub-service page &ldquo;{slug}&rdquo; not found.</p>
    </main>
  );
  if (loadStatus === 'error') return (
    <main style={{ padding: '2rem', fontFamily: 'var(--font-nunito), system-ui, sans-serif' }}>
      <p style={{ color: ADMIN_COLORS.error }}>Failed to load sub-service page. Please try refreshing.</p>
    </main>
  );

  const parentCategory = serviceCategories.find((c) => c.slug === meta.parentSlug);
  const presentTypes = new Set(blocks.map((b) => b.type));

  // Brief 91 (Track A/C) — the sidebar's Block-tab body, per the selection state:
  //  • nothing selected → prompt;
  //  • selected but the type has no style options → a consistent message;
  //  • selected + style-enabled (List Section / No Drip Club) → the style panel + preview.
  const selectedBlock = blocks.find((b) => b.id === selectedBlockId) ?? null;
  const blockTabHint: React.CSSProperties = {
    fontFamily: 'var(--font-nunito), system-ui, sans-serif', fontSize: '13px',
    color: `${ADMIN_COLORS.onSurfaceVariant}cc`, margin: 0, lineHeight: 1.6,
  };
  const blockTab: React.ReactNode = !selectedBlock ? (
    <p style={blockTabHint}>Select a block to see its options.</p>
  ) : selectedBlock.type === 'intro' ? (
    // Brief 93: the 2 Column Section — alignment + button on/off + live preview.
    <TwoColumnBlockPanel
      key={selectedBlock.id}
      block={selectedBlock}
      onPositionChange={(position) => updateTwoColumnPosition(selectedBlock.id, position)}
      onButtonToggle={(enabled) => toggleTwoColumnButton(selectedBlock.id, enabled)}
      onReset={() => resetTwoColumnLayout(selectedBlock.id)}
    />
  ) : BLOCK_CATALOGUE[selectedBlock.type].selectionOptions ? (
    // Brief 92: selection-driven block (Related Articles) → mode + count + preview.
    <BlockSelectionPanel
      key={selectedBlock.id}
      block={selectedBlock}
      articles={articlePool}
      onSelectionChange={(key, value) => updateBlockData(selectedBlock.id, key, value)}
    />
  ) : !hasStyleOptions(selectedBlock.type) ? (
    <>
      <h3 style={{ fontFamily: 'var(--font-outfit), system-ui, sans-serif', fontWeight: 700, fontSize: '13px', color: ADMIN_COLORS.onSurface, margin: '0 0 0.5rem' }}>
        {BLOCK_CATALOGUE[selectedBlock.type].label}
      </h3>
      <p style={blockTabHint}>This block type doesn&rsquo;t have style options yet.</p>
    </>
  ) : (
    <BlockStylePanel
      key={selectedBlock.id}
      block={selectedBlock}
      onStyleChange={(patch) => updateBlockStyle(selectedBlock.id, patch)}
      onReset={() => resetBlockStyle(selectedBlock.id)}
    />
  );

  // Render one block instance's editor box (registry-driven).
  function renderBlockBox(block: EditorBlock) {
    const def = BLOCK_CATALOGUE[block.type];
    // Brief 93 (Track D): every box carries the editable admin label + type name.
    const header = (
      <BlockBoxHeader
        label={asStr(block.data.label)}
        typeLabel={def.label}
        onChange={(v) => updateBlockLabel(block.id, v)}
      />
    );
    // Brief 92: Related Articles is the first block whose in-box inputs depend on a
    // sidebar-chosen mode — rendered by a dedicated component, not the generic
    // `fields` list. Mode + count live in the Block tab (⚙); inputs live here.
    if (block.type === 'relatedArticles') {
      return (
        <div style={SECTION}>
          {header}
          <RelatedArticlesBlockFields
            data={block.data}
            serviceCategories={serviceCategories}
            articles={articlePool}
            onChange={(key, value) => updateBlockData(block.id, key, value)}
          />
          <p style={{ fontFamily: 'var(--font-nunito), system-ui, sans-serif', fontSize: '12px', color: `${ADMIN_COLORS.onSurfaceVariant}99`, margin: '0.75rem 0 0' }}>
            Choose how these articles are selected (newest / by category / hand-picked) and how many in the <strong>Block</strong> tab (⚙).
          </p>
        </div>
      );
    }
    if (def.fields.length === 0) {
      return <ReadOnlyBlock header={header} description={def.description} badge={def.badge ?? 'Read-only'} />;
    }
    // Brief 93 (Track C): the 2 Column Section shows its button label + link fields
    // in-box ONLY when the button is toggled on in the sidebar Block tab.
    const buttonOn = block.type === 'intro' && (block.data.button as { enabled?: boolean } | undefined)?.enabled === true;
    const btn = (block.data.button ?? {}) as { label?: string; href?: string };
    return (
      <div style={SECTION}>
        {header}
        {def.fields.map((field) => (
          <BlockField
            key={field.key}
            field={field}
            data={block.data}
            onChange={(key, value) => updateBlockData(block.id, key, value)}
          />
        ))}
        {buttonOn && (
          <div style={{ borderTop: `1px solid ${ADMIN_COLORS.outlineVariant}22`, marginTop: '0.5rem', paddingTop: '1.25rem' }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={LABEL}>Button label</label>
              <input
                className="field"
                type="text"
                value={asStr(btn.label)}
                placeholder="e.g. MAKE A GOOD CALL"
                onChange={(e) => updateButtonField(block.id, 'label', e.target.value)}
                style={INPUT}
              />
            </div>
            <div>
              <label style={LABEL}>Button link</label>
              <input
                className="field"
                type="text"
                value={asStr(btn.href)}
                placeholder="e.g. /no-drip-club or tel:773-724-9272"
                onChange={(e) => updateButtonField(block.id, 'href', e.target.value)}
                style={INPUT}
              />
            </div>
          </div>
        )}
        {block.type === 'intro' && (
          <p style={{ fontFamily: 'var(--font-nunito), system-ui, sans-serif', fontSize: '12px', color: `${ADMIN_COLORS.onSurfaceVariant}99`, margin: '1rem 0 0' }}>
            Image alignment and the button (on/off) are set in the <strong>Block</strong> tab (⚙).
          </p>
        )}
        {block.type === 'noDripClub' && (
          <p style={{ fontFamily: 'var(--font-nunito), system-ui, sans-serif', fontSize: '12px', color: `${ADMIN_COLORS.onSurfaceVariant}99`, margin: '0.25rem 0 0' }}>
            Background and character illustration are set in the <strong>Block</strong> tab (⚙). Leave unset to keep the default photo band.
          </p>
        )}
      </div>
    );
  }

  return (
    <>
      <AdminPageHeader
        title={meta.title || slug}
        templateName="Sub-Service"
        /* Brief 159: the header badge reads the PAGE's live state — is any version
           published? — not a column an editor can set independently. */
        status={dv.liveVersion ? 'published' : 'draft'}
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

      <div className={`admin-editor-content${attrsOpen ? ' attrs-open' : ''}`} style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
        <style>{`
          .admin-cta-btn { transition: box-shadow 0.2s ease, filter 0.2s ease; }
          .admin-cta-btn:hover { box-shadow: ${ADMIN_SHADOWS.glowCerulean}; filter: brightness(1.05); }
          .field { transition: box-shadow 0.15s ease, border-color 0.15s ease; }
          .field:focus { outline: none; border-color: ${ADMIN_COLORS.cerulean}; box-shadow: 0 0 0 2px ${ADMIN_COLORS.cerulean}66; }
          .block-label-input { transition: border-color 0.15s ease, background 0.15s ease; }
          .block-label-input:hover { border-color: ${ADMIN_COLORS.outlineVariant}66; }
          .block-label-input:focus { outline: none; border-color: ${ADMIN_COLORS.cerulean}; background: ${ADMIN_COLORS.surfaceContainerLow}; }
          .admin-editor-content { transition: margin-right 0.2s ease; }
          @media (min-width: 768px) {
            .admin-editor-content.attrs-open { margin-right: ${SIDEBAR_WIDTH_PX}px; }
          }
        `}</style>
        <form onSubmit={handleSave}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={LABEL}>Page Title (internal)</label>
            <input className="field" type="text" value={meta.title} onChange={(e) => setMetaField('title', e.target.value)} style={INPUT} />
          </div>

          {/* Brief 90 (Track D): the page's blocks in order, with a "+" inserter at
              every gap (top, between each pair, bottom). Reorder arrows + a remove
              control sit in each box's top-right corner. */}
          <BlockInserter
            pageType="sub-service"
            open={openGap === 0}
            onOpen={() => setOpenGap(0)}
            onClose={() => setOpenGap(null)}
            onInsert={(type) => insertBlock(0, type as SubServiceBlockType)}
            presentTypes={presentTypes}
            recent={recent}
            defaultRecent={DEFAULT_RECENT}
          />
          {blocks.map((block, i) => (
            <div key={block.id}>
              <BlockShell
                index={i}
                total={blocks.length}
                removable={BLOCK_CATALOGUE[block.type].removable}
                selected={block.id === selectedBlockId}
                onMove={moveBlock}
                onRemove={removeBlock}
                onSelect={() => selectBlock(block.id)}
              >
                {renderBlockBox(block)}
              </BlockShell>
              <BlockInserter
                pageType="sub-service"
                open={openGap === i + 1}
                onOpen={() => setOpenGap(i + 1)}
                onClose={() => setOpenGap(null)}
                onInsert={(type) => insertBlock(i + 1, type as SubServiceBlockType)}
                presentTypes={presentTypes}
                recent={recent}
                defaultRecent={DEFAULT_RECENT}
              />
            </div>
          ))}

          {/* ── Settings ── */}
          <div style={{ ...SECTION, marginTop: '1.5rem' }}>
            <h3 style={SECTION_HEADING}>Settings</h3>
            <MetaSection
              metaTitle={meta.metaTitle}
              metaDescription={meta.metaDescription}
              onMetaTitleChange={(v) => setMetaField('metaTitle', v)}
              onMetaDescriptionChange={(v) => setMetaField('metaDescription', v)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>
            <button
              className="admin-cta-btn"
              type="submit"
              disabled={saveStatus === 'saving'}
              style={{
                background: ADMIN_COLORS.cerulean, border: 'none', borderRadius: '9999px',
                padding: '0.6rem 1.5rem', color: '#fff',
                fontFamily: 'var(--font-outfit), system-ui, sans-serif', fontWeight: 600, fontSize: '14px',
                cursor: saveStatus === 'saving' ? 'not-allowed' : 'pointer',
                opacity: saveStatus === 'saving' ? 0.7 : 1,
                boxShadow: ADMIN_SHADOWS.xl,
              }}
            >
              {saveStatus === 'saving' ? 'Saving…' : 'Save Page'}
            </button>
            {saveMsg && (
              <span style={{ fontFamily: 'var(--font-nunito), system-ui, sans-serif', fontSize: '13px', color: saveStatus === 'error' ? ADMIN_COLORS.error : ADMIN_COLORS.success }}>
                {saveMsg}
              </span>
            )}
          </div>
        </form>
      </div>

      {statusCtl.modal}


      <PageAttributesSidebar
        title={meta.title}
        updatedAt={meta.updatedAt}
        template={{
          value: 'sub-service',
          label: 'Sub-Service',
          options: [{ value: 'sub-service', label: 'Sub-Service' }],
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
        parent={{
          label: parentCategory ? parentCategory.title : 'None',
          editable: true,
          value: meta.parentSlug,
          options: serviceCategories,
          onChange: (newParentSlug) => setMetaField('parentSlug', newParentSlug),
        }}
        open={attrsOpen}
        onClose={() => setAttrsOpen(false)}
        blockTab={blockTab}
        activeTab={sidebarTab}
        onTabChange={setSidebarTab}
      />
    </>
  );
}
