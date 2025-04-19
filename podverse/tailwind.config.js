import theme from './src/globals/theme.jsx'; // Use ES Module import

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // 🌞 Light Theme
        light: {
          black: theme.colors.black,
          grey: theme.colors.grey,
          charcoal: theme.colors.charcoal,
          cream: theme.colors.cream,
          deepPurple: theme.colors.deepPurple,
          purple: theme.colors.purple,
          lavender: theme.colors.lavender,
          softBlue: theme.colors.softBlue,
          skyBlue: theme.colors.skyBlue,
          deepBlue: theme.colors.deepBlue,
          background: theme.colors.background,
          text: theme.colors.text,
          primary: theme.colors.primary,
          secondary: theme.colors.secondary,
          accent: theme.colors.accent,
          buttonBase: theme.colors.button.base,
          buttonHover: theme.colors.button.hover,
          buttonText: theme.colors.button.text,
        },
        // 🌚 Dark Theme 
        dark: {},
      },
    },
    fontFamily: {
      InriaSerif: ['Inria Serif', 'serif'],
      OpenSans: ['Open Sans', 'sans-serif'],
      Rubik: ['Rubik', 'serif'],
    },
    container: {
      center: true,
      padding: "1rem",
      screens: {
        lg: "1124px",
        xl: "1124px",
        "2xl": "1124px",
      }
    }
  },
  plugins: [],
}