/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx,json}",
    "../../packages/reader-core/src/**/*.{js,ts,jsx,tsx}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'sans-serif'], serif: ['Merriweather', 'serif'] },
      typography: (theme) => ({
        DEFAULT: { css: { color: theme('colors.gray.800'), h1: { color: theme('colors.gray.900') }, h2: { color: theme('colors.gray.900') }, h3: { color: theme('colors.gray.900') }, strong: { color: theme('colors.gray.900') }, blockquote: { borderLeftColor: theme('colors.indigo.500') } } },
        invert: { css: { color: theme('colors.gray.300'), h1: { color: theme('colors.white') }, h2: { color: theme('colors.gray.100') }, h3: { color: theme('colors.gray.200') }, strong: { color: theme('colors.white') }, blockquote: { borderLeftColor: theme('colors.indigo.400'), color: theme('colors.gray.300') } } }
      }),
      keyframes: {
        'fade-in-up': { '0%': { opacity: '0', transform: 'translateY(10px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'bounce-in': { '0%': { opacity: '0', transform: 'scale(0.9)' }, '50%': { opacity: '1', transform: 'scale(1.05)' }, '100%': { opacity: '1', transform: 'scale(1)' } }
      },
      animation: { 'fade-in-up': 'fade-in-up 0.3s ease-out', 'bounce-in': 'bounce-in 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)' }
    }
  },
  plugins: [require('@tailwindcss/typography')]
};
