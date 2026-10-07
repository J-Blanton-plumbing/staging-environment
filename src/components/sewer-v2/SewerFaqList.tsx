import type { SewerFaq } from '@/lib/content/sewer-v2/types';
import { parseStyle as s, SewerRichText, type SewerPhone } from './SewerNodes';

/**
 * Brief 200 — the approved FAQ accordion markup. Behaviour (open/close with the WAAPI height
 * animation, preview ↔ full answer) is the delegated listener in SewerV2Root. Questions are plain
 * buttons, not headings, exactly as approved; there is deliberately NO FAQPage schema
 * (dead since 2026-05-07).
 */
export default function SewerFaqList({ items, phone }: { items: readonly SewerFaq[]; phone: SewerPhone }) {
  return (
    <div style={s('display:flex;flex-direction:column;gap:12px')}>
      {items.map((f) => (
        <div className="faq-item2" key={f.q}>
          <button className="faq-q" type="button" aria-expanded="false">
            <span className="faq-q-text">{f.q}</span>
            <span className="faq-plus" aria-hidden="true">
              +
            </span>
          </button>
          <div className="faq-panel">
            <p className="faq-preview">
              <SewerRichText value={f.preview} phone={phone} />
            </p>
            <p className="faq-full">
              <SewerRichText value={f.full} phone={phone} />
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
