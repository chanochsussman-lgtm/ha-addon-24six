/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0d0d0f',
        surface: '#17181c',
        card: '#1e1f25',
        border: '#2a2b32',
        accent: '#c8a84b',
        'accent-dim': '#9b7e36',
        muted: '#6b6c77',
        text: '#f0f0f2',
        'text-secondary': '#9a9ba6',
      },
      fontFamily: {
        display: ['"DM Serif Display"', 'serif'],
        body: ['"DM Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
