/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Instrument Serif', 'Georgia', 'serif'],
        body:    ['DM Sans', 'system-ui', 'sans-serif'],
      },
      colors: {
        gold:     { DEFAULT: '#C9A96E', light: '#E8D5A3', dim: '#8B6F3E' },
        obsidian: '#0A0A0A',
      },
      transitionDuration: { 400: '400ms' },
    },
  },
  plugins: [],
};
