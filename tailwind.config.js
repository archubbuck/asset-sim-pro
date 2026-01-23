/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './apps/client/src/**/*.{html,ts}',
    './libs/client/**/*.{html,ts}'
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a'
        }
      }
    },
  },
  plugins: [],
}
