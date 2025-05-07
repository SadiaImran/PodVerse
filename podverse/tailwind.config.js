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
          screenBackground : theme.colors.screenBackground ,
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
}