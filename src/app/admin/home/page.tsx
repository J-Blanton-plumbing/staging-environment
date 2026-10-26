'use client';

import { useState, useEffect, useMemo } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import MetaSection from '@/components/admin/MetaSection';
import PageAttributesSidebar from '@/components/admin/PageAttributesSidebar';
import { usePageAttributesOpen } from '@/components/admin/PageAttributesSidebar/usePageAttributesOpen';
import { useDraftVersions } from '@/components/admin/PageAttributesSidebar/useDraftVersions';
import { useVersionStatusControl } from '@/components/admin/PageAttributesSidebar/useVersionStatusControl';
import RichTextField from '@/components/admin/RichTextField';
import ArticlePicker, { type PickerArticle } from '@/components/admin/ArticlePicker';
import { Group, ImageInput, Notice, Repeater, TextInput, BRAND } from '@/components/admin/sewer-v2/ui';
import { ADMIN_COLORS, ADMIN_SHADOWS } from '@/lib/admin/theme';
import { SITE } from '@/lib/site';
import {
  HOME_FEATURED_MAX,
  HOME_LIST_DEFAULTS,
  HOME_LOCATOR_FIELDS,
  HOME_ROTATOR_MAX,
  HOME_SCALAR_FIELDS,
  heroH1,
  isArticleSlug,
  youtubeId,
  type HomeFeaturedItem,
  type HomeListItem,
} from '@/lib/cms/home-content';

/**
 * /admin/home — Brief 219: the WHOLE homepage, every piece of copy and every image (the field list is
 * `HOME_SCALAR_FIELDS` + two repeatable sets in `@/lib/cms/home-content`). Layout is locked: sections
 * can't be added, removed or reordered here; only the items inside a set can.
 *
 * Draft → preview → publish, the Status row and the direct Save all work exactly as before (Brief 75 /
 * 147 / 159). Every value is sanitized by kind on the server (`sanitizeHomeContent`), on both write
 * paths and on render.
 */

type Scalars = Record<string, string>;
interface FormState {
  s: Scalars;
  hero_rotator_words: HomeListItem[];
  knowledge_hub_featured: HomeFeaturedItem[];
  meta_title: string;
  meta_description: string;
  updated_at?: string;
}

const SCALAR_KEYS = Object.keys(HOME_SCALAR_FIELDS);
const str = (v: unknown) => (typeof v === 'string' ? v : '');
let idSeq = 0;
const freshId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${++idSeq}`;

/**
 * Stored content (the live row or a version) → form. A blank or missing field shows the value the
 * page renders for it (its default), so the editor always shows what visitors see.
 */
function formFromHomeContent(data: unknown, prev?: FormState): FormState {
  const d = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  const s: Scalars = {};
  for (const k of SCALAR_KEYS) s[k] = str(d[k]).trim() ? str(d[k]) : HOME_SCALAR_FIELDS[k].def;
  const words = (Array.isArray(d.hero_rotator_words) ? d.hero_rotator_words : [])
    .map((x, i) => ({ id: str((x as HomeListItem)?.id) || `word-${i + 1}`, text: str((x as HomeListItem)?.text) }))
    .filter((x) => x.text.trim());
  const featured = (Array.isArray(d.knowledge_hub_featured) ? d.knowledge_hub_featured : [])
    .map((x, i) => ({ id: str((x as HomeFeaturedItem)?.id) || `article-${i + 1}`, slug: str((x as HomeFeaturedItem)?.slug) }))
    .filter((x) => x.slug.trim());
  return {
    s,
    hero_rotator_words: words.length ? words : HOME_LIST_DEFAULTS.hero_rotator_words.map((x) => ({ ...x })),
    knowledge_hub_featured: featured.length ? featured : HOME_LIST_DEFAULTS.knowledge_hub_featured.map((x) => ({ ...x })),
    meta_title: 'meta_title' in d ? str(d.meta_title) : prev?.meta_title ?? '',
    meta_description: 'meta_description' in d ? str(d.meta_description) : prev?.meta_description ?? '',
    updated_at: prev?.updated_at,
  };
}

/** Form → the content payload a save / version / publish writes (flat keys, as stored). */
function getContent(form: FormState) {
  return {
    ...form.s,
    hero_rotator_words: form.hero_rotator_words,
    knowledge_hub_featured: form.knowledge_hub_featured,
    meta_title: form.meta_title || null,
    meta_description: form.meta_description || null,
  };
}

const LOCATOR_LABELS: Record<string, { label: string; hint?: string }> = {
  searchLabel: { label: 'Search box label (screen readers)' },
  searchPlaceholder: { label: 'Search box placeholder' },
  searchLoading: { label: 'While the city list loads' },
  officeCountTemplate: { label: 'Office count', hint: '{count} = the number of offices.' },
  matchTemplate: { label: 'Match: one place', hint: '{cities} = the place searched for, {office} = its service center.' },
  matchTemplatePlural: { label: 'Match: several places', hint: '{cities} and {office}, as above.' },
  matchAndMore: { label: 'Match: “and more”', hint: '{count} = how many more places.' },
  resultsCountTemplate: { label: 'Results: several', hint: '{count} = matches, {query} = what was typed.' },
  resultsCountTemplateSingular: { label: 'Results: one', hint: '{query} = what was typed.' },
  noResultsTemplate: { label: 'No results', hint: '{query} = what was typed.' },
  noResultsHelp: { label: 'No results: help line (the phone number follows it)' },
  selectAriaTemplate: { label: 'Office button (screen readers)', hint: '{office} = the office name.' },
  mapIframeTitleTemplate: { label: 'Map title (screen readers)', hint: '{label} = the office or region shown.' },
};

export default function HomeAdminPage() {
  const [form, setForm] = useState<FormState>(() => formFromHomeContent({}));
  const [status, setStatus] = useState<'loading' | 'idle' | 'saving' | 'saved' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [articles, setArticles] = useState<PickerArticle[] | null>(null);
  // Brief 78 (Track A): the row version this editor loaded, sent back on save so a
  // concurrent direct edit is rejected (409) rather than silently overwritten.
  const [version, setVersion] = useState<number>(0);
  const [attrsOpen, setAttrsOpen] = usePageAttributesOpen();
  const dv = useDraftVersions('main', 'home', () => getContent(form), {
    // Brief 147 (Track B): publishing bumps the live row's version; take the fresh one.
    onLiveVersionChange: setVersion,
    // Brief 159 (Track C1): selecting a version loads THAT version's stored content into this form.
    onLoadContent: (content) => setForm((f) => formFromHomeContent(content, f)),
  });
  const statusCtl = useVersionStatusControl(dv, { path: '/' });

  useEffect(() => {
    fetch('/api/cms/main/home')
      .then((r) => r.json())
      .then((data) => {
        setForm({ ...formFromHomeContent(data), updated_at: data.updated_at ?? undefined });
        setVersion(typeof data.version === 'number' ? data.version : 0);
        setStatus('idle');
      })
      .catch(() => { setStatus('error'); setErrorMsg('Failed to load content from database.'); });
    fetch('/api/cms/articles')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((rows: PickerArticle[]) => setArticles(Array.isArray(rows) ? rows : []))
      .catch(() => setArticles([]));
  }, []);

  const set = (key: string) => (value: string) => setForm((f) => ({ ...f, s: { ...f.s, [key]: value } }));
  const v = (key: string) => form.s[key] ?? '';

  const h1 = useMemo(() => heroH1(v('hero_line_lead'), form.hero_rotator_words.map((w) => w.text)), [form]); // eslint-disable-line react-hooks/exhaustive-deps
  const published = useMemo(() => new Map((articles ?? []).map((a) => [a.slug, a])), [articles]);

  async function handleSave() {
    setStatus('saving');
    try {
      const res = await fetch('/api/cms/main/home', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...getContent(form), version }),
      });
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error ?? 'Unknown error'); }
      const j = await res.json().catch(() => ({}));
      if (typeof j.version === 'number') setVersion(j.version);
      // Brief 147 (Track B): this save moved the live row on, so the active draft's baseline moves too.
      void dv.syncAfterLiveSave();
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err: unknown) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Save failed.');
    }
  }

  if (status === 'loading') return <div style={{ padding: '2rem', background: ADMIN_COLORS.surface, color: ADMIN_COLORS.onSurface, minHeight: '100vh' }}>Loading...</div>;

  const para = 'Separate paragraphs with a blank line (double Enter).';
  const ytOk = !v('why_video_id').trim() || !!youtubeId(v('why_video_id'));

  return (
    <div style={{ fontFamily: 'var(--font-nunito), system-ui, sans-serif', background: ADMIN_COLORS.surface, color: ADMIN_COLORS.onSurface, minHeight: '100vh' }}>
      <style>{`
        .admin-save-btn:hover { box-shadow: ${ADMIN_SHADOWS.glowCerulean}; filter: brightness(1.05); }
        .field { transition: box-shadow 0.15s ease, border-color 0.15s ease; }
        .field:focus { outline: none; border-color: ${BRAND.cerulean}; box-shadow: 0 0 0 2px ${BRAND.cerulean}66; }
        .admin-editor-content { transition: margin-right 0.2s ease; }
        @media (min-width: 768px) {
          .admin-editor-content.attrs-open { margin-right: 280px; }
        }
      `}</style>
      <AdminPageHeader
        title="Home — CMS Editor"
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
      <div className={`admin-editor-content${attrsOpen ? ' attrs-open' : ''}`} style={{ padding: '2rem', maxWidth: '900px' }}>
        <Notice>
          Every word and image on the homepage is edited here. The layout is fixed: sections can&apos;t be added,
          removed or moved. A field left blank shows its standard text. Phone numbers and office details come from
          Global Settings; the service cards, the reviews widget and the TikTok feed are edited elsewhere.
        </Notice>

        <Group title="Hero">
          <TextInput label="Eyebrow (small line above the headline)" value={v('hero_tagline')} onChange={set('hero_tagline')} />
          <TextInput
            label="Headline: lead"
            value={v('hero_line_lead')}
            onChange={set('hero_line_lead')}
            hint="The 24/7 badge is positioned on the first letter. Changing the first word may need a layout check."
          />
          <Repeater<HomeListItem>
            label="Headline: rotating words (1–4; one word = no rotation)"
            items={form.hero_rotator_words}
            onChange={(next) => setForm((f) => ({ ...f, hero_rotator_words: next }))}
            newItem={() => ({ id: freshId('word'), text: '' })}
            itemLabel={(_, i) => `Word ${i + 1}`}
            min={1}
            max={HOME_ROTATOR_MAX}
            addLabel="Add a word"
            renderItem={(item, update) => <TextInput label="Word or place" value={item.text} onChange={(text) => update({ ...item, text })} />}
          />
          <TextInput
            label="Page heading (H1) — built automatically, read-only"
            value={h1}
            onChange={() => {}}
            readOnly
            hint="Screen readers and Google read this one heading. It is the lead plus the words joined with “and”, so it always matches the visible line."
          />
          <TextInput label="Intro" value={v('hero_intro')} onChange={set('hero_intro')} multiline />
          <TextInput label="Call-to-action label (above the phone button)" value={v('hero_cta')} onChange={set('hero_cta')} hint="Dials the main phone number from Global Settings." />
          <ImageInput label="24/7 badge" src={v('hero_badge_image')} onSrc={set('hero_badge_image')} decorative />
          <ImageInput label="Hero video: desktop" src={v('hero_video_desktop')} onSrc={set('hero_video_desktop')} decorative />
          <ImageInput label="Hero video: mobile (780px and narrower)" src={v('hero_video_mobile')} onSrc={set('hero_video_mobile')} decorative />
          <ImageInput label="Hero video: poster (shown until the video plays)" src={v('hero_poster')} onSrc={set('hero_poster')} decorative />
        </Group>

        <Group title="Services">
          <TextInput label="Heading" value={v('services_heading')} onChange={set('services_heading')} />
          <TextInput label="Intro" value={v('services_intro')} onChange={set('services_intro')} multiline />
          <TextInput label="Button label (desktop, links to /services)" value={v('services_cta_label')} onChange={set('services_cta_label')} />
        </Group>

        <Group title="Areas we service" note="Region names, years and county lines are shared with /locations and are not edited here.">
          <TextInput label="Heading" value={v('regions_heading')} onChange={set('regions_heading')} />
          <TextInput label="Intro" value={v('regions_intro')} onChange={set('regions_intro')} multiline />
          <TextInput label="Line under each region name" value={v('regions_support_template')} onChange={set('regions_support_template')} hint="{tenure} = the region's years line, {count} = how many communities (counted automatically)." />
          <TextInput label="Chicagoland: button label" value={v('regions_cta_chicagoland')} onChange={set('regions_cta_chicagoland')} />
          <ImageInput label="Chicagoland: image (2:1)" src={v('regions_image_chicagoland')} onSrc={set('regions_image_chicagoland')} alt={v('regions_image_alt_chicagoland')} onAlt={set('regions_image_alt_chicagoland')} />
          <TextInput label="Central Ohio: button label" value={v('regions_cta_columbus')} onChange={set('regions_cta_columbus')} />
          <ImageInput label="Central Ohio: image (2:1)" src={v('regions_image_columbus')} onSrc={set('regions_image_columbus')} alt={v('regions_image_alt_columbus')} onAlt={set('regions_image_alt_columbus')} />
        </Group>

        <Group title="TikTok" note="The feed itself is an Elfsight widget.">
          <TextInput label="Headline above the feed" value={v('tiktok_headline')} onChange={set('tiktok_headline')} />
        </Group>

        <Group title="Why J. Blanton">
          <TextInput label="Heading" value={v('why_heading')} onChange={set('why_heading')} />
          <TextInput label="Body" value={v('why_body')} onChange={set('why_body')} multiline hint={para} />
          <TextInput
            label="YouTube video (id or link)"
            value={v('why_video_id')}
            onChange={set('why_video_id')}
            hint={ytOk ? `Plays: ${youtubeId(v('why_video_id')) ?? HOME_SCALAR_FIELDS.why_video_id.def}` : 'Not a YouTube id or link — the standard video will show.'}
          />
          <TextInput label="Video title (screen readers)" value={v('why_video_title')} onChange={set('why_video_title')} />
          <TextInput label="Button label (links to /why-j-blanton)" value={v('why_cta_label')} onChange={set('why_cta_label')} />
        </Group>

        <Group title="No Drip Club">
          <RichTextField label="Body" value={v('ndc_body')} onChange={set('ndc_body')} rows={5} />
          <TextInput label="Band label" value={v('ndc_label')} onChange={set('ndc_label')} />
          <ImageInput label="Character image" src={v('ndc_image')} onSrc={set('ndc_image')} alt={v('ndc_image_alt')} onAlt={set('ndc_image_alt')} />
          <TextInput label="Button label (links to /no-drip-club)" value={v('ndc_cta_label')} onChange={set('ndc_cta_label')} />
        </Group>

        <Group title="Knowledge Hub">
          <TextInput label="Heading" value={v('knowledge_hub_heading')} onChange={set('knowledge_hub_heading')} />
          <TextInput label="Intro" value={v('knowledge_hub_intro')} onChange={set('knowledge_hub_intro')} multiline />
          <TextInput label="Button label (desktop, links to /knowledge-hub)" value={v('knowledge_hub_cta_label')} onChange={set('knowledge_hub_cta_label')} />
          <Repeater<HomeFeaturedItem>
            label="Featured articles"
            items={form.knowledge_hub_featured}
            onChange={(next) => setForm((f) => ({ ...f, knowledge_hub_featured: next }))}
            newItem={() => ({ id: freshId('article'), slug: '' })}
            itemLabel={(_, i) => `Card ${i + 1}`}
            min={1}
            max={HOME_FEATURED_MAX}
            addLabel="Add an article"
            renderItem={(item, update) => {
              const a = published.get(item.slug);
              const problem = !item.slug
                ? 'Pick an article.'
                : !isArticleSlug(item.slug)
                  ? 'Not a valid article address.'
                  : articles && !a
                    ? 'No article with this address — it won’t show on the homepage.'
                    : a && a.status !== 'published'
                      ? 'This article is not published — it won’t show on the homepage.'
                      : null;
              return (
                <div style={{ marginBottom: '0.75rem' }}>
                  <ArticlePicker value={item.slug} articles={articles ?? []} onChange={(slug) => update({ ...item, slug })} />
                  {problem && <p style={{ fontSize: '12px', color: BRAND.cream, background: `${BRAND.carmine}cc`, borderRadius: '0.4rem', padding: '0.2rem 0.5rem', display: 'inline-block', margin: 0 }}>{problem}</p>}
                </div>
              );
            }}
          />
        </Group>

        <Group title="Where to find us" note="The offices, map and phone number come from Global Settings.">
          <TextInput label="Heading" value={v('find_us_heading')} onChange={set('find_us_heading')} />
          <TextInput label="Body" value={v('find_us_body')} onChange={set('find_us_body')} multiline hint={para} />
          <p style={{ margin: '1.25rem 0 0.75rem', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: `${ADMIN_COLORS.onSurfaceVariant}dd` }}>
            Store locator text
          </p>
          {HOME_LOCATOR_FIELDS.map(({ key, name }) => (
            <TextInput
              key={key}
              label={LOCATOR_LABELS[name]?.label ?? name}
              value={v(key)}
              onChange={set(key)}
              hint={LOCATOR_LABELS[name]?.hint ? `${LOCATOR_LABELS[name].hint} Keep the {words} in braces exactly as written.` : undefined}
            />
          ))}
        </Group>

        <MetaSection
          metaTitle={form.meta_title}
          metaDescription={form.meta_description}
          onMetaTitleChange={(x) => setForm((f) => ({ ...f, meta_title: x }))}
          onMetaDescriptionChange={(x) => setForm((f) => ({ ...f, meta_description: x }))}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
          <button className="admin-save-btn" onClick={handleSave} disabled={status === 'saving'} style={{ background: ADMIN_COLORS.cerulean, color: BRAND.cream, border: 'none', padding: '0.7rem 2rem', borderRadius: '9999px', fontWeight: 700, fontSize: '1rem', cursor: status === 'saving' ? 'not-allowed' : 'pointer', opacity: status === 'saving' ? 0.7 : 1, boxShadow: ADMIN_SHADOWS.xl, transition: 'box-shadow 0.2s ease, filter 0.2s ease' }}>
            {status === 'saving' ? 'Saving...' : 'Save'}
          </button>
          {status === 'saved' && <span style={{ color: ADMIN_COLORS.success, fontWeight: 600 }}>Saved.</span>}
          {status === 'error' && <span style={{ color: ADMIN_COLORS.error }}>{errorMsg}</span>}
        </div>
      </div>

      {statusCtl.modal}

      <PageAttributesSidebar
        title="Home"
        updatedAt={form.updated_at}
        template={{ value: 'home', label: 'Home', options: [{ value: 'home', label: 'Home' }] }}
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
        slug={{ value: 'home', editable: false, disabledNote: "This is a fixed system page — its URL can't be changed.", permalink: `${SITE.baseUrl}/` }}
        parent={{ label: 'None', editable: false }}
        open={attrsOpen}
        onClose={() => setAttrsOpen(false)}
      />
    </div>
  );
}
