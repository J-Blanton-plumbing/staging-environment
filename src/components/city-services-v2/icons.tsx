/**
 * City Service Pages V2 (Brief 209) — the approved service template's inline SVGs, converted to
 * JSX attribute-for-attribute (scratchpad converter; the hero/steps phone icon uses the template's
 * clean 527-byte variant — the template also carried a copy with an 8 KB embedded C2PA metadata
 * blob that draws the same path).
 */
export type CsIconName = 'phone20' | 'phone18' | 'badge24' | 'avatar' | 'ndcCheck' | 'ndcBtn' | 'trust';

export function CsIcon({ name }: { name: CsIconName }) {
  switch (name) {
    case 'phone20':
      return (
        <svg aria-hidden="true" fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" style={{ flexShrink: "0" }} viewBox="0 0 24 24" width="20" xmlns="http://www.w3.org/2000/svg"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.68 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.32 1.85.55 2.81.68A2 2 0 0 1 22 16.92z" /></svg>
      );
    case 'phone18':
      return (
        <svg aria-hidden="true" fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" style={{ flexShrink: "0" }} viewBox="0 0 24 24" width="18" xmlns="http://www.w3.org/2000/svg"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.68 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.32 1.85.55 2.81.68A2 2 0 0 1 22 16.92z" /></svg>
      );
    case 'badge24':
      return (
        <svg aria-hidden="true" focusable="false" height="64" viewBox="0 0 100 100" width="64"><path d="M30.28 12.92 A42 42 0 1 1 67.75 88.06" fill="none" stroke="currentColor" strokeWidth="7" /><path d="M26.06 4.97 L15.18 26.51 L34.51 20.86 Z" fill="currentColor" /><path d="M58.73 91.08 A42 42 0 0 1 52.93 91.90" fill="none" stroke="currentColor" strokeWidth="7" /><path d="M47.80 91.94 A42 42 0 0 1 41.99 91.23" fill="none" stroke="currentColor" strokeWidth="7" /><path d="M37.02 89.94 A42 42 0 0 1 31.59 87.75" fill="none" stroke="currentColor" strokeWidth="7" /><path d="M27.13 85.22 A42 42 0 0 1 22.45 81.70" fill="none" stroke="currentColor" strokeWidth="7" /><path d="M18.79 78.10 A42 42 0 0 1 15.18 73.49" fill="none" stroke="currentColor" strokeWidth="7" /><path d="M12.58 69.07 A42 42 0 0 1 10.29 63.67" fill="none" stroke="currentColor" strokeWidth="7" /><path d="M8.92 58.73 A42 42 0 0 1 8.10 52.93" fill="none" stroke="currentColor" strokeWidth="7" /><text fill="currentColor" fontFamily="Industry,Arial,sans-serif" fontSize="38" fontWeight="700" textAnchor="middle" x="50" y="56">24</text><text fill="currentColor" fontFamily="Industry,Arial,sans-serif" fontSize="13" fontWeight="700" letterSpacing=".5" textAnchor="middle" x="50" y="71">HOURS</text></svg>
      );
    case 'avatar':
      return (
        <svg aria-hidden="true" fill="none" height="20" stroke="#F9F3EC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="20" xmlns="http://www.w3.org/2000/svg"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
      );
    case 'ndcCheck':
      return (
        <svg aria-hidden="true" fill="none" height="12" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" width="12" xmlns="http://www.w3.org/2000/svg"><polyline points="20 6 9 17 4 12" /></svg>
      );
    case 'ndcBtn':
      return (
        <svg aria-hidden="true" fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" style={{ flexShrink: "0" }} viewBox="0 0 24 24" width="18" xmlns="http://www.w3.org/2000/svg"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" x2="20" y1="8" y2="14" /><line x1="23" x2="17" y1="11" y2="11" /></svg>
      );
    case 'trust':
      return (
        <svg aria-hidden="true" fill="none" height="40" stroke="var(--c-carmine)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" style={{ flexShrink: "0" }} viewBox="0 0 24 24" width="40"><circle cx="12" cy="12" r="9.5" /><path d="m8 12.3 2.7 2.7L16.2 9.5" /></svg>
      );
  }
}
