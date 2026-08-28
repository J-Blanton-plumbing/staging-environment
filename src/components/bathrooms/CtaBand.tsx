/**
 * Brief 156 — the repeated consultation + phone CTA pair.
 *
 * The live page duplicates this markup after the Why-us, gallery, materials,
 * process and team sections. Rendering it from one component is the whole point:
 * every instance opens the SAME lead modal via the context in LeadModal.tsx.
 *
 * TWO LAYOUTS, and they are not interchangeable. On the source `.hero-buttons`
 * is `flex-flow: column` by DEFAULT and only the `.horizontal` modifier turns it
 * into a row:
 *
 *   stacked     (default)  Why-us, Materials — column, gap 24, buttons full width
 *   horizontal            gallery, process, team — row, gap 24, centred, auto width
 *
 * The first pass rendered every band as a row, which is what made the Why-us and
 * Materials labels wrap mid-phrase inside half-width buttons.
 *
 * On the live page one of these (the Why-us section's tablet-visible copy)
 * points at `/services` — a path that does not exist on the bathrooms domain.
 * Every CTA here opens the modal instead (Brief 156 §9.3).
 */

import styles from './bathrooms.module.css';
import { ConsultationCtaButton, PhoneCtaButton } from './LeadModal';

export default function CtaBand({
  layout = 'stacked',
  className = '',
}: {
  layout?: 'stacked' | 'horizontal';
  className?: string;
}) {
  const groupClass = layout === 'horizontal' ? styles.ctaRow : styles.ctaStack;

  return (
    <div className={[groupClass, className].filter(Boolean).join(' ')}>
      <ConsultationCtaButton variant="service" />
      <PhoneCtaButton variant="service" />
    </div>
  );
}
