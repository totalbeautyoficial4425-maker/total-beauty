/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tb: {
          white: '#FFFFFF',
          ivory: '#FFFCFA',
          'rose-primary': '#C58F9B',
          'rose-light': '#E8CDD2',
          'rose-blush': '#F4E6E8',
          'beige-champagne': '#E7D9C8',
          'beige-light': '#F5EFE7',
          'brown-soft': '#8A7064',
          'brown-dark': '#493A35',
          'gray-neutral': '#817A77',
        }
      },
      fontFamily: {
        sans: ['DM Sans', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['Cormorant Garamond', 'Georgia', 'serif'],
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(73, 58, 53, 0.05), 0 4px 6px -2px rgba(73, 58, 53, 0.025)',
        'premium': '0 10px 25px -5px rgba(197, 143, 155, 0.1), 0 8px 10px -6px rgba(73, 58, 53, 0.04)',
        'dropdown': '0 10px 30px rgba(73, 58, 53, 0.08)',
      }
    },
  },
  plugins: [],
}
