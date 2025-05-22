const theme = require('./src/globals/theme.jsx');

/** @type {import('tailwindcss').Config} */
module.exports = {
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
          lightGrey: theme.colors.lightGrey,
          grey: theme.colors.grey,
          charcoal: theme.colors.charcoal,
          cream: theme.colors.cream,
          deepPurple: theme.colors.deepPurple,
          purple: theme.colors.purple,
          lavender: theme.colors.lavender,
          lightPurple: theme.colors.lightPurple,
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
        dark: {
          
        }
      },
    },
    fontFamily :{
      headingPoppins: ['Poppins', 'sans-serif'], 
      subheadingDMSans: ['DM Sans', 'sans-serif'],   
      bodyRoboto: ['Roboto', 'sans-serif'],            
      quoteInria: ['Inria Serif', 'serif'],             
      labelDMSans: ['DM Sans', 'sans-serif'], 
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
  safelist: [
    'bg-purple-500',
    'bg-blue-500',
    'bg-green-500',
    'bg-pink-500',
    'bg-orange-500',
    'bg-yellow-500',
    'bg-teal-500',
    'bg-indigo-500',
    'bg-red-500',
    'text-purple-500',
    'text-blue-500',
    'text-green-500',
    'text-pink-500',
    'text-orange-500',
    'text-yellow-500',
    'text-teal-500',
    'text-indigo-500',
    'text-red-500',
  ],
};