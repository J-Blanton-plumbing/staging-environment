'use client';

/**
 * Brief 220 — the "Homepage 2026" editor (/admin/home → Homepage 2026 tab): every word and image of
 * the Homepage 2026 record (`main_pages` row `home-2026`). The field list is `H26_SCALAR_FIELDS` + four
 * repeatable sets in `@/lib/cms/home-2026-content`; layout is locked (sections can't be added, removed
 * or moved — only the items inside a set).
 *
 * Versions only (the V2EditorShell flow): Save writes the open version, Preview shows it at `/` under
 * the preview cookie WHATEVER the Live homepage switch says, Publish (sidebar Status) makes it the
 * record's live content. Publishing does NOT put it on the homepage — the Live homepage panel does.
 * Every version is stamped `home-2026`; a version without the stamp opens read-only. Every value is
 * sanitized by kind on the server (`sanitizeHome2026Content`) on publish and on render.
 */
import { useEffect, useMemo, useState } from 'react';
import MetaSection from '@/components/admin/MetaSection';
import ArticlePicker, { type PickerArticle } from '@/components/admin/ArticlePicker';
import V2EditorShell from '@/components/admin/v2-shared/V2EditorShell';
import { BRAND, Group, ImageInput, Notice, Repeater, Select, TextInput } from '@/components/admin/sewer-v2/ui';
import { ADMIN_COLORS } from '@/lib/admin/theme';
import {
  H26_LIMITS,
  H26_LIST_DEFAULTS,
  H26_SCALAR_FIELDS,
  HOME_2026_PAGE_TYPE,
  HOME_2026_SLUG,
  HOME_2026_TEMPLATE,
  home2026Defaults,
  isArticleSlug,
  isHome2026Content,
  isUsableUrl,
  youtubeId,
  type H26FeaturedItem,
  type H26Job,
  type H26Photo,
  type H26ServiceCard,
  type H26TextItem,
} from '@/lib/cms/home-2026-content';

type Content = Record<string, unknown> & { template: string };
const str = (v: unknown) => (typeof v === 'string' ? v : '');
let seq = 0;
const freshId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${++seq}`;

/**
 * Stored content → form. A blank or missing field shows the value the page renders for it (its
 * default) so the editor always shows what visitors see. Meta is kept as stored (blank = Classic's).
 */
function normalize(raw: unknown): Content {
  const d = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const def = home2026Defaults();
  const out: Content = { ...def, template: HOME_2026_TEMPLATE };
  for (const k of Object.keys(H26_SCALAR_FIELDS)) if (str(d[k]).trim()) out[k] = str(d[k]);
  for (const k of Object.keys(H26_LIST_DEFAULTS)) if (Array.isArray(d[k]) && (d[k] as unknown[]).length) out[k] = d[k];
  out.meta_title = str(d.meta_title);
  out.meta_description = str(d.meta_description);
  return out;
}

const isOwn = (c: unknown): c is Content => isHome2026Content(c);

export default function Home2026Editor() {
  const [initial, setInitial] = useState<Content | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [articles, setArticles] = useState<PickerArticle[] | null>(null);

  useEffect(() => {
    fetch(`/api/cms/main/${HOME_2026_SLUG}`)
      .then(async (r) => {
        if (r.status === 404) return {};
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: Record<string, unknown>) => {
        setInitial(normalize(data));
        setUpdatedAt(typeof data.updated_at === 'string' ? data.updated_at : null);
      })
      .catch((e: Error) => setError(e.message));
    fetch('/api/cms/articles')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((rows: PickerArticle[]) => setArticles(Array.isArray(rows) ? rows : []))
      .catch(() => setArticles([]));
  }, []);

  if (error) return <main style={{ padding: '2rem', color: ADMIN_COLORS.error }}>Failed to load Homepage 2026 ({error}). Please refresh.</main>;
  if (!initial) return <main style={{ padding: '2rem', color: ADMIN_COLORS.onSurfaceVariant }}>Loading…</main>;

  return (
    <V2EditorShell<Content>
      pageType={HOME_2026_PAGE_TYPE}
      slug={HOME_2026_SLUG}
      publicPath={null}
      title="Homepage 2026"
      templateName="Homepage 2026"
      template={HOME_2026_TEMPLATE}
      isOwnContent={isOwn}
      initial={initial}
      oldShapeMessage="This version isn’t a Homepage 2026 version, so it can’t be edited here."
      updatedAt={updatedAt}
      parentLabel="Homepage"
      intro={
        <>
          Every word and image of <strong>Homepage 2026</strong>. The layout is fixed: sections can&apos;t be added, removed or moved. <strong>Preview</strong>{' '}
          shows this version at the homepage address even while the Classic homepage is live. <strong>Publishing</strong> saves it as Homepage 2026&apos;s live
          content; it reaches visitors only when the <em>Live homepage</em> switch above points at Homepage 2026.
        </>
      }
      extra={
        <Notice>
          The phone number and the office list come from Global Settings; region names, counties and community counts from the Locations pages; the services directory
          from the site&apos;s service pages; the article cards from the articles themselves. {'{rating}'} and {'{review_count}'} in a text are replaced by the rating
          pair below, so one edit updates the trust bar and the review box.
        </Notice>
      }
      renderFields={(c, set) => <Fields c={c} set={set} articles={articles} />}
    />
  );
}

function Fields({ c, set, articles }: { c: Content; set: (next: Content) => void; articles: PickerArticle[] | null }) {
  const v = (k: string) => str(c[k]);
  const on = (k: string) => (x: string) => set({ ...c, [k]: x });
  const list = <T,>(k: string) => (Array.isArray(c[k]) ? (c[k] as T[]) : []);
  const setList = (k: string) => (next: unknown[]) => set({ ...c, [k]: next });
  const published = useMemo(() => new Map((articles ?? []).map((a) => [a.slug, a])), [articles]);
  const ytOk = !v('why_video_id').trim() || !!youtubeId(v('why_video_id'));
  const linkHint = (x: string) => (x && !isUsableUrl(x.trim()) ? 'Not a usable link — use a site path like /services/sewer or a full https:// address.' : undefined);
  const para = 'Separate paragraphs with a blank line (double Enter).';
  const T = (k: string, label: string, extra: { multiline?: boolean; hint?: string } = {}) => (
    <TextInput label={label} value={v(k)} onChange={on(k)} multiline={extra.multiline} hint={extra.hint} />
  );

  return (
    <>
      <Group title="Hero">
        {T('hero_eyebrow', 'Eyebrow (small line above the headline)')}
        {T('hero_h1', 'Headline (the page’s one H1)')}
        {T('hero_intro', 'Intro', { multiline: true })}
        {T('hero_cta', 'Button label', { hint: 'Dials the main phone number from Global Settings (call tracking swaps it).' })}
        <ImageInput label="Hero video: desktop" src={v('hero_video_desktop')} onSrc={on('hero_video_desktop')} decorative />
        <ImageInput label="Hero video: mobile (780px and narrower)" src={v('hero_video_mobile')} onSrc={on('hero_video_mobile')} decorative />
        <ImageInput label="Hero video: poster (shown first; the page’s largest image)" src={v('hero_poster')} onSrc={on('hero_poster')} decorative />
        <p style={{ fontSize: 12, color: `${ADMIN_COLORS.onSurfaceVariant}cc`, margin: '0 0 1rem' }}>
          The 24 HOURS badge and the four quick-link pills are fixed (the pills are the site&apos;s standard quick links).
        </p>
      </Group>

      <Group title="Rating (used in the trust bar and the review box)">
        {T('rating', 'Google rating', { hint: 'e.g. 4.7 — fills {rating}.' })}
        {T('review_count', 'Number of Google reviews', { hint: 'e.g. 5,669+ — fills {review_count}.' })}
      </Group>

      <Group title="Trust bar">
        {T('trust_label', 'Bar label (screen readers)')}
        <Repeater<H26TextItem>
          label={`Items (1–${H26_LIMITS.trust})`}
          items={list<H26TextItem>('trust_items')}
          onChange={setList('trust_items')}
          newItem={() => ({ id: freshId('trust'), text: '' })}
          itemLabel={(_, i) => `Item ${i + 1}`}
          min={1}
          max={H26_LIMITS.trust}
          addLabel="Add an item"
          renderItem={(item, update) => <TextInput label="Text" value={item.text} onChange={(text) => update({ ...item, text })} hint="{rating} and {review_count} are filled in." />}
        />
      </Group>

      <Group title="Services">
        {T('services_eyebrow', 'Eyebrow')}
        {T('services_heading', 'Heading')}
        {T('services_intro', 'Intro', { multiline: true })}
        {T('services_card_cta', 'Card link label')}
        <Repeater<H26ServiceCard>
          label={`Photo cards (1–${H26_LIMITS.cards})`}
          items={list<H26ServiceCard>('services_cards')}
          onChange={setList('services_cards')}
          newItem={() => ({ id: freshId('card'), title: '', href: '', description: '', image: '', alt: '' })}
          itemLabel={(x, i) => x.title || `Card ${i + 1}`}
          min={1}
          max={H26_LIMITS.cards}
          addLabel="Add a card"
          renderItem={(item, update) => (
            <>
              <TextInput label="Title" value={item.title} onChange={(title) => update({ ...item, title })} />
              <TextInput label="Link" value={item.href} onChange={(href) => update({ ...item, href })} hint={linkHint(item.href) ?? 'A site path, e.g. /services/plumbing.'} />
              <TextInput label="Description" value={item.description} onChange={(description) => update({ ...item, description })} multiline />
              <ImageInput label="Photo (3:2)" src={item.image} onSrc={(image) => update({ ...item, image })} alt={item.alt} onAlt={(alt) => update({ ...item, alt })} />
            </>
          )}
        />
        {T('services_dir_title', '“Explore all” directory: title')}
        {T('services_dir_count', '“Explore all” directory: count line', { hint: '{count} = the number of service pages (counted automatically).' })}
      </Group>

      <Group title="Areas we service" note="Region names, counties and community counts come from the Locations pages and are counted automatically.">
        {T('areas_eyebrow', 'Eyebrow')}
        {T('areas_heading', 'Heading')}
        {T('areas_intro', 'Intro', { multiline: true })}
        {T('areas_stat_template', 'Line above each region name', { hint: '{tenure} = the region’s years line, {count} = its communities.' })}
        <ImageInput label="Chicagoland: photo" src={v('areas_image_chicagoland')} onSrc={on('areas_image_chicagoland')} alt={v('areas_image_alt_chicagoland')} onAlt={on('areas_image_alt_chicagoland')} />
        {T('areas_cta_chicagoland', 'Chicagoland: link label')}
        <ImageInput label="Central Ohio: photo" src={v('areas_image_columbus')} onSrc={on('areas_image_columbus')} alt={v('areas_image_alt_columbus')} onAlt={on('areas_image_alt_columbus')} />
        {T('areas_cta_columbus', 'Central Ohio: link label')}
      </Group>

      <Group title="Real Jobs, Real Reviews">
        {T('reviews_eyebrow', 'Eyebrow')}
        {T('reviews_heading', 'Heading')}
        {T('reviews_intro', 'Intro', { multiline: true })}
        {T('proof_sub', 'Review box: line under the rating', { hint: '{review_count} is filled in.' })}
        {T('bbb_url', 'BBB profile link', { hint: linkHint(v('bbb_url')) })}
        <ImageInput label="BBB seal" src={v('bbb_seal')} onSrc={on('bbb_seal')} alt={v('bbb_seal_alt')} onAlt={on('bbb_seal_alt')} />
        {T('bbb_label', 'BBB line')}
        {T('jobs_label', 'Job tabs label (screen readers)')}
        {T('jobs_photos_label', 'Photo counter text (after “1 / 6”)')}
        {T('jobs_read_on_google', '“Read on Google” link label')}
        <Repeater<H26Job>
          label={`Jobs (1–${H26_LIMITS.jobs})`}
          items={list<H26Job>('jobs')}
          onChange={setList('jobs')}
          newItem={() => ({ id: freshId('job'), tab_title: '', tab_city: '', title: '', location: '', stars: 5, quote: '', author: '', author_label: 'Verified Customer', review_url: '', photos: [] })}
          itemLabel={(x, i) => x.tab_title || `Job ${i + 1}`}
          min={1}
          max={H26_LIMITS.jobs}
          addLabel="Add a job"
          renderItem={(job, update) => (
            <>
              <TextInput label="Tab: title" value={job.tab_title} onChange={(tab_title) => update({ ...job, tab_title })} />
              <TextInput label="Tab: city" value={job.tab_city} onChange={(tab_city) => update({ ...job, tab_city })} />
              <TextInput label="Panel title" value={job.title} onChange={(title) => update({ ...job, title })} />
              <TextInput label="Location (e.g. Joliet, IL)" value={job.location} onChange={(location) => update({ ...job, location })} />
              <Select
                label="Star rating"
                value={String(job.stars ?? 5)}
                options={[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} star${n > 1 ? 's' : ''}` }))}
                onChange={(s) => update({ ...job, stars: Number(s) })}
              />
              <TextInput label="Review quote (without quote marks; “[…]” is fine)" value={job.quote} onChange={(quote) => update({ ...job, quote })} multiline />
              <TextInput label="Author name" value={job.author} onChange={(author) => update({ ...job, author })} />
              <TextInput label="Author label" value={job.author_label} onChange={(author_label) => update({ ...job, author_label })} />
              <TextInput
                label="Google review link (optional — blank hides “Read on Google”)"
                value={job.review_url}
                onChange={(review_url) => update({ ...job, review_url })}
                hint={job.review_url && !/^https:\/\//.test(job.review_url.trim()) ? 'Must be a full https:// link, or the link is hidden.' : undefined}
              />
              <Repeater<H26Photo>
                label={`Photos from this job (1–${H26_LIMITS.photos})`}
                items={job.photos ?? []}
                onChange={(photos) => update({ ...job, photos })}
                newItem={() => ({ id: freshId('photo'), image: '', alt: '' })}
                itemLabel={(_, i) => `Photo ${i + 1}${i === 0 ? ' (shown first)' : ''}`}
                min={1}
                max={H26_LIMITS.photos}
                addLabel="Add a photo"
                renderItem={(p, up) => <ImageInput label="Photo (3:2)" src={p.image} onSrc={(image) => up({ ...p, image })} alt={p.alt} onAlt={(alt) => up({ ...p, alt })} />}
              />
              {(!job.tab_title || !job.quote || !job.author || !(job.photos ?? []).some((p) => p.image)) && (
                <p style={{ fontSize: 12, color: BRAND.cream, background: `${BRAND.carmine}cc`, borderRadius: '0.4rem', padding: '0.2rem 0.5rem', display: 'inline-block' }}>
                  A job needs a tab title, a quote, an author and at least one photo — otherwise it won’t show.
                </p>
              )}
            </>
          )}
        />
      </Group>

      <Group title="Why J. Blanton">
        {T('why_eyebrow', 'Eyebrow')}
        {T('why_heading', 'Heading')}
        {T('why_body', 'Body', { multiline: true, hint: para })}
        {T('why_cta_call', 'Call button label', { hint: 'Dials the main phone number from Global Settings.' })}
        {T('why_cta_label', 'Second button label (links to /why-j-blanton)')}
        <TextInput
          label="YouTube video (id or link)"
          value={v('why_video_id')}
          onChange={on('why_video_id')}
          hint={ytOk ? `Plays: ${youtubeId(v('why_video_id')) ?? H26_SCALAR_FIELDS.why_video_id.def}. Nothing loads from YouTube until a visitor presses play.` : 'Not a YouTube id or link — the standard video will show.'}
        />
        {T('why_video_title', 'Video title (shown on the thumbnail)')}
      </Group>

      <Group title="No Drip Club banner">
        {T('ndc_mark', 'Banner mark (one word per line)')}
        {T('ndc_body', 'Body', { multiline: true })}
        {T('ndc_cta', 'Button label (links to /no-drip-club)')}
        <ImageInput label="Character image" src={v('ndc_image')} onSrc={on('ndc_image')} alt={v('ndc_image_alt')} onAlt={on('ndc_image_alt')} />
      </Group>

      <Group title="Knowledge Hub">
        {T('kh_eyebrow', 'Eyebrow')}
        {T('kh_heading', 'Heading')}
        {T('kh_intro', 'Intro', { multiline: true })}
        {T('kh_card_cta', 'Card link label')}
        {T('kh_cta', 'Button label (links to /knowledge-hub)')}
        <Repeater<H26FeaturedItem>
          label={`Featured articles (1–${H26_LIMITS.featured})`}
          items={list<H26FeaturedItem>('kh_featured')}
          onChange={setList('kh_featured')}
          newItem={() => ({ id: freshId('article'), slug: '' })}
          itemLabel={(_, i) => `Card ${i + 1}`}
          min={1}
          max={H26_LIMITS.featured}
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

      <Group title="Where to find us" note="The offices (and how many there are) come from Global Settings.">
        {T('loc_eyebrow', 'Eyebrow')}
        {T('loc_heading', 'Heading')}
        {T('loc_intro', 'Intro', { multiline: true })}
        {T('loc_search_label', 'Search box label (screen readers)')}
        {T('loc_search_placeholder', 'Search box placeholder')}
        {T('loc_count', 'Office count', { hint: '{count} = the number of offices shown.' })}
        {T('loc_match', 'Line under an office found by a town', { hint: '{cities} = the towns that matched.' })}
        {T('loc_empty', 'No results: text')}
        {T('loc_empty_link', 'No results: link label (links to /locations)')}
        {T('loc_map_button', 'Map button (loads the interactive map)')}
        {T('loc_map_title', 'Map title (screen readers)')}
        {T('loc_open_maps', '“Open in Maps” label')}
      </Group>

      <MetaSection
        metaTitle={str(c.meta_title)}
        metaDescription={str(c.meta_description)}
        onMetaTitleChange={(x) => set({ ...c, meta_title: x })}
        onMetaDescriptionChange={(x) => set({ ...c, meta_description: x })}
      />
    </>
  );
}
