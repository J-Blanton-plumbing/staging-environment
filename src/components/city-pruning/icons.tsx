/**
 * Brief 229 — the inline SVGs the City Pruning pilot pages share with the City Hub template (the same
 * paths as CityHubView's, which keeps its own copies so the control hubs' markup is untouched).
 */
const PHONE_PATH =
  'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.68 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.32 1.85.55 2.81.68A2 2 0 0 1 22 16.92z';

export function PhoneIcon({ size = 20, stroke = '2.5' }: { size?: number; stroke?: string }) {
  return (
    <svg aria-hidden="true" fill="none" height={size} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={stroke} style={{ flexShrink: 0 }} viewBox="0 0 24 24" width={size} xmlns="http://www.w3.org/2000/svg">
      <path d={PHONE_PATH} />
    </svg>
  );
}

const BADGE_ARCS = [
  'M58.73 91.08 A42 42 0 0 1 52.93 91.90', 'M47.80 91.94 A42 42 0 0 1 41.99 91.23', 'M37.02 89.94 A42 42 0 0 1 31.59 87.75',
  'M27.13 85.22 A42 42 0 0 1 22.45 81.70', 'M18.79 78.10 A42 42 0 0 1 15.18 73.49', 'M12.58 69.07 A42 42 0 0 1 10.29 63.67',
  'M8.92 58.73 A42 42 0 0 1 8.10 52.93',
];

export function Badge24() {
  return (
    <svg aria-hidden="true" focusable="false" height="64" viewBox="0 0 100 100" width="64">
      <path d="M30.28 12.92 A42 42 0 1 1 67.75 88.06" fill="none" stroke="currentColor" strokeWidth="7" />
      <path d="M26.06 4.97 L15.18 26.51 L34.51 20.86 Z" fill="currentColor" />
      {BADGE_ARCS.map((d) => (
        <path key={d} d={d} fill="none" stroke="currentColor" strokeWidth="7" />
      ))}
      <text fill="currentColor" fontFamily="Industry,Arial,sans-serif" fontSize="38" fontWeight="700" textAnchor="middle" x="50" y="56">24</text>
      <text fill="currentColor" fontFamily="Industry,Arial,sans-serif" fontSize="13" fontWeight="700" letterSpacing=".5" textAnchor="middle" x="50" y="71">HOURS</text>
    </svg>
  );
}

export function CheckCircle() {
  return (
    <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9.5" />
      <path d="m8 12.3 2.7 2.7L16.2 9.5" />
    </svg>
  );
}

export function PinIcon() {
  return (
    <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

export function ShieldIcon() {
  return (
    <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function GoogleG() {
  return (
    <svg aria-hidden="true" focusable="false" height="34" viewBox="0 0 48 48" width="34">
      <path d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" fill="#EA4335" />
      <path d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" fill="#4285F4" />
      <path d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" fill="#FBBC05" />
      <path d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" fill="#34A853" />
    </svg>
  );
}

export function Avatar() {
  return (
    <span className="review-avatar">
      <svg aria-hidden="true" fill="none" height="20" stroke="#F9F3EC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="20" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    </span>
  );
}

export function NdcCheck() {
  return (
    <span className="ndc-check">
      <svg aria-hidden="true" fill="none" height="12" stroke="#F9F3EC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" width="12" xmlns="http://www.w3.org/2000/svg">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </span>
  );
}

export function SearchIcon() {
  return (
    <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
