'use client';

/**
 * Brief 212 (Track B) — the City Service V2 editor, `/admin/city-service/<city>/<service>` for a V2
 * page. Meta, Hero and Trust, then one panel per section in the page's fixed order. Inside a section,
 * list items (tiles, bullets, steps, local items, table rows, FAQs, reviews 1–3, service cards) can be
 * added, removed and reordered; sections cannot. A folded section's anchor is read-only (it is the
 * 301 contract). The Service JSON-LD is derived from the fields on save, not typed.
 *
 * The rail, quick links, sticky bar and No Drip Club text are identical on every V2 page and stay in
 * code this round (Brief 212 Track B follow-up).
 */
import { useEffect, useState } from 'react';
import { ADMIN_COLORS } from '@/lib/admin/theme';
import { BRAND, Group, ImageInput, Notice, Repeater, TextInput } from '@/components/admin/sewer-v2/ui';
import { MdTextInput } from '@/components/admin/v2-shared/MdTextInput';
import { COMPANY_RATING_TOKEN_HELP, RATING_TOKEN_HELP } from '@/lib/cms/tokens';
import V2EditorShell from '@/components/admin/v2-shared/V2EditorShell';
import type { CsBlock, CsImage } from '@/lib/content/city-services-v2/types';
import {
  CITY_SERVICE_V2_TEMPLATE,
  isCityServiceV2DraftContent,
  OLD_SERVICE_SHAPE_MESSAGE,
  PRE_V2_ARCHIVE_LABEL,
  type CityServiceStored,
  type CityServiceV2DraftContent,
} from '@/lib/city-service-v2-cms/model';

interface Load {
  exists: boolean;
  status: string | null;
  version: number;
  updatedAt: string | null;
  cityName: string;
  page: CityServiceStored | null;
  metaTitle: string;
  metaDescription: string;
  source: 'row' | 'code' | 'none';
  foldIds: string[];
  hasV2Version: boolean;
}

const LABELS: Record<CsBlock['type'], string> = {
  split: 'Section', fold: 'Folded section', tiles: 'Tiles', steps: 'Steps', local: 'Local Knowledge', table: 'Table',
  reviews: 'Reviews', faq: 'Frequently asked questions', ndc: 'No Drip Club', services: 'Services', final: 'Final call to action',
};

export default function CityServiceV2Editor({ city, service, load }: { city: string; service: string; load: Load }) {
  if (!load.page) return <main style={{ padding: '2rem', color: ADMIN_COLORS.onSurfaceVariant }}>This page has no City Service V2 content.</main>;
  const initial: CityServiceV2DraftContent = { template: CITY_SERVICE_V2_TEMPLATE, page: load.page, metaTitle: load.metaTitle, metaDescription: load.metaDescription };
  const path = `/${city}/${service}`;
  return (
    <V2EditorShell<CityServiceV2DraftContent>
      pageType="city-service"
      slug={`${city}/${service}`}
      publicPath={path}
      title={`${load.cityName} — ${load.page.hero.crumb}`}
      templateName="City Service V2"
      template={CITY_SERVICE_V2_TEMPLATE}
      isOwnContent={isCityServiceV2DraftContent}
      initial={initial}
      oldShapeMessage={OLD_SERVICE_SHAPE_MESSAGE}
      archiveLabels={[PRE_V2_ARCHIVE_LABEL]}
      updatedAt={load.updatedAt}
      parentLabel={load.cityName}
      intro={
        <>
          Editing <a href={path} target="_blank" rel="noreferrer" style={{ color: BRAND.cream }}>{path}</a>. Words, links, photos and list items are editable; the
          sections and their order are fixed. Save writes the open version; Preview shows it first; Publish (Status in the sidebar) puts it live.
          {load.source === 'code' && <> This page has not been moved onto its CMS row yet — the deploy seed does that; until then the live page shows the built-in copy.</>}
        </>
      }
      renderFields={(c, set) => <ServiceFields value={c} onChange={set} city={city} />}
    />
  );
}

function img(label: string, v: CsImage, set: (n: CsImage) => void) {
  return <ImageInput label={label} src={v.src} alt={v.alt} onSrc={(src) => set({ ...v, src })} onAlt={(alt) => set({ ...v, alt })} />;
}

function ServiceFields({ value, onChange, city }: { value: CityServiceV2DraftContent; onChange: (v: CityServiceV2DraftContent) => void; city: string }) {
  const p = value.page;
  const setPage = (patch: Partial<CityServiceStored>) => onChange({ ...value, page: { ...p, ...patch } });
  const setBlock = (i: number, b: CsBlock) => setPage({ blocks: p.blocks.map((x, y) => (y === i ? b : x)) });
  return (
    <>
      <Group title="SEO (Google)" note="The site adds “ | J. Blanton Plumbing” once, automatically. The Service details Google reads are built from these fields on save.">
        <TextInput label="SEO title (Google)" value={value.metaTitle} onChange={(metaTitle) => onChange({ ...value, metaTitle })} limit={60} />
        <TextInput label="SEO description (Google)" value={value.metaDescription} onChange={(metaDescription) => onChange({ ...value, metaDescription })} limit={160} multiline />
      </Group>
      <Group title={`Hero — “${p.hero.h1}”`} note="The breadcrumb links to the city hub automatically. Phone numbers come from Global Settings.">
        <TextInput label="Breadcrumb label" value={p.hero.crumb} onChange={(crumb) => setPage({ hero: { ...p.hero, crumb } })} />
        <TextInput label="Eyebrow" value={p.hero.eyebrow} onChange={(eyebrow) => setPage({ hero: { ...p.hero, eyebrow } })} />
        <TextInput label="Heading (H1)" value={p.hero.h1} onChange={(h1) => setPage({ hero: { ...p.hero, h1 } })} />
        <MdTextInput label="Text" value={p.hero.sub} onChange={(sub) => setPage({ hero: { ...p.hero, sub } })} multiline />
        {img('Photo', p.hero.img, (n) => setPage({ hero: { ...p.hero, img: n } }))}
      </Group>
      <Group title="Trust rail (3 items)" note={COMPANY_RATING_TOKEN_HELP}>
        {p.trust.map((t, i) => (
          <TextInput key={i} label={`Item ${i + 1}`} value={t} onChange={(v) => setPage({ trust: p.trust.map((x, y) => (y === i ? v : x)) })} />
        ))}
      </Group>
      {p.blocks.map((b, i) => (
        <Group key={b.id} title={`${LABELS[b.type]}${'h2' in b && b.h2 ? ` — “${b.h2}”` : ''}`} note={b.type === 'fold' ? <>Anchor <code>#{b.id}</code> (read-only: old URLs redirect here).</> : undefined}>
          <BlockFields b={b} set={(n) => setBlock(i, n)} city={city} />
        </Group>
      ))}
      <Group title="Office details for Google (Service schema provider)" note="Name, link and address of the office the page belongs to. The phone is filled in from Global Settings.">
        <TextInput label="Office name" value={String(p.serviceSchema.provider.name ?? '')} onChange={(name) => setPage({ serviceSchema: { ...p.serviceSchema, provider: { ...p.serviceSchema.provider, name } } })} />
        <TextInput label="Office page link" value={String(p.serviceSchema.provider.url ?? '')} onChange={(url) => setPage({ serviceSchema: { ...p.serviceSchema, provider: { ...p.serviceSchema.provider, url } } })} link />
        {(['streetAddress', 'addressLocality', 'addressRegion', 'postalCode'] as const).map((k) => {
          const addr = (p.serviceSchema.provider.address ?? {}) as Record<string, string>;
          return (
            <TextInput key={k} label={k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())} value={addr[k] ?? ''} onChange={(v) => setPage({ serviceSchema: { ...p.serviceSchema, provider: { ...p.serviceSchema.provider, address: { ...addr, [k]: v } } } })} />
          );
        })}
      </Group>
      <Notice>The quick links, contact rail, financing card, sticky call bar and No Drip Club text are the same on every City Service V2 page.</Notice>
    </>
  );
}

function BlockFields({ b, set, city }: { b: CsBlock; set: (n: CsBlock) => void; city: string }) {
  const head = 'eyebrow' in b && (
    <>
      <TextInput label="Eyebrow" value={b.eyebrow} onChange={(eyebrow) => set({ ...b, eyebrow } as CsBlock)} />
      <TextInput label="Heading" value={b.h2} onChange={(h2) => set({ ...b, h2 } as CsBlock)} />
    </>
  );
  switch (b.type) {
    case 'split':
      return (
        <>
          {head}
          <MdTextInput label="Text" value={b.body} onChange={(body) => set({ ...b, body })} multiline />
          {b.img && img('Photo', b.img, (n) => set({ ...b, img: n }))}
        </>
      );
    case 'fold':
      return (
        <>
          {head}
          <Repeater<string> label="Paragraphs" items={b.bodies} onChange={(bodies) => set({ ...b, bodies })} newItem={() => ''} addLabel="Add a paragraph"
            renderItem={(t, u) => <MdTextInput label="Paragraph" value={t} onChange={u} multiline />} />
          {b.img && img('Photo', b.img, (n) => set({ ...b, img: n }))}
        </>
      );
    case 'tiles':
      return (
        <>
          {head}
          <MdTextInput label="Intro" value={b.intro} onChange={(intro) => set({ ...b, intro })} multiline />
          <Repeater
            label="Tiles"
            items={b.tiles}
            onChange={(tiles) => set({ ...b, tiles })}
            newItem={(items) => (items[0]?.bullets ? { h3: '', bullets: [''] } : { h3: '', body: '' })}
            addLabel="Add a tile"
            itemLabel={(t, i) => `${i + 1} — ${t.h3}`}
            renderItem={(t, u) => (
              <>
                <TextInput label="Heading" value={t.h3} onChange={(h3) => u({ ...t, h3 })} />
                {t.bullets ? (
                  <Repeater<string> label="Bullets" items={t.bullets} onChange={(bullets) => u({ ...t, bullets })} newItem={() => ''} addLabel="Add a bullet"
                    renderItem={(x, uu) => <MdTextInput label="Bullet" value={x} onChange={uu} />} />
                ) : (
                  <MdTextInput label="Text" value={t.body ?? ''} onChange={(body) => u({ ...t, body })} multiline />
                )}
              </>
            )}
          />
          <MdTextInput label="Small print under the tiles (optional)" value={b.note ?? ''} onChange={(note) => set({ ...b, note: note || null })} multiline />
        </>
      );
    case 'steps':
      return (
        <>
          {head}
          <MdTextInput label="Intro" value={b.intro} onChange={(intro) => set({ ...b, intro })} multiline />
          <Repeater label="Steps" items={b.steps} onChange={(steps) => set({ ...b, steps })} newItem={() => ({ h3: '', body: '' })} addLabel="Add a step" itemLabel={(s, i) => `${i + 1} — ${s.h3}`}
            renderItem={(s, u) => (
              <>
                <TextInput label="Heading" value={s.h3} onChange={(h3) => u({ ...s, h3 })} />
                <MdTextInput label="Text" value={s.body} onChange={(body) => u({ ...s, body })} multiline />
              </>
            )} />
          {b.img && img('Photo', b.img, (n) => set({ ...b, img: n }))}
        </>
      );
    case 'local':
      return (
        <>
          {head}
          <MdTextInput label="Intro" value={b.intro} onChange={(intro) => set({ ...b, intro })} multiline />
          <Repeater label="Items" items={b.items} onChange={(items) => set({ ...b, items })} newItem={() => ({ h3: '', body: '' })} addLabel="Add an item" itemLabel={(s, i) => `${i + 1} — ${s.h3}`}
            renderItem={(s, u) => (
              <>
                <TextInput label="Heading" value={s.h3} onChange={(h3) => u({ ...s, h3 })} />
                <MdTextInput label="Text" value={s.body} onChange={(body) => u({ ...s, body })} multiline />
              </>
            )} />
          <TextInput label="Customer quote (optional)" value={b.proof?.quote ?? ''} onChange={(quote) => set({ ...b, proof: quote || b.proof?.name ? { quote, name: b.proof?.name ?? '' } : null })} multiline />
          <TextInput label="Quote — customer name" value={b.proof?.name ?? ''} onChange={(name) => set({ ...b, proof: name || b.proof?.quote ? { quote: b.proof?.quote ?? '', name } : null })} />
        </>
      );
    case 'table':
      return (
        <>
          {head}
          <MdTextInput label="Intro" value={b.intro} onChange={(intro) => set({ ...b, intro })} multiline />
          {b.head.map((h, i) => (
            <MdTextInput key={i} label={`Column ${i + 1} heading`} value={h} onChange={(v) => set({ ...b, head: b.head.map((x, y) => (y === i ? v : x)) })} />
          ))}
          <Repeater<string[]>
            label="Rows"
            items={b.rows}
            onChange={(rows) => set({ ...b, rows })}
            newItem={() => b.head.map(() => '')}
            addLabel="Add a row"
            itemLabel={(r, i) => `${i + 1} — ${(r[0] ?? '').slice(0, 40)}`}
            renderItem={(r, u) => (
              <>
                {r.map((c, ci) => (
                  <MdTextInput key={ci} label={b.head[ci]?.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') || `Cell ${ci + 1}`} value={c} onChange={(v) => u(r.map((x, y) => (y === ci ? v : x)))} />
                ))}
              </>
            )}
          />
          <MdTextInput label="Small print under the table (optional)" value={b.note ?? ''} onChange={(note) => set({ ...b, note: note || null })} multiline />
        </>
      );
    case 'reviews':
      return (
        <>
          {head}
          <TextInput label="Rating line" value={b.rating} onChange={(rating) => set({ ...b, rating })} hint={RATING_TOKEN_HELP} />
          <Repeater label="Reviews (1 to 3)" items={b.reviews} onChange={(reviews) => set({ ...b, reviews: reviews.slice(0, 3) })} newItem={() => ({ name: '', url: null, text: '' })} addLabel="Add a review" itemLabel={(r, i) => `${i + 1} — ${r.name}`}
            renderItem={(r, u) => (
              <>
                <TextInput label="Name" value={r.name} onChange={(name) => u({ ...r, name })} />
                <TextInput label="Google review link (optional)" value={r.url ?? ''} onChange={(url) => u({ ...r, url: url.trim() ? url : null })} link />
                <TextInput label="Review" value={r.text} onChange={(text) => u({ ...r, text })} multiline hint="Quoted exactly as the customer wrote it." />
              </>
            )} />
        </>
      );
    case 'faq':
      return (
        <>
          {head}
          <Repeater label="Questions" items={b.items} onChange={(items) => set({ ...b, items })} newItem={() => ({ q: '', preview: '', answer: '' })} addLabel="Add a question" itemLabel={(f, i) => `${i + 1} — ${f.q}`}
            renderItem={(f, u) => (
              <>
                <TextInput label="Question" value={f.q} onChange={(q) => u({ ...f, q })} />
                <MdTextInput label="Short answer (shown while closed)" value={f.preview} onChange={(preview) => u({ ...f, preview })} multiline />
                <MdTextInput label="Full answer" value={f.answer} onChange={(answer) => u({ ...f, answer })} multiline />
              </>
            )} />
        </>
      );
    case 'ndc':
      return <p style={{ color: ADMIN_COLORS.onSurfaceVariant, fontFamily: 'var(--font-nunito), system-ui, sans-serif', fontSize: '13px', margin: 0 }}>The No Drip Club box ({b.variant === 'sewer' ? 'sewer' : 'general'} version) is the same on every page.</p>;
    case 'services':
      return (
        <>
          {head}
          <Repeater label="Service cards" items={b.cards} onChange={(cards) => set({ ...b, cards })} newItem={() => ({ title: '', href: `/${city}/`, desc: '', img: { src: '', alt: '' }, emergency: false })} addLabel="Add a card" itemLabel={(c, i) => `${i + 1} — ${c.title}`}
            renderItem={(c, u) => (
              <>
                <TextInput label="Title" value={c.title} onChange={(title) => u({ ...c, title })} />
                <TextInput label={`Link (a /${city}/… service page)`} value={c.href} onChange={(href) => u({ ...c, href, emergency: href.endsWith('/emergency-plumbing') })} link hint="The Emergency Plumbing card shows as the red call row." />
                <MdTextInput label="Description" value={c.desc} onChange={(desc) => u({ ...c, desc })} multiline />
                {img('Photo', c.img, (n) => u({ ...c, img: n }))}
              </>
            )} />
        </>
      );
    case 'final':
      return (
        <>
          {head}
          <MdTextInput label="Text" value={b.body} onChange={(body) => set({ ...b, body })} multiline />
          <MdTextInput label="Communities (each linked town is also listed for Google)" value={b.communities} onChange={(communities) => set({ ...b, communities })} multiline />
        </>
      );
  }
}

/** The /admin/city-service/[city]/[service] dispatcher: the V2 editor for a V2 page, else `legacy`. */
export function useCityServiceV2Load(city: string, service: string): { state: 'loading' | 'v2' | 'legacy'; load: Load | null } {
  const [state, setState] = useState<'loading' | 'v2' | 'legacy'>('loading');
  const [load, setLoad] = useState<Load | null>(null);
  useEffect(() => {
    if (!city || !service) return;
    fetch(`/api/cms/city-service-v2/${city}/${service}`)
      .then(async (r) => (r.ok ? ((await r.json()) as Load) : null))
      .then((d) => {
        setLoad(d);
        setState(d && (d.page || d.hasV2Version) ? 'v2' : 'legacy');
      })
      .catch(() => setState('legacy'));
  }, [city, service]);
  return { state, load };
}


