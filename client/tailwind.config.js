/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Škoda X deep emerald green palette
        surface: {
          900: '#060F0B',  // darkest (inputs)
          800: '#091A13',  // card bg
          700: '#0E2A1F',  // page bg
          600: '#133A2B',  // elevated/hover
          500: '#1A4A38',  // borders, subtle
          400: '#245E48',  // lighter borders
        },
        accent: {
          DEFAULT: '#78FAAE',
          light: '#A5FCC8',
          dark: '#50E890',
          muted: '#78FAAE33',
        },
        muted: {
          DEFAULT: '#8AA99B',
          light: '#A3BEB0',
          dark: '#5E7A6D',
        },
      },
    },
  },
  plugins: [],
};
