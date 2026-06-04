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
      },
      fontFamily: {
        // Industry — the brand display font (self-hosted); web-safe fallback per brand
        display: ['var(--font-industry)', 'Arial', 'sans-serif'],
        // Body — Nunito (matches the real site)
        sans:    ['var(--font-nunito)', 'Nunito', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 4px 20px rgba(10, 27, 46, 0.08)',
        card: '0 6px 24px rgba(10, 27, 46, 0.12)',
      },
    },
  },
  plugins: [],
};

export default config;
