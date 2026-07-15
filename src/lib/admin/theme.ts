/**
 * Admin CMS "Midnight Carmine Internal" theme tokens — Brief 80.
 *
 * Mirrors the `admin-*` Tailwind namespace in tailwind.config.ts. Admin editors/tables/
 * modals in this codebase are built with inline `style={{}}` objects (not Tailwind
 * classes), so this module is the single source of truth those inline styles pull
 * from — keeps every file's colors in lockstep instead of re-typing hex literals.
 *
 * Only two hexes are brand-official (surface base + secondaryContainer); the rest is
 * the approved mockup's own tonal ramp. Never import this into public-facing (non-admin)
 * components — it is intentionally isolated from src/lib/site.ts / brand-rules.md tokens.
 */

export const ADMIN_COLORS = {
  surface: '#0A1B2E',
  surfaceDim: '#0A1B2E',
  surfaceBright: '#273a53',
  surfaceContainerLowest: '#000f22',
  surfaceContainerLow: '#061c34',
  surfaceContainer: '#0b2038',
  surfaceContainerHigh: '#172b43',
  surfaceContainerHighest: '#22364e',
  onSurface: '#d3e4ff',
  onSurfaceVariant: '#c4c6cd',
  outlineVariant: '#44474c',
  primary: '#b7c8e1',
  onPrimary: '#223145',
  secondaryContainer: '#BC0E0E',
  cerulean: '#1560E6',
  error: '#ffb4ab',
  onError: '#690005',
  // Status accents (not part of brand-rules.md; kept distinct from Carmine per Hard Rules
  // so "active/brand" and "destructive/error" never look the same).
  success: '#4ade80',
  successOn: '#052e16',
  warning: '#fcd34d',
  warningOn: '#451a03',
} as const;

export const ADMIN_RADIUS = {
  DEFAULT: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  '2xl': '1.5rem',
  '3xl': '2rem',
  full: '9999px',
} as const;

// These MUST reference the next/font CSS custom properties, not the bare family name —
// next/font/google renames the actual generated @font-face to a hashed identifier
// (e.g. `__Outfit_0dd153`), so a literal `"Outfit, sans-serif"` string never matches any
// loaded font face and silently falls back to the browser default. `--font-outfit` is set
// by src/app/admin/layout.tsx; `--font-nunito` is set globally by the root layout (the
// admin body font intentionally reuses the site's existing Nunito load — Brief 80).
export const ADMIN_FONTS = {
  headline: 'var(--font-outfit), system-ui, sans-serif',
  body: 'var(--font-nunito), system-ui, sans-serif',
} as const;

/**
 * Shadow/elevation system — Brief 81 Track C. `code.html` uses real box-shadows
 * (DESIGN.md's "cards are flat, no shadows" prose is superseded by the rendered
 * mockup, same precedent as the radius correction in Brief 80).
 *
 * `elegant` is referenced in code.html as a custom `.elegant-shadow` class whose
 * CSS definition wasn't present in the exported HTML — this is the working
 * definition (soft, large-blur, dark ambient shadow tuned for the navy background).
 * Flagged for marketing sign-off in the Brief 81 report.
 */
export const ADMIN_SHADOWS = {
  elegant: '0 8px 24px -4px rgba(0,0,0,0.35), 0 2px 8px -2px rgba(0,0,0,0.25)',
  sm: '0 1px 3px rgba(0,0,0,0.2)',
  md: '0 4px 8px -1px rgba(0,0,0,0.25)',
  lg: '0 10px 20px -3px rgba(0,0,0,0.3)',
  xl: '0 14px 28px -6px rgba(0,0,0,0.35)',
  glowCerulean: '0 16px 32px -8px rgba(21, 96, 230, 0.35)',
  glowCarmine: '0 8px 16px -4px rgba(188, 14, 14, 0.3)',
} as const;
