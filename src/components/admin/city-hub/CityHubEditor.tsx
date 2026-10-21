'use client';

/**
 * Brief 212 (= Brief 206 Track C) — the City Hub editor, `/admin/city/<slug>` for a city on the City
 * Hub template. One group per section in page order, labelled with the section's visible heading
 * (Brief 206 §3). Every per-city field is a control; the sections every hub shares are edited once at
 * /admin/city-hubs. The layout is locked: lists (trust items, service cards, communities, tiles,
 * FAQs) can grow, shrink and reorder; sections cannot; reviews stay exactly 3.
 */
import { useEffect, useState } from 'react';
import { ADMIN_COLORS } from '@/lib/admin/theme';
import TemplateSwitcher from '@/components/admin/TemplateSwitcher';
import { BRAND, Group, ImageInput, Notice, Repeater, Select, TextInput } from '@/components/admin/sewer-v2/ui';
import { MdTextInput } from '@/components/admin/v2-shared/MdTextInput';
import V2EditorShell from '@/components/admin/v2-shared/V2EditorShell';
import {
  blankCityHub,
  CITY_HUB_TEMPLATE,
  faqPreviewFromAnswer,
  isCityHubDraftContent,
  OLD_HUB_SHAPE_MESSAGE,
  PRE_HUB_ARCHIVE_LABEL,
  type CityHubDraftContent,
  type CityHubStored,
  type HubPhoto,
  type HubReview,
} from '@/lib/city-hub-cms/model';

interface Load {
  exists: boolean;
  status: string | null;
  version: number;
  updatedAt: string | null;
  templateType: string | null;
  preHubTemplate: string | null;
  name: string;
  hasCodeModule: boolean;
  hub: CityHubStored | null;
  metaTitle: string;
  metaDescription: string;
  source: 'row' | 'code' | 'none';
  phoneRegion: 'main' | 'central-ohio';
  serviceOptions: { value: string; label: string }[];
  cityOptions: { value: string; label: string }[];
}

const TEMPLATES = ['coverage-area', 'local-office', 'local-office-v2', 'local-office-v3', 'city-hub'];
const TEMPLATE_LABELS: Record<string, string> = {
  'coverage-area': 'Coverage Area City',
  'local-office': 'Local Office City',
  'local-office-v2': 'Local Office V2',
  'local-office-v3': 'Local Office V3',
  'city-hub': 'City Hub',
};
const PHONE_HINT = 'Phone numbers come from Global Settings — never type one here.';
const SHARED_LINK = <a href="/admin/city-hubs" style={{ color: BRAND.cream }}>Shared across all City Hubs ↗</a>;

export default function CityHubEditor({ slug }: { slug: string }) {
  const [load, setLoad] = useState<Load | null>(null);
  const [error, setError] = useState('');
  const [switchOpen, setSwitchOpen] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/cms/city-hub/${slug}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(r.status === 404 ? 'not-found' : `HTTP ${r.status}`);
        return (await r.json()) as Load;
      })
      .then((d) => !cancelled && setLoad(d))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => { cancelled = true; };
  }, [slug]);

  if (error) return <main style={{ padding: '2rem', color: ADMIN_COLORS.error }}>{error === 'not-found' ? `"${slug}" is not a city.` : `Failed to load (${error}). Please refresh.`}</main>;
  if (!load) return <main style={{ padding: '2rem', color: ADMIN_COLORS.onSurfaceVariant }}>Loading…</main>;

  const initial: CityHubDraftContent = {
    template: CITY_HUB_TEMPLATE,
    hub: load.hub ?? blankCityHub(load.name),
    metaTitle: load.metaTitle,
    metaDescription: load.metaDescription,
  };
  const live = load.templateType === CITY_HUB_TEMPLATE;
  return (
    <>
      <V2EditorShell<CityHubDraftContent>
        pageType="city"
        slug={slug}
        publicPath={`/${slug}`}
        title={load.name}
        templateName="City Hub"
        template={CITY_HUB_TEMPLATE}
        isOwnContent={isCityHubDraftContent}
        initial={initial}
        oldShapeMessage={OLD_HUB_SHAPE_MESSAGE}
        archiveLabels={[PRE_HUB_ARCHIVE_LABEL]}
        updatedAt={load.updatedAt}
        parentLabel="Cities"
        templateControl={{
          value: load.templateType ?? 'coverage-area',
          label: TEMPLATE_LABELS[load.templateType ?? 'coverage-area'] ?? load.templateType ?? '',
          options: TEMPLATES.map((t) => ({ value: t, label: TEMPLATE_LABELS[t] })),
          onChange: (t) => { setPendingTemplate(t); setSwitchOpen(true); },
        }}
        intro={
          <>
            Editing the City Hub for <a href={`/${slug}`} target="_blank" rel="noreferrer" style={{ color: BRAND.cream }}>/{slug}</a>. Words, links, photos and list
            items are editable; the layout is fixed. Save writes the open version; Preview shows it before anyone else sees it; Publish (Status in the
            sidebar) puts it live. The financing banner, Why Us items, video, No Drip Club box, services list and small labels are edited once for
            every hub: {SHARED_LINK}.
            {!live && <> <strong>This city is not on the City Hub template yet</strong> — the live page keeps its current design until a City Hub version is published.</>}
            {load.source === 'none' && <> Every per-city field starts empty; a City Hub can’t go live until all of them are filled in.</>}
            {load.phoneRegion === 'central-ohio' && <> This is an Ohio city: its page body shows the Central Ohio phone from Global Settings.</>}
          </>
        }
        renderFields={(c, set) => <HubFields value={c} onChange={set} load={load} slug={slug} />}
      />
      {switchOpen && (
        <TemplateSwitcher
          pageType="city"
          pageSlug={slug}
          currentTemplate={load.templateType ?? 'coverage-area'}
          availableTemplates={TEMPLATES}
          onSwitched={() => window.location.reload()}
          open={switchOpen}
          onOpenChange={setSwitchOpen}
          initialSelectedTemplate={pendingTemplate}
          hideTrigger
        />
      )}
    </>
  );
}

function HubFields({ value, onChange, load, slug }: { value: CityHubDraftContent; onChange: (v: CityHubDraftContent) => void; load: Load; slug: string }) {
  const hub = value.hub;
  const setHub = (patch: Partial<CityHubStored>) => onChange({ ...value, hub: { ...hub, ...patch } });
  const svcOf = (href: string) => href.replace(new RegExp(`^/${slug}/`), '');
  const custom = hub.hero.photo !== 'standard' ? (hub.hero.photo as HubPhoto) : null;
  return (
    <>
      <Group title="SEO (Google)" note="The page title Google shows (the site adds “ | J. Blanton Plumbing” once, automatically) and the description under it.">
        <TextInput label="SEO title (Google)" value={value.metaTitle} onChange={(metaTitle) => onChange({ ...value, metaTitle })} limit={60} hint="Don’t add “| J. Blanton Plumbing” — the site adds it." />
        <TextInput label="SEO description (Google)" value={value.metaDescription} onChange={(metaDescription) => onChange({ ...value, metaDescription })} limit={160} multiline />
      </Group>

      <Group title={`Hero — “${hub.hero.h1 || 'Plumbers in …'}”`} note={PHONE_HINT}>
        <TextInput label="Eyebrow" value={hub.hero.eyebrow} onChange={(eyebrow) => setHub({ hero: { ...hub.hero, eyebrow } })} />
        <TextInput label="Heading (H1)" value={hub.hero.h1} onChange={(h1) => setHub({ hero: { ...hub.hero, h1 } })} />
        <TextInput label="Text" value={hub.hero.sub} onChange={(sub) => setHub({ hero: { ...hub.hero, sub } })} multiline />
        <Select
          label="Photo"
          value={custom ? 'custom' : 'standard'}
          options={[{ value: 'standard', label: 'Standard van photo (edited on the shared screen)' }, { value: 'custom', label: 'Custom photo' }]}
          onChange={(v) =>
            setHub({ hero: { ...hub.hero, photo: v === 'standard' ? 'standard' : { src: '', src1100: '', mobile: '', alt: '', width: 2000, height: 1189 } } })
          }
        />
        {custom && (
          <>
            <ImageInput label="Desktop photo (2000 px wide)" src={custom.src} alt={custom.alt} onSrc={(src) => setHub({ hero: { ...hub.hero, photo: { ...custom, src } } })} onAlt={(alt) => setHub({ hero: { ...hub.hero, photo: { ...custom, alt } } })} />
            <ImageInput label="Desktop photo, 1100 px wide (optional)" src={custom.src1100} onSrc={(src1100) => setHub({ hero: { ...hub.hero, photo: { ...custom, src1100 } } })} decorative />
            <ImageInput label="Phone photo (shown at 900 px and narrower)" src={custom.mobile} onSrc={(mobile) => setHub({ hero: { ...hub.hero, photo: { ...custom, mobile } } })} decorative />
            <TextInput label="Desktop photo width (px)" value={String(custom.width)} onChange={(w) => setHub({ hero: { ...hub.hero, photo: { ...custom, width: Number(w) || custom.width } } })} />
            <TextInput label="Desktop photo height (px)" value={String(custom.height)} onChange={(h) => setHub({ hero: { ...hub.hero, photo: { ...custom, height: Number(h) || custom.height } } })} />
          </>
        )}
        <TextInput label="Crop (locked)" value={hub.hero.crop === 'columbus' ? 'Columbus crop' : 'Standard'} onChange={() => {}} readOnly hint="A new custom photo may need its crop tuned in code." />
        {/* Brief 216 (Track C3): the hero layout and the full-bleed hero's video. */}
        <Select
          label="Hero layout"
          value={hub.hero.layout ?? 'split'}
          options={[
            { value: 'split', label: 'Split — photo on the right, Midnight text column (every hub’s standard)' },
            { value: 'full-bleed', label: 'Full-bleed — full-width video or photo under a soft overlay' },
          ]}
          onChange={(v) => {
            const { layout: _l, video: _v, ...rest } = hub.hero;
            setHub({ hero: v === 'full-bleed' ? { ...rest, layout: 'full-bleed', video: hub.hero.video ?? { src: '', poster: '' } } : rest });
          }}
        />
        {hub.hero.layout === 'full-bleed' && (
          <>
            <TextInput
              label="Background video (MP4 address)"
              value={hub.hero.video?.src ?? ''}
              onChange={(src) => setHub({ hero: { ...hub.hero, video: { ...(hub.hero.video ?? { poster: '' }), src } } })}
              hint="An https address on the site’s CloudFront or S3 storage. Leave empty to show the photo above instead."
            />
            <TextInput
              label="Poster image (shown before the video plays, and to visitors who turn motion off)"
              value={hub.hero.video?.poster ?? ''}
              onChange={(poster) => setHub({ hero: { ...hub.hero, video: { ...(hub.hero.video ?? { src: '' }), poster } } })}
            />
            <TextInput
              label="Phone video (optional, played below 781 px)"
              value={hub.hero.video?.srcMobile ?? ''}
              onChange={(srcMobile) => {
                const { srcMobile: _m, ...v } = hub.hero.video ?? { src: '', poster: '' };
                setHub({ hero: { ...hub.hero, video: srcMobile.trim() ? { ...v, srcMobile } : v } });
              }}
            />
          </>
        )}
      </Group>

      <Group title="Trust bar">
        <Repeater<string> label="Items" items={hub.trust} onChange={(trust) => setHub({ trust })} newItem={() => ''} addLabel="Add an item"
          renderItem={(t, update) => <TextInput label="Text" value={t} onChange={update} />} itemLabel={(t, i) => `${i + 1} — ${t.slice(0, 48)}`} />
      </Group>

      <Group title={hub.services.h2 || 'Services'} note={<>The “Explore all our plumbing services” list is shared: {SHARED_LINK}.</>}>
        <TextInput label="Heading" value={hub.services.h2} onChange={(h2) => setHub({ services: { ...hub.services, h2 } })} />
        <TextInput label="Intro" value={hub.services.intro} onChange={(intro) => setHub({ services: { ...hub.services, intro } })} multiline />
        <Repeater
          label="Service cards"
          items={hub.services.cards}
          onChange={(cards) => setHub({ services: { ...hub.services, cards } })}
          newItem={() => ({ title: '', href: '', desc: '', image: { src: '', alt: '' } })}
          addLabel="Add a service card"
          itemLabel={(c, i) => `${i + 1} — ${c.title}`}
          renderItem={(c, update) => (
            <>
              <Select label="Service page" value={svcOf(c.href)} options={[{ value: '', label: '— choose —' }, ...load.serviceOptions]} onChange={(s) => update({ ...c, href: s ? `/${slug}/${s}` : '' })} />
              <TextInput label="Title" value={c.title} onChange={(title) => update({ ...c, title })} />
              <TextInput label="Description" value={c.desc} onChange={(desc) => update({ ...c, desc })} multiline />
              <ImageInput label="Photo" src={c.image.src} alt={c.image.alt} onSrc={(src) => update({ ...c, image: { ...c.image, src } })} onAlt={(alt) => update({ ...c, image: { ...c.image, alt } })} />
            </>
          )}
        />
      </Group>

      <Group title={hub.office.h2 || 'Office'} note="The address drives the map pin and the address card.">
        <TextInput label="Eyebrow" value={hub.office.eyebrow} onChange={(eyebrow) => setHub({ office: { ...hub.office, eyebrow } })} />
        <TextInput label="Heading" value={hub.office.h2} onChange={(h2) => setHub({ office: { ...hub.office, h2 } })} />
        <TextInput label="Text" value={hub.office.body} onChange={(body) => setHub({ office: { ...hub.office, body } })} multiline />
        <TextInput label="Address" value={hub.office.address} onChange={(address) => setHub({ office: { ...hub.office, address } })} />
        <TextInput label="Communities heading" value={hub.office.areasH3} onChange={(areasH3) => setHub({ office: { ...hub.office, areasH3 } })} />
        <Repeater<CityHubStored['office']['areas'][number]>
          label="Communities"
          items={hub.office.areas}
          onChange={(areas) => setHub({ office: { ...hub.office, areas } })}
          newItem={() => ({ label: '', href: '' })}
          addLabel="Add a community"
          itemLabel={(a, i) => `${i + 1} — ${a.label}`}
          renderItem={(a, update) => (
            <>
              <Select label="City page" value={a.href.replace(/^\//, '')} options={[{ value: '', label: '— choose —' }, ...load.cityOptions]} onChange={(s) => update({ ...a, href: s ? `/${s}` : '', label: a.label || (load.cityOptions.find((o) => o.value === s)?.label ?? '') })} />
              <TextInput label="Label" value={a.label} onChange={(label) => update({ ...a, label })} />
              <TextInput
                label="Name in the Google schema (optional)"
                value={a.area ?? ''}
                onChange={(area) => {
                  const { area: _a, ...rest } = a;
                  update(area.trim() ? { ...rest, area } : rest);
                }}
                hint="Only when it isn’t “Label, ST” — e.g. “Rogers Park, Chicago, IL”."
              />
            </>
          )}
        />
        {/* Brief 216 (Track A2): the page-scoped Plumber JSON-LD. */}
        <TextInput
          label="Google Business Profile link"
          value={hub.office.gbpUrl ?? ''}
          onChange={(gbpUrl) => {
            const { gbpUrl: _g, ...rest } = hub.office;
            setHub({ office: gbpUrl.trim() ? { ...rest, gbpUrl } : rest });
          }}
          link
          hint="The office’s Google share link (https://maps.app.goo.gl/… or https://www.google.com/maps/…). When set, the page tells Google it is this listing (sameAs + hasMap)."
        />
        <TextInput
          label="Office name in the Google schema (optional)"
          value={hub.office.schemaName ?? ''}
          onChange={(schemaName) => {
            const { schemaName: _n, ...rest } = hub.office;
            setHub({ office: schemaName.trim() ? { ...rest, schemaName } : rest });
          }}
          hint={`Shown as “J. Blanton Plumbing - …”. Empty = “${load.name}”.`}
        />
        <TextInput
          label="This city in the Google schema’s service area (optional)"
          value={hub.office.schemaArea ?? ''}
          onChange={(schemaArea) => {
            const { schemaArea: _s, ...rest } = hub.office;
            setHub({ office: schemaArea.trim() ? { ...rest, schemaArea } : rest });
          }}
          hint="Empty = “City, ST” from the address. Chicago neighborhoods use e.g. “Lincoln Park, Chicago, IL”."
        />
        <Select
          label="“more” link"
          value={hub.office.more}
          options={[{ value: '/locations/chicagoland', label: '/locations/chicagoland' }, { value: '/locations/central-ohio', label: '/locations/central-ohio' }, ...(['/locations/chicagoland', '/locations/central-ohio'].includes(hub.office.more) ? [] : [{ value: hub.office.more, label: hub.office.more || '— choose —' }])]}
          onChange={(more) => setHub({ office: { ...hub.office, more } })}
        />
      </Group>

      <Group title={hub.depth.h2 || 'Local Knowledge'}>
        <TextInput label="Heading" value={hub.depth.h2} onChange={(h2) => setHub({ depth: { ...hub.depth, h2 } })} />
        <TextInput label="Intro" value={hub.depth.intro} onChange={(intro) => setHub({ depth: { ...hub.depth, intro } })} multiline />
        <Repeater
          label="Tiles"
          items={hub.depth.tiles}
          onChange={(tiles) => setHub({ depth: { ...hub.depth, tiles } })}
          newItem={() => ({ title: '', body: '' })}
          addLabel="Add a tile"
          itemLabel={(t, i) => `${i + 1} — ${t.title}`}
          renderItem={(t, update) => (
            <>
              <TextInput label="Title" value={t.title} onChange={(title) => update({ ...t, title })} />
              <MdTextInput label="Text" value={t.body} onChange={(body) => update({ ...t, body })} multiline />
            </>
          )}
        />
      </Group>

      <Group title="Financing banner" note={<>Shared by every City Hub: {SHARED_LINK}.</>} />

      <Group title={hub.whyH2 || 'Why Us'} note={<>The intro, the three items and the photo are shared by every City Hub: {SHARED_LINK}.</>}>
        <TextInput label="Heading" value={hub.whyH2} onChange={(whyH2) => setHub({ whyH2 })} />
      </Group>

      <Group title="Video" note={<>Shared by every City Hub: {SHARED_LINK}.</>} />

      <Group title={hub.reviews.h2 || 'Reviews'} note="Exactly 3 reviews: the first is the large one. The stars’ screen-reader label is built from the rating.">
        <TextInput label="Eyebrow" value={hub.reviews.eyebrow} onChange={(eyebrow) => setHub({ reviews: { ...hub.reviews, eyebrow } })} />
        <TextInput label="Heading" value={hub.reviews.h2} onChange={(h2) => setHub({ reviews: { ...hub.reviews, h2 } })} />
        <TextInput label="Intro" value={hub.reviews.intro} onChange={(intro) => setHub({ reviews: { ...hub.reviews, intro } })} multiline />
        <TextInput label="Rating (e.g. 4.7)" value={hub.reviews.rating} onChange={(rating) => setHub({ reviews: { ...hub.reviews, rating } })} />
        <TextInput label="Rating caption" value={hub.reviews.ratingSub} onChange={(ratingSub) => setHub({ reviews: { ...hub.reviews, ratingSub } })} />
        {hub.reviews.items.map((r, i) => {
          const update = (next: HubReview) => setHub({ reviews: { ...hub.reviews, items: hub.reviews.items.map((x, y) => (y === i ? next : x)) as CityHubStored['reviews']['items'] } });
          return (
            <div key={i} style={{ borderLeft: `2px solid ${BRAND.cerulean}55`, paddingLeft: '0.75rem', marginBottom: '0.75rem' }}>
              <p style={{ fontFamily: 'var(--font-outfit), system-ui, sans-serif', fontSize: '13px', fontWeight: 700, color: ADMIN_COLORS.onSurface, margin: '0 0 0.5rem' }}>{i === 0 ? 'Review 1 (large)' : `Review ${i + 1}`}</p>
              <TextInput label="Name" value={r.name} onChange={(name) => update({ ...r, name })} />
              <TextInput label="Google review link (optional)" value={r.url ?? ''} onChange={(url) => update({ ...r, url: url.trim() ? url : null })} link />
              <TextInput label="Review" value={r.text} onChange={(text) => update({ ...r, text })} multiline hint="Quoted exactly as the customer wrote it." />
            </div>
          );
        })}
      </Group>

      <Group title={hub.faq.h2 || 'FAQ'}>
        <TextInput label="Heading" value={hub.faq.h2} onChange={(h2) => setHub({ faq: { ...hub.faq, h2 } })} />
        <Repeater
          label="Questions"
          items={hub.faq.items}
          onChange={(items) => setHub({ faq: { ...hub.faq, items } })}
          newItem={() => ({ q: '', preview: '', a: '' })}
          addLabel="Add a question"
          itemLabel={(f, i) => `${i + 1} — ${f.q}`}
          renderItem={(f, update) => (
            <>
              <TextInput label="Question" value={f.q} onChange={(q) => update({ ...f, q })} />
              <MdTextInput
                label="Short answer (shown while the question is closed)"
                value={f.preview}
                onChange={(preview) => update({ ...f, preview })}
                multiline
                links={false}
                actions={
                  <button type="button" onClick={() => update({ ...f, preview: faqPreviewFromAnswer(f.a) })} style={{ fontFamily: 'var(--font-nunito), system-ui, sans-serif', fontSize: '12px', fontWeight: 600, color: BRAND.cream, background: BRAND.cerulean, border: 'none', borderRadius: '0.4rem', padding: '0.2rem 0.55rem', cursor: 'pointer' }}>
                    Auto-fill from answer
                  </button>
                }
              />
              <MdTextInput label="Full answer" value={f.a} onChange={(a) => update({ ...f, a })} multiline />
            </>
          )}
        />
      </Group>

      <Group title="No Drip Club" note={<>The eyebrow, heading, benefits, button and mascot are shared: {SHARED_LINK}. This city’s sentence is below.</>}>
        <MdTextInput label="This city’s sentence" value={hub.ndc} onChange={(ndc) => setHub({ ndc })} multiline />
      </Group>

      <Group title={hub.final.h2 || 'Final call to action'} note={PHONE_HINT}>
        <TextInput label="Eyebrow" value={hub.final.eyebrow} onChange={(eyebrow) => setHub({ final: { ...hub.final, eyebrow } })} />
        <TextInput label="Heading" value={hub.final.h2} onChange={(h2) => setHub({ final: { ...hub.final, h2 } })} />
        <TextInput label="Text" value={hub.final.body} onChange={(body) => setHub({ final: { ...hub.final, body } })} multiline />
      </Group>
      <Notice>Phone numbers on this page come from Global Settings{load.phoneRegion === 'central-ohio' ? ' (the body uses the Central Ohio phone)' : ''}.</Notice>
    </>
  );
}
