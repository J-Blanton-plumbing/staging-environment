/**
 * City Service Pages V2 (Brief 209) — the content model of one `/{city}/{service}` page.
 *
 * Generated from the approved Brief 209 package (the Highland Park service-page template filled
 * with each city's copy, §4 fact-check corrections applied). `Rich` strings carry the only markup
 * the copy uses: `[label](/href)` links. Phone numbers never appear in copy — every phone position
 * is rendered by the view from Global Settings.
 */
export type Rich = string;

export interface CsImage {
  src: string;
  alt: string;
}

interface BlockBase {
  id: string;
  /** The section's class list, verbatim from the approved template (e.g. `ss-panel ss-tint`). */
  cls: string;
  /** The template's `--o` value. */
  order: number;
}

export type CsBlock =
  | (BlockBase & { type: 'split'; eyebrow: string; h2: string; body: Rich; img: CsImage | null })
  | (BlockBase & { type: 'fold'; eyebrow: string; h2: string; bodies: Rich[]; img: CsImage | null })
  | (BlockBase & {
      type: 'tiles';
      eyebrow: string;
      h2: string;
      intro: Rich;
      minCol: 260 | 340;
      tiles: Array<{ h3: string; body?: Rich; bullets?: Rich[] }>;
      note: Rich | null;
    })
  | (BlockBase & { type: 'steps'; eyebrow: string; h2: string; intro: Rich; steps: Array<{ h3: string; body: Rich }>; img: CsImage | null })
  | (BlockBase & {
      type: 'local';
      eyebrow: string;
      h2: string;
      intro: Rich;
      items: Array<{ h3: string; body: Rich }>;
      proof: { quote: string; name: string } | null;
    })
  | (BlockBase & { type: 'table'; eyebrow: string; h2: string; intro: Rich; head: Rich[]; rows: Rich[][]; note: Rich | null })
  | (BlockBase & { type: 'reviews'; eyebrow: string; h2: string; rating: string; reviews: Array<{ name: string; url: string | null; text: string }> })
  | (BlockBase & { type: 'faq'; eyebrow: string; h2: string; items: Array<{ q: string; preview: Rich; answer: Rich }> })
  | (BlockBase & { type: 'ndc'; variant: 'general' | 'sewer' })
  | (BlockBase & {
      type: 'services';
      eyebrow: string;
      h2: string;
      cards: Array<{ title: string; href: string; desc: Rich; img: CsImage; emergency: boolean }>;
    })
  | (BlockBase & { type: 'final'; eyebrow: string; h2: string; body: Rich; communities: Rich });

export interface CityServiceV2Page {
  city: string;
  service: string;
  meta: { title: string; description: string };
  hero: { crumb: string; eyebrow: string; h1: string; sub: Rich; img: CsImage };
  /** The three rail trust items. */
  trust: string[];
  blocks: CsBlock[];
  /** The approved `Service` JSON-LD; `provider.telephone` is filled at render from Global Settings. */
  serviceSchema: Record<string, unknown> & { provider: Record<string, unknown> & { telephone: string } };
}
