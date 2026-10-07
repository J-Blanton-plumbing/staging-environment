import type { ReactElement } from 'react';
import type { SewerIconName } from '@/lib/content/sewer-v2/types';

/**
 * Brief 200 — the inline SVGs of the approved Sewer Ecosystem v2 markup, attribute for attribute.
 * Content modules reference them by name (`{ icon: 'phone18' }`). Two near-twins are kept apart on
 * purpose because the approved markup differs: `phone18NoAria` has no aria-hidden.
 */
const PHONE_PATH =
  'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.68 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.32 1.85.55 2.81.68A2 2 0 0 1 22 16.92z';

const BADGE_DASHES = [
  'M58.73 91.08 A42 42 0 0 1 52.93 91.90',
  'M47.80 91.94 A42 42 0 0 1 41.99 91.23',
  'M37.02 89.94 A42 42 0 0 1 31.59 87.75',
  'M27.13 85.22 A42 42 0 0 1 22.45 81.70',
  'M18.79 78.10 A42 42 0 0 1 15.18 73.49',
  'M12.58 69.07 A42 42 0 0 1 10.29 63.67',
  'M8.92 58.73 A42 42 0 0 1 8.10 52.93',
];

const ICONS: Record<SewerIconName, () => ReactElement> = {
  phone20: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="20" height="20" style={{ flexShrink: 0 }} aria-hidden="true">
      <path d={PHONE_PATH} />
    </svg>
  ),
  phone18: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" style={{ flexShrink: 0 }} aria-hidden="true">
      <path d={PHONE_PATH} />
    </svg>
  ),
  phone18NoAria: () => (
    <svg fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" style={{ flexShrink: 0 }} viewBox="0 0 24 24" width="18" xmlns="http://www.w3.org/2000/svg">
      <path d={PHONE_PATH} />
    </svg>
  ),
  badge24: () => (
    <svg viewBox="0 0 100 100" width="64" height="64" aria-hidden="true" focusable="false">
      <path d="M30.28 12.92 A42 42 0 1 1 67.75 88.06" fill="none" stroke="currentColor" strokeWidth="7" />
      <path d="M26.06 4.97 L15.18 26.51 L34.51 20.86 Z" fill="currentColor" />
      {BADGE_DASHES.map((d) => (
        <path key={d} d={d} fill="none" stroke="currentColor" strokeWidth="7" />
      ))}
      <text x="50" y="56" textAnchor="middle" fontFamily="Industry,Arial,sans-serif" fontWeight="700" fontSize="38" fill="currentColor">
        24
      </text>
      <text x="50" y="71" textAnchor="middle" fontFamily="Industry,Arial,sans-serif" fontWeight="700" fontSize="13" letterSpacing=".5" fill="currentColor">
        HOURS
      </text>
    </svg>
  ),
  checkCircle: () => (
    <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9.5" />
      <path d="m8 12.3 2.7 2.7L16.2 9.5" />
    </svg>
  ),
  googleG: () => (
    <svg viewBox="0 0 48 48" width="34" height="34" aria-hidden="true" focusable="false">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  ),
  avatar: () => (
    <svg aria-hidden="true" fill="none" height="20" stroke="#F9F3EC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="20" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  ndcCheck: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" width="12" height="12" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  userPlus: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" style={{ flexShrink: 0 }} aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  ),
  chevronLeft: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  ),
  chevronRight: () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" aria-hidden="true">
      <path d="M9 18l6-6-6-6" />
    </svg>
  ),
};

export function SewerIcon({ name }: { name: SewerIconName }) {
  return ICONS[name]();
}
