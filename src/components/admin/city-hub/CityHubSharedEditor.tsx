'use client';

/**
 * Brief 212 (= Brief 206 C7 / decision 3) — "Shared across all City Hubs", `/admin/city-hubs`: the
 * sections identical on every City Hub (hero quick links, the 24-hour badge label, the financing
 * banner, Why Us, the video and its Google details, the No Drip Club box, the "Explore all" services
 * list, the BBB row, the standard van photo and the small labels). Versioned like every page; when a
 * version is published it changes EVERY City Hub, and no other page on the site.
 */
import { useEffect, useState } from 'react';
import { ADMIN_COLORS } from '@/lib/admin/theme';
import { BRAND, Group, ImageInput, Notice, Repeater, TextInput } from '@/components/admin/sewer-v2/ui';
import { ValueEditor } from '@/components/admin/sewer-v2/ValueEditor';
import { MdTextInput } from '@/components/admin/v2-shared/MdTextInput';
import V2EditorShell from '@/components/admin/v2-shared/V2EditorShell';
import {
  CITY_HUB_SHARED_PAGE_TYPE,
  CITY_HUB_SHARED_SLUG,
  CITY_HUB_SHARED_TEMPLATE,
  isCityHubSharedDraftContent,
  type CityHubShared,
  type CityHubSharedDraftContent,
} from '@/lib/city-hub-cms/model';

interface Load {
  exists: boolean;
  status: string | null;
  version: number;
  updatedAt: string | null;
  shared: CityHubShared;
  source: 'row' | 'code';
}

export default function CityHubSharedEditor() {
  const [load, setLoad] = useState<Load | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    fetch('/api/cms/city-hubs-shared')
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as Load;
      })
      .then(setLoad)
      .catch((e: Error) => setError(e.message));
  }, []);
  if (error) return <main style={{ padding: '2rem', color: ADMIN_COLORS.error }}>Failed to load ({error}). Please refresh.</main>;
  if (!load) return <main style={{ padding: '2rem', color: ADMIN_COLORS.onSurfaceVariant }}>Loading…</main>;
  return (
    <V2EditorShell<CityHubSharedDraftContent>
      pageType={CITY_HUB_SHARED_PAGE_TYPE}
      slug={CITY_HUB_SHARED_SLUG}
      publicPath={null}
      title="Shared across all City Hubs"
      templateName="City Hub — shared sections"
      template={CITY_HUB_SHARED_TEMPLATE}
      isOwnContent={isCityHubSharedDraftContent}
      initial={{ template: CITY_HUB_SHARED_TEMPLATE, shared: load.shared }}
      oldShapeMessage="This version can’t be edited here."
      updatedAt={load.updatedAt}
      parentLabel="City Hubs"
      intro={
        <>
          These sections appear on <strong>every City Hub page</strong>. Preview shows a version on /northbrook. {!load.exists && <strong>The shared record is created by the deploy seed; until then every hub uses the built-in copy. </strong>}
        </>
      }
      extra={
        <Notice tone="warn">
          Changes here go live on every City Hub page when you publish this record. They do not affect any other page on the site.
        </Notice>
      }
      renderFields={(c, set) => <SharedFields value={c.shared} onChange={(shared) => set({ ...c, shared })} />}
    />
  );
}

function SharedFields({ value: v, onChange }: { value: CityHubShared; onChange: (v: CityHubShared) => void }) {
  const set = (patch: Partial<CityHubShared>) => onChange({ ...v, ...patch });
  return (
    <>
      <Group title="Hero: quick links and the 24-hour badge">
        <TextInput label="Quick links — screen-reader label" value={v.heroPillsLabel} onChange={(heroPillsLabel) => set({ heroPillsLabel })} />
        <ValueEditor value={v.heroPills} keyName="pills" label="Quick links" onChange={(n) => set({ heroPills: n as CityHubShared['heroPills'] })} />
        <TextInput label="“24 hours” badge — screen-reader label" value={v.badge24Label} onChange={(badge24Label) => set({ badge24Label })} />
      </Group>
      <Group title="Standard van photo" note="Used by every City Hub whose hero is set to “Standard van photo”.">
        <ImageInput label="Desktop photo (2000 px)" src={v.vanPhoto.src} alt={v.vanPhoto.alt} onSrc={(src) => set({ vanPhoto: { ...v.vanPhoto, src } })} onAlt={(alt) => set({ vanPhoto: { ...v.vanPhoto, alt } })} />
        <ImageInput label="Desktop photo, 1100 px" src={v.vanPhoto.src1100} onSrc={(src1100) => set({ vanPhoto: { ...v.vanPhoto, src1100 } })} decorative />
        <ImageInput label="Phone photo" src={v.vanPhoto.mobile} onSrc={(mobile) => set({ vanPhoto: { ...v.vanPhoto, mobile } })} decorative />
      </Group>
      <Group title="Small labels" note="Words the template uses on every hub. {city}, {card} and {n} fill themselves in.">
        <TextInput label="Trust bar — screen-reader label" value={v.trustLabel} onChange={(trustLabel) => set({ trustLabel })} />
        <TextInput label="Services eyebrow" value={v.servicesEyebrow} onChange={(servicesEyebrow) => set({ servicesEyebrow })} />
        <TextInput label="Local Knowledge eyebrow" value={v.depthEyebrow} onChange={(depthEyebrow) => set({ depthEyebrow })} />
        <TextInput label="FAQ eyebrow" value={v.faqEyebrow} onChange={(faqEyebrow) => set({ faqEyebrow })} />
        <TextInput label="Office / reviews “Schedule” button" value={v.officeSchedule} onChange={(officeSchedule) => set({ officeSchedule })} />
        <TextInput label="Final “Schedule” button" value={v.finalSchedule} onChange={(finalSchedule) => set({ finalSchedule })} />
        <ValueEditor value={v.labels} keyName="labels" label="Buttons and joiners (spaces count)" onChange={(n) => set({ labels: n as CityHubShared['labels'] })} />
        <ValueEditor value={v.patterns} keyName="patterns" label="Screen-reader and map patterns" onChange={(n) => set({ patterns: n as CityHubShared['patterns'] })} />
      </Group>
      <Group title={v.fin.h2 || 'Financing banner'} note="Its button dials the Global Settings phone.">
        <ValueEditor value={v.fin} keyName="fin" label="" onChange={(n) => set({ fin: n as CityHubShared['fin'] })} />
      </Group>
      <Group title="Why Us" note="The heading is per city (in each hub’s editor). {camera} links to that city’s camera-inspection page.">
        <TextInput label="Eyebrow" value={v.why.eyebrow} onChange={(eyebrow) => set({ why: { ...v.why, eyebrow } })} />
        <TextInput label="Intro" value={v.why.intro} onChange={(intro) => set({ why: { ...v.why, intro } })} multiline />
        <Repeater
          label="Items"
          items={v.why.items}
          onChange={(items) => set({ why: { ...v.why, items } })}
          newItem={() => ({ h3: '', body: '' })}
          addLabel="Add an item"
          itemLabel={(x, i) => `${i + 1} — ${x.h3}`}
          renderItem={(x, update) => (
            <>
              <TextInput label="Heading" value={x.h3} onChange={(h3) => update({ ...x, h3 })} />
              <MdTextInput label="Text" value={x.body} onChange={(body) => update({ ...x, body })} multiline hint="Use {camera} as the link address to point at the city’s camera-inspection page." />
            </>
          )}
        />
        <ImageInput label="Photo" src={v.why.image.src} alt={v.why.image.alt} onSrc={(src) => set({ why: { ...v.why, image: { ...v.why.image, src } } })} onAlt={(alt) => set({ why: { ...v.why, image: { ...v.why.image, alt } } })} />
      </Group>
      <Group title={v.video.h2 || 'Video'}>
        <ValueEditor value={v.video} keyName="video" label="" onChange={(n) => set({ video: n as CityHubShared['video'] })} />
        <ValueEditor value={v.videoSchema} keyName="videoSchema" label="Video details for Google (VideoObject) — the video address is built from the YouTube id" onChange={(n) => set({ videoSchema: n as CityHubShared['videoSchema'] })} />
      </Group>
      <Group title="Reviews: proof box and captions">
        <TextInput label="Ratings box — screen-reader label" value={v.reviewsProofLabel} onChange={(reviewsProofLabel) => set({ reviewsProofLabel })} />
        <TextInput label="Caption under reviewer names" value={v.verified} onChange={(verified) => set({ verified })} />
        <TextInput label="“Read on Google” link text" value={v.readOnGoogle} onChange={(readOnGoogle) => set({ readOnGoogle })} />
        <ImageInput label="BBB seal" src={v.bbb.src} alt={v.bbb.alt} onSrc={(src) => set({ bbb: { ...v.bbb, src } })} onAlt={(alt) => set({ bbb: { ...v.bbb, alt } })} />
        <TextInput label="BBB link" value={v.bbb.href} onChange={(href) => set({ bbb: { ...v.bbb, href } })} link />
        <TextInput label="BBB caption" value={v.bbb.label} onChange={(label) => set({ bbb: { ...v.bbb, label } })} />
      </Group>
      <Group title={v.ndc.h2 || 'No Drip Club'} note="Each city’s own sentence is in its hub editor.">
        <ValueEditor value={v.ndc} keyName="ndc" label="" onChange={(n) => set({ ndc: n as CityHubShared['ndc'] })} />
      </Group>
      <Group title={v.stripeTitle || 'Explore all our plumbing services'} note="Each entry links to /{city}/{service} on every hub.">
        <TextInput label="Title" value={v.stripeTitle} onChange={(stripeTitle) => set({ stripeTitle })} />
        <Repeater
          label="Groups"
          items={v.stripe}
          onChange={(stripe) => set({ stripe })}
          newItem={() => ({ group: '', items: [{ label: '', slug: '' }] })}
          addLabel="Add a group"
          itemLabel={(g, i) => `${i + 1} — ${g.group} (${g.items.length})`}
          renderItem={(g, update) => (
            <>
              <TextInput label="Group" value={g.group} onChange={(group) => update({ ...g, group })} />
              <Repeater
                label="Services"
                items={g.items}
                onChange={(items) => update({ ...g, items })}
                newItem={() => ({ label: '', slug: '' })}
                addLabel="Add a service"
                itemLabel={(x, i) => `${i + 1} — ${x.label}`}
                renderItem={(x, upd) => (
                  <>
                    <TextInput label="Label" value={x.label} onChange={(label) => upd({ ...x, label })} />
                    <TextInput label="Service page (slug, e.g. sewer-repair)" value={x.slug} onChange={(slug) => upd({ ...x, slug })} />
                  </>
                )}
              />
            </>
          )}
        />
      </Group>
      <p style={{ fontFamily: 'var(--font-nunito), system-ui, sans-serif', fontSize: '12px', color: BRAND.cream, opacity: 0.8 }}>
        Phone numbers on City Hubs come from Global Settings and are never typed here.
      </p>
    </>
  );
}
