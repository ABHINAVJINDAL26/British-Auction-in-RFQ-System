/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#0F1117',
        'bg-card': '#1A1D2E',
        'bg-elevated': '#252840',
        'accent-blue': '#4F8EF7',
        'accent-green': '#22C55E',
        'accent-amber': '#F59E0B',
        'accent-red': '#EF4444',
        'text-primary': '#F1F5F9',
        'text-muted': '#64748B',
        'border-color': '#2D3148',
      },
      fontFamily: {
        syne: ['Syne', 'sans-serif'],
        sans: ['IBM Plex Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
