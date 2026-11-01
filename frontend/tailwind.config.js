/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#0f172a',
        },
      },
      animation: {
        'highlight': 'highlightPulse 2s ease-out',
      },
      keyframes: {
        highlightPulse: {
          '0%': { backgroundColor: 'rgba(34, 197, 94, 0.25)', transform: 'scale(1.01)' },
          '100%': { backgroundColor: 'transparent', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
