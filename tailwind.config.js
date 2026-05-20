/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          bg:      'rgb(var(--brand-bg) / <alpha-value>)',
          surface: 'rgb(var(--brand-surface) / <alpha-value>)',
          raised:  'rgb(var(--brand-raised) / <alpha-value>)',
          accent:  'rgb(var(--brand-accent) / <alpha-value>)',
          warm:    'rgb(var(--brand-warm) / <alpha-value>)',
          slate:   'rgb(var(--brand-slate) / <alpha-value>)',
          muted:   'rgb(var(--brand-muted) / <alpha-value>)',
        },
      },
    },
  },
  plugins: [],
}
