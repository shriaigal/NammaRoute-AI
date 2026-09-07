/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
  ink: '#0F1626',
  surface: '#F7F8FB',
  card: '#FFFFFF',

  purpleLine: '#9B2FAE',
  greenLine: '#00A651',
  yellowLine: '#F59E0B',

  accent: '#2563EB',
  muted: '#64748B',
  border: '#E4E7EE',
},
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(15,22,38,0.06), 0 8px 24px rgba(15,22,38,0.06)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
}
