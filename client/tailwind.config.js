/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        forest: { DEFAULT: '#0D1F0F', light: '#1A3A1C', dark: '#081208' },
        bark: { DEFAULT: '#3B2A1A', light: '#5C4330', dark: '#2A1E12' },
        amber: { DEFAULT: '#C87F2F', light: '#E09940', dark: '#A66820' },
        blaze: { DEFAULT: '#FF6B00', light: '#FF8533', dark: '#CC5500' },
      },
      fontFamily: {
        heading: ['Oswald', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
        body: ['Lato', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
