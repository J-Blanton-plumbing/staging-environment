import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      screens: {
        // Navbar desktop/mobile switch — matches the live site (~1070px), not Tailwind's 1024px `lg`.
        nav: '1070px',
      },
      colors: {
        // J. Blanton brand red
        brand: {
          50:  '#fdf2f2',
          100: '#fbe5e5',
          200: '#f5b5b5',
          300: '#ee8585',
          400: '#e63946',
          500: '#d12020',
          600: '#bc0e0e',
          700: '#9b0d0d',
          800: '#9c0909',
          900: '#540606',
        },
        // Navy / ink — used for headings & hero
        navy: {
          50:  '#f1f4f8',
          100: '#dbe2eb',
          500: '#1c3654',
          700: '#11233e',
          800: '#0a1b2e',
          900: '#050d18',
        },
        // Cream / off-white background sections
        cream: {
          50:  '#fbf8f3',
          100: '#f9f3ec',
          200: '#f0e7d7',
        },
        accent: {
          500: '#1560e6',
          600: '#0f4dbf',
        },
        // Glaucous — light blue accent (brand spec)
        glaucous: '#8cb0ec',
        // Medium Blue — secondary accent (brand spec)
        'medium-blue': '#0044bf',
        // Rosewood — dark red hover / dark sections
        rosewood: '#540606',

        // ─── Admin CMS ("Midnight Carmine Internal") — Brief 80 ─────────────
        // Separate token namespace so these can never be selected on public pages.
        // Only two hexes are brand-official (admin-surface base + admin-secondary-container);
        // the rest is the approved mockup's own tonal ramp — see brief-80 Hard Rules.
        'admin-surface': '#0A1B2E',
        'admin-surface-dim': '#0A1B2E',
        'admin-surface-bright': '#273a53',
        'admin-surface-container-lowest': '#000f22',
        'admin-surface-container-low': '#061c34',
        'admin-surface-container': '#0b2038',
        'admin-surface-container-high': '#172b43',
        'admin-surface-container-highest': '#22364e',
        'admin-on-surface': '#d3e4ff',
        'admin-on-surface-variant': '#c4c6cd',
        'admin-outline-variant': '#44474c',
        'admin-primary': '#b7c8e1',
        'admin-on-primary': '#223145',
        'admin-secondary-container': '#BC0E0E',
        'admin-cerulean': '#1560E6',
        'admin-error': '#ffb4ab',
        'admin-on-error': '#690005',
      },
      fontFamily: {
        // Industry — the brand display font (self-hosted); web-safe fallback per brand
        display: ['var(--font-industry)', 'Arial', 'sans-serif'],
        // Body — Nunito (matches the real site)
        sans:    ['var(--font-nunito)', 'Nunito', 'system-ui', 'sans-serif'],
        // Admin CMS — Brief 80
        'admin-headline': ['var(--font-outfit)', 'system-ui', 'sans-serif'],
        'admin-body': ['var(--font-nunito)', 'Nunito', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 4px 20px rgba(10, 27, 46, 0.08)',
        card: '0 6px 24px rgba(10, 27, 46, 0.12)',
        // Admin CMS "elegant-shadow" — Brief 81. Referenced in the approved mockup
        // (code.html) but its CSS definition wasn't exported with the HTML; this is
        // the working definition (soft, large-blur, dark ambient shadow tuned to read
        // against the navy admin background). Flagged for marketing sign-off.
        'admin-elegant': '0 8px 24px -4px rgba(0,0,0,0.35), 0 2px 8px -2px rgba(0,0,0,0.25)',
      },
      borderRadius: {
        admin: '0.5rem',
        'admin-lg': '0.75rem',
        'admin-xl': '1rem',
        'admin-2xl': '1.5rem',
        'admin-3xl': '2rem',
        'admin-full': '9999px',
      },
    },
  },
  plugins: [],
};

export default config;
